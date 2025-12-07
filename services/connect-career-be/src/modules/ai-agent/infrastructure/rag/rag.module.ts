import { Module } from '@nestjs/common';
import { AIModule } from '../../../../shared/infrastructure/external-services/ai/ai.module';

// Stores
import { JobStore } from './stores/job.store';
import { CompanyStore } from './stores/company.store';
import { LearningStore } from './stores/learning.store';
import { FaqStore } from './stores/faq.store';

// Retrieval
import { VectorRetriever } from './retrieval/vector-retriever';
import { HybridRetriever } from './retrieval/hybrid-retriever';
import { JobRetriever } from './retrieval/job-retriever';
import { CompanyRetriever } from './retrieval/company-retriever';
import { LearningRetriever } from './retrieval/learning-retriever';
import { FaqRetriever } from './retrieval/faq-retriever';

// Query Processing
import { QueryRewriterService } from './query/rewriter.service';
import { QueryExpanderService } from './query/expander.service';
import { QueryNormalizerService } from './query/normalizer.service';

// Ranking
import { CrossEncoderRanker } from './ranking/cross-encoder-ranker';
import { ScoreFusionService } from './ranking/score-fusion';

// Ingestion
import { JobIngestionService } from './ingestion/job.ingest';
import { CompanyIngestionService } from './ingestion/company.ingest';
import { LearningIngestionService } from './ingestion/learning.ingest';
import { FaqIngestionService } from './ingestion/faq.ingest';
import { CvIngestionService } from './ingestion/cv.ingest';

// RAG Services
import { JobRagService } from './rag-services/job-rag.service';
import { CompanyRagService } from './rag-services/company-rag.service';
import { LearningPathRagService } from './rag-services/learning-path-rag.service';
import { FaqRagService } from './rag-services/faq-rag.service';
import { MultiRagService } from './rag-services/multi-rag.service';

@Module({
  imports: [AIModule],
  providers: [
    // Stores
    JobStore,
    CompanyStore,
    LearningStore,
    FaqStore,

    // Retrieval
    VectorRetriever,
    HybridRetriever,
    JobRetriever,
    CompanyRetriever,
    LearningRetriever,
    FaqRetriever,

    // Query Processing
    QueryRewriterService,
    QueryExpanderService,
    QueryNormalizerService,

    // Ranking
    CrossEncoderRanker,
    ScoreFusionService,

    // Ingestion
    JobIngestionService,
    CompanyIngestionService,
    LearningIngestionService,
    FaqIngestionService,
    CvIngestionService,

    // RAG Services
    JobRagService,
    CompanyRagService,
    LearningPathRagService,
    FaqRagService,
    MultiRagService,
  ],
  exports: [
    // Stores
    JobStore,
    CompanyStore,
    LearningStore,
    FaqStore,

    // Retrieval
    VectorRetriever,
    HybridRetriever,
    JobRetriever,
    CompanyRetriever,
    LearningRetriever,
    FaqRetriever,

    // Query Processing
    QueryRewriterService,
    QueryExpanderService,
    QueryNormalizerService,

    // Ranking
    CrossEncoderRanker,
    ScoreFusionService,

    // Ingestion
    JobIngestionService,
    CompanyIngestionService,
    LearningIngestionService,
    FaqIngestionService,
    CvIngestionService,

    // RAG Services
    JobRagService,
    CompanyRagService,
    LearningPathRagService,
    FaqRagService,
    MultiRagService,
  ],
})
export class RagModule {}
