import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

export default function Account() {
  const { user } = useAuth();
  return (
    <View style={s.wrap}>
      <Text style={s.h1}>החשבון שלי</Text>
      <Text style={s.muted}>{user?.email}</Text>
      <Pressable style={s.btn} onPress={async () => {
        await supabase.auth.signOut();
        router.replace('/');
      }}>
        <Text style={s.btnText}>התנתקות</Text>
      </Pressable>
      <Pressable onPress={() => router.replace('/')}>
        <Text style={s.link}>← חזרה לנכסים</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  h1: { fontSize: 28, fontWeight: '700', textAlign: 'right' },
  muted: { color: '#666', fontSize: 15, textAlign: 'right' },
  btn: { backgroundColor: '#1f6feb', padding: 16, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { color: '#1f6feb', textAlign: 'center' },
});