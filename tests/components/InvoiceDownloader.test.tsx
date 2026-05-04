/** @jest-environment jsdom */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import InvoiceDownloader from '@/app/components/InvoiceDownloader';

// Mock fetch globally
global.fetch = jest.fn();

describe('InvoiceDownloader', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('should render download button', () => {
    render(<InvoiceDownloader />);
    expect(screen.getByText('Download Invoice PDF')).toBeInTheDocument();
  });

  it('should show loading state when clicked', async () => {
    (fetch as jest.Mock).mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob()),
      }), 100))
    );

    render(<InvoiceDownloader />);
    const button = screen.getByText('Download Invoice PDF');
    fireEvent.click(button);
    expect(screen.getByText('Generating...')).toBeInTheDocument();
  });

  it('should handle fetch error', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve('Error'),
    });

    // Mock alert
    global.alert = jest.fn();

    render(<InvoiceDownloader />);
    const button = screen.getByText('Download Invoice PDF');
    fireEvent.click(button);

    await new Promise(resolve => setTimeout(resolve, 50));
    expect(global.alert).toHaveBeenCalled();
  });
});
