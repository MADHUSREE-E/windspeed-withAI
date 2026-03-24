/**
 * OTP Service
 * Email: @emailjs/browser SDK (handles CORS correctly)
 * SMS:   Fast2SMS → TextBelt → demo fallback
 */

import emailjs from '@emailjs/browser';

const OTP_TTL = 10 * 60 * 1000; // 10 minutes

interface OTPRecord { code: string; expiresAt: number; }

function _store(key: string, code: string) {
  sessionStorage.setItem(key, JSON.stringify({ code, expiresAt: Date.now() + OTP_TTL }));
}

function _verify(key: string, input: string): boolean {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return false;
    const rec: OTPRecord = JSON.parse(raw);
    if (Date.now() > rec.expiresAt) { sessionStorage.removeItem(key); return false; }
    if (rec.code === input.trim()) { sessionStorage.removeItem(key); return true; }
    return false;
  } catch { return false; }
}

export const verifyEmailOTP = (input: string) => _verify('wc_otp_email', input);
export const verifyPhoneOTP  = (input: string) => _verify('wc_otp_phone', input);

interface OTPResult {
  sent: boolean;
  demo: boolean;
  demoCode?: string;
  error?: string;
}

// ─── Email OTP via @emailjs/browser SDK ──────────────────────────────────────
export async function sendEmailOTP(email: string, name: string): Promise<OTPResult> {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  _store('wc_otp_email', code);

  const serviceId  = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  if (serviceId && templateId && publicKey) {
    try {
      // Initialize EmailJS with publicKey so "To Email" override works
      emailjs.init({ publicKey });

      const response = await emailjs.send(
        serviceId,
        templateId,
        {
          // Cover every common variable name used in EmailJS templates
          to_email:   email,
          email:      email,
          user_email: email,
          reply_to:   email,
          to_name:    name,
          name:       name,
          user_name:  name,
          otp_code:   code,
          otp:        code,
          message:    `Your WindCast Pro verification code is: ${code}. Valid for 10 minutes.`,
          app_name:   'WindCast Pro',
          expiry:     '10 minutes',
        }
      );
      if (response.status === 200) {
        return { sent: true, demo: false };
      }
      return { sent: false, demo: false, error: `EmailJS: ${response.text}` };
    } catch (err: any) {
      const msg: string = err?.text || err?.message || String(err);
      console.error('[EmailJS error]', msg);
      // Return demo code so registration can still proceed during template setup
      return { sent: true, demo: true, demoCode: code, error: msg };
    }
  }

  // Keys not configured → demo
  return { sent: true, demo: true, demoCode: code };
}

// ─── SMS OTP — Fast2SMS → TextBelt → demo ────────────────────────────────────
export async function sendPhoneOTP(phone: string): Promise<OTPResult> {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  _store('wc_otp_phone', code);

  // 10-digit Indian number (strip country code, spaces, dashes)
  const digitsOnly  = phone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
  const fast2smsKey = (import.meta.env.VITE_FAST2SMS_KEY || '').trim();

  console.log('[OTP] key present:', !!fast2smsKey, '| digits:', digitsOnly);

  // ── Fast2SMS via GET (avoids CORS preflight) ──────────────────────────────
  if (fast2smsKey && digitsOnly.length === 10) {
    // Try OTP route first
    try {
      const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(fast2smsKey)}&route=otp&variables_values=${code}&numbers=${digitsOnly}&flash=0`;
      const res  = await fetch(url);
      const data = await res.json();
      console.log('[Fast2SMS OTP route]', data);
      if (data.return === true) return { sent: true, demo: false };
    } catch (e: any) {
      console.warn('[Fast2SMS OTP route error]', e.message);
    }

    // Try Quick SMS route as fallback
    try {
      const msg  = encodeURIComponent(`Your WindCast Pro OTP is ${code}. Valid 10 minutes.`);
      const url  = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(fast2smsKey)}&route=q&message=${msg}&numbers=${digitsOnly}&flash=0`;
      const res  = await fetch(url);
      const data = await res.json();
      console.log('[Fast2SMS Q route]', data);
      if (data.return === true) return { sent: true, demo: false };
      // Return specific error so UI can show it
      return { sent: true, demo: true, demoCode: code, error: `Fast2SMS: ${data.message}` };
    } catch (e: any) {
      console.warn('[Fast2SMS Q route error]', e.message);
    }
  }

  // ── TextBelt fallback ─────────────────────────────────────────────────────
  const textbeltKey = (import.meta.env.VITE_TEXTBELT_KEY || 'textbelt').trim();
  try {
    const body = new URLSearchParams({
      phone:   phone.replace(/[^\d+]/g, ''),
      message: `Your WindCast Pro code: ${code}. Valid 10 min.`,
      key:     textbeltKey,
    });
    const res  = await fetch('https://textbelt.com/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    });
    const data = await res.json();
    console.log('[TextBelt]', data);
    if (data.success) return { sent: true, demo: false };
  } catch (e: any) {
    console.warn('[TextBelt error]', e.message);
  }

  // ── Demo fallback ─────────────────────────────────────────────────────────
  return { sent: true, demo: true, demoCode: code };
}
