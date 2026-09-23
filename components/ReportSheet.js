import { useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { logSupabase } from '../lib/logger';
import { api } from '../lib/api';
import { C } from '../lib/theme';

const T = {
  title: 'דיווח',
  hint: 'הדיווח נשלח לצוות האפליקציה ונבדק. הפרטים שלכם לא יוצגו למשתמש המדווח.',
  reasonLabel: 'סיבת הדיווח',
  detailsLabel: 'פרטים נוספים (אופציונלי)',
  detailsPlaceholder: 'ספרו לנו מה קרה...',
  block: 'חסימת המשתמש',
  blockHint: 'לא תוכלו לראות זה את זה או להתכתב',
  submit: 'שליחת דיווח',
  busy: 'שולח...',
  cancel: 'ביטול',
  needReason: 'יש לבחור סיבה',
  doneTitle: 'הדיווח נשלח',
  doneBody: 'תודה, נבדוק את הפנייה.',
  doneBlocked: 'הדיווח נשלח והמשתמש נחסם.',
  failTitle: 'הדיווח נכשל',
};

const REASONS = [
  { key: 'fake', label: 'מודעה מזויפת או מטעה' },
  { key: 'agent', label: 'מתחזה לבעל נכס פרטי' },
  { key: 'spam', label: 'ספאם או פרסום' },
  { key: 'offensive', label: 'תוכן פוגעני' },
  { key: 'scam', label: 'ניסיון הונאה' },
  { key: 'other', label: 'אחר' },
];

export default function ReportSheet({ visible, onClose, targetUser, targetProperty, onBlocked }) {
  const [reason, setReason] = useState(null);
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!reason) return Alert.alert(T.failTitle, T.needReason);
    setBusy(true);

    let result;
    try {
      result = await api.post('/api/reports', {
        targetUser: targetUser ?? null,
        targetProperty: targetProperty ?? null,
        reason,
        details: details.trim() || null,
        alsoBlock,
      });
    } catch (err) {
      setBusy(false);
      logSupabase('report.create', { message: err.message });
      return Alert.alert(T.failTitle, err.message);
    }

    setBusy(false);
    setReason(null);
    setDetails('');
    setAlsoBlock(false);
    onClose();

    Alert.alert(T.doneTitle, result.blocked ? T.doneBlocked : T.doneBody);
    if (result.blocked && onBlocked) onBlocked();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.header}>
            <Text style={s.title}>{T.title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={C.textMuted} />
            </Pressable>
          </View>

          <Text style={s.hint}>{T.hint}</Text>

          <Text style={s.label}>{T.reasonLabel}</Text>
          <View style={s.reasons}>
            {REASONS.map((r) => {
              const on = reason === r.key;
              return (
                <Pressable
                  key={r.key}
                  style={[s.reason, on && s.reasonOn]}
                  onPress={() => setReason(r.key)}
                >
                  <Ionicons
                    name={on ? 'radio-button-on' : 'radio-button-off'}
                    size={19}
                    color={on ? C.danger : C.textMuted}
                  />
                  <Text style={[s.reasonText, on && s.reasonTextOn]}>{r.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={s.label}>{T.detailsLabel}</Text>
          <TextInput
            style={s.input}
            placeholder={T.detailsPlaceholder}
            placeholderTextColor="#A9B0BF"
            multiline
            value={details}
            onChangeText={setDetails}
          />

          {targetUser ? (
            <Pressable style={s.blockRow} onPress={() => setAlsoBlock((v) => !v)}>
              <Ionicons
                name={alsoBlock ? 'checkbox' : 'square-outline'}
                size={22}
                color={alsoBlock ? C.danger : C.textMuted}
              />
              <View style={{ flex: 1 }}>
                <Text style={s.blockLabel}>{T.block}</Text>
                <Text style={s.blockHint}>{T.blockHint}</Text>
              </View>
            </Pressable>
          ) : null}

          <Pressable
            style={[s.btn, busy && { opacity: 0.5 }]}
            onPress={submit}
            disabled={busy}
          >
            <Text style={s.btnText}>{busy ? T.busy : T.submit}</Text>
          </Pressable>

          <Pressable onPress={onClose} style={{ marginTop: 10 }}>
            <Text style={s.cancelText}>{T.cancel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.page, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: C.text },
  hint: { fontSize: 12, color: C.textMuted, textAlign: 'right', marginTop: 6, marginBottom: 16, lineHeight: 18 },
  label: { fontSize: 14, fontWeight: '600', color: C.text, textAlign: 'right', marginBottom: 8, marginTop: 6 },
  reasons: { gap: 6, marginBottom: 8 },
  reason: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9, paddingVertical: 9, paddingHorizontal: 11, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  reasonOn: { borderColor: C.danger, backgroundColor: '#FEF2F2' },
  reasonText: { fontSize: 14, color: C.textSecondary, flex: 1, textAlign: 'right' },
  reasonTextOn: { color: C.text, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 12, padding: 12, fontSize: 15, textAlign: 'right', color: C.text, minHeight: 80, textAlignVertical: 'top' },
  blockRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: C.surface },
  blockLabel: { fontSize: 14, fontWeight: '600', color: C.text, textAlign: 'right' },
  blockHint: { fontSize: 11, color: C.textMuted, textAlign: 'right', marginTop: 2 },
  btn: { backgroundColor: C.danger, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 18 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  cancelText: { color: C.textMuted, textAlign: 'center', fontSize: 14 },
});