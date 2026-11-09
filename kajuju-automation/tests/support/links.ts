/**
 * Link structure checks that never put a phone number into a failure message or a log.
 */

export interface WhatsAppLink {
  /** Human readable problems. Never contains the number or the href. */
  problems: string[];
  /** Digits of the number, for comparing links with each other. Do not print it. */
  digits: string;
  /** The decoded message, or '' when missing. */
  message: string;
}

/** Validates https://wa.me/<digits>?text=<percent-encoded message>. */
export function checkWhatsAppLink(href: string): WhatsAppLink {
  const problems: string[] = [];
  let url: URL | undefined;
  try {
    url = new URL(href);
  } catch {
    return { problems: ['not a valid URL'], digits: '', message: '' };
  }
  if (url.protocol !== 'https:') problems.push('scheme is not https');
  if (url.hostname !== 'wa.me') problems.push('host is not wa.me');
  const digits = url.pathname.replace(/^\//, '');
  if (!/^\d{10,15}$/.test(digits)) problems.push('number is not 10 to 15 digits without + or spaces');
  const rawText = /[?&]text=([^&]*)/.exec(url.search)?.[1] ?? '';
  let message = '';
  if (!rawText) problems.push('no text parameter');
  else {
    if (/\s/.test(rawText)) problems.push('message has unencoded whitespace');
    try {
      message = decodeURIComponent(rawText);
    } catch {
      problems.push('message is not valid percent-encoding');
    }
    if (rawText && !message.trim()) problems.push('message is empty');
  }
  return { problems, digits: /^\d+$/.test(digits) ? digits : '', message };
}

/** Digits of a tel: link, for comparing with a WhatsApp number. Do not print it. */
export function telDigits(href: string): string {
  return /^tel:\+?(\d+)$/.exec(href)?.[1] ?? '';
}
