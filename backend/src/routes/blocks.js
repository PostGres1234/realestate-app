const express = require("express");
const { supabaseAdmin } = require("../supabaseAdmin");
const { requireAuth } = require("../authMiddleware");
const { serverError } = require("../serverError");

const router = express.Router();

// Lists everyone the current user has blocked, with enough profile info
// to show a name in the "blocked users" screen.
router.get("/", requireAuth, async (req, res) => {
  const { data: blocks, error } = await supabaseAdmin
    .from("blocks")
    .select("id, blocked_id, created_at")
    .eq("blocker_id", req.user.id)
    .order("created_at", { ascending: false });

  if (error) return serverError(res, error, "blocks.list");

  const ids = (blocks ?? []).map((b) => b.blocked_id);
  let profiles = [];
  if (ids.length) {
    const { data, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    if (profErr) return serverError(res, profErr, "blocks.list.profiles");
    profiles = data ?? [];
  }

  const nameById = {};
  profiles.forEach((p) => { nameById[p.id] = p.full_name; });

  res.json((blocks ?? []).map((b) => ({
    id: b.id,
    userId: b.blocked_id,
    fullName: nameById[b.blocked_id] ?? null,
    createdAt: b.created_at,
  })));
});

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

// Unblocks a user - only the original blocker can remove their own block,
// enforced by scoping the delete to blocker_id = the verified caller.
router.delete("/:blockedUserId", requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin
    .from("blocks")
    .delete()
    .eq("blocker_id", req.user.id)
    .eq("blocked_id", req.params.blockedUserId);

  if (error) return serverError(res, error, "blocks.delete");
  res.json({ ok: true });
});

module.exports = router;
