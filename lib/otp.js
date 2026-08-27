// Verification channel. Switch to 'sms' when the Twilio account is approved.
// Requires: Supabase Dashboard > Authentication > Providers > Phone > enable
// and connect Twilio credentials. Nothing else in the app changes.
export const CHANNEL = 'email';

import { supabase } from './supabase';

const ERRORS = {
  'Invalid login credentials': 'הקוד שהוזן שגוי.',
  'Token has expired': 'תוקף הקוד פג. בקשו קוד חדש.',
  'For security purposes': 'יותר מדי בקשות. נסו שוב בעוד דקה.',
  'Signups not allowed': 'לא נמצא חשבון עם הפרטים האלה.',
};

function translate(msg) {
  const key = Object.keys(ERRORS).find((k) => msg.includes(k));
  return ERRORS[key] ?? 'אירעה שגיאה. נסו שוב.';
}

export async function sendCode(identifier) {
  const payload = CHANNEL === 'sms'
    ? { phone: normalizePhone(identifier) }
    : { email: identifier.trim() };

  const { error } = await supabase.auth.signInWithOtp({
    ...payload,
    options: { shouldCreateUser: false },
  });

  if (error) return { ok: false, message: translate(error.message) };
  return { ok: true };
}

export async function verifyCode(identifier, code) {
  const payload = CHANNEL === 'sms'
    ? { phone: normalizePhone(identifier), type: 'sms' }
    : { email: identifier.trim(), type: 'email' };

  const { data, error } = await supabase.auth.verifyOtp({
    ...payload,
    token: code.trim(),
  });

  if (error) return { ok: false, message: translate(error.message) };
  return { ok: true, session: data.session };
}

export function normalizePhone(raw) {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (digits.startsWith('972')) return '+' + digits;
  if (digits.startsWith('0')) return '+972' + digits.slice(1);
  return '+972' + digits;
}

export const CHANNEL_LABEL = CHANNEL === 'sms' ? 'הודעת SMS' : 'אימייל';