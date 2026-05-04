import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import axios from 'axios';
import { sendEmail, buildInvoiceEmail, buildQuoteEmail } from '@/lib/email';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Email Service', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 'test_resend_key';
    mockedAxios.post.mockClear();
  });

  it('sendEmail should return true on success', async () => {
    mockedAxios.post.mockResolvedValueOnce({ status: 200 });
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      text: 'Hello',
    });
    expect(result).toBe(true);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.any(Object),
      expect.any(Object)
    );
  });

  it('sendEmail should return false when API key missing', async () => {
    delete process.env.RESEND_API_KEY;
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      text: 'Hello',
    });
    expect(result).toBe(false);
  });

  it('buildInvoiceEmail should return HTML string', () => {
    const html = buildInvoiceEmail('INV-001', 'Test Customer');
    expect(html).toContain('Invoice INV-001');
    expect(html).toContain('Test Customer');
    expect(html).toContain('ShipCore Team');
  });

  it('buildQuoteEmail should return HTML string', () => {
    const html = buildQuoteEmail('QT-001', 'Test Customer');
    expect(html).toContain('Quote QT-001');
    expect(html).toContain('Test Customer');
  });
});
