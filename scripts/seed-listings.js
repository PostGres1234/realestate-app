#!/usr/bin/env node

/**
 * One-time seed: creates 20 property listings (10 per seller), each with
 * 5 real interior/exterior photos (exterior, living room, bedroom, kitchen,
 * dining room) sourced from Unsplash, since the app currently has none.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-listings.js
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars first.");
  process.exit(1);
}

const SELLER_A = "60746587-1646-4201-8e53-c4e46751d1aa";
const SELLER_B = "a6df7f28-d369-4e98-b810-b36822bae018";

const CITY_COORDS = {
  "אשדוד": [31.8014, 34.6435],
  "באר שבע": [31.2530, 34.7915],
  "הרצליה": [32.1624, 34.8447],
  "חדרה": [32.4340, 34.9196],
  "חיפה": [32.7940, 34.9896],
  "טבריה": [32.7922, 35.5312],
  "ירושלים": [31.7683, 35.2137],
  "כפר סבא": [32.1858, 34.9077],
  "נהריה": [33.0072, 35.0925],
  "נצרת": [32.6996, 35.3035],
  "נתניה": [32.3215, 34.8532],
  "עכו": [32.9281, 35.0819],
  "קריית ים": [32.8497, 35.0692],
  "ראשון לציון": [31.9730, 34.7925],
  "רמת גן": [32.0684, 34.8248],
  "רעננה": [32.1848, 34.8713],
  "תל אביב יפו": [32.0853, 34.7818],
};

const EXTERIOR = [
  "https://plus.unsplash.com/premium_photo-1661883964999-c1bcb57a7357?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1721815693498-cc28507c0ba2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1628012209120-d9db7abf7eab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1698994705178-d244d73ea573?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://plus.unsplash.com/premium_photo-1694475117121-0c14f8ddf7bb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
];
const LIVING = [
  "https://plus.unsplash.com/premium_photo-1676968002767-1f6a09891350?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1724582586529-62622e50c0b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1600210492493-0946911123ea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://plus.unsplash.com/premium_photo-1706140675031-1e0548986ad1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
];
const BEDROOM = [
  "https://plus.unsplash.com/premium_photo-1671269704807-5479855d03fe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1696762932825-2737db830bbe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1750420556288-d0e32a6f517b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1720420021124-4e18564e070f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://plus.unsplash.com/premium_photo-1675616563084-63d1f129623d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
];
const KITCHEN = [
  "https://plus.unsplash.com/premium_photo-1680382578857-c331ead9ed51?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1502005097973-6a7082348e28?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1725257928373-dc6d2ac7b145?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1512916194211-3f2b7f5f7de3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://plus.unsplash.com/premium_photo-1671269942050-df7e96b3e4ac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
];
const DINING = [
  "https://plus.unsplash.com/premium_photo-1671269942393-ab3372a09ce9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1656403002413-2ac6137237d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1600488999806-8efb986d87b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1593136596203-7212b076f4d2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://plus.unsplash.com/premium_photo-1670076513880-f58e3c377903?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
];

const LISTINGS = [
  { city: "תל אביב יפו", hood: "פלורנטין", type: "apartment", deal: "sale", rooms: 4, baths: 2, sqm: 95, price: 2450000, feats: ["has_balcony", "has_elevator"], seller: SELLER_A },
  { city: "תל אביב יפו", hood: "נווה צדק", type: "penthouse", deal: "sale", rooms: 5, baths: 3, sqm: 140, price: 3200000, feats: ["has_balcony", "has_parking", "has_elevator"], seller: SELLER_B },
  { city: "חיפה", hood: "נווה שאנן", type: "apartment", deal: "rent", rooms: 3, baths: 1, sqm: 75, price: 4200, feats: ["has_parking"], seller: SELLER_A },
  { city: "חיפה", hood: "מרכז הכרמל", type: "house", deal: "sale", rooms: 6, baths: 3, sqm: 180, price: 3900000, feats: ["has_yard", "has_parking", "has_shelter"], seller: SELLER_B },
  { city: "ירושלים", hood: "רחביה", type: "apartment", deal: "sale", rooms: 4, baths: 2, sqm: 90, price: 2800000, feats: ["has_elevator", "has_shelter"], seller: SELLER_A },
  { city: "ירושלים", hood: "בקעה", type: "penthouse", deal: "rent", rooms: 3, baths: 2, sqm: 85, price: 6500, feats: ["has_balcony"], seller: SELLER_B },
  { city: "רמת גן", hood: "מרכז", type: "apartment", deal: "sale", rooms: 3, baths: 2, sqm: 80, price: 1950000, feats: ["has_elevator", "has_parking"], seller: SELLER_A },
  { city: "הרצליה", hood: "נאות שקד", type: "house", deal: "sale", rooms: 5, baths: 3, sqm: 160, price: 4300000, feats: ["has_yard", "has_parking", "has_shelter"], seller: SELLER_B },
  { city: "נתניה", hood: "עיר ימים", type: "apartment", deal: "rent", rooms: 4, baths: 2, sqm: 100, price: 5800, feats: ["has_balcony", "has_elevator"], seller: SELLER_A },
  { city: "רעננה", hood: "נווה זמר", type: "penthouse", deal: "sale", rooms: 5, baths: 3, sqm: 130, price: 3100000, feats: ["has_balcony", "has_parking"], seller: SELLER_B },
  { city: "ראשון לציון", hood: "נחלת יהודה", type: "apartment", deal: "sale", rooms: 4, baths: 2, sqm: 95, price: 2050000, feats: ["has_parking", "has_shelter"], seller: SELLER_A },
  { city: "כפר סבא", hood: "מרכז", type: "house", deal: "rent", rooms: 5, baths: 2, sqm: 140, price: 7200, feats: ["has_yard", "has_parking"], seller: SELLER_B },
  { city: "אשדוד", hood: "רובע ז׳", type: "apartment", deal: "sale", rooms: 3, baths: 1, sqm: 70, price: 1350000, feats: ["has_balcony"], seller: SELLER_A },
  { city: "באר שבע", hood: "רמות", type: "apartment", deal: "sale", rooms: 4, baths: 2, sqm: 100, price: 1450000, feats: ["has_elevator", "has_shelter"], seller: SELLER_B },
  { city: "נהריה", hood: "מרכז", type: "house", deal: "sale", rooms: 6, baths: 3, sqm: 175, price: 2650000, feats: ["has_yard", "has_parking"], seller: SELLER_A },
  { city: "עכו", hood: "העיר העתיקה", type: "apartment", deal: "rent", rooms: 2, baths: 1, sqm: 60, price: 3800, feats: [], seller: SELLER_B },
  { city: "נצרת", hood: "מרכז", type: "penthouse", deal: "sale", rooms: 5, baths: 3, sqm: 150, price: 2400000, feats: ["has_balcony", "has_parking"], seller: SELLER_A },
  { city: "חדרה", hood: "נווה חף", type: "apartment", deal: "sale", rooms: 4, baths: 2, sqm: 105, price: 1650000, feats: ["has_elevator"], seller: SELLER_B },
  { city: "קריית ים", hood: "מרכז", type: "house", deal: "rent", rooms: 5, baths: 2, sqm: 130, price: 6200, feats: ["has_yard", "has_parking", "has_shelter"], seller: SELLER_A },
  { city: "טבריה", hood: "מרכז", type: "apartment", deal: "sale", rooms: 3, baths: 1, sqm: 85, price: 1250000, feats: ["has_balcony"], seller: SELLER_B },
];

const TYPE_LABEL = { apartment: "דירת", house: "בית פרטי", penthouse: "פנטהאוז" };
const FEATURES = ["has_balcony", "has_shelter", "has_parking", "has_elevator", "has_yard"];

function pick(arr, i) {
  return arr[i % arr.length];
}

async function insertProperty(listing, i) {
  const [lat, lng] = CITY_COORDS[listing.city];
  const title = listing.type === "house"
    ? `${TYPE_LABEL[listing.type]} ${listing.rooms} חדרים ב${listing.city}, ${listing.hood}`
    : `${TYPE_LABEL[listing.type]} ${listing.rooms} חדרים ב${listing.city}, ${listing.hood}`;

  const body = {
    seller_id: listing.seller,
    listing_type: listing.deal,
    title,
    description: "נכס מטופח ומוארר, קרוב למרכזי קניות ותחבורה ציבורית.",
    price: listing.price,
    city: listing.city,
    neighborhood: listing.hood,
    address: "רחוב הרצל " + (10 + i),
    latitude: lat,
    longitude: lng,
    bedrooms: listing.rooms,
    bathrooms: listing.baths,
    area_sqm: listing.sqm,
    property_type: listing.type,
    has_balcony: listing.feats.includes("has_balcony"),
    has_shelter: listing.feats.includes("has_shelter"),
    has_parking: listing.feats.includes("has_parking"),
    has_elevator: listing.feats.includes("has_elevator"),
    has_yard: listing.feats.includes("has_yard"),
    status: "active",
  };

  const res = await fetch(SUPABASE_URL + "/rest/v1/properties", {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      authorization: "Bearer " + SERVICE_KEY,
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.log("Insert failed for", title, "->", res.status, await res.text());
    return null;
  }
  const [row] = await res.json();
  return row;
}

async function insertImages(propertyId, i) {
  const photos = [
    pick(EXTERIOR, i),
    pick(LIVING, i),
    pick(BEDROOM, i),
    pick(KITCHEN, i),
    pick(DINING, i),
  ];

  const rows = photos.map((url, position) => ({
    property_id: propertyId,
    url,
    position,
    media_type: "image",
  }));

  const res = await fetch(SUPABASE_URL + "/rest/v1/property_images", {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      authorization: "Bearer " + SERVICE_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    console.log("Image insert failed for property", propertyId, "->", res.status, await res.text());
  }
}

async function main() {
  let created = 0;
  for (let i = 0; i < LISTINGS.length; i++) {
    const listing = LISTINGS[i];
    const row = await insertProperty(listing, i);
    if (!row) continue;
    await insertImages(row.id, i);
    console.log("[" + (i + 1) + "/" + LISTINGS.length + "] created " + row.title + " (" + row.id + ")");
    created++;
  }
  console.log("\nDone. Created " + created + "/" + LISTINGS.length + " listings, 5 photos each.");
}

main();
