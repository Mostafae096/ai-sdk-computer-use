'use client';

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { ChatSession } from '@/lib/types/sessions';
import { createSession as createSessionHelper, generateSessionNameFromMessages, type StoredSession } from '@/lib/types/sessions';
import { sessionStorage, sessionToStored, storedToSession } from '@/lib/storage/session-storage';
import type { UIMessage } from 'ai';
import type { AgentEvent } from '@/lib/types/events';

/**
 * Session store state
 */
interface SessionStoreState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  isLoading: boolean;
}

/**
 * Session store actions
 */
type SessionStoreAction =
  | { type: 'LOAD_SESSIONS'; sessions: ChatSession[] }
  | { type: 'CREATE_SESSION'; session: ChatSession }
  | { type: 'UPDATE_SESSION'; session: ChatSession }
  | { type: 'DELETE_SESSION'; sessionId: string }
  | { type: 'SET_ACTIVE_SESSION'; sessionId: string | null }
  | { type: 'SET_LOADING'; isLoading: boolean };

/**
 * Initial state
 */
const initialState: SessionStoreState = {
  sessions: [],
  activeSessionId: null,
  isLoading: true,
};

/**
 * Session store reducer
 */
function sessionStoreReducer(
  state: SessionStoreState,
  action: SessionStoreAction,
): SessionStoreState {
  switch (action.type) {
    case 'LOAD_SESSIONS':
      return {
        ...state,
        sessions: action.sessions,
        isLoading: false,
      };

    case 'CREATE_SESSION':
      return {
        ...state,
        sessions: [...state.sessions, action.session],
        activeSessionId: action.session.id,
      };

    case 'UPDATE_SESSION':
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.session.id ? action.session : s,
        ),
      };

    case 'DELETE_SESSION':
      const filtered = state.sessions.filter((s) => s.id !== action.sessionId);
      return {
        ...state,
        sessions: filtered,
        activeSessionId:
          state.activeSessionId === action.sessionId
            ? filtered[0]?.id || null
            : state.activeSessionId,
      };

    case 'SET_ACTIVE_SESSION':
      return {
        ...state,
        activeSessionId: action.sessionId,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.isLoading,
      };

    default:
      return state;
  }
}

/**
 * Session store context value
 */
interface SessionStoreContextValue {
  state: SessionStoreState;
  createSession: (name?: string, sandboxId?: string | null) => ChatSession;
  updateSession: (session: ChatSession) => void;
  deleteSession: (sessionId: string) => void;
  setActiveSession: (sessionId: string | null) => void;
  getActiveSession: () => ChatSession | null;
  saveSessionMessages: (sessionId: string, messages: UIMessage[]) => void;
  saveSessionEvents: (sessionId: string, events: AgentEvent[]) => void;
  loadSessionData: (sessionId: string) => {
    messages: UIMessage[];
    events: AgentEvent[];
    eventIds: string[];
  } | null;
}

const SessionStoreContext = createContext<SessionStoreContextValue | null>(null);

/**
 * Session store provider
 */
