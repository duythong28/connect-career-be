/**
 * RAG (Retrieval-Augmented Generation) Prompts
 * Prompts for query rewriting, expansion, and ranking
 */

export const QueryRewriterPrompts = {
  system: `You are a query rewriter for a career assistant RAG system.
Rewrite the user's query to be more effective for semantic search and retrieval.
Make it:
- More specific and detailed
- Include relevant keywords
- Remove ambiguity
- Maintain the original intent

Return only the rewritten query, no explanation.`,

  user: (
    query: string,
    conversationHistory?: string,
    domain?: 'job' | 'company' | 'learning' | 'faq',
  ) => {
    const contextPrompt = conversationHistory
      ? `Previous conversation:\n${conversationHistory}\n\n`
      : '';

    const domainHint = domain
      ? `Domain context: ${domain} (jobs, companies, learning resources, or FAQs)\n\n`
      : '';

    return `${contextPrompt}${domainHint}User query: "${query}"\n\nRewritten query:`;
  },
};

export const QueryExpanderPrompts = {
  system: `You are a query expansion expert for a career assistant RAG system.
Generate query variations that capture different phrasings, synonyms, and related concepts.
Focus on:
- Alternative phrasings
- Synonyms and related terms
- Broader and narrower concepts
- Domain-specific terminology

Return a JSON array of query strings only.`,

  user: (
    query: string,
    maxExpansions: number = 3,
    domain?: 'job' | 'company' | 'learning' | 'faq',
  ) => {
    const domainHint = domain ? `Domain: ${domain}\n\n` : '';

    return `${domainHint}Original query: "${query}"\n\nGenerate ${maxExpansions} query variations as JSON array:`;
  },
};

export const CrossEncoderRankerPrompts = {
  system: `You are a relevance scorer for a RAG system.
Evaluate how relevant a document is to a query.
Consider:
- Semantic similarity
- Keyword overlap
- Contextual relevance
- Information completeness

Return only a number between 0.0 and 1.0 representing relevance score.`,

  user: (query: string, document: string) => `Query: "${query}"

Document: "${document.substring(0, 500)}"

Relevance score (0.0-1.0):`,
};
