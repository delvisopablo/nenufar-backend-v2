import { Module } from '@nestjs/common';
import { AuthEmailWebhookService } from './auth-email-webhook.service';

@Module({
  providers: [AuthEmailWebhookService],
  exports: [AuthEmailWebhookService],
})
export class EmailModule {}
