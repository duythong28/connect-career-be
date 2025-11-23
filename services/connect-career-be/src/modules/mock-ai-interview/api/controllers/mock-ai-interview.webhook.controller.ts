import {
  Body,
  Controller,
  InternalServerErrorException,
  Logger,
  Post,
} from '@nestjs/common';
import { Public } from 'src/modules/identity/api/decorators';
import { ResponseService } from '../services/response.service';
import { AnalyticsService } from '../services/analytics.service';
import { RetellAIProvider } from 'src/shared/infrastructure/external-services/ai/providers/retell-ai.provider';

@Controller('v1/mock-ai-interview/webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly responseService: ResponseService,
    private readonly analyticsService: AnalyticsService,
    private readonly retellAIProvider: RetellAIProvider,
  ) {}
  @Post('retell')
  @Public()
  async retell(@Body() body: { event: string; call_id: string }) {
    this.logger.log('Received Retail Webhook: ', JSON.stringify(body));
    try {
      const { event, call_id } = body;
      if (event === 'call_analyzed' && call_id) {
        const response =
          await this.responseService.getResponseByCallId(call_id);

        if (!response.isAnalysed) {
          // Retrieve call details from Retell
          const callData =
            await this.retellAIProvider.retrieveCallDetails(call_id);

          // Generate analytics
          const analytics =
            await this.analyticsService.generateInterviewAnalytics(
              {
                transcript: callData.transcript || '',
                transcript_object: callData.transcript_object,
                call_analysis: callData.call_analysis,
                duration:
                  callData.end_timestamp && callData.start_timestamp
                    ? Math.floor(
                        (new Date(callData.end_timestamp).getTime() -
                          new Date(callData.start_timestamp).getTime()) /
                          1000,
                      )
                    : undefined,
              },
              response.sessionId,
            );

          // Save analytics to database
          await this.responseService.saveResponse(call_id, {
            transcript: callData.transcript,
            analytics,
            isAnalysed: true,
            duration:
              callData.end_timestamp && callData.start_timestamp
                ? Math.floor(
                    (new Date(callData.end_timestamp).getTime() -
                      new Date(callData.start_timestamp).getTime()) /
                      1000,
                  )
                : undefined,
          });
          this.logger.log(`Analytics generated for call ${call_id}`);
        }
      } else {
        this.logger.warn(
          `Received unsupported event: ${event} for call ${call_id}`,
        );
      }
      return { success: true, message: 'Webhook processed successfully' };
    } catch (error) {
      this.logger.error('Error processing Retail Webhook: ', error);
      throw new InternalServerErrorException('Error processing Retail Webhook');
    }
  }
}
