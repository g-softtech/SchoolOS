import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationProvider, NotificationPayload, DeliveryReceipt } from '@saas/core-platform';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class SendGridProvider implements NotificationProvider {
  private readonly logger = new Logger(SendGridProvider.name);
  private readonly senderEmail: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY') || 'dummy-key';
    sgMail.setApiKey(apiKey);
    this.senderEmail = this.configService.get<string>('SENDGRID_SENDER_EMAIL') || 'no-reply@schoolos.com';
  }

  async sendEmail(payload: NotificationPayload): Promise<DeliveryReceipt> {
    try {
      const msg: sgMail.MailDataRequired = {
        to: payload.to,
        from: this.senderEmail,
        subject: payload.subject,
        text: payload.data?.body || 'SchoolOS Notification',
      };

      const [response] = await sgMail.send(msg);
      
      return {
        success: response.statusCode >= 200 && response.statusCode < 300,
        providerMessageId: response.headers['x-message-id'],
      };
    } catch (error: any) {
      this.logger.error(`SendGrid Error: ${error.message}`);
      return {
        success: false,
        error: error.response?.body?.errors?.[0]?.message || error.message,
      };
    }
  }

  async sendSms(to: string, message: string): Promise<DeliveryReceipt> {
    throw new Error('SendGridProvider does not support SMS.');
  }

  async sendWhatsApp(to: string, message: string): Promise<DeliveryReceipt> {
    throw new Error('SendGridProvider does not support WhatsApp.');
  }

  async sendPush(userId: string, title: string, body: string): Promise<DeliveryReceipt> {
    throw new Error('SendGridProvider does not support Push.');
  }
}
