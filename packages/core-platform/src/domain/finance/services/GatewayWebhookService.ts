import { createHmac, timingSafeEqual } from 'crypto';
import { PaymentProcessingService } from './PaymentProcessingService';
import { FinanceError } from './errors';

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

export class WebhookSignatureError extends FinanceError {
  constructor(gateway: string) {
    super(`Webhook signature verification failed for gateway: ${gateway}`);
    this.name = 'WebhookSignatureError';
  }
}

export class UnknownWebhookEventError extends FinanceError {
  constructor(event: string) {
    super(`Unknown or unsupported webhook event: ${event}`);
    this.name = 'UnknownWebhookEventError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface WebhookHandleParams {
  tenantId: string;
  rawBody: Buffer;
  signature: string;
  gatewayClearingAccountId: string;
  prepaymentLiabilityAccountId: string;
  dimensionStudentId: string;
}

export interface WebhookProcessResult {
  event: string;
  reference: string;
  amountKobo: number;
  idempotent: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Paystack Webhook Handler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PaystackWebhookService
 *
 * HMAC-SHA512 signature verification must pass BEFORE any financial mutation.
 * Idempotent: duplicate webhooks for the same reference produce the same outcome.
 *
 * Environment variable required: PAYSTACK_WEBHOOK_SECRET
 */
export class PaystackWebhookService {
  private readonly secret: string;

  constructor(
    private readonly paymentService: PaymentProcessingService,
    secret?: string,
  ) {
    this.secret = secret ?? process.env.PAYSTACK_WEBHOOK_SECRET ?? '';
    if (!this.secret) {
      throw new Error('PAYSTACK_WEBHOOK_SECRET is not configured');
    }
  }

  /**
   * Verifies the Paystack HMAC-SHA512 signature.
   * Must be called with the RAW request body bytes (before any JSON parsing).
   * Uses timing-safe comparison to prevent timing attacks.
   */
  verifySignature(rawBody: Buffer, signature: string): boolean {
    const expected = createHmac('sha512', this.secret)
      .update(rawBody)
      .digest('hex');
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  /**
   * Processes a verified Paystack webhook event.
   * Only 'charge.success' events trigger financial mutations.
   * All other events are acknowledged without mutation.
   */
  async handleEvent(params: WebhookHandleParams): Promise<WebhookProcessResult> {
    // 1. Verify signature BEFORE any processing
    if (!this.verifySignature(params.rawBody, params.signature)) {
      throw new WebhookSignatureError('paystack');
    }

    const payload = JSON.parse(params.rawBody.toString('utf-8'));
    const event: string = payload.event ?? '';
    const data = payload.data ?? {};

    // 2. Only process charge.success
    if (event !== 'charge.success') {
      return { event, reference: '', amountKobo: 0, idempotent: false };
    }

    const reference: string = data.reference;
    if (!reference) {
      throw new FinanceError('Paystack webhook missing data.reference');
    }

    // Paystack amounts are in kobo
    const amountKobo: number = data.amount;
    if (!Number.isInteger(amountKobo) || amountKobo <= 0) {
      throw new FinanceError(`Invalid amount in Paystack webhook: ${amountKobo}`);
    }

    const method = this.resolvePaymentMethod(data.channel);

    // 3. Idempotent: if PaymentAttempt already CAPTURED, no-op
    await this.paymentService.initiatePaymentAttempt({
      tenantId: params.tenantId,
      gateway: 'PAYSTACK',
      reference,
    });

    const payment = await this.paymentService.processGatewaySuccess({
      tenantId: params.tenantId,
      reference,
      amountKobo,
      method,
      gatewayResponse: data,
      paymentDate: new Date(data.paid_at ?? data.created_at ?? Date.now()),
      gatewayClearingAccountId: params.gatewayClearingAccountId,
      prepaymentLiabilityAccountId: params.prepaymentLiabilityAccountId,
      dimensionStudentId: params.dimensionStudentId,
    });

    return { event, reference, amountKobo, idempotent: !!payment };
  }

  private resolvePaymentMethod(channel: string): 'CARD' | 'BANK_TRANSFER' | 'CASH' | 'CHEQUE' {
    switch ((channel ?? '').toLowerCase()) {
      case 'card': return 'CARD';
      case 'bank':
      case 'dedicated_nuban': return 'BANK_TRANSFER';
      default: return 'CARD';
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Flutterwave Webhook Handler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * FlutterwaveWebhookService
 *
 * HMAC-SHA256 signature verification must pass BEFORE any financial mutation.
 * Environment variable required: FLUTTERWAVE_SECRET_KEY
 */
export class FlutterwaveWebhookService {
  private readonly secret: string;

  constructor(
    private readonly paymentService: PaymentProcessingService,
    secret?: string,
  ) {
    this.secret = secret ?? process.env.FLUTTERWAVE_SECRET_KEY ?? '';
    if (!this.secret) {
      throw new Error('FLUTTERWAVE_SECRET_KEY is not configured');
    }
  }

  verifySignature(rawBody: Buffer, signature: string): boolean {
    const expected = createHmac('sha256', this.secret)
      .update(rawBody)
      .digest('hex');
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  async handleEvent(params: WebhookHandleParams): Promise<WebhookProcessResult> {
    if (!this.verifySignature(params.rawBody, params.signature)) {
      throw new WebhookSignatureError('flutterwave');
    }

    const payload = JSON.parse(params.rawBody.toString('utf-8'));
    const event: string = payload.event ?? '';
    const data = payload.data ?? {};

    if (event !== 'charge.completed' || data.status !== 'successful') {
      return { event, reference: '', amountKobo: 0, idempotent: false };
    }

    const reference: string = data.tx_ref ?? data.flw_ref;
    if (!reference) throw new FinanceError('Flutterwave webhook missing tx_ref');

    // Flutterwave returns amount in naira — convert to kobo
    const amountNaira: number = data.amount;
    const amountKobo = Math.round(amountNaira * 100);
    if (!Number.isInteger(amountKobo) || amountKobo <= 0) {
      throw new FinanceError(`Invalid amount in Flutterwave webhook: ${amountNaira}`);
    }

    const method = this.resolvePaymentMethod(data.payment_type);

    await this.paymentService.initiatePaymentAttempt({
      tenantId: params.tenantId,
      gateway: 'FLUTTERWAVE',
      reference,
    });

    const payment = await this.paymentService.processGatewaySuccess({
      tenantId: params.tenantId,
      reference,
      amountKobo,
      method,
      gatewayResponse: data,
      paymentDate: new Date(data.created_at ?? Date.now()),
      gatewayClearingAccountId: params.gatewayClearingAccountId,
      prepaymentLiabilityAccountId: params.prepaymentLiabilityAccountId,
      dimensionStudentId: params.dimensionStudentId,
    });

    return { event, reference, amountKobo, idempotent: !!payment };
  }

  private resolvePaymentMethod(type: string): 'CARD' | 'BANK_TRANSFER' | 'CASH' | 'CHEQUE' {
    switch ((type ?? '').toLowerCase()) {
      case 'card': return 'CARD';
      case 'account':
      case 'banktransfer': return 'BANK_TRANSFER';
      default: return 'CARD';
    }
  }
}
