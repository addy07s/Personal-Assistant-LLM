const { Pinecone } = require('@pinecone-database/pinecone');

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME;

if (!PINECONE_API_KEY) {
  // eslint-disable-next-line no-console
  console.warn('PINECONE_API_KEY is not set. Pinecone operations will fail until it is configured.');
}

const pinecone = new Pinecone({
  apiKey: PINECONE_API_KEY || '',
});

function getIndex() {
  if (!PINECONE_INDEX_NAME) {
    throw new Error('PINECONE_INDEX_NAME is not configured.');
  }

  try {
    return pinecone.index(PINECONE_INDEX_NAME);
  } catch (error) {
    throw new Error(`Failed to initialize Pinecone index: ${error.message || error}`);
  }
}

async function withRetry(fn, attempts = 3) {
  let lastError;
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < attempts; i++) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await fn();
    } catch (error) {
      lastError = error;
      const isLast = i === attempts - 1;
      // eslint-disable-next-line no-console
      console.error(`Pinecone operation failed (attempt ${i + 1}/${attempts}):`, error.message || error);
      if (isLast) break;
    }
  }

  throw lastError;
}

/**
 * Check connectivity to Pinecone.
 * @returns {Promise<{ status: 'connected' | 'disconnected', indexName: string | null }>}
 */
async function checkPinecone() {
  try {
    const index = getIndex();
    await index.describeIndexStats();
    return { status: 'connected', indexName: PINECONE_INDEX_NAME || null };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Pinecone health check failed:', error.message || error);
    return { status: 'disconnected', indexName: PINECONE_INDEX_NAME || null };
  }
}

/**
 * Upsert a document into Pinecone.
 *
 * @param {string} id
 * @param {string} text
 * @param {number[]} embedding
 * @param {{ category?: string, timestamp?: string, source?: string }} metadata
 * @returns {Promise<{ success: boolean }>}
 */
async function upsertDocument(id, text, embedding, metadata = {}) {
  return withRetry(async () => {
    const index = getIndex();

    const nowIso = new Date().toISOString();

    const fullMetadata = {
      text,
      category: metadata.category || 'general',
      timestamp: metadata.timestamp || nowIso,
      source: metadata.source || 'manual',
    };

    await index.upsert({
      records: [
        {
          id,
          values: embedding,
          metadata: fullMetadata,
        },
      ],
    });

    return { success: true };
  });
}

/**
 * Search for similar documents in Pinecone.
 *
 * @param {number[]} queryEmbedding
 * @param {number} [topK=5]
 * @returns {Promise<Array<{ id: string, score: number, metadata: any }>>}
 */
async function searchSimilar(queryEmbedding, topK = 5) {
  return withRetry(async () => {
    const index = getIndex();

    const result = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    });

    const matches = (result.matches || []).map((m) => ({
      id: m.id,
      score: m.score,
      metadata: m.metadata || {},
    }));

    matches.sort((a, b) => (b.score || 0) - (a.score || 0));

    return matches;
  });
}

/**
 * Delete a document from Pinecone.
 *
 * @param {string} id
 * @returns {Promise<{ success: boolean }>}
 */
async function deleteDocument(id) {
  return withRetry(async () => {
    const index = getIndex();
    await index.deleteOne(id);
    return { success: true };
  });
}

/**
 * List all documents' metadata from the index (admin view).
 *
 * @returns {Promise<Array<any>>}
 */
async function listAllDocuments() {
  return withRetry(async () => {
    const index = getIndex();
    const allMetadata = [];

    const paginator = index.listPaginated();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const { vectors, done } = await paginator.next();
      if (vectors && Array.isArray(vectors)) {
        vectors.forEach((v) => {
          allMetadata.push({
            id: v.id,
            ...(v.metadata || {}),
          });
        });
      }
      if (done) break;
    }

    return allMetadata;
  });
}

module.exports = {
  upsertDocument,
  searchSimilar,
  deleteDocument,
  listAllDocuments,
  checkPinecone,
};

