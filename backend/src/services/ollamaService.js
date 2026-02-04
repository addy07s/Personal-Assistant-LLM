const axios = require('axios');

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

const http = axios.create({
  baseURL: OLLAMA_BASE_URL,
  timeout: 30_000,
});

/**
 * Generate a chat response from Ollama using the llama3.2 model.
 *
 * @param {string} prompt - System prompt and context for the assistant.
 * @param {Array<{ role: 'user' | 'assistant' | 'system', content: string }>} conversationHistory - Prior messages.
 * @returns {Promise<string>} - The generated response text.
 */
async function generateResponse(prompt, conversationHistory = []) {
  const historyText = (conversationHistory || [])
    .map((m) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`)
    .join('\n');

  const fullPrompt = `${prompt}\n\nConversation so far:\n${historyText}\n\nAssistant:`;

  try {
    const response = await http.post('/api/generate', {
      model: 'llama3.2',
      prompt: fullPrompt,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 2000,
      },
    });

    const data = response.data;

    if (!data) {
      throw new Error('Empty response from Ollama.');
    }

    // Non-streaming generate returns a single object with response text in `response` or `output`.
    const text = data.response || data.output || data.message || '';

    if (!text) {
      throw new Error('No text content returned from Ollama.');
    }

    return text;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Ollama generateResponse error:', error.message || error);
    throw new Error('Failed to generate response from Ollama.');
  }
}

/**
 * Generate embeddings for one or more texts using the nomic-embed-text model.
 *
 * @param {string | string[]} text - Single string or array of strings to embed.
 * @returns {Promise<number[][]>} - Array of embedding vectors (each ~384 dimensions).
 */
async function generateEmbedding(text) {
  const texts = Array.isArray(text) ? text : [text];

  try {
    const embeddings = [];

    // Ollama embeddings endpoint currently accepts a single prompt at a time.
    // Loop over texts to provide simple batch support.
    // In a real system you might parallelize these requests with Promise.all.
    // Keeping sequential here for simplicity and to avoid overloading local Ollama.
    // eslint-disable-next-line no-restricted-syntax
    for (const t of texts) {
      // eslint-disable-next-line no-await-in-loop
      const response = await http.post('/api/embeddings', {
        model: 'nomic-embed-text',
        prompt: t,
      });

      const data = response.data;

      if (!data || !data.embedding) {
        throw new Error('Invalid embedding response from Ollama.');
      }

      embeddings.push(data.embedding);
    }

    return embeddings;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Ollama generateEmbedding error:', error.message || error);
    throw new Error('Failed to generate embeddings from Ollama.');
  }
}

/**
 * Check connectivity to Ollama and list available models.
 * @returns {Promise<{ status: 'connected' | 'disconnected', models: string[] }>}
 */
async function checkOllama() {
  try {
    const response = await http.get('/api/tags');
    const models = (response.data?.models || []).map((m) => m.name || '').filter(Boolean);
    return { status: 'connected', models };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Ollama health check failed:', error.message || error);
    return { status: 'disconnected', models: [] };
  }
}

module.exports = {
  generateResponse,
  generateEmbedding,
  checkOllama,
};

