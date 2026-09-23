import BackBar from '../../../components/BackBar';
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Image, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { logSupabase } from '../../../lib/logger';
import { api } from '../../../lib/api';
import { C } from '../../../lib/theme';

const T = {
  heading: 'עריכת נכס',
  back: 'חזרה',
  currentMedia: 'תמונות וסרטונים קיימים',
  noMedia: 'לא הועלו קבצים לנכס הזה.',
  addPhotos: 'הוספת תמונות',
  addVideo: 'הוספת סרטון',
  newMedia: 'קבצים חדשים להעלאה',
  videoTag: 'סרטון',
  titleLabel: 'כותרת',
  priceLabel: 'מחיר',
  cityLabel: 'עיר',
  addressLabel: 'כתובת',
  roomsLabel: 'חדרים',
  bathsLabel: 'חדרי רחצה',
  areaLabel: 'שטח במ"ר',
  typeLabel: 'סוג הנכס',
  statusLabel: 'סטטוס',
  descLabel: 'תיאור',
  descPlaceholder: 'ספרו על הנכס...',
  possessionLabel: 'מועד מסירה',
  possessionHint: 'כך קונים ושוכרים ידעו אם התזמון מתאים להם.',
  possessionImmediate: 'מיידי',
  possessionFuture: 'תאריך עתידי',
  day: 'יום',
  month: 'חודש',
  year: 'שנה',
  missingPossession: 'יש למלא יום, חודש ושנה למועד המסירה.',
  badPossessionDate: 'תאריך מועד המסירה אינו תקין.',
  save: 'שמירת שינויים',
  busy: 'שומר...',
  uploading: 'מעלה קבצים...',
  missingTitle: 'חסרים פרטים',
  missingBody: 'יש למלא כותרת, מחיר ועיר.',
  failTitle: 'השמירה נכשלה',
  mediaFailBody: 'פרטי הנכס נשמרו, אך חלק מהקבצים לא הועלו. נסו להוסיף אותם שוב.',
  doneTitle: 'הנכס עודכן',
  doneBody: 'השינויים נשמרו.',
  delMediaTitle: 'מחיקת קובץ',
  delMediaBody: 'למחוק את הקובץ מהנכס?',
  cancel: 'ביטול',
  confirmDel: 'מחק',
  permTitle: 'אין הרשאה',
  permBody: 'יש לאשר גישה לתמונות בהגדרות המכשיר.',
  oneVideoTitle: 'סרטון אחד בלבד',
  oneVideoBody: 'ניתן להוסיף סרטון אחד לכל נכס.',
};

const TYPES = [
  { key: 'apartment', label: 'דירה' },
  { key: 'house', label: 'בית פרטי' },
  { key: 'penthouse', label: 'פנטהאוז' },
];

const STATUSES = [
  { key: 'active', label: 'פעיל' },
  { key: 'pending', label: 'בהמתנה' },
  { key: 'sold', label: 'נמכר' },
];

