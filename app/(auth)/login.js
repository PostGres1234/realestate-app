import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { C } from '../../lib/theme';

const T = {
  title: 'ברוכים השבים',
  subtitle: 'התחברו לחשבון שלכם',
  emailLabel: 'אימייל',
  emailPlaceholder: 'name@gmail.com',
  passLabel: 'סיסמה',
  passPlaceholder: 'לפחות 6 תווים',
  submit: 'התחברות',
  busy: 'מתחבר...',
  toSignup: 'אין לכם חשבון? הרשמה',
  back: 'המשך כאורח',
  failTitle: 'ההתחברות נכשלה',
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleLogin() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) return Alert.alert(T.failTitle, error.message);
    router.replace('/payment');
  }

  return (
    <View style={s.wrap}>
      <Text style={s.title}>{T.title}</Text>
      <Text style={s.subtitle}>{T.subtitle}</Text>

      <View style={s.field}>
        <Text style={s.label}>{T.emailLabel}</Text>
        <TextInput
          style={s.input}
          placeholder={T.emailPlaceholder}
          placeholderTextColor="#A9B0BF"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <View style={s.field}>
        <Text style={s.label}>{T.passLabel}</Text>
        <View style={s.passWrap}>
          <TextInput
            style={s.passInput}
            placeholder={T.passPlaceholder}
            placeholderTextColor="#A9B0BF"
            secureTextEntry={!showPass}
            value={password}
            onChangeText={setPassword}
          />
          <Pressable style={s.eye} onPress={() => setShowPass((v) => !v)}>
            <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'}
              size={21} color={C.textMuted} />
          </Pressable>
        </View>
      </View>

      <Pressable style={[s.btn, busy && { opacity: 0.5 }]} onPress={handleLogin} disabled={busy}>
        <Text style={s.btnText}>{busy ? T.busy : T.submit}</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/(auth)/signup')}>
        <Text style={s.link}>{T.toSignup}</Text>
      </Pressable>
      <Pressable onPress={() => router.replace('/')}>
        <Text style={s.linkMuted}>{T.back}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.page, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', color: C.text, textAlign: 'right' },
  subtitle: { fontSize: 13, color: C.textMuted, textAlign: 'right', marginTop: 6, marginBottom: 24 },
  field: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, textAlign: 'right', color: C.text },
  input: { borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 14, padding: 14, fontSize: 15, textAlign: 'right', color: C.text },
  passWrap: { flexDirection: 'row-reverse', alignItems: 'center', borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 14 },
  passInput: { flex: 1, padding: 14, fontSize: 15, textAlign: 'right', color: C.text },
  eye: { paddingHorizontal: 14, paddingVertical: 14 },
  btn: { backgroundColor: C.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { textAlign: 'center', color: C.primary, marginTop: 16, fontSize: 14 },
  linkMuted: { textAlign: 'center', color: C.textMuted, marginTop: 14, fontSize: 13 },
});