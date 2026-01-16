import { getDesktopURL } from '@/lib/e2b/utils';
import { isNotFoundError } from './error-helpers';
import { toast } from 'sonner';
import type { ChatSession } from '@/lib/types/sessions';

/**
 * Handle desktop/VNC errors and attempt recovery
 * Returns new desktop connection info if successful, null otherwise
 */
export async function handleDesktopError(
  error: unknown,
  activeSession: ChatSession | null,
  updateSession: (session: ChatSession) => void,
): Promise<{ streamUrl: string; id: string } | null> {
  console.error('Desktop error:', error);
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  const isNotFound = isNotFoundError(error);
  
  if (isNotFound && activeSession?.sandboxId) {
    // Show user-friendly error message for expired/missing sandbox
    toast.error('Sandbox Expired or Missing', {
      description: 'The previous sandbox has expired (30 day limit) or was deleted. Creating a new one...',
      duration: 5000,
    });
  } else {
    // Show other connection errors to user
    toast.error('Failed to connect to sandbox', {
      description: errorMessage || 'Please try again later.',
      duration: 5000,
    });
  }
  
  // Try to create a new sandbox
  try {
    const { streamUrl, id } = await getDesktopURL(undefined);
    
    // Update session with new sandboxId
    if (activeSession) {
      const updated = { ...activeSession, sandboxId: id };
      updateSession(updated);
    }
    
    toast.success('New sandbox created', {
      description: 'Your session has been connected to a new sandbox.',
      duration: 3000,
    });
    
    return { streamUrl, id };
  } catch (createError) {
    console.error('Failed to create new sandbox:', createError);
    const createErrorMessage = createError instanceof Error ? createError.message : String(createError);
    toast.error('Failed to create new sandbox', {
      description: createErrorMessage || 'Please try again later.',
      duration: 5000,
    });
    return null;
  }
}
