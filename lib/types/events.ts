/**
 * Event status types
 */
export type EventStatus = 'pending' | 'complete' | 'error';

/**
 * Tool type discriminator
 */
export type ToolType = 'computer' | 'bash';

/**
 * Computer action types
 */
export type ComputerAction =
  | 'screenshot'
  | 'left_click'
  | 'right_click'
  | 'double_click'
  | 'mouse_move'
  | 'type'
  | 'key'
  | 'scroll'
  | 'wait'
  | 'left_click_drag';

/**
 * Computer event payload
 */
export interface ComputerEventPayload {
  action: ComputerAction;
  coordinate?: [number, number];
  text?: string;
  duration?: number;
  scroll_amount?: number;
  scroll_direction?: 'up' | 'down';
  start_coordinate?: [number, number];
}

/**
 * Bash event payload
 */
export interface BashEventPayload {
  command: string;
}

/**
 * Tool result types
 */
export interface ToolResult {
  type: 'text' | 'image';
  data?: string; // base64 for images
  text?: string; // text content
  mimeType?: string; // for images
}

/**
 * Computer event - discriminated union member
 */
export interface ComputerEvent {
  id: string;
  timestamp: number;
  type: 'computer';
  toolType: 'computer';
  payload: ComputerEventPayload;
  status: EventStatus;
  duration?: number;
  error?: string;
  result?: ToolResult;
}

/**
 * Bash event - discriminated union member
 */
export interface BashEvent {
  id: string;
  timestamp: number;
  type: 'bash';
  toolType: 'bash';
  payload: BashEventPayload;
  status: EventStatus;
  duration?: number;
  error?: string;
  result?: ToolResult;
}

/**
 * Agent event - discriminated union
 */
export type AgentEvent = ComputerEvent | BashEvent;

/**
 * Action type for counts (includes all computer actions + bash)
 */
export type ActionType = ComputerAction | 'bash';

/**
 * Event counts by action type
 */
export type EventCounts = Record<ActionType, number>;

/**
 * Agent status
 */
export type AgentStatus = 'idle' | 'thinking' | 'executing';

/**
 * Event store state
 */
export interface EventStore {
  events: AgentEvent[];
  counts: EventCounts;
  agentStatus: AgentStatus;
  selectedEventId: string | null;
}

/**
 * Type guards for discriminated unions
 */
export function isComputerEvent(event: AgentEvent): event is ComputerEvent {
  return event.type === 'computer';
}

export function isBashEvent(event: AgentEvent): event is BashEvent {
  return event.type === 'bash';
}

/**
 * Create initial event counts
 */
export function createInitialEventCounts(): EventCounts {
  return {
    screenshot: 0,
    left_click: 0,
    right_click: 0,
    double_click: 0,
    mouse_move: 0,
    type: 0,
    key: 0,
    scroll: 0,
    wait: 0,
    left_click_drag: 0,
    bash: 0,
  };
}
