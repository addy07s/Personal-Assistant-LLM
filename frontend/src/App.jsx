import React, { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Bars3Icon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import ChatInterface from './components/ChatInterface';
import KnowledgePanel from './components/KnowledgePanel';
import api from './services/api';

const THEME_KEY = 'enterprise-ai-assistant:theme';

function ErrorBoundary({ children }) {
  const [error, setError] = useState(null);

  // eslint-disable-next-line react/jsx-no-constructed-context-values
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    setError(null);
  }, [resetKey]);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-900 text-center text-slate-100">
        <h1 className="mb-2 text-xl font-semibold">Something went wrong</h1>
        <p className="mb-4 max-w-md text-sm text-slate-300">
          An unexpected error occurred in the interface. You can try reloading the app.
        </p>
        <button
          type="button"
          onClick={() => setResetKey((k) => k + 1)}
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
        >
          Reload interface
        </button>
      </div>
    );
  }

  return (
    <React.Suspense fallback={<div>Loading…</div>}>
      <div
        // eslint-disable-next-line react/no-unknown-property
        onError={(e) => {
          // eslint-disable-next-line no-console
          console.error(e);
          setError(e);
        }}
        key={resetKey}
      >
        {children}
      </div>
    </React.Suspense>
  );
}

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [health, setHealth] = useState({ status: 'loading', ollama: 'unknown', pinecone: 'unknown' });
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Initialize dark mode from localStorage
  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = storedTheme ? storedTheme === 'dark' : prefersDark;
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
  };

  // Health check polling
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await api.checkHealth();
        if (!res.success) throw new Error(res.error);
        if (!cancelled) {
          setHealth(res.data);
        }
      } catch (err) {
        if (!cancelled) {
          setHealth({
            status: 'error',
            ollama: 'disconnected',
            pinecone: 'disconnected',
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    check();
    const interval = setInterval(check, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-950 text-slate-100">
        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-600 border-t-primary" />
        <p className="text-sm text-slate-300">Starting Enterprise AI Assistant…</p>
      </div>
    );
  }

  const isHealthy = health.status === 'ok' && health.ollama === 'connected' && health.pinecone === 'connected';

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-50">
      <Toaster position="top-right" />
      <header className="border-b border-slate-800 bg-slate-900/80 px-4 py-2 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 shadow-sm hover:bg-slate-700 lg:hidden"
              onClick={() => setSidebarOpen((o) => !o)}
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight">Enterprise AI Assistant</span>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
                  RAG · LLaMA · Pinecone
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                <span
                  className={`inline-flex h-2 w-2 rounded-full ${
                    isHealthy ? 'bg-emerald-400' : 'bg-red-500'
                  }`}
                />
                <span>
                  {isHealthy
                    ? 'Connected to Ollama & Pinecone'
                    : 'Connection issue. Check backend / models / API keys.'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleDarkMode}
              className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-[11px] text-slate-200 shadow-sm hover:bg-slate-700"
            >
              <span className="mr-1">{darkMode ? '🌙' : '☀️'}</span>
              <span>{darkMode ? 'Dark' : 'Light'} mode</span>
            </button>
            <button
              type="button"
              className="hidden items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-[11px] text-slate-200 shadow-sm hover:bg-slate-700 sm:inline-flex"
            >
              <Cog6ToothIcon className="h-4 w-4" />
              Settings
            </button>
          </div>
        </div>
      </header>

      <main className="flex flex-1 bg-gradient-primary">
        {/* Sidebar / Knowledge panel on smaller screens */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.aside
              className="fixed inset-y-0 left-0 z-30 w-72 bg-slate-950/95 p-3 shadow-card-strong lg:hidden"
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            >
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="mb-3 text-xs text-slate-400 hover:text-slate-200"
              >
                Close
              </button>
              <KnowledgePanel />
            </motion.aside>
          )}
        </AnimatePresence>

        <div className="mx-auto flex h-full w-full max-w-6xl flex-1 flex-col lg:flex-row lg:gap-3 lg:px-4 lg:py-3">
          <section className="flex h-full flex-1 rounded-xl bg-slate-900/80 shadow-card-strong backdrop-blur">
            <ChatInterface />
          </section>

          <aside className="mt-3 hidden h-full w-full max-w-xs flex-shrink-0 lg:mt-0 lg:block">
            <KnowledgePanel />
          </aside>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;

