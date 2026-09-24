const express = require("express");
const { supabaseAdmin } = require("../supabaseAdmin");
const { requireAuth } = require("../authMiddleware");
const { serverError } = require("../serverError");

const router = express.Router();

// Blocks another user directly, without going through the report flow.
// blocker_id always comes from the verified token, never the request body.
router.post("/", requireAuth, async (req, res) => {
  const { blockedUser } = req.body || {};

  if (!blockedUser) return res.status(400).json({ error: "Missing blockedUser" });
  if (blockedUser === req.user.id) {
    return res.status(400).json({ error: "Cannot block yourself" });
  }

  const { error } = await supabaseAdmin.from("blocks").insert({
    blocker_id: req.user.id,
    blocked_id: blockedUser,
  });

  if (error) return serverError(res, error, "blocks.create");
  res.json({ ok: true });
});

module.exports = router;
