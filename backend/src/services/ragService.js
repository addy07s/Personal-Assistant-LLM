const { generateEmbedding, generateResponse } = require('./ollamaService');
const { searchSimilar } = require('./pineconeService');

/**
 * Retrieve relevant context documents for a user query.
 *
 * @param {string} userQuery
 * @param {number} [topK=3]
 * @returns {Promise<{ contextText: string, documents: Array<{ id: string, score: number, metadata: any }> }>}
 */
async function getRelevantContext(userQuery, topK = 3) {
  const [queryEmbedding] = await generateEmbedding([userQuery]);
  const matches = await searchSimilar(queryEmbedding, topK);

  const contextParts = matches.map((m, idx) => {
    const text = m.metadata?.text || '';
    return `Source ${idx + 1} (score: ${m.score?.toFixed(3) ?? 'n/a'}):\n${text}`;
  });

  const contextText = contextParts.join('\n\n');

  return {
    contextText,
    documents: matches,
  };
}

/**
 * Generate a RAG response combining Pinecone retrieval and Ollama generation.
 *
 * @param {string} userQuery
 * @param {Array<{ role: 'user' | 'assistant' | 'system', content: string }>} [conversationHistory=[]]
 * @returns {Promise<{ response: string, sources: Array<any>, confidence: 'high' | 'medium' | 'low' }>}
 */
async function generateRAGResponse(userQuery, conversationHistory = []) {
  try {
    let contextResult = { contextText: '', documents: [] };

    try {
      contextResult = await getRelevantContext(userQuery, 3);
    } catch (contextError) {
      // eslint-disable-next-line no-console
      console.error('Failed to retrieve context from Pinecone:', contextError.message || contextError);
    }

    const { contextText, documents } = contextResult;

    const systemPrompt =
      'You are an enterprise AI assistant. Use the following context to answer questions accurately. ' +
      "If the context doesn't contain the answer, say that the information is not available in the knowledge base " +
      'and avoid making up facts.';

    const historyTail = (conversationHistory || []).slice(-5);

    const ragPromptParts = [
      `System: ${systemPrompt}`,
      '',
      'Context documents:',
      contextText || '[No context available]',
      '',
      'Recent conversation:',
      historyTail
        .map((m) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`)
        .join('\n') || '[No previous conversation]',
      '',
      `User question: ${userQuery}`,
      '',
      'Answer clearly and concisely. If you are unsure, say so explicitly.',
    ];

    const ragPrompt = ragPromptParts.join('\n');

    const responseText = await generateResponse(ragPrompt, historyTail);

    const scores = documents.map((d) => d.score || 0);
    const maxScore = scores.length ? Math.max(...scores) : 0;

    let confidence = 'low';
    if (maxScore >= 0.7) {
      confidence = 'high';
    } else if (maxScore >= 0.4) {
      confidence = 'medium';
    }

    return {
      response: responseText,
      sources: documents,
      confidence,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('RAG generation error:', error.message || error);

    return {
      response:
        'I encountered an error while trying to answer that question using the knowledge base. ' +
        'You may try again in a moment, or contact an administrator if the problem persists.',
      sources: [],
      confidence: 'low',
    };
  }
}

module.exports = {
  getRelevantContext,
  generateRAGResponse,
};

