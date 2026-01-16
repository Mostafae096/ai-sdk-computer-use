'use client';

import { PreviewMessage } from '@/components/message';
import { Input } from '@/components/input';
import { ProjectInfo } from '@/components/project-info';
import { AISDKLogo } from '@/components/icons';
import { PromptSuggestions } from '@/components/prompt-suggestions';
import { SessionSidebar } from '@/components/session-sidebar';
import { DebugPanel } from '@/components/debug-panel';
import { VNCViewer } from '@/components/vnc-viewer';
import { ToolCallDetails } from '@/components/tool-call-details';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { cn } from '@/lib/utils';
import type { UIMessage } from 'ai';
import type { RefObject } from 'react';
import type { AgentEvent } from '@/lib/types/events';

interface RateLimitState {
  isWaiting: boolean;
  countdown: number;
  message: string | null;
}

interface DesktopLayoutProps {
  messages: UIMessage[];
  input: string;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  status: 'error' | 'submitted' | 'streaming' | 'ready';
  stop: () => void;
  append: (message: { role: 'user'; content: string }) => void;
  isInitializing: boolean;
  sessionSidebarCollapsed: boolean;
  onToggleSessionSidebar: (collapsed: boolean) => void;
  desktopContainerRef: RefObject<HTMLDivElement>;
  desktopEndRef: RefObject<HTMLDivElement>;
  rateLimitState: RateLimitState | null;
  onCancelRateLimit: () => void;
  streamUrl: string | null;
  sandboxId: string | null;
  vncLoading: boolean;
  onRefreshDesktop: () => void;
  selectedEvent: AgentEvent | null;
}

export function DesktopLayout({
  messages,
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  status,
  stop,
  append,
  isInitializing,
  sessionSidebarCollapsed,
  onToggleSessionSidebar,
  desktopContainerRef,
  desktopEndRef,
  rateLimitState,
  onCancelRateLimit,
  streamUrl,
  sandboxId,
  vncLoading,
  onRefreshDesktop,
  selectedEvent,
}: DesktopLayoutProps) {
  return (
    <div className="w-full hidden xl:block">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* LEFT: Chat Panel */}
        <ResizablePanel
          defaultSize={50}
          minSize={40}
          maxSize={60}
          className="flex flex-col overflow-hidden"
        >
          <div className="flex h-full overflow-hidden">
            {/* Session Sidebar */}
            <SessionSidebar
              isCollapsed={sessionSidebarCollapsed}
              onToggleCollapse={onToggleSessionSidebar}
            />

            {/* Chat Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <div className="bg-white dark:bg-zinc-900 py-4 px-4 flex items-center border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex-shrink-0">
                  <AISDKLogo />
                </div>
              </div>

              <div
                className="flex-1 space-y-6 py-4 overflow-y-auto px-4"
                ref={desktopContainerRef}
              >
                {messages.length === 0 ? <ProjectInfo /> : null}
                {messages.map((message, i) => (
                  <PreviewMessage
                    message={message}
                    key={message.id}
                    isLoading={isLoading}
                    status={status}
                    isLatestMessage={i === messages.length - 1}
                  />
                ))}
                <div ref={desktopEndRef} className="pb-2" />
              </div>

              {messages.length === 0 && (
                <PromptSuggestions
                  disabled={isInitializing}
                  submitPrompt={(prompt: string) =>
                    append({ role: 'user', content: prompt })
                  }
                />
              )}

              {/* Rate Limit Indicator */}
              {rateLimitState && rateLimitState.isWaiting && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                        <span>⏳</span>
                        <span>
                          {rateLimitState.countdown > 0
                            ? `Rate limit reached. Retrying in ${rateLimitState.countdown}s...`
                            : 'Retrying now...'}
                        </span>
                      </div>
                      <button
                        onClick={onCancelRateLimit}
                        className="text-xs text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Debug Panel */}
              <DebugPanel />

              {/* Input */}
              <div className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
                <form onSubmit={handleSubmit} className="p-4">
                  <Input
                    handleInputChange={handleInputChange}
                    input={input}
                    isInitializing={isInitializing}
                    isLoading={isLoading}
                    status={status}
                    stop={stop}
                  />
                </form>
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* RIGHT: VNC + Details Panel */}
        <ResizablePanel
          defaultSize={50}
          minSize={25}
          maxSize={70}
          className="flex flex-col overflow-hidden relative"
        >
          {/* Loading overlay */}
          {vncLoading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 flex flex-col items-center gap-4">
                <div className="animate-spin h-8 w-8 border-4 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-zinc-100 rounded-full" />
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {sandboxId ? 'Connecting to sandbox...' : 'Creating new sandbox...'}
                </p>
              </div>
            </div>
          )}

          {/* Container for both VNC and Tool Details - always rendered */}
          <div className="relative h-full w-full">
            {/* VNC Viewer - hidden when event is selected */}
            <div className={cn('absolute inset-0', selectedEvent && 'hidden')}>
              <VNCViewer
                streamUrl={streamUrl}
                sandboxId={sandboxId}
                onRefresh={onRefreshDesktop}
                isInitializing={isInitializing}
              />
            </div>

            {/* Tool Call Details - hidden when no event is selected */}
            <div className={cn('absolute inset-0 overflow-y-auto', !selectedEvent && 'hidden')}>
              <ToolCallDetails />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
