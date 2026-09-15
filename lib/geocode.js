import { log } from './logger';
import { CITY_COORDS } from './cityCoords';

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
    if (city) return geocodeCity(city);
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
    if (Array.isArray(data) && data.length) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        precise: false,
      };
    }
  } catch (err) {
    log.warn('geocode.cityFail', String(err));
  }

  const fallback = CITY_COORDS[city.trim()];
  if (fallback) {
    return { latitude: fallback[0], longitude: fallback[1], precise: false };
  }
  return null;
}