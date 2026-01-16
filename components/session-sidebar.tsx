'use client';

import { useState } from 'react';
import { useSessions, useActiveSessionId, useSession } from '@/lib/hooks/use-session';
import { cn } from '@/lib/utils';
import { Plus, Trash2, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Format timestamp to relative time or date
 */
function formatSessionTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString();
}

/**
 * Session sidebar component
 */
export function SessionSidebar({
  isCollapsed: externalCollapsed,
  onToggleCollapse,
}: {
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
} = {}) {
  const sessions = useSessions();
  const activeSessionId = useActiveSessionId();
  const { createSession, deleteSession, setActiveSession } = useSession();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  
  // Use external state if provided, otherwise use internal state
  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;
  const setIsCollapsed = onToggleCollapse || setInternalCollapsed;

  const handleCreateSession = () => {
    createSession();
  };

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this session?')) {
      setDeletingId(sessionId);
      deleteSession(sessionId);
      setTimeout(() => setDeletingId(null), 300);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    setActiveSession(sessionId);
  };

  return (
    <div
      className={cn(
        'h-full flex flex-col bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          {!isCollapsed && (
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Sessions
            </h2>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {!isCollapsed && (
              <Button
                onClick={handleCreateSession}
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                title="Create new session"
              >
                <Plus className="w-4 h-4" />
              </Button>
            )}
            <Button
              onClick={() => setIsCollapsed(!isCollapsed)}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Session List */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No sessions yet</p>
              <p className="text-xs mt-1">Create one to get started</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {sessions.map((session) => {
                const isActive = session.id === activeSessionId;
                const isDeleting = deletingId === session.id;

                return (
                  <div
                    key={session.id}
                    className={cn(
                      'group relative flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors',
                      isActive
                        ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
                      isDeleting && 'opacity-50',
                    )}
                    onClick={() => handleSelectSession(session.id)}
                  >
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {session.name}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatSessionTime(session.createdAt)}
                      </div>
                    </div>
                    <Button
                      onClick={(e) => handleDeleteSession(e, session.id)}
                      size="sm"
                      variant="ghost"
                      className={cn(
                        'h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0',
                        isActive && 'opacity-100',
                      )}
                      title="Delete session"
                    >
                      <Trash2 className="w-3 h-3 text-red-600 dark:text-red-400" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Collapsed View - Show active session icon only */}
      {isCollapsed && (
        <div className="flex-1 flex flex-col items-center py-4 gap-2">
          <Button
            onClick={handleCreateSession}
            size="sm"
            variant="ghost"
            className="h-10 w-10 p-0"
            title="Create new session"
          >
            <Plus className="w-5 h-5" />
          </Button>
          <div className="flex-1 overflow-y-auto w-full px-2 space-y-2">
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <Button
                  key={session.id}
                  onClick={() => handleSelectSession(session.id)}
                  size="sm"
                  variant={isActive ? 'default' : 'ghost'}
                  className={cn(
                    'h-10 w-10 p-0 relative',
                    isActive &&
                      'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100',
                  )}
                  title={session.name}
                >
                  <MessageSquare className="w-4 h-4" />
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
