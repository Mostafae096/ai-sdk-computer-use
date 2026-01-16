'use client';

import { useEffect, useRef } from 'react';
import type { UIMessage } from 'ai';
import { useEventStore } from './use-event-store';
import type {
  AgentEvent,
  ComputerEvent,
  BashEvent,
  ComputerEventPayload,
  BashEventPayload,
} from '@/lib/types/events';

/**
 * Track tool invocations from messages and create/update events
 */
export function useEventTracker(messages: UIMessage[], chatStatus?: 'error' | 'submitted' | 'streaming' | 'ready') {
  const { addEvent, updateEvent, setAgentStatus } = useEventStore();
  const processedToolCalls = useRef<Set<string>>(new Set());
  const eventStartTimes = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    // Track agent status based on messages and chat status
    const lastMessage = messages[messages.length - 1];
    
    // Check if chat is ready (done processing) or has error
    const isChatReady = chatStatus === 'ready';
    const hasError = chatStatus === 'error';
    
    // Check if there are any pending tool calls across all messages
    const hasAnyPendingTool = messages.some((msg) =>
      msg.parts?.some(
        (part) =>
          part.type === 'tool-invocation' &&
          part.toolInvocation.state === 'call',
      )
    );
    
    // Check if all tool invocations in the last message have results
    const lastMessageAllToolsComplete = lastMessage?.parts?.every(
      (part) =>
        part.type !== 'tool-invocation' ||
        part.toolInvocation.state === 'result',
    ) ?? true;
    
    // If there's an error, agent should be idle
    if (hasError) {
      setAgentStatus('idle');
      return;
    }
    
    if (lastMessage?.role === 'assistant') {
      if (hasAnyPendingTool) {
        setAgentStatus('executing');
      } else if (!isChatReady || !lastMessageAllToolsComplete) {
        // Still processing or tools not complete
        setAgentStatus('thinking');
      } else {
        // Chat is ready and all tools complete - agent is idle
        setAgentStatus('idle');
      }
    } else if (messages.length === 0 || lastMessage?.role === 'user') {
      // User message or no messages - check if chat is ready
      if (isChatReady && !hasAnyPendingTool) {
        setAgentStatus('idle');
      } else if (hasAnyPendingTool) {
        setAgentStatus('executing');
      } else {
        setAgentStatus('thinking');
      }
    } else {
      // No assistant message - agent is idle
      setAgentStatus('idle');
    }

    // Process each message for tool invocations
    for (const message of messages) {
      if (!message.parts) continue;

      for (const part of message.parts) {
        if (part.type !== 'tool-invocation') continue;

        const { toolCallId, toolName, state, args } = part.toolInvocation;
        const result = 'result' in part.toolInvocation ? part.toolInvocation.result : undefined;

        // Skip if already processed in this state
        const stateKey = `${toolCallId}-${state}`;
        if (processedToolCalls.current.has(stateKey)) {
          continue;
        }

        if (state === 'call') {
          // Tool just called - create pending event
          const timestamp = Date.now();
          eventStartTimes.current.set(toolCallId, timestamp);

          let event: AgentEvent;

          if (toolName === 'computer') {
            const payload: ComputerEventPayload = {
              action: args.action as ComputerEventPayload['action'],
              coordinate: args.coordinate as [number, number] | undefined,
              text: args.text as string | undefined,
              duration: args.duration as number | undefined,
              scroll_amount: args.scroll_amount as number | undefined,
              scroll_direction: args.scroll_direction as 'up' | 'down' | undefined,
              start_coordinate: args.start_coordinate as
                | [number, number]
                | undefined,
            };

            event = {
              id: toolCallId,
              timestamp,
              type: 'computer',
              toolType: 'computer',
              payload,
              status: 'pending',
            } satisfies ComputerEvent;
          } else if (toolName === 'bash') {
            const payload: BashEventPayload = {
              command: args.command as string,
            };

            event = {
              id: toolCallId,
              timestamp,
              type: 'bash',
              toolType: 'bash',
              payload,
              status: 'pending',
            } satisfies BashEvent;
          } else {
            // Unknown tool type, skip
            continue;
          }

          addEvent(event);
          processedToolCalls.current.add(stateKey);
        } else if (state === 'result') {
          // Tool completed - update event
          const startTime = eventStartTimes.current.get(toolCallId);
          const duration = startTime ? Date.now() - startTime : undefined;

          // Determine result type
          let toolResult:
            | { type: 'text' | 'image'; data?: string; text?: string; mimeType?: string }
            | undefined;

          if (result) {
            if (typeof result === 'string') {
              toolResult = { type: 'text', text: result };
            } else if (
              typeof result === 'object' &&
              result !== null &&
              'type' in result
            ) {
              if (result.type === 'image' && 'data' in result) {
                toolResult = {
                  type: 'image',
                  data: result.data as string,
                  mimeType: 'image/png',
                };
              } else if (result.type === 'text' && 'text' in result) {
                toolResult = {
                  type: 'text',
                  text: result.text as string,
                };
              }
            }
          }

          // Check for errors
          const isError =
            result === 'User aborted' ||
            (typeof result === 'string' && result.startsWith('Error'));

          updateEvent(toolCallId, {
            status: isError ? 'error' : 'complete',
            duration,
            result: toolResult,
            error: isError ? (typeof result === 'string' ? result : 'Unknown error') : undefined,
          });

          processedToolCalls.current.add(stateKey);
          eventStartTimes.current.delete(toolCallId);
        }
      }
    }
  }, [messages, chatStatus, addEvent, updateEvent, setAgentStatus]);
}
