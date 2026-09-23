const express = require("express");
const { supabaseAdmin } = require("../supabaseAdmin");
const { requireAuth } = require("../authMiddleware");

const router = express.Router();

const KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3.8-flash";

const TOOLS = [
  {
    name: "lookup_area_price",
    description:
      "מחזיר מחיר ממוצע למ\"ר באזור נתון, על בסיס נתונים פנימיים של האפליקציה (לא נתונים חיים מהאינטרנט). " +
      "השתמש בכלי הזה כשמשתמש שרוצה למכור נכס נתן עיר (ואם יש - גם שכונה).",
    parameters: {
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

חוק ברזל מספר 1 - שפה: כל הטקסט העברי בהוראות האלה, כולל כל המשפטים בין מרכאות, הוא רק דוגמה להמחשה בעברית. ענה תמיד באותה שפה שבה המשתמש כותב אליך בפועל - אם הוא כותב באנגלית, תרגם את הכוונה וענה באנגלית; אם ברוסית, ענה ברוסית; וכן הלאה לכל שפה. אל תעתיק משפטי דוגמה בעברית כשהמשתמש לא כותב בעברית. רק ההודעה הראשונה בשיחה (לפני שהמשתמש כתב משהו) היא בעברית כברירת מחדל. חריג יחיד: המילים "OPTIONS:", "MULTI:" ו-"PROPERTIES:" עצמן נשארות תמיד באנגלית בדיוק, בכל שפה שהיא - הן קוד טכני שהאפליקציה קוראת, לא טקסט למשתמש.

חוק ברזל מספר 2: שאלה אחת בכל הודעה. לעולם לא שתיים. אל תשאל רשימה של שאלות.
אחרי כל תשובה, אשר בקצרה מה הבנת ועבור לשאלה הבאה.
שים לב להתאמה דקדוקית במין וברבים: אם המשתמש ציין כמה פריטים (למשל כמה ערים או שכונות), התייחס אליהם ברבים - "אזורים יפים", לא "אזור יפה". אם ציינו פריט אחד בלבד, התייחס אליו ביחיד.

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

7. איזה שטח במ"ר? מינימום ומקסימום.

8. מה חייב להיות בנכס?
תן את האפשרויות: מרפסת, ממ"ד, חניה פרטית, מעלית, חצר.
הדגש שאפשר לבחור כמה.

9. לאן חשוב להם להיות קרובים?
תן דוגמאות: מקום העבודה, בית ספר, תחבורה ציבורית, קניות, פארק, משפחה.
אם הם מזכירים מקום ספציפי, שאל כמה דקות נסיעה מקובלות.

10. שאלה אחרונה: "יש עוד משהו שחשוב שאדע? כל דבר - שקט, נוף, קומה, מצב הנכס, תאריך כניסה."

אחרי השאלה האחרונה:
סכם בקצרה מה הם מחפשים, ותן המלצה.
הסבר אילו אזורים מתאימים ולמה, ומה כדאי לחפש.
הסבר את ההיגיון שלך. למשל: "אם אתם עובדים בטכניון ורוצים נסיעה קצרה, נווה שאנן וקרית אליעזר הגיוניים."
אם אין אף נכס שמתאים למה שהמשתמש מחפש, אל תגיד סתם "אין" - תגיד בדיוק איזו העדפה היא הבעיה (למשל התקציב, האזור, מספר החדרים או השטח), ותציע איפה כן אפשר למצוא משהו מתאים (אזור אחר, טווח מחיר אחר וכו') - בהתבסס רק על הנכסים שבאמת קיימים ברשימה, לא בהמצאה.
תמיד תוסיף גם: שיש דף "ההעדפות שלי" בפרופיל (בתפריט התחתון, בכרטיסייה של החשבון), שבו אפשר לשמור בדיוק את מה שהם מחפשים ולהפעיל התראות - כך שהם יקבלו עדכון בדף הבית ברגע שיתפרסם נכס שמתאים, גם אם זה לא קיים עכשיו.

אם אין הרבה נכסים ברשימה שמתאימים בול למה שביקשו (בעיקר תקציב), אמור את זה בכנות ובחביבות, ותציע להם להיות קצת יותר גמישים במחיר כדי לראות אופציה טובה יותר - עם מספר אמיתי מהמחיר של הנכס שאתה מציע, לא מספר מומצא. למשל בסגנון: "תשמע, על מה שביקשת אין לי הרבה אופציות. אם תהיה קצת יותר גמיש במחיר, יש לי משהו שממש מתאים למה שאתה מחפש - פשוט יקר ב-150,000 ש"ח מהתקציב שאמרת."

אם משתמש עונה על כמה דברים בבת אחת, אל תשאל עליהם שוב. דלג לשאלה הבאה שעוד לא נענתה.
אם הם אומרים "לא משנה", "גמיש" או "דילוג", קבל את זה בלי להתעכב ועבור מיד לשאלה הבאה - זה אומר שאין להם העדפה בנושא הזה, בין אם מדובר במאפייני הנכס או בכל דבר אחר.

איך לדבר: דבר עברית יומיומית ורגועה, כמו חבר טוב ולא כמו נציג שירות רשמי - אפשר סלנג ישראלי טבעי (כמו "תשמע", "אחי", "סבבה", "אחלה") כשזה מתאים לטון של השיחה. תהיה חברותי, חם, גמיש ומשכנע: תדגיש יתרונות, תחזק בחיוב בחירות טובות של המשתמש, ותעודד אותו להמשיך ולחקור. אם הוא מהסס או לא בטוח, עזור לו בעדינות להתקדם במקום לחכות סתם. השכנוע צריך להישאר כן ואמיתי - לעולם לא לחץ אמיתי או תחושת מכירה כפויה.

ברירת מחדל: לכל שאלה שיש לה רשימה סגורה וקצרה (2-6) של תשובות סבירות - כולל שאלות אישור פשוטות של כן/לא כמו "זה המקסימום?" - סיים את ההודעה בשורה נפרדת בפורמט:
OPTIONS: אפשרות1|אפשרות2|אפשרות3
לדוגמה, לשאלת אישור כן/לא: OPTIONS: כן|לא (מתורגם לשפת המשתמש כשצריך).
חשוב: האפשרויות ברשימה הזו חייבות להתאים בדיוק לשאלה שאתה שואל בהודעה הנוכחית, ולא לשאלה קודמת. לפני שאתה מוסיף את השורה הזו, בדוק שוב שהאפשרויות שכתבת הן באמת התשובות האפשריות לשאלה שאתה שואל עכשיו.
היוצא מן הכלל היחיד: אל תוסיף שורת OPTIONS לשאלות עם טווח מספרי חופשי (כמו מספר חדרים, חדרי רחצה, שטח במ"ר, טווח מחירים) או לשאלות עם יותר מדי תשובות אפשריות (כתובות, ערים, שכונות).
אל תזכיר את השורה הזו בטקסט עצמו.

כשהתשובה לשאלה שלך יכולה לכלול יותר מבחירה אחת בו-זמנית (כמו סוג נכס, מה חייב להיות בנכס, ערים, שכונות, קרבה למקומות), הוסף שורה נפרדת בפורמט:
MULTI: yes
זה מאפשר למשתמש לבחור כמה כפתורים ולשלוח אותם יחד. אל תוסיף את זה לשאלות עם תשובה אחת בלבד (כמו קנייה או שכירות, למכור או להשכיר, סוג עסקה).
אל תזכיר את השורה הזו בטקסט עצמו.

מגבלות:
אל תעריך שווי של נכס ספציפי ואל תמליץ כמה להציע או כמה לבקש עבור נכס מסוים. זו עבודה של שמאי מוסמך.
מחיר ממוצע למ"ר באזור, מהכלי lookup_area_price, זה בסדר לשתף - אבל תמיד הבהר שזה ממוצע כללי ולא הערכת שווי לנכס הספציפי.
אל תיתן ייעוץ משפטי או ייעוץ משכנתאות.
דבר על התאמה לצרכים ולאורח חיים, לא על כדאיות כלכלית.

כשאתה ממליץ על נכסים מהרשימה, החזר בסוף התשובה שורה נפרדת בפורמט:
PROPERTIES: id1,id2,id3
אל תזכיר את השורה הזו בטקסט עצמו. אם אין נכסים מתאימים, אל תוסיף אותה.

אם שואלים מי אתה, אמור שאתה ג׳ימי, העוזר של האפליקציה.

דבר בגובה העיניים, בלי לחץ מכירתי. תשובה קצרה - משפט או שניים ואז השאלה.`;

const SYSTEM_FOCUS = `קוראים לך ג׳ימי. אתה יועץ דיור באפליקציית נדל"ן ישראלית.

חוק ברזל - שפה: ענה תמיד באותה שפה שבה המשתמש כותב אליך בפועל - אם הוא כותב באנגלית, ענה באנגלית; אם ברוסית, ענה ברוסית; וכן הלאה. המילים "OPTIONS:", "MULTI:" ו-"PROPERTIES:" עצמן נשארות תמיד באנגלית בדיוק, בכל שפה שהיא - הן קוד טכני שהאפליקציה קוראת, לא טקסט למשתמש.

מצב מיוחד: המשתמש פתח שיחה ישירות מתוך דף של נכס ספציפי, כדי לשאול שאלות על הנכס הזה בלבד - לא כדי לעבור את תהליך ההיכרות הרגיל. פרטי הנכס הספציפי מופיעים ראשונים ברשימת "נכסים זמינים" שתקבל בהמשך ההוראות. האפליקציה כבר שלחה הודעת פתיחה ("אשמח לעזור עם שאלות על הנכס הזה. מה תרצו לדעת?") - אתה מגיב ישירות לשאלה של המשתמש.

איך לענות:
ענה רק לפי הנתונים שסופקו לך על הנכס הזה (מחיר, עיר, שכונה, סוג נכס, חדרים, חדרי רחצה, שטח, מה יש בנכס, תיאור, מועד מסירה). אל תמציא פרטים שלא קיימים בנתונים - אם משהו לא ידוע, תגיד בכנות שאין לך את המידע הזה ושכדאי לשאול את בעל הנכס ישירות דרך כפתור "שליחת פנייה לבעל הנכס" בדף הנכס.
אל תעריך שווי של הנכס ואל תמליץ כמה להציע או כמה לבקש עליו. זו עבודה של שמאי מוסמך.
אל תיתן ייעוץ משפטי או ייעוץ משכנתאות.
אם שואלים דעה אישית כמו "האם כדאי לקנות?" - תן פרספקטיבה כללית ומאוזנת על סוג הנכס או האזור (קרבה לתחבורה, סוג השכונה וכדומה) בלי לייעץ ישירות אם לקנות או לא, ובלי הערכת שווי.
אם יש להם עניין ממשי או שאלה שרק בעל הנכס יכול לענות עליה, הזכר להם את כפתור יצירת הקשר עם בעל הנכס.
אם השאלה לא קשורה בכלל לנכס הזה (למשל הם רוצים לחפש נכסים אחרים לגמרי), הפנה אותם בעדינות להתחיל שיחה חדשה מהתפריט הראשי של ג׳ימי.

אם צריך לשאול שאלת הבהרה פשוטה עם 2-4 תשובות סבירות, אפשר לסיים בשורה נפרדת:
OPTIONS: אפשרות1|אפשרות2
אל תזכיר את השורה הזו בטקסט עצמו. זה לא חובה - רוב התשובות לא צריכות את זה.

אם שואלים מי אתה, אמור שאתה ג׳ימי, העוזר של האפליקציה.

איך לדבר: עברית יומיומית ורגועה, כמו חבר טוב - חם, קצר וברור. תשובה קצרה - משפט או שניים.`;

async function lookupAreaPrice(city, neighborhood) {
  async function query(nb) {
    const { data, error } = await supabaseAdmin
      .from("area_price_stats")
      .select("city,neighborhood,avg_price_per_sqm,updated_at")
      .eq("city", city)
      .eq("neighborhood", nb)
      .limit(1);
    if (error) return null;
    return Array.isArray(data) && data[0] ? data[0] : null;
  }

  if (neighborhood) {
    const exact = await query(neighborhood);
    if (exact) return exact;
  }
  return await query(""); // city-wide fallback row
}

// Converts the app's simple {role, content} chat history into Gemini's
// {role, parts} shape. Anthropic's "assistant" role becomes Gemini's "model".
function toGeminiContents(messages) {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}

function functionCallParts(candidate) {
  return (candidate?.content?.parts ?? []).filter((p) => p.functionCall);
}

async function callGemini(contents, system, attempt = 1) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": KEY,
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents,
      tools: [{ function_declarations: TOOLS }],
      generation_config: { max_output_tokens: 900 },
    }),
  });
  const data = await res.json();
  console.log("gemini status", res.status);
  console.log("gemini body", JSON.stringify(data).slice(0, 600));

  // Gemini occasionally returns 503 (model overloaded) or 429 (rate limited)
  // under normal load - these are transient, so retry a couple of times
  // with a short backoff before giving up.
  const retryable = res.status === 503 || res.status === 429;
  if (retryable && attempt < 3) {
    await new Promise((r) => setTimeout(r, attempt * 800));
    return callGemini(contents, system, attempt + 1);
  }

  // Without this check, an error response (no candidates) silently produces
  // an empty chat bubble instead of the "try again" fallback below.
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Gemini request failed (${res.status})`);
  }

  return data;
}

// Streams the final (non-tool-call) reply straight through to the client as
// it's generated, instead of waiting for the whole ~900-token response.
// PROPERTIES:/OPTIONS:/MULTI: are technical marker lines the model always
// puts at the very end - never forwarded, only the text before them is, so
// the client never sees them flash by mid-stream.
async function streamFinalReply(contents, system, res) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse`;
  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": KEY,
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents,
      tools: [{ function_declarations: TOOLS }],
      generation_config: { max_output_tokens: 900 },
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const errData = await upstream.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Gemini stream failed (${upstream.status})`);
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let sentLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const line = rawEvent.replace(/^data:\s*/, "").trim();
      if (!line) continue;

      let chunk;
      try {
        chunk = JSON.parse(line);
      } catch {
        continue;
      }

      const delta = (chunk.candidates?.[0]?.content?.parts ?? [])
        .map((p) => p.text ?? "")
        .join("");
      if (!delta) continue;

      fullText += delta;

      const markerIdx = fullText.search(/\n?(PROPERTIES:|OPTIONS:|MULTI:)/);
      const safeEnd = markerIdx === -1 ? fullText.length : markerIdx;
      if (safeEnd > sentLength) {
        res.write(`data: ${JSON.stringify({ delta: fullText.slice(sentLength, safeEnd) })}\n\n`);
        sentLength = safeEnd;
      }
    }
  }

  return fullText;
}

