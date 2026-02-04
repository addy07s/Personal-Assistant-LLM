import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach auth token if present (future-ready)
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      // eslint-disable-next-line no-param-reassign
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: standardize success/error format
apiClient.interceptors.response.use(
  (response) => ({
    success: true,
    data: response.data,
  }),
  (error) => {
    let message = 'An unexpected error occurred.';

    if (error.response) {
      // Server responded with a status outside the 2xx range
      message =
        error.response.data?.error ||
        error.response.data?.message ||
        `Request failed with status ${error.response.status}`;
    } else if (error.request) {
      // No response received
      message = 'No response from server. Please check your connection or try again later.';
    } else if (error.message) {
      message = error.message;
    }

    return Promise.resolve({
      success: false,
      error: message,
    });
  }
);

const api = {
  // Chat
  async sendMessage(message, conversationId) {
    const payload = {
      message,
    };
    if (conversationId) {
      payload.conversationId = conversationId;
    }
    return apiClient.post('/api/chat', payload);
  },

  async getHistory(conversationId) {
    return apiClient.get(`/api/chat/history/${conversationId}`);
  },

  async clearConversation(conversationId) {
    return apiClient.delete(`/api/chat/${conversationId}`);
  },

  // Knowledge
  async addDocument(text, category, source) {
    return apiClient.post('/api/knowledge/add', {
      text,
      category,
      source,
    });
  },

  async bulkAdd(documents) {
    return apiClient.post('/api/knowledge/bulk-add', {
      documents,
    });
  },

  async search(query, limit = 5) {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    return apiClient.get(`/api/knowledge/search?${params.toString()}`);
  },

  async listAll(page = 1, limit = 50) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    return apiClient.get(`/api/knowledge/list?${params.toString()}`);
  },

  async deleteDocument(id) {
    return apiClient.delete(`/api/knowledge/${id}`);
  },

  // Health
  async checkHealth() {
    return apiClient.get('/api/health');
  },
};

export default api;

