'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Hook to listen for storage quota warnings and errors
 */
export function useStorageQuota() {
  useEffect(() => {
    const handleQuotaWarning = (e: CustomEvent) => {
      toast.warning('Storage Warning', {
        description: e.detail.message,
        duration: 5000,
      });
    };

    const handleQuotaError = (e: CustomEvent) => {
      toast.error('Storage Error', {
        description: e.detail.message,
        duration: 8000,
      });
    };

    window.addEventListener('storage-quota-warning', handleQuotaWarning as EventListener);
    window.addEventListener('storage-quota-error', handleQuotaError as EventListener);

    return () => {
      window.removeEventListener('storage-quota-warning', handleQuotaWarning as EventListener);
      window.removeEventListener('storage-quota-error', handleQuotaError as EventListener);
    };
  }, []);
}
