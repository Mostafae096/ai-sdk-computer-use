'use client';

import { useMemo } from 'react';
import { useEventStoreContext } from '@/lib/context/event-store';
import type { AgentEvent, ActionType, AgentStatus } from '@/lib/types/events';
import { isComputerEvent, isBashEvent } from '@/lib/types/events';

/**
 * Hook to access event store with memoized selectors
 */
export function useEventStore() {
  return useEventStoreContext();
}

/**
 * Hook to get all events
 */
export function useEvents(): AgentEvent[] {
  const { state } = useEventStore();
  return state.events;
}

/**
 * Hook to get event counts
 */
export function useEventCounts() {
  const { state } = useEventStore();
  return useMemo(() => state.counts, [state.counts]);
}

/**
 * Hook to get agent status
 */
export function useAgentStatus(): AgentStatus {
  const { state } = useEventStore();
  return state.agentStatus;
}

/**
 * Hook to get selected event
 */
export function useSelectedEvent(): AgentEvent | null {
  const { state } = useEventStore();
  return useMemo(() => {
    if (!state.selectedEventId) return null;
    return state.events.find((e) => e.id === state.selectedEventId) || null;
  }, [state.selectedEventId, state.events]);
}

/**
 * Hook to get events by type
 */
export function useEventsByType(type: 'computer' | 'bash'): AgentEvent[] {
  const events = useEvents();
  return useMemo(() => {
    return events.filter((event) => event.type === type);
  }, [events, type]);
}

/**
 * Hook to get events by action
 */
export function useEventsByAction(action: ActionType): AgentEvent[] {
  const events = useEvents();
  return useMemo(() => {
    return events.filter((event) => {
      if (isComputerEvent(event)) {
        return event.payload.action === action;
      }
      if (isBashEvent(event)) {
        return action === 'bash';
      }
      return false;
    });
  }, [events, action]);
}

/**
 * Hook to get count for specific action
 */
export function useActionCount(action: ActionType): number {
  const counts = useEventCounts();
  return useMemo(() => counts[action] || 0, [counts, action]);
}

/**
 * Hook to get total event count
 */
export function useTotalEventCount(): number {
  const events = useEvents();
  return useMemo(() => events.length, [events.length]);
}

/**
 * Hook to get events in time range
 */
export function useEventsInRange(
  startTime: number,
  endTime: number,
): AgentEvent[] {
  const events = useEvents();
  return useMemo(() => {
    return events.filter(
      (event) => event.timestamp >= startTime && event.timestamp <= endTime,
    );
  }, [events, startTime, endTime]);
}

/**
 * Hook to get recent events
 */
export function useRecentEvents(count: number = 10): AgentEvent[] {
  const events = useEvents();
  return useMemo(() => {
    return [...events]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count);
  }, [events, count]);
}
