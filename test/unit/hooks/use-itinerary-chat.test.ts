/**
 * Tests for useItineraryChat hook
 */

import { renderHook, act } from "@testing-library/react";
import { useItineraryChat } from "@/hooks/use-itinerary-chat";
import type { ChatMessage } from "@/types/chat";

describe("useItineraryChat", () => {
  const itineraryId = "test-itinerary-123";
  const storageKey = `tripai:chat:${itineraryId}`;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should initialize with empty messages", () => {
    const { result } = renderHook(() => useItineraryChat(itineraryId));

    expect(result.current.messages).toEqual([]);
  });

  it("should add a new message", () => {
    const { result } = renderHook(() => useItineraryChat(itineraryId));

    const message: ChatMessage = {
      id: "1",
      role: "user",
      content: "Hello",
      timestamp: Date.now(),
    };

    act(() => {
      result.current.addMessage(message);
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toEqual(message);
  });

  it("should persist messages to localStorage", () => {
    const { result } = renderHook(() => useItineraryChat(itineraryId));

    const message: ChatMessage = {
      id: "1",
      role: "user",
      content: "Hello",
      timestamp: Date.now(),
    };

    act(() => {
      result.current.addMessage(message);
    });

    const stored = localStorage.getItem(storageKey);
    expect(stored).toBeTruthy();

    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual(message);
  });

  it("should load messages from localStorage on mount", () => {
    const messages: ChatMessage[] = [
      {
        id: "1",
        role: "user",
        content: "Hello",
        timestamp: Date.now(),
      },
      {
        id: "2",
        role: "assistant",
        content: "Hi there!",
        timestamp: Date.now(),
      },
    ];

    localStorage.setItem(storageKey, JSON.stringify(messages));

    const { result } = renderHook(() => useItineraryChat(itineraryId));

    expect(result.current.messages).toEqual(messages);
  });

  it("should update existing message with same ID", () => {
    const { result } = renderHook(() => useItineraryChat(itineraryId));

    const message: ChatMessage = {
      id: "1",
      role: "assistant",
      content: "Loading...",
      timestamp: Date.now(),
      streaming: true,
    };

    act(() => {
      result.current.addMessage(message);
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe("Loading...");

    // Update the same message
    const updatedMessage: ChatMessage = {
      ...message,
      content: "Complete response",
      streaming: false,
    };

    act(() => {
      result.current.addMessage(updatedMessage);
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe("Complete response");
    expect(result.current.messages[0].streaming).toBe(false);
  });

  it("should clear all messages", () => {
    const { result } = renderHook(() => useItineraryChat(itineraryId));

    const message: ChatMessage = {
      id: "1",
      role: "user",
      content: "Hello",
      timestamp: Date.now(),
    };

    act(() => {
      result.current.addMessage(message);
    });

    expect(result.current.messages).toHaveLength(1);

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toHaveLength(0);
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it("should isolate messages by itinerary ID", () => {
    const itinerary1 = "itinerary-1";
    const itinerary2 = "itinerary-2";

    const { result: result1 } = renderHook(() => useItineraryChat(itinerary1));
    const { result: result2 } = renderHook(() => useItineraryChat(itinerary2));

    const message1: ChatMessage = {
      id: "1",
      role: "user",
      content: "Message for itinerary 1",
      timestamp: Date.now(),
    };

    const message2: ChatMessage = {
      id: "2",
      role: "user",
      content: "Message for itinerary 2",
      timestamp: Date.now(),
    };

    act(() => {
      result1.current.addMessage(message1);
      result2.current.addMessage(message2);
    });

    expect(result1.current.messages).toHaveLength(1);
    expect(result1.current.messages[0].content).toBe("Message for itinerary 1");

    expect(result2.current.messages).toHaveLength(1);
    expect(result2.current.messages[0].content).toBe("Message for itinerary 2");
  });

  it("should handle localStorage errors gracefully", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // Mock localStorage.setItem to throw an error
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = vi.fn(() => {
      throw new Error("QuotaExceededError");
    });

    const { result } = renderHook(() => useItineraryChat(itineraryId));

    const message: ChatMessage = {
      id: "1",
      role: "user",
      content: "Hello",
      timestamp: Date.now(),
    };

    act(() => {
      result.current.addMessage(message);
    });

    // Message should still be in state
    expect(result.current.messages).toHaveLength(1);

    // Error should be logged
    expect(consoleErrorSpy).toHaveBeenCalled();

    // Restore
    localStorage.setItem = originalSetItem;
    consoleErrorSpy.mockRestore();
  });

  it("should reload messages when itinerary ID changes", () => {
    const itinerary1 = "itinerary-1";
    const itinerary2 = "itinerary-2";

    // Add messages for itinerary 1
    localStorage.setItem(
      `tripai:chat:${itinerary1}`,
      JSON.stringify([
        {
          id: "1",
          role: "user",
          content: "Message 1",
          timestamp: Date.now(),
        },
      ])
    );

    // Add messages for itinerary 2
    localStorage.setItem(
      `tripai:chat:${itinerary2}`,
      JSON.stringify([
        {
          id: "2",
          role: "user",
          content: "Message 2",
          timestamp: Date.now(),
        },
      ])
    );

    const { result, rerender } = renderHook(({ id }) => useItineraryChat(id), {
      initialProps: { id: itinerary1 },
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe("Message 1");

    // Change itinerary ID
    rerender({ id: itinerary2 });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe("Message 2");
  });
});
