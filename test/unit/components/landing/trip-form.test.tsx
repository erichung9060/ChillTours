import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TripForm } from '@/components/landing/trip-form';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('TripForm - Form Validation', () => {
  it('should reject empty destination', async () => {
    render(<TripForm />);
    
    const submitButton = screen.getByRole('button', { name: /generate free itinerary/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Destination is required')).toBeInTheDocument();
    });
  });

  it('should accept valid destination', async () => {
    render(<TripForm />);
    
    const destinationInput = screen.getByPlaceholderText(/e.g. Tokyo, Bali, Paris/i);
    fireEvent.change(destinationInput, { target: { value: 'Tokyo' } });
    
    const submitButton = screen.getByRole('button', { name: /generate free itinerary/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Destination is required')).not.toBeInTheDocument();
    });
  });

  it('should handle optional custom requirements', async () => {
    render(<TripForm />);
    
    const destinationInput = screen.getByPlaceholderText(/e.g. Tokyo, Bali, Paris/i);
    const vibeTextarea = screen.getByPlaceholderText(/Budget-friendly foodie tour/i);
    
    // Submit with destination only (no vibe)
    fireEvent.change(destinationInput, { target: { value: 'Paris' } });
    
    const submitButton = screen.getByRole('button', { name: /generate free itinerary/i });
    fireEvent.click(submitButton);
    
    // Should not show any validation errors
    await waitFor(() => {
      expect(screen.queryByText('Destination is required')).not.toBeInTheDocument();
    });
    
    // Now add vibe and submit again
    fireEvent.change(vibeTextarea, { target: { value: 'Budget-friendly foodie tour' } });
    fireEvent.click(submitButton);
    
    // Should still not show validation errors
    await waitFor(() => {
      expect(screen.queryByText('Destination is required')).not.toBeInTheDocument();
    });
  });

  it('should reject whitespace-only destination', async () => {
    render(<TripForm />);
    
    const destinationInput = screen.getByPlaceholderText(/e.g. Tokyo, Bali, Paris/i);
    fireEvent.change(destinationInput, { target: { value: '   ' } });
    
    const submitButton = screen.getByRole('button', { name: /generate free itinerary/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Destination is required')).toBeInTheDocument();
    });
  });

  it('should validate days input as positive number', async () => {
    render(<TripForm />);
    
    const destinationInput = screen.getByPlaceholderText(/e.g. Tokyo, Bali, Paris/i);
    const daysInput = screen.getByPlaceholderText(/Days/i);
    
    // Test that valid positive days are accepted
    fireEvent.change(destinationInput, { target: { value: 'Tokyo' } });
    fireEvent.change(daysInput, { target: { value: '5' } });
    
    const submitButton = screen.getByRole('button', { name: /generate free itinerary/i });
    fireEvent.click(submitButton);
    
    // Should not show validation errors for valid input
    await waitFor(() => {
      expect(screen.queryByText('Please enter a valid number of days')).not.toBeInTheDocument();
    });
  });
});
