/**
 * Firebase Phone Auth — sends real SMS OTPs to any phone number including India.
 * Google handles DLT compliance automatically. Free: 10,000 verifications/month.
 *
 * Setup (5 minutes):
 * 1. Go to https://console.firebase.google.com → New project (free)
 * 2. Build → Authentication → Get started → Sign-in method → Phone → Enable
 * 3. Project Settings (gear icon) → Your apps → Add web app → copy config
 * 4. Authentication → Settings → Authorized domains → add localhost and your domain
 * 5. Paste the config values into .env (see .env.example)
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  Auth,
} from 'firebase/auth';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let confirmationResult: ConfirmationResult | null = null;

function getFirebaseConfig() {
  return {
    apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  };
}

export function isFirebaseConfigured(): boolean {
  const cfg = getFirebaseConfig();
  return !!(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId);
}

function initFirebase() {
  if (!isFirebaseConfigured()) return false;
  if (!app) {
    app  = getApps().length ? getApps()[0] : initializeApp(getFirebaseConfig());
    auth = getAuth(app);
  }
  return true;
}

/** Renders an invisible reCAPTCHA on the given container element id */
function setupRecaptcha(containerId: string): RecaptchaVerifier | null {
  if (!auth) return null;
  try {
    // Clear any existing verifier
    const existing = (window as any)._windcastRecaptcha;
    if (existing) {
      try { existing.clear(); } catch (_) {}
    }
    const verifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {},
      'expired-callback': () => {},
    });
    (window as any)._windcastRecaptcha = verifier;
    return verifier;
  } catch (e) {
    console.error('[Firebase reCAPTCHA]', e);
    return null;
  }
}

/**
 * Send OTP to phone number via Firebase.
 * @param phone  Full phone number with country code, e.g. +919876543210
 * @param containerId  ID of a div in the DOM where reCAPTCHA can be mounted
 */
export async function sendFirebasePhoneOTP(
  phone: string,
  containerId: string
): Promise<{ sent: boolean; error?: string }> {
  if (!initFirebase() || !auth) {
    return { sent: false, error: 'Firebase not configured' };
  }

  // Ensure number has country code
  let formattedPhone = phone.replace(/[\s\-()]/g, '');
  if (!formattedPhone.startsWith('+')) {
    // Assume India if no country code
    formattedPhone = '+91' + formattedPhone.replace(/^0+/, '').slice(-10);
  }

  const recaptcha = setupRecaptcha(containerId);
  if (!recaptcha) return { sent: false, error: 'reCAPTCHA setup failed' };

  try {
    confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, recaptcha);
    return { sent: true };
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error('[Firebase Phone Auth]', msg);
    // Clean up failed recaptcha
    try { recaptcha.clear(); } catch (_) {}
    (window as any)._windcastRecaptcha = null;
    return { sent: false, error: msg };
  }
}

/** Verify the OTP code entered by the user */
export async function confirmFirebaseOTP(
  otp: string
): Promise<{ verified: boolean; error?: string }> {
  if (!confirmationResult) {
    return { verified: false, error: 'No pending verification. Please resend the code.' };
  }
  try {
    await confirmationResult.confirm(otp);
    confirmationResult = null;
    return { verified: true };
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error('[Firebase OTP confirm]', msg);
    return { verified: false, error: 'Invalid or expired code. Please try again.' };
  }
}
