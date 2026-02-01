/**
 * Chat Panel Component
 * 
 * Displays chat interface for conversing with AI about the itinerary.
 * Right panel in the three-panel layout (collapsible).
 * 
 * Features:
 * - Message display with user/assistant roles
 * - Message input component
 * - Streaming message display with typing indicator
 * - Message submission handling
 * - Auto-scroll to bottom
 * - Apply itinerary updates from AI responses
 * - Persistent chat history per itinerary (localStorage)
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 18.1, 18.2, 18.3
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useItineraryChat } from '@/hooks/use-itinerary-chat';
import type { Itinerary } from '@/types/itinerary';
import type { ChatMessage } from '@/types/chat';

interface ChatPanelProps {
  itinerary: Itinerary;
  isOpen: boolean;
  onClose: () => void;
  onItineraryUpdate: (itinerary: Itinerary) => void;
}

export function ChatPanel({ itinerary, isOpen, onClose, onItineraryUpdate }: ChatPanelProps) {
  const { messages, addMessage, clearMessages } = useItineraryChat(itinerary.id);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive (Requirement 8.5)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Handle message submission (Requirement 8.1)
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isStreaming) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    // Add user message to localStorage (Requirement 8.5)
    addMessage(userMessage);
    setInput('');
    setIsStreaming(true);

    try {
      // Import AI client
      const { aiClient } = await import('@/lib/ai/client');
      
      // Create streaming assistant message (Requirement 18.2)
      const assistantMessageId = crypto.randomUUID();
      let streamingContent = '';
      
      const streamingMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        streaming: true,
      };
      
      addMessage(streamingMessage);

      // Call chat API with streaming (Requirement 8.2, 18.1)
      const result = await aiClient.chat(
        {
          message: userMessage.content,
          history: messages,
          context: itinerary,
        },
        (chunk) => {
          // Update streaming message content progressively
          streamingContent += chunk;
          const updatedMessage: ChatMessage = {
            ...streamingMessage,
            content: streamingContent,
            streaming: true,
          };
          // Update the message in localStorage
          addMessage(updatedMessage);
        }
      );

      // Mark message as complete (Requirement 18.3)
      const finalMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: result.message,
        timestamp: Date.now(),
        streaming: false,
      };
      
      addMessage(finalMessage);

      // Apply itinerary updates if present (Requirement 8.3)
      if (result.updates && Object.keys(result.updates).length > 0) {
        const updatedItinerary = {
          ...itinerary,
          ...result.updates,
        };
        onItineraryUpdate(updatedItinerary);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now(),
        streaming: false,
      };
      addMessage(errorMessage);
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, messages, itinerary, addMessage, onItineraryUpdate]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <h2 className="font-semibold">Chat</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Delete chat history button */}
          {messages.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Delete all chat history for this itinerary?')) {
                  clearMessages();
                }
              }}
              className="p-2 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-destructive"
              aria-label="Delete chat history"
              title="Delete chat history"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          )}
          {/* Close button - right arrow icon */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            aria-label="Close chat"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages (Requirement 8.4) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-sm">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
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
                  className="text-primary"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3 className="font-medium mb-2">Start a conversation</h3>
              <p className="text-sm text-muted-foreground">
                Ask me to modify your itinerary, suggest activities, or answer questions about your trip.
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {/* Show streaming indicator for streaming messages (Requirement 18.2) */}
                  {message.streaming && (
                    <div className="flex items-center gap-1 mt-2">
                      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                  {/* Show timestamp only for completed messages */}
                  {!message.streaming && (
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input (Requirement 8.1) */}
      <div className="p-4 border-t border-border">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about your trip..."
            disabled={isStreaming}
            className="min-h-[60px] max-h-[120px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button
            type="submit"
            variant="primary"
            size="icon"
            disabled={!input.trim() || isStreaming}
            className="flex-shrink-0 h-[60px] w-[60px]"
          >
            {isStreaming ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-spin"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
