"use server";

import { Sandbox } from "@e2b/desktop";
import { resolution } from "./tool";

export const getDesktop = async (id?: string) => {
  try {
    if (id) {
      try {
        // Sandbox.connect() automatically resumes paused sandboxes (per E2B docs)
        // When connecting to existing sandbox, don't call stream.start() - connect() handles it
        // The stream will be ready after connect() completes
        const connected = await Sandbox.connect(id);
        return connected;
      } catch (connectError: unknown) {
        // Handle connection errors - display error and create new instance
        const error = connectError as { 
          message?: string; 
          statusCode?: number; 
          code?: string;
          name?: string;
        };
        
        const isNotFound = 
          error.name === 'NotFoundError' ||
          error.statusCode === 404 ||
          error.code === '404' ||
          (error.message && error.message.includes('404')) ||
          (error.message && error.message.includes("doesn't exist")) ||
          (error.message && error.message.includes('not found'));
        
        if (isNotFound) {
          // Sandbox expired/deleted (30 day limit) or doesn't exist
          // Error will be handled by caller to show user-friendly message
          throw new Error(`Sandbox ${id} not found or expired. Creating new sandbox.`);
        } else {
          // Other connection errors - re-throw with details for user display
          const errorMessage = error.message || String(connectError);
          throw new Error(`Failed to connect to sandbox ${id}: ${errorMessage}`);
        }
      }
    }

    // Create new sandbox (either no id provided, or previous one didn't exist/expired)
    // Handle connection timeout errors with retry
    const maxCreateRetries = 3;
    let lastCreateError: unknown;
    
    for (let attempt = 0; attempt < maxCreateRetries; attempt++) {
      try {
        const desktop = await Sandbox.create({
          resolution: [resolution.x, resolution.y],
          timeoutMs: 300000, // Container timeout in milliseconds
        });
        await desktop.stream.start();
        return desktop;
      } catch (createError: unknown) {
        lastCreateError = createError;
        const err = createError as { 
          message?: string; 
          code?: string;
          cause?: { code?: string; message?: string };
        };
        
        // Check if it's a connection timeout
        const isTimeout = 
          err.code === 'UND_ERR_CONNECT_TIMEOUT' ||
          (err.cause && err.cause.code === 'UND_ERR_CONNECT_TIMEOUT') ||
          (err.message && err.message.includes('Connect Timeout')) ||
          (err.message && err.message.includes('timeout'));
        
        if (isTimeout && attempt < maxCreateRetries - 1) {
          // Wait before retrying (exponential backoff)
          const delay = 1000 * (attempt + 1); // 1s, 2s, 3s
          console.log(`Connection timeout, retrying in ${delay}ms (attempt ${attempt + 1}/${maxCreateRetries})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // If not a timeout or last attempt, throw the error
        throw createError;
      }
    }
    
    // All retries failed
    throw lastCreateError || new Error('Failed to create sandbox after retries');
  } catch (error) {
    console.error("Error in getDesktop:", error);
    throw error;
  }
};

export const getDesktopURL = async (id?: string) => {
  try {
    const desktop = await getDesktop(id);
    
    // Retry logic with exponential backoff for getting stream URL
    // The stream server may need time to be ready after connect()
    // This handles the case where stream says "already running" but getUrl() says "not running"
    const maxRetries = 5;
    let lastError: unknown;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const streamUrl = desktop.stream.getUrl();
        return { streamUrl, id: desktop.sandboxId };
      } catch (streamError: unknown) {
        lastError = streamError;
        const streamErr = streamError as { message?: string };
        const errorMessage = streamErr.message || String(streamError);
        
        // If "Server is not running", wait and retry (stream may still be initializing)
        // This can happen when connect() resumes a paused sandbox - stream needs time to start
        if (errorMessage.includes('not running')) {
          // Exponential backoff: 200ms, 400ms, 800ms, 1600ms, 3200ms (capped at 3s)
          const delay = Math.min(200 * Math.pow(2, attempt), 3000);
          if (attempt < maxRetries - 1) {
            console.log(`Stream not ready yet, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        // For other errors, try retrying with delay (might be timing issue)
        if (attempt < maxRetries - 1) {
          const delay = 200 * (attempt + 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // Last attempt failed
        throw streamError;
      }
    }
    
    // All retries failed
    throw lastError || new Error('Failed to get stream URL after retries');
  } catch (error) {
    console.error("Error in getDesktopURL:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get desktop: ${errorMessage}`);
  }
};

/**
 * Pause a sandbox to preserve its state
 * Note: betaPause() is not available in @e2b/desktop package
 * Sandboxes auto-pause after inactivity, and Sandbox.connect() auto-resumes them
 * This function is kept for compatibility but does nothing (sandboxes handle persistence automatically)
 * Based on E2B Persistence API: https://e2b.dev/docs/sandbox/persistence
 */
export const pauseDesktop = async (id: string): Promise<void> => {
  try {
    // Note: betaPause() is not available in @e2b/desktop
    // Sandboxes automatically pause after inactivity and auto-resume on connect()
    // This is a no-op - sandbox persistence is handled automatically by E2B
    console.log(`Sandbox ${id} persistence is handled automatically by E2B (auto-pause on inactivity)`);
  } catch (error: unknown) {
    // Silently handle - pausing is automatic in E2B
    const err = error as { 
      message?: string; 
      statusCode?: number; 
      code?: string;
      name?: string;
    };
    const isNotFound = 
      err.name === 'NotFoundError' ||
      err.statusCode === 404 ||
      err.code === '404' ||
      (err.message && (err.message.includes('404') || err.message.includes("doesn't exist") || err.message.includes('not found')));
    
    if (!isNotFound) {
      console.warn(`Note: Sandbox ${id} persistence is automatic - no manual pause needed`);
    }
  }
};

export const killDesktop = async (id: string = "desktop") => {
  try {
    // Don't actually kill - just try to connect to verify it exists
    // Sandboxes auto-pause after inactivity, so we don't need to kill them
    const desktop = await Sandbox.connect(id);
    // Just verify connection - sandbox will auto-pause when inactive
    console.log(`Sandbox ${id} verified - will auto-pause when inactive`);
  } catch (error: unknown) {
    // If sandbox doesn't exist, that's fine
    const err = error as { message?: string; statusCode?: number; code?: string };
    const is404 = 
      err.statusCode === 404 ||
      err.code === '404' ||
      (err.message && err.message.includes('404')) ||
      (err.message && err.message.includes("doesn't exist"));
    
    if (!is404) {
      console.warn("Error verifying sandbox:", error);
    }
    // Silently ignore 404 errors - sandbox already doesn't exist
  }
};
