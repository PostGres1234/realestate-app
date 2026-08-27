import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { sendCode, verifyCode, CHANNEL_LABEL } from '../../lib/otp';
import { C } from '../../lib/theme';

const T = {
  title: 'אימות כניסה',
  subtitlePre: 'שלחנו קוד בן 6 ספרות ב',
  codeLabel: 'קוד אימות',
  submit: 'אישור',
  busy: 'בודק...',
  resend: 'שליחת קוד חדש',
  resendIn: 'ניתן לשלוח שוב בעוד',
  seconds: 'שניות',
  back: 'חזרה להתחברות',
  sent: 'קוד חדש נשלח',
  needCode: 'יש להזין קוד בן 6 ספרות.',
  failTitle: 'האימות נכשל',
};

export default function Verify() {
  const { identifier } = useLocalSearchParams();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [countdown, setCountdown] = useState(45);
  const inputRef = useRef(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(t);
  }, []);

  async function submit(value) {
    const c = (value ?? code).trim();
    if (c.length !== 6) return Alert.alert(T.failTitle, T.needCode);

    setBusy(true);
    const res = await verifyCode(identifier, c);
    setBusy(false);

    if (!res.ok) {
      setCode('');
      return Alert.alert(T.failTitle, res.message);
    }
    router.replace('/');
  }

  async function resend() {
    const res = await sendCode(identifier);
    if (!res.ok) return Alert.alert(T.failTitle, res.message);
    setCountdown(45);
    Alert.alert(T.sent, '');
  }

  function onChange(v) {
    const digits = v.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (digits.length === 6) submit(digits);
  }

  const boxes = [0, 1, 2, 3, 4, 5];

  return (
    <View style={s.wrap}>
      <View style={s.icon}>
        <Ionicons name="shield-checkmark-outline" size={28} color={C.primary} />
      </View>

      <Text style={s.title}>{T.title}</Text>
      <Text style={s.subtitle}>
        {T.subtitlePre + CHANNEL_LABEL}
      </Text>
      <Text style={s.identifier}>{identifier}</Text>

      <Pressable style={s.boxRow} onPress={() => inputRef.current?.focus()}>
        {boxes.map((i) => (
          <View key={i} style={[s.box, code.length === i && s.boxActive]}>
            <Text style={s.boxText}>{code[i] ?? ''}</Text>
          </View>
        ))}
      </Pressable>

      <TextInput
        ref={inputRef}
        style={s.hidden}
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={onChange}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
      />

      <Pressable
        style={[s.btn, (busy || code.length !== 6) && { opacity: 0.5 }]}
        onPress={() => submit()}
        disabled={busy || code.length !== 6}
      >
        <Text style={s.btnText}>{busy ? T.busy : T.submit}</Text>
      </Pressable>

      {countdown > 0 ? (
        <Text style={s.timer}>
          {T.resendIn + ' ' + countdown + ' ' + T.seconds}
        </Text>
      ) : (
        <Pressable onPress={resend}>
          <Text style={s.link}>{T.resend}</Text>
        </Pressable>
      )}

      <Pressable onPress={() => router.replace('/(auth)/login')}>
        <Text style={s.linkMuted}>{T.back}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.page, justifyContent: 'center', padding: 24 },
  icon: { width: 62, height: 62, borderRadius: 31, backgroundColor: C.primaryTint, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 18 },
  title: { fontSize: 26, fontWeight: '700', color: C.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: C.textMuted, textAlign: 'center', marginTop: 8 },
  identifier: { fontSize: 15, color: C.text, fontWeight: '600', textAlign: 'center', marginTop: 4 },
  boxRow: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 9, marginTop: 28 },
  box: { width: 46, height: 56, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  boxActive: { borderColor: C.primary, backgroundColor: C.page },
  boxText: { fontSize: 22, fontWeight: '700', color: C.text },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  btn: { backgroundColor: C.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 28 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  timer: { textAlign: 'center', color: C.textMuted, fontSize: 13, marginTop: 20 },
  link: { textAlign: 'center', color: C.primary, fontWeight: '600', fontSize: 14, marginTop: 20 },
  linkMuted: { textAlign: 'center', color: C.textMuted, fontSize: 13, marginTop: 18 },
});