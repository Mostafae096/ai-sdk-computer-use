import type { AgentEvent, EventCounts, ActionType } from '@/lib/types/events';
import { createInitialEventCounts, isComputerEvent, isBashEvent } from '@/lib/types/events';

/**
 * Calculate event counts from an array of events
 */
export function calculateEventCounts(events: AgentEvent[]): EventCounts {
  const counts = createInitialEventCounts();
  
  events.forEach((event) => {
    if (isComputerEvent(event)) {
      const actionType = event.payload.action as ActionType;
      counts[actionType] = (counts[actionType] || 0) + 1;
    } else if (isBashEvent(event)) {
      counts.bash = (counts.bash || 0) + 1;
    }
  });
  
  return counts;
}
