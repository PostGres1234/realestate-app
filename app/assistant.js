import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import BackBar from '../components/BackBar';
import TabBar from '../components/TabBar';
import { useAuth } from '../lib/auth';
import { logSupabase } from '../lib/logger';
import { supabase } from '../lib/supabase';
import { C } from '../lib/theme';

const T = {
  heading: 'ג׳ימי',
  sub: 'היועץ שיעזור לכם למצוא נכס',
  placeholder: 'כתבו לג׳ימי...',
  guest: 'התחברו כדי לדבר עם ג׳ימי',
  login: 'התחברות',
  perMonth: 'לחודש',
  rooms: 'חד׳',
  sqm: 'מ"ר',
  opener: 'היי, אני ג׳ימי. אני כאן כדי לעזור.\n\nאתם מחפשים נכס, או שיש לכם נכס למכירה או להשכרה?',
  openerOption1: 'מחפש/ת נכס',
  openerOption2: 'יש לי נכס למכירה או להשכרה',
  error: 'אירעה שגיאה בחיבור. נסו שוב.',
  skip: 'דילוג',
  confirm: 'אישור',
};

function Bubble({ content, mine }) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);

  return (
    <Text style={mine ? s.mineText : s.botText}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={i} style={s.highlight}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
}

export default function Assistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: T.opener,
      ids: [],
      options: [T.openerOption1, T.openerOption2],
      skippable: false,
      multi: false,
    },
  ]);
  const [listings, setListings] = useState([]);
  const [byId, setById] = useState({});
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState({});
  const listRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase.rpc('listings_for_assistant');
      if (error) return logSupabase('assistant.listings', error);
      setListings(data ?? []);

      const map = {};
      (data ?? []).forEach((p) => { map[p.id] = p; });

      const ids = (data ?? []).map((p) => p.id);
      if (ids.length) {
        const { data: imgs } = await supabase
          .from('property_images')
          .select('property_id, url, position, media_type')
          .in('property_id', ids)
          .eq('media_type', 'image')
          .order('position', { ascending: true });
        (imgs ?? []).forEach((im) => {
          if (map[im.property_id] && !map[im.property_id].cover) {
            map[im.property_id].cover = im.url;
          }
        });
      }
      setById(map);
    })();
  }, [user]);

  async function send(overrideText) {
    const body = (overrideText ?? text).trim();
    if (!body || busy) return;

    const next = [...messages, { role: 'user', content: body }];
    setMessages(next);
    if (!overrideText) setText('');
    setBusy(true);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const url = process.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1/clever-worker';

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer ' + sess?.session?.access_token,
        },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          listings: listings.slice(0, 40),
        }),
      });

      const out = await res.json();
      setMessages([...next, {
        role: 'assistant',
        content: out.text || T.error,
        ids: out.ids ?? [],
        options: out.options ?? [],
        skippable: !!out.skippable,
        multi: !!out.multi,
      }]);
    } catch (err) {
      logSupabase('assistant.send', { message: String(err) });
      setMessages([...next, { role: 'assistant', content: T.error, ids: [], options: [], skippable: false, multi: false }]);
    }
    setBusy(false);
  }

  function toggleOption(index, opt) {
    setSelected((prev) => {
      const cur = prev[index] ?? [];
      const next = cur.includes(opt) ? cur.filter((o) => o !== opt) : [...cur, opt];
      return { ...prev, [index]: next };
    });
  }

  function confirmSelection(index) {
    const chosen = selected[index] ?? [];
    if (!chosen.length) return;
    send(chosen.join(', '));
  }

  function restart() {
    setMessages([{
      role: 'assistant',
      content: T.opener,
      ids: [],
      options: [T.openerOption1, T.openerOption2],
      skippable: false,
      multi: false,
    }]);
    setSelected({});
    setText('');
  }

  const money = (n) => '\u20AA' + new Intl.NumberFormat('he-IL').format(n);

  if (!user) {
    return (
      <View style={s.wrap}>
        <BackBar title={T.heading} subtitle={T.sub} />
        <View style={s.center}>
          <Ionicons name="sparkles-outline" size={54} color={C.textMuted} />
          <Text style={s.muted}>{T.guest}</Text>
          <Pressable style={s.btn} onPress={() => router.push('/subscribe')}>
            <Text style={s.btnText}>{T.login}</Text>
          </Pressable>
        </View>
        <TabBar active="assistant" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <BackBar
        title={T.heading}
        subtitle={T.sub}
        right={
          <Pressable onPress={restart} hitSlop={8}>
            <Ionicons name="refresh-outline" size={21} color={C.primary} />
          </Pressable>
        }
      />

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => 'm' + i}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const mine = item.role === 'user';
          const cards = (item.ids ?? []).map((id) => byId[id]).filter(Boolean);
          const chosen = selected[index] ?? [];

          return (
            <View>
              <View style={[s.row, mine ? s.rowMine : s.rowBot]}>
                {!mine ? (
                  <View style={s.avatar}>
                    <Ionicons name="sparkles" size={14} color={C.primary} />
                  </View>
                ) : null}
                <View style={[s.bubble, mine ? s.mine : s.bot]}>
                  <Bubble content={item.content} mine={mine} />
                </View>
              </View>

              {cards.length ? (
                <FlatList
                  horizontal
                  data={cards}
                  keyExtractor={(p) => 'c' + p.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingVertical: 10, paddingHorizontal: 4 }}
                  renderItem={({ item: p }) => (
                    <Pressable style={s.card} onPress={() => router.push('/property/' + p.id)}>
                      {p.cover ? (
                        <Image source={{ uri: p.cover }} style={s.cardImg} />
                      ) : (
                        <View style={[s.cardImg, s.cardImgEmpty]}>
                          <Ionicons name="image-outline" size={22} color={C.placeholderIcon} />
                        </View>
                      )}
                      <View style={s.cardBody}>
                        <Text style={s.cardPrice}>
                          {money(p.price)}
                          {p.listing_type === 'rent' ? ' ' + T.perMonth : ''}
                        </Text>
                        <Text style={s.cardTitle} numberOfLines={1}>{p.title}</Text>
                        <Text style={s.cardMeta} numberOfLines={1}>
                          {p.neighborhood ? p.city + ', ' + p.neighborhood : p.city}
                        </Text>
                        <Text style={s.cardSpecs}>
                          {(p.bedrooms ?? '-') + ' ' + T.rooms + '  ·  ' + (p.area_sqm ?? '-') + ' ' + T.sqm}
                        </Text>
                      </View>
                    </Pressable>
                  )}
                />
              ) : null}

              {!mine && !cards.length && ((item.options ?? []).length || item.skippable) ? (
                <View style={s.optionsRow}>
                  {(item.options ?? []).map((opt) => {
                    const isChosen = chosen.includes(opt);
                    return (
                      <Pressable
                        key={opt}
                        style={[s.optionChip, item.multi && isChosen && s.optionChipOn]}
                        disabled={busy}
                        onPress={() => (item.multi ? toggleOption(index, opt) : send(opt))}
                      >
                        <Text style={[s.optionChipText, item.multi && isChosen && s.optionChipTextOn]}>
                          {opt}
                        </Text>
                      </Pressable>
                    );
                  })}
                  {item.multi ? (
                    <Pressable
                      style={[s.confirmChip, !chosen.length && s.confirmChipOff]}
                      disabled={busy || !chosen.length}
                      onPress={() => confirmSelection(index)}
                    >
                      <Text style={s.confirmChipText}>{T.confirm}</Text>
                    </Pressable>
                  ) : null}
                  {item.skippable ? (
                    <Pressable style={s.skipChip} disabled={busy} onPress={() => send(T.skip)}>
                      <Ionicons name="play-skip-forward-outline" size={13} color={C.textMuted} />
                      <Text style={s.skipChipText}>{T.skip}</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        }}
        ListFooterComponent={
          busy ? (
            <View style={[s.row, s.rowBot]}>
              <View style={s.avatar}>
                <Ionicons name="sparkles" size={14} color={C.primary} />
              </View>
              <View style={[s.bubble, s.bot]}>
                <ActivityIndicator size="small" color={C.textMuted} />
              </View>
            </View>
          ) : null
        }
      />

      <View style={s.composer}>
        <Pressable
          style={[s.sendBtn, (!text.trim() || busy) && s.sendOff]}
          onPress={() => send()}
          disabled={!text.trim() || busy}
        >
          <Ionicons name="arrow-up" size={20} color="#fff" />
        </Pressable>
        <TextInput
          style={s.input}
          placeholder={T.placeholder}
          placeholderTextColor="#A9B0BF"
          value={text}
          onChangeText={setText}
          multiline
        />
      </View>

      <TabBar active="assistant" />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#F4F6FA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 7 },
  rowMine: { justifyContent: 'flex-start' },
  rowBot: { justifyContent: 'flex-end' },
  avatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.primaryTint, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 18 },
  mine: { backgroundColor: C.primary, borderBottomLeftRadius: 5 },
  bot: { backgroundColor: C.page, borderBottomRightRadius: 5, borderWidth: 1, borderColor: '#E8ECF3' },
  mineText: { color: '#fff', fontSize: 15, textAlign: 'right', lineHeight: 22 },
  botText: { color: C.text, fontSize: 15, textAlign: 'right', lineHeight: 22 },
  card: { width: 190, borderRadius: 14, backgroundColor: C.page, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  cardImg: { width: '100%', height: 100, backgroundColor: C.placeholder },
  cardImgEmpty: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 10 },
  cardPrice: { fontSize: 15, fontWeight: '800', color: C.primary, textAlign: 'right' },
  cardTitle: { fontSize: 13, fontWeight: '600', color: C.text, textAlign: 'right', marginTop: 3 },
  cardMeta: { fontSize: 11, color: C.textMuted, textAlign: 'right', marginTop: 2 },
  cardSpecs: { fontSize: 11, color: C.textSecondary, textAlign: 'right', marginTop: 4 },
  composer: { flexDirection: 'row-reverse', gap: 8, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10, backgroundColor: C.page, borderTopWidth: 1, borderTopColor: C.border, alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#F1F4F9', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, fontSize: 15, textAlign: 'right', color: C.text, maxHeight: 110 },
  optionsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 4, marginTop: 6, marginBottom: 4 },
  optionChip: { borderWidth: 1, borderColor: C.primary, backgroundColor: C.primaryTint, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 8 },
  optionChipText: { color: C.primary, fontSize: 13, fontWeight: '600' },
  optionChipOn: { backgroundColor: C.primary },
  optionChipTextOn: { color: '#fff' },
  confirmChip: { backgroundColor: C.primary, borderRadius: 16, paddingHorizontal: 15, paddingVertical: 8 },
  confirmChipOff: { backgroundColor: '#C3CBD9' },
  confirmChipText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  skipChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: C.border, backgroundColor: C.page, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 8 },
  skipChipText: { color: C.textMuted, fontSize: 12, fontWeight: '600' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  sendOff: { backgroundColor: '#C3CBD9' },
  muted: { color: C.textSecondary, fontSize: 16, textAlign: 'center' },
  btn: { backgroundColor: C.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
    highlight: { fontWeight: '800', color: C.primary, backgroundColor: C.primaryTint },
});