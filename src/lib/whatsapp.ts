import axios from 'axios';

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://api.wati.io/v1';
const WHATSAPP_TOKEN = process.env.WHATSAPP_API_TOKEN;

export interface WhatsAppMessage {
  phone: string;
  message: string;
  media_url?: string;
}

export async function sendWhatsAppMessage(msg: WhatsAppMessage): Promise<boolean> {
  if (!WHATSAPP_TOKEN) {
    console.warn('WHATSAPP_API_TOKEN not configured');
    return false;
  }

  try {
    const res = await axios.post(
      `${WHATSAPP_API_URL}/send-message`,
      {
        phone: msg.phone,
        message: msg.message,
        media_url: msg.media_url,
      },
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return res.status === 200;
  } catch (err) {
    console.error('WhatsApp send error:', err);
    return false;
  }
}

// Outbound enquiry notification
export async function notifyEnquiryReceived(enquiryId: string, customerName: string) {
  const message = `New enquiry received from ${customerName}. Enquiry ID: ${enquiryId}`;
  // Send to admin/sales team
  await sendWhatsAppMessage({
    phone: process.env.MD_PHONE_NUMBER || '',
    message,
  });
}
