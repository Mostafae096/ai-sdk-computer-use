'use client';

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from 'react';
import type {
  AgentEvent,
  EventStore,
  AgentStatus,
} from '@/lib/types/events';
import { createInitialEventCounts as createCounts } from '@/lib/types/events';
import { calculateEventCounts } from '@/lib/utils/event-helpers';

/**
 * Event store actions
 */
type EventStoreAction =
  | { type: 'ADD_EVENT'; event: AgentEvent }
  | { type: 'UPDATE_EVENT'; id: string; updates: Partial<AgentEvent> }
  | { type: 'SET_AGENT_STATUS'; status: AgentStatus }
  | { type: 'SELECT_EVENT'; eventId: string | null }
  | { type: 'CLEAR_EVENTS' }
  | { type: 'LOAD_EVENTS'; events: AgentEvent[] };

/**
 * Initial event store state
 */
const initialState: EventStore = {
  events: [],
  counts: createCounts(),
  agentStatus: 'idle',
  selectedEventId: null,
};

/**
 * Event store reducer
 */
function eventStoreReducer(
  state: EventStore,
  action: EventStoreAction,
): EventStore {
  switch (action.type) {
    case 'ADD_EVENT': {
      const newEvents = [...state.events, action.event];
      const counts = calculateEventCounts(newEvents);

      return {
        ...state,
        events: newEvents,
        counts,
      };
    }

    case 'UPDATE_EVENT': {
      const newEvents = state.events.map((event) => {
        if (event.id === action.id) {
          // Type-safe update preserving discriminated union
          return { ...event, ...action.updates } as AgentEvent;
        }
        return event;
      });

      // Recalculate counts
      const counts = calculateEventCounts(newEvents);

      return {
        ...state,
        events: newEvents,
        counts,
      };
    }

    case 'SET_AGENT_STATUS':
      return {
        ...state,
        agentStatus: action.status,
      };

    case 'SELECT_EVENT':
      return {
        ...state,
        selectedEventId: action.eventId,
      };

    case 'CLEAR_EVENTS':
      return {
        ...initialState,
      };

    case 'LOAD_EVENTS': {
      const counts = calculateEventCounts(action.events);

      return {
        ...state,
        events: action.events,
        counts,
      };
    }

    default:
      return state;
  }
}

/**
 * Event store context value
 */
interface EventStoreContextValue {
  state: EventStore;
  addEvent: (event: AgentEvent) => void;
  updateEvent: (id: string, updates: Partial<AgentEvent>) => void;
  setAgentStatus: (status: AgentStatus) => void;
  selectEvent: (eventId: string | null) => void;
  clearEvents: () => void;
  loadEvents: (events: AgentEvent[]) => void;
}

const EventStoreContext = createContext<EventStoreContextValue | null>(null);

/**
 * Event store provider
 */
export function EventStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(eventStoreReducer, initialState);

  const addEvent = useCallback((event: AgentEvent) => {
    dispatch({ type: 'ADD_EVENT', event });
  }, []);

  const updateEvent = useCallback(
    (id: string, updates: Partial<AgentEvent>) => {
      dispatch({ type: 'UPDATE_EVENT', id, updates });
    },
    [],
  );

  const setAgentStatus = useCallback((status: AgentStatus) => {
    dispatch({ type: 'SET_AGENT_STATUS', status });
  }, []);

  const selectEvent = useCallback((eventId: string | null) => {
    dispatch({ type: 'SELECT_EVENT', eventId });
  }, []);

  const clearEvents = useCallback(() => {
    dispatch({ type: 'CLEAR_EVENTS' });
  }, []);

  const loadEvents = useCallback((events: AgentEvent[]) => {
    dispatch({ type: 'LOAD_EVENTS', events });
  }, []);

  const value: EventStoreContextValue = {
    state,
    addEvent,
    updateEvent,
    setAgentStatus,
    selectEvent,
    clearEvents,
    loadEvents,
  };

  return (
    <EventStoreContext.Provider value={value}>
      {children}
    </EventStoreContext.Provider>
  );
}

/**
 * Hook to access event store
 */
export function useEventStoreContext(): EventStoreContextValue {
  const context = useContext(EventStoreContext);
  if (!context) {
    throw new Error('useEventStoreContext must be used within EventStoreProvider');
  }
  return context;
}
