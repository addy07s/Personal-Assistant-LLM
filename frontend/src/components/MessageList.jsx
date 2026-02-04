import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { AnimatePresence, motion } from 'framer-motion';
import { ClipboardIcon, SparklesIcon } from '@heroicons/react/24/outline';

function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function UserMessage({ message }) {
  const initials = 'You';

  return (
    <div className="flex justify-end gap-2">
      <div className="flex max-w-xl flex-col items-end">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">{formatTime(message.timestamp)}</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
            {initials}
          </div>
        </div>
        <div className="mt-1 rounded-2xl bg-blue-600 px-3 py-2 text-sm text-white shadow">
          {message.content}
        </div>
      </div>
    </div>
  );
}

function AIMessage({ message, onCopy }) {
  const hasSources = Array.isArray(message.sources) && message.sources.length > 0;

  return (
    <div className="flex justify-start gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
        <SparklesIcon className="h-4 w-4" />
      </div>
      <div className="flex max-w-xl flex-col items-start">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-700">Assistant</span>
          <span className="text-[11px] text-slate-400">{formatTime(message.timestamp)}</span>
          <button
            type="button"
            onClick={() => onCopy?.(message.content)}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-700"
          >
            <ClipboardIcon className="h-3 w-3" />
            Copy
          </button>
        </div>
        <div className="prose prose-slate mt-1 max-w-none rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-900 shadow">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
        {hasSources && (
          <details className="mt-2 w-full rounded-lg border border-slate-200 bg-white/80 p-2 text-xs shadow-sm">
            <summary className="cursor-pointer text-slate-600">
              Sources & confidence
              {message.confidence && (
                <span className="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-white">
                  {message.confidence.toUpperCase()}
                </span>
              )}
            </summary>
            <div className="mt-2 space-y-2">
              {message.sources.map((source, idx) => (
                <div key={source.id || idx} className="rounded-md bg-slate-50 p-2">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-600">Source {idx + 1}</span>
                    <span className="text-[11px] text-slate-500">
                      Score: {(source.score ?? 0).toFixed(3)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-[11px] text-slate-700 line-clamp-4">
                    {source.text || source.metadata?.text}
                  </p>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
      <div className="flex h-2 w-8 items-center justify-between">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
      </div>
      Assistant is thinking...
    </div>
  );
}

function EmptyState() {
  const suggestions = [
    'Summarize our latest product release notes.',
    'What are the key KPIs for this quarter?',
    'Explain our security policy in simple terms.',
    'Draft an email update for the sales team.',
  ];

  return (
    <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
      <h2 className="mb-2 text-lg font-semibold text-slate-800">Welcome to your Enterprise AI Assistant</h2>
      <p className="mb-4 max-w-md text-sm">
        Ask questions about your company knowledge, policies, and documents. The assistant will use the knowledge
        base to provide accurate, contextual answers.
      </p>
      <div className="grid w-full max-w-lg gap-2 text-left text-sm md:grid-cols-2">
        {suggestions.map((s) => (
          <div key={s} className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-slate-700">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MessageList({ messages, onCopyMessage, loading }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, loading]);

  const hasMessages = messages && messages.length > 0;

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-4">
      {!hasMessages && !loading && <EmptyState />}
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {msg.role === 'user' ? (
                <UserMessage message={msg} />
              ) : (
                <AIMessage message={msg} onCopy={onCopyMessage} />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <div className="flex justify-start">
            <TypingIndicator />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

export default MessageList;

