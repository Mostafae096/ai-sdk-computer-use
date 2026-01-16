'use client';

import Image from 'next/image';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import type { AgentEvent, EventStatus } from '@/lib/types/events';
import { isComputerEvent, isBashEvent } from '@/lib/types/events';
import {
  Camera,
  CheckCircle,
  CircleSlash,
  Clock,
  Keyboard,
  KeyRound,
  Loader2,
  MousePointer,
  MousePointerClick,
  ScrollText,
  Terminal,
} from 'lucide-react';

/**
 * Tool call card props
 */
export interface ToolCallCardProps {
  event: AgentEvent;
  status: EventStatus;
  isLatest?: boolean;
  isLoading?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Get action label and icon for computer events
 */
function getComputerActionInfo(action: string): {
  label: string;
  detail: string;
  icon: typeof Camera;
} {
  switch (action) {
    case 'screenshot':
      return { label: 'Taking screenshot', detail: '', icon: Camera };
    case 'left_click':
      return { label: 'Left clicking', detail: '', icon: MousePointer };
    case 'right_click':
      return { label: 'Right clicking', detail: '', icon: MousePointerClick };
    case 'double_click':
      return { label: 'Double clicking', detail: '', icon: MousePointerClick };
    case 'mouse_move':
      return { label: 'Moving mouse', detail: '', icon: MousePointer };
    case 'type':
      return { label: 'Typing', detail: '', icon: Keyboard };
    case 'key':
      return { label: 'Pressing key', detail: '', icon: KeyRound };
    case 'wait':
      return { label: 'Waiting', detail: '', icon: Clock };
    case 'scroll':
      return { label: 'Scrolling', detail: '', icon: ScrollText };
    case 'left_click_drag':
      return { label: 'Dragging', detail: '', icon: MousePointer };
    default:
      return { label: action, detail: '', icon: MousePointer };
  }
}

/**
 * Format duration in milliseconds to human-readable string
 */
function formatDuration(duration?: number): string {
  if (!duration) return '';
  if (duration < 1000) return `${duration}ms`;
  return `${(duration / 1000).toFixed(1)}s`;
}

/**
 * Tool call card component
 */
export function ToolCallCard({
  event,
  status,
  isLatest = false,
  isLoading = false,
  onClick,
  className,
}: ToolCallCardProps) {
  let actionLabel = '';
  let actionDetail = '';
  let ActionIcon: typeof Camera = Camera;
  let hasThumbnail = false;
  let thumbnailData: string | undefined;

  if (isComputerEvent(event)) {
    const { action, coordinate, text, duration, scroll_amount, scroll_direction } =
      event.payload;
    const info = getComputerActionInfo(action);
    actionLabel = info.label;
    ActionIcon = info.icon;

    // Build action detail
    if (coordinate) {
      actionDetail = `(${coordinate[0]}, ${coordinate[1]})`;
    } else if (text) {
      actionDetail = `"${text}"`;
    } else if (duration) {
      actionDetail = `${duration}s`;
    } else if (scroll_direction && scroll_amount) {
      actionDetail = `${scroll_direction} by ${scroll_amount}`;
    }

    // Check for screenshot thumbnail
    if (action === 'screenshot' && event.result?.type === 'image' && event.result.data) {
      hasThumbnail = true;
      thumbnailData = event.result.data;
    }
  } else if (isBashEvent(event)) {
    actionLabel = 'Running command';
    ActionIcon = Terminal;
    actionDetail = event.payload.command.slice(0, 40);
    if (event.payload.command.length > 40) {
      actionDetail += '...';
    }
  }

  const isPending = status === 'pending';
  const isComplete = status === 'complete';
  const isError = status === 'error';

  return (
    <motion.div
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        'flex flex-col gap-2 p-2 mb-3 text-sm bg-zinc-50 dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800',
        onClick && 'cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors',
        className,
      )}
      onClick={onClick}
    >
      <div className="flex-1 flex items-center gap-2">
        <div className="flex items-center justify-center w-8 h-8 bg-zinc-50 dark:bg-zinc-800 rounded-full shrink-0">
          <ActionIcon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium font-mono flex items-baseline gap-2">
            <span className="truncate">{actionLabel}</span>
            {actionDetail && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal truncate">
                {actionDetail}
              </span>
            )}
          </div>
          {event.duration && (
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {formatDuration(event.duration)}
            </div>
          )}
        </div>
        <div className="w-5 h-5 flex items-center justify-center shrink-0">
          {isPending ? (
            isLatest && isLoading ? (
              <Loader2 className="animate-spin h-4 w-4 text-zinc-500" />
            ) : (
              <CircleSlash className="h-4 w-4 text-amber-600" />
            )
          ) : isError ? (
            <CircleSlash className="h-4 w-4 text-red-600" />
          ) : isComplete ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : null}
        </div>
      </div>

      {/* Screenshot thumbnail */}
      {hasThumbnail && thumbnailData && (
        <div className="p-2">
          <Image
            src={`data:image/png;base64,${thumbnailData}`}
            alt="Screenshot"
            width={1024}
            height={768}
            className="w-full aspect-[1024/768] rounded-sm object-contain bg-zinc-200 dark:bg-zinc-800"
            unoptimized
          />
        </div>
      )}

      {/* Loading placeholder for screenshot */}
      {isComputerEvent(event) &&
        event.payload.action === 'screenshot' &&
        isPending && (
          <div className="w-full aspect-[1024/768] rounded-sm bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        )}
    </motion.div>
  );
}