export default function EditListing() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState([]);
  const [newPhotos, setNewPhotos] = useState([]);
  const [newVideo, setNewVideo] = useState(null);

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [area, setArea] = useState('');
  const [type, setType] = useState('apartment');
  const [status, setStatus] = useState('active');
  const [description, setDescription] = useState('');
  const [possessionMode, setPossessionMode] = useState('immediate');
  const [pDay, setPDay] = useState('');
  const [pMonth, setPMonth] = useState('');
  const [pYear, setPYear] = useState('');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');

  function resolvePossessionDate() {
    if (possessionMode === 'immediate') return { ok: true, value: null };

    if (!pDay.trim() || !pMonth.trim() || !pYear.trim()) {
      return { ok: false, error: T.missingPossession };
    }

    const d = parseInt(pDay, 10);
    const m = parseInt(pMonth, 10);
    const y = parseInt(pYear, 10);

    if (isNaN(d) || d < 1 || d > 31 || isNaN(m) || m < 1 || m > 12 || isNaN(y) || y < 1900) {
      return { ok: false, error: T.badPossessionDate };
    }

    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
      return { ok: false, error: T.badPossessionDate };
    }

    const iso = y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    return { ok: true, value: iso };
  }

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        console.log('edit load error', error?.message);
        setLoading(false);
        return;
      }

      setTitle(data.title ?? '');
      setPrice(data.price ? String(data.price) : '');
      setCity(data.city ?? '');
      setAddress(data.address ?? '');
      setBedrooms(data.bedrooms ? String(data.bedrooms) : '');
      setBathrooms(data.bathrooms ? String(data.bathrooms) : '');
      setArea(data.area_sqm ? String(data.area_sqm) : '');
      setType(data.property_type ?? 'apartment');
      setStatus(data.status ?? 'active');
      setDescription(data.description ?? '');

      if (data.possession_date) {
        const [y, m, d] = data.possession_date.split('-');
        setPossessionMode('future');
        setPDay(String(Number(d)));
        setPMonth(String(Number(m)));
        setPYear(y);
      }

      const { data: m } = await supabase
        .from('property_images')
        .select('id, url, position, media_type')
        .eq('property_id', id)
        .order('position', { ascending: true });
      setExisting(m ?? []);
      setLoading(false);
    })();
  }, [id]);

  const hasVideo = existing.some((m) => m.media_type === 'video') || !!newVideo;

  async function pickPhotos() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert(T.permTitle, T.permBody);

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (res.canceled) return;
    setNewPhotos((prev) => [...prev, ...res.assets]);
  }

  async function pickVideo() {
    if (hasVideo) return Alert.alert(T.oneVideoTitle, T.oneVideoBody);

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert(T.permTitle, T.permBody);

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.7,
      videoMaxDuration: 60,
    });
    if (res.canceled) return;
    setNewVideo(res.assets[0]);
  }

  function confirmDeleteMedia(item) {
    Alert.alert(T.delMediaTitle, T.delMediaBody, [
      { text: T.cancel, style: 'cancel' },
      {
        text: T.confirmDel,
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('property_images')
            .delete()
            .eq('id', item.id);
          if (error) return Alert.alert(T.failTitle, error.message);
          setExisting((prev) => prev.filter((x) => x.id !== item.id));
        },
      },
    ]);
  }

  async function uploadNew() {
    const items = [
      ...newPhotos.map((p) => ({ asset: p, kind: 'image' })),
      ...(newVideo ? [{ asset: newVideo, kind: 'video' }] : []),
    ];
    let pos = existing.length
      ? Math.max(...existing.map((m) => m.position)) + 1
      : 0;
    let failures = 0;

    for (const { asset, kind } of items) {
      const ext = (asset.uri.split('.').pop() || (kind === 'video' ? 'mp4' : 'jpg'))
        .split('?')[0].toLowerCase();
      const path = user.id + '/' + id + '/' + Date.now() + '_' + pos + '.' + ext;
      const mime = kind === 'video'
        ? 'video/' + (ext === 'mov' ? 'quicktime' : ext)
        : 'image/' + (ext === 'jpg' ? 'jpeg' : ext);

      const resp = await fetch(asset.uri);
      const buffer = await resp.arrayBuffer();

      const { error: upErr } = await supabase.storage
        .from('property-images')
        .upload(path, buffer, { contentType: mime, upsert: false });

      if (upErr) {
        logSupabase('listing.editUpload', upErr, { kind });
        failures++;
        continue;
      }

      const { data: pub } = supabase.storage
        .from('property-images')
        .getPublicUrl(path);

      const { error: rowErr } = await supabase.from('property_images').insert({
        property_id: id,
        url: pub.publicUrl,
        position: pos,
        media_type: kind,
      });

      if (rowErr) {
        logSupabase('listing.editImageRow', rowErr, { kind });
        failures++;
        continue;
      }
      pos++;
    }

    return failures;
  }

  async function save() {
    if (!title.trim() || !price || !city.trim()) {
      return Alert.alert(T.missingTitle, T.missingBody);
    }

    const possession = resolvePossessionDate();
    if (!possession.ok) return Alert.alert(T.missingTitle, possession.error);

    setBusy(true);
    setStage(T.busy);

    try {
      await api.patch('/api/listings/' + id, {
        title: title.trim(),
        description: description.trim() || null,
        price: Number(price),
        city: city.trim(),
        address: address.trim() || null,
        bedrooms: bedrooms ? Number(bedrooms) : null,
        bathrooms: bathrooms ? Number(bathrooms) : null,
        area_sqm: area ? Number(area) : null,
        property_type: type,
        possession_date: possession.value,
        status,
      });
    } catch (err) {
      setBusy(false);
      console.log('update error', err.message);
      return Alert.alert(T.failTitle, err.message);
    }

    if (newPhotos.length || newVideo) {
      setStage(T.uploading);
      const failures = await uploadNew();
      if (failures) {
        setBusy(false);
        Alert.alert(T.failTitle, T.mediaFailBody);
        return;
      }
    }

    setBusy(false);
    Alert.alert(T.doneTitle, T.doneBody);
    router.replace('/sell/mine');
  }

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 80 }} size="large" color={C.primary} />;
  }

  return (
    <View style={s.wrap}>
      <BackBar title={T.heading} />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 80 }}
        keyboardShouldPersistTaps="handled"
      >

      <View style={s.field}>
        <Text style={s.label}>{T.titleLabel}</Text>
        <TextInput style={s.input} value={title} onChangeText={setTitle} />
      </View>

      <View style={s.field}>
        <Text style={s.label}>{T.priceLabel}</Text>
        <TextInput style={s.input} keyboardType="numeric" value={price} onChangeText={setPrice} />
      </View>

      <View style={s.field}>
        <Text style={s.label}>{T.cityLabel}</Text>
        <TextInput style={s.input} value={city} onChangeText={setCity} />
      </View>

      <View style={s.field}>
        <Text style={s.label}>{T.addressLabel}</Text>
        <TextInput style={s.input} value={address} onChangeText={setAddress} />
      </View>

      <View style={s.row}>
        <View style={s.rowField}>
          <Text style={s.label}>{T.roomsLabel}</Text>
          <TextInput style={s.input} keyboardType="numeric" value={bedrooms} onChangeText={setBedrooms} />
        </View>
        <View style={s.rowField}>
          <Text style={s.label}>{T.bathsLabel}</Text>
          <TextInput style={s.input} keyboardType="numeric" value={bathrooms} onChangeText={setBathrooms} />
        </View>
        <View style={s.rowField}>
          <Text style={s.label}>{T.areaLabel}</Text>
          <TextInput style={s.input} keyboardType="numeric" value={area} onChangeText={setArea} />
        </View>
      </View>

      <View style={s.field}>
        <Text style={s.label}>{T.typeLabel}</Text>
        <View style={s.chips}>
          {TYPES.map((t) => (
            <Pressable key={t.key} style={[s.chip, type === t.key && s.chipOn]}
              onPress={() => setType(t.key)}>
              <Text style={type === t.key ? s.chipTextOn : s.chipText}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={s.field}>
        <Text style={s.label}>{T.possessionLabel}</Text>
        <View style={s.chips}>
          <Pressable style={[s.chip, possessionMode === 'immediate' && s.chipOn]}
            onPress={() => setPossessionMode('immediate')}>
            <Text style={possessionMode === 'immediate' ? s.chipTextOn : s.chipText}>
              {T.possessionImmediate}
            </Text>
          </Pressable>
          <Pressable style={[s.chip, possessionMode === 'future' && s.chipOn]}
            onPress={() => setPossessionMode('future')}>
            <Text style={possessionMode === 'future' ? s.chipTextOn : s.chipText}>
              {T.possessionFuture}
            </Text>
          </Pressable>
        </View>
        <Text style={s.hint}>{T.possessionHint}</Text>

        {possessionMode === 'future' ? (
          <View style={s.dobRow}>
            <TextInput style={[s.input, s.dobPart]} placeholder={T.day}
              placeholderTextColor="#A9B0BF" keyboardType="number-pad" maxLength={2}
              value={pDay} onChangeText={setPDay} />
            <TextInput style={[s.input, s.dobPart]} placeholder={T.month}
              placeholderTextColor="#A9B0BF" keyboardType="number-pad" maxLength={2}
              value={pMonth} onChangeText={setPMonth} />
            <TextInput style={[s.input, s.dobYear]} placeholder={T.year}
              placeholderTextColor="#A9B0BF" keyboardType="number-pad" maxLength={4}
              value={pYear} onChangeText={setPYear} />
          </View>
        ) : null}
      </View>

      <View style={s.field}>
        <Text style={s.label}>{T.statusLabel}</Text>
        <View style={s.chips}>
          {STATUSES.map((t) => (
            <Pressable key={t.key} style={[s.chip, status === t.key && s.chipOn]}
              onPress={() => setStatus(t.key)}>
              <Text style={status === t.key ? s.chipTextOn : s.chipText}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={s.field}>
        <Text style={s.label}>{T.descLabel}</Text>
        <TextInput
          style={s.textarea}
          placeholder={T.descPlaceholder}
          placeholderTextColor="#A9B0BF"
          multiline
          numberOfLines={5}
          value={description}
          onChangeText={setDescription}
        />
      </View>

      <View style={s.field}>
        <Text style={s.label}>{T.currentMedia}</Text>
        {existing.length ? (
          <ScrollView horizontal style={{ marginTop: 10 }} showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
              {existing.map((m) => (
                <View key={m.id} style={s.thumbWrap}>
                  {m.media_type === 'video' ? (
                    <View style={[s.thumb, s.videoThumb]}>
                      <Text style={s.videoThumbText}>{T.videoTag}</Text>
                    </View>
                  ) : (
                    <Image source={{ uri: m.url }} style={s.thumb} />
                  )}
                  <Pressable style={s.thumbX} onPress={() => confirmDeleteMedia(m)}>
                    <Text style={s.thumbXText}>×</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <Text style={s.hint}>{T.noMedia}</Text>
        )}
      </View>

      <View style={s.field}>
        <Pressable style={s.photoBtn} onPress={pickPhotos}>
          <Text style={s.photoBtnText}>{T.addPhotos}</Text>
        </Pressable>
      </View>

      <View style={s.field}>
        <Pressable style={s.photoBtn} onPress={pickVideo}>
          <Text style={s.photoBtnText}>{T.addVideo}</Text>
        </Pressable>
      </View>

      {newPhotos.length || newVideo ? (
        <View style={s.field}>
          <Text style={s.label}>{T.newMedia}</Text>
          <ScrollView horizontal style={{ marginTop: 10 }} showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
              {newPhotos.map((p) => (
                <View key={p.uri} style={s.thumbWrap}>
                  <Image source={{ uri: p.uri }} style={s.thumb} />
                  <Pressable style={s.thumbX}
                    onPress={() => setNewPhotos((prev) => prev.filter((x) => x.uri !== p.uri))}>
                    <Text style={s.thumbXText}>×</Text>
                  </Pressable>
                </View>
              ))}
              {newVideo ? (
                <View style={s.thumbWrap}>
                  <View style={[s.thumb, s.videoThumb]}>
                    <Text style={s.videoThumbText}>{T.videoTag}</Text>
                  </View>
                  <Pressable style={s.thumbX} onPress={() => setNewVideo(null)}>
                    <Text style={s.thumbXText}>×</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </ScrollView>
        </View>
      ) : null}

      <Pressable style={[s.btn, busy && { opacity: 0.5 }]} onPress={save} disabled={busy}>
        {busy ? (
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
            <ActivityIndicator color="#fff" />
            <Text style={s.btnText}>{stage}</Text>
          </View>
        ) : (
          <Text style={s.btnText}>{T.save}</Text>
        )}
      </Pressable>
  </ScrollView>
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.page },
  link: { color: C.primary, fontWeight: '600', fontSize: 15 },
  h1: { fontSize: 26, fontWeight: '700', color: C.text, textAlign: 'right', marginTop: 12, marginBottom: 20 },
  field: { marginBottom: 18 },
  row: { flexDirection: 'row-reverse', gap: 10, marginBottom: 18 },
  rowField: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, textAlign: 'right', color: C.text },
  hint: { fontSize: 12, color: C.textMuted, marginTop: 6, textAlign: 'right' },
  input: { borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 14, padding: 14, fontSize: 15, textAlign: 'right', color: C.text },
  textarea: { borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 14, padding: 14, fontSize: 15, textAlign: 'right', color: C.text, minHeight: 120, textAlignVertical: 'top' },
  photoBtn: { borderWidth: 1, borderColor: C.primary, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  photoBtnText: { color: C.primary, fontWeight: '600', fontSize: 15 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 90, height: 90, borderRadius: 12, backgroundColor: C.placeholder },
  thumbX: { position: 'absolute', top: -6, left: -6, backgroundColor: C.danger, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  thumbXText: { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 20 },
  videoThumb: { alignItems: 'center', justifyContent: 'center', backgroundColor: C.primaryTint },
  videoThumbText: { color: C.primary, fontSize: 12, fontWeight: '600' },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9 },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { color: C.textSecondary, fontSize: 14 },
  chipTextOn: { color: '#fff', fontSize: 14, fontWeight: '600' },
  dobRow: { flexDirection: 'row-reverse', gap: 10, marginTop: 10 },
  dobPart: { flex: 1, textAlign: 'center' },
  dobYear: { flex: 1.6, textAlign: 'center' },
  btn: { backgroundColor: C.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});