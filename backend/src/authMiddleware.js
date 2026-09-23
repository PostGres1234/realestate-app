const { supabaseAdmin } = require("./supabaseAdmin");

// Verifies the same Supabase-issued JWT the app already holds
// (session.access_token) - no separate auth system. Attaches req.user
// on success; 401s otherwise so routes never have to check this themselves.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    // Logged server-side only (never sent to the client) so a rejected
    // token's real cause is visible in Render's logs instead of a dead end.
    console.log("requireAuth rejected token:", error?.message);
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  req.user = data.user;
  next();
}

module.exports = { requireAuth };
