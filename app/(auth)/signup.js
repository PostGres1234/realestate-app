import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

const T = {
  title: 'יצירת חשבון',
  nameLabel: 'שם מלא',
  nameHint: 'השם שיוצג למוכרים ולקונים',
  emailLabel: 'אימייל',
  emailHint: 'לדוגמה: name@gmail.com',
  passLabel: 'סיסמה',
  passHint: 'לפחות 6 תווים',
  submit: 'הרשמה',
  busy: 'יוצר חשבון...',
  toLogin: 'כבר יש לכם חשבון? התחברות',
  checkTitle: 'בדקו את הפרטים',
  checkBody: 'יש למלא שם מלא ואימייל, והסיסמה חייבת להכיל לפחות 6 תווים.',
  failTitle: 'ההרשמה נכשלה',
};

export default function SignUp() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSignUp() {
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      return Alert.alert(T.checkTitle, T.checkBody);
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    if (error) {
      setBusy(false);
      return Alert.alert(T.failTitle, error.message);
    }
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: fullName.trim(),
      });
    }
    setBusy(false);
    router.replace('/');
  }

  return (
    <View style={s.wrap}>
      <Text style={s.title}>{T.title}</Text>

      <View style={s.field}>
        <Text style={s.label}>{T.nameLabel}</Text>
        <TextInput
          style={s.input}
          placeholder={T.nameLabel}
          placeholderTextColor="#aaa"
          value={fullName}
          onChangeText={setFullName}
        />
        <Text style={s.hint}>{T.nameHint}</Text>
      </View>

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

      <Pressable style={[s.btn, busy && { opacity: 0.5 }]} onPress={handleSignUp} disabled={busy}>
        <Text style={s.btnText}>{busy ? T.busy : T.submit}</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/(auth)/login')}>
        <Text style={s.link}>{T.toLogin}</Text>
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