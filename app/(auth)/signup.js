import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { logSupabase } from '../../lib/logger';
import { C } from '../../lib/theme';

const MIN_AGE = 18;

const MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => CURRENT_YEAR - i);

const T = {
  title: 'יצירת חשבון',
  subtitle: 'חשבון פותח גישה מלאה: כל פרטי הנכסים, יצירת קשר עם בעלי נכסים ופרסום נכסים.',
  benefit1: 'צפייה בכל פרטי הנכסים',
  benefit2: 'התכתבות עם בעלי נכסים',
  benefit3: 'פרסום נכסים למכירה או השכרה',
  nameLabel: 'שם מלא',
  namePlaceholder: 'שם פרטי ושם משפחה',
  nameHint: 'השם שיוצג בפניות שתשלחו',
  phoneLabel: 'טלפון',
  phonePlaceholder: '050-0000000',
  phoneHint: 'יוצג לבעלי נכסים שאליהם תפנו, כדי שיוכלו לחזור אליכם.',
  dobLabel: 'תאריך לידה',
  dobPlaceholder: 'בחרו תאריך לידה',
  dobHint: 'ההרשמה מיועדת לבני 18 ומעלה',
  day: 'יום',
  month: 'חודש',
  year: 'שנה',
  dobDone: 'אישור',
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
  needPhone: 'יש למלא מספר טלפון תקין.',
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
  const [phone, setPhone] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [dobModalOpen, setDobModalOpen] = useState(false);
  const [pendingDay, setPendingDay] = useState('');
  const [pendingMonth, setPendingMonth] = useState('');
  const [pendingYear, setPendingYear] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSignUp() {
    if (!fullName.trim()) return Alert.alert(T.checkTitle, T.needName);

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 9) return Alert.alert(T.checkTitle, T.needPhone);

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
      logSupabase('auth.signup', error);
      return Alert.alert(T.failTitle, error.message);
    }

    if (data.user) {
      const { error: profErr } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: fullName.trim(),
        phone: phone.trim(),
        date_of_birth: dobResult.iso,
      });
      if (profErr) logSupabase('auth.profile', profErr);
    }

    setBusy(false);
    router.replace('/payment');
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
        <TextInput style={s.input} placeholder={T.namePlaceholder}
          placeholderTextColor="#A9B0BF" value={fullName} onChangeText={setFullName} />
        <Text style={s.hint}>{T.nameHint}</Text>
      </View>

      <View style={s.field}>
        <Text style={s.label}>{T.phoneLabel}</Text>
        <TextInput style={s.input} placeholder={T.phonePlaceholder}
          placeholderTextColor="#A9B0BF" keyboardType="phone-pad"
          value={phone} onChangeText={setPhone} />
        <Text style={s.hint}>{T.phoneHint}</Text>
      </View>

      <View style={s.field}>
        <Text style={s.label}>{T.dobLabel}</Text>
        <Pressable
          style={s.input}
          onPress={() => {
            setPendingDay(day);
            setPendingMonth(month);
            setPendingYear(year);
            setDobModalOpen(true);
          }}
        >
          <Text style={day && month && year ? s.dobValue : s.dobPlaceholder}>
            {day && month && year
              ? `${day} ${MONTHS[Number(month) - 1] ?? month} ${year}`
              : T.dobPlaceholder}
          </Text>
        </Pressable>
        <View style={s.hintRow}>
          <Ionicons name="information-circle-outline" size={14} color={C.textMuted} />
          <Text style={s.hint}>{T.dobHint}</Text>
        </View>
      </View>

      <Modal visible={dobModalOpen} transparent animationType="slide"
        onRequestClose={() => setDobModalOpen(false)}>
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{T.dobLabel}</Text>

            <View style={s.pickerRow}>
              <View style={s.pickerCol}>
                <Text style={s.pickerColLabel}>{T.year}</Text>
                <ScrollView style={s.pickerScroll} showsVerticalScrollIndicator={false}>
                  {YEARS.map((y) => (
                    <Pressable key={y} style={s.pickerRowItem} onPress={() => setPendingYear(String(y))}>
                      <Text style={String(y) === pendingYear ? s.pickerItemOn : s.pickerItem}>{y}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={s.pickerCol}>
                <Text style={s.pickerColLabel}>{T.month}</Text>
                <ScrollView style={s.pickerScroll} showsVerticalScrollIndicator={false}>
                  {MONTHS.map((name, i) => (
                    <Pressable key={name} style={s.pickerRowItem} onPress={() => setPendingMonth(String(i + 1))}>
                      <Text style={String(i + 1) === pendingMonth ? s.pickerItemOn : s.pickerItem}>{name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={s.pickerCol}>
                <Text style={s.pickerColLabel}>{T.day}</Text>
                <ScrollView style={s.pickerScroll} showsVerticalScrollIndicator={false}>
                  {DAYS.map((d) => (
                    <Pressable key={d} style={s.pickerRowItem} onPress={() => setPendingDay(String(d))}>
                      <Text style={String(d) === pendingDay ? s.pickerItemOn : s.pickerItem}>{d}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>

            <Pressable
              style={[s.btn, !(pendingDay && pendingMonth && pendingYear) && { opacity: 0.5 }]}
              disabled={!(pendingDay && pendingMonth && pendingYear)}
              onPress={() => {
                setDay(pendingDay);
                setMonth(pendingMonth);
                setYear(pendingYear);
                setDobModalOpen(false);
              }}
            >
              <Text style={s.btnText}>{T.dobDone}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View style={s.field}>
        <Text style={s.label}>{T.emailLabel}</Text>
        <TextInput style={s.input} placeholder={T.emailPlaceholder}
          placeholderTextColor="#A9B0BF" autoCapitalize="none" autoCorrect={false}
          keyboardType="email-address" value={email} onChangeText={setEmail} />
      </View>

      <View style={s.field}>
        <Text style={s.label}>{T.passLabel}</Text>
        <View style={s.passWrap}>
          <TextInput style={s.passInput} placeholder={T.passPlaceholder}
            placeholderTextColor="#A9B0BF" secureTextEntry={!showPass}
            value={password} onChangeText={setPassword} />
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
  label: { fontSize: 14, fontWeight: '600', textAlign: 'right', color: C.text, marginBottom: 6 },
  hint: { fontSize: 12, color: C.textMuted, marginTop: 6, textAlign: 'right' },
  hintRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  input: { borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 14, padding: 14, fontSize: 15, textAlign: 'right', color: C.text },
  passWrap: { flexDirection: 'row-reverse', alignItems: 'center', borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 14 },
  passInput: { flex: 1, padding: 14, fontSize: 15, textAlign: 'right', color: C.text },
  eye: { paddingHorizontal: 14, paddingVertical: 14 },
  dobValue: { fontSize: 15, textAlign: 'right', color: C.text },
  dobPlaceholder: { fontSize: 15, textAlign: 'right', color: '#A9B0BF' },
  btn: { backgroundColor: C.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { textAlign: 'center', color: C.primary, marginTop: 16, fontSize: 14 },
  linkMuted: { textAlign: 'center', color: C.textMuted, marginTop: 14, fontSize: 13 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.page, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: C.text, textAlign: 'right', marginBottom: 14 },
  pickerRow: { flexDirection: 'row-reverse', gap: 10, height: 220, marginBottom: 18 },
  pickerCol: { flex: 1 },
  pickerColLabel: { fontSize: 12, fontWeight: '600', color: C.textMuted, textAlign: 'center', marginBottom: 6 },
  pickerScroll: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 12, backgroundColor: C.surface },
  pickerRowItem: { paddingVertical: 10, alignItems: 'center' },
  pickerItem: { fontSize: 15, color: C.textSecondary },
  pickerItemOn: { fontSize: 15, fontWeight: '700', color: C.primary },
});