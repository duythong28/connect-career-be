import { ScenarioContext } from './context.interface';

export interface IScenarioAgent {
  switchPersona(
    currentPersona: string,
    context: ScenarioContext,
  ): Promise<string>;

  generateScenarioPrompt(
    role: string,
    scenario: string,
    persona: string,
  ): Promise<string>;
}
