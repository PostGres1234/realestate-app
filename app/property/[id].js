import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Modal, ActivityIndicator, Alert, Image, Dimensions, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { logSupabase } from '../../lib/logger';
import { api } from '../../lib/api';
import { C } from '../../lib/theme';
import BackBar from '../../components/BackBar';
import ReportSheet from '../../components/ReportSheet';

const W = Dimensions.get('window').width;

const T = {
  loadFail: 'לא ניתן לטעון את הנכס',
  back: 'חזרה',
  rooms: 'חדרים',
  baths: 'חדרי רחצה',
  sqm: 'מ"ר',
  perMonth: 'לחודש',
  forRent: 'להשכרה',
  forSale: 'למכירה',
  featuresTitle: 'מה יש בנכס',
  ctaGuest: 'הצטרפו כדי ליצור קשר',
  ctaUser: 'שליחת פנייה לבעל הנכס',
  report: 'דיווח על המודעה',
  error: 'שגיאה',
  introTitle: 'פנייה לבעל הנכס',
  introHint: 'בעל הנכס יראה את הפרטים האלה ויוכל לחזור אליכם.',
  fNameLabel: 'שם פרטי',
  lNameLabel: 'שם משפחה',
  occLabel: 'עיסוק',
  occPlaceholder: 'לדוגמה: מהנדס תוכנה',
  possessionLabel: 'מועד מסירה',
  possessionImmediate: 'מיידי',
  possessionFlexible: 'גמיש',
  needsMortgageLabel: 'אתם זקוקים למשכנתא?',
  hasApprovalLabel: 'יש לכם אישור עקרוני למשכנתא?',
  hasCashLabel: 'יש לכם את מלוא הסכום מוכן לתשלום?',
  yes: 'כן',
  no: 'לא',
  noteLabel: 'הודעה (אופציונלי)',
  notePlaceholder: 'מתי נוח לכם לראות את הנכס?',
  messageLabel: 'תוכן ההודעה',
  messageHint: 'ניתן לערוך את הטקסט הזה. פתיח הפנייה קבוע ולא ניתן לעריכה.',
  resetMessage: 'איפוס לטקסט האוטומטי',
  sendIntro: 'שליחת פנייה',
  sendingIntro: 'שולח...',
  cancel: 'ביטול',
  introMissing: 'חסרים פרטים',
  introMissingBody: 'יש למלא שם פרטי, שם משפחה ועיסוק.',
  askJimmy: 'שאלו את ג׳ימי על הנכס הזה',
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
  const [mediaIndex, setMediaIndex] = useState(0);
  const [err, setErr] = useState(null);

  const [reportOpen, setReportOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(false);
  const [fName, setFName] = useState('');
  const [lName, setLName] = useState('');
  const [occupation, setOccupation] = useState('');
  const [note, setNote] = useState('');
  const [needsMortgage, setNeedsMortgage] = useState(null);
  const [hasApproval, setHasApproval] = useState(null);
  const [hasCash, setHasCash] = useState(null);
  const [sending, setSending] = useState(false);
  const [customBody, setCustomBody] = useState('');
  const [bodyEdited, setBodyEdited] = useState(false);

  const isSale = p?.listing_type === 'sale';
  const greeting = p ? 'שלום, מתעניין/ת בנכס: ' + (p.title ?? p.city) : '';

  function autoBody() {
    const lines = ['שם: ' + fName.trim() + ' ' + lName.trim(), 'עיסוק: ' + occupation.trim()];
    if (isSale && needsMortgage !== null) {
      lines.push(T.needsMortgageLabel + ' ' + (needsMortgage ? T.yes : T.no));
      if (needsMortgage && hasApproval !== null) {
        lines.push(T.hasApprovalLabel + ' ' + (hasApproval ? T.yes : T.no));
      }
      if (!needsMortgage && hasCash !== null) {
        lines.push(T.hasCashLabel + ' ' + (hasCash ? T.yes : T.no));
      }
    }
    if (note.trim()) { lines.push(''); lines.push(note.trim()); }
    return lines.join('\n');
  }

  useEffect(() => {
    if (!bodyEdited) setCustomBody(autoBody());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fName, lName, occupation, note, needsMortgage, hasApproval, hasCash, bodyEdited]);

  useEffect(() => {
    (async () => {
      const { data: rows, error } = await supabase.rpc('property_detail', { p_id: id });
      const data = Array.isArray(rows) ? rows[0] : rows;

      if (error || !data) {
        logSupabase('detail.load', error ?? { message: 'not found' }, { id });
        setErr(error?.message ?? 'not found');
        return;
      }
      setP(data);

      if (user) {
        supabase.rpc('track_view', { p_property: id }).then(({ error: viewErr }) => {
          if (viewErr) logSupabase('detail.trackView', viewErr, { id });
        });
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

    let result;
    try {
      result = await api.post('/api/contact', {
        propertyId: p.id,
        body: greeting + '\n' + customBody.trim(),
        occupation,
      });
    } catch (err) {
      setSending(false);
      logSupabase('detail.startChat', { message: String(err) }, { id });
      return Alert.alert(T.error, err.message);
    }

    setSending(false);
    setIntroOpen(false);
    router.push('/chat/' + result.conversationId);
  }

  if (err) {
    return (
      <View style={s.wrap}>
        <BackBar title={T.loadFail} />
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={50} color={C.textMuted} />
          <Text style={s.meta}>{err}</Text>
        </View>
      </View>
    );
  }

  if (!p) return <ActivityIndicator style={{ marginTop: 80 }} size="large" color={C.primary} />;

  const money = (n) => '\u20AA' + new Intl.NumberFormat('he-IL').format(n);
  const formatPossessionDate = (iso) => {
    const [y, m, d] = iso.split('-');
    return d + '/' + m + '/' + y;
  };
  const cta = user ? T.ctaUser : T.ctaGuest;
  const owned = FEATURES.filter((f) => p[f.key]);
  const isOwner = user?.id === p.seller_id;
  const specs = p.bedrooms + ' ' + T.rooms + '  ·  ' + p.bathrooms + ' ' + T.baths + '  ·  ' + p.area_sqm + ' ' + T.sqm;

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: 40 }}>
      {media.length ? (
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setMediaIndex(Math.round(e.nativeEvent.contentOffset.x / W))
            }
          >
            {media.map((m) =>
              m.media_type === 'video'
                ? <VideoSlide key={m.url} url={m.url} />
                : <Image key={m.url} source={{ uri: m.url }} style={{ width: W, height: 280 }} />
            )}
          </ScrollView>

          {media.length > 1 ? (
            <>
              <View style={s.mediaCount}>
                <Ionicons name="images" size={13} color="#fff" />
                <Text style={s.mediaCountText}>{(mediaIndex + 1) + '/' + media.length}</Text>
              </View>

              <View style={s.dots}>
                {media.map((m, i) => (
                  <View key={m.url} style={[s.dot, i === mediaIndex && s.dotOn]} />
                ))}
              </View>
            </>
          ) : null}
        </View>
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

        <View style={{ gap: 8, marginTop: 10 }}>
          <Text style={s.title}>{p.title}</Text>
          {p.address ? <Text style={s.meta}>{p.address}</Text> : null}
          <Text style={s.specs}>{specs}</Text>

          {p.possession_date !== undefined ? (
            <View style={s.possessionRow}>
              <Ionicons name="calendar-outline" size={15} color={C.primary} />
              <Text style={s.possessionText}>
                {T.possessionLabel + ': ' + (p.possession_date
                  ? formatPossessionDate(p.possession_date)
                  : p.possession_flexible ? T.possessionFlexible : T.possessionImmediate)}
              </Text>
            </View>
          ) : null}

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

        {!isOwner ? (
          <View>
            <Pressable style={s.btn} onPress={contactSeller}>
              <Text style={s.btnText}>{cta}</Text>
            </Pressable>

            {user ? (
              <Pressable
                style={s.jimmyBtn}
                onPress={() => router.push({ pathname: '/assistant', params: { propertyId: p.id } })}
              >
                <Ionicons name="sparkles-outline" size={16} color={C.primary} />
                <Text style={s.jimmyBtnText}>{T.askJimmy}</Text>
              </Pressable>
            ) : null}

            {user ? (
              <Pressable style={s.reportBtn} onPress={() => setReportOpen(true)}>
                <Ionicons name="flag-outline" size={15} color={C.textMuted} />
                <Text style={s.reportText}>{T.report}</Text>
              </Pressable>
            ) : null}
          </View>
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

              {isSale ? (
                <>
                  <View style={s.fLabelRow}>
                    <Ionicons name="business-outline" size={16} color={C.primary} />
                    <Text style={[s.fLabel, { marginTop: 0, marginBottom: 0 }]}>{T.needsMortgageLabel}</Text>
                  </View>
                  <View style={s.yesNoRow}>
                    <Pressable
                      style={[s.yesNoBtn, needsMortgage === true && s.yesNoBtnOn]}
                      onPress={() => setNeedsMortgage(true)}
                    >
                      <Text style={needsMortgage === true ? s.yesNoTextOn : s.yesNoText}>{T.yes}</Text>
                    </Pressable>
                    <Pressable
                      style={[s.yesNoBtn, needsMortgage === false && s.yesNoBtnOn]}
                      onPress={() => setNeedsMortgage(false)}
                    >
                      <Text style={needsMortgage === false ? s.yesNoTextOn : s.yesNoText}>{T.no}</Text>
                    </Pressable>
                  </View>

                  {needsMortgage === true ? (
                    <>
                      <Text style={s.fLabel}>{T.hasApprovalLabel}</Text>
                      <View style={s.yesNoRow}>
                        <Pressable
                          style={[s.yesNoBtn, hasApproval === true && s.yesNoBtnOn]}
                          onPress={() => setHasApproval(true)}
                        >
                          <Text style={hasApproval === true ? s.yesNoTextOn : s.yesNoText}>{T.yes}</Text>
                        </Pressable>
                        <Pressable
                          style={[s.yesNoBtn, hasApproval === false && s.yesNoBtnOn]}
                          onPress={() => setHasApproval(false)}
                        >
                          <Text style={hasApproval === false ? s.yesNoTextOn : s.yesNoText}>{T.no}</Text>
                        </Pressable>
                      </View>
                    </>
                  ) : null}

                  {needsMortgage === false ? (
                    <>
                      <Text style={s.fLabel}>{T.hasCashLabel}</Text>
                      <View style={s.yesNoRow}>
                        <Pressable
                          style={[s.yesNoBtn, hasCash === true && s.yesNoBtnOn]}
                          onPress={() => setHasCash(true)}
                        >
                          <Text style={hasCash === true ? s.yesNoTextOn : s.yesNoText}>{T.yes}</Text>
                        </Pressable>
                        <Pressable
                          style={[s.yesNoBtn, hasCash === false && s.yesNoBtnOn]}
                          onPress={() => setHasCash(false)}
                        >
                          <Text style={hasCash === false ? s.yesNoTextOn : s.yesNoText}>{T.no}</Text>
                        </Pressable>
                      </View>
                    </>
                  ) : null}
                </>
              ) : null}

              <Text style={s.fLabel}>{T.noteLabel}</Text>
              <TextInput style={[s.fInput, { minHeight: 80, textAlignVertical: 'top' }]}
                placeholder={T.notePlaceholder} placeholderTextColor="#A9B0BF"
                multiline value={note} onChangeText={setNote} />

              <Text style={s.fLabel}>{T.messageLabel}</Text>
              <Text style={s.hintText}>{T.messageHint}</Text>
              <View style={s.lockedLine}>
                <Text style={s.lockedLineText}>{greeting}</Text>
              </View>
              <TextInput
                style={[s.fInput, { minHeight: 110, textAlignVertical: 'top' }]}
                multiline
                value={customBody}
                onChangeText={(v) => { setCustomBody(v); setBodyEdited(true); }}
              />
              {bodyEdited ? (
                <Pressable onPress={() => setBodyEdited(false)} style={{ marginTop: 6 }}>
                  <Text style={s.resetText}>{T.resetMessage}</Text>
                </Pressable>
              ) : null}

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

      <ReportSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        targetUser={p.seller_id}
        targetProperty={p.id}
        onBlocked={() => router.replace('/')}
      />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.page },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, marginTop: 60 },
  noMedia: { width: W, height: 120, backgroundColor: C.surface },
  mediaCount: {
    position: 'absolute', top: 52, left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  mediaCountText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  dots: {
    position: 'absolute', bottom: 12, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotOn: { backgroundColor: '#fff', width: 16 },
  body: { padding: 20 },
  dealTag: { alignSelf: 'flex-end', backgroundColor: C.primaryTint, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  dealText: { color: C.primary, fontSize: 12, fontWeight: '700' },
  priceRow: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: 6 },
  price: { fontSize: 28, fontWeight: '800', color: C.primary },
  perMonth: { fontSize: 13, color: C.textMuted },
  city: { fontSize: 19, fontWeight: '600', color: C.text, textAlign: 'right', marginTop: 4 },
  title: { fontSize: 17, fontWeight: '700', color: C.text, textAlign: 'right' },
  meta: { color: C.textMuted, fontSize: 14, textAlign: 'right' },
  specs: { color: C.textSecondary, fontSize: 14, textAlign: 'right' },
  possessionRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  possessionText: { color: C.textSecondary, fontSize: 14 },
  desc: { fontSize: 15, lineHeight: 24, color: C.textSecondary, textAlign: 'right', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, textAlign: 'right', marginBottom: 8 },
  featWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  feat: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, backgroundColor: C.surface, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 7 },
  featText: { fontSize: 13, color: C.textSecondary },
  btn: { backgroundColor: C.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 24 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  jimmyBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: C.primary, borderRadius: 14, paddingVertical: 13, marginTop: 10 },
  jimmyBtnText: { color: C.primary, fontWeight: '600', fontSize: 14 },
  reportBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, marginTop: 4 },
  reportText: { color: C.textMuted, fontSize: 13, fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: C.page, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: C.text, textAlign: 'right' },
  sheetHint: { fontSize: 12, color: C.textMuted, textAlign: 'right', marginTop: 4, marginBottom: 8 },
  fLabel: { fontSize: 13, fontWeight: '600', color: C.text, textAlign: 'right', marginBottom: 5, marginTop: 10 },
  fLabelRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 10, marginBottom: 5 },
  fInput: { borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 12, padding: 12, fontSize: 15, textAlign: 'right', color: C.text },
  yesNoRow: { flexDirection: 'row-reverse', gap: 8 },
  yesNoBtn: { borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  yesNoBtnOn: { backgroundColor: C.primary, borderColor: C.primary },
  yesNoText: { color: C.textSecondary, fontSize: 14, fontWeight: '600' },
  yesNoTextOn: { color: '#fff', fontSize: 14, fontWeight: '600' },
  cancelText: { color: C.textMuted, textAlign: 'center', fontSize: 14 },
  hintText: { fontSize: 12, color: C.textMuted, textAlign: 'right', marginBottom: 6 },
  lockedLine: { backgroundColor: C.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  lockedLineText: { color: C.textSecondary, fontSize: 14, textAlign: 'right' },
  resetText: { color: C.primary, fontSize: 12, fontWeight: '600', textAlign: 'right' },
});