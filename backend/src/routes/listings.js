const express = require("express");
const { supabaseAdmin } = require("../supabaseAdmin");
const { requireAuth } = require("../authMiddleware");

const router = express.Router();

// Deletes a listing, verifying ownership server-side first. Unlike the old
// client-side delete (`.eq('id', id)` with no ownership check beyond RLS),
// this returns a real 403/404 instead of silently no-op'ing when the id
// doesn't exist or belongs to someone else.
router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const { data: property, error: fetchErr } = await supabaseAdmin
    .from("properties")
    .select("id, seller_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) return res.status(500).json({ error: fetchErr.message });
  if (!property) return res.status(404).json({ error: "Property not found" });
  if (property.seller_id !== userId) return res.status(403).json({ error: "Not your listing" });

  const { error: delErr } = await supabaseAdmin
    .from("properties")
    .delete()
    .eq("id", id);

  if (delErr) return res.status(500).json({ error: delErr.message });

  res.json({ ok: true });
});

module.exports = router;
