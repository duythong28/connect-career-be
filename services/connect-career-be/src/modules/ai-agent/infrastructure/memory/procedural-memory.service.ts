import { Injectable, Logger } from '@nestjs/common';
import { ProceduralMemory } from '../../domain/interfaces/memory.interface';

interface Procedure {
  name: string;
  steps: any[];
  metadata?: Record<string, any>;
  timestamp: Date;
}

@Injectable()
export class ProceduralMemoryService implements ProceduralMemory {
  private readonly logger = new Logger(ProceduralMemoryService.name);
  private readonly procedures = new Map<string, Procedure>();

  async store(key: string, value: any, metadata?: Record<string, any>): Promise<void> {
    // Store procedural memory entry
    this.procedures.set(key, {
      name: key,
      steps: Array.isArray(value) ? value : [value],
      metadata,
      timestamp: new Date(),
    });
  }

  async retrieve(key: string): Promise<any | null> {
    const procedure = this.procedures.get(key);
    return procedure ? procedure.steps : null;
  }

  async search(query: string, limit: number = 10): Promise<Array<{ key: string; value: any; score: number }>> {
    // Search procedures by name or step content
    const results: Array<{ key: string; value: any; score: number }> = [];
    const queryLower = query.toLowerCase();

    for (const [key, procedure] of this.procedures.entries()) {
      if (key.toLowerCase().includes(queryLower)) {
        results.push({
          key,
          value: procedure,
          score: 1.0,
        });
      } else {
        // Search in steps
        const stepsStr = JSON.stringify(procedure.steps).toLowerCase();
        if (stepsStr.includes(queryLower)) {
          results.push({
            key,
            value: procedure,
            score: 0.7,
          });
        }
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  async delete(key: string): Promise<void> {
    this.procedures.delete(key);
  }

  async storeProcedure(name: string, steps: any[]): Promise<void> {
    this.procedures.set(name, {
      name,
      steps,
      timestamp: new Date(),
    });
  }

  async retrieveProcedure(name: string): Promise<any[] | null> {
    const procedure = this.procedures.get(name);
    return procedure ? procedure.steps : null;
  }
}

