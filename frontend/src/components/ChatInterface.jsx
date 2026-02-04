import React, { useEffect, useState } from 'react';
import { ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline';
import ChatInput from './ChatInput';
import MessageList from './MessageList';
import api from '../services/api';

const STORAGE_KEY_MESSAGES = 'enterprise-ai-assistant:messages';
const STORAGE_KEY_CONVERSATION = 'enterprise-ai-assistant:conversationId';

function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const storedMessages = localStorage.getItem(STORAGE_KEY_MESSAGES);
      const storedConversationId = localStorage.getItem(STORAGE_KEY_CONVERSATION);
      if (storedMessages) {
        setMessages(JSON.parse(storedMessages));
      }
      if (storedConversationId) {
        setConversationId(storedConversationId);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to restore conversation from storage', e);
    }
  }, []);

  // Persist to localStorage whenever messages / conversation change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
      if (conversationId) {
        localStorage.setItem(STORAGE_KEY_CONVERSATION, conversationId);
      } else {
        localStorage.removeItem(STORAGE_KEY_CONVERSATION);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to persist conversation', e);
    }
  }, [messages, conversationId]);

  const pushMessage = (msg) => {
    setMessages((prev) => [...prev, msg]);
  };

  const handleSend = async (text) => {
    setError('');
    setShowError(false);
    const timestamp = new Date().toISOString();

    const userMessage = {
      id: `${timestamp}-user`,
      role: 'user',
      content: text,
      timestamp,
    };
    pushMessage(userMessage);

    setLoading(true);
    const currentConversationId = conversationId;

    try {
      const result = await api.sendMessage(text, currentConversationId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to send message.');
      }

      const data = result.data;
      const newConversationId = data.conversationId || currentConversationId;
      setConversationId(newConversationId);

      const aiTimestamp = data.timestamp || new Date().toISOString();
      const aiMessage = {
        id: `${aiTimestamp}-assistant`,
        role: 'assistant',
        content: data.response,
        timestamp: aiTimestamp,
        sources: data.sources || [],
        confidence: data.confidence,
      };

      pushMessage(aiMessage);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Chat send error:', err);
      const message = err.message || 'Failed to send message.';
      setError(message);
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to copy message', err);
    }
  };

  const handleClearConversation = async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    const confirmed = window.confirm('Clear this conversation? This cannot be undone.');
    if (!confirmed) return;

    setLoading(true);
    try {
      await api.clearConversation(conversationId);
    } catch (err) {
      // Log but still clear locally
      // eslint-disable-next-line no-console
      console.error('Failed to clear conversation on server', err);
    } finally {
      setLoading(false);
      setConversationId(null);
      setMessages([]);
    }
  };

  const handleRetry = () => {
    setShowError(false);
  };

  return (
    <div className="flex h-full min-h-screen flex-col bg-slate-900">
      <header className="border-b border-slate-800 bg-slate-900/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Enterprise AI Assistant</h1>
            <p className="text-xs text-slate-400">
              Ask questions about your enterprise knowledge base with RAG-powered answers.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearConversation}
              disabled={loading || messages.length === 0}
              className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-200 shadow-sm transition hover:border-red-500 hover:text-red-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
            >
              <TrashIcon className="h-4 w-4" />
              Clear chat
            </button>
          </div>
        </div>
      </header>

      {showError && error && (
        <div className="mx-auto mt-2 w-full max-w-3xl px-4">
          <div className="flex items-center justify-between rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 shadow-sm">
            <span>{error}</span>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-white px-2 py-0.5 text-[11px] text-red-700 hover:bg-red-50"
            >
              <ArrowPathIcon className="h-3 w-3" />
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="flex flex-1 flex-col">
        <MessageList messages={messages} onCopyMessage={handleCopyMessage} loading={loading} />
        <ChatInput onSend={handleSend} loading={loading} disabled={false} />
      </main>
    </div>
  );
}

export default ChatInterface;

