import { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { getDraft, saveDraft, clearDraft, markSeen } from '../../lib/inbox';
import { placeCall } from '../../lib/calls';
import { logSupabase } from '../../lib/logger';
import { api } from '../../lib/api';
import { C } from '../../lib/theme';
import ReportSheet from '../../components/ReportSheet';

const T = {
  call: 'התקשרות',
  callTitle: 'שיחה',
  placeholder: 'הודעה...',
  empty: 'אין עדיין הודעות',
  emptyHint: 'ההודעות שלכם יופיעו כאן',
  loadFail: 'לא ניתן לטעון את השיחה',
  back: 'חזרה',
  waiting: 'ממתינים לתגובה של בעל הנכס',
  today: 'היום',
  yesterday: 'אתמול',
  sendFail: 'לא ניתן לשלוח את ההודעה',
  editFail: 'לא ניתן לערוך את ההודעה',
  editIntroTitle: 'עריכת הפרטים שלכם',
  fNameLabel: 'שם פרטי',
  lNameLabel: 'שם משפחה',
  occLabel: 'עיסוק',
  noteLabel: 'הודעה',
  save: 'שמירה',
  cancel: 'ביטול',
};

const GREETING_PREFIX = 'שלום, מתעניין/ת בנכס: ';

function parseIntro(body) {
  if (!body.startsWith(GREETING_PREFIX)) return null;
  const nlIndex = body.indexOf('\n');
  if (nlIndex === -1) return null;

  const greeting = body.slice(0, nlIndex);
  const rest = body.slice(nlIndex + 1);

  const nameMatch = rest.match(/^שם:\s*(.*)$/m);
  const occMatch = rest.match(/^עיסוק:\s*(.*)$/m);
  if (!nameMatch || !occMatch) return null;

  const nameParts = nameMatch[1].trim().split(/\s+/);
  const fName = nameParts[0] ?? '';
  const lName = nameParts.slice(1).join(' ');
  const occupation = occMatch[1].trim();

  const occLineEnd = rest.indexOf(occMatch[0]) + occMatch[0].length;
  const note = rest.slice(occLineEnd).replace(/^\n+/, '').trim();

  return { greeting, fName, lName, occupation, note };
}

function buildIntroBody({ greeting, fName, lName, occupation, note }) {
  let body = greeting + '\n' + 'שם: ' + fName.trim() + ' ' + lName.trim()
    + '\nעיסוק: ' + occupation.trim();
  if (note.trim()) body += '\n\n' + note.trim();
  return body;
}

export default function Chat() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [conv, setConv] = useState(null);
  const [prop, setProp] = useState(null);
  const [buyer, setBuyer] = useState(null);
  const [callable, setCallable] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [introEdit, setIntroEdit] = useState(null);
  const listRef = useRef(null);

  useEffect(() => {
    (async () => {
      const saved = await getDraft(id);
      if (saved) setText(saved);
      await markSeen(id);
    })();
  }, [id]);

  useEffect(() => {
    async function loadCallInfo() {
      if (!user?.id) return;
      try {
        const info = await api.get('/api/calls/' + id);
        setCallable(info.callable);
        setBuyer(info.buyer);
      } catch (err) {
        logSupabase('chat.callInfo', { message: err.message }, { conversationId: id });
      }
    }

    (async () => {
      const { data: c, error: convErr } = await supabase
        .from('conversations')
        .select('id, property_id, buyer_id, seller_id, intro_sent, unlocked')
        .eq('id', id)
        .single();

      if (convErr) logSupabase('chat.conversation', convErr, { conversationId: id });
      setConv(c);

      if (c) {
        const { data: pr } = await supabase
          .from('properties')
          .select('title, city, price')
          .eq('id', c.property_id)
          .maybeSingle();
        setProp(pr);
      }

      if (c) await loadCallInfo();

      const { data, error } = await supabase
        .from('messages')
        .select('id, sender_id, body, created_at')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });

      if (error) {
        logSupabase('chat.load', error, { conversationId: id });
        setErr(error.message);
        setLoading(false);
        return;
      }
      setMessages(data ?? []);
      setLoading(false);
    })();

    const topic = 'room:' + id;
    const stale = supabase.getChannels().find((ch) => ch.topic === 'realtime:' + topic);
    if (stale) supabase.removeChannel(stale);

    const channel = supabase
      .channel(topic)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: 'conversation_id=eq.' + id,
        },
        async (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          setConv((c) => {
            if (!c) return c;
            if (payload.new.sender_id === c.seller_id) return { ...c, unlocked: true };
            return c;
          });
          await loadCallInfo();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: 'conversation_id=eq.' + id,
        },
        (payload) => {
          setMessages((prev) => prev.map((m) => (m.id === payload.new.id ? payload.new : m)));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, user?.id]);

  function onChangeText(v) {
    setText(v);
    saveDraft(id, v);
  }

  async function send() {
    const body = text.trim();
    if (!body || !user) return;
    setText('');
    await clearDraft(id);

    try {
      await api.post('/api/messages', { conversationId: id, body });
    } catch (err) {
      logSupabase('chat.send', { message: err.message }, { conversationId: id });
      setText(body);
      saveDraft(id, body);
      Alert.alert(T.sendFail, err.message);
    }
  }

  function onLongPressMessage(item) {
    const parsed = parseIntro(item.body);
    if (parsed) return setIntroEdit({ id: item.id, ...parsed });
    startEdit(item);
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditText(item.body);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText('');
  }

  async function saveEdit(item) {
    const trimmed = editText.trim();
    if (!trimmed) return;
    if (trimmed === item.body) return cancelEdit();

    try {
      await api.patch('/api/messages/' + item.id, { body: trimmed });
    } catch (err) {
      logSupabase('chat.editMessage', { message: err.message }, { messageId: item.id });
      Alert.alert(T.editFail, err.message);
      return;
    }

    setMessages((prev) => prev.map((m) => (m.id === item.id ? { ...m, body: trimmed } : m)));
    cancelEdit();
  }

  async function saveIntroEdit() {
    if (!introEdit.fName.trim() || !introEdit.lName.trim() || !introEdit.occupation.trim()) return;

    const body = buildIntroBody(introEdit);

    try {
      await api.patch('/api/messages/' + introEdit.id, { body });
    } catch (err) {
      logSupabase('chat.editMessage', { message: err.message }, { messageId: introEdit.id });
      Alert.alert(T.editFail, err.message);
      return;
    }

    setMessages((prev) => prev.map((m) => (m.id === introEdit.id ? { ...m, body } : m)));
    setIntroEdit(null);
  }

  async function onCall() {
    const res = await placeCall(id);
    if (!res.ok) Alert.alert(T.callTitle, res.message);
  }

  const time = (iso) =>
    new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

  const dayLabel = (iso) => {
    const d = new Date(iso);
    const today = new Date();
    const yest = new Date();
    yest.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return T.today;
    if (d.toDateString() === yest.toDateString()) return T.yesterday;
    return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });
  };

  const money = (n) => '\u20AA' + new Intl.NumberFormat('he-IL').format(n);

  const isBuyer = conv && user?.id === conv.buyer_id;
  const locked = isBuyer && conv?.intro_sent && !conv?.unlocked;
  const otherUser = conv
    ? (user?.id === conv.buyer_id ? conv.seller_id : conv.buyer_id)
    : null;

  const withDates = [];
  let lastDay = null;
  messages.forEach((m) => {
    const label = dayLabel(m.created_at);
    if (label !== lastDay) {
      withDates.push({ id: 'sep-' + m.id, sep: true, label });
      lastDay = label;
    }
    withDates.push(m);
  });

  if (err) {
    return (
      <View style={s.center}>
        <Text style={s.errTitle}>{T.loadFail}</Text>
        <Text style={s.errMeta}>{err}</Text>
        <Pressable onPress={() => router.replace('/messages')}>
          <Text style={s.link}>{T.back}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      <View style={s.header}>
        <View style={s.headerTop}>
          <Pressable
            style={s.backBtn}
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/messages');
            }}
            hitSlop={10}
          >
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle} numberOfLines={1}>
              {buyer ? buyer.full_name : (prop?.title ?? '')}
            </Text>
            <Text style={s.headerSub} numberOfLines={1}>
              {buyer
                ? (buyer.occupation ?? prop?.city ?? '')
                : (prop ? prop.city + '  ·  ' + money(prop.price) : '')}
            </Text>
          </View>

          <Pressable onPress={() => setReportOpen(true)} hitSlop={8}>
            <Ionicons name="flag-outline" size={20} color={C.textMuted} />
          </Pressable>

          {callable ? (
            <Pressable style={s.callBtn} onPress={onCall} hitSlop={8}>
              <Ionicons name="call" size={18} color="#fff" />
            </Pressable>
          ) : null}
        </View>

        {buyer?.phone ? (
          <Pressable style={s.phoneChip} onPress={callable ? onCall : undefined}>
            <Ionicons name="call-outline" size={13} color={C.primary} />
            <Text style={s.phoneText}>{buyer.phone}</Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 50 }} size="large" color={C.primary} />
      ) : (
        <FlatList
          ref={listRef}
          data={withDates}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 8, gap: 6 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Ionicons name="chatbubbles-outline" size={44} color={C.textMuted} />
              <Text style={s.emptyTitle}>{T.empty}</Text>
              <Text style={s.emptyHint}>{T.emptyHint}</Text>
            </View>
          }
          renderItem={({ item }) => {
            if (item.sep) {
              return (
                <View style={s.sepRow}>
                  <View style={s.sepLine} />
                  <Text style={s.sepText}>{item.label}</Text>
                  <View style={s.sepLine} />
                </View>
              );
            }
            const mine = item.sender_id === user?.id;
            const isEditing = editingId === item.id;
            return (
              <View style={[s.bubbleRow, mine ? s.rowMine : s.rowTheirs]}>
                <Pressable
                  style={[s.bubble, mine ? s.mine : s.theirs]}
                  onLongPress={mine ? () => onLongPressMessage(item) : undefined}
                  disabled={!mine}
                >
                  {isEditing ? (
                    <View>
                      <TextInput
                        style={s.editInput}
                        value={editText}
                        onChangeText={setEditText}
                        multiline
                        autoFocus
                      />
                      <View style={s.editActions}>
                        <Pressable onPress={cancelEdit} hitSlop={8}>
                          <Ionicons name="close" size={18} color="rgba(255,255,255,0.85)" />
                        </Pressable>
                        <Pressable onPress={() => saveEdit(item)} hitSlop={8}>
                          <Ionicons name="checkmark" size={18} color="#fff" />
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <>
                      <Text style={mine ? s.mineText : s.theirsText}>{item.body}</Text>
                      <Text style={mine ? s.mineTime : s.theirsTime}>
                        {time(item.created_at)}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            );
          }}
        />
      )}

      {locked ? (
        <View style={s.lockedBar}>
          <Ionicons name="hourglass-outline" size={17} color={C.textMuted} />
          <Text style={s.lockedText}>{T.waiting}</Text>
        </View>
      ) : (
        <View style={s.composer}>
          <Pressable
            style={[s.sendBtn, !text.trim() && s.sendBtnOff]}
            onPress={send}
            disabled={!text.trim()}
          >
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </Pressable>
          <TextInput
            style={s.input}
            placeholder={T.placeholder}
            placeholderTextColor="#A9B0BF"
            value={text}
            onChangeText={onChangeText}
            multiline
          />
        </View>
      )}

      <ReportSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        targetUser={otherUser}
        onBlocked={() => router.replace('/messages')}
      />

      <Modal visible={!!introEdit} transparent animationType="slide"
        onRequestClose={() => setIntroEdit(null)}>
        <View style={s.backdrop}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
            keyboardShouldPersistTaps="handled">
            <View style={s.sheet}>
              <Text style={s.sheetTitle}>{T.editIntroTitle}</Text>

              {introEdit ? (
                <>
                  <Text style={s.fLabel}>{T.fNameLabel}</Text>
                  <TextInput style={s.fInput} value={introEdit.fName}
                    onChangeText={(v) => setIntroEdit((p) => ({ ...p, fName: v }))} />

                  <Text style={s.fLabel}>{T.lNameLabel}</Text>
                  <TextInput style={s.fInput} value={introEdit.lName}
                    onChangeText={(v) => setIntroEdit((p) => ({ ...p, lName: v }))} />

                  <Text style={s.fLabel}>{T.occLabel}</Text>
                  <TextInput style={s.fInput} value={introEdit.occupation}
                    onChangeText={(v) => setIntroEdit((p) => ({ ...p, occupation: v }))} />

                  <Text style={s.fLabel}>{T.noteLabel}</Text>
                  <TextInput style={[s.fInput, { minHeight: 80, textAlignVertical: 'top' }]}
                    multiline value={introEdit.note}
                    onChangeText={(v) => setIntroEdit((p) => ({ ...p, note: v }))} />

                  <Pressable style={s.btn} onPress={saveIntroEdit}>
                    <Text style={s.btnText}>{T.save}</Text>
                  </Pressable>
                  <Pressable onPress={() => setIntroEdit(null)} style={{ marginTop: 12 }}>
                    <Text style={s.cancelText}>{T.cancel}</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#F4F6FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  errTitle: { fontSize: 18, fontWeight: '600', color: C.text },
  errMeta: { color: C.textMuted, fontSize: 14, textAlign: 'center' },
  link: { color: C.primary, fontWeight: '600', fontSize: 15 },
  header: { backgroundColor: C.page, paddingTop: 44, paddingBottom: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: C.text, textAlign: 'right' },
  headerSub: { fontSize: 12, color: C.textMuted, textAlign: 'right', marginTop: 2 },
  callBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#1D9E75', alignItems: 'center', justifyContent: 'center' },
  phoneChip: { flexDirection: 'row-reverse', alignSelf: 'flex-end', alignItems: 'center', gap: 5, backgroundColor: C.primaryTint, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, marginTop: 10, marginRight: 46 },
  phoneText: { color: C.primary, fontSize: 12, fontWeight: '700' },
  sepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 10 },
  sepLine: { flex: 1, height: 1, backgroundColor: '#E3E8F0' },
  sepText: { fontSize: 11, color: C.textMuted, fontWeight: '600' },
  bubbleRow: { flexDirection: 'row', width: '100%' },
  rowMine: { justifyContent: 'flex-start' },
  rowTheirs: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 7, borderRadius: 20 },
  mine: { backgroundColor: C.primary, borderBottomLeftRadius: 6 },
  theirs: { backgroundColor: C.page, borderBottomRightRadius: 6, borderWidth: 1, borderColor: '#E8ECF3' },
  mineText: { color: '#fff', fontSize: 15, textAlign: 'right', lineHeight: 21 },
  theirsText: { color: C.text, fontSize: 15, textAlign: 'right', lineHeight: 21 },
  mineTime: { color: 'rgba(255,255,255,0.75)', fontSize: 10, marginTop: 3, textAlign: 'left' },
  theirsTime: { color: C.textMuted, fontSize: 10, marginTop: 3, textAlign: 'left' },
  editInput: { color: '#fff', fontSize: 15, textAlign: 'right', lineHeight: 21, minWidth: 140, padding: 0 },
  editActions: { flexDirection: 'row', gap: 14, marginTop: 6 },
  emptyBox: { alignItems: 'center', marginTop: 70, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: C.textSecondary },
  emptyHint: { fontSize: 13, color: C.textMuted },
  composer: { flexDirection: 'row-reverse', gap: 8, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 28, backgroundColor: C.page, borderTopWidth: 1, borderTopColor: C.border, alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#F1F4F9', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, fontSize: 15, textAlign: 'right', color: C.text, maxHeight: 110 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { backgroundColor: '#C3CBD9' },
  lockedBar: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, paddingBottom: 32, backgroundColor: C.page, borderTopWidth: 1, borderTopColor: C.border },
  lockedText: { color: C.textMuted, fontSize: 13 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: C.page, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: C.text, textAlign: 'right', marginBottom: 8 },
  fLabel: { fontSize: 13, fontWeight: '600', color: C.text, textAlign: 'right', marginBottom: 5, marginTop: 10 },
  fInput: { borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 12, padding: 12, fontSize: 15, textAlign: 'right', color: C.text },
  btn: { backgroundColor: C.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 20 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  cancelText: { color: C.textMuted, textAlign: 'center', fontSize: 14 },
});