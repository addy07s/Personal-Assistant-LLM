const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const dotenv = require('dotenv');

dotenv.config();

const { checkOllama } = require('./services/ollamaService');
const { checkPinecone } = require('./services/pineconeService');
const chatRoutes = require('./routes/chat');
const knowledgeRoutes = require('./routes/knowledge');

async function createApp() {
  const app = express();

  app.use(
    cors({
      origin: 'http://localhost:5173',
      credentials: true,
    })
  );
  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));

  app.get('/api/health', async (_req, res) => {
    try {
      const [ollamaStatus, pineconeStatus] = await Promise.all([checkOllama(), checkPinecone()]);

      return res.json({
        status: 'ok',
        ollama: ollamaStatus.status,
        pinecone: pineconeStatus.status,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Health check error:', error);
      return res.status(500).json({
        status: 'error',
        ollama: 'unknown',
        pinecone: 'unknown',
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.use('/api/chat', chatRoutes);
  app.use('/api/knowledge', knowledgeRoutes);

  // 404 handler
  app.use((req, res, next) => {
    if (res.headersSent) return next();
    return res.status(404).json({ error: 'Route not found.' });
  });

  // Error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    // eslint-disable-next-line no-console
    console.error('Unhandled error:', err);
    const status = err.status || 500;
    const message = err.message || 'Internal server error';
    res.status(status).json({ error: message, status });
  });

  return app;
}

async function startServer() {
  const app = await createApp();

  const PORT = process.env.PORT || 3000;

  // Startup checks
  const [ollamaStatus, pineconeStatus] = await Promise.all([checkOllama(), checkPinecone()]);

  // eslint-disable-next-line no-console
  console.log(
    `Ollama: ${ollamaStatus.status}${
      ollamaStatus.models && ollamaStatus.models.length
        ? ` (models: ${ollamaStatus.models.join(', ')})`
        : ''
    }`
  );
  // eslint-disable-next-line no-console
  console.log(`Pinecone: ${pineconeStatus.status} (index: ${pineconeStatus.indexName || 'unknown'})`);

  const server = app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend server listening on port ${PORT}`);
  });

  const shutdown = (signal) => {
    // eslint-disable-next-line no-console
    console.log(`Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      // eslint-disable-next-line no-console
      console.log('Server closed.');
      process.exit(0);
    });

    // Force exit if not closed in 10 seconds
    setTimeout(() => {
      // eslint-disable-next-line no-console
      console.error('Forcing shutdown.');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', error);
  process.exit(1);
});

