import Retell from 'retell-sdk';
import { DEFAULT_INTERVIEWER_MODEL_PROMPT } from '../prompts/retell_model.prompt';

export class RetellAIProvider {
  private retellAI: Retell;
  constructor(options?: { apiKey?: string }) {
    this.retellAI = new Retell({
      apiKey: options?.apiKey || process.env.RETELL_API_KEY!,
    });
  }
  async createDefaultAgent() {
    const defaultInterviewerModel = await this.retellAI.llm.create({
      model: 'gemini-2.5-flash-lite',
      general_prompt: DEFAULT_INTERVIEWER_MODEL_PROMPT,
      general_tools: [
        {
          type: 'end_call',
          name: 'end_call_default_interviewer',
          description:
            "End the call if the user uses goodbye phrases such as 'bye,' 'goodbye,' or 'have a nice day.' ",
        },
      ],
      start_speaker: 'agent',
    });
    await this.retellAI.agent.create({
      response_engine: {
        llm_id: defaultInterviewerModel.llm_id,
        type: 'retell-llm',
      },
      voice_id: '11labs-Chloe',
      agent_name: 'Henry',
    });
    await this.retellAI.agent.create({
      response_engine: {
        llm_id: defaultInterviewerModel.llm_id,
        type: 'retell-llm',
      },
      voice_id: '11labs-Chloe',
      agent_name: 'Marcus',
    });
    return defaultInterviewerModel;
  }
  async createInterviewer() {}
}
