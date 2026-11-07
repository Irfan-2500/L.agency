/* AI Presentation Maker: topic se slides ka JSON banata hai (Claude API).
   Vercel → Settings → Environment Variables:
     ANTHROPIC_API_KEY  (zaroori)  console.anthropic.com se
     AI_MODEL           (optional) default "claude-opus-5-5". Sasta chahiye to "claude-haiku-5-5"
     AI_PER_HOUR        (optional) ek IP se 1 ghante mein kitni PPT, default 5
   Free testing: ANTHROPIC_API_KEY na ho to GEMINI_API_KEY (aistudio.google.com, free, card nahi lagta)
     GEMINI_MODEL       (optional) default "gemini-3.8-flash"
   Key kabhi browser tak nahi jaati, sirf yahan server par use hoti hai. */
const Anthropic = require("@anthropic-ai/sdk");

const MODEL = (process.env.AI_MODEL || "claude-opus-5-5").trim();
const PER_HOUR = Math.max(1, parseInt(process.env.AI_PER_HOUR || "5", 10) || 5);
const FALLBACK_OK = /^claude-(opus-5-5|opus-5|fable-5-1|sonnet-5-5)$/.test(MODEL);

const GEMINI_KEY = (process.env.GEMINI_API_KEY || "").trim();
const GEMINI_MODEL = (process.env.GEMINI_MODEL || "gemini-3.8-flash").trim();

const send = (res, code, obj) => res.status(code).setHeader("Cache-Control", "no-store").json(obj);

/* Ek server instance ke andar IP ki ginti (best effort; Vercel kai instance chala sakta hai) */
const hits = new Map();
function limited(ip){
  const now = Date.now(), win = 3600e3;
  const list = (hits.get(ip) || []).filter(t => now - t < win);
  if (list.length >= PER_HOUR) { hits.set(ip, list); return true; }
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return false;
}

const LAYOUTS = ["title", "bullets", "two-column", "image-left", "quote", "section", "summary"];
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "subtitle", "slides"],
  properties: {
    title: { type: "string" },
    subtitle: { type: "string" },
    slides: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["layout", "title", "bullets", "left", "right", "quote", "notes", "image_query"],
        properties: {
          layout: { type: "string", enum: LAYOUTS },
          title: { type: "string" },
          bullets: { type: "array", items: { type: "string" } },
          left: { type: "array", items: { type: "string" } },
          right: { type: "array", items: { type: "string" } },
          quote: { type: "string" },
          notes: { type: "string" },
          image_query: { type: "string" }
        }
      }
    }
  }
};

const SYSTEM = `You write slide decks for PPT Store, an Indian site for teachers, students and coaching institutes.
Return only the JSON the schema asks for. Rules:
- Make exactly the number of slides asked. Slide 1 uses layout "title"; the last slide uses "summary".
- Mix layouts so the deck does not look repetitive: "bullets" (3-5 bullets), "two-column" (left/right lists for comparisons, 2-4 items each, put the column headings as the first item of each list), "image-left" (2-4 bullets beside a photo), "quote" (one key definition, formula or fact in "quote"), "section" (a divider with just a title and one-line subtitle in bullets[0]).
- Bullets are short: at most 14 words each. No numbering or bullet characters inside the text.
- Leave fields a layout does not use as an empty string or empty array.
- "notes" are 2-4 sentences the presenter can say aloud, in the same language as the slides.
- "image_query" is 2-4 plain English words for a stock-photo search (always English, even for Hindi slides); empty for "quote" and "section".
- Language: "English" means English; "Hindi" means Hindi in Devanagari script; "Hinglish" means Hindi written in Roman script mixed with English terms.
- Facts must be correct for Indian school boards (CBSE / State boards) when the topic is a school subject.`;

