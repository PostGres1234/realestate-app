import { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { getDraft, saveDraft, clearDraft, markSeen } from '../../lib/inbox';
import { C } from '../../lib/theme';

const T = {
  back: 'חזרה',
  placeholder: 'כתבו הודעה...',
  send: 'שליחה',
  empty: 'אין עדיין הודעות.',
  loadFail: 'לא ניתן לטעון את השיחה',
  waiting: 'הפנייה נשלחה. תוכלו לכתוב שוב לאחר שהמוכר יגיב.',
};

export default function Chat() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const listRef = useRef(null);

  useEffect(() => {
    (async () => {
      const saved = await getDraft(id);
      if (saved) setText(saved);
      await markSeen(id);
    })();
  }, [id]);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase
        .from('conversations')
        .select('id, buyer_id, seller_id, intro_sent, unlocked')
        .eq('id', id)
        .single();
      setConv(c);

      const { data, error } = await supabase
        .from('messages')
        .select('id, sender_id, body, created_at')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });

      if (error) {
        console.log('chat error', error.message);
        setErr(error.message);
        setLoading(false);
        return;
      }
      setMessages(data ?? []);
      setLoading(false);
    })();

    const channel = supabase
      .channel('room:' + id)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: 'conversation_id=eq.' + id,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          setConv((c) => {
            if (!c) return c;
            if (payload.new.sender_id === c.seller_id) return { ...c, unlocked: true };
            return c;
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  function onChangeText(v) {
    setText(v);
    saveDraft(id, v);
  }

  async function send() {
    const body = text.trim();
    if (!body || !user) return;
    setText('');
    await clearDraft(id);

    const { error } = await supabase.from('messages').insert({
      conversation_id: id,
      sender_id: user.id,
      body,
    });

    if (error) {
      console.log('send error', error.message);
      setText(body);
      saveDraft(id, body);
    }
  }

  const time = (iso) =>
    new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

  const isBuyer = conv && user?.id === conv.buyer_id;
  const locked = isBuyer && conv?.intro_sent && !conv?.unlocked;

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

  return (
    <KeyboardAvoidingView style={s.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={s.link}>{T.back}</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={C.primary} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={<Text style={s.muted}>{T.empty}</Text>}
          renderItem={({ item }) => {
            const mine = item.sender_id === user?.id;
            return (
              <View style={[s.bubble, mine ? s.mine : s.theirs]}>
                <Text style={mine ? s.mineText : s.theirsText}>{item.body}</Text>
                <Text style={mine ? s.mineTime : s.theirsTime}>{time(item.created_at)}</Text>
              </View>
            );
          }}
        />
      )}

      {locked ? (
        <View style={s.lockedBar}>
          <Ionicons name="time-outline" size={18} color={C.textMuted} />
          <Text style={s.lockedText}>{T.waiting}</Text>
        </View>
      ) : (
        <View style={s.composer}>
          <Pressable style={s.sendBtn} onPress={send}>
            <Text style={s.sendText}>{T.send}</Text>
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
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.page },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  header: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.border, alignItems: 'flex-end' },
  link: { color: C.primary, fontWeight: '600', fontSize: 15 },
  errTitle: { fontSize: 18, fontWeight: '600', color: C.text },
  meta: { color: C.textMuted, fontSize: 14, textAlign: 'center' },
  muted: { color: C.textMuted, textAlign: 'center', marginTop: 40 },
  bubble: { maxWidth: '78%', padding: 12, borderRadius: 16 },
  mine: { backgroundColor: C.primary, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  theirs: { backgroundColor: C.surface, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  mineText: { color: '#fff', fontSize: 15, textAlign: 'right', lineHeight: 21 },
  theirsText: { color: C.text, fontSize: 15, textAlign: 'right', lineHeight: 21 },
  mineTime: { color: '#cfe0ff', fontSize: 11, marginTop: 4, textAlign: 'left' },
  theirsTime: { color: C.textMuted, fontSize: 11, marginTop: 4, textAlign: 'left' },
  composer: { flexDirection: 'row-reverse', gap: 8, padding: 12, paddingBottom: 28, borderTopWidth: 1, borderTopColor: C.border, alignItems: 'flex-end' },
  input: { flex: 1, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 11, fontSize: 15, textAlign: 'right', color: C.text, maxHeight: 100 },
  sendBtn: { backgroundColor: C.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20 },
  sendText: { color: '#fff', fontWeight: '600' },
  lockedBar: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 18, paddingBottom: 32, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.surface },
  lockedText: { color: C.textMuted, fontSize: 13, textAlign: 'center', flex: 1 },
});