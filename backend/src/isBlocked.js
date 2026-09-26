const { supabaseAdmin } = require("./supabaseAdmin");

// True if either user has blocked the other - direction doesn't matter,
// a block always cuts off messaging both ways.
async function isBlocked(userA, userB) {
  const { data, error } = await supabaseAdmin
    .from("blocks")
    .select("blocker_id")
    .or(
      `and(blocker_id.eq.${userA},blocked_id.eq.${userB}),` +
      `and(blocker_id.eq.${userB},blocked_id.eq.${userA})`
    )
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

module.exports = { isBlocked };
