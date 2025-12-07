
```mermaid
flowchart LR
  subgraph Ingestion & Storage
    A[App/Web Events\nImpression/Click/Save/Apply] -->|Kafka| B[Stream Processor\n(Flink/Spark)]
    B --> C[(Data Lake\nS3/GCS - Parquet)]
    D[Operational DB\nJobs/Companies/Skills] --> C
    E[Taxonomy/Ontology\n(ESCO/O*NET, synonyms)] --> C
  end

  subgraph Feature Engineering (Batch)
    C --> F[ETL/Feature Jobs\nPySpark/Pandas]
    F --> G[(Offline Feature Store\nParquet)]
    F --> H[Modeling Datasets\ntrain/valid/test]
  end

  subgraph Embeddings
    H --> I1[Text Embeddings\n(E5/SBERT) for CV/JD]
    H --> I2[Skill Graph Features\nco-occurrence/GNN]
    I1 --> H2[Feature Join]
    I2 --> H2
  end

  subgraph Training & Registry
    H2 --> J[Ranker Training\nLightGBM Lambdarank]
    J --> K[Model Registry\n(MLflow/Artifacts)]
    J --> M[Feature Importance/Reports]
  end

  subgraph Online Serving
    K --> N[Ranker Service]
    G --> O[(Online Feature Store\nRedis/Feast)]
    P[Elasticsearch\nBM25 + Vector] --> N
    O --> N
    Q[Candidate Gen\n(BM25/Vector/CF/Graph)] --> P
    R[Re-ranking/Rules\nMMR, Diversity, Guardrails] --> S[API /recommendations]
    N --> R
    S --> T[Frontend]
  end

  T -->|view_id| A
  S -->|Impressions/Clicks/Apply| A
```
