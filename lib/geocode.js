import { log } from './logger';

const BASE = 'https://nominatim.openstreetmap.org/search';

export async function geocodeAddress({ address, city, neighborhood }) {
  const parts = [address, neighborhood, city, 'Israel'].filter(Boolean);
  const query = parts.join(', ');

  const url = BASE
    + '?format=json&limit=1&countrycodes=il&accept-language=he'
    + '&q=' + encodeURIComponent(query);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'realestate-app/1.0 (contact@example.com)' },
    });
    const data = await res.json();

    if (!Array.isArray(data) || !data.length) {
      if (city) return geocodeCity(city);
      return null;
    }

    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
      precise: true,
    };
  } catch (err) {
    log.warn('geocode.fail', String(err));
    return null;
  }
}

async function geocodeCity(city) {
  const url = BASE
    + '?format=json&limit=1&countrycodes=il&accept-language=he'
    + '&q=' + encodeURIComponent(city + ', Israel');

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'realestate-app/1.0 (contact@example.com)' },
    });
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return null;

    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
      precise: false,
    };
  } catch {
    return null;
  }
}