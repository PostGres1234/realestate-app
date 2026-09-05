import BackBar from '../../components/BackBar';
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Modal, ActivityIndicator, Alert, Image, Dimensions, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { C } from '../../lib/theme';

const W = Dimensions.get('window').width;

const T = {
  back: 'חזרה',
  loadFail: 'לא ניתן לטעון את הנכס',
  rooms: 'חדרים',
  baths: 'חדרי רחצה',
  sqm: 'מ"ר',
  perMonth: 'לחודש',
  forRent: 'להשכרה',
  forSale: 'למכירה',
  featuresTitle: 'מה יש בנכס',
  locked: 'הצטרפו כדי לראות תיאור מלא, כתובת, מספר חדרים ושטח.',
  ctaGuest: 'הצטרפו כדי ליצור קשר',
  ctaUser: 'שליחת פנייה לבעל הנכס',
  error: 'שגיאה',
  introTitle: 'פנייה לבעל הנכס',
  introHint: 'בעל הנכס יראה את הפרטים האלה ויוכל לחזור אליכם.',
  fNameLabel: 'שם פרטי',
  lNameLabel: 'שם משפחה',
  occLabel: 'עיסוק',
  occPlaceholder: 'לדוגמה: מהנדס תוכנה',
  noteLabel: 'הודעה (אופציונלי)',
  notePlaceholder: 'מתי נוח לכם לראות את הנכס?',
  sendIntro: 'שליחת פנייה',
  sendingIntro: 'שולח...',
  cancel: 'ביטול',
  introMissing: 'חסרים פרטים',
  introMissingBody: 'יש למלא שם פרטי, שם משפחה ועיסוק.',
};

const FEATURES = [
  { key: 'has_balcony', label: 'מרפסת', icon: 'sunny-outline' },
  { key: 'has_shelter', label: 'ממ"ד', icon: 'shield-outline' },
  { key: 'has_parking', label: 'חניה פרטית', icon: 'car-outline' },
  { key: 'has_elevator', label: 'מעלית', icon: 'swap-vertical-outline' },
  { key: 'has_yard', label: 'חצר', icon: 'leaf-outline' },
];

function VideoSlide({ url }) {
  const player = useVideoPlayer(url, (p) => { p.loop = false; });
  return (
    <VideoView player={player} style={{ width: W, height: 280 }}
      nativeControls contentFit="cover" allowsFullscreen />
  );
}

