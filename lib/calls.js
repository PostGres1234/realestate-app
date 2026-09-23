// TODO before launch: replace direct dial with virtual numbers.
// Only the seller can call. They see the buyer's real number.
// Swap point is request_call() in SQL — this file just reads row.number.

import { Linking } from 'react-native';
import { supabase } from './supabase';
import { logSupabase, log } from './logger';

const ERRORS = {
  sellers_only: 'רק בעל הנכס יכול ליזום שיחה.',
  not_unlocked: 'ניתן להתקשר רק לאחר שהתקבלה פנייה.',
  calls_disabled: 'המשתמש בחר לא לקבל שיחות.',
  no_phone: 'למשתמש אין מספר טלפון בפרופיל.',
  conversation_not_found: 'השיחה לא נמצאה.',
};

export async function placeCall(conversationId) {
  const { data, error } = await supabase.rpc('request_call', {
    conv_id: conversationId,
  });

  if (error) {
    logSupabase('call.request', error, { conversationId });
    const key = Object.keys(ERRORS).find((k) => error.message.includes(k));
    return { ok: false, message: ERRORS[key] ?? 'לא ניתן ליצור שיחה כרגע.' };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.number) {
    log.error('call.request', 'no number returned', { conversationId });
    return { ok: false, message: 'לא ניתן ליצור שיחה כרגע.' };
  }

  const url = 'tel:' + row.number.replace(/[^\d+]/g, '');
  const can = await Linking.canOpenURL(url);
  if (!can) {
    log.warn('call.dial', 'device cannot open tel url');
    return { ok: false, message: 'המכשיר לא תומך בשיחות.' };
  }

  await Linking.openURL(url);
  return { ok: true, sessionId: row.session_id, number: row.number };
}
