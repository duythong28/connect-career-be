export interface DocumentChunk {
  id: string;
  content: string;
  embedding?: number[];
  metadata: {
    source: string;
    type: string;
    [key: string]: any;
  };
  score?: number;
}

export interface VectorStore {
  addDocuments(chunks: DocumentChunk[]): Promise<void>;
  similaritySearch(queryEmbedding: number[], limit: number, filter?: Record<string, any>): Promise<DocumentChunk[]>;
  deleteDocuments(ids: string[]): Promise<void>;
  updateDocument(id: string, chunk: Partial<DocumentChunk>): Promise<void>;
}

