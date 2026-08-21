import { View, Text, TextInput, Pressable, ScrollView, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../lib/theme';

const T = {
  heading: 'סינון מתקדם',
  priceLabel: 'טווח מחירים',
  from: 'ממחיר',
  to: 'עד מחיר',
  roomsLabel: 'מספר חדרים',
  bathsLabel: 'חדרי רחצה',
  featuresLabel: 'מאפיינים',
  apply: 'הצגת תוצאות',
  clear: 'ניקוי הכל',
  close: 'סגירה',
};

export const FEATURES = [
  { key: 'has_balcony', label: 'מרפסת', icon: 'sunny-outline' },
  { key: 'has_shelter', label: 'ממ"ד', icon: 'shield-outline' },
  { key: 'has_parking', label: 'חניה פרטית', icon: 'car-outline' },
  { key: 'has_elevator', label: 'מעלית', icon: 'swap-vertical-outline' },
  { key: 'has_yard', label: 'חצר', icon: 'leaf-outline' },
];

export default function FilterSheet({ visible, onClose, filters, setFilters, onApply, onClear }) {
  const f = filters;
  const set = (k, v) => setFilters({ ...f, [k]: v });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.header}>
            <Text style={s.h1}>{T.heading}</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={C.textMuted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.label}>{T.priceLabel}</Text>
            <View style={s.pair}>
              <TextInput
                style={s.input}
                placeholder={T.from}
                placeholderTextColor="#A9B0BF"
                keyboardType="numeric"
                value={f.minPrice}
                onChangeText={(v) => set('minPrice', v)}
              />
              <TextInput
                style={s.input}
                placeholder={T.to}
                placeholderTextColor="#A9B0BF"
                keyboardType="numeric"
                value={f.maxPrice}
                onChangeText={(v) => set('maxPrice', v)}
              />
            </View>

            <Text style={s.label}>{T.roomsLabel}</Text>
            <View style={s.pair}>
              <TextInput
                style={s.input}
                placeholder="מ-"
                placeholderTextColor="#A9B0BF"
                keyboardType="numeric"
                value={f.minRooms}
                onChangeText={(v) => set('minRooms', v)}
              />
              <TextInput
                style={s.input}
                placeholder="עד"
                placeholderTextColor="#A9B0BF"
                keyboardType="numeric"
                value={f.maxRooms}
                onChangeText={(v) => set('maxRooms', v)}
              />
            </View>

            <Text style={s.label}>{T.bathsLabel}</Text>
            <View style={s.pair}>
              <TextInput
                style={s.input}
                placeholder="מ-"
                placeholderTextColor="#A9B0BF"
                keyboardType="numeric"
                value={f.minBaths}
                onChangeText={(v) => set('minBaths', v)}
              />
              <TextInput
                style={s.input}
                placeholder="עד"
                placeholderTextColor="#A9B0BF"
                keyboardType="numeric"
                value={f.maxBaths}
                onChangeText={(v) => set('maxBaths', v)}
              />
            </View>

            <Text style={s.label}>{T.featuresLabel}</Text>
            <View style={s.features}>
              {FEATURES.map((x) => {
                const on = !!f[x.key];
                return (
                  <Pressable
                    key={x.key}
                    style={[s.feature, on && s.featureOn]}
                    onPress={() => set(x.key, !on)}
                  >
                    <Ionicons name={x.icon} size={17} color={on ? '#fff' : C.primary} />
                    <Text style={on ? s.featureTextOn : s.featureText}>{x.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={s.footer}>
            <Pressable style={s.applyBtn} onPress={onApply}>
              <Text style={s.applyText}>{T.apply}</Text>
            </Pressable>
            <Pressable style={s.clearBtn} onPress={onClear}>
              <Text style={s.clearText}>{T.clear}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.page, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  h1: { fontSize: 20, fontWeight: '700', color: C.text },
  label: { fontSize: 14, fontWeight: '600', color: C.text, textAlign: 'right', marginBottom: 8, marginTop: 6 },
  pair: { flexDirection: 'row-reverse', gap: 10, marginBottom: 14 },
  input: { flex: 1, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 14, padding: 13, fontSize: 15, textAlign: 'right', color: C.text },
  features: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  feature: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  featureOn: { backgroundColor: C.primary, borderColor: C.primary },
  featureText: { color: C.textSecondary, fontSize: 14 },
  featureTextOn: { color: '#fff', fontSize: 14, fontWeight: '600' },
  footer: { gap: 8, marginTop: 16 },
  applyBtn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  applyText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  clearBtn: { borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  clearText: { color: C.textSecondary, fontWeight: '600', fontSize: 14 },
});