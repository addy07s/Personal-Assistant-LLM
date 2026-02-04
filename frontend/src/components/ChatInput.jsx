import React, { useEffect, useRef, useState } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';

const MAX_CHARS = 1000;

function ChatInput({ onSend, loading, disabled }) {
  const [value, setValue] = useState('');
  const [warning, setWarning] = useState('');
  const textareaRef = useRef(null);

  const totalDisabled = disabled || loading;
  const remaining = MAX_CHARS - value.length;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    el.style.height = 'auto';
    const maxHeight = 4 * 24; // approximate 4 lines * 24px
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [value]);

  const handleChange = (e) => {
    const text = e.target.value;
    if (text.length > MAX_CHARS) {
      setWarning(`Message too long. Maximum is ${MAX_CHARS} characters.`);
      return;
    }
    setWarning('');
    setValue(text);
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setWarning('Please enter a message.');
      return;
    }
    if (trimmed.length < 3) {
      setWarning('Message is too short. Please provide a bit more detail.');
      return;
    }
    onSend?.(trimmed);
    setValue('');
    setWarning('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!totalDisabled) {
        handleSend();
      }
    }
  };

  return (
    <div className="border-t border-slate-200 bg-white px-4 py-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            className="w-full resize-none rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100"
            rows={1}
            maxLength={MAX_CHARS}
            placeholder="Ask anything about your enterprise knowledge..."
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={totalDisabled}
          />
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span className={remaining < 0 ? 'text-red-500' : ''}>{remaining} characters remaining</span>
            {warning && <span className="text-amber-600">{warning}</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={totalDisabled || !value.trim()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? (
            <svg
              className="h-5 w-5 animate-spin text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          ) : (
            <PaperAirplaneIcon className="h-5 w-5 -translate-x-px translate-y-px" />
          )}
        </button>
      </div>
      <p className="mt-1 text-[11px] text-slate-400">Press Enter to send, Shift+Enter for a new line.</p>
    </div>
  );
}

export default ChatInput;

