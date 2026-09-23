const express = require("express");
const { supabaseAdmin } = require("../supabaseAdmin");
const { requireAuth } = require("../authMiddleware");

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
    res.status(500).json({ error: error.message });
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

  if (error) return res.status(500).json({ error: error.message });
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

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// Updates a listing's details (not media - photo/video uploads still go
// straight to Supabase Storage from the client, as before). Same ownership
// check as delete: only the actual seller can edit their own listing.
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

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
