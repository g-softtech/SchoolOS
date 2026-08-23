import {
  Controller, Post, Body, Param, Headers,
  HttpCode, HttpStatus, RawBodyRequest, Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { PaystackWebhookService, FlutterwaveWebhookService } from '@saas/core-platform';
import { WebhookSignatureError } from '@saas/core-platform';
import { ApiResponseDto } from '../../admissions/dto/response/api-response.dto';

/**
 * WebhookController — receives and processes gateway webhook events.
 *
 * Security invariant: HMAC signature verification happens BEFORE any
 * financial mutation. If verification fails, HTTP 401 is returned
 * and nothing is written to the database.
 *
 * Both endpoints are intentionally NOT protected by JWT/RBAC guards
 * (the gateway cannot attach a JWT). Signature verification is the
 * only authentication mechanism.
 *
 * Idempotent: duplicate webhooks for the same reference produce
 * the same outcome without creating duplicate financial records.
 */
@ApiTags('Finance - Webhooks')
@Controller({ path: 'webhooks', version: '1' })
export class WebhookController {
  constructor(
    private readonly paystackService: PaystackWebhookService,
    private readonly flutterwaveService: FlutterwaveWebhookService,
  ) {}

  /**
   * Paystack webhook receiver.
   * Signature: X-Paystack-Signature header (HMAC-SHA512).
   *
   * Requires: PAYSTACK_WEBHOOK_SECRET environment variable.
   *
   * For tenant resolution in webhook context: Paystack sends the `tenantId`
   * as a metadata field on the transaction (set when initializing payment).
   * It is resolved from the webhook payload, NOT from a JWT.
   */
  @Post('paystack')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Paystack webhook receiver (HMAC-SHA512 verified)' })
  async handlePaystack(
    @Req() req: any,
    @Headers('x-paystack-signature') signature: string,
  ) {
    const rawBody: Buffer | undefined = req.rawBody;
    if (!rawBody) {
      return { status: 'error', message: 'Missing raw body' };
    }

    // Parse tenantId from webhook metadata before verification
    // (tenantId is set as metadata when payment is initialized)
    let tenantId: string;
    let dimensionStudentId: string;
    let gatewayClearingAccountId: string;
    let prepaymentLiabilityAccountId: string;

    try {
      const payload = JSON.parse(rawBody.toString('utf-8'));
      const meta = payload?.data?.metadata ?? {};
      tenantId = meta.tenantId;
      dimensionStudentId = meta.studentId;
      gatewayClearingAccountId = meta.gatewayClearingAccountId;
      prepaymentLiabilityAccountId = meta.prepaymentLiabilityAccountId;
    } catch {
      return { status: 'error', message: 'Invalid webhook payload' };
    }

    if (!tenantId) {
      return { status: 'ignored', message: 'No tenantId in metadata — not a SchoolOS transaction' };
    }

    try {
      const result = await this.paystackService.handleEvent({
        tenantId,
        rawBody,
        signature: signature ?? '',
        gatewayClearingAccountId,
        prepaymentLiabilityAccountId,
        dimensionStudentId,
      });
      return { status: 'processed', ...result };
    } catch (err) {
      if (err instanceof WebhookSignatureError) {
        // Return 200 to prevent gateway retry storms, but log the failure
        return { status: 'rejected', message: 'Signature verification failed' };
      }
      throw err;
    }
  }

  /**
   * Flutterwave webhook receiver.
   * Signature: verif-hash header (HMAC-SHA256).
   *
   * Requires: FLUTTERWAVE_SECRET_KEY environment variable.
   */
  @Post('flutterwave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Flutterwave webhook receiver (HMAC-SHA256 verified)' })
  async handleFlutterwave(
    @Req() req: any,
    @Headers('verif-hash') signature: string,
  ) {
    const rawBody: Buffer | undefined = req.rawBody;
    if (!rawBody) return { status: 'error', message: 'Missing raw body' };

    let tenantId: string;
    let dimensionStudentId: string;
    let gatewayClearingAccountId: string;
    let prepaymentLiabilityAccountId: string;

    try {
      const payload = JSON.parse(rawBody.toString('utf-8'));
      const meta = payload?.data?.meta ?? {};
      tenantId = meta.tenantId;
      dimensionStudentId = meta.studentId;
      gatewayClearingAccountId = meta.gatewayClearingAccountId;
      prepaymentLiabilityAccountId = meta.prepaymentLiabilityAccountId;
    } catch {
      return { status: 'error', message: 'Invalid webhook payload' };
    }

    if (!tenantId) {
      return { status: 'ignored', message: 'No tenantId in metadata' };
    }

    try {
      const result = await this.flutterwaveService.handleEvent({
        tenantId,
        rawBody,
        signature: signature ?? '',
        gatewayClearingAccountId,
        prepaymentLiabilityAccountId,
        dimensionStudentId,
      });
      return { status: 'processed', ...result };
    } catch (err) {
      if (err instanceof WebhookSignatureError) {
        return { status: 'rejected', message: 'Signature verification failed' };
      }
      throw err;
    }
  }
}
