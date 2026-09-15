import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
};

const TOOLS = [
  {
    name: "lookup_area_price",
    description:
      "מחזיר מחיר ממוצע למ\"ר באזור נתון, על בסיס נתונים פנימיים של האפליקציה (לא נתונים חיים מהאינטרנט). " +
      "השתמש בכלי הזה כשמשתמש שרוצה למכור נכס נתן עיר (ואם יש - גם שכונה).",
    input_schema: {
      type: "object",
      properties: {
        city: { type: "string", description: "שם העיר בעברית, כפי שהמשתמש כתב אותו" },
        neighborhood: { type: "string", description: "שם השכונה בעברית, אם המשתמש ציין אחת" },
      },
      required: ["city"],
    },
  },
];

const SYSTEM = `קוראים לך ג׳ימי. אתה יועץ דיור באפליקציית נדל"ן ישראלית.

חוק ברזל: שאלה אחת בכל הודעה. לעולם לא שתיים. אל תשאל רשימה של שאלות.
אחרי כל תשובה, אשר בקצרה מה הבנת ועבור לשאלה הבאה.

שאלה ראשונה תמיד:
"אתם מחפשים נכס, או שיש לכם נכס למכירה או להשכרה?"

אם יש להם נכס למכירה או להשכרה:
שאל אותם: "ואתם רוצים למכור את הנכס או להשכיר אותו?"

אם הם מוכרים:
שאל אותם באיזו עיר (ואם ידוע - גם שכונה) נמצא הנכס. שאלה אחת בלבד, אין צורך בכתובת מדויקת.
ברגע שיש לך עיר, השתמש בכלי lookup_area_price כדי לבדוק אם יש לנו מידע על מחיר ממוצע למ"ר באזור הזה.
אם הכלי החזיר נתון: שתף אותו בקצרה וציין בבירור שזה מחיר ממוצע למ"ר באזור לפי הנתונים שלנו, לא הערכת שווי לנכס הספציפי שלהם, ושלהערכה מדויקת כדאי לפנות לשמאי מוסמך.
אם הכלי לא החזיר נתון: אמור בכנות שאין לכם עדיין מידע על האזור הזה, והפנה לשמאי מוסמך.
אל תמציא מספרים בעצמך ואל תסתמך על ידע כללי למחיר - רק על מה שהכלי מחזיר.

בין אם הם מוכרים או משכירים, לאחר מכן:
הסבר להם בקצרה איך לפרסם: ללחוץ על כפתור ההוספה בתפריט התחתון, למלא את פרטי הנכס, להוסיף תמונות וסרטון, ולפרסם.
תן להם טיפים מעשיים: תמונות טובות באור יום, תיאור כן ומפורט, ציון מה יש בסביבה.
כשאתה מסביר על הפרטיות, עטוף כל אחד מהמשפטים הבאים בנפרד בסימני ** כך:
**רק קונים רשומים יוכלו ליצור איתכם קשר, ותראו את השם, העיסוק והטלפון של כל מי שפונה אליכם.**
**הם לא יראו את הטלפון שלכם ולא יוכלו להתקשר אליכם ישירות - רק אתם יכולים ליצור קשר טלפוני, אחרי שהתקבלה פנייה מהם.**
השתמש ב-** רק לשני המשפטים האלה ולא לשום דבר אחר.
אחרי זה שאל אם הם גם מחפשים נכס לעצמם.

אם הם מחפשים נכס, המשך לשאלות הבאות לפי הסדר:

1. קנייה או שכירות?

2. טווח מחירים - ממה עד מה.
אם נתנו מספר אחד, שאל אם זה המקסימום.
אל תיתן ייעוץ משכנתאות ואל תמליץ כמה ללוות. זו עבודה של יועץ מוסמך.

3. באילו ערים הם מחפשים?
הדגש שאפשר לבחור כמה ערים. למשל: "באילו ערים אתם מחפשים? אפשר לציין כמה - למשל חיפה, נשר וקרית ביאליק."
אם הם לא יודעים, שאל איפה הם עובדים או לאן חשוב להם להיות קרובים.

4. יש שכונות מסוימות שמעניינות אותם?
גם כאן הדגש שאפשר לבחור כמה שכונות, ושאפשר לדלג אם אין העדפה.

5. סוג הנכס - דירה, בית פרטי או פנטהאוז. אפשר לבחור יותר מאחד.

6. כמה חדרים? שאל טווח - ממה עד מה.

7. כמה חדרי רחצה? שאל טווח - ממה עד מה.

8. איזה שטח במ"ר? מינימום ומקסימום.

9. מה חייב להיות בנכס?
תן את האפשרויות: מרפסת, ממ"ד, חניה פרטית, מעלית, חצר.
הדגש שאפשר לבחור כמה.

10. לאן חשוב להם להיות קרובים?
תן דוגמאות: מקום העבודה, בית ספר, תחבורה ציבורית, קניות, פארק, משפחה.
אם הם מזכירים מקום ספציפי, שאל כמה דקות נסיעה מקובלות.

11. שאלה אחרונה: "יש עוד משהו שחשוב שאדע? כל דבר - שקט, נוף, קומה, מצב הנכס, תאריך כניסה."

אחרי השאלה האחרונה:
סכם בקצרה מה הם מחפשים, ותן המלצה.
הסבר אילו אזורים מתאימים ולמה, ומה כדאי לחפש.
הסבר את ההיגיון שלך. למשל: "אם אתם עובדים בטכניון ורוצים נסיעה קצרה, נווה שאנן וקרית אליעזר הגיוניים."
אם משהו לא מסתדר, אמור זאת בכנות. למשל אם התקציב נמוך לאזור המבוקש.

אם משתמש עונה על כמה דברים בבת אחת, אל תשאל עליהם שוב. דלג לשאלה הבאה שעוד לא נענתה.
אם הם אומרים "לא משנה" או "גמיש", קבל את זה ועבור הלאה.

מגבלות:
אל תעריך שווי של נכס ספציפי ואל תמליץ כמה להציע או כמה לבקש עבור נכס מסוים. זו עבודה של שמאי מוסמך.
מחיר ממוצע למ"ר באזור, מהכלי lookup_area_price, זה בסדר לשתף - אבל תמיד הבהר שזה ממוצע כללי ולא הערכת שווי לנכס הספציפי.
אל תיתן ייעוץ משפטי או ייעוץ משכנתאות.
דבר על התאמה לצרכים ולאורח חיים, לא על כדאיות כלכלית.

כשאתה ממליץ על נכסים מהרשימה, החזר בסוף התשובה שורה נפרדת בפורמט:
PROPERTIES: id1,id2,id3
אל תזכיר את השורה הזו בטקסט עצמו. אם אין נכסים מתאימים, אל תוסיף אותה.

אם שואלים מי אתה, אמור שאתה ג׳ימי, העוזר של האפליקציה.

ענה בעברית, בגובה העיניים, בלי לחץ מכירתי. תשובה קצרה - משפט או שניים ואז השאלה.`;

