import { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { getDraft, saveDraft, clearDraft, markSeen } from '../../lib/inbox';
const T = {
  back: 'חזרה',
  placeholder: 'כתבו הודעה...',
  send: 'שליחה',
  empty: 'אין עדיין הודעות. שלחו את הראשונה.',
  loadFail: 'לא ניתן לטעון את השיחה',
};

export default function Chat() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
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
    <KeyboardAvoidingView
      style={s.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={s.link}>{T.back}</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" />
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

      <View style={s.composer}>
        <Pressable style={s.sendBtn} onPress={send}>
          <Text style={s.sendText}>{T.send}</Text>
        </Pressable>
        <TextInput
          style={s.input}
          placeholder={T.placeholder}
          placeholderTextColor="#aaa"
          value={text}
          onChangeText={onChangeText}
          multiline
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  header: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'flex-end' },
  link: { color: '#1f6feb', fontWeight: '600', fontSize: 16 },
  errTitle: { fontSize: 18, fontWeight: '600' },
  meta: { color: '#666', fontSize: 14, textAlign: 'center' },
  muted: { color: '#666', textAlign: 'center', marginTop: 40 },
  bubble: { maxWidth: '78%', padding: 12, borderRadius: 16 },
  mine: { backgroundColor: '#1f6feb', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  theirs: { backgroundColor: '#f0f0f0', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  mineText: { color: '#fff', fontSize: 16, textAlign: 'right' },
  theirsText: { color: '#111', fontSize: 16, textAlign: 'right' },
  mineTime: { color: '#cfe0ff', fontSize: 11, marginTop: 4, textAlign: 'left' },
  theirsTime: { color: '#999', fontSize: 11, marginTop: 4, textAlign: 'left' },
  composer: { flexDirection: 'row-reverse', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: '#eee', alignItems: 'flex-end' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, textAlign: 'right', maxHeight: 100 },
  sendBtn: { backgroundColor: '#1f6feb', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20 },
  sendText: { color: '#fff', fontWeight: '600' },
});