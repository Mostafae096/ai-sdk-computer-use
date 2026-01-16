'use client';

import { memo } from 'react';
import { Button } from '@/components/ui/button';

/**
 * VNC Viewer props - isolated to prevent re-renders
 */
export interface VNCViewerProps {
  streamUrl: string | null;
  sandboxId: string | null;
  onRefresh?: () => void;
  isInitializing?: boolean;
}

/**
 * Memoized VNC viewer component
 * Only re-renders when streamUrl, sandboxId, or isInitializing changes
 */
export const VNCViewer = memo<VNCViewerProps>(
  ({ streamUrl, sandboxId, onRefresh, isInitializing = false }) => {
    return (
      <div className="bg-black relative items-center justify-center h-full w-full">
        {streamUrl ? (
          <>
            <iframe
              src={streamUrl}
              className="w-full h-full"
              style={{
                transformOrigin: 'center',
                width: '100%',
                height: '100%',
              }}
              allow="autoplay"
              title="VNC Desktop Viewer"
              onError={(e) => {
                // Suppress browser extension connection errors (non-critical)
                // These occur when extension tries to communicate with iframe
                const error = e.nativeEvent;
                if (error && 'message' in error) {
                  const msg = String((error as { message?: string }).message || '');
                  if (msg.includes('Receiving end does not exist') || 
                      msg.includes('Could not establish connection')) {
                    // Non-critical browser extension error, ignore
                    e.preventDefault();
                    return;
                  }
                }
              }}
            />
            {onRefresh && (
              <Button
                onClick={onRefresh}
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white px-3 py-1 rounded text-sm z-10"
                disabled={isInitializing}
              >
                {isInitializing ? 'Creating desktop...' : 'New desktop'}
              </Button>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-white">
            {isInitializing
              ? 'Initializing desktop...'
              : 'Loading stream...'}
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if these specific props change
    return (
      prevProps.streamUrl === nextProps.streamUrl &&
      prevProps.sandboxId === nextProps.sandboxId &&
      prevProps.isInitializing === nextProps.isInitializing
    );
  },
);

VNCViewer.displayName = 'VNCViewer';
