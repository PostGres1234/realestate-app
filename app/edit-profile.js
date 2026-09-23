import { useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Switch, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { logSupabase } from '../lib/logger';
import { api } from '../lib/api';
import { C } from '../lib/theme';
import BackBar from '../components/BackBar';

const T = {
  heading: 'עריכת פרופיל',
  nameLabel: 'שם מלא',
  namePlaceholder: 'שם פרטי ושם משפחה',
  nameHint: 'השם שיוצג בפניות שתשלחו',
  phoneLabel: 'טלפון',
  phonePlaceholder: '050-0000000',
  phoneHint: 'יוצג לבעלי נכסים שאליהם תפנו, כדי שיוכלו לחזור אליכם.',
  occLabel: 'עיסוק',
  occPlaceholder: 'לדוגמה: מהנדס תוכנה',
  occHint: 'ישמש כברירת מחדל בפניות חדשות',
  callsLabel: 'אפשרו שיחות טלפון',
  callsHint: 'בעלי נכסים שאליהם פניתם יוכלו להתקשר אליכם',
  emailLabel: 'אימייל',
  emailHint: 'לא ניתן לשנות כתובת אימייל',
  save: 'שמירת שינויים',
  busy: 'שומר...',
  savedTitle: 'הפרופיל עודכן',
  savedBody: 'השינויים נשמרו.',
  failTitle: 'השמירה נכשלה',
  checkTitle: 'בדקו את הפרטים',
  needName: 'יש למלא שם מלא.',
  needPhone: 'מספר הטלפון אינו תקין.',
};

export default function EditProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [occupation, setOccupation] = useState('');
  const [allowCalls, setAllowCalls] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, phone, occupation, allow_calls')
      .eq('id', user.id)
      .maybeSingle();

    if (error) logSupabase('profile.load', error);

    if (data) {
      setFullName(data.full_name ?? '');
      setPhone(data.phone ?? '');
      setOccupation(data.occupation ?? '');
      setAllowCalls(data.allow_calls !== false);
    }
    setLoading(false);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function save() {
    if (!fullName.trim()) return Alert.alert(T.checkTitle, T.needName);

    const digits = phone.replace(/\D/g, '');
    if (phone.trim() && digits.length < 9) {
      return Alert.alert(T.checkTitle, T.needPhone);
    }

    setBusy(true);
    try {
      await api.patch('/api/profile', {
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        occupation: occupation.trim() || null,
        allowCalls,
      });
    } catch (err) {
      setBusy(false);
      logSupabase('profile.save', { message: err.message });
      return Alert.alert(T.failTitle, err.message);
    }
    setBusy(false);

    Alert.alert(T.savedTitle, T.savedBody);
    router.back();
  }

  const initials = (fullName || user?.email || '?').slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <View style={s.wrap}>
        <BackBar title={T.heading} />
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <BackBar title={T.heading} />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.avatarWrap}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
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
          <Text style={s.label}>{T.phoneLabel}</Text>
          <TextInput
            style={s.input}
            placeholder={T.phonePlaceholder}
            placeholderTextColor="#A9B0BF"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <Text style={s.hint}>{T.phoneHint}</Text>
        </View>

        <View style={s.field}>
          <Text style={s.label}>{T.occLabel}</Text>
          <TextInput
            style={s.input}
            placeholder={T.occPlaceholder}
            placeholderTextColor="#A9B0BF"
            value={occupation}
            onChangeText={setOccupation}
          />
          <Text style={s.hint}>{T.occHint}</Text>
        </View>

        <View style={s.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>{T.callsLabel}</Text>
            <Text style={s.hint}>{T.callsHint}</Text>
          </View>
          <Switch
            value={allowCalls}
            onValueChange={setAllowCalls}
            trackColor={{ true: C.primary, false: '#D5DAE3' }}
          />
        </View>

        <View style={s.readonly}>
          <Ionicons name="mail-outline" size={18} color={C.textMuted} />
          <View style={{ flex: 1 }}>
            <Text style={s.roLabel}>{T.emailLabel}</Text>
            <Text style={s.roValue}>{user?.email}</Text>
          </View>
          <Ionicons name="lock-closed" size={15} color={C.textMuted} />
        </View>
        <Text style={s.hint}>{T.emailHint}</Text>

        <Pressable style={[s.btn, busy && { opacity: 0.5 }]} onPress={save} disabled={busy}>
          <Text style={s.btnText}>{busy ? T.busy : T.save}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.page },
  avatarWrap: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: C.primaryTint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.primary, fontWeight: '800', fontSize: 28 },
  field: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, textAlign: 'right', color: C.text },
  hint: { fontSize: 12, color: C.textMuted, marginTop: 6, textAlign: 'right' },
  input: { borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 14, padding: 14, fontSize: 15, textAlign: 'right', color: C.text },
  switchRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 20 },
  readonly: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderRadius: 14, padding: 14 },
  roLabel: { fontSize: 12, color: C.textMuted, textAlign: 'right' },
  roValue: { fontSize: 15, color: C.textSecondary, textAlign: 'right', marginTop: 2 },
  btn: { backgroundColor: C.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 26 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});