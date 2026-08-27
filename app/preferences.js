import { useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Switch, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { C } from '../lib/theme';
import MultiCityInput from '../components/MultiCityInput';

const T = {
  heading: 'ההעדפות שלי',
  back: 'חזרה',
  intro: 'נעדכן אתכם כשיתפרסם נכס שמתאים להעדפות שלכם.',
  dealLabel: 'סוג העסקה',
  dealAny: 'הכל',
  dealSale: 'למכירה',
  dealRent: 'להשכרה',
  cityLabel: 'ערים ושכונות',
  cityPlaceholder: 'הוסיפו ערים או שכונות',
  cityHint: 'אפשר לבחור כמה. השאירו ריק לכל הארץ.',
  typeLabel: 'סוג הנכס',
  priceLabel: 'טווח מחירים',
  from: 'ממחיר',
  to: 'עד מחיר',
  roomsLabel: 'מספר חדרים',
  bathsLabel: 'חדרי רחצה',
  minShort: 'מ-',
  maxShort: 'עד',
  featuresLabel: 'מאפיינים נדרשים',
  featuresHint: 'נציג רק נכסים שיש בהם את כל מה שסימנתם',
  notifyLabel: 'קבלת עדכונים',
  notifyHint: 'הצגת התראה בדף הבית כשמתפרסם נכס מתאים',
  save: 'שמירת העדפות',
  busy: 'שומר...',
  clear: 'איפוס הכל',
  savedTitle: 'ההעדפות נשמרו',
  savedBody: 'נעדכן אתכם על נכסים מתאימים.',
  failTitle: 'השמירה נכשלה',
};

const DEALS = [
  { key: 'any', label: T.dealAny },
  { key: 'sale', label: T.dealSale },
  { key: 'rent', label: T.dealRent },
];

const TYPES = [
  { key: null, label: 'הכל' },
  { key: 'apartment', label: 'דירה' },
  { key: 'house', label: 'בית פרטי' },
  { key: 'penthouse', label: 'פנטהאוז' },
];

const FEATURES = [
  { key: 'has_balcony', label: 'מרפסת', icon: 'sunny-outline' },
  { key: 'has_shelter', label: 'ממ"ד', icon: 'shield-outline' },
  { key: 'has_parking', label: 'חניה פרטית', icon: 'car-outline' },
  { key: 'has_elevator', label: 'מעלית', icon: 'swap-vertical-outline' },
  { key: 'has_yard', label: 'חצר', icon: 'leaf-outline' },
];

export default function Preferences() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [deal, setDeal] = useState('any');
  const [cities, setCities] = useState([]);
  const [ptype, setPtype] = useState(null);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRooms, setMinRooms] = useState('');
  const [maxRooms, setMaxRooms] = useState('');
  const [minBaths, setMinBaths] = useState('');
  const [maxBaths, setMaxBaths] = useState('');
  const [feats, setFeats] = useState({});
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setDeal(data.listing_type ?? 'any');
      setCities(data.city ? data.city.split(',').map((x) => x.trim()).filter(Boolean) : []);
      setPtype(data.property_type ?? null);
      setMinPrice(data.min_price ? String(data.min_price) : '');
      setMaxPrice(data.max_price ? String(data.max_price) : '');
      setMinRooms(data.min_bedrooms ? String(data.min_bedrooms) : '');
      setMaxRooms(data.max_bedrooms ? String(data.max_bedrooms) : '');
      setMinBaths(data.min_baths ? String(data.min_baths) : '');
      setMaxBaths(data.max_baths ? String(data.max_baths) : '');
      setNotify(data.notify ?? true);
      setFeats({
        has_balcony: !!data.has_balcony,
        has_shelter: !!data.has_shelter,
        has_parking: !!data.has_parking,
        has_elevator: !!data.has_elevator,
        has_yard: !!data.has_yard,
      });
    }
    setLoading(false);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function toggleFeat(key) {
    setFeats((p) => ({ ...p, [key]: !p[key] }));
  }

  function clearAll() {
    setDeal('any');
    setCities([]);
    setPtype(null);
    setMinPrice(''); setMaxPrice('');
    setMinRooms(''); setMaxRooms('');
    setMinBaths(''); setMaxBaths('');
    setFeats({});
  }

  const num = (v) => (v ? Number(v) : null);

  async function save() {
    setBusy(true);
    const { error } = await supabase.from('preferences').upsert({
      user_id: user.id,
      listing_type: deal,
      city: cities.length ? cities.join(',') : null,
      property_type: ptype,
      min_price: num(minPrice),
      max_price: num(maxPrice),
      min_bedrooms: num(minRooms),
      max_bedrooms: num(maxRooms),
      min_baths: num(minBaths),
      max_baths: num(maxBaths),
      has_balcony: !!feats.has_balcony,
      has_shelter: !!feats.has_shelter,
      has_parking: !!feats.has_parking,
      has_elevator: !!feats.has_elevator,
      has_yard: !!feats.has_yard,
      notify,
      updated_at: new Date().toISOString(),
    });
    setBusy(false);

    if (error) {
      console.log('prefs error', error.message);
      return Alert.alert(T.failTitle, error.message);
    }
    Alert.alert(T.savedTitle, T.savedBody);
    router.replace('/');
  }

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 80 }} size="large" color={C.primary} />;
  }

  return (
    <ScrollView
      style={s.wrap}
      contentContainerStyle={{ padding: 20, paddingTop: 56, paddingBottom: 60 }}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.back()} style={{ alignItems: 'flex-end' }}>
        <Text style={s.link}>{T.back}</Text>
      </Pressable>

      <Text style={s.h1}>{T.heading}</Text>
      <Text style={s.intro}>{T.intro}</Text>

      <View style={s.field}>
        <Text style={s.label}>{T.dealLabel}</Text>
        <View style={s.segment}>
          {DEALS.map((d) => (
            <Pressable
              key={d.key}
              style={[s.segBtn, deal === d.key && s.segOn]}
              onPress={() => setDeal(d.key)}
            >
              <Text style={deal === d.key ? s.segTextOn : s.segText}>{d.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={[s.field, { zIndex: 20 }]}>
        <Text style={s.label}>{T.cityLabel}</Text>
        <View style={{ flexDirection: 'row-reverse' }}>
          <MultiCityInput
            cities={cities}
            setCities={setCities}
            placeholder={T.cityPlaceholder}
          />
        </View>
        <Text style={s.hint}>{T.cityHint}</Text>
      </View>

      <View style={s.field}>
        <Text style={s.label}>{T.typeLabel}</Text>
        <View style={s.chips}>
          {TYPES.map((t) => (
            <Pressable
              key={t.label}
              style={[s.chip, ptype === t.key && s.chipOn]}
              onPress={() => setPtype(t.key)}
            >
              <Text style={ptype === t.key ? s.chipTextOn : s.chipText}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={s.field}>
        <Text style={s.label}>{T.priceLabel}</Text>
        <View style={s.pair}>
          <TextInput style={s.input} placeholder={T.from} placeholderTextColor="#A9B0BF"
            keyboardType="numeric" value={minPrice} onChangeText={setMinPrice} />
          <TextInput style={s.input} placeholder={T.to} placeholderTextColor="#A9B0BF"
            keyboardType="numeric" value={maxPrice} onChangeText={setMaxPrice} />
        </View>
      </View>

      <View style={s.field}>
        <Text style={s.label}>{T.roomsLabel}</Text>
        <View style={s.pair}>
          <TextInput style={s.input} placeholder={T.minShort} placeholderTextColor="#A9B0BF"
            keyboardType="numeric" value={minRooms} onChangeText={setMinRooms} />
          <TextInput style={s.input} placeholder={T.maxShort} placeholderTextColor="#A9B0BF"
            keyboardType="numeric" value={maxRooms} onChangeText={setMaxRooms} />
        </View>
      </View>

      <View style={s.field}>
        <Text style={s.label}>{T.bathsLabel}</Text>
        <View style={s.pair}>
          <TextInput style={s.input} placeholder={T.minShort} placeholderTextColor="#A9B0BF"
            keyboardType="numeric" value={minBaths} onChangeText={setMinBaths} />
          <TextInput style={s.input} placeholder={T.maxShort} placeholderTextColor="#A9B0BF"
            keyboardType="numeric" value={maxBaths} onChangeText={setMaxBaths} />
        </View>
      </View>

      <View style={s.field}>
        <Text style={s.label}>{T.featuresLabel}</Text>
        <Text style={s.hint}>{T.featuresHint}</Text>
        <View style={[s.chips, { marginTop: 10 }]}>
          {FEATURES.map((x) => {
            const on = !!feats[x.key];
            return (
              <Pressable
                key={x.key}
                style={[s.feature, on && s.chipOn]}
                onPress={() => toggleFeat(x.key)}
              >
                <Ionicons name={on ? 'checkmark-circle' : x.icon} size={17}
                  color={on ? '#fff' : C.primary} />
                <Text style={on ? s.chipTextOn : s.chipText}>{x.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={s.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>{T.notifyLabel}</Text>
          <Text style={s.hint}>{T.notifyHint}</Text>
        </View>
        <Switch value={notify} onValueChange={setNotify}
          trackColor={{ true: C.primary, false: '#D5DAE3' }} />
      </View>

      <Pressable style={[s.btn, busy && { opacity: 0.5 }]} onPress={save} disabled={busy}>
        <Text style={s.btnText}>{busy ? T.busy : T.save}</Text>
      </Pressable>

      <Pressable style={s.clearBtn} onPress={clearAll}>
        <Text style={s.clearText}>{T.clear}</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.page },
  link: { color: C.primary, fontWeight: '600', fontSize: 15 },
  h1: { fontSize: 26, fontWeight: '700', color: C.text, textAlign: 'right', marginTop: 12 },
  intro: { fontSize: 13, color: C.textMuted, textAlign: 'right', marginTop: 6, marginBottom: 22, lineHeight: 20 },
  field: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, textAlign: 'right', color: C.text },
  hint: { fontSize: 12, color: C.textMuted, marginTop: 6, textAlign: 'right' },
  input: { flex: 1, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 14, padding: 13, fontSize: 15, textAlign: 'right', color: C.text },
  pair: { flexDirection: 'row-reverse', gap: 10 },
  segment: { flexDirection: 'row-reverse', backgroundColor: C.surface, borderRadius: 14, padding: 4 },
  segBtn: { flex: 1, paddingVertical: 11, borderRadius: 11, alignItems: 'center' },
  segOn: { backgroundColor: C.primary },
  segText: { color: C.textSecondary, fontSize: 14, fontWeight: '600' },
  segTextOn: { color: '#fff', fontSize: 14, fontWeight: '600' },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9 },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { color: C.textSecondary, fontSize: 14 },
  chipTextOn: { color: '#fff', fontSize: 14, fontWeight: '600' },
  feature: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  switchRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 24 },
  btn: { backgroundColor: C.primary, padding: 16, borderRadius: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  clearBtn: { borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  clearText: { color: C.textSecondary, fontWeight: '600', fontSize: 14 },
});