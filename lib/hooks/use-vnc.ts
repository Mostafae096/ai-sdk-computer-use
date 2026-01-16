'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getDesktopURL } from '@/lib/e2b/utils';
import { handleDesktopError } from '@/lib/utils/vnc-helpers';
import { useSession } from './use-session';
import type { ChatSession } from '@/lib/types/sessions';

interface VNCState {
  streamUrl: string | null;
  sandboxId: string | null;
  isLoading: boolean;
  isInitializing: boolean;
}

interface UseVNCReturn extends VNCState {
  refresh: (sandboxIdOverride?: string) => Promise<void>;
}

/**
 * Hook to manage VNC/desktop state and initialization
 */
export function useVNC(activeSession: ChatSession | null): UseVNCReturn {
  const { updateSession } = useSession();
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [sandboxId, setSandboxId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const previousSandboxIdRef = useRef<string | null>(null);
  const lastInitializedSessionIdRef = useRef<string | null>(null);
  const isInitializingRef = useRef(false);
  
  // Store latest values in refs to avoid dependency issues
  const activeSessionRef = useRef(activeSession);
  const updateSessionRef = useRef(updateSession);
  
  useEffect(() => {
    activeSessionRef.current = activeSession;
    updateSessionRef.current = updateSession;
  }, [activeSession, updateSession]);

  const initialize = useCallback(
    async (sandboxIdOverride?: string) => {
      const session = activeSessionRef.current;
      if (!session || isInitializingRef.current) return;

      isInitializingRef.current = true;
      try {
        setIsInitializing(true);
        setIsLoading(true);

        // Priority: Always try to reuse existing sandboxId if it exists
        const sandboxIdToUse = sandboxIdOverride || session.sandboxId || undefined;
        const { streamUrl: url, id } = await getDesktopURL(sandboxIdToUse);
        
        setStreamUrl(url);
        setSandboxId(id);
        previousSandboxIdRef.current = id;
        lastInitializedSessionIdRef.current = session.id;

        // Update session with sandbox ID immediately to ensure persistence
        if (session.sandboxId !== id) {
          const updated = { ...session, sandboxId: id };
          updateSessionRef.current(updated);
        }
      } catch (error) {
        console.error('Failed to initialize desktop:', error);
        
        const session = activeSessionRef.current;
        if (session) {
          // Try to recover from error
          const result = await handleDesktopError(error, session, updateSessionRef.current);
          if (result) {
            setStreamUrl(result.streamUrl);
            setSandboxId(result.id);
            previousSandboxIdRef.current = result.id;
            lastInitializedSessionIdRef.current = session.id;
          }
        }
      } finally {
        setIsInitializing(false);
        setIsLoading(false);
        isInitializingRef.current = false;
      }
    },
    [], // No dependencies - use refs instead
  );

  const refresh = useCallback(
    async (sandboxIdOverride?: string) => {
      await initialize(sandboxIdOverride);
    },
    [initialize],
  );

  // Initialize when session changes or on mount
  useEffect(() => {
    if (!activeSession) {
      setIsInitializing(false);
      return;
    }

    // Prevent re-initializing the same session
    if (lastInitializedSessionIdRef.current === activeSession.id) {
      // Check if we still have the correct stream URL for this session
      if (streamUrl && (activeSession.sandboxId === sandboxId || (!activeSession.sandboxId && sandboxId))) {
        setIsInitializing(false);
        return;
      }
    }

    // Initialize if:
    // 1. No stream URL yet (first load or refresh)
    // 2. Session has sandboxId but it's different from current (switching to different session's sandbox)
    // 3. Session doesn't have sandboxId (new session needs new sandbox)
    // 4. Session ID changed (switching sessions)
    const needsInit =
      lastInitializedSessionIdRef.current !== activeSession.id ||
      !streamUrl ||
      (activeSession.sandboxId && activeSession.sandboxId !== sandboxId) ||
      (!activeSession.sandboxId && !sandboxId);

    if (needsInit && !isInitializingRef.current) {
      initialize();
    } else {
      setIsInitializing(false);
    }
  }, [activeSession?.id, activeSession?.sandboxId, streamUrl, sandboxId, initialize]);

  return {
    streamUrl,
    sandboxId,
    isLoading,
    isInitializing,
    refresh,
  };
}
