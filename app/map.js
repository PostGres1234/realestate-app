import { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { logSupabase } from '../lib/logger';
import { C } from '../lib/theme';
import BackBar from '../components/BackBar';

const T = {
  heading: 'מפת נכסים',
  sale: 'למכירה',
  rent: 'להשכרה',
  all: 'הכל',
  results: 'נכסים',
  loadingPlaces: 'טוען מקומות...',
  noneFound: 'לא נמצאו מקומות באזור',
  noName: 'ללא שם',
};

const LAYERS = [
  {
    key: 'school', label: 'חינוך', icon: 'school-outline',
    color: '#F5A623', emoji: '\uD83C\uDFEB',
    filter: 'nwr["amenity"~"^(school|kindergarten|college|university)$"]["name"]',
  },
  {
    key: 'health', label: 'בריאות', icon: 'medkit-outline',
    color: '#E5484D', emoji: '\uD83C\uDFE5',
    filter: 'nwr["amenity"~"^(hospital|clinic|doctors|pharmacy)$"]["name"]',
  },
  {
    key: 'gym', label: 'ספורט', icon: 'barbell-outline',
    color: '#1D9E75', emoji: '\uD83D\uDCAA',
    filter: 'nwr["leisure"~"^(fitness_centre|sports_centre|sports_hall|swimming_pool|pitch)$"]["name"]',
  },
  {
    key: 'shop', label: 'קניות', icon: 'cart-outline',
    color: '#8B5CF6', emoji: '\uD83D\uDED2',
    filter: 'nwr["shop"~"^(mall|supermarket|department_store|convenience|bakery)$"]["name"]',
  },
  {
    key: 'transit', label: 'תחבורה', icon: 'bus-outline',
    color: '#0EA5E9', emoji: '\uD83D\uDE8C',
    filter: 'nwr["public_transport"~"^(station|stop_position)$"]["name"]',
  },
  {
    key: 'park', label: 'פארקים', icon: 'leaf-outline',
    color: '#16A34A', emoji: '\uD83C\uDF33',
    filter: 'nwr["leisure"~"^(park|playground|garden)$"]["name"]',
  },
  {
    key: 'food', label: 'מסעדות', icon: 'restaurant-outline',
    color: '#F97316', emoji: '\uD83C\uDF7D',
    filter: 'nwr["amenity"~"^(restaurant|cafe|fast_food)$"]["name"]',
  },
  {
    key: 'worship', label: 'בתי תפילה', icon: 'moon-outline',
    color: '#0891B2', emoji: '\uD83D\uDD4C',
    filter: 'nwr["amenity"="place_of_worship"]["name"]',
  },
  {
    key: 'bank', label: 'בנקים', icon: 'card-outline',
    color: '#4F46E5', emoji: '\uD83C\uDFE7',
    filter: 'nwr["amenity"~"^(bank|atm|post_office)$"]["name"]',
  },
  {
    key: 'center', label: 'מרכז העיר', icon: 'business-outline',
    color: '#64748B', emoji: '\uD83C\uDFDB',
    filter: 'node["place"~"^(city|town)$"]["name"]',
  },
];

function buildHtml(points, places) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0;
    font-family: -apple-system, "Segoe UI", Roboto, sans-serif; }

  .home-pin {
    background: linear-gradient(135deg, #1f6feb, #1652B8);
    width: 36px; height: 36px;
    border-radius: 50% 50% 50% 0; transform: rotate(-45deg);
    border: 3px solid #fff; box-shadow: 0 4px 11px rgba(31,111,235,0.45);
    display: flex; align-items: center; justify-content: center;
  }
  .home-pin span { transform: rotate(45deg); font-size: 16px; }

  .poi-wrap { display: flex; flex-direction: column; align-items: center; }
  .poi-pin {
    width: 28px; height: 28px; border-radius: 50%;
    border: 2.5px solid #fff; box-shadow: 0 3px 7px rgba(0,0,0,0.28);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px;
  }
  .poi-label {
    margin-top: 3px; background: rgba(255,255,255,0.96);
    border-radius: 6px; padding: 2px 6px;
    font-size: 10px; font-weight: 700; color: #1A1D26;
    white-space: nowrap; box-shadow: 0 1px 4px rgba(0,0,0,0.18);
    max-width: 110px; overflow: hidden; text-overflow: ellipsis;
    direction: rtl;
  }

  .leaflet-popup-content-wrapper { border-radius: 14px; }
  .leaflet-popup-content { direction: rtl; text-align: right; margin: 12px 14px; }
  .p-price { font-size: 18px; font-weight: 800; color: #1f6feb; }
  .p-city { font-size: 13px; color: #1A1D26; margin-top: 3px; font-weight: 600; }
  .p-meta { font-size: 12px; color: #8A92A6; margin-top: 3px; }
  .p-btn {
    display: block; margin-top: 10px; background: #1f6feb; color: #fff;
    text-align: center; padding: 8px; border-radius: 10px;
    font-size: 13px; font-weight: 700; text-decoration: none;
  }
  .poi-name { font-size: 14px; font-weight: 700; color: #1A1D26; }
  .poi-kind { font-size: 11px; color: #8A92A6; margin-top: 3px; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: false }).setView([31.7, 35.0], 8);
  L.control.zoom({ position: 'topleft' }).addTo(map);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  var homeIcon = L.divIcon({
    className: '',
    html: '<div class="home-pin"><span>&#127968;</span></div>',
    iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -36]
  });

  var points = ${JSON.stringify(points)};
  var places = ${JSON.stringify(places)};
  var markers = [];

  points.forEach(function (p) {
    var m = L.marker([p.lat, p.lng], { icon: homeIcon, zIndexOffset: 1000 }).addTo(map);
    m.bindPopup(
      '<div class="p-price">' + p.price + '</div>' +
      '<div class="p-city">' + p.city + '</div>' +
      '<div class="p-meta">' + p.meta + '</div>' +
      '<a class="p-btn" href="#" onclick="open_(\\'' + p.id + '\\');return false;">צפייה בנכס</a>'
    );
    markers.push(m);
  });

  places.forEach(function (q) {
    var icon = L.divIcon({
      className: '',
      html: '<div class="poi-wrap">' +
            '<div class="poi-pin" style="background:' + q.color + '">' + q.emoji + '</div>' +
            '<div class="poi-label">' + q.name + '</div>' +
            '</div>',
      iconSize: [110, 46], iconAnchor: [55, 14], popupAnchor: [0, -14]
    });
    var m = L.marker([q.lat, q.lng], { icon: icon }).addTo(map);
    m.bindPopup(
      '<div class="poi-name">' + q.name + '</div>' +
      '<div class="poi-kind">' + q.label + '</div>'
    );
  });

  function open_(id) { window.ReactNativeWebView.postMessage(id); }

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
  const [places, setPlaces] = useState([]);
  const [active, setActive] = useState({});
  const [loading, setLoading] = useState(true);
  const [poiLoading, setPoiLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [mode, setMode] = useState('all');

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

  function bboxFrom(pts) {
    if (!pts.length) return '29.4,34.2,33.4,35.9';

    const lats = pts.map((p) => p.lat);
    const lngs = pts.map((p) => p.lng);

    let minLat = Math.min(...lats);
    let maxLat = Math.max(...lats);
    let minLng = Math.min(...lngs);
    let maxLng = Math.max(...lngs);

    const MIN_SPAN = 0.08;
    if (maxLat - minLat < MIN_SPAN) {
      const mid = (maxLat + minLat) / 2;
      minLat = mid - MIN_SPAN / 2;
      maxLat = mid + MIN_SPAN / 2;
    }
    if (maxLng - minLng < MIN_SPAN) {
      const mid = (maxLng + minLng) / 2;
      minLng = mid - MIN_SPAN / 2;
      maxLng = mid + MIN_SPAN / 2;
    }

    const pad = 0.04;
    return [minLat - pad, minLng - pad, maxLat + pad, maxLng + pad].join(',');
  }

 async function fetchOverpass(query) {
    const servers = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass.osm.ch/api/interpreter',
    ];

    const attempts = servers.map((url) =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
      }).then(async (res) => {
        if (!res.ok) throw new Error('status ' + res.status);
        const json = await res.json();
        if (!json.elements?.length) throw new Error('empty');
        return json;
      })
    );

    return Promise.any(attempts);
  }

  async function toggleLayer(layer) {
    const on = !!active[layer.key];

    if (on) {
      setActive((a) => ({ ...a, [layer.key]: false }));
      setPlaces((p) => p.filter((x) => x.key !== layer.key));
      return;
    }

    setActive((a) => ({ ...a, [layer.key]: true }));
    setPoiLoading(true);
    setToast(T.loadingPlaces);

    // A single bbox spanning every listing nationwide would let one dense
    // region (e.g. Tel Aviv) exhaust the whole result quota, leaving other
    // cities (e.g. Haifa) with zero results even when matches exist there.
    // Query a small box around each listing instead, unioned together, so
    // every city with a listing gets its own guaranteed search area.
    const AREA_HALF_SPAN = 0.06;
    const clauses = points.length
      ? points
          .map((p) => `${layer.filter}(${p.lat - AREA_HALF_SPAN},${p.lng - AREA_HALF_SPAN},${p.lat + AREA_HALF_SPAN},${p.lng + AREA_HALF_SPAN});`)
          .join('')
      : `${layer.filter}(${bboxFrom([])});`;
    const q = `[out:json][timeout:25];(${clauses});out center 300;`;

    try {
      const json = await fetchOverpass(q);

      const found = (json.elements ?? [])
        .map((el) => ({
          key: layer.key,
          label: layer.label,
          color: layer.color,
          emoji: layer.emoji,
          name: el.tags?.['name:he'] ?? el.tags?.name ?? T.noName,
          lat: el.lat ?? el.center?.lat,
          lng: el.lon ?? el.center?.lon,
        }))
        .filter((x) => x.lat && x.lng);

      setPlaces((p) => [...p.filter((x) => x.key !== layer.key), ...found]);
      setToast('');
    } catch (err) {
      logSupabase('map.overpass', { message: String(err) }, { layer: layer.key });
      setActive((a) => ({ ...a, [layer.key]: false }));
      setToast(T.noneFound);
      setTimeout(() => setToast(''), 2500);
    }

    setPoiLoading(false);
  }

  return (
    <View style={s.wrap}>
      <BackBar
        title={T.heading}
        right={<Text style={s.count}>{points.length + ' ' + T.results}</Text>}
      />

      <View style={s.controls}>
        <View style={s.segment}>
          <Pressable
            style={[s.segBtn, mode === 'all' && s.segOn]}
            onPress={() => setMode('all')}
          >
            <Text style={mode === 'all' ? s.segTextOn : s.segText}>{T.all}</Text>
          </Pressable>
          <Pressable
            style={[s.segBtn, mode === 'sale' && s.segOn]}
            onPress={() => setMode('sale')}
          >
            <Text style={mode === 'sale' ? s.segTextOn : s.segText}>{T.sale}</Text>
          </Pressable>
          <Pressable
            style={[s.segBtn, mode === 'rent' && s.segOn]}
            onPress={() => setMode('rent')}
          >
            <Text style={mode === 'rent' ? s.segTextOn : s.segText}>{T.rent}</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.pills}
        >
          {LAYERS.map((l) => {
            const on = !!active[l.key];
            return (
              <Pressable
                key={l.key}
                style={[s.pill, on && { backgroundColor: l.color, borderColor: l.color }]}
                onPress={() => { if (!loading) toggleLayer(l); }}
              >
                <Ionicons name={l.icon} size={17} color={on ? '#fff' : l.color} />
                <Text style={[s.pillText, on && s.pillTextOn]}>{l.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        ) : (
          <WebView
            key={mode + '-' + points.length + '-' + places.length}
            originWhitelist={['*']}
            source={{ html: buildHtml(points, places) }}
            style={{ flex: 1 }}
            onMessage={(e) => {
              const id = e.nativeEvent.data;
              if (id) router.push('/property/' + id);
            }}
          />
        )}

        {toast ? (
          <View style={s.toast}>
            {poiLoading ? <ActivityIndicator size="small" color={C.primary} /> : null}
            <Text style={s.toastText}>{toast}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.page },
  count: { fontSize: 12, color: C.textMuted },
  controls: { paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  segment: { flexDirection: 'row-reverse', backgroundColor: C.surface, borderRadius: 14, padding: 4, marginHorizontal: 16 },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center' },
  segOn: { backgroundColor: C.primary },
  segText: { color: C.textSecondary, fontSize: 13, fontWeight: '600' },
  segTextOn: { color: '#fff', fontSize: 13, fontWeight: '600' },
  pills: { flexDirection: 'row-reverse', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  pill: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 7,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.page,
    borderRadius: 24, paddingHorizontal: 15, paddingVertical: 10,
  },
  pillText: { fontSize: 14, fontWeight: '600', color: C.textSecondary },
  pillTextOn: { color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toast: {
    position: 'absolute', bottom: 24, alignSelf: 'center',
    flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: 22,
    paddingHorizontal: 18, paddingVertical: 11,
    shadowColor: '#1A1D26', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 3,
  },
  toastText: { color: C.textSecondary, fontSize: 13, fontWeight: '600' },
});