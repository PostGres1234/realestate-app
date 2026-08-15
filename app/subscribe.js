import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function Subscribe() {
  return (
    <View style={s.wrap}>
      <Text style={s.h1}>מנוי</Text>
      <Text style={s.muted}>
        התשלומים עדיין לא מוכנים. בינתיים אפשר להוסיף שורה בטבלת
        subscribers בסופאבייס כדי לבדוק את הזרימה.
      </Text>
      <Pressable onPress={() => router.back()}>
        <Text style={s.link}>← חזרה</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  h1: { fontSize: 28, fontWeight: '700', textAlign: 'right' },
  muted: { color: '#666', fontSize: 15, lineHeight: 22, textAlign: 'right' },
  link: { color: '#1f6feb', fontWeight: '600', fontSize: 16, textAlign: 'right' },
});