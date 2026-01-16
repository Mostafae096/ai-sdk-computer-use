"use client";

import type { Message } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { memo } from "react";
import equal from "fast-deep-equal";
import { Streamdown } from "streamdown";

import { cn } from "@/lib/utils";
import { ToolCallCard } from "@/components/tool-call-card";
import { useEventStore } from "@/lib/hooks/use-event-store";

const PurePreviewMessage = ({
  message,
  isLatestMessage,
  status,
}: {
  message: Message;
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
  isLatestMessage: boolean;
}) => {
  const { selectEvent, state } = useEventStore();
  return (
    <AnimatePresence key={message.id}>
      <motion.div
        className="w-full mx-auto px-4 group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        key={`message-${message.id}`}
        data-role={message.role}
      >
        <div
          className={cn(
            "flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl",
            "group-data-[role=user]/message:w-fit",
          )}
        >
          {/* {message.role === "assistant" && (
            <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
              <div className="translate-y-px">
                <SparklesIcon size={14} />
              </div>
            </div>
          )} */}

          <div className="flex flex-col w-full">
            {/* Handle messages with parts array (useChat format - includes user messages) */}
            {message.parts && message.parts.length > 0 ? (
              message.parts
                .slice()
                .sort((a, b) => {
                  // Sort parts: text parts first, then tool invocations
                  if (a.type === 'text' && b.type === 'tool-invocation') return -1;
                  if (a.type === 'tool-invocation' && b.type === 'text') return 1;
                  return 0; // Keep original order for same types
                })
                .map((part, i) => {
                switch (part.type) {
                  case "text":
                    // Safety check: ensure text exists before rendering
                    if (!part.text) return null;
                    return (
                      <motion.div
                        initial={{ y: 5, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        key={`message-${message.id}-part-${i}`}
                        className="flex flex-row gap-2 items-start w-full pb-4"
                      >
                        <div
                          className={cn("flex flex-col gap-4", {
                            "bg-secondary text-secondary-foreground px-3 py-2 rounded-xl":
                              message.role === "user",
                          })}
                        >
                          <Streamdown>{part.text}</Streamdown>
                        </div>
                      </motion.div>
                    );
                  case "tool-invocation":
                  const { toolCallId, state: toolState } = part.toolInvocation;
                  
                  // Find event in store
                  const event = state.events.find((e) => e.id === toolCallId);
                  
                  if (!event) {
                    // Event not yet created, show placeholder
                    return (
                      <motion.div
                        initial={{ y: 5, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        key={`message-${message.id}-part-${i}`}
                        className="p-2 mb-3 text-sm bg-zinc-50 dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800"
                      >
                        <div className="text-zinc-500 dark:text-zinc-400">
                          Loading tool call...
                        </div>
                      </motion.div>
                    );
                  }

                  const handleClick = () => {
                    // Toggle selection - if already selected, deselect
                    if (state.selectedEventId === toolCallId) {
                      selectEvent(null);
                    } else {
                      selectEvent(toolCallId);
                    }
                  };

                  return (
                    <ToolCallCard
                      key={`message-${message.id}-part-${i}`}
                      event={event}
                      status={event.status}
                      isLatest={isLatestMessage}
                      isLoading={status !== "ready"}
                      onClick={handleClick}
                    />
                  );

                  default:
                    return null;
                }
              })
            ) : (
              // Fallback for legacy format (content string) - handle both string and parts that might be empty
              message.content && typeof message.content === 'string' ? (
                <motion.div
                  initial={{ y: 5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  key={`message-${message.id}-content`}
                  className="flex flex-row gap-2 items-start w-full pb-4"
                >
                  <div
                    className={cn("flex flex-col gap-4", {
                      "bg-secondary text-secondary-foreground px-3 py-2 rounded-xl":
                        message.role === "user",
                    })}
                  >
                    <Streamdown>{message.content}</Streamdown>
                  </div>
                </motion.div>
              ) : null
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.status !== nextProps.status) return false;
    if (prevProps.message.annotations !== nextProps.message.annotations)
      return false;
    // if (prevProps.message.content !== nextProps.message.content) return false;
    if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;

    return true;
  },
);