router.post("/chat", requireAuth, async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  if (res.flushHeaders) res.flushHeaders();

  const sendFinal = (payload) => {
    res.write(`data: ${JSON.stringify({ done: true, ...payload })}\n\n`);
    res.end();
  };

  try {
    const { messages, listings, focusPropertyId } = req.body;

    // `cover` is a client-added image URL never used by the model - stripping
    // it keeps the per-turn payload smaller without losing anything Jimmy
    // actually reasons about.
    const trimmedListings = (listings ?? []).map(({ cover, ...rest }) => rest);
    const context = trimmedListings.length
      ? `\n\nנכסים זמינים באפליקציה כרגע:\n${JSON.stringify(trimmedListings)}`
      : "";

    const system = (focusPropertyId ? SYSTEM_FOCUS : SYSTEM) + context;
    const contents = toGeminiContents(messages);

    let data = await callGemini(contents, system);
    let candidate = data.candidates?.[0];
    let calls = functionCallParts(candidate);

    for (let i = 0; i < 3 && calls.length; i++) {
      contents.push({ role: "model", parts: candidate.content.parts });

      const responseParts = [];
      for (const part of calls) {
        let result = { found: false };
        if (part.functionCall.name === "lookup_area_price") {
          const { city, neighborhood } = part.functionCall.args ?? {};
          const row = await lookupAreaPrice(city, neighborhood);
          result = row ? { found: true, ...row } : { found: false };
        }
        responseParts.push({
          functionResponse: { name: part.functionCall.name, response: result },
        });
      }
      contents.push({ role: "user", parts: responseParts });

      data = await callGemini(contents, system);
      candidate = data.candidates?.[0];
      calls = functionCallParts(candidate);
    }

    // Normally the tool loop above always ends with plain text (the system
    // prompt expects it), so stream that final answer. In the rare case the
    // model still wants another tool call after 3 rounds, just use whatever
    // text is already there rather than looping forever.
    let text;
    if (calls.length) {
      text = (candidate?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
    } else {
      text = (await streamFinalReply(contents, system, res)).trim();
    }

    let ids = [];
    const match = text.match(/PROPERTIES:\s*(.+)$/m);
    if (match) {
      ids = match[1].split(",").map((s) => s.trim()).filter(Boolean);
      text = text.replace(/PROPERTIES:.*$/m, "").trim();
    }

    let options = [];
    const optMatch = text.match(/OPTIONS:\s*(.+)$/m);
    if (optMatch) {
      options = optMatch[1].split("|").map((s) => s.trim()).filter(Boolean);
      text = text.replace(/OPTIONS:.*$/m, "").trim();
    }

    const multi = /MULTI:\s*yes/m.test(text);
    text = text.replace(/MULTI:.*$/m, "").trim();

    sendFinal({ text, ids, options, skippable: true, multi });
  } catch (e) {
    console.log("jimmy chat error", String(e));
    sendFinal({ text: "אירעה שגיאה. נסו שוב.", ids: [], options: [], skippable: false, multi: false });
  }
});

module.exports = router;
