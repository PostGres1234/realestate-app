import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { C } from '../lib/theme';

export default function BackBar({ title, subtitle, right, floating = false }) {
  function back() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  if (floating) {
    return (
      <Pressable style={s.float} onPress={back} hitSlop={8}>
        <Ionicons name="chevron-forward" size={20} color={C.primary} />
      </Pressable>
    );
  }

  return (
    <View style={s.bar}>
      <Pressable style={s.btn} onPress={back} hitSlop={10}>
        <Ionicons name="chevron-forward" size={22} color="#fff" />
      </Pressable>

      <View style={{ flex: 1 }}>
        {title ? <Text style={s.title} numberOfLines={1}>{title}</Text> : null}
        {subtitle ? <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>

      {right ?? <View style={{ width: 38 }} />}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingTop: 44,
    paddingBottom: 10,
    paddingHorizontal: 12,
    backgroundColor: C.page,
  },
  btn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  title: { fontSize: 22, fontWeight: '800', color: C.text, textAlign: 'right' },
  subtitle: { fontSize: 12, color: C.textMuted, textAlign: 'right', marginTop: 1 },
  float: {
    position: 'absolute', top: 52, right: 16, zIndex: 10,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#1A1D26',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
});