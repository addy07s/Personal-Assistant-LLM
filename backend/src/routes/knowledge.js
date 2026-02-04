const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const {
  upsertDocument,
  deleteDocument,
  listAllDocuments,
  searchSimilar,
} = require('../services/pineconeService');
const { generateEmbedding } = require('../services/ollamaService');

const router = express.Router();

const MAX_TEXT_LENGTH = 5000;

const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  return null;
};

/**
 * POST /api/knowledge/add
 * Body: { text: string, category?: string, source?: string }
 */
router.post(
  '/add',
  [
    body('text')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Text is required.')
      .isLength({ max: MAX_TEXT_LENGTH })
      .withMessage(`Text must be at most ${MAX_TEXT_LENGTH} characters.`),
    body('category').optional().isString(),
    body('source').optional().isString(),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { text, category, source } = req.body;

    try {
      const [embedding] = await generateEmbedding(text);
      const id = uuidv4();

      await upsertDocument(id, text, embedding, {
        category,
        source,
      });

      return res.json({
        id,
        success: true,
        message: 'Knowledge added',
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Knowledge add error:', error);
      return res.status(500).json({ error: 'Failed to add knowledge document.' });
    }
  }
);

/**
 * POST /api/knowledge/bulk-add
 * Body: { documents: [{ text, category, source }] }
 */
router.post(
  '/bulk-add',
  [
    body('documents').isArray({ min: 1 }).withMessage('documents must be a non-empty array.'),
    body('documents.*.text')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Each document must have text.')
      .isLength({ max: MAX_TEXT_LENGTH })
      .withMessage(`Text must be at most ${MAX_TEXT_LENGTH} characters.`),
    body('documents.*.category').optional().isString(),
    body('documents.*.source').optional().isString(),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { documents } = req.body;

    let added = 0;
    let failed = 0;

    try {
      const texts = documents.map((d) => d.text);
      const embeddings = await generateEmbedding(texts);

      const upsertPromises = documents.map((doc, index) => {
        const id = uuidv4();
        const embedding = embeddings[index];

        return upsertDocument(id, doc.text, embedding, {
          category: doc.category,
          source: doc.source,
        })
          .then(() => {
            added += 1;
          })
          .catch((error) => {
            failed += 1;
            // eslint-disable-next-line no-console
            console.error('Bulk add document failed:', error);
          });
      });

      await Promise.all(upsertPromises);

      return res.json({
        added,
        failed,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Bulk add error:', error);
      return res.status(500).json({ error: 'Failed to bulk add knowledge documents.' });
    }
  }
);

/**
 * GET /api/knowledge/search
 * Query: ?q=search_term&limit=5
 */
router.get(
  '/search',
  [
    query('q').isString().trim().notEmpty().withMessage('q (search term) is required.'),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { q } = req.query;
    const limit = req.query.limit || 5;

    try {
      const [embedding] = await generateEmbedding(q);
      const matches = await searchSimilar(embedding, limit);

      const results = matches.map((m) => ({
        id: m.id,
        text: m.metadata?.text || '',
        category: m.metadata?.category || 'general',
        source: m.metadata?.source || 'unknown',
        score: m.score,
      }));

      return res.json({ results });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Knowledge search error:', error);
      return res.status(500).json({ error: 'Failed to search knowledge base.' });
    }
  }
);

/**
 * GET /api/knowledge/list
 * Paginated: ?page=1&limit=50
 */
router.get(
  '/list',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const page = req.query.page || 1;
    const limit = req.query.limit || 50;

    try {
      const docs = await listAllDocuments();
      const total = docs.length;
      const start = (page - 1) * limit;
      const end = start + limit;
      const items = docs.slice(start, end);

      return res.json({
        page,
        limit,
        total,
        items,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Knowledge list error:', error);
      return res.status(500).json({ error: 'Failed to list knowledge documents.' });
    }
  }
);

/**
 * DELETE /api/knowledge/:id
 */
router.delete(
  '/:id',
  [param('id').isString().trim().notEmpty().withMessage('id is required.')],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { id } = req.params;

    try {
      await deleteDocument(id);
      return res.json({ success: true });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Knowledge delete error:', error);
      return res.status(500).json({ error: 'Failed to delete knowledge document.' });
    }
  }
);

module.exports = router;

