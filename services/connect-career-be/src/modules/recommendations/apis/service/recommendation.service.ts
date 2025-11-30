import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class RecommendationService {
  constructor(private readonly http: HttpService) {}

  async getRecommendations(userId: string) {
    const aiUrl = process.env.AI_RECOMMENDER_URL || 'http://ai-service:8000';

    const { data } = await firstValueFrom(
      this.http.post<{ jobIds: string[] }>(`${aiUrl}/recommendations`, {
        userId,
        limit: 20,
      }),
    );

    return data.jobIds ?? [];
  }
}
