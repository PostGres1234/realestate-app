const express = require("express");
const { supabaseAdmin } = require("../supabaseAdmin");
const { requireAuth } = require("../authMiddleware");
const { serverError } = require("../serverError");

const router = express.Router();

// Clears the caller's own view history. Recording a view (track_view) stays
// as a direct client RPC - that function runs under the user's own session
// (auth.uid()) rather than the backend's service-role key.
router.delete("/", requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin
    .from("recently_viewed")
    .delete()
    .eq("user_id", req.user.id);

  if (error) return serverError(res, error, "recent.clear");
  res.json({ ok: true });
});

module.exports = router;
