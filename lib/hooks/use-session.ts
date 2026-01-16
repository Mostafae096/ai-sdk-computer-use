'use client';

import { useMemo } from 'react';
import { useSessionStoreContext } from '@/lib/context/session-store';
import type { ChatSession } from '@/lib/types/sessions';

/**
 * Hook to access session store
 */
export function useSession() {
  return useSessionStoreContext();
}

/**
 * Hook to get all sessions
 */
export function useSessions(): ChatSession[] {
  const { state } = useSession();
  return useMemo(() => state.sessions, [state.sessions]);
}

/**
 * Hook to get active session
 */
export function useActiveSession(): ChatSession | null {
  const { getActiveSession } = useSession();
  return useMemo(() => getActiveSession(), [getActiveSession]);
}

/**
 * Hook to get active session ID
 */
export function useActiveSessionId(): string | null {
  const { state } = useSession();
  return useMemo(() => state.activeSessionId, [state.activeSessionId]);
}

/**
 * Hook to check if sessions are loading
 */
export function useSessionsLoading(): boolean {
  const { state } = useSession();
  return state.isLoading;
}
