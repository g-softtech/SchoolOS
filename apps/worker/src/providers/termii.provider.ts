import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationProvider, NotificationPayload, DeliveryReceipt } from '@saas/core-platform';
import axios from 'axios';

@Injectable()
export class TermiiProvider implements NotificationProvider {
  private readonly logger = new Logger(TermiiProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly senderId: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('TERMII_API_KEY') || 'dummy-key';
    this.baseUrl = this.configService.get<string>('TERMII_BASE_URL') || 'https://api.ng.termii.com';
    this.senderId = this.configService.get<string>('TERMII_SENDER_ID') || 'SchoolOS';
  }

  async sendEmail(payload: NotificationPayload): Promise<DeliveryReceipt> {
    throw new Error('TermiiProvider does not support Email.');
  }

  async sendPush(userId: string, title: string, body: string): Promise<DeliveryReceipt> {
    throw new Error('TermiiProvider does not support Push.');
  }

  async sendSms(to: string, message: string): Promise<DeliveryReceipt> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/sms/send`, {
        to,
        from: this.senderId,
        sms: message,
        type: 'plain',
        channel: 'generic',
        api_key: this.apiKey,
      });

      return {
        success: true,
        providerMessageId: response.data?.message_id,
      };
    } catch (error: any) {
      this.logger.error(`Termii SMS Error: ${error.message}`, error.response?.data);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async sendWhatsApp(to: string, message: string): Promise<DeliveryReceipt> {
    try {
      // Termii WhatsApp can use the same sms endpoint with channel = 'whatsapp' or 'whatsapp_otp'
      // depending on approval. For this implementation, generic whatsapp channel is assumed if supported.
      const response = await axios.post(`${this.baseUrl}/api/sms/send`, {
        to,
        from: this.senderId,
        sms: message,
        type: 'plain',
        channel: 'whatsapp',
        api_key: this.apiKey,
      });

      return {
        success: true,
        providerMessageId: response.data?.message_id,
      };
    } catch (error: any) {
      this.logger.error(`Termii WhatsApp Error: ${error.message}`, error.response?.data);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }
}
