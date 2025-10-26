import { Body, Controller, Post } from '@nestjs/common';
import { Public } from 'src/modules/identity/api/decorators';

@Controller('v1/mock-ai-interview/webhook')
export class WebhookController {
  @Post('retell')
  @Public()
  async retell(@Body() body: any) {}
}