export default function PropertyDetail() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [p, setP] = useState(null);
  const [media, setMedia] = useState([]);
  const [err, setErr] = useState(null);

  const [introOpen, setIntroOpen] = useState(false);
  const [fName, setFName] = useState('');
  const [lName, setLName] = useState('');
  const [occupation, setOccupation] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const cols = user ? '*' : 'id, city, price, listing_type';
      const { data, error } = await supabase
        .from('properties').select(cols).eq('id', id).single();

      if (error) {
        console.log('detail error', error.message);
        setErr(error.message);
        return;
      }
     setP(data);
     

      if (user) {
        const { error: viewErr } = await supabase.rpc('track_view', { p_property: id });
        if (viewErr) console.log('track_view error', viewErr.message);
        else console.log('track_view ok', id);
      }

      const { data: m } = await supabase
        .from('property_images')
        .select('url, position, media_type')
        .eq('property_id', id)
        .order('position', { ascending: true });
      setMedia(m ?? []);
    })();
  }, [id, user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: prof } = await supabase
        .from('profiles').select('full_name, occupation')
        .eq('id', user.id).maybeSingle();
      if (prof?.full_name) {
        const parts = prof.full_name.split(' ');
        setFName(parts[0] ?? '');
        setLName(parts.slice(1).join(' '));
      }
      if (prof?.occupation) setOccupation(prof.occupation);
    })();
  }, [user]);

  async function contactSeller() {
    if (!user) return router.push('/subscribe');

    const { data: existing } = await supabase
      .from('conversations').select('id')
      .eq('property_id', p.id).eq('buyer_id', user.id).maybeSingle();

    if (existing) return router.push('/chat/' + existing.id);
    setIntroOpen(true);
  }

  async function sendIntro() {
    if (!fName.trim() || !lName.trim() || !occupation.trim()) {
      return Alert.alert(T.introMissing, T.introMissingBody);
    }
    setSending(true);

    const { data: conv, error } = await supabase
      .from('conversations')
      .insert({ property_id: p.id, buyer_id: user.id, seller_id: p.seller_id })
      .select('id')
      .single();

    if (error) {
      setSending(false);
      return Alert.alert(T.error, error.message);
    }

    const lines = ['שלום, מתעניין/ת בנכס: ' + (p.title ?? p.city)];
    lines.push('שם: ' + fName.trim() + ' ' + lName.trim());
    if (occupation.trim()) lines.push('עיסוק: ' + occupation.trim());
    if (note.trim()) { lines.push(''); lines.push(note.trim()); }

    await supabase.from('messages').insert({
      conversation_id: conv.id,
      sender_id: user.id,
      body: lines.join('\n'),
    });

    await supabase.from('conversations')
      .update({ intro_sent: true }).eq('id', conv.id);

    if (occupation.trim()) {
      await supabase.from('profiles')
        .update({ occupation: occupation.trim() }).eq('id', user.id);
    }

    setSending(false);
    setIntroOpen(false);
    router.push('/chat/' + conv.id);
  }

  if (err) {
    return (
      <View style={s.center}>
        <Text style={s.errTitle}>{T.loadFail}</Text>
        <Text style={s.meta}>{err}</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={s.link}>{T.back}</Text>
        </Pressable>
      </View>
    );
  }

  if (!p) return <ActivityIndicator style={{ marginTop: 80 }} size="large" color={C.primary} />;

  const money = (n) => '\u20AA' + new Intl.NumberFormat('he-IL').format(n);
  const cta = user ? T.ctaUser : T.ctaGuest;
  const specs = p.bedrooms + ' ' + T.rooms + '  ·  ' + p.bathrooms + ' ' + T.baths + '  ·  ' + p.area_sqm + ' ' + T.sqm;
  const owned = FEATURES.filter((f) => p[f.key]);
  const isOwner = user?.id === p.seller_id;

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: 40 }}>
      {media.length ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {media.map((m) =>
            m.media_type === 'video'
              ? <VideoSlide key={m.url} url={m.url} />
              : <Image key={m.url} source={{ uri: m.url }} style={{ width: W, height: 280 }} />
          )}
        </ScrollView>
      ) : (
        <View style={s.noMedia} />
      )}

      <BackBar floating />

      <View style={s.body}>
        <View style={s.dealTag}>
          <Text style={s.dealText}>
            {p.listing_type === 'rent' ? T.forRent : T.forSale}
          </Text>
        </View>

        <View style={s.priceRow}>
          <Text style={s.price}>{money(p.price)}</Text>
          {p.listing_type === 'rent' ? <Text style={s.perMonth}>{T.perMonth}</Text> : null}
        </View>

        <Text style={s.city}>
          {p.neighborhood ? p.city + ', ' + p.neighborhood : p.city}
        </Text>

        {user ? (
          <View style={{ gap: 8, marginTop: 10 }}>
            <Text style={s.title}>{p.title}</Text>
            <Text style={s.meta}>{p.address}</Text>
            <Text style={s.specs}>{specs}</Text>
            {p.description ? <Text style={s.desc}>{p.description}</Text> : null}

            {owned.length ? (
              <View style={{ marginTop: 10 }}>
                <Text style={s.sectionTitle}>{T.featuresTitle}</Text>
                <View style={s.featWrap}>
                  {owned.map((f) => (
                    <View key={f.key} style={s.feat}>
                      <Ionicons name={f.icon} size={15} color={C.primary} />
                      <Text style={s.featText}>{f.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={s.lock}>
            <Text style={s.lockText}>{T.locked}</Text>
          </View>
        )}

        {!isOwner ? (
          <Pressable style={s.btn} onPress={contactSeller}>
            <Text style={s.btnText}>{cta}</Text>
          </Pressable>
        ) : null}
      </View>

      <Modal visible={introOpen} transparent animationType="slide"
        onRequestClose={() => setIntroOpen(false)}>
        <View style={s.backdrop}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
            keyboardShouldPersistTaps="handled">
            <View style={s.sheet}>
              <Text style={s.sheetTitle}>{T.introTitle}</Text>
              <Text style={s.sheetHint}>{T.introHint}</Text>

              <Text style={s.fLabel}>{T.fNameLabel}</Text>
              <TextInput style={s.fInput} value={fName} onChangeText={setFName} />

              <Text style={s.fLabel}>{T.lNameLabel}</Text>
              <TextInput style={s.fInput} value={lName} onChangeText={setLName} />

              <Text style={s.fLabel}>{T.occLabel}</Text>
              <TextInput style={s.fInput} placeholder={T.occPlaceholder}
                placeholderTextColor="#A9B0BF" value={occupation} onChangeText={setOccupation} />

              <Text style={s.fLabel}>{T.noteLabel}</Text>
              <TextInput style={[s.fInput, { minHeight: 80, textAlignVertical: 'top' }]}
                placeholder={T.notePlaceholder} placeholderTextColor="#A9B0BF"
                multiline value={note} onChangeText={setNote} />

              <Pressable style={[s.btn, sending && { opacity: 0.5 }]}
                onPress={sendIntro} disabled={sending}>
                <Text style={s.btnText}>{sending ? T.sendingIntro : T.sendIntro}</Text>
              </Pressable>
              <Pressable onPress={() => setIntroOpen(false)} style={{ marginTop: 12 }}>
                <Text style={s.cancelText}>{T.cancel}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.page },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  errTitle: { fontSize: 18, fontWeight: '600', color: C.text },
  link: { color: C.primary, fontWeight: '600', fontSize: 16 },
  noMedia: { width: W, height: 120, backgroundColor: C.surface },
  
  body: { padding: 20 },
  dealTag: { alignSelf: 'flex-end', backgroundColor: C.primaryTint, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  dealText: { color: C.primary, fontSize: 12, fontWeight: '700' },
  priceRow: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: 6 },
  price: { fontSize: 28, fontWeight: '700', color: C.primary },
  perMonth: { fontSize: 13, color: C.textMuted },
  city: { fontSize: 19, fontWeight: '600', color: C.text, textAlign: 'right', marginTop: 4 },
  title: { fontSize: 17, fontWeight: '600', color: C.text, textAlign: 'right' },
  meta: { color: C.textMuted, fontSize: 14, textAlign: 'right' },
  specs: { color: C.textSecondary, fontSize: 14, textAlign: 'right' },
  desc: { fontSize: 15, lineHeight: 24, color: C.textSecondary, textAlign: 'right', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: C.text, textAlign: 'right', marginBottom: 8 },
  featWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  feat: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, backgroundColor: C.surface, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 7 },
  featText: { fontSize: 13, color: C.textSecondary },
  lock: { backgroundColor: C.surface, padding: 16, borderRadius: 14, marginTop: 12 },
  lockText: { color: C.textSecondary, textAlign: 'right', lineHeight: 22 },
  btn: { backgroundColor: C.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 24 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: C.page, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: C.text, textAlign: 'right' },
  sheetHint: { fontSize: 12, color: C.textMuted, textAlign: 'right', marginTop: 4, marginBottom: 8 },
  fLabel: { fontSize: 13, fontWeight: '600', color: C.text, textAlign: 'right', marginBottom: 5, marginTop: 10 },
  fInput: { borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 12, padding: 12, fontSize: 15, textAlign: 'right', color: C.text },
  cancelText: { color: C.textMuted, textAlign: 'center', fontSize: 14 },
});