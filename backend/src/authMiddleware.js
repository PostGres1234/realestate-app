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
    // TEMP DEBUG - log the real underlying reason, not just a generic 401.
    console.log("requireAuth rejected token:", JSON.stringify({
      message: error?.message,
      status: error?.status,
      name: error?.name,
      code: error?.code,
    }));
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  req.user = data.user;
  next();
}

module.exports = { requireAuth };
