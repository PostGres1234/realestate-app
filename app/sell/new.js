import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

const T = {
  heading: 'הוספת נכס',
  back: 'חזרה',
  titleLabel: 'כותרת',
  titlePlaceholder: 'לדוגמה: דירת 4 חדרים בכרמל',
  priceLabel: 'מחיר',
  pricePlaceholder: 'לדוגמה: 2150000',
  cityLabel: 'עיר',
  cityPlaceholder: 'לדוגמה: חיפה',
  addressLabel: 'כתובת',
  addressPlaceholder: 'לדוגמה: רחוב הנשיא 12',
  roomsLabel: 'חדרים',
  bathsLabel: 'חדרי רחצה',
  areaLabel: 'שטח במ"ר',
  typeLabel: 'סוג הנכס',
  descLabel: 'תיאור',
  descPlaceholder: 'ספרו על הנכס: מצב, שיפוצים, נוף, חניה...',
  submit: 'פרסום הנכס',
  busy: 'מפרסם...',
  missingTitle: 'חסרים פרטים',
  missingBody: 'יש למלא כותרת, מחיר ועיר.',
  failTitle: 'הפרסום נכשל',
  doneTitle: 'הנכס פורסם',
  doneBody: 'הנכס שלכם מופיע עכשיו ברשימה.',
};

const TYPES = [
  { key: 'apartment', label: 'דירה' },
  { key: 'house', label: 'בית פרטי' },
  { key: 'penthouse', label: 'פנטהאוז' },
  { key: 'land', label: 'מגרש' },
  { key: 'commercial', label: 'מסחרי' },
];

export default function NewListing() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [area, setArea] = useState('');
  const [type, setType] = useState('apartment');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim() || !price || !city.trim()) {
      return Alert.alert(T.missingTitle, T.missingBody);
    }
    setBusy(true);

    const { error } = await supabase.from('properties').insert({
      seller_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      price: Number(price),
      city: city.trim(),
      address: address.trim() || null,
      bedrooms: bedrooms ? Number(bedrooms) : null,
      bathrooms: bathrooms ? Number(bathrooms) : null,
      area_sqm: area ? Number(area) : null,
      property_type: type,
      status: 'active',
    });

    setBusy(false);

    if (error) {
      console.log('insert error', error.message);
      return Alert.alert(T.failTitle, error.message);
    }

    Alert.alert(T.doneTitle, T.doneBody);
    router.replace('/');
  }

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 24, paddingTop: 60, paddingBottom: 60 }}>
      <Pressable onPress={() => router.back()}>
        <Text style={s.link}>{T.back}</Text>
      </Pressable>

      <Text style={s.h1}>{T.heading}</Text>

      <View style={s.field}>
        <Text style={s.label}>{T.titleLabel}</Text>
        <TextInput style={s.input} placeholder={T.titlePlaceholder}
          placeholderTextColor="#aaa" value={title} onChangeText={setTitle} />
      </View>

      <View style={s.field}>
        <Text style={s.label}>{T.priceLabel}</Text>
        <TextInput style={s.input} placeholder={T.pricePlaceholder}
          placeholderTextColor="#aaa" keyboardType="numeric"
          value={price} onChangeText={setPrice} />
      </View>

      <View style={s.field}>
        <Text style={s.label}>{T.cityLabel}</Text>
        <TextInput style={s.input} placeholder={T.cityPlaceholder}
          placeholderTextColor="#aaa" value={city} onChangeText={setCity} />
      </View>

      <View style={s.field}>
        <Text style={s.label}>{T.addressLabel}</Text>
        <TextInput style={s.input} placeholder={T.addressPlaceholder}
          placeholderTextColor="#aaa" value={address} onChangeText={setAddress} />
      </View>

      <View style={s.row}>
        <View style={s.rowField}>
          <Text style={s.label}>{T.roomsLabel}</Text>
          <TextInput style={s.input} keyboardType="numeric"
            value={bedrooms} onChangeText={setBedrooms} />
        </View>
        <View style={s.rowField}>
          <Text style={s.label}>{T.bathsLabel}</Text>
          <TextInput style={s.input} keyboardType="numeric"
            value={bathrooms} onChangeText={setBathrooms} />
        </View>
        <View style={s.rowField}>
          <Text style={s.label}>{T.areaLabel}</Text>
          <TextInput style={s.input} keyboardType="numeric"
            value={area} onChangeText={setArea} />
        </View>
      </View>

      <View style={s.field}>
        <Text style={s.label}>{T.typeLabel}</Text>
        <View style={s.chips}>
          {TYPES.map((t) => (
            <Pressable
              key={t.key}
              style={[s.chip, type === t.key ? s.chipOn : null]}
              onPress={() => setType(t.key)}
            >
              <Text style={type === t.key ? s.chipTextOn : s.chipText}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={s.field}>
        <Text style={s.label}>{T.descLabel}</Text>
        <TextInput
          style={[s.input, { height: 110, textAlignVertical: 'top' }]}
          placeholder={T.descPlaceholder}
          placeholderTextColor="#aaa"
          multiline
          value={description}
          onChangeText={setDescription}
        />
      </View>

      <Pressable style={[s.btn, busy && { opacity: 0.5 }]} onPress={submit} disabled={busy}>
        <Text style={s.btnText}>{busy ? T.busy : T.submit}</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  link: { color: '#1f6feb', fontWeight: '600', fontSize: 16, textAlign: 'right' },
  h1: { fontSize: 28, fontWeight: '700', textAlign: 'right', marginTop: 12, marginBottom: 20 },
  field: { marginBottom: 18 },
  row: { flexDirection: 'row-reverse', gap: 10, marginBottom: 18 },
  rowField: { flex: 1 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 6, textAlign: 'right', color: '#333' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 14, fontSize: 16, textAlign: 'right', backgroundColor: '#fff' },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipOn: { backgroundColor: '#1f6feb', borderColor: '#1f6feb' },
  chipText: { color: '#333', fontSize: 14 },
  chipTextOn: { color: '#fff', fontSize: 14, fontWeight: '600' },
  btn: { backgroundColor: '#1f6feb', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});