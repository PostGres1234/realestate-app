import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Image, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { logSupabase } from '../../lib/logger';
import { geocodeAddress } from '../../lib/geocode';
import { C } from '../../lib/theme';
import LocationInput from '../../components/LocationInput';

const T = {
  heading: 'הוספת נכס',
  back: 'חזרה לנכסים',
  listingTypeLabel: 'סוג העסקה',
  forSale: 'למכירה',
  forRent: 'להשכרה',
  photosLabel: 'תמונות',
  addPhotos: 'בחירת תמונות',
  photoHint: 'עד 6 תמונות. הראשונה תוצג ברשימה.',
  addVideo: 'הוספת סרטון',
  videoHint: 'סרטון אחד, עד 60 שניות',
  videoTag: 'סרטון',
  titleLabel: 'כותרת',
  titlePlaceholder: 'לדוגמה: דירת 4 חדרים בכרמל',
  priceLabel: 'מחיר',
  pricePlaceholder: 'לדוגמה: 2150000',
  priceRentPlaceholder: 'לדוגמה: 4500',
  priceRentHint: 'מחיר לחודש',
  cityLabel: 'עיר',
  cityPlaceholder: 'התחילו להקליד שם עיר',
  hoodLabel: 'שכונה',
  hoodPlaceholder: 'התחילו להקליד שם שכונה',
  addressLabel: 'כתובת',
  addressPlaceholder: 'לדוגמה: רחוב הנשיא 12',
  addressHint: 'כתובת מדויקת תציג את הנכס על המפה',
  roomsLabel: 'חדרים',
  bathsLabel: 'חדרי רחצה',
  areaLabel: 'שטח במ"ר',
  typeLabel: 'סוג הנכס',
  featuresLabel: 'מה יש בנכס',
  featuresHint: 'סמנו את כל מה שרלוונטי',
  descLabel: 'תיאור',
  descPlaceholder: 'ספרו על הנכס: מצב, שיפוצים, נוף, חניה...',
  submit: 'פרסום הנכס',
  busy: 'מפרסם...',
  locating: 'מאתר את הכתובת...',
  uploading: 'מעלה קבצים...',
  missingTitle: 'חסרים פרטים',
  missingBody: 'יש למלא כותרת, מחיר ועיר.',
  failTitle: 'הפרסום נכשל',
  doneTitle: 'הנכס פורסם',
  doneBody: 'הנכס שלכם מופיע עכשיו ברשימה.',
  permTitle: 'אין הרשאה',
  permBody: 'יש לאשר גישה לתמונות בהגדרות המכשיר.',
  maxTitle: 'מקסימום תמונות',
  maxBody: 'ניתן להוסיף עד 6 תמונות.',
  oneVideoTitle: 'סרטון אחד בלבד',
  oneVideoBody: 'ניתן להוסיף סרטון אחד לכל נכס.',
  tooLongTitle: 'הסרטון ארוך מדי',
  tooLongBody: 'ניתן להעלות סרטון של עד 60 שניות.',
};

const TYPES = [
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

const MAX_PHOTOS = 6;

export default function NewListing() {
  const { user } = useAuth();
  const [listingType, setListingType] = useState('sale');
  const [photos, setPhotos] = useState([]);
  const [video, setVideo] = useState(null);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [city, setCity] = useState('');
  const [hood, setHood] = useState('');
  const [address, setAddress] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [area, setArea] = useState('');
  const [type, setType] = useState('apartment');
  const [feats, setFeats] = useState({});
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');

  async function pickImages() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert(T.permTitle, T.permBody);

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: MAX_PHOTOS - photos.length,
    });
    if (res.canceled) return;

    const next = [...photos, ...res.assets];
    if (next.length > MAX_PHOTOS) {
      Alert.alert(T.maxTitle, T.maxBody);
      return setPhotos(next.slice(0, MAX_PHOTOS));
    }
    setPhotos(next);
  }

  function removePhoto(uri) {
    setPhotos((prev) => prev.filter((p) => p.uri !== uri));
  }

  async function pickVideo() {
    if (video) return Alert.alert(T.oneVideoTitle, T.oneVideoBody);

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert(T.permTitle, T.permBody);

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.7,
      videoMaxDuration: 60,
    });
    if (res.canceled) return;

    const asset = res.assets[0];
    if (asset.duration && asset.duration > 62000) {
      return Alert.alert(T.tooLongTitle, T.tooLongBody);
    }
    setVideo(asset);
  }

  function toggleFeat(key) {
    setFeats((p) => ({ ...p, [key]: !p[key] }));
  }

  async function uploadMedia(propertyId) {
    const items = [
      ...photos.map((p) => ({ asset: p, kind: 'image' })),
      ...(video ? [{ asset: video, kind: 'video' }] : []),
    ];

    for (let i = 0; i < items.length; i++) {
      const { asset, kind } = items[i];
      const ext = (asset.uri.split('.').pop() || (kind === 'video' ? 'mp4' : 'jpg'))
        .split('?')[0].toLowerCase();
      const path = user.id + '/' + propertyId + '/' + Date.now() + '_' + i + '.' + ext;
      const mime = kind === 'video'
        ? 'video/' + (ext === 'mov' ? 'quicktime' : ext)
        : 'image/' + (ext === 'jpg' ? 'jpeg' : ext);

      const resp = await fetch(asset.uri);
      const buffer = await resp.arrayBuffer();

      const { error: upErr } = await supabase.storage
        .from('property-images')
        .upload(path, buffer, { contentType: mime, upsert: false });

      if (upErr) {
        logSupabase('listing.upload', upErr, { kind });
        continue;
      }

      const { data: pub } = supabase.storage
        .from('property-images')
        .getPublicUrl(path);

      const { error: rowErr } = await supabase.from('property_images').insert({
        property_id: propertyId,
        url: pub.publicUrl,
        position: i,
        media_type: kind,
      });
      if (rowErr) logSupabase('listing.imageRow', rowErr, { kind });
    }
  }

  async function submit() {
    if (!title.trim() || !price || !city.trim()) {
      return Alert.alert(T.missingTitle, T.missingBody);
    }
    setBusy(true);
    setStage(T.locating);

    const geo = await geocodeAddress({
      address: address.trim(),
      city: city.trim(),
      neighborhood: hood.trim(),
    });

    setStage(T.busy);

    const { data, error } = await supabase
      .from('properties')
      .insert({
        seller_id: user.id,
        listing_type: listingType,
        title: title.trim(),
        description: description.trim() || null,
        price: Number(price),
        city: city.trim(),
        neighborhood: hood.trim() || null,
        address: address.trim() || null,
        latitude: geo?.latitude ?? null,
        longitude: geo?.longitude ?? null,
        bedrooms: bedrooms ? Number(bedrooms) : null,
        bathrooms: bathrooms ? Number(bathrooms) : null,
        area_sqm: area ? Number(area) : null,
        property_type: type,
        has_balcony: !!feats.has_balcony,
        has_shelter: !!feats.has_shelter,
        has_parking: !!feats.has_parking,
        has_elevator: !!feats.has_elevator,
        has_yard: !!feats.has_yard,
        status: 'active',
      })
      .select('id')
      .single();

    if (error) {
      setBusy(false);
      logSupabase('listing.create', error, {
        listingType,
        hasPhotos: photos.length > 0,
        hasVideo: !!video,
        geocoded: !!geo,
      });
      return Alert.alert(T.failTitle, error.message);
    }

    if (photos.length || video) {
      setStage(T.uploading);
      await uploadMedia(data.id);
    }

    setBusy(false);
    Alert.alert(T.doneTitle, T.doneBody);
    router.replace('/');
  }

  return (
    <ScrollView
      style={s.wrap}
      contentContainerStyle={{ padding: 20, paddingTop: 56, paddingBottom: 80 }}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.replace('/')} style={{ alignItems: 'flex-end' }}>
        <Text style={s.link}>{T.back}</Text>
      </Pressable>

      <Text style={s.h1}>{T.heading}</Text>

      <View style={s.field}>
        <Text style={s.label}>{T.listingTypeLabel}</Text>
        <View style={s.segment}>
          <Pressable
            style={[s.segBtn, listingType === 'sale' && s.segOn]}
            onPress={() => setListingType('sale')}
          >
            <Text style={listingType === 'sale' ? s.segTextOn : s.segText}>{T.forSale}</Text>
          </Pressable>
          <Pressable
            style={[s.segBtn, listingType === 'rent' && s.segOn]}
            onPress={() => setListingType('rent')}
          >
            <Text style={listingType === 'rent' ? s.segTextOn : s.segText}>{T.forRent}</Text>
          </Pressable>
        </View>
      </View>

      <View style={s.field}>
        <Text style={s.label}>{T.titleLabel}</Text>
        <TextInput style={s.input} placeholder={T.titlePlaceholder}
          placeholderTextColor="#A9B0BF" value={title} onChangeText={setTitle} />
      </View>

      <View style={s.field}>
        <Text style={s.label}>{T.priceLabel}</Text>
        <TextInput
          style={s.input}
          placeholder={listingType === 'rent' ? T.priceRentPlaceholder : T.pricePlaceholder}
          placeholderTextColor="#A9B0BF"
          keyboardType="numeric"
          value={price}
          onChangeText={setPrice}
        />
        {listingType === 'rent' ? <Text style={s.hint}>{T.priceRentHint}</Text> : null}
      </View>

      <View style={[s.field, { zIndex: 30 }]}>
        <Text style={s.label}>{T.cityLabel}</Text>
        <LocationInput value={city} onChangeText={setCity}
          placeholder={T.cityPlaceholder} kind="city" />
      </View>

      <View style={[s.field, { zIndex: 20 }]}>
        <Text style={s.label}>{T.hoodLabel}</Text>
        <LocationInput value={hood} onChangeText={setHood}
          placeholder={T.hoodPlaceholder} kind="neighborhood"
          parentCity={city.trim() || undefined} />
      </View>

      <View style={s.field}>
        <Text style={s.label}>{T.addressLabel}</Text>
        <TextInput style={s.input} placeholder={T.addressPlaceholder}
          placeholderTextColor="#A9B0BF" value={address} onChangeText={setAddress} />
        <View style={s.hintRow}>
          <Ionicons name="location-outline" size={13} color={C.textMuted} />
          <Text style={s.hint}>{T.addressHint}</Text>
        </View>
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
            <Pressable key={t.key} style={[s.chip, type === t.key && s.chipOn]}
              onPress={() => setType(t.key)}>
              <Text style={type === t.key ? s.chipTextOn : s.chipText}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={s.field}>
        <Text style={s.label}>{T.featuresLabel}</Text>
        <Text style={s.hint}>{T.featuresHint}</Text>
        <View style={[s.chips, { marginTop: 10 }]}>
          {FEATURES.map((x) => {
            const on = !!feats[x.key];
            return (
              <Pressable key={x.key} style={[s.feature, on && s.chipOn]}
                onPress={() => toggleFeat(x.key)}>
                <Ionicons name={on ? 'checkmark-circle' : x.icon} size={17}
                  color={on ? '#fff' : C.primary} />
                <Text style={on ? s.chipTextOn : s.chipText}>{x.label}</Text>
              </Pressable>
            );
          })}
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
        <Text style={s.label}>{T.photosLabel}</Text>
        <Pressable style={s.photoBtn} onPress={pickImages}>
          <Text style={s.photoBtnText}>{T.addPhotos}</Text>
        </Pressable>
        <Text style={s.hint}>{T.photoHint}</Text>

        {photos.length ? (
          <ScrollView horizontal style={{ marginTop: 12 }} showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
              {photos.map((p) => (
                <View key={p.uri} style={s.thumbWrap}>
                  <Image source={{ uri: p.uri }} style={s.thumb} />
                  <Pressable style={s.thumbX} onPress={() => removePhoto(p.uri)}>
                    <Text style={s.thumbXText}>×</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : null}
      </View>

      <View style={s.field}>
        <Pressable style={s.photoBtn} onPress={pickVideo}>
          <Text style={s.photoBtnText}>{T.addVideo}</Text>
        </Pressable>
        <Text style={s.hint}>{T.videoHint}</Text>

        {video ? (
          <View style={[s.thumbWrap, { marginTop: 12, alignSelf: 'flex-end' }]}>
            <View style={[s.thumb, s.videoThumb]}>
              <Text style={s.videoThumbText}>{T.videoTag}</Text>
            </View>
            <Pressable style={s.thumbX} onPress={() => setVideo(null)}>
              <Text style={s.thumbXText}>×</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <Pressable style={[s.btn, busy && { opacity: 0.5 }]} onPress={submit} disabled={busy}>
        {busy ? (
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
            <ActivityIndicator color="#fff" />
            <Text style={s.btnText}>{stage}</Text>
          </View>
        ) : (
          <Text style={s.btnText}>{T.submit}</Text>
        )}
      </Pressable>
    </ScrollView>
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
  hintRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  input: { borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 14, padding: 14, fontSize: 15, textAlign: 'right', color: C.text },
  textarea: { borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 14, padding: 14, fontSize: 15, textAlign: 'right', color: C.text, minHeight: 120, textAlignVertical: 'top' },
  segment: { flexDirection: 'row-reverse', backgroundColor: C.surface, borderRadius: 14, padding: 4 },
  segBtn: { flex: 1, paddingVertical: 11, borderRadius: 11, alignItems: 'center' },
  segOn: { backgroundColor: C.primary },
  segText: { color: C.textSecondary, fontSize: 14, fontWeight: '600' },
  segTextOn: { color: '#fff', fontSize: 14, fontWeight: '600' },
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
  feature: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  btn: { backgroundColor: C.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});