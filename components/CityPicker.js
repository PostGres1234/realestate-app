import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Modal, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { logSupabase } from '../lib/logger';
import { C } from '../lib/theme';

const T = {
  title: 'בחירת מיקום',
  search: 'חיפוש עיר או שכונה',
  all: 'כל הארץ',
  allHint: 'הצגת נכסים מכל המדינה',
  selected: 'נבחרו',
  cities: 'ערים',
  hoods: 'שכונות',
  clear: 'ניקוי',
  apply: 'הצגת תוצאות',
  empty: 'לא נמצאו תוצאות',
};

export default function CityPicker({ visible, onClose, selected, onApply }) {
  const [term, setTerm] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState(selected ?? []);

  useEffect(() => {
    if (visible) setPicked(selected ?? []);
  }, [visible, selected]);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);

    const timer = setTimeout(async () => {
      let q = supabase
        .from('locations')
        .select('id, name, kind, parent_city')
        .order('kind', { ascending: true })
        .order('name', { ascending: true })
        .limit(120);

      if (term.trim()) q = q.ilike('name', '%' + term.trim() + '%');

      const { data, error } = await q;
      if (error) logSupabase('citypicker.load', error);
      setRows(data ?? []);
      setLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [term, visible]);

  function toggle(name) {
    setPicked((p) =>
      p.includes(name) ? p.filter((x) => x !== name) : [...p, name]
    );
  }

  const cities = rows.filter((r) => r.kind === 'city');
  const hoods = rows.filter((r) => r.kind === 'neighborhood');

  const sections = [];
  if (cities.length) {
    sections.push({ header: T.cities });
    cities.forEach((c) => sections.push(c));
  }
  if (hoods.length) {
    sections.push({ header: T.hoods });
    hoods.forEach((h) => sections.push(h));
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.wrap}>
        <View style={s.header}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={26} color={C.text} />
          </Pressable>
          <Text style={s.title}>{T.title}</Text>
          <View style={{ width: 26 }} />
        </View>

        <View style={s.searchBox}>
          <Ionicons name="search" size={18} color={C.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder={T.search}
            placeholderTextColor="#A9B0BF"
            value={term}
            onChangeText={setTerm}
            autoCorrect={false}
          />
          {term.length ? (
            <Pressable onPress={() => setTerm('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={C.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {picked.length ? (
          <View style={s.chipsWrap}>
            <Text style={s.selectedLabel}>{T.selected}</Text>
            <View style={s.chips}>
              {picked.map((n) => (
                <Pressable key={n} style={s.chip} onPress={() => toggle(n)}>
                  <Text style={s.chipText}>{n}</Text>
                  <Ionicons name="close" size={14} color={C.primary} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <Pressable
          style={[s.allRow, picked.length === 0 && s.allRowOn]}
          onPress={() => setPicked([])}
        >
          <View style={s.allIcon}>
            <Ionicons name="earth-outline" size={19} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.allTitle}>{T.all}</Text>
            <Text style={s.allHint}>{T.allHint}</Text>
          </View>
          {picked.length === 0 ? (
            <Ionicons name="checkmark-circle" size={22} color={C.primary} />
          ) : null}
        </Pressable>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 30 }} color={C.primary} />
        ) : (
          <FlatList
            data={sections}
            keyExtractor={(item, i) => item.header ? 'h' + i : item.id}
            contentContainerStyle={{ paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={s.empty}>{T.empty}</Text>}
            renderItem={({ item }) => {
              if (item.header) {
                return <Text style={s.sectionHeader}>{item.header}</Text>;
              }
              const on = picked.includes(item.name);
              return (
                <Pressable style={s.row} onPress={() => toggle(item.name)}>
                  <Ionicons
                    name={item.kind === 'city' ? 'business-outline' : 'location-outline'}
                    size={18}
                    color={on ? C.primary : C.textMuted}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.rowText, on && { color: C.primary, fontWeight: '700' }]}>
                      {item.name}
                    </Text>
                    {item.parent_city ? (
                      <Text style={s.rowSub}>{item.parent_city}</Text>
                    ) : null}
                  </View>
                  <Ionicons
                    name={on ? 'checkmark-circle' : 'ellipse-outline'}
                    size={21}
                    color={on ? C.primary : '#D5DAE3'}
                  />
                </Pressable>
              );
            }}
          />
        )}

        <View style={s.footer}>
          <Pressable style={s.applyBtn} onPress={() => { onApply(picked); onClose(); }}>
            <Text style={s.applyText}>{T.apply}</Text>
          </Pressable>
          {picked.length ? (
            <Pressable style={s.clearBtn} onPress={() => setPicked([])}>
              <Text style={s.clearText}>{T.clear}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.page, paddingTop: 56 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14 },
  title: { fontSize: 18, fontWeight: '700', color: C.text },
  searchBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9, backgroundColor: C.surface, marginHorizontal: 16, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  searchInput: { flex: 1, fontSize: 15, color: C.text, textAlign: 'right', padding: 0 },
  chipsWrap: { paddingHorizontal: 16, paddingTop: 14 },
  selectedLabel: { fontSize: 12, color: C.textMuted, textAlign: 'right', marginBottom: 7 },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 7 },
  chip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, backgroundColor: C.primaryTint, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 6 },
  chipText: { color: C.primary, fontSize: 13, fontWeight: '600' },
  allRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 16, marginBottom: 6, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: C.border },
  allRowOn: { borderColor: C.primary, backgroundColor: C.primaryTint },
  allIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.page, alignItems: 'center', justifyContent: 'center' },
  allTitle: { fontSize: 15, fontWeight: '600', color: C.text, textAlign: 'right' },
  allHint: { fontSize: 12, color: C.textMuted, textAlign: 'right', marginTop: 1 },
  sectionHeader: { fontSize: 12, fontWeight: '700', color: C.textMuted, textAlign: 'right', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 6 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 11, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F2F4F8' },
  rowText: { fontSize: 15, color: C.text, textAlign: 'right' },
  rowSub: { fontSize: 11, color: C.textMuted, textAlign: 'right', marginTop: 1 },
  empty: { textAlign: 'center', color: C.textMuted, marginTop: 40, fontSize: 14 },
  footer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 30, borderTopWidth: 1, borderTopColor: C.border, gap: 8 },
  applyBtn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  applyText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  clearBtn: { borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  clearText: { color: C.textSecondary, fontWeight: '600', fontSize: 14 },
});