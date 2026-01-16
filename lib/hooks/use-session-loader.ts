'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from './use-session';
import { useEventStore } from './use-event-store';
import type { UIMessage } from 'ai';

/**
 * Hook to handle session loading and initial messages
 */
export function useSessionLoader(setMessages: (messages: UIMessage[]) => void) {
  const {
    getActiveSession,
    createSession,
    setActiveSession,
    loadSessionData,
    state: sessionState,
  } = useSession();
  const activeSession = getActiveSession();
  const sessionsLoading = sessionState.isLoading;
  const { loadEvents } = useEventStore();
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const loadedSessionIdRef = useRef<string | null>(null);
  const hasInitializedRef = useRef<boolean>(false);

  useEffect(() => {
    // Wait for sessions to finish loading before creating new ones
    if (sessionsLoading) {
      return;
    }

    // Handle initial session creation
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;

      if (!activeSession) {
        // Only create a new session if there are no existing sessions
        if (sessionState.sessions.length === 0) {
          const newSession = createSession(undefined, null);
          setActiveSession(newSession.id);
          loadedSessionIdRef.current = newSession.id;
        }
        return;
      } else {
        // Load messages for initial session immediately
        const sessionData = loadSessionData(activeSession.id);
        if (sessionData) {
          const loadedMessages = sessionData.messages || [];
          setMessages(loadedMessages);
          setInitialMessages(loadedMessages);
          if (sessionData.events && sessionData.events.length > 0) {
            loadEvents(sessionData.events);
          }
        }
        loadedSessionIdRef.current = activeSession.id;
        return;
      }
    }

    // Handle session switching - only load if this is a different session
    if (!activeSession || loadedSessionIdRef.current === activeSession.id) {
      return;
    }

    loadedSessionIdRef.current = activeSession.id;

    const sessionData = loadSessionData(activeSession.id);
    if (sessionData) {
      // Load messages IMMEDIATELY - don't wait for VNC
      const loadedMessages = sessionData.messages || [];
      setMessages(loadedMessages);
      setInitialMessages(loadedMessages);

      // Load events from storage
      if (sessionData.events && sessionData.events.length > 0) {
        loadEvents(sessionData.events);
      } else {
        loadEvents([]);
      }
    } else {
      // Session data not found - clear messages and events
      setMessages([]);
      setInitialMessages([]);
      loadEvents([]);
    }
  }, [
    sessionsLoading,
    activeSession?.id,
    loadSessionData,
    setMessages,
    loadEvents,
    createSession,
    setActiveSession,
    sessionState.sessions.length,
    getActiveSession,
  ]);

  return { initialMessages };
}
