import BackBar from '../components/BackBar';
import { useState, useCallback, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { logSupabase } from '../lib/logger';
import { C } from '../lib/theme';

const T = {
  heading: 'מפת נכסים',
  sale: 'למכירה',
  rent: 'להשכרה',
  all: 'הכל',
  results: 'נכסים',
  empty: 'אין נכסים באזור הזה',
};

function buildHtml(points) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; }
  .home-pin {
    background: #E5484D;
    width: 30px; height: 30px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 2px solid #fff;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    display: flex; align-items: center; justify-content: center;
  }
  .home-pin span { transform: rotate(45deg); font-size: 15px; }
  .leaflet-popup-content { direction: rtl; text-align: right; margin: 10px 12px; }
  .p-price { font-size: 17px; font-weight: 800; color: #1f6feb; }
  .p-city { font-size: 13px; color: #1A1D26; margin-top: 2px; }
  .p-meta { font-size: 12px; color: #8A92A6; margin-top: 2px; }
  .p-btn {
    display: block; margin-top: 8px; background: #1f6feb; color: #fff;
    text-align: center; padding: 7px; border-radius: 8px;
    font-size: 13px; font-weight: 600; text-decoration: none;
  }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map').setView([31.7, 35.0], 7);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  var icon = L.divIcon({
    className: '',
    html: '<div class="home-pin"><span>&#127968;</span></div>',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  });

  var points = ${JSON.stringify(points)};
  var markers = [];

  points.forEach(function (p) {
    var m = L.marker([p.lat, p.lng], { icon: icon }).addTo(map);
    m.bindPopup(
      '<div class="p-price">' + p.price + '</div>' +
      '<div class="p-city">' + p.city + '</div>' +
      '<div class="p-meta">' + p.meta + '</div>' +
      '<a class="p-btn" href="#" onclick="open_(\\'' + p.id + '\\');return false;">צפייה בנכס</a>'
    );
    markers.push(m);
  });

  function open_(id) {
    window.ReactNativeWebView.postMessage(id);
  }

  if (markers.length) {
    var group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.25));
  }
</script>
</body>
</html>`;
}

export default function MapScreen() {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('sale');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('map_properties', { p_deal: mode });
    if (error) logSupabase('map.load', error, { mode });

    const money = (n) => '\u20AA' + new Intl.NumberFormat('he-IL').format(n);

    setPoints((data ?? []).map((p) => ({
      id: p.id,
      lat: p.latitude,
      lng: p.longitude,
      price: money(p.price) + (p.listing_type === 'rent' ? ' לחודש' : ''),
      city: p.neighborhood ? p.city + ', ' + p.neighborhood : p.city,
      meta: (p.bedrooms ?? '-') + ' חדרים · ' + (p.area_sqm ?? '-') + ' מ"ר',
    })));
    setLoading(false);
  }, [mode]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={s.wrap}>
      <View style={s.header}>
     <BackBar
          title={T.heading}
          right={<Text style={s.count}>{points.length + ' ' + T.results}</Text>}
        />

        <View style={s.segment}>
          {[
            { k: 'sale', l: T.sale },
            { k: 'rent', l: T.rent },
            { k: 'all', l: T.all },
          ].map((x) => (
            <Pressable
              key={x.k}
              style={[s.segBtn, mode === x.k && s.segOn]}
              onPress={() => setMode(x.k)}
            >
              <Text style={mode === x.k ? s.segTextOn : s.segText}>{x.l}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        ) : (
          <WebView
            key={mode + '-' + points.length}
            originWhitelist={['*']}
            source={{ html: buildHtml(points) }}
            style={{ flex: 1 }}
            onMessage={(e) => {
              const id = e.nativeEvent.data;
              if (id) router.push('/property/' + id);
            }}
          />
        )}

        {!loading && points.length === 0 ? (
          <View style={s.emptyBar}>
            <Ionicons name="information-circle-outline" size={16} color={C.textMuted} />
            <Text style={s.emptyText}>{T.empty}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.page },
  header: { backgroundColor: C.page, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  h1: { fontSize: 22, fontWeight: '700', color: C.text },
  count: { fontSize: 12, color: C.textMuted },
  segment: { flexDirection: 'row-reverse', backgroundColor: C.surface, borderRadius: 14, padding: 4 },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center' },
  segOn: { backgroundColor: C.primary },
  segText: { color: C.textSecondary, fontSize: 13, fontWeight: '600' },
  segTextOn: { color: '#fff', fontSize: 13, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBar: { position: 'absolute', bottom: 24, alignSelf: 'center', flexDirection: 'row-reverse', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, shadowColor: '#1A1D26', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3 },
  emptyText: { color: C.textSecondary, fontSize: 13 },
});