/**
 * Error detection and handling utilities
 */

/**
 * Check if an error is a rate limit error (429)
 */
export function isRateLimitError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const err = error as Record<string, unknown>;

  // Check for status code in error object
  if ('status' in err && err.status === 429) {
    return true;
  }

  // Check for nested error structure (AI_RetryError with lastError)
  if ('lastError' in err && typeof err.lastError === 'object' && err.lastError !== null) {
    const lastError = err.lastError as Record<string, unknown>;
    if ('statusCode' in lastError && lastError.statusCode === 429) {
      return true;
    }
  }

  // Check error message for rate limit indicators
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();
  
  return (
    lowerMessage.includes('rate limit') ||
    lowerMessage.includes('exceed the rate limit') ||
    lowerMessage.includes('429') ||
    lowerMessage.includes('rate_limit') ||
    // Handle "Failed after X attempts" with rate limit in the message
    (lowerMessage.includes('failed after') && lowerMessage.includes('rate limit'))
  );
}

/**
 * Check if an error is a "not found" error (404, expired, etc.)
 */
export function isNotFoundError(error: unknown): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return (
    errorMessage.includes('not found') ||
    errorMessage.includes("doesn't exist") ||
    errorMessage.includes('expired') ||
    errorMessage.includes('404') ||
    errorMessage.includes('NotFoundError')
  );
}

/**
 * Extract retry-after time from error message or headers
 * Returns the number of seconds to wait, or null if not found
 */
export function extractRetryAfter(error: unknown): number | null {
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;

    // Check for nested error structure (AI_RetryError with lastError)
    if ('lastError' in err && typeof err.lastError === 'object' && err.lastError !== null) {
      const lastError = err.lastError as Record<string, unknown>;
      
      // Extract from responseHeaders
      if ('responseHeaders' in lastError && typeof lastError.responseHeaders === 'object' && lastError.responseHeaders !== null) {
        const headers = lastError.responseHeaders as Record<string, unknown>;
        if ('retry-after' in headers) {
          const retryAfter = headers['retry-after'];
          if (typeof retryAfter === 'string') {
            const parsed = parseInt(retryAfter, 10);
            if (!isNaN(parsed)) {
              return parsed;
            }
          } else if (typeof retryAfter === 'number') {
            return retryAfter;
          }
        }
      }
    }
  }

  // Check error message for retry-after
  const errorMessage = error instanceof Error ? error.message : String(error);
  const retryMatch = errorMessage.match(/retry[_\s-]?after[:\s]+(\d+)/i);
  
  if (retryMatch) {
    return parseInt(retryMatch[1], 10);
  }
  
  // Check for "per minute" rate limits - wait full minute
  if (errorMessage.includes('per minute') || errorMessage.toLowerCase().includes('per minute')) {
    // Wait 60 seconds to ensure the minute window has fully reset
    return 60;
  }
  
  // Check for "per hour" or "per day" limits
  if (errorMessage.includes('per hour')) {
    return 3600 + 60; // 1 hour + 1 minute buffer
  }
  if (errorMessage.includes('per day')) {
    return 86400 + 300; // 1 day + 5 minute buffer
  }
  
  // Default to 60 seconds for rate limits
  if (errorMessage.toLowerCase().includes('rate limit') || errorMessage.includes('429')) {
    return 60;
  }
  
  return null;
}
