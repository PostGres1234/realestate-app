const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  const url = SUPABASE_URL + "/rest/v1/properties?city=eq." +
    encodeURIComponent("טבריה") + "&select=id,title,seller_id,status,created_at";

  const res = await fetch(url, {
    headers: { apikey: SERVICE_KEY, authorization: "Bearer " + SERVICE_KEY },
  });
  const rows = await res.json();
  console.log(JSON.stringify(rows, null, 2));
}

main();