export function SessionStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sessionStoreReducer, initialState);

  // Load sessions from localStorage on mount
  useEffect(() => {
    const stored = sessionStorage.loadSessions();
    const sessions = stored.map(storedToSession);
    dispatch({ type: 'LOAD_SESSIONS', sessions });

    // Set first session as active if none selected
    if (sessions.length > 0 && !state.activeSessionId) {
      dispatch({ type: 'SET_ACTIVE_SESSION', sessionId: sessions[0].id });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const createSession = useCallback(
    (name?: string, sandboxId: string | null = null): ChatSession => {
      const id = crypto.randomUUID();
      // Use "New Session" as default name, will be updated when first message is added
      const sessionName = name || 'New Session';
      const session = createSessionHelper(id, sessionName, sandboxId);

      dispatch({ type: 'CREATE_SESSION', session });

      // Save to localStorage
      sessionStorage.saveSession(
        sessionToStored(session, [], []),
      );

      return session;
    },
    [],
  );

  const updateSession = useCallback((session: ChatSession) => {
    dispatch({ type: 'UPDATE_SESSION', session });

    // Load current messages and events to save
    const stored = sessionStorage.getSession(session.id);
    if (stored) {
      sessionStorage.saveSession({
        ...sessionToStored(session, stored.messages, stored.events || []),
        updatedAt: Date.now(),
      });
    } else {
      // Session doesn't exist in storage yet - create it with empty messages/events
      sessionStorage.saveSession({
        ...sessionToStored(session, [], []),
        updatedAt: Date.now(),
      });
    }
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    dispatch({ type: 'DELETE_SESSION', sessionId });
    sessionStorage.deleteSession(sessionId);
  }, []);

  const setActiveSession = useCallback((sessionId: string | null) => {
    dispatch({ type: 'SET_ACTIVE_SESSION', sessionId });
  }, []);

  const getActiveSession = useCallback((): ChatSession | null => {
    if (!state.activeSessionId) return null;
    return state.sessions.find((s) => s.id === state.activeSessionId) || null;
  }, [state.activeSessionId, state.sessions]);

  const saveSessionMessages = useCallback(
    (sessionId: string, messages: UIMessage[]) => {
      const session = state.sessions.find((s) => s.id === sessionId);
      if (!session) {
        console.warn(`Session ${sessionId} not found when saving messages`);
        return;
      }

      // Always update session name from first user message content
      let sessionName = session.name;
      if (messages.length > 0) {
        const nameFromMessages = generateSessionNameFromMessages(messages);
        // Only update if we got a valid name from messages (not "New Session")
        if (nameFromMessages !== 'New Session') {
          sessionName = nameFromMessages;
        }
      }

      const updated = {
        ...session,
        name: sessionName,
        messageIds: messages.map((m) => m.id),
        updatedAt: Date.now(),
      };

      dispatch({ type: 'UPDATE_SESSION', session: updated });
      
      // Load current events to save
      const stored = sessionStorage.getSession(sessionId);
      const events = stored?.events || [];
      
      // Always save all messages - ensure we're saving the complete array
      const storedSession: StoredSession = {
        ...sessionToStored(updated, messages, events),
        messages: messages, // Explicitly set to ensure all messages are saved
        updatedAt: Date.now(),
      };
      
      sessionStorage.saveSession(storedSession);
    },
    [state.sessions],
  );

  const saveSessionEvents = useCallback(
    (sessionId: string, events: AgentEvent[]) => {
      const session = state.sessions.find((s) => s.id === sessionId);
      if (!session) return;

      const updated = {
        ...session,
        eventIds: events.map((e) => e.id),
        updatedAt: Date.now(),
      };

      dispatch({ type: 'UPDATE_SESSION', session: updated });

      // Load current messages to save with events
      const stored = sessionStorage.getSession(sessionId);
      if (stored) {
        sessionStorage.saveSession({
          ...sessionToStored(updated, stored.messages, events),
          updatedAt: Date.now(),
        });
      }
    },
    [state.sessions],
  );

  const loadSessionData = useCallback(
    (sessionId: string): { messages: UIMessage[]; events: AgentEvent[]; eventIds: string[] } | null => {
      const stored = sessionStorage.getSession(sessionId);
      if (!stored) return null;

      return {
        messages: stored.messages,
        events: stored.events || [],
        eventIds: stored.eventIds,
      };
    },
    [],
  );

  const value: SessionStoreContextValue = {
    state,
    createSession,
    updateSession,
    deleteSession,
    setActiveSession,
    getActiveSession,
    saveSessionMessages,
    saveSessionEvents,
    loadSessionData,
  };

  return (
    <SessionStoreContext.Provider value={value}>
      {children}
    </SessionStoreContext.Provider>
  );
}

/**
 * Hook to access session store
 */
export function useSessionStoreContext(): SessionStoreContextValue {
  const context = useContext(SessionStoreContext);
  if (!context) {
    throw new Error(
      'useSessionStoreContext must be used within SessionStoreProvider',
    );
  }
  return context;
}
