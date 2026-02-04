import React, { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
  BookOpenIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

const TABS = ['Add Knowledge', 'View All', 'Search'];
const CATEGORIES = ['Sales', 'HR', 'Product', 'Technical', 'Other'];
const MAX_CHARS = 5000;
const PAGE_SIZE = 50;

function KnowledgePanel() {
  const [activeTab, setActiveTab] = useState('Add Knowledge');

  // Add Knowledge state
  const [text, setText] = useState('');
  const [category, setCategory] = useState('Other');
  const [source, setSource] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // View All state
  const [documents, setDocuments] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (activeTab === 'View All') {
      loadDocuments(1);
    }
  }, [activeTab]);

  const remainingChars = MAX_CHARS - text.length;

  const loadDocuments = async (pageToLoad) => {
    setLoadingDocs(true);
    try {
      const res = await api.listAll(pageToLoad, PAGE_SIZE);
      if (!res.success) throw new Error(res.error);
      setDocuments(res.data.items || []);
      setTotal(res.data.total || 0);
      setPage(res.data.page || pageToLoad);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load documents', err);
      toast.error(err.message || 'Failed to load documents');
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleAddKnowledge = async () => {
    if (!text.trim()) {
      toast.error('Please enter document text.');
      return;
    }
    if (text.length > MAX_CHARS) {
      toast.error(`Text exceeds maximum length of ${MAX_CHARS} characters.`);
      return;
    }

    setSubmitting(true);
    try {
      const separator = '\n---\n';
      const parts = text.split(separator).map((t) => t.trim()).filter(Boolean);

      if (parts.length > 1) {
        const documentsPayload = parts.map((p) => ({
          text: p,
          category,
          source,
        }));
        const res = await api.bulkAdd(documentsPayload);
        if (!res.success) throw new Error(res.error);
        toast.success(`Bulk added ${res.data.added} documents (failed: ${res.data.failed}).`);
      } else {
        const res = await api.addDocument(text.trim(), category, source || undefined);
        if (!res.success) throw new Error(res.error);
        toast.success('Knowledge document added.');
      }

      setText('');
      setSource('');
      if (activeTab === 'View All') {
        loadDocuments(page);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to add knowledge', err);
      toast.error(err.message || 'Failed to add knowledge.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query.');
      return;
    }
    setSearching(true);
    try {
      const res = await api.search(searchQuery.trim(), 10);
      if (!res.success) throw new Error(res.error);
      setSearchResults(res.data.results || []);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Search failed', err);
      toast.error(err.message || 'Search failed.');
    } finally {
      setSearching(false);
    }
  };

  const openDeleteModal = (doc) => {
    setDeleteTarget(doc);
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await api.deleteDocument(deleteTarget.id);
      if (!res.success) throw new Error(res.error);
      toast.success('Document deleted.');
      closeDeleteModal();
      loadDocuments(page);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Delete failed', err);
      toast.error(err.message || 'Failed to delete document.');
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <div className="flex h-full flex-col rounded-xl bg-white/95 p-3 shadow-card-soft dark:bg-slate-900/90">
      <Toaster position="top-right" />
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <BookOpenIcon className="h-5 w-5 text-primary" />
          Knowledge Base
        </h2>
      </div>

      <div className="mb-3 flex gap-1 rounded-full bg-slate-100 p-1 text-xs dark:bg-slate-800">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-full px-2 py-1 transition ${
              activeTab === tab
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-50'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'Add Knowledge' && (
            <motion.div
              key="add"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="flex h-full flex-col gap-2"
            >
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Document text
                <textarea
                  className="mt-1 h-40 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-900 shadow-inner outline-none transition focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
                  placeholder="Paste or type your knowledge document here. For bulk upload, separate documents with a line containing only ---"
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
                />
                <div className="mt-0.5 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{remainingChars} characters remaining</span>
                  <span>Bulk upload: separate docs with --- on its own line</span>
                </div>
              </label>

              <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                <label className="flex flex-col text-slate-600 dark:text-slate-300">
                  Category
                  <select
                    className="mt-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 shadow-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col text-slate-600 dark:text-slate-300">
                  Source (optional)
                  <input
                    className="mt-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 shadow-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
                    placeholder="e.g. HR Policy v2.1"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                  />
                </label>
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={handleAddKnowledge}
                className="mt-1 inline-flex items-center justify-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white shadow-card-soft transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {submitting ? 'Saving...' : 'Save to Knowledge Base'}
              </button>
            </motion.div>
          )}

          {activeTab === 'View All' && (
            <motion.div
              key="view"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="flex h-full flex-col"
            >
              <div className="flex-1 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 text-xs shadow-inner dark:border-slate-800 dark:bg-slate-900">
                {loadingDocs ? (
                  <div className="space-y-2 p-2">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="h-10 animate-pulse rounded-md bg-slate-200/80 dark:bg-slate-700/60"
                      />
                    ))}
                  </div>
                ) : (
                  <table className="min-w-full border-separate border-spacing-y-1">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                        <th className="px-2 text-left">ID</th>
                        <th className="px-2 text-left">Text</th>
                        <th className="px-2 text-left">Category</th>
                        <th className="px-2 text-left">Timestamp</th>
                        <th className="px-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => (
                        <tr key={doc.id} className="text-[11px] text-slate-700 dark:text-slate-100">
                          <td className="rounded-l-md bg-white px-2 py-1 font-mono text-[10px] text-slate-500 dark:bg-slate-800">
                            {String(doc.id).slice(0, 8)}…
                          </td>
                          <td className="bg-white px-2 py-1 text-[11px] text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                            {(doc.text || doc.description || doc.preview || doc.content || '').slice(0, 100) ||
                              (doc.title || '')}
                            {(doc.text || '').length > 100 && '…'}
                          </td>
                          <td className="bg-white px-2 py-1 dark:bg-slate-800">
                            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                              {doc.category || 'Other'}
                            </span>
                          </td>
                          <td className="bg-white px-2 py-1 text-[10px] text-slate-500 dark:bg-slate-800">
                            {doc.timestamp
                              ? new Date(doc.timestamp).toLocaleString()
                              : ''}
                          </td>
                          <td className="rounded-r-md bg-white px-2 py-1 text-right dark:bg-slate-800">
                            <button
                              type="button"
                              onClick={() => openDeleteModal(doc)}
                              className="inline-flex items-center justify-center rounded-full border border-danger/40 bg-danger/5 px-2 py-0.5 text-[10px] text-danger hover:bg-danger/10"
                            >
                              <TrashIcon className="mr-1 h-3 w-3" />
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {documents.length === 0 && !loadingDocs && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-2 py-4 text-center text-[11px] text-slate-500 dark:text-slate-300"
                          >
                            No documents found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  Page {page} of {totalPages} ({total} documents)
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={page <= 1 || loadingDocs}
                    onClick={() => loadDocuments(page - 1)}
                    className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages || loadingDocs}
                    onClick={() => loadDocuments(page + 1)}
                    className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    Next
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'Search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="flex h-full flex-col gap-2 text-xs"
            >
              <div className="flex gap-1">
                <input
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 shadow-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
                  placeholder="Search the knowledge base..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={searching}
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  <MagnifyingGlassIcon className="mr-1 h-4 w-4" />
                  Search
                </button>
              </div>

              <div className="mt-1 flex-1 space-y-2 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-2 shadow-inner dark:border-slate-800 dark:bg-slate-900">
                {searching && (
                  <div className="text-center text-[11px] text-slate-500">Searching knowledge base…</div>
                )}
                {!searching && searchResults.length === 0 && (
                  <div className="text-center text-[11px] text-slate-500">
                    No results yet. Try searching for a policy, product, or topic.
                  </div>
                )}
                {searchResults.map((result) => (
                  <details
                    key={result.id}
                    className="group rounded-lg border border-slate-200 bg-white p-2 text-xs shadow-sm transition hover:border-primary/50 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <summary className="flex cursor-pointer items-center justify-between">
                      <div className="flex flex-col">
                        <span className="line-clamp-2 text-[11px] text-slate-800 dark:text-slate-100">
                          {result.text}
                        </span>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                            {result.category || 'Other'}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] text-slate-500">
                            <span>Score</span>
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                              <div
                                className="h-full bg-emerald-500 transition-all"
                                style={{ width: `${Math.min(100, (result.score || 0) * 100)}%` }}
                              />
                            </div>
                            <span>{(result.score ?? 0).toFixed(3)}</span>
                          </div>
                        </div>
                      </div>
                      <span className="ml-2 text-[10px] text-primary group-open:hidden">View full</span>
                      <span className="ml-2 text-[10px] text-primary group-open:inline-block hidden">Hide</span>
                    </summary>
                    <div className="mt-2 border-t border-slate-200 pt-1 text-[11px] text-slate-700 dark:border-slate-700 dark:text-slate-100">
                      <p className="whitespace-pre-wrap">{result.text}</p>
                    </div>
                  </details>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-sm rounded-xl bg-white p-4 text-xs shadow-card-strong dark:bg-slate-900"
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
            >
              <div className="mb-2 flex items-center gap-2 text-danger">
                <ExclamationTriangleIcon className="h-5 w-5" />
                <h3 className="text-sm font-semibold">Delete document?</h3>
              </div>
              <p className="mb-3 text-[11px] text-slate-600 dark:text-slate-200">
                This will permanently remove the selected document from the knowledge base. This action cannot be
                undone.
              </p>
              <p className="mb-3 line-clamp-3 rounded-md bg-slate-50 p-2 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                {deleteTarget.text || deleteTarget.metadata?.text}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="inline-flex items-center gap-1 rounded-full bg-danger px-3 py-1 text-[11px] font-medium text-white shadow-sm hover:bg-red-600"
                >
                  <TrashIcon className="h-3 w-3" />
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default KnowledgePanel;

