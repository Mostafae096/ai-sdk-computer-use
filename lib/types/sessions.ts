import type { UIMessage } from 'ai';
import type { AgentEvent } from './events';

/**
 * Chat session metadata
 */
export interface ChatSession {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  messageIds: string[]; // References to message IDs
  eventIds: string[]; // References to event IDs
  sandboxId: string | null;
}

/**
 * Stored session with serialized messages and events
 */
export interface StoredSession {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  messages: UIMessage[];
  events: AgentEvent[]; // Full event objects
  eventIds: string[];
  sandboxId: string | null;
  version: string; // Schema version for migrations
}

/**
 * Session storage version
 */
export const SESSION_STORAGE_VERSION = '1.0.0';

/**
 * Storage key for sessions
 */
export const SESSION_STORAGE_KEY = 'ai-agent-sessions';

/**
 * Default session name generator
 */
export function generateSessionName(index: number): string {
  return `Session ${index + 1}`;
}

/**
 * Generate session name from messages (first user message)
 */
export function generateSessionNameFromMessages(messages: UIMessage[]): string {
  const firstUserMessage = messages.find((m) => m.role === 'user');
  if (firstUserMessage) {
    // Try to get text from content or parts
    let text = '';
    
    // Check if content is a string
    if (typeof firstUserMessage.content === 'string') {
      text = firstUserMessage.content;
    } 
    // Check if content is an array (legacy format)
    else if (Array.isArray(firstUserMessage.content)) {
      const textContent = firstUserMessage.content.find(
        (item) => typeof item === 'string' || (typeof item === 'object' && item?.type === 'text')
      );
      if (typeof textContent === 'string') {
        text = textContent;
      } else if (textContent && typeof textContent === 'object' && 'text' in textContent) {
        text = String(textContent.text || '');
      }
    }
    // Check parts array (new format)
    else if (firstUserMessage.parts && Array.isArray(firstUserMessage.parts)) {
      const textPart = firstUserMessage.parts.find((p) => p.type === 'text');
      if (textPart && 'text' in textPart) {
        text = String(textPart.text || '');
      }
    }

    if (text) {
      // Clean up the text: remove extra whitespace, newlines, etc.
      const cleaned = text.replace(/\s+/g, ' ').trim();
      const truncated = cleaned.slice(0, 30).trim();
      return truncated || 'New Session';
    }
  }
  return 'New Session';
}

/**
 * Create a new session
 */
export function createSession(
  id: string,
  name: string,
  sandboxId: string | null = null,
): ChatSession {
  const now = Date.now();
  return {
    id,
    name,
    createdAt: now,
    updatedAt: now,
    messageIds: [],
    eventIds: [],
    sandboxId,
  };
}
