'use client';

import Image from 'next/image';
import { useSelectedEvent, useEventStore } from '@/lib/hooks/use-event-store';
import { isComputerEvent, isBashEvent } from '@/lib/types/events';
import { cn } from '@/lib/utils';
import { Calendar, Clock, Code, FileText, Image as ImageIcon, Terminal, X } from 'lucide-react';

/**
 * Format timestamp to readable date/time
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

/**
 * Format duration in milliseconds
 */
function formatDuration(duration?: number): string {
  if (!duration) return 'N/A';
  if (duration < 1000) return `${duration}ms`;
  return `${(duration / 1000).toFixed(2)}s`;
}

/**
 * Tool call details panel component
 * Shows in the right panel when an event is selected
 */
export function ToolCallDetails() {
  const event = useSelectedEvent();
  const { selectEvent } = useEventStore();

  if (!event) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 dark:text-zinc-400 p-8">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">Select a tool call to view details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 bg-white dark:bg-zinc-900">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold">
              {isComputerEvent(event) ? 'Computer Action' : 'Bash Command'}
            </h2>
            <button
              onClick={() => selectEvent(null)}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
            </button>
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{formatTimestamp(event.timestamp)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(event.duration)}</span>
            </div>
            <div
              className={cn(
                'px-2 py-1 rounded text-xs font-medium',
                event.status === 'complete' &&
                  'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                event.status === 'pending' &&
                  'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:bg-amber-200',
                event.status === 'error' &&
                  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
              )}
            >
              {event.status.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Computer Event Details */}
        {isComputerEvent(event) && (
          <>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Action
                </h3>
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 font-mono text-sm">
                  {event.payload.action}
                </div>
              </div>

              {event.payload.coordinate && (
                <div>
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    Coordinate
                  </h3>
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 font-mono text-sm">
                    [{event.payload.coordinate[0]}, {event.payload.coordinate[1]}]
                  </div>
                </div>
              )}

              {event.payload.text && (
                <div>
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    Text
                  </h3>
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 font-mono text-sm break-words">
                    {event.payload.text}
                  </div>
                </div>
              )}

              {event.payload.duration && (
                <div>
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    Wait Duration
                  </h3>
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 font-mono text-sm">
                    {event.payload.duration}s
                  </div>
                </div>
              )}

              {event.payload.scroll_direction && event.payload.scroll_amount && (
                <div>
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    Scroll
                  </h3>
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 font-mono text-sm">
                    {event.payload.scroll_direction} by {event.payload.scroll_amount}
                  </div>
                </div>
              )}

              {event.payload.start_coordinate && (
                <div>
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    Drag From
                  </h3>
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 font-mono text-sm">
                    [{event.payload.start_coordinate[0]}, {event.payload.start_coordinate[1]}]
                  </div>
                </div>
              )}

              {event.result?.type === 'image' && event.result.data && (
                <div>
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Screenshot
                  </h3>
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
                    <Image
                      src={`data:image/png;base64,${event.result.data}`}
                      alt="Screenshot"
                      width={1024}
                      height={768}
                      className="w-full rounded border border-zinc-200 dark:border-zinc-700"
                      unoptimized
                    />
                  </div>
                </div>
              )}

              {event.result?.type === 'text' && event.result.text && (
                <div>
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    Result
                  </h3>
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 font-mono text-sm break-words">
                    {event.result.text}
                  </div>
                </div>
              )}

              {event.error && (
                <div>
                  <h3 className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">
                    Error
                  </h3>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 font-mono text-sm text-red-800 dark:text-red-200 break-words">
                    {event.error}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Bash Event Details */}
        {isBashEvent(event) && (
          <>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  Command
                </h3>
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 font-mono text-sm break-words">
                  {event.payload.command}
                </div>
              </div>

              {event.result?.type === 'text' && event.result.text && (
                <div>
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    Output
                  </h3>
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 font-mono text-sm break-words whitespace-pre-wrap">
                    {event.result.text}
                  </div>
                </div>
              )}

              {event.error && (
                <div>
                  <h3 className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">
                    Error
                  </h3>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 font-mono text-sm text-red-800 dark:text-red-200 break-words">
                    {event.error}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* JSON Payload (for debugging) */}
        <div>
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
            <Code className="w-4 h-4" />
            Raw Payload
          </h3>
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
            <pre className="text-xs overflow-x-auto">
              {JSON.stringify(event.payload, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
