/**
 * Weather Alert Email Service
 * Sends real email alerts to registered users when weather changes.
 * Uses the same EmailJS account — just needs a second template for weather alerts.
 *
 * Create a new template in EmailJS dashboard with these variables:
 *   {{to_name}}       — user's name
 *   {{to_email}}      — user's email  (set this as "To Email" in template settings)
 *   {{city}}          — city name
 *   {{alert_type}}    — e.g. "Wind Change Alert"
 *   {{alert_message}} — main message
 *   {{wind_speed}}    — current wind speed
 *   {{temperature}}   — current temperature
 *   {{timestamp}}     — time of alert
 *
 * Add VITE_EMAILJS_ALERT_TEMPLATE_ID=your_template_id to .env
 * If not set, falls back to the OTP template (works but layout is for OTP).
 */

import emailjs from '@emailjs/browser';

const serviceId  = () => import.meta.env.VITE_EMAILJS_SERVICE_ID  || '';
const publicKey  = () => import.meta.env.VITE_EMAILJS_PUBLIC_KEY  || '';
const templateId = () =>
  import.meta.env.VITE_EMAILJS_ALERT_TEMPLATE_ID ||
  import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';

// Rate-limit: don't send more than 1 email per city per 30 minutes
const _lastSent: Record<string, number> = {};
const RATE_LIMIT = 30 * 60 * 1000;

export async function sendWeatherAlertEmail(params: {
  userEmail: string;
  userName:  string;
  city:      string;
  alertType: string;
  message:   string;
  detail:    string;
  windSpeed: number;
  temperature: number;
}): Promise<void> {
  if (!serviceId() || !publicKey() || !templateId()) return;
  if (!params.userEmail) return;

  // Rate limit per city
  const key = `${params.userEmail}:${params.city}`;
  if (_lastSent[key] && Date.now() - _lastSent[key] < RATE_LIMIT) return;
  _lastSent[key] = Date.now();

  emailjs.init({ publicKey: publicKey() });

  try {
    await emailjs.send(serviceId(), templateId(), {
      // Cover all possible "To Email" variable names in the template
      to_email:      params.userEmail,
      email:         params.userEmail,
      user_email:    params.userEmail,
      to_name:       params.userName,
      name:          params.userName,

      // Weather alert content
      city:          params.city,
      alert_type:    params.alertType,
      alert_message: params.message,
      detail:        params.detail,
      wind_speed:    `${params.windSpeed} m/s`,
      temperature:   `${params.temperature}°C`,
      timestamp:     new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),

      // Reuse otp_code field so it also works with the OTP template layout
      otp_code:      params.message,
      message:       `${params.alertType} — ${params.city}\n\n${params.message}\n${params.detail}\n\nWind: ${params.windSpeed} m/s | Temp: ${params.temperature}°C\nTime: ${new Date().toLocaleString()}`,
      subject:       `⚡ WindCast Alert: ${params.alertType} in ${params.city}`,
      expiry:        new Date().toLocaleString(),
    });
  } catch (e) {
    console.warn('[Weather Email Alert]', e);
  }
}
