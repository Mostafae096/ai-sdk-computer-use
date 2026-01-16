'use client';

import { useScrollToBottom } from '@/lib/use-scroll-to-bottom';
import { useChat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { ABORTED } from '@/lib/utils';
import { EventStoreProvider } from '@/lib/context/event-store';
import { SessionStoreProvider } from '@/lib/context/session-store';
import { useEventTracker } from '@/lib/hooks/use-event-tracker';
import { useSession } from '@/lib/hooks/use-session';
import { useEventStore } from '@/lib/hooks/use-event-store';
import { useVNC } from '@/lib/hooks/use-vnc';
import { useRateLimit } from '@/lib/hooks/use-rate-limit';
import { useSessionLoader } from '@/lib/hooks/use-session-loader';
import { useStorageQuota } from '@/lib/hooks/use-storage-quota';
import { DesktopLayout, MobileLayout } from '@/components/layouts';
import { isRateLimitError } from '@/lib/utils/error-helpers';

function ChatContent() {
  // Scroll refs
  const [desktopContainerRef, desktopEndRef] = useScrollToBottom();
  const [mobileContainerRef, mobileEndRef] = useScrollToBottom();

  // UI state
  const [sessionSidebarCollapsed, setSessionSidebarCollapsed] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'vnc'>('chat');

  // Session management
  const { getActiveSession, saveSessionMessages, saveSessionEvents } = useSession();
  const activeSession = getActiveSession();

  // Event store
  const { state: eventStore } = useEventStore();

  // VNC management
  const { streamUrl, sandboxId, isLoading: vncLoading, isInitializing, refresh: refreshDesktop } = useVNC(activeSession);

  // Rate limiting
  const { state: rateLimitState, handleRateLimit, cancel: cancelRateLimit } = useRateLimit();

  // Storage quota monitoring
  useStorageQuota();

  // Session loading and initial messages
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const { initialMessages } = useSessionLoader(setMessages);

  // Chat state
  const {
    messages: chatMessages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    stop: stopGeneration,
    append,
    setMessages: setChatMessages,
  } = useChat({
    api: '/api/chat',
    initialMessages,
    body: {
      sandboxId: activeSession?.sandboxId || sandboxId || undefined,
    },
    maxSteps: 30,
    onError: (error) => {
      console.error('Chat error:', error);
      console.log('Is rate limit error?', isRateLimitError(error));

      // Save messages before error to preserve them
      if (activeSession && chatMessages.length > 0) {
        saveSessionMessages(activeSession.id, chatMessages);
      }

      // Handle rate limiting
      if (isRateLimitError(error)) {
        console.log('Handling rate limit error, retry will happen after countdown');
        handleRateLimit(error, chatMessages, input, (message) => {
          console.log('Retrying with message:', message);
          append({ role: 'user', content: message });
        });
      } else {
        toast.error('There was an error', {
          description: 'Please try again later.',
          richColors: true,
          position: 'top-center',
        });
      }
    },
    onFinish: (message) => {
      // Save messages when chat finishes
      // useChat already includes the finished message in chatMessages when onFinish is called
      if (activeSession) {
        saveSessionMessages(activeSession.id, chatMessages);
      }
    },
  });

  // Sync chat messages with local state
  useEffect(() => {
    setMessages(chatMessages);
  }, [chatMessages]);

  // CRITICAL FIX: Save messages immediately when chatMessages changes
  // This ensures user messages are saved as soon as they're added, not just when AI responds
  const lastSavedMessagesRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!activeSession || chatMessages.length === 0) return;

    // Create a signature of messages to detect actual changes
    // Include length to ensure uniqueness even if IDs somehow match
    const messagesSignature = JSON.stringify({
      length: chatMessages.length,
      ids: chatMessages.map((m) => ({ id: m.id, role: m.role })),
    });

    // Only save if messages actually changed
    if (messagesSignature === lastSavedMessagesRef.current) {
      return;
    }

    // Clear any pending save timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Save immediately when messages change (especially user messages)
    // Use a small timeout to batch rapid changes
    saveTimeoutRef.current = setTimeout(() => {
      saveSessionMessages(activeSession.id, chatMessages);
      // Update ref AFTER save completes to prevent duplicate saves
      lastSavedMessagesRef.current = messagesSignature;
      saveTimeoutRef.current = null;
    }, 100);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [chatMessages, activeSession?.id, saveSessionMessages]);

  // Track events from messages
  useEventTracker(chatMessages, status);

  // Save events to session - use ref to prevent infinite loop
  const eventsRef = useRef<typeof eventStore.events>([]);
  useEffect(() => {
    if (!activeSession) return;

    // Only save if events actually changed (by ID comparison)
    const currentEventIds = eventStore.events.map((e) => e.id).join(',');
    const previousEventIds = eventsRef.current.map((e) => e.id).join(',');

    if (currentEventIds !== previousEventIds && eventStore.events.length > 0) {
      eventsRef.current = eventStore.events;
      saveSessionEvents(activeSession.id, eventStore.events);
    }
  }, [eventStore.events.length, activeSession?.id]);

  // Handle window resize for responsive panels
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1200 && !sessionSidebarCollapsed) {
        setSessionSidebarCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sessionSidebarCollapsed]);

  const stop = () => {
    stopGeneration();

    const lastMessage = chatMessages.at(-1);
    const lastMessageLastPart = lastMessage?.parts.at(-1);
    if (
      lastMessage?.role === 'assistant' &&
      lastMessageLastPart?.type === 'tool-invocation'
    ) {
      setChatMessages((prev) => [
        ...prev.slice(0, -1),
        {
          ...lastMessage,
          parts: [
            ...lastMessage.parts.slice(0, -1),
            {
              ...lastMessageLastPart,
              toolInvocation: {
                ...lastMessageLastPart.toolInvocation,
                state: 'result',
                result: ABORTED,
              },
            },
          ],
        },
      ]);
    }
  };

  const isLoading = status !== 'ready';
  const selectedEvent = eventStore.selectedEventId
    ? eventStore.events.find((e) => e.id === eventStore.selectedEventId)
    : null;

  return (
    <div className="flex h-dvh relative">
      {/* Mobile/tablet banner */}
      <div className="flex items-center justify-center fixed left-1/2 -translate-x-1/2 top-5 shadow-md text-xs mx-auto rounded-lg h-8 w-fit bg-blue-600 text-white px-3 py-2 text-left z-50 xl:hidden">
        <span>Headless mode</span>
      </div>

      {/* Desktop Layout */}
      <DesktopLayout
        messages={chatMessages}
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
        status={status}
        stop={stop}
        append={append}
        isInitializing={isInitializing}
        sessionSidebarCollapsed={sessionSidebarCollapsed}
        onToggleSessionSidebar={setSessionSidebarCollapsed}
        desktopContainerRef={desktopContainerRef}
        desktopEndRef={desktopEndRef}
        rateLimitState={rateLimitState}
        onCancelRateLimit={cancelRateLimit}
        streamUrl={streamUrl}
        sandboxId={sandboxId}
        vncLoading={vncLoading}
        onRefreshDesktop={refreshDesktop}
        selectedEvent={selectedEvent}
      />

      {/* Mobile/Tablet Layout */}
      <MobileLayout
        messages={chatMessages}
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
        status={status}
        stop={stop}
        append={append}
        isInitializing={isInitializing}
        mobileContainerRef={mobileContainerRef}
        mobileEndRef={mobileEndRef}
        rateLimitState={rateLimitState}
        onCancelRateLimit={cancelRateLimit}
        streamUrl={streamUrl}
        sandboxId={sandboxId}
        onRefreshDesktop={refreshDesktop}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        sessionSidebarCollapsed={sessionSidebarCollapsed}
        onToggleSessionSidebar={setSessionSidebarCollapsed}
      />
    </div>
  );
}

export default function Chat() {
  return (
    <EventStoreProvider>
      <SessionStoreProvider>
        <ChatContent />
      </SessionStoreProvider>
    </EventStoreProvider>
  );
}
