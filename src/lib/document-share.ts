import { createHmac, timingSafeEqual } from 'node:crypto';

const DEFAULT_SHARE_TTL_HOURS = 72;

function getShareSecret() {
  return process.env.DOCUMENT_SHARE_SECRET || process.env.NEXTAUTH_SECRET || null;
}

function sign(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createDocumentShareToken(docType: string, docId: string, ttlHours = DEFAULT_SHARE_TTL_HOURS) {
  const secret = getShareSecret();
  if (!secret) return null;

  const payload = Buffer.from(
    JSON.stringify({
      docType,
      docId,
      exp: Date.now() + ttlHours * 60 * 60 * 1000,
    })
  ).toString('base64url');

  return `${payload}.${sign(payload, secret)}`;
}

export function verifyDocumentShareToken(token: string | null, expectedType: string, expectedId: string) {
  const secret = getShareSecret();
  if (!secret || !token) return false;

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;

  const expectedSignature = sign(payload, secret);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return false;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      docType?: string;
      docId?: string;
      exp?: number;
    };

    return (
      parsed.docType === expectedType &&
      parsed.docId === expectedId &&
      typeof parsed.exp === 'number' &&
      parsed.exp > Date.now()
    );
  } catch {
    return false;
  }
}

export function buildDocumentShareUrl(appUrl: string | undefined, docType: string, docId: string) {
  if (!appUrl) return null;

  const token = createDocumentShareToken(docType, docId);
  if (!token) return null;

  const cleanBaseUrl = appUrl.replace(/\/$/, '');
  return `${cleanBaseUrl}/api/documents/${docType}/${docId}?share=${encodeURIComponent(token)}`;
}
