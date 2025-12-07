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
    const henryInterviewer = await this.retellAI.agent.create({
      response_engine: {
        llm_id: defaultInterviewerModel.llm_id,
        type: 'retell-llm',
      },
      voice_id: '11labs-Anthony',
      agent_name: 'Henry',
    });
    const marcusInterviewer = await this.retellAI.agent.create({
      response_engine: {
        llm_id: defaultInterviewerModel.llm_id,
        type: 'retell-llm',
      },
      voice_id: '11labs-Amritanshu',
      agent_name: 'Marcus',
    });
    return {
      henryInterviewer,
      marcusInterviewer,
      defaultInterviewerModel,
    };
  }
  async createInterviewer() {}

  async createWebCall(
    agentId: string,
    dynamicVariables: Record<string, any>,
  ): Promise<{
    callId: string;
    accessToken: string;
  }> {
    try {
      const webCall = await this.retellAI.call.createWebCall({
        agent_id: agentId,
        retell_llm_dynamic_variables: dynamicVariables || {},
      });
      return {
        callId: webCall.call_id,
        accessToken: webCall.access_token,
      };
    } catch (error) {
      throw new Error(
        `Failed to create web call: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async retrieveCallDetails(callId: string): Promise<any> {
    try {
      const call = await this.retellAI.call.retrieve(callId);
      return call;
    } catch (error) {
      throw new Error(
        `Failed to retrieve call details: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