const clean = (s, n) => String(s || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST only" });
  if (!process.env.ANTHROPIC_API_KEY && !GEMINI_KEY) return send(res, 503, { ok: false, error: "AI PPT abhi band hai. Thodi der baad try karein." });
  const b = req.body || {};
  if (b.website) return send(res, 400, { ok: false, error: "Spam" });

  const topic = clean(b.topic, 200);
  if (topic.length < 3) return send(res, 400, { ok: false, error: "Topic likhiye (kam se kam 3 akshar)." });
  const count = Math.min(15, Math.max(3, parseInt(b.slides, 10) || 8));
  const language = ["English", "Hindi", "Hinglish"].includes(b.language) ? b.language : "English";
  const tone = ["Formal", "Casual", "Friendly", "Exam-focused"].includes(b.tone) ? b.tone : "Formal";
  const audience = clean(b.audience, 80) || "Students";
  const source = String(b.source || "").slice(0, 30000);
  const extra = clean(b.extra, 400);

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "x";
  if (limited(ip)) return send(res, 429, { ok: false, error: `Ek ghante mein ${PER_HOUR} PPT tak bana sakte hain. Thodi der baad try karein.` });

  let prompt = `Topic: ${topic}\nNumber of slides: ${count}\nLanguage: ${language}\nTone: ${tone}\nAudience: ${audience}`;
  if (extra) prompt += `\nExtra instructions from the user: ${extra}`;
  if (source) prompt += `\n\nBuild the deck from this source material (use its facts, do not invent beyond it):\n<source>\n${source}\n</source>`;

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      const deck = await gemini(prompt);
      return send(res, 200, { ok: true, deck });
    }
    const client = new Anthropic();
    const params = {
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content: prompt }]
    };
    if (FALLBACK_OK) { params.betas = ["server-side-fallback-2026-07-01"]; params.fallbacks = "default"; }
    const msg = await client.beta.messages.stream(params).finalMessage();
    if (msg.stop_reason === "refusal") return send(res, 422, { ok: false, error: "Is topic par PPT nahi ban saki. Doosra topic try karein." });
    if (msg.stop_reason === "max_tokens") return send(res, 502, { ok: false, error: "PPT bahut lambi ho gayi. Kam slides chunein." });
    const text = msg.content.filter(c => c.type === "text").map(c => c.text).join("");
    const deck = JSON.parse(text);
    if (!deck || !Array.isArray(deck.slides) || !deck.slides.length) throw new Error("empty deck");
    send(res, 200, { ok: true, deck, usage: { in: msg.usage.input_tokens, out: msg.usage.output_tokens } });
  } catch (e) {
    const code = e && e.status;
    console.error("ai-ppt", code || "", e && e.message);
    if (e && (e.name === "TimeoutError" || e.name === "AbortError")) return send(res, 504, { ok: false, error: "AI ne bahut der laga di. Kam slides chunkar dobara try karein." });
    if (code === 422) return send(res, 422, { ok: false, error: "Is topic par PPT nahi ban saki. Doosra topic try karein." });
    if (code === 429 || code === 529) return send(res, 503, { ok: false, error: "AI abhi busy hai. 1 minute baad try karein." });
    send(res, 500, { ok: false, error: "PPT nahi ban saki. Dobara try karein." });
  }
};

/* Gemini (free tier) se same JSON. Schema se additionalProperties hatana padta hai. */
function geminiSchema(x){
  if (Array.isArray(x)) return x.map(geminiSchema);
  if (!x || typeof x !== "object") return x;
  const o = {};
  for (const [k, v] of Object.entries(x)) if (k !== "additionalProperties") o[k] = geminiSchema(v);
  return o;
}
async function gemini(prompt){
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`;
  /* "low" thinking se jawab jaldi aata hai; agar model ye setting na maane to bina iske dobara */
  const call = async thinking => {
    const generationConfig = { responseMimeType: "application/json", responseSchema: geminiSchema(SCHEMA), maxOutputTokens: 12000 };
    if (thinking) generationConfig.thinkingConfig = { thinkingLevel: "low" };
    const r = await fetch(url, { method: "POST", signal: AbortSignal.timeout(100000),
      headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig }) });
    return { r, j: await r.json().catch(() => ({})) };
  };
  let { r, j } = await call(true);
  if (r.status === 400 && /thinking/i.test((j.error && j.error.message) || "")) ({ r, j } = await call(false));
  if (!r.ok) { const e = new Error((j.error && j.error.message) || "Gemini error"); e.status = r.status; throw e; }
  const c = (j.candidates || [])[0];
  if (!c || c.finishReason === "SAFETY") { const e = new Error("blocked"); e.status = 422; throw e; }
  const text = ((c.content && c.content.parts) || []).map(p => p.text || "").join("");
  const deck = JSON.parse(text);
  if (!deck || !Array.isArray(deck.slides) || !deck.slides.length) throw new Error("empty deck");
  return deck;
}
