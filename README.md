# Enterprise AI Assistant (Ollama + Pinecone)

An end‑to‑end **enterprise knowledge assistant** for a SaaS product – your own Jarvis for the enterprise.  
It uses a **self‑hosted LLM (Ollama / LLaMA)**, **Pinecone** as a vector database, and a modern **React + Vite + Tailwind** chatbot UI.

---

## 1. Project Structure

```text
enterprise-ai-assistant/
├── backend/              # Node.js + Express RAG API
│   ├── src/
│   │   ├── services/
│   │   │   ├── ollamaService.js   # Calls local Ollama (LLaMA + embeddings)
│   │   │   ├── pineconeService.js # Pinecone client + vector ops
│   │   │   └── ragService.js      # Retrieval-Augmented Generation orchestration
│   │   ├── routes/
│   │   │   ├── chat.js            # Chat endpoints with sessions & rate limit
│   │   │   └── knowledge.js       # Knowledge management CRUD + search
│   │   ├── utils/
│   │   │   └── sessionManager.js  # In‑memory conversation store
│   │   └── server.js              # Express app, health checks, startup
│   ├── package.json
│   └── .env.example
├── frontend/            # React + Vite + Tailwind chatbot UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatInterface.jsx  # Main chat experience
│   │   │   ├── MessageList.jsx    # Message rendering, markdown, sources
│   │   │   ├── ChatInput.jsx      # Input box with validation
│   │   │   └── KnowledgePanel.jsx # Admin knowledge base panel
│   │   ├── services/
│   │   │   └── api.js             # Axios wrapper for backend API
│   │   ├── App.jsx                # Layout, health status, dark mode
│   │   └── main.jsx               # Vite/React entry (standard)
│   ├── tailwind.config.js
│   ├── src/index.css
│   ├── package.json
│   └── .env.example
├── .gitignore
└── README.md
```

---

## 2. Prerequisites

- **Node.js** ≥ 18 (for both frontend and backend)
- **npm** or **yarn**
- **Ollama** installed and running locally  
  - Install from `https://ollama.com/`
  - Pull required models:
    ```bash
    ollama pull llama3.2
    ollama pull nomic-embed-text
    ```
- **Pinecone** account and API key (`https://www.pinecone.io/`)
  - Create an index (e.g. `enterprise-assistant`) with dimension **384** for `nomic-embed-text`.

---

## 3. Environment Configuration

### 3.1 Backend (`backend/.env`)

Use `.env.example` as a template:

```env
PORT=3000
OLLAMA_BASE_URL=http://localhost:11434
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=enterprise-assistant
PINECONE_ENVIRONMENT=your_environment
NODE_ENV=development
```

> The backend exposes REST endpoints for chat, knowledge management, and a health check at `/api/health`.

### 3.2 Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=Enterprise AI Assistant
```

---

## 4. Installation & Running

From the project root (`enterprise-ai-assistant`):

### 4.1 Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 4.2 Start services

1. **Start Ollama** (if not already running) and ensure:
   - `llama3.2` and `nomic-embed-text` are available.

2. **Start backend API**

```bash
cd backend
npm run dev
# or: npm start
```

The backend will:
- Validate connectivity to **Ollama** and **Pinecone**
- Log available Ollama models
- Serve:
  - `POST /api/chat` – chat completion with RAG
  - `GET /api/chat/history/:conversationId`
  - `DELETE /api/chat/:conversationId`, `POST /api/chat/clear-all`
  - `POST /api/knowledge/add`, `/bulk-add`
  - `GET /api/knowledge/search`, `/list`
  - `DELETE /api/knowledge/:id`
  - `GET /api/health` – health + connectivity info

3. **Start frontend UI**

```bash
cd ../frontend
npm run dev
```

Frontend runs on `http://localhost:5173` by default and talks to the backend at `VITE_API_URL`.

---

## 5. How It Works (High Level)

- **Chat Flow**
  1. User sends a message from the React chat UI (`ChatInterface`).
  2. Frontend calls `POST /api/chat` with optional `conversationId`.
  3. Backend:
     - Uses **`sessionManager`** to store conversation context in-memory (Map + auto-cleanup).
     - Calls **RAG service**:
       - Creates embedding with `nomic-embed-text` via Ollama.
       - Queries **Pinecone** for similar documents.
       - Builds a system + context prompt and calls **llama3.2** via Ollama.
     - Returns AI answer, sources, confidence, and a `conversationId`.
  4. UI renders assistant reply plus source snippets and confidence.

- **Knowledge Management**
  - Admin uses **Knowledge Panel**:
    - **Add Knowledge**: single or bulk documents (separated by `---`), with category and source.
    - **View All**: paginated list of vectors stored in Pinecone with delete actions.
    - **Search**: semantic search using the same embedding model; results show text, score, and category.

---

## 6. Frontend Features

- **Chat Experience**
  - Responsive, mobile‑friendly layout using **TailwindCSS**.
  - Chat bubbles with role‑based styling, timestamps, and markdown rendering (`react-markdown`).
  - Typing indicator, copy‑to‑clipboard, Enter/Shift+Enter behavior, validation, character limits.
  - Conversation + `conversationId` persisted in `localStorage`.

- **Knowledge Admin Panel**
  - Tabs for **Add Knowledge**, **View All**, and **Search**.
  - Bulk add via `---` separators.
  - Paginated table view with skeleton loaders, delete confirmation modal.
  - Search with similarity score visualizations.
  - Toasts via **react-hot-toast**.

- **App Shell**
  - Top nav with health indicator for **Ollama** and **Pinecone** (polling every 30s).
  - Dark mode toggle (saved in `localStorage`).
  - Framer‑motion animations for sidebar and transitions.
  - Simple error boundary wrapper.

---

## 7. Useful Commands

From `backend/`:

```bash
npm run dev     # Start backend in watch mode
npm start       # Start backend normally
```

From `frontend/`:

```bash
npm run dev     # Start Vite dev server
npm run build   # Production build
npm run preview # Preview production build
```

---

## 8. Notes & Next Steps

- This project uses **in‑memory sessions**; for production you should move session storage to Redis or another durable store.
- Ensure your **Pinecone index dimension** matches the embedding model (384 for `nomic-embed-text`).
- For enterprise use, add authentication and role‑based access for the knowledge admin panel.
- Error handling and logging are wired in, but you can integrate with observability tools (e.g. Datadog, Sentry) for production.

This repository is designed to be **simple to run**, yet **close to a real enterprise RAG assistant**: self‑hosted LLM, vector database, and a clean chatbot UI. Enjoy experimenting and extending it. 🚀

