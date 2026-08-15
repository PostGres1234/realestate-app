import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

const T = {
  title: 'ברוכים השבים',
  emailLabel: 'אימייל',
  emailHint: 'לדוגמה: name@gmail.com',
  passLabel: 'סיסמה',
  passHint: 'לפחות 6 תווים',
  submit: 'התחברות',
  busy: 'מתחבר...',
  toSignup: 'אין לכם חשבון? הרשמה',
  toHome: 'חזרה לנכסים',
  failTitle: 'ההתחברות נכשלה',
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleLogin() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) return Alert.alert(T.failTitle, error.message);
    router.replace('/');
  }

  return (
    <View style={s.wrap}>
      <Text style={s.title}>{T.title}</Text>

      <View style={s.field}>
        <Text style={s.label}>{T.emailLabel}</Text>
        <TextInput
          style={s.input}
          placeholder={T.emailLabel}
          placeholderTextColor="#aaa"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Text style={s.hint}>{T.emailHint}</Text>
      </View>

      <View style={s.field}>
        <Text style={s.label}>{T.passLabel}</Text>
        <TextInput
          style={s.input}
          placeholder={T.passLabel}
          placeholderTextColor="#aaa"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <Text style={s.hint}>{T.passHint}</Text>
      </View>

      <Pressable style={[s.btn, busy && { opacity: 0.5 }]} onPress={handleLogin} disabled={busy}>
        <Text style={s.btnText}>{busy ? T.busy : T.submit}</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/(auth)/signup')}>
        <Text style={s.link}>{T.toSignup}</Text>
      </Pressable>
      <Pressable onPress={() => router.replace('/')}>
        <Text style={s.link}>{T.toHome}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 24, textAlign: 'right' },
  field: { marginBottom: 18 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 6, textAlign: 'right', color: '#333' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 14, fontSize: 16, textAlign: 'right', backgroundColor: '#fff' },
  hint: { fontSize: 12, color: '#999', marginTop: 4, textAlign: 'right' },
  btn: { backgroundColor: '#1f6feb', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { textAlign: 'center', color: '#1f6feb', marginTop: 16 },
});