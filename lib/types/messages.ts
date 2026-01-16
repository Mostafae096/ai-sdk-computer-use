import type { Message, UIMessage } from 'ai';
import type { AgentEvent } from './events';

/**
 * Extended message with event metadata
 */
export interface ExtendedMessage extends Message {
  relatedEvents?: string[]; // Event IDs related to this message
}

/**
 * Tool invocation metadata for tracking
 */
export interface ToolInvocationMetadata {
  toolCallId: string;
  toolName: 'computer' | 'bash';
  state: 'call' | 'result' | 'partial-call';
  timestamp: number;
  eventId?: string; // Link to event store
}

/**
 * Message part with tool invocation tracking
 */
export interface TrackedMessagePart {
  type: 'text' | 'tool-invocation';
  text?: string;
  toolInvocation?: {
    toolCallId: string;
    toolName: string;
    state: 'call' | 'result';
    args: Record<string, unknown>;
    result?: unknown;
  };
  metadata?: ToolInvocationMetadata;
}

/**
 * Helper to extract tool invocations from messages
 */
export function extractToolInvocations(
  messages: UIMessage[],
): ToolInvocationMetadata[] {
  const invocations: ToolInvocationMetadata[] = [];

  for (const message of messages) {
    if (message.parts) {
      for (const part of message.parts) {
        if (part.type === 'tool-invocation') {
          invocations.push({
            toolCallId: part.toolInvocation.toolCallId,
            toolName: part.toolInvocation.toolName as 'computer' | 'bash',
            state: part.toolInvocation.state,
            timestamp: Date.now(), // Approximate, could be improved with message timestamps
          });
        }
      }
    }
  }

  return invocations;
}

/**
 * Link events to messages
 */
export function linkEventsToMessages(
  messages: UIMessage[],
  events: AgentEvent[],
): Map<string, string[]> {
  const messageEventMap = new Map<string, string[]>();

  for (const message of messages) {
    const eventIds: string[] = [];

    if (message.parts) {
      for (const part of message.parts) {
        if (part.type === 'tool-invocation') {
          const toolCallId = part.toolInvocation.toolCallId;
          const event = events.find((e) => e.id === toolCallId);
          if (event) {
            eventIds.push(event.id);
          }
        }
      }
    }

    if (eventIds.length > 0) {
      messageEventMap.set(message.id, eventIds);
    }
  }

  return messageEventMap;
}
