const { v4: uuidv4 } = require('uuid');

/**
 * In-memory conversation/session manager backed by a Map.
 *
 * Structure:
 * {
 *   conversationId: {
 *     messages: [{ role: 'user' | 'assistant', content: string, timestamp: string }],
 *     lastActivity: Date,
 *     metadata: { userId: string | null, startTime: string }
 *   }
 * }
 */
class SessionManager {
  constructor() {
    this.sessions = new Map();

    // Auto-cleanup every 15 minutes
    const FIFTEEN_MINUTES = 15 * 60 * 1000;
    setInterval(() => {
      try {
        this.cleanupInactive();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Session cleanup error:', error);
      }
    }, FIFTEEN_MINUTES).unref();
  }

  /**
   * Create a new conversation session.
   * @param {string | null} [userId=null]
   * @returns {string} conversationId (UUID)
   */
  createSession(userId = null) {
    const id = uuidv4();
    const now = new Date();

    this.sessions.set(id, {
      messages: [],
      lastActivity: now,
      metadata: {
        userId,
        startTime: now.toISOString(),
      },
    });

    return id;
  }

  /**
   * Add a message to a conversation.
   * @param {string} conversationId
   * @param {'user' | 'assistant'} role
   * @param {string} content
   */
  addMessage(conversationId, role, content) {
    if (!conversationId) return;

    const session = this.sessions.get(conversationId);
    if (!session) {
      return;
    }

    const now = new Date();
    session.messages.push({
      role,
      content,
      timestamp: now.toISOString(),
    });
    session.lastActivity = now;
  }

  /**
   * Get the last 10 messages for a conversation.
   * @param {string} conversationId
   * @returns {{ messages: Array, metadata: any } | null}
   */
  getConversation(conversationId) {
    const session = this.sessions.get(conversationId);
    if (!session) return null;

    const messages = session.messages.slice(-10);

    return {
      messages,
      metadata: session.metadata,
    };
  }

  /**
   * Delete a single session.
   * @param {string} conversationId
   * @returns {boolean} true if deleted
   */
  deleteSession(conversationId) {
    return this.sessions.delete(conversationId);
  }

  /**
   * Delete all sessions.
   * @returns {number} number of sessions cleared
   */
  clearAll() {
    const count = this.sessions.size;
    this.sessions.clear();
    return count;
  }

  /**
   * Remove sessions that have been inactive for more than 1 hour.
   */
  cleanupInactive() {
    const ONE_HOUR = 60 * 60 * 1000;
    const now = Date.now();

    let removed = 0;

    this.sessions.forEach((session, id) => {
      if (!session.lastActivity) return;
      const age = now - new Date(session.lastActivity).getTime();
      if (age > ONE_HOUR) {
        this.sessions.delete(id);
        removed += 1;
      }
    });

    if (removed > 0) {
      // eslint-disable-next-line no-console
      console.log(`Cleaned up ${removed} inactive conversation session(s).`);
    }
  }
}

// Export a singleton instance
module.exports = new SessionManager();

