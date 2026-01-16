'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { isRateLimitError, extractRetryAfter } from '@/lib/utils/error-helpers';
import type { UIMessage } from 'ai';

interface RateLimitState {
  isWaiting: boolean;
  countdown: number;
  message: string | null;
}

interface UseRateLimitReturn {
  state: RateLimitState | null;
  handleRateLimit: (error: unknown, messages: UIMessage[], inputFallback: string, retryMessage: (message: string) => void) => void;
  cancel: () => void;
}

/**
 * Hook to handle rate limiting with automatic retry
 */
export function useRateLimit(): UseRateLimitReturn {
  const [state, setState] = useState<RateLimitState | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCallbackRef = useRef<((message: string) => void) | null>(null);
  const messagesRef = useRef<UIMessage[]>([]);

  const cancel = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState(null);
    retryCallbackRef.current = null;
  }, []);

  const handleRateLimit = useCallback(
    (error: unknown, messages: UIMessage[], inputFallback: string, retryMessage: (message: string) => void) => {
      console.log('handleRateLimit called with:', { error, messagesCount: messages.length, inputFallback });
      
      if (!isRateLimitError(error)) {
        console.warn('handleRateLimit called but error is not a rate limit error:', error);
        return;
      }

      const retryAfter = extractRetryAfter(error) || 65; // Default to 65 seconds for safety
      console.log('Retry after:', retryAfter);
      
      // Get the last user message - try both content string and parts array
      const lastUserMessage = messages.filter((m) => m.role === 'user').slice(-1)[0];
      console.log('Last user message:', lastUserMessage);
      
      let messageText: string | null = null;
      
      if (lastUserMessage) {
        // Try to get text from content string
        if (typeof lastUserMessage.content === 'string') {
          messageText = lastUserMessage.content;
          console.log('Extracted message from content string:', messageText);
        }
        // Try to get text from parts array
        else if (lastUserMessage.parts && Array.isArray(lastUserMessage.parts)) {
          const textPart = lastUserMessage.parts.find(
            (part) => part.type === 'text' && 'text' in part
          );
          if (textPart && 'text' in textPart && typeof textPart.text === 'string') {
            messageText = textPart.text;
            console.log('Extracted message from parts array:', messageText);
          }
        }
      }
      
      // Fallback to input if no message found in messages array
      if (!messageText && inputFallback && inputFallback.trim()) {
        messageText = inputFallback.trim();
        console.log('Using input fallback as message:', messageText);
      }

      if (!messageText) {
        console.warn('Could not extract message text, showing error toast only');
        toast.error('Rate Limit Exceeded', {
          description: `Rate limit exceeded. Please wait ${retryAfter} seconds before trying again.`,
          richColors: true,
          position: 'top-center',
          duration: 10000,
        });
        // Still set state even without message text so countdown shows
        setState({
          isWaiting: true,
          countdown: retryAfter,
          message: null,
        });
        
        // Start countdown even without message (user can manually retry)
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        
        intervalRef.current = setInterval(() => {
          setState((prev) => {
            if (!prev || prev.countdown <= 1) {
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
              setState(null);
              return null;
            }
            return { ...prev, countdown: prev.countdown - 1 };
          });
        }, 1000);
        
        return;
      }

      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Store callback and messages for retry
      retryCallbackRef.current = retryMessage;
      messagesRef.current = messages;

      console.log('Setting rate limit state:', { isWaiting: true, countdown: retryAfter, message: messageText });
      setState({
        isWaiting: true,
        countdown: retryAfter,
        message: messageText,
      });

      // Start countdown
      intervalRef.current = setInterval(() => {
        setState((prev) => {
          if (!prev || prev.countdown <= 1) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }

            // Auto-retry when countdown reaches 0
            if (prev?.message && retryCallbackRef.current) {
              // Use a small delay to ensure state is updated
              setTimeout(() => {
                if (retryCallbackRef.current && prev.message) {
                  console.log('Auto-retrying after rate limit:', prev.message);
                  retryCallbackRef.current(prev.message);
                  toast.success('Retrying request...', {
                    duration: 3000,
                    position: 'top-center',
                  });
                }

                setState(null);
                retryCallbackRef.current = null;
              }, 100);
            }

            // Keep state visible until retry completes
            return prev ? { ...prev, countdown: 0, isWaiting: true } : null;
          }
          return { ...prev, countdown: prev.countdown - 1 };
        });
      }, 1000);

      console.log('Rate limit state set, countdown started');
      toast.error('Rate Limit Exceeded', {
        description: `Rate limit exceeded. Will automatically retry in ${retryAfter} seconds...`,
        duration: Math.min(retryAfter * 1000, 10000), // Cap toast duration at 10 seconds
        richColors: true,
        position: 'top-center',
      });
    },
    [],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { state, handleRateLimit, cancel };
}
