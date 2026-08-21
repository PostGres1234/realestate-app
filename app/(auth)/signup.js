import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { C } from '../../lib/theme';

const MIN_AGE = 18;

const T = {
  title: 'יצירת חשבון',
  subtitle: 'חשבון פותח גישה מלאה: כל פרטי הנכסים, יצירת קשר עם מוכרים ופרסום נכסים.',
  benefit1: 'צפייה בכל פרטי הנכסים',
  benefit2: 'יצירת קשר והתכתבות עם מוכרים',
  benefit3: 'פרסום נכסים למכירה או השכרה',
  nameLabel: 'שם מלא',
  namePlaceholder: 'שם פרטי ושם משפחה',
  nameHint: 'השם שיוצג למוכרים ולקונים',
  dobLabel: 'תאריך לידה',
  dobHint: 'ההרשמה מיועדת לבני 18 ומעלה',
  day: 'יום',
  month: 'חודש',
  year: 'שנה',
  occLabel: 'עיסוק',
  occOptional: 'אופציונלי',
  occPlaceholder: 'לדוגמה: מהנדס תוכנה',
  occHint: 'אם תשאירו ריק, השדה לא יוצג לאחרים',
  emailLabel: 'אימייל',
  emailPlaceholder: 'name@gmail.com',
  passLabel: 'סיסמה',
  passPlaceholder: 'לפחות 6 תווים',
  submit: 'הרשמה והצטרפות',
  busy: 'יוצר חשבון...',
  toLogin: 'כבר יש לכם חשבון? התחברות',
  back: 'המשך כאורח',
  checkTitle: 'בדקו את הפרטים',
  needName: 'יש למלא שם מלא.',
  needEmail: 'יש למלא כתובת אימייל תקינה.',
  needPass: 'הסיסמה חייבת להכיל לפחות 6 תווים.',
  needDob: 'יש למלא יום, חודש ושנה.',
  badDay: 'היום שהוזן אינו תקין.',
  badMonth: 'החודש שהוזן אינו תקין.',
  badYear: 'השנה שהוזנה אינה תקינה.',
  badDate: 'התאריך אינו קיים בלוח השנה.',
  futureDate: 'תאריך הלידה לא יכול להיות בעתיד.',
  tooYoungTitle: 'הרשמה מגיל 18',
  tooYoungBody: 'ההרשמה לאפליקציה מיועדת לבני 18 ומעלה.',
  failTitle: 'ההרשמה נכשלה',
};

function validateDob(dayStr, monthStr, yearStr) {
  if (!dayStr.trim() || !monthStr.trim() || !yearStr.trim()) {
    return { error: T.needDob };
  }

  const d = parseInt(dayStr, 10);
  const m = parseInt(monthStr, 10);
  const y = parseInt(yearStr, 10);

  if (isNaN(d) || d < 1 || d > 31) return { error: T.badDay };
  if (isNaN(m) || m < 1 || m > 12) return { error: T.badMonth };

  const thisYear = new Date().getFullYear();
  if (isNaN(y) || y < 1900 || y > thisYear) return { error: T.badYear };

  const dob = new Date(y, m - 1, d);
  if (dob.getFullYear() !== y || dob.getMonth() !== m - 1 || dob.getDate() !== d) {
    return { error: T.badDate };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dob > today) return { error: T.futureDate };

  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age = age - 1;
  }

  const iso = y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  return { iso, age };
}