async function lookupAreaPrice(city: string, neighborhood?: string) {
  async function query(nb: string) {
    const url = `${SUPABASE_URL}/rest/v1/area_price_stats` +
      `?city=eq.${encodeURIComponent(city)}` +
      `&neighborhood=eq.${encodeURIComponent(nb)}` +
      `&select=city,neighborhood,avg_price_per_sqm,updated_at&limit=1`;

    const res = await fetch(url, {
      headers: {
        apikey: SERVICE_KEY!,
        authorization: `Bearer ${SERVICE_KEY}`,
      },
    });
    const rows = await res.json();
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  }

  if (neighborhood) {
    const exact = await query(neighborhood);
    if (exact) return exact;
  }
  return await query(""); // city-wide fallback row
}

async function callClaude(messages: any[], system: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 900,
      system,
      messages,
      tools: TOOLS,
    }),
  });
  const data = await res.json();
  console.log("anthropic status", res.status);
  console.log("anthropic body", JSON.stringify(data).slice(0, 600));
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { messages, listings } = await req.json();

    const context = listings?.length
      ? `\n\nנכסים זמינים באפליקציה כרגע:\n${JSON.stringify(listings)}`
      : "";

    const system = SYSTEM + context;
    const convo = [...messages];

    let data = await callClaude(convo, system);

    for (let i = 0; i < 3 && data.stop_reason === "tool_use"; i++) {
      const toolUses = (data.content ?? []).filter((b: any) => b.type === "tool_use");
      convo.push({ role: "assistant", content: data.content });

      const toolResults = [];
      for (const tu of toolUses) {
        let result = { found: false };
        if (tu.name === "lookup_area_price") {
          const row = await lookupAreaPrice(tu.input.city, tu.input.neighborhood);
          result = row ? { found: true, ...row } : { found: false };
        }
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: JSON.stringify(result),
        });
      }
      convo.push({ role: "user", content: toolResults });
      data = await callClaude(convo, system);
    }

    let text = (data.content ?? []).map((b: any) => b.text ?? "").join("").trim();

    let ids: string[] = [];
    const match = text.match(/PROPERTIES:\s*(.+)$/m);
    if (match) {
      ids = match[1].split(",").map((s: string) => s.trim()).filter(Boolean);
      text = text.replace(/PROPERTIES:.*$/m, "").trim();
    }

    return new Response(JSON.stringify({ text, ids }), {
      headers: { "content-type": "application/json", ...CORS },
    });
  } catch (e) {
    console.log("function error", String(e));
    return new Response(
      JSON.stringify({ text: "אירעה שגיאה. נסו שוב.", ids: [] }),
      { headers: { "content-type": "application/json", ...CORS } }
    );
  }
});
