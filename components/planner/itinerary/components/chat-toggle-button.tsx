/**
 * Chat Toggle Button Component
 *
 * Fixed position button for opening/closing the chat panel.
 */

"use client";

import type { ChatToggleButtonProps } from "../types";

export function ChatToggleButton({ onToggleChat, isChatOpen }: ChatToggleButtonProps) {
  if (!onToggleChat) return null;

  return (
    <button
      onClick={onToggleChat}
      className="hidden md:flex absolute bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 items-center justify-center"
      aria-label={isChatOpen ? "Close chat" : "Open chat"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );
}
