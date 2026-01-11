/**
 * Suggestion Prompts
 * Prompts for generating contextual follow-up suggestions
 */

export const SuggestionPrompts = {
  system: `You are a proactive career assistant. Based on the user's context and recent activity, suggest helpful next actions.
Suggestions should be:
- Relevant to their career goals
- Actionable and specific
- Limited to 3-5 suggestions
- Friendly and encouraging

Return a JSON array of suggestion strings.`,

  user: (context?: string, activitySummary?: string) => {
    const contextPrompt = context
      ? `Current context: ${context}`
      : 'No specific context provided.';

    const activityPrompt = activitySummary
      ? `\n\nRecent activity: ${activitySummary}`
      : '\n\nNo recent activity found.';

    return `${contextPrompt}${activityPrompt}

Generate proactive suggestions for the user.`;
  },
};
