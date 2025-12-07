import {
  Controller,
  Post,
  Body,
  Get,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/identity/api/guards/jwt-auth.guard';
import { BotpressWebhookDto } from '../dtos/botpress-webhook.dto';
import * as currentUserDecorator from 'src/modules/identity/api/decorators';
import { BotpressIntegrationService } from '../services/botpress-integration.service';

@Controller('v1/botpress')
export class BotpressController {
  constructor(private readonly botpressService: BotpressIntegrationService) {}

  @Post('webhook')
  @UseGuards(JwtAuthGuard)
  async handleWebhook(
    @Body() webhookDto: BotpressWebhookDto,
    @currentUserDecorator.CurrentUser()
    user: currentUserDecorator.CurrentUserPayload,
  ) {
    // return await this.botpressService.handleWebhook(webhookDto, user);
  }

  @Get('health')
  healthCheck() {
    return { status: 'ok', service: 'botpress-integration' };
  }
}
