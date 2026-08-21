import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { C } from '../lib/theme';

const T = {
  heading: 'הצטרפו כדי להמשיך',
  body: 'אורחים רואים עיר ומחיר בלבד. חשבון פותח גישה מלאה לכל הנכסים ולמוכרים.',
  b1: 'כל פרטי הנכס: תיאור, כתובת, חדרים ושטח',
  b2: 'יצירת קשר והתכתבות עם מוכרים',
  b3: 'פרסום נכסים למכירה או השכרה',
  b4: 'שמירת נכסים ועדכונים לפי העדפות',
  signup: 'יצירת חשבון',
  login: 'כבר יש לי חשבון',
  back: 'חזרה',
};

export default function Subscribe() {
  return (
    <View style={s.wrap}>
      <View style={s.icon}>
        <Ionicons name="lock-closed-outline" size={30} color={C.primary} />
      </View>

      <Text style={s.h1}>{T.heading}</Text>
      <Text style={s.body}>{T.body}</Text>

      <View style={s.list}>
        {[T.b1, T.b2, T.b3, T.b4].map((b) => (
          <View key={b} style={s.row}>
            <Ionicons name="checkmark-circle" size={19} color={C.primary} />
            <Text style={s.rowText}>{b}</Text>
          </View>
        ))}
      </View>

      <Pressable style={s.btn} onPress={() => router.replace('/(auth)/signup')}>
        <Text style={s.btnText}>{T.signup}</Text>
      </Pressable>
      <Pressable style={s.btnOutline} onPress={() => router.replace('/(auth)/login')}>
        <Text style={s.btnOutlineText}>{T.login}</Text>
      </Pressable>
      <Pressable onPress={() => router.replace('/')}>
        <Text style={s.link}>{T.back}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.page, justifyContent: 'center', padding: 24 },
  icon: { width: 62, height: 62, borderRadius: 31, backgroundColor: C.primaryTint, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 18 },
  h1: { fontSize: 24, fontWeight: '700', color: C.text, textAlign: 'center' },
  body: { fontSize: 14, color: C.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 21 },
  list: { backgroundColor: C.surface, borderRadius: 16, padding: 16, gap: 11, marginVertical: 24 },
  row: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 9 },
  rowText: { fontSize: 13, color: C.textSecondary, flex: 1, textAlign: 'right', lineHeight: 19 },
  btn: { backgroundColor: C.primary, padding: 16, borderRadius: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  btnOutline: { borderWidth: 1, borderColor: C.primary, padding: 15, borderRadius: 14, alignItems: 'center', marginTop: 10 },
  btnOutlineText: { color: C.primary, fontWeight: '600', fontSize: 15 },
  link: { textAlign: 'center', color: C.textMuted, marginTop: 18, fontSize: 13 },
});