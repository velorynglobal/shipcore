import axios from 'axios';

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

export type NotificationChannel = 'email' | 'slack' | 'discord' | 'sms';

export interface NotificationMessage {
  channel: NotificationChannel[];
  subject?: string;
  message: string;
  email_to?: string | string[]; // For email channel
  phone?: string; // For SMS channel
  attachments?: {
    content: Buffer;
    filename: string;
    type: string;
  }[];
}

export async function sendNotification(msg: NotificationMessage): Promise<boolean> {
  const results = await Promise.all(
    msg.channel.map(async (channel) => {
      try {
        switch (channel) {
          case 'email':
            return await sendEmailNotification(msg);
          case 'slack':
            return await sendSlackNotification(msg);
          case 'discord':
            return await sendDiscordNotification(msg);
          case 'sms':
            return await sendSMSNotification(msg);
          default:
            return false;
        }
      } catch (err) {
        console.error(`${channel} notification failed:`, err);
        return false;
      }
    })
  );

  return results.some(r => r === true);
}

async function sendEmailNotification(msg: NotificationMessage): Promise<boolean> {
  if (!msg.email_to) return false;
  
  // Reuse existing email service
  const { sendEmail } = await import('./email');
  return sendEmail({
    to: msg.email_to,
    subject: msg.subject || 'ShipCore Notification',
    text: msg.message,
    attachment: msg.attachments?.[0]
      ? {
          content: msg.attachments[0].content,
          filename: msg.attachments[0].filename,
          type: msg.attachments[0].type,
        }
      : undefined,
  });
}

async function sendSlackNotification(msg: NotificationMessage): Promise<boolean> {
  if (!SLACK_WEBHOOK_URL) {
    console.warn('SLACK_WEBHOOK_URL not configured');
    return false;
  }

  try {
    const res = await axios.post(SLACK_WEBHOOK_URL, {
      text: msg.message,
      ...(msg.subject && { attachments: [{ color: 'good', title: msg.subject, text: msg.message }] }),
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

async function sendDiscordNotification(msg: NotificationMessage): Promise<boolean> {
  if (!DISCORD_WEBHOOK_URL) {
    console.warn('DISCORD_WEBHOOK_URL not configured');
    return false;
  }

  try {
    const res = await axios.post(DISCORD_WEBHOOK_URL, {
      content: msg.message,
      ...(msg.subject && { embeds: [{ title: msg.subject, description: msg.message, color: 0x1e40af }] }),
    });
    return res.status === 204;
  } catch {
    return false;
  }
}

async function sendSMSNotification(msg: NotificationMessage): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !msg.phone) {
    console.warn('Twilio credentials or phone number missing');
    return false;
  }

  try {
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    const res = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      new URLSearchParams({
        From: TWILIO_PHONE_NUMBER || '',
        To: msg.phone,
        Body: msg.message,
      }),
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    return res.status === 201;
  } catch {
    return false;
  }
}

// Helper to notify multiple agents via different channels
export async function notifyAgents(
  agentKeys: string[],
  message: string,
  subject?: string
): Promise<number> {
  // This would fetch agent notification preferences from DB and send accordingly
  // For now, just log
  console.log(`Notifying agents ${agentKeys.join(', ')}: ${message}`);
  
  // Example: Send to Slack for urgent items
  if (SLACK_WEBHOOK_URL) {
    await sendSlackNotification({ channel: ['slack'], subject, message });
  }
  
  return agentKeys.length;
}