export default function SignUp() {
  const [fullName, setFullName] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [occupation, setOccupation] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSignUp() {
    if (!fullName.trim()) return Alert.alert(T.checkTitle, T.needName);

    const dobResult = validateDob(day, month, year);
    if (dobResult.error) return Alert.alert(T.checkTitle, dobResult.error);
    if (dobResult.age < MIN_AGE) return Alert.alert(T.tooYoungTitle, T.tooYoungBody);

    if (!email.trim() || !email.includes('@')) {
      return Alert.alert(T.checkTitle, T.needEmail);
    }
    if (password.length < 6) return Alert.alert(T.checkTitle, T.needPass);

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
      const { error: profErr } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: fullName.trim(),
        date_of_birth: dobResult.iso,
        occupation: occupation.trim() || null,
      });
      if (profErr) console.log('profile error', profErr.message);
    }

    setBusy(false);
    router.replace('/');
  }

  return (
    <ScrollView
      style={s.wrap}
      contentContainerStyle={{ padding: 24, paddingTop: 70, paddingBottom: 60 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.title}>{T.title}</Text>
      <Text style={s.subtitle}>{T.subtitle}</Text>

      <View style={s.benefits}>
        {[T.benefit1, T.benefit2, T.benefit3].map((b) => (
          <View key={b} style={s.benefitRow}>
            <Ionicons name="checkmark-circle" size={18} color={C.primary} />
            <Text style={s.benefitText}>{b}</Text>
          </View>
        ))}
      </View>

      <View style={s.field}>
        <Text style={s.label}>{T.nameLabel}</Text>
        <TextInput
          style={s.input}
          placeholder={T.namePlaceholder}
          placeholderTextColor="#A9B0BF"
          value={fullName}
          onChangeText={setFullName}
        />
        <Text style={s.hint}>{T.nameHint}</Text>
      </View>

      <View style={s.field}>
        <Text style={s.label}>{T.dobLabel}</Text>
        <View style={s.dobRow}>
          <TextInput style={[s.input, s.dobPart]} placeholder={T.day}
            placeholderTextColor="#A9B0BF" keyboardType="number-pad" maxLength={2}
            value={day} onChangeText={setDay} />
          <TextInput style={[s.input, s.dobPart]} placeholder={T.month}
            placeholderTextColor="#A9B0BF" keyboardType="number-pad" maxLength={2}
            value={month} onChangeText={setMonth} />
          <TextInput style={[s.input, s.dobYear]} placeholder={T.year}
            placeholderTextColor="#A9B0BF" keyboardType="number-pad" maxLength={4}
            value={year} onChangeText={setYear} />
        </View>
        <View style={s.hintRow}>
          <Ionicons name="information-circle-outline" size={14} color={C.textMuted} />
          <Text style={s.hint}>{T.dobHint}</Text>
        </View>
      </View>

      <View style={s.field}>
        <View style={s.labelRow}>
          <Text style={s.label}>{T.occLabel}</Text>
          <View style={s.optTag}>
            <Text style={s.optText}>{T.occOptional}</Text>
          </View>
        </View>
        <TextInput
          style={s.input}
          placeholder={T.occPlaceholder}
          placeholderTextColor="#A9B0BF"
          value={occupation}
          onChangeText={setOccupation}
        />
        <Text style={s.hint}>{T.occHint}</Text>
      </View>

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

      <Pressable style={[s.btn, busy && { opacity: 0.5 }]} onPress={handleSignUp} disabled={busy}>
        <Text style={s.btnText}>{busy ? T.busy : T.submit}</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/(auth)/login')}>
        <Text style={s.link}>{T.toLogin}</Text>
      </Pressable>
      <Pressable onPress={() => router.replace('/')}>
        <Text style={s.linkMuted}>{T.back}</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.page },
  title: { fontSize: 28, fontWeight: '700', color: C.text, textAlign: 'right' },
  subtitle: { fontSize: 13, color: C.textMuted, textAlign: 'right', marginTop: 6, lineHeight: 20 },
  benefits: { backgroundColor: C.surface, borderRadius: 14, padding: 14, gap: 9, marginTop: 16, marginBottom: 24 },
  benefitRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  benefitText: { fontSize: 13, color: C.textSecondary, flex: 1, textAlign: 'right' },
  field: { marginBottom: 18 },
  labelRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 6 },
  label: { fontSize: 14, fontWeight: '600', textAlign: 'right', color: C.text },
  optTag: { backgroundColor: C.surface, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  optText: { fontSize: 11, color: C.textMuted },
  hint: { fontSize: 12, color: C.textMuted, marginTop: 6, textAlign: 'right' },
  hintRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  input: { borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 14, padding: 14, fontSize: 15, textAlign: 'right', color: C.text },
  passWrap: { flexDirection: 'row-reverse', alignItems: 'center', borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 14 },
  passInput: { flex: 1, padding: 14, fontSize: 15, textAlign: 'right', color: C.text },
  eye: { paddingHorizontal: 14, paddingVertical: 14 },
  dobRow: { flexDirection: 'row-reverse', gap: 10 },
  dobPart: { flex: 1, textAlign: 'center' },
  dobYear: { flex: 1.6, textAlign: 'center' },
  btn: { backgroundColor: C.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { textAlign: 'center', color: C.primary, marginTop: 16, fontSize: 14 },
  linkMuted: { textAlign: 'center', color: C.textMuted, marginTop: 14, fontSize: 13 },
});