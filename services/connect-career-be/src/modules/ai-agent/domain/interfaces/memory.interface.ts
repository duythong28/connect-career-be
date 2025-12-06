export interface IMemory {
  store(key: string, value: any, metadata?: Record<string, any>): Promise<void>;
  retrieve(key: string): Promise<any | null>;
  search(
    query: string,
    limit?: number,
  ): Promise<Array<{ key: string; value: any; score: number }>>;
  delete(key: string): Promise<void>;
}

export interface EpisodicMemory extends IMemory {
  storeEvent(userId: string, event: any, timestamp?: Date): Promise<void>;
  retrieveEvents(
    userId: string,
    timeRange?: { start: Date; end: Date },
  ): Promise<any[]>;
}

export interface SemanticMemory extends IMemory {
  storeConcept(
    concept: string,
    embedding: number[],
    metadata?: Record<string, any>,
  ): Promise<void>;
  findSimilar(
    embedding: number[],
    limit?: number,
  ): Promise<Array<{ concept: string; score: number }>>;
}

export interface ProceduralMemory extends IMemory {
  storeProcedure(name: string, steps: any[]): Promise<void>;
  retrieveProcedure(name: string): Promise<any[] | null>;
}
