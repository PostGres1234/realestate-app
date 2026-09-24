const express = require("express");
const { supabaseAdmin } = require("../supabaseAdmin");
const { requireAuth } = require("../authMiddleware");
const { serverError } = require("../serverError");
const { getAreaPrice } = require("../areaPrice");

const router = express.Router();

// Fetches a property and checks it belongs to userId, writing the
// appropriate error response and returning null if not. Shared by every
// write route below so ownership is checked the same way everywhere.
async function requireOwnedProperty(id, userId, res) {
  const { data: property, error } = await supabaseAdmin
    .from("properties")
    .select("id, seller_id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    serverError(res, error, "listings.requireOwnedProperty");
    return null;
  }
  if (!property) {
    res.status(404).json({ error: "Property not found" });
    return null;
  }
  if (property.seller_id !== userId) {
    res.status(403).json({ error: "Not your listing" });
    return null;
  }
  return property;
}

// Returns the pins for the map screen (public listing data - no personal
// info), excluding the caller's own listings - the map is for browsing
// other people's properties, not your own. Still requires auth since the
// map itself is gated behind having an account.
router.get("/map", requireAuth, async (req, res) => {
  const deal = req.query.deal || "all";
  const { data, error } = await supabaseAdmin.rpc("map_properties", { p_deal: deal });
  if (error) return serverError(res, error, "listings.map");

  const { data: mine, error: mineError } = await supabaseAdmin
    .from("properties")
    .select("id")
    .eq("seller_id", req.user.id);
  if (mineError) return serverError(res, mineError, "listings.map.mine");

  const myIds = new Set((mine ?? []).map((p) => p.id));
  res.json((data ?? []).filter((p) => !myIds.has(p.id)));
});

// Returns the average price/sqm for a city (and neighborhood, if given),
// computed live from the app's own active listings - used by the "add
// listing" screen so a seller can see a real, current number for their area
// while pricing their own listing. Returns null when there isn't enough
// data yet rather than showing a misleading estimate.
router.get("/area-price", requireAuth, async (req, res) => {
  const city = (req.query.city || "").trim();
  if (!city) return res.status(400).json({ error: "Missing city" });

  const neighborhood = (req.query.neighborhood || "").trim() || null;
  const stats = await getAreaPrice(city, neighborhood);
  res.json(stats ?? { avgPricePerSqm: null, sampleSize: 0 });
});

// Creates a listing. seller_id always comes from the verified token, never
// from the request body - a client can never create a listing "as" someone
// else, even by tampering with the request.
router.post("/", requireAuth, async (req, res) => {
  const {
    listingType, title, description, price, city, neighborhood, address,
    latitude, longitude, bedrooms, bathrooms, area_sqm, propertyType,
    hasBalcony, hasShelter, hasParking, hasElevator, hasYard, possessionDate,
  } = req.body || {};

  if (!title?.trim() || !price || !city?.trim()) {
    return res.status(400).json({ error: "Missing title, price, or city" });
  }

  const { data, error } = await supabaseAdmin
    .from("properties")
    .insert({
      seller_id: req.user.id,
      listing_type: listingType,
      title: title.trim(),
      description: description?.trim() || null,
      price: Number(price),
      city: city.trim(),
      neighborhood: neighborhood?.trim() || null,
      address: address?.trim() || null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      bedrooms: bedrooms ? Number(bedrooms) : null,
      bathrooms: bathrooms ? Number(bathrooms) : null,
      area_sqm: area_sqm ? Number(area_sqm) : null,
      property_type: propertyType,
      has_balcony: !!hasBalcony,
      has_shelter: !!hasShelter,
      has_parking: !!hasParking,
      has_elevator: !!hasElevator,
      has_yard: !!hasYard,
      possession_date: possessionDate ?? null,
      status: "active",
    })
    .select("id")
    .single();

  if (error) return serverError(res, error, "listings.create");
  res.json({ id: data.id });
});

// Deletes a listing, verifying ownership server-side first. Unlike the old
// client-side delete (`.eq('id', id)` with no ownership check beyond RLS),
// this returns a real 403/404 instead of silently no-op'ing when the id
// doesn't exist or belongs to someone else.
router.delete("/:id", requireAuth, async (req, res) => {
  const property = await requireOwnedProperty(req.params.id, req.user.id, res);
  if (!property) return;

  const { error } = await supabaseAdmin
    .from("properties")
    .delete()
    .eq("id", req.params.id);

  if (error) return serverError(res, error, "listings.delete");
  res.json({ ok: true });
});

// Records an uploaded photo/video against a listing. Raw bytes still go
// straight to Supabase Storage from the client (unavoidable - that's the
// file upload itself); this just records the resulting row, ownership-
// checked the same as every other write here.
router.post("/:id/media", requireAuth, async (req, res) => {
  const property = await requireOwnedProperty(req.params.id, req.user.id, res);
  if (!property) return;

  const { url, position, mediaType } = req.body || {};
  if (!url || !mediaType) {
    return res.status(400).json({ error: "Missing url or mediaType" });
  }

  const { error } = await supabaseAdmin.from("property_images").insert({
    property_id: req.params.id,
    url,
    position: position ?? 0,
    media_type: mediaType,
  });

  if (error) return serverError(res, error, "listings.media.create");
  res.json({ ok: true });
});

// Deletes a single photo/video row. Unlike the old client-side delete
// (`.eq('id', item.id)` with no ownership check at all), this verifies the
// image belongs to a listing the caller actually owns before deleting it.
router.delete("/media/:imageId", requireAuth, async (req, res) => {
  const { data: image, error: imgError } = await supabaseAdmin
    .from("property_images")
    .select("id, property_id")
    .eq("id", req.params.imageId)
    .maybeSingle();

  if (imgError) return serverError(res, imgError, "listings.media.delete.lookup");
  if (!image) return res.status(404).json({ error: "Image not found" });

  const property = await requireOwnedProperty(image.property_id, req.user.id, res);
  if (!property) return;

  const { error } = await supabaseAdmin
    .from("property_images")
    .delete()
    .eq("id", req.params.imageId);

  if (error) return serverError(res, error, "listings.media.delete");
  res.json({ ok: true });
});

// Updates a listing's details (not media - see the routes above). Same
// ownership check as delete: only the actual seller can edit their own
// listing.
router.patch("/:id", requireAuth, async (req, res) => {
  const property = await requireOwnedProperty(req.params.id, req.user.id, res);
  if (!property) return;

  const {
    title, description, price, city, address,
    bedrooms, bathrooms, area_sqm, property_type,
    possession_date, status,
  } = req.body || {};

  if (!title?.trim() || !price || !city?.trim()) {
    return res.status(400).json({ error: "Missing title, price, or city" });
  }

  const { error } = await supabaseAdmin
    .from("properties")
    .update({
      title: title.trim(),
      description: description?.trim() || null,
      price: Number(price),
      city: city.trim(),
      address: address?.trim() || null,
      bedrooms: bedrooms ? Number(bedrooms) : null,
      bathrooms: bathrooms ? Number(bathrooms) : null,
      area_sqm: area_sqm ? Number(area_sqm) : null,
      property_type,
      possession_date: possession_date ?? null,
      status,
    })
    .eq("id", req.params.id);

  if (error) return serverError(res, error, "listings.update");
  res.json({ ok: true });
});

module.exports = router;
