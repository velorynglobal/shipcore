import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import axios from 'axios';
import { sendWhatsAppMessage, notifyEnquiryReceived } from '@/lib/whatsapp';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WhatsApp Service', () => {
  beforeEach(() => {
    process.env.WHATSAPP_API_URL = 'https://api.wati.io/v1';
    process.env.WHATSAPP_TOKEN = 'test_token';
    mockedAxios.post.mockClear();
  });

  it('sendWhatsAppMessage should return true on success', async () => {
    mockedAxios.post.mockResolvedValueOnce({ status: 200 });
    const result = await sendWhatsAppMessage({
      phone: '+1234567890',
      message: 'Hello',
    });
    expect(result).toBe(true);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.wati.io/v1/send-message',
      { phone: '+1234567890', message: 'Hello', media_url: undefined },
      expect.any(Object)
    );
  });

  it('sendWhatsAppMessage should return false when API key missing', async () => {
    delete process.env.WHATSAPP_TOKEN;
    const result = await sendWhatsAppMessage({
      phone: '+1234567890',
      message: 'Hello',
    });
    expect(result).toBe(false);
  });

  it('sendWhatsAppMessage should return false on API error', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('API Error'));
    const result = await sendWhatsAppMessage({
      phone: '+1234567890',
      message: 'Hello',
    });
    expect(result).toBe(false);
  });

  it('notifyEnquiryReceived should call sendWhatsAppMessage', async () => {
    process.env.MD_PHONE_NUMBER = '+19876543210';
    mockedAxios.post.mockResolvedValueOnce({ status: 200 });
    
    await notifyEnquiryReceived('ENQ-001', 'Test Customer');
    
    expect(mockedAxios.post).toHaveBeenCalled();
  });
});
