'use client';

import { useState, useMemo } from 'react';
import {
  useEvents,
  useEventCounts,
  useAgentStatus,
  useTotalEventCount,
} from '@/lib/hooks/use-event-store';
import { useEventStore } from '@/lib/hooks/use-event-store';
import { useSessions } from '@/lib/hooks/use-session';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Download, Filter, X, Activity, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ActionType } from '@/lib/types/events';
import { isComputerEvent, isBashEvent } from '@/lib/types/events';

/**
 * Debug panel component
 */
export function DebugPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterType, setFilterType] = useState<ActionType | 'all'>('all');
  const [filterSession, setFilterSession] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const events = useEvents();
  const counts = useEventCounts();
  const agentStatus = useAgentStatus();
  const totalCount = useTotalEventCount();
  const { clearEvents } = useEventStore();
  const sessions = useSessions();

  // Filter events
  const filteredEvents = useMemo(() => {
    let filtered = events;

    // Filter by session
    if (filterSession !== 'all') {
      const selectedSession = sessions.find((s) => s.id === filterSession);
      if (selectedSession) {
        const sessionEventIds = new Set(selectedSession.eventIds);
        filtered = filtered.filter((event) => sessionEventIds.has(event.id));
      }
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter((event) => {
        if (isComputerEvent(event)) {
          return event.payload.action === filterType;
        }
        if (isBashEvent(event)) {
          return filterType === 'bash';
        }
        return false;
      });
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((event) => {
        if (isComputerEvent(event)) {
          return (
            event.payload.action.toLowerCase().includes(query) ||
            event.id.toLowerCase().includes(query)
          );
        }
        if (isBashEvent(event)) {
          return (
            event.payload.command.toLowerCase().includes(query) ||
            event.id.toLowerCase().includes(query)
          );
        }
        return false;
      });
    }

    return filtered;
  }, [events, filterType, filterSession, searchQuery, sessions]);

  // Get unique action types for filter
  const actionTypes = useMemo(() => {
    const types = new Set<ActionType>();
    events.forEach((event) => {
      if (isComputerEvent(event)) {
        types.add(event.payload.action);
      } else if (isBashEvent(event)) {
        types.add('bash');
      }
    });
    return Array.from(types);
  }, [events]);

  const handleExport = () => {
    const dataStr = JSON.stringify(events, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `events-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all events?')) {
      clearEvents();
    }
  };

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Debug Panel
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            ({totalCount} events)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'px-2 py-1 rounded text-xs font-medium',
              agentStatus === 'idle' &&
                'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
              agentStatus === 'thinking' &&
                'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
              agentStatus === 'executing' &&
                'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200',
            )}
          >
            {agentStatus.toUpperCase()}
          </div>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 space-y-4 max-h-96 overflow-y-auto">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[150px]">
              <MessageSquare className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
              <select
                value={filterSession}
                onChange={(e) => setFilterSession(e.target.value)}
                className="text-sm border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex-1 min-w-0"
              >
                <option value="all">All Sessions</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.name} ({session.eventIds.length} events)
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[150px]">
              <Filter className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as ActionType | 'all')}
                className="text-sm border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex-1 min-w-0"
              >
                <option value="all">All Actions</option>
                {actionTypes.map((type) => (
                  <option key={type} value={type}>
                    {type} ({counts[type] || 0})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[150px]">
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-sm border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex-1 min-w-0"
              />
              {searchQuery && (
                <Button
                  onClick={() => setSearchQuery('')}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button onClick={handleExport} size="sm" variant="outline" className="h-8">
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
              <Button onClick={handleClear} size="sm" variant="outline" className="h-8">
                Clear
              </Button>
            </div>
          </div>

          {/* Event Counts */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Event Counts
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(counts).map(([action, count]) => {
                if (count === 0) return null;
                return (
                  <div
                    key={action}
                    className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs"
                  >
                    <span className="font-medium">{action}:</span>{' '}
                    <span className="text-zinc-600 dark:text-zinc-400">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Event Timeline */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Event Timeline ({filteredEvents.length})
            </h4>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {filteredEvents.length === 0 ? (
                <div className="text-xs text-zinc-500 dark:text-zinc-400 p-2 text-center">
                  No events found
                </div>
              ) : (
                filteredEvents.map((event, index) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-800 rounded text-xs"
                  >
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full shrink-0',
                        event.status === 'complete' && 'bg-green-500',
                        event.status === 'pending' && 'bg-amber-500',
                        event.status === 'error' && 'bg-red-500',
                      )}
                    />
                    <span className="font-mono text-zinc-600 dark:text-zinc-400 shrink-0 w-24 truncate">
                      tool_{String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="text-zinc-700 dark:text-zinc-300 flex-1 truncate">
                      {isComputerEvent(event)
                        ? event.payload.action
                        : isBashEvent(event)
                          ? `bash: ${event.payload.command.slice(0, 30)}...`
                          : 'unknown'}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 shrink-0">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
