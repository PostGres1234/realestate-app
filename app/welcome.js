import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { C } from '../lib/theme';

const SEEN_KEY = 'welcome_seen';

const T = {
  brand: 'נכסים',
  tagline: 'קונים ומוכרים דירות\nישירות, בלי מתווכים',
  b1: 'כל פרטי הנכס: תיאור, כתובת, חדרים ושטח',
  b2: 'התכתבות ישירה עם בעלי הנכסים',
  b3: 'פרסום נכס למכירה או להשכרה',
  b4: 'עדכונים על נכסים שמתאימים לכם',
  signup: 'יצירת חשבון',
  login: 'כבר יש לי חשבון',
  guest: 'המשך כאורח',
  guestHint: 'אורחים רואים עיר ומחיר בלבד',
};

export default function Welcome() {
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;

    (async () => {
      if (user) {
        router.replace('/');
        return;
      }
      try {
        const seen = await AsyncStorage.getItem(SEEN_KEY);
        if (seen) {
          router.replace('/');
          return;
        }
      } catch {}
      setChecking(false);
    })();
  }, [user, loading]);

  async function markSeen() {
    try {
      await AsyncStorage.setItem(SEEN_KEY, '1');
    } catch {}
  }

  if (loading || checking) {
    return (
      <View style={[s.wrap, s.center]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <View style={s.hero}>
        <View style={s.logo}>
          <Ionicons name="home" size={38} color="#fff" />
        </View>
        <Text style={s.brand}>{T.brand}</Text>
        <Text style={s.tagline}>{T.tagline}</Text>
      </View>

      <View style={s.benefits}>
        {[T.b1, T.b2, T.b3, T.b4].map((b) => (
          <View key={b} style={s.benefitRow}>
            <Ionicons name="checkmark-circle" size={20} color={C.primary} />
            <Text style={s.benefitText}>{b}</Text>
          </View>
        ))}
      </View>

      <View style={s.actions}>
        <Pressable
          style={s.btn}
          onPress={async () => {
            await markSeen();
            router.replace('/(auth)/signup');
          }}
        >
          <Text style={s.btnText}>{T.signup}</Text>
        </Pressable>

        <Pressable
          style={s.btnOutline}
          onPress={async () => {
            await markSeen();
            router.replace('/(auth)/login');
          }}
        >
          <Text style={s.btnOutlineText}>{T.login}</Text>
        </Pressable>

        <Pressable
          style={s.guestBtn}
          onPress={async () => {
            await markSeen();
            router.replace('/');
          }}
        >
          <Text style={s.guestText}>{T.guest}</Text>
          <Text style={s.guestHint}>{T.guestHint}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.page, paddingHorizontal: 28 },
  center: { alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', marginTop: 110 },
  logo: {
    width: 78, height: 78, borderRadius: 24,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 5,
  },
  brand: { fontSize: 30, fontWeight: '800', color: C.text, marginTop: 18 },
  tagline: { fontSize: 15, color: C.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 23 },
  benefits: { gap: 13, marginTop: 44 },
  benefitRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 11 },
  benefitText: { fontSize: 14, color: C.textSecondary, flex: 1, textAlign: 'right', lineHeight: 20 },
  actions: { marginTop: 'auto', marginBottom: 44 },
  btn: { backgroundColor: C.primary, padding: 17, borderRadius: 15, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnOutline: { borderWidth: 1.5, borderColor: C.primary, padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 11 },
  btnOutlineText: { color: C.primary, fontWeight: '700', fontSize: 15 },
  guestBtn: { alignItems: 'center', marginTop: 22 },
  guestText: { color: C.textSecondary, fontWeight: '600', fontSize: 15 },
  guestHint: { color: C.textMuted, fontSize: 12, marginTop: 3 },
});