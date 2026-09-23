const express = require("express");
const { supabaseAdmin } = require("../supabaseAdmin");
const { requireAuth } = require("../authMiddleware");

const router = express.Router();

// Saves a listing to the caller's favorites. user_id always comes from the
// verified token, never the request body.
router.post("/:propertyId", requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin.from("favorites").insert({
    user_id: req.user.id,
    property_id: req.params.propertyId,
  });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// Removes a listing from the caller's own favorites.
router.delete("/:propertyId", requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin
    .from("favorites")
    .delete()
    .eq("user_id", req.user.id)
    .eq("property_id", req.params.propertyId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
