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
 * Returns null if extraction fails, allowing caller to use fallback naming
 */
export function generateSessionNameFromMessages(messages: UIMessage[]): string | null {
  const firstUserMessage = messages.find((m) => m.role === 'user');
  if (!firstUserMessage) {
    return null;
  }

  // Try to get text from parts or content
  // Check parts array FIRST (new format) - this is the primary format for useChat
  let text = '';
  
  if (firstUserMessage.parts && Array.isArray(firstUserMessage.parts) && firstUserMessage.parts.length > 0) {
    // Find the first text part (using same pattern as use-rate-limit.ts)
    const textPart = firstUserMessage.parts.find(
      (part) => part && typeof part === 'object' && 'type' in part && part.type === 'text' && 'text' in part
    );
    if (textPart && 'text' in textPart && typeof textPart.text === 'string') {
      const partText = textPart.text.trim();
      if (partText) {
        text = partText;
      }
    }
  }
  
  // Fallback to content if parts didn't yield text
  if (!text) {
    const content = firstUserMessage.content;
    
    // Check if content is a string
    if (typeof content === 'string' && content.trim()) {
      text = content;
    } 
    // Check if content is an array (legacy format)
    else if (Array.isArray(content) && content.length > 0) {
      // Type assertion needed because TypeScript narrows the type incorrectly
      const contentArray = content as unknown as Array<string | { type?: string; text?: string }>;
      const textContent = contentArray.find(
        (item) => typeof item === 'string' || (typeof item === 'object' && item?.type === 'text')
      );
      if (typeof textContent === 'string' && textContent.trim()) {
        text = textContent;
      } else if (textContent && typeof textContent === 'object' && 'text' in textContent) {
        const extractedText = String(textContent.text || '').trim();
        if (extractedText) {
          text = extractedText;
        }
      }
    }
  }

  if (text) {
    // Clean up the text: remove extra whitespace, newlines, etc.
    const cleaned = text.replace(/\s+/g, ' ').trim();
    // Only truncate if longer than 30 chars, but keep meaningful content
    const truncated = cleaned.length > 30 ? cleaned.slice(0, 30).trim() : cleaned;
    // Return null if result is empty after cleaning
    return truncated || null;
  }
  
  return null;
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
