const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param, validationResult } = require('express-validator');
const { validate: validateUuid } = require('uuid');
const sessionManager = require('../utils/sessionManager');
const { generateRAGResponse } = require('../services/ragService');

const router = express.Router();

// Rate limiting: max 20 requests per minute per IP
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(chatLimiter);

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
 * POST /api/chat
 * Body: { message: string, conversationId?: string }
 */
router.post(
  '/',
  [
    body('message').isString().trim().notEmpty().withMessage('Message is required.'),
    body('conversationId')
      .optional()
      .custom((value) => validateUuid(value))
      .withMessage('conversationId must be a valid UUID.'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { message } = req.body;
    let { conversationId } = req.body;

    if (!conversationId) {
      conversationId = sessionManager.createSession(null);
    }

    const conversation = sessionManager.getConversation(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    try {
      sessionManager.addMessage(conversationId, 'user', message);

      const historyForRag = conversation.messages || [];

      const ragResult = await generateRAGResponse(message, historyForRag);

      sessionManager.addMessage(conversationId, 'assistant', ragResult.response);

      const timestamp = new Date().toISOString();

      const sources =
        (ragResult.sources || []).map((s) => ({
          text: s.metadata?.text || '',
          score: s.score,
        })) || [];

      return res.json({
        conversationId,
        response: ragResult.response,
        sources,
        confidence: ragResult.confidence,
        timestamp,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Chat route error:', error);
      return res.status(500).json({ error: 'Failed to process chat request.' });
    }
  }
);

/**
 * GET /api/chat/history/:conversationId
 */
router.get(
  '/history/:conversationId',
  [param('conversationId').custom((value) => validateUuid(value)).withMessage('Invalid conversationId.')],
  (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { conversationId } = req.params;

    const conversation = sessionManager.getConversation(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    return res.json({
      conversationId,
      messages: conversation.messages,
      metadata: conversation.metadata,
    });
  }
);

/**
 * DELETE /api/chat/:conversationId
 */
router.delete(
  '/:conversationId',
  [param('conversationId').custom((value) => validateUuid(value)).withMessage('Invalid conversationId.')],
  (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { conversationId } = req.params;

    const deleted = sessionManager.deleteSession(conversationId);
    if (!deleted) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    return res.json({ success: true });
  }
);

/**
 * POST /api/chat/clear-all
 */
router.post('/clear-all', (_req, res) => {
  const cleared = sessionManager.clearAll();
  return res.json({ cleared });
});

module.exports = router;

