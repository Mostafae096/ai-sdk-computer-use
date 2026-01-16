'use client';

import { PreviewMessage } from '@/components/message';
import { Input } from '@/components/input';
import { ProjectInfo, DeployButton } from '@/components/project-info';
import { AISDKLogo } from '@/components/icons';
import { PromptSuggestions } from '@/components/prompt-suggestions';
import { DebugPanel } from '@/components/debug-panel';
import { SessionSidebar } from '@/components/session-sidebar';
import { VNCViewer } from '@/components/vnc-viewer';
import { MessageSquare, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UIMessage } from 'ai';
import type { RefObject } from 'react';

interface RateLimitState {
  isWaiting: boolean;
  countdown: number;
  message: string | null;
}

interface MobileLayoutProps {
  messages: UIMessage[];
  input: string;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  status: 'error' | 'submitted' | 'streaming' | 'ready';
  stop: () => void;
  append: (message: { role: 'user'; content: string }) => void;
  isInitializing: boolean;
  mobileContainerRef: RefObject<HTMLDivElement>;
  mobileEndRef: RefObject<HTMLDivElement>;
  rateLimitState: RateLimitState | null;
  onCancelRateLimit: () => void;
  streamUrl: string | null;
  sandboxId: string | null;
  onRefreshDesktop: () => void;
  activeTab: 'chat' | 'vnc';
  onTabChange: (tab: 'chat' | 'vnc') => void;
  sessionSidebarCollapsed: boolean;
  onToggleSessionSidebar: (collapsed: boolean) => void;
}

export function MobileLayout({
  messages,
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  status,
  stop,
  append,
  isInitializing,
  mobileContainerRef,
  mobileEndRef,
  rateLimitState,
  onCancelRateLimit,
  streamUrl,
  sandboxId,
  onRefreshDesktop,
  activeTab,
  onTabChange,
  sessionSidebarCollapsed,
  onToggleSessionSidebar,
}: MobileLayoutProps) {
  return (
    <div className="w-full xl:hidden flex flex-col h-full">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between px-4 py-3">
          <AISDKLogo />
          <div className="flex items-center gap-2">
            <DeployButton />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => onTabChange('chat')}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors relative',
              activeTab === 'chat'
                ? 'text-zinc-900 dark:text-zinc-100'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300',
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span>Chat</span>
            </div>
            {activeTab === 'chat' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 dark:bg-zinc-100" />
            )}
          </button>
          <button
            onClick={() => onTabChange('vnc')}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors relative',
              activeTab === 'vnc'
                ? 'text-zinc-900 dark:text-zinc-100'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300',
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <Monitor className="w-4 h-4" />
              <span>Desktop</span>
            </div>
            {activeTab === 'vnc' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 dark:bg-zinc-100" />
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {/* Chat Tab Content */}
        {activeTab === 'chat' && (
          <div className="flex h-full overflow-hidden">
            {/* Session Sidebar */}
            <SessionSidebar
              isCollapsed={sessionSidebarCollapsed}
              onToggleCollapse={onToggleSessionSidebar}
            />

            {/* Chat Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <div
                className="flex-1 space-y-6 py-4 overflow-y-auto px-4"
                ref={mobileContainerRef}
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
                <div ref={mobileEndRef} className="pb-2" />
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
                        Rate limit reached. Retrying in {rateLimitState.countdown}s...
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

              <DebugPanel />

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
        )}

        {/* VNC Viewer - Always rendered but hidden when chat tab is active */}
        <div className={cn('h-full', activeTab !== 'vnc' && 'hidden')}>
          {streamUrl ? (
            <VNCViewer
              streamUrl={streamUrl}
              sandboxId={sandboxId}
              onRefresh={onRefreshDesktop}
              isInitializing={isInitializing}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-500 dark:text-zinc-400">
              <div className="text-center">
                {isInitializing ? (
                  <>
                    <div className="animate-spin h-8 w-8 border-4 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-zinc-100 rounded-full mx-auto mb-4" />
                    <p>Initializing desktop...</p>
                  </>
                ) : (
                  <p>No desktop available</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
