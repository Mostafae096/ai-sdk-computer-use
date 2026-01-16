import type { StoredSession, ChatSession } from '@/lib/types/sessions';
import {
  SESSION_STORAGE_KEY,
  SESSION_STORAGE_VERSION,
  generateSessionName,
} from '@/lib/types/sessions';
import type { UIMessage } from 'ai';
import type { AgentEvent } from '@/lib/types/events';

/**
 * Storage wrapper with error handling
 */
class SessionStorage {
  private readonly key: string;
  private readonly version: string;
  private readonly maxSessions: number = 50; // Limit to prevent quota issues

  constructor(key: string = SESSION_STORAGE_KEY, version: string = SESSION_STORAGE_VERSION) {
    this.key = key;
    this.version = version;
  }

  /**
   * Check if localStorage is available
   */
  private isAvailable(): boolean {
    try {
      if (typeof window === 'undefined') return false;
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load all sessions from localStorage
   */
  loadSessions(): StoredSession[] {
    if (!this.isAvailable()) {
      console.warn('localStorage is not available');
      return [];
    }

    try {
      const data = localStorage.getItem(this.key);
      if (!data) return [];

      const parsed = JSON.parse(data) as StoredSession[];

      // Migrate old sessions if version mismatch
      const migrated = parsed.map((session) => {
        if (!session.version || session.version !== this.version) {
          return this.migrateSession(session);
        }
        return session;
      });

      return migrated;
    } catch (error) {
      console.error('Failed to load sessions from localStorage:', error);
      return [];
    }
  }

  /**
   * Save sessions to localStorage
   */
  saveSessions(sessions: StoredSession[]): void {
    if (!this.isAvailable()) {
      console.warn('localStorage is not available');
      return;
    }

    try {
      // Limit number of sessions to prevent quota issues
      const limitedSessions = sessions.slice(-this.maxSessions);

      localStorage.setItem(this.key, JSON.stringify(limitedSessions));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, attempting to preserve recent sessions');
        // Try to save only the most recent sessions (reduce size by removing old events)
        const recentSessions = sessions.slice(-Math.floor(this.maxSessions / 2));
        // Remove events from older sessions to reduce size
        const optimizedSessions = recentSessions.map((session, index) => {
          // Keep events only for the most recent 5 sessions
          if (index < recentSessions.length - 5) {
            return {
              ...session,
              events: [], // Remove events to save space
              eventIds: session.eventIds, // Keep IDs for reference
            };
          }
          return session;
        });
        try {
          localStorage.setItem(this.key, JSON.stringify(optimizedSessions));
          // Show notification if available (will be handled in app/page.tsx)
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('storage-quota-warning', {
              detail: { message: 'Storage quota exceeded. Some older session data was removed to free space.' }
            }));
          }
        } catch (retryError) {
          console.error('Failed to save sessions even after clearing old ones:', retryError);
          // Clear all sessions as last resort
          try {
            localStorage.removeItem(this.key);
            if (typeof window !== 'undefined' && window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('storage-quota-error', {
                detail: { message: 'Storage quota exceeded. All session data was cleared.' }
              }));
            }
          } catch (clearError) {
            console.error('Failed to clear localStorage:', clearError);
          }
        }
      } else {
        console.error('Failed to save sessions to localStorage:', error);
      }
    }
  }

  /**
   * Save a single session
   */
  saveSession(session: StoredSession): void {
    const sessions = this.loadSessions();
    const index = sessions.findIndex((s) => s.id === session.id);

    if (index >= 0) {
      sessions[index] = { ...session, updatedAt: Date.now() };
    } else {
      sessions.push({ ...session, updatedAt: Date.now() });
    }

    this.saveSessions(sessions);
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): void {
    const sessions = this.loadSessions();
    const filtered = sessions.filter((s) => s.id !== sessionId);
    this.saveSessions(filtered);
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): StoredSession | null {
    const sessions = this.loadSessions();
    return sessions.find((s) => s.id === sessionId) || null;
  }

  /**
   * Clear all sessions
   */
  clearSessions(): void {
    if (!this.isAvailable()) return;
    try {
      localStorage.removeItem(this.key);
    } catch (error) {
      console.error('Failed to clear sessions:', error);
    }
  }

  /**
   * Migrate session to current version
   */
  private migrateSession(session: Partial<StoredSession>): StoredSession {
    // Add default values for missing fields
    return {
      id: session.id || crypto.randomUUID(),
      name: session.name || generateSessionName(0),
      createdAt: session.createdAt || Date.now(),
      updatedAt: session.updatedAt || Date.now(),
      messages: session.messages || [],
      events: session.events || [], // Add events field
      eventIds: session.eventIds || [],
      sandboxId: session.sandboxId || null,
      version: this.version,
    };
  }
}

/**
 * Singleton instance
 */
export const sessionStorage = new SessionStorage();

/**
 * Convert ChatSession to StoredSession
 */
export function sessionToStored(
  session: ChatSession,
  messages: UIMessage[],
  events: AgentEvent[] = [],
): StoredSession {
  return {
    id: session.id,
    name: session.name,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    messages,
    events, // Store full event objects
    eventIds: session.eventIds,
    sandboxId: session.sandboxId,
    version: SESSION_STORAGE_VERSION,
  };
}

/**
 * Convert StoredSession to ChatSession
 */
export function storedToSession(stored: StoredSession): ChatSession {
  return {
    id: stored.id,
    name: stored.name,
    createdAt: stored.createdAt,
    updatedAt: stored.updatedAt,
    messageIds: stored.messages.map((m) => m.id),
    eventIds: stored.eventIds,
    sandboxId: stored.sandboxId,
  };
}
