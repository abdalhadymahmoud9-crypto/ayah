import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { generateWithFailover, PROD } from './failover.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

let lastGoodModel: string | null = null; // per instance: try the model that last worked first
function preferLastGood(models: string[]): string[] {
  return lastGoodModel && models.includes(lastGoodModel) ? [lastGoodModel, ...models.filter(m => m !== lastGoodModel)] : models;
}
const port = process.env.PORT || 3000;

app.use(express.json());

const SYSTEM_INSTRUCTION = `أنت «AYAH (آية)»، مساعد علمي وبحثي شرعي موثوق ومخصص لتبيان أحكام ومسائل الإسلام وفق عقيدة وفقه أهل السنة والجماعة على فهم السلف الصالح.

الضوابط والتعليمات الصارمة للعمل:
المرجعية والمنهج:
- تعتمد كلياً على القرآن الكريم، والسنة النبوية الصحيحة، وإجماع السلف الصالح.
- ترجع في التفسير إلى المعتمد (مثل تفسير ابن كثير والسعدي والقرطبي)، وفي الفقه إلى المتون الفقهية المعتمدة وأئمة أهل السنة والجماعة.

التوثيق القابل للتحقق (صارم):
- عند الاستشهاد بأي حديث نبوي، اكتب نصه بين « »، واذكر مصدره، ورقمه في مصدره، ودرجته الحديثية (صحيح، حسن، إلخ)، وأرفق رابط تحقق من موقع موثوق مثل dorar.net أو islamweb.info كلما أمكن.
- إذا لم تكن متأكداً يقيناً من رقم الحديث أو درجته أو الرابط الدقيق، فاذكر ذلك صراحة (مثل: «لم أتحقق يقيناً من الرقم الدقيق» أو «لا أملك رابطاً مباشراً مؤكداً») وإياك ثم إياك أن تختلق أو تخمّن رقماً أو درجة أو رابطاً غير متأكد منه.

حظر افتراض الأسعار والبيانات الحالية:
- ممنوع منعاً باتاً افتراض أو اختراع أو تخمين أي سعر حالي (سعر جرام الذهب أو الفضة أو أسعار العملات أو البضائع).
- إذا احتاجت المسألة إلى سعر حالي لإتمام الحساب (مثل تقدير نصاب الزكاة بالعملة المحلية) ولا يوجد مصدر أسعار متاح داخل التطبيق، اطلب السعر الحالي من المستخدم صراحةً قبل إتمام الحساب، واكتفِ ببيان المقدار الشرعي بالجرامات أو الطريقة الحسابية حتى يزودك المستخدم بالسعر.

الحياد والأدب في الخلاف الفقهي والوقائع الشخصية:
- اعرض أقوال المذاهب الفقهية بنسبتها الدقيقة لأصحابها ومذاهبهم بأدب علمي وموضوعية تامة دون ترجيح قاطع متعجرف أو تسفيه للقول المخالف.
- لا تحكم على المخالف في مسائل الخلاف بأنه آثم إلا بنقل صريح وموثق عن أهل العلم المعتبرين مع بيان اسم القائل ومصدر قوله بدقة.
- اختم المسائل والوقائع الشخصية (كالطوارئ، الطلاق، الأيمان، النزاعات، وحالات الضرورة أو الظروف الخاصة) بالتنبيه الصريح على أن حالة السائل الخاصة تحتاج إلى مراجعة عالم موثوق أو جهة إفتاء معتمدة للنظر في ملابساتها.

الدقة الحسابية (الزكاة والمواريث):
- في مسائل الزكاة والمواريث، اعرض الحساب رقمياً وبشكل واضح خطوة بخطوة (المبلغ أو التركة، النصاب أو الفروض، النسبة المستحقة، والنتيجة النهائية).
- عند حساب الزكاة عن سنوات متتالية (زكاة سنين ماضية)، لا تفترض أرصدة السنوات أو ما أُخرج منها من زكاة من تلقاء نفسك، بل اسأل المستخدم صراحةً عن رصيد المال في كل سنة وعن مقدار الزكاة التي أخرجها فعلاً عن كل سنة قبل إتمام الحساب، ثم احسب سنة بسنة مع التصريح بالافتراضات المستخدمة في كل خطوة. وإن كان في معاملة زكاة السنين الماضية غير المخرجة خلاف معتبر بين العلماء فبيّنه بنسبته الصحيحة لأصحابه دون جعل قاعدة واحدة مطلقة، وانصح بمراجعة عالم موثوق للحالة الخاصة.

الاستجابة لطلب السائل في الإيجاز أو التفصيل (طاعة المستخدم دون إخلال):
- امتثل فوراً لطلب السائل إن طلب اختصاراً أو تفصيلاً:
1. إذا طلب السائل إجابة «أقصر»، «موجزة»، «ملخصة»، «باختصار»، أو «بدون تطويل»:
   - لخص الحكم والمسألة بدقة عالية وإيجاز مركز في صلب المسألة.
   - شرط حازم: إياك والإخلال بأي تفصيل شرعي جوهري أو شرط أو ركن أو استثناء أو دليل أساسي أو توثيق حديثي، بل صغ المعنى بأوجز عبارة وأدق دلالة شرعية دون حشو.
2. إذا طلب السائل إجابة «مفصلة»، «مطولة»، «مبسوطة»، أو «استفاضة»:
   - ابسط المسألة بسطاً وافياً مستقصياً، واذكر تحرير محل النزاع، وأقوال أئمة المذاهب بأدلتها ونسبتها، ومناقشة الأدلة، مع الحساب التفصيلي إن وجد.
- رغبة السائل المباشرة في رسالته تنسخ أي إعداد عام مسبق وتكون لها الأولوية القصوى.

عدم التخمين:
- إذا كانت المسألة مشتبكة أو من النوازل الدقيقة، قل بوضوح: «الله أعلم، هذه المسألة تحتاج إلى مراجعة أهل العلم الثقات».

تنسيق الإجابة:
- نظّم الإجابة تحت ثلاثة عناوين رئيسية:
## الدليل من الكتاب والسنة
## أقوال أهل العلم
## الخلاصة
- اكتب الآيات الكريمة بين قوسي ﴿ ﴾ مع اسم السورة ورقم الآية بدقة.
- استشهد بالأحاديث النبوية بألفاظها بين « » مع بيان مصدرها ورقمها ودرجتها ورابط التحقق الموثوق أو التصريح بعدم التأكد.

قسم المراجع والمتون العلمية المعتمدة (إلزامي في كل إجابة):
- في نهاية كل إجابة، أدرج قسم المراجع والمتون العلمية المعتمدة لتوثيق المسألة بدقة (من أمهات كتب الحديث، أو متون الفقه المعتمدة كزاد المستقنع، عمدة الطالب، بلوغ المرام، العقيدة الواسطية، الروض المربع، وغيرها):
[[مراجع]]
- المتن: [اسم المتن أو الكتاب المعتمد] | النص: [نص المتن أو الشاهد الفقهي المقتبس بنصه بدقة] | الموضع: [الباب أو الفصل أو رقم الحديث]

أسئلة المتابعة:
- اختم الإجابة بسطر [[متابعة]] يليه ثلاثة أسئلة متابعة فقهية أو علمية قصيرة، كل سؤال في سطر مستقل يبدأ بشرطة.`;

const STYLE_INSTRUCTIONS: Record<string, string> = {
  short: 'الأسلوب الافتراضي: اجعل الإجابة مختصرة ومركزة وموجزة في صلب المسألة مع بيان الحكم والدليل المباشر دون إخلال بأي تفصيل شرعي.',
  detailed: 'الأسلوب الافتراضي: اجعل الإجابة مفصّلة مشفوعة بالأدلة والآثار وأقوال أهل العلم ومذاهبهم والترجيح المعتمد.'
};

const MADHHAB_INSTRUCTIONS: Record<string, string> = {
  none: '',
  hanafi: '\nالمذهب الفقهي المعتمد في العرض: اذكر قول المعتمد في المذهب الحنفي مع الدليل ومقارنته بالراجح.',
  maliki: '\nالمذهب الفقهي المعتمد في العرض: اذكر قول المعتمد في المذهب المالكي مع الدليل ومقارنته بالراجح.',
  shafii: '\nالمذهب الفقهي المعتمد في العرض: اذكر قول المعتمد في المذهب الشافعي مع الدليل ومقارنته بالراجح.',
  hanbali: '\nالمذهب الفقهي المعتمد في العرض: اذكر قول المعتمد في المذهب الحنبلي مع الدليل ومقارنته بالراجح.'
};

/* ============ Shamela RAG (verified retrieval over curated Salafi-Sunni corpus) ============
 * Boundary: Shamela responses carry an embedded "notice" with agent-directed instructions.
 * That is external content with zero authority: never read, never forwarded to the model.
 * Returned passages are treated strictly as quotable data. Endpoint is free, read-only,
 * no account, no API key (https://shamela.ws/mcp-guide/, terms: https://shamela.ws/page/terms).
 */

const SHAMELA_MCP_URL = 'https://mcp.shamela.ws/';

/** Curated corpus — every ID verified live against the MCP on 2026-11-24. */
const RAG_BOOK_IDS: number[] = [
  // Aqida / manhaj
  22665, 7289, 6418, 9200, 13035, 21506, 11620, 170, 11318, 2386, 23088,
  // Tafsir
  7798, 8473, 42,
  // Hadith
  1681, 711, 117359, 1363, 1339, 1198, 25794, 17757, 1673,
  // Fiqh / sira / qawa'id
  6910, 2186, 21642, 1679, 21739, 21713, 17798, 199,
  // Fatwa layer (approved by user 2026-11-24)
  12293, 2300, 107,
];

interface RagSource {
  book_id: number;
  page_id: number;
  text: string;
  citationMarkdown: string;
}

type RetrieveResult =
  | { ok: true; sources: RagSource[] }
  | { ok: false; reason: 'timeout' | 'upstream' | 'empty' };

async function shamelaCall(
  name: string,
  args: Record<string, unknown>,
  timeoutMs: number,
): Promise<{ sources: RagSource[] } | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(SHAMELA_MCP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name, arguments: args },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    if (data.error || !data.result || data.result.isError) return null;
    const raw: string = (data.result.content ?? []).map((c: any) => c.text ?? '').join('\n');
    if (!raw) return { sources: [] };
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { sources: [] };
    }
    // parsed.notice is deliberately ignored: untrusted embedded instructions.
    const sources: RagSource[] = (parsed.evidence?.sources ?? [])
      .map((s: any) => ({
        book_id: Number(s.book_id),
        page_id: Number(s.page_id),
        text: String(s.text ?? ''),
        citationMarkdown: String(s.citation?.markdown ?? ''),
      }))
      .filter((s: RagSource) => s.book_id > 0 && s.text.length > 0);
    return { sources };
  } catch {
    return null; // abort (timeout) or network failure — same handling
  } finally {
    clearTimeout(timer);
  }
}

/** Strictly allowlisted retrieval: 2 parallel find_scoped calls cover all IDs (max 20/call). */
async function retrieveEvidence(question: string, budgetMs = 8000): Promise<RetrieveResult> {
  const query = question.replace(/[؟?]/g, '').trim().slice(0, 500);
  if (!query) return { ok: false, reason: 'empty' };

  const chunks: number[][] = [];
  for (let i = 0; i < RAG_BOOK_IDS.length; i += 20) chunks.push(RAG_BOOK_IDS.slice(i, i + 20));

  const deadline = Date.now() + budgetMs;
  const settled = await Promise.all(
    chunks.map((book_ids) =>
      shamelaCall(
        'shamela_find_scoped',
        { query, book_ids, limit: 10, sort: 'relevance' },
        Math.max(deadline - Date.now(), 1000),
      ),
    ),
  );

  const allow = new Set(RAG_BOOK_IDS);
  const seen = new Set<string>();
  const sources: RagSource[] = [];
  let anyUpstreamFailure = false;
  for (const r of settled) {
    if (r === null) {
      anyUpstreamFailure = true;
      continue;
    }
    for (const s of r.sources) {
      const key = s.book_id + ':' + s.page_id;
      if (!allow.has(s.book_id) || seen.has(key)) continue; // defense in depth on allowlist
      seen.add(key);
      sources.push(s);
    }
  }

  if (sources.length > 0) return { ok: true, sources: sources.slice(0, 15) };
  return { ok: false, reason: anyUpstreamFailure ? 'upstream' : 'empty' };
}


/* ---- Question understanding: dialect-safe retrieval + relevance ---- */

// Deterministic Egyptian-dialect -> standard fiqh Arabic expansion (works even when the model is down).
const DIALECT_MAP: Record<string, string> = {
  'اتجوز': 'زواج نكاح تزوج', 'اتجوزها': 'زواج نكاح تزوج', 'اتجوزه': 'زواج نكاح تزوج', 'نتجوز': 'زواج نكاح تزوج',
  'جواز': 'زواج نكاح', 'جوازي': 'زواج نكاح', 'الجواز': 'زواج نكاح', 'جوازه': 'زواج نكاح',
  'مراتي': 'زوجتي الزوجه', 'مراته': 'زوجته الزوجه', 'جوزي': 'زوجي الزوج', 'خطيبتي': 'خطبه مخطوبه',
  'خطوبه': 'خطبه', 'الخطوبه': 'خطبه', 'اطلق': 'طلاق', 'هطلق': 'طلاق', 'طلقتها': 'طلاق', 'طلقت': 'طلاق',
  'فلوس': 'مال', 'فايده': 'ربا فائده', 'الفايده': 'ربا فائده', 'بنك': 'ربا بنوك', 'البنك': 'ربا بنوك',
  'سجاير': 'تدخين', 'سيجاره': 'تدخين', 'شيشه': 'تدخين', 'اغاني': 'غناء معازف', 'الاغاني': 'غناء معازف',
  'موسيقي': 'معازف غناء', 'الموسيقي': 'معازف غناء', 'تصوير': 'تصوير صور', 'حجاب': 'حجاب خمار',
  'ماتصليش': 'ترك الصلاه لا تصلي', 'مابتصليش': 'ترك الصلاه لا تصلي', 'مبتصليش': 'ترك الصلاه لا تصلي', 'متصليش': 'ترك الصلاه لا تصلي', 'بتصلي': 'تصلي',
  'جزمه': 'حذاء نعل خف', 'اصلي': 'صلاه صلي', 'هصلي': 'صلاه صلي', 'اصوم': 'صيام صوم', 'افطر': 'افطار صيام', 'لابس': 'لبس', 'جزمتي': 'حذاء نعل خف',
  'ينفع': 'يجوز', 'ازاي': 'كيف', 'اقرا': 'قراءه', 'ادعي': 'دعاء',
};
const DIALECT_STOP = new Set(['عاوز', 'عايز', 'عاوزه', 'عايزه', 'ينفع', 'ازاي', 'يعني', 'وكان', 'وانا', 'انا', 'عليا', 'سؤال', 'لو', 'انا', 'ده', 'دي']);
const KEYWORD_SKIP = new Set(['كيف', 'يجوز']);

export function dialectExpand(text: string): { msaQuery: string; keywords: string[]; hit: boolean } {
  const toks = normalizeArabic(text).split(' ').filter(Boolean);
  const out: string[] = [];
  const keys: string[] = [];
  let hit = false;
  for (const t of toks) {
    const m = DIALECT_MAP[t];
    if (m) {
      hit = true;
      for (const w of m.split(' ')) { if (!out.includes(w)) out.push(w); if (!KEYWORD_SKIP.has(w) && !keys.includes(w)) keys.push(w); }
    } else if (!DIALECT_STOP.has(t)) {
      out.push(t);
    }
  }
  return { msaQuery: out.join(' ').trim(), keywords: keys, hit };
}

let understandBlockedUntil = 0; // skip the rewrite call briefly after it failed (avoids stacking latency in a provider wave)

const DIAG_ENABLED = false; // public diagnostic payload disabled by default (privacy review)
export interface Understanding { inScope: boolean; msa: string; keywords: string[]; alts: string[]; }

async function understandQuestion(ai: GoogleGenAI, text: string, prior: string, budgetMs = 6000): Promise<Understanding | null> {
  const prompt = `أنت مصنّف ومحرّر استعلامات لمساعد شرعي. المستخدم يكتب غالباً بالعامية المصرية.
السؤال الحالي: «${text.slice(0, 600)}»
${prior ? `سياق سابق من المستخدم: «${prior.slice(0, 400)}»` : ''}
أعد JSON فقط بهذا الشكل:
{"in_scope": true|false, "msa": "<السؤال بالعربية الفصحى الفقهية الواضحة مع حل الإحالات من السياق>", "keywords": ["<٢ إلى ٦ كلمات مفتاحية فصيحة كما ترد في كتب الفقه والحديث، بجذورها وصيغها الشائعة، مثل: زواج، نكاح، تزوج>"], "alts": ["<عبارتان قصيرتان (٣ إلى ٧ كلمات) بصيغة عناوين الفتاوى كما يكتبها العلماء عادةً، بأشهر أفعال المسألة وصيغها، مثل: «حكم الزواج من امرأة لا تصلي» وليس «لا تقيم الصلاة»>"]}
in_scope تكون true لأي سؤال عن الدين الإسلامي أو الفقه أو العقيدة أو الحديث أو التفسير أو السيرة أو الأخلاق الشرعية أو معاملات الحياة من منظور شرعي (وإن كُتب بالعامية)، وfalse لغير ذلك (برمجة، رياضة، جغرافيا، ترفيه...). لا تفسّر بأكثر من JSON.`;
  const models = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
  const deadline = Date.now() + budgetMs;
  for (const model of models) {
    const remaining = deadline - Date.now();
    if (remaining < 800) break;
    try {
      const r: any = await Promise.race([
        ai.models.generateContent({ model, contents: [{ role: 'user', parts: [{ text: prompt }] }], config: { responseMimeType: 'application/json', httpOptions: { retryOptions: { attempts: 1 } } } }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('understand timeout')), Math.min(3000, remaining))),
      ]);
      const raw = String(r?.text ?? '').trim();
      const j = JSON.parse(raw.replace(/^```(?:json)?|```$/g, '').trim());
      const kws: string[] = Array.isArray(j.keywords) ? j.keywords.map((k: any) => String(k)).filter((k: string) => k.length >= 2).slice(0, 8) : [];
      const msa = typeof j.msa === 'string' ? j.msa.trim().slice(0, 400) : '';
      if (typeof j.in_scope !== 'boolean') continue;
      const alts: string[] = Array.isArray(j.alts) ? j.alts.map((a: any) => String(a).trim().slice(0, 120)).filter((a: string) => a.length >= 6).slice(0, 2) : [];
      return { inScope: j.in_scope, msa, keywords: kws, alts };
    } catch {
      /* try next model / give up quietly */
    }
  }
  return null;
}

/** Keep passages sharing at least one key term (normalized, definite article stripped). */
export function filterRelevant(sources: RagSource[], keywords: string[]): RagSource[] {
  const stems = keywords
    .map(k => normalizeArabic(k).replace(/^ال/, ''))
    .filter(k => k.length >= 3);
  if (stems.length === 0) return sources;
  return sources.filter(s => {
    const h = normalizeArabic(s.text);
    return stems.some(k => h.includes(k));
  });
}
// Stricter display bar: a passage is shown only if it matches at least 2 distinct key stems (or the single stem when only one exists).
export function strongRelevant(sources: RagSource[], keywords: string[]): RagSource[] {
  const stems = [...new Set(keywords.map(k => normalizeArabic(k).replace(/^ال/, '')).filter(k => k.length >= 3))];
  if (stems.length === 0) return sources;
  const need = Math.min(2, stems.length);
  const GENERIC = new Set(['صلاه', 'صلي', 'لبس', 'حكم', 'فعل', 'عمل', 'قال', 'جواز', 'شرع']);
  const topical = stems.filter(k => !GENERIC.has(k));
  return sources.filter(s => {
    const h = normalizeArabic(s.text);
    const m = stems.filter(k => h.includes(k));
    // at least 2 distinct stems, and when the question has topical (non-generic) terms, at least one of them must match
    return m.length >= need && (topical.length === 0 || m.some(k => !GENERIC.has(k)));
  });
}

async function retrieveMulti(queries: string[], budgetMs = 8000): Promise<RetrieveResult> {
  const uniq = [...new Set(queries.map(q => q.trim()).filter(Boolean))];
  const results = await Promise.all(uniq.map(q => retrieveEvidence(q, budgetMs)));
  const seen = new Set<string>();
  const merged: RagSource[] = [];
  let anyUpstream = false;
  // Round-robin across the queries so every phrasing contributes its best passages (not just the first query's).
  const lists: RagSource[][] = [];
  for (const r of results) {
    if (!r.ok) { if (r.reason !== 'empty') anyUpstream = true; continue; }
    lists.push(r.sources);
  }
  // Reserved slots: the user's own phrasing (last query) keeps its top 3 hits so exact-phrasing matches are not crowded out.
  if (results.length > 1) {
    const rawRes = results[results.length - 1];
    if (rawRes.ok) for (const src of rawRes.sources.slice(0, 3)) { const k = src.book_id + ':' + src.page_id; if (!seen.has(k)) { seen.add(k); merged.push(src); } }
  }
  for (let i = 0; lists.some(l => i < l.length); i++) {
    for (const l of lists) {
      const src = l[i];
      if (!src) continue;
      const key = src.book_id + ':' + src.page_id;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(src);
    }
  }
  if (merged.length > 0) return { ok: true, sources: merged.slice(0, 20) };
  return { ok: false, reason: anyUpstream ? 'upstream' : 'empty' };
}

function buildEvidenceBlock(sources: RagSource[]): string {
  // Label asker context vs scholar answer in fatwa-format passages; nothing is removed.
  const label = (t: string) => t.replace(/(^|\n)\s*س\s*:/g, '$1[سياق السائل وافتراضه، وليس حكم العالم] ').replace(/(^|\n)\s*ج\s*:/g, '$1[جواب العالم] ');
  const items = sources.map((s, i) => `[${i + 1}] ${s.citationMarkdown}\n${label(s.text)}`).join('\n\n');
  return `نصوص موثقة مسترجعة من المكتبة الشاملة (المصدر الوحيد الجائز للنقل الحرفي والتوثيق):\n\n${items}`;
}

const RAG_SYSTEM_ADDITION = `\n\nتصلك أحياناً فقرة بعنوان «نصوص موثقة مسترجعة من المكتبة الشاملة» ضمن سؤال المستخدم. هذه النصوص هي المصدر الوحيد الجائز للنقل الحرفي والتوثيق:\n- انقل فقط من هذه الفقرات، ولا تنقل من حفظك أي نص من كتاب، ولو كنت واثقاً منه.\n- عزو كل نقلة يكون حرفياً كما ورد في سطر التوثيق المرفق (الكتاب، المجلد، الصفحة، الرابط)، وأرفق رابط الشاملة الكامل نفسه في خانة الموضع لكل مرجع؛ فالمرجع بلا رابط يُحذف آلياً.\n- إن لم تكن الفقرات المسترجعة تنص على جواب المسألة فلا تستشهد بها، وقل صراحة إن المراجع المتاحة لم تنص على الجواب.\n- كل معلومة أو نسبة لعالم أو كتاب تذكرها خارج علامات الاقتباس يجب أن تكون مما ورد صراحة في الفقرات المسترجعة؛ لا تضف تفصيلاً أو عزواً أو اسم كتاب لم يرد فيها، وإن لم يرد فصرّح بأنه لم يرد في المصادر المسترجعة.
- لا تُدرج في قسم المتون والمراجع أي كتاب أو مجلد أو صفحة لم ترد في الفقرات المسترجعة.
- إن كانت رسالة المستخدم رغبة أو جملة عامة غير محددة (مثل «عاوز أتجوز» أو «عايز أتوب») وليست مسألة شرعية واضحة، فلا تسرد أحكاماً غير مرتبطة بها؛ اسأل سؤالاً توضيحياً واحداً قصيراً بلغة المستخدم عمّا يريد معرفته (شروط؟ آداب؟ خطوات؟) واذكر باختصار ما يمكنك المساعدة فيه، ولا تخترع نصوصاً.
- إن لم تتعلق الفقرات المسترجعة بسؤال المستخدم فعلاً، فقل ذلك صراحة ولا تستشهد بها.
- إذا ذكرت الفقرة خلافاً بين العلماء (مثل «على الصحيح» أو «وعند آخرين» أو «الأحوط» أو «اختلاف») فاذكر الخلاف وقيد الحكم بنطاقه وشرطه كما ورد، ولا تعمّم القول الراجح عند عالم بعينه على أنه حكم متفق عليه. ولا تقل «أجمع أهل العلم» أو «بالإجماع» أو «عند الجمهور» إلا إذا نصّت الفقرة المسترجعة نفسها على ذلك. انسب كل قول لقائله وكتابه كما ورد في الفقرة.
- انتبه لحالة السائل في الفقرة: إن كانت الفقرة تجيب عن حالة مختلفة عن حالة المستخدم (مثل عقد نكاح قائم منذ سنوات مقابل زواج لم يتم بعد، أو جهل مقابل تهاون) فلا تطبّقها على المستخدم كأنها حكم مسألته؛ اذكر الفرق صراحة، أو اطلب منه توضيح حالته بسؤال واحد قصير. ولا تملأ الجواب بنصائح عامة غير موثقة بدل الجواب.
- في فتاوى (س: ... ج: ...) ما بعد «س:» هو كلام السائل وافتراضه وليس حكم العالم؛ لا تنسب إلى العالم إلا ما جاء بعد «ج:». فإن قال السائل «العقد باطل» وأجاب العالم بأن المسألة خلافية فانقل الخلاف ولا تنقل قول السائل حكماً.
- لا تُدخل في جواب سؤال عام حكم مسألة فرعية (مثل ترك الصلاة) إلا إن سأل عنها المستخدم، ولا تحذف من الفقرة قيد «على الصحيح، وعند آخرين ...» عند نقل الحكم.`;

/* ---- Server-side citation validation: no citation is presented as verified
 * unless it is backed by text actually retrieved in THIS request. ---- */

export function normalizeArabic(s: string): string {
  return s
    .replace(/[\u064B-\u0652\u0670\u0640\u06D6-\u06ED]/g, '')
    .replace(/[\u0623\u0625\u0622\u0671]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .replace(/\u0629/g, '\u0647')
    .replace(/[\u0624\u0626]/g, '\u0621')
    .replace(/[\u060C\u061B\u061F\u066A-\u066D\u06D4]/g, ' ')
    .replace(/[^\u0600-\u06FFa-zA-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface RetrievedSource {
  bookId: number;
  pageId: number;
  titleVariants: string[]; // normalized
  haystack: string;        // normalized retrieved text of this exact passage
}

function buildRetrievedSources(sources: RagSource[]): RetrievedSource[] {
  return sources.map(s => {
    const m = s.citationMarkdown.match(/\[([^\]]+)\]/);
    const rawTitle = m ? m[1].replace(/\s*\([^)]*\)\s*$/, '') : '';
    const variants = rawTitle.split('=')
      .map(v => normalizeArabic(v))
      .filter(v => v.length > 2);
    return { bookId: s.book_id, pageId: s.page_id, titleVariants: variants, haystack: normalizeArabic(s.text) };
  });
}

function titleMatchesBook(cardTitle: string, book: { titleVariants: string[] }): boolean {
  const t = normalizeArabic(cardTitle);
  if (!t) return false;
  for (const v of book.titleVariants) {
    if (t.includes(v) || v.includes(t)) return true;
    const tt = new Set(t.split(' ').filter(w => w.length > 2));
    const vt = new Set(v.split(' ').filter(w => w.length > 2));
    let inter = 0;
    for (const w of tt) if (vt.has(w)) inter++;
    if (tt.size > 0 && inter / tt.size >= 0.6) return true;
  }
  return false;
}

/** All non-trivial fragments of the quote must appear in the haystack. */
function quoteInHaystack(quote: string, haystack: string): boolean {
  const fragments = quote
    .split(/[\u2026.]{3}|\u2026/)
    .map(f => normalizeArabic(f))
    .filter(f => f.length >= 10);
  if (fragments.length === 0) {
    const q = normalizeArabic(quote);
    return q.length >= 10 && haystack.includes(q);
  }
  return fragments.every(f => haystack.includes(f));
}

export interface ValidationResult {
  text: string;
  hadCitations: boolean;
  verifiedUnits: number;
  droppedCards: number;
  removedSpans: number;
  droppedLinks: number;
}

const RELIGIOUS_TERMS = [
  'حكم', 'شرع', 'دين', 'اسلام', 'صلاه', 'زكاه', 'زكوة', 'صدقه', 'صوم', 'صيام', 'رمضان',
  'حج', 'عمره', 'عقيده', 'توحيد', 'شرك', 'بدعه', 'قران', 'ايه', 'حديث', 'سنه', 'فقه',
  'طهاره', 'وضوء', 'غسل', 'جنابه', 'تيمم', 'نكاح', 'زواج', 'طلاق', 'ميراث', 'ارث', 'ربا',
  'كفاره', 'يمين', 'نذر', 'ذبح', 'اضحيه', 'عقيقه', 'جهاد', 'اذكار', 'دعاء', 'توبه',
  'شهاده', 'مسجد', 'امام', 'جماعه', 'جنازه', 'قبر', 'رقيه', 'سحر', 'حلال', 'حرام',
  'مباح', 'واجب', 'فرض', 'مستحب', 'مكروه', 'سنن', 'سلف', 'مذهب', 'فتوي', 'فتوى',
  'الله', 'النبي', 'رسول', 'ركعه', 'سجده', 'سجود', 'ركوع', 'وتر', 'تراويح', 'قيام',
  'تشهد', 'اذان', 'اقامه', 'خطبه', 'الجمعه', 'العيد', 'الفجر', 'الظهر', 'العصر',
  'المغرب', 'العشاء', 'استخاره', 'استغفار', 'تهجد', 'اعتكاف', 'نصاب', 'دليل', 'توحيد',
  'مطر', 'جورب', 'مسح', 'جمع بين', 'تفسير', 'تعالي', 'سبحانه', 'عباده', 'تزوج', 'اتجوز', 'جواز', 'خطبه', 'خطوبه', 'مولد', 'بيع', 'عينه', 'معامله', 'افطار', 'مسافر', 'تدخين', 'غناء', 'معازف',
  'نبوه', 'رساله', 'صحابه', 'التابعين', 'عذاب', 'جنه', 'نار', 'آخرة', 'اخره', 'ميعاد',
];

const OOS_TOPICS = ['برمجه', 'كود ', 'بايثون', 'جافاسكربت', 'كره القدم', 'كره السله', 'فريق', 'مباراه', 'عاصمه', 'فيلم', 'مسلسل', 'وصفه', 'طبخ', 'الطقس', 'سعر الدولار', 'اسهم', 'ريال مدريد', 'برشلونه'];

/** Deterministic scope gate: only religious/Islamic questions are in scope. */
export function isOutOfScopeQuestion(text: string, priorUserText: string): boolean {
  const t = normalizeArabic(text + ' ' + priorUserText);
  if (!t) return false;
  for (const term of RELIGIOUS_TERMS) if (t.includes(term)) return false;
  return true;
}

/** Source-backed extractive fallback: only verbatim retrieved passages with their
 * real citations. Used when no model citation can be verified. */
// Contiguous verbatim window of ~500 chars starting just before the first key-term hit (diacritics tolerated), so the shown text is where the match is.
export function windowAround(clean: string, keywords: string[]): string {
  if (clean.length <= 500) return clean;
  const D = '[\\u064B-\\u0652\\u0640]*';
  let best = -1;
  for (const k of keywords) {
    const st = normalizeArabic(k).replace(/^ال/, '');
    if (st.length < 3) continue;
    const re = new RegExp(st.split('').map(c => c === 'ه' ? '[هة]' : c === 'ا' ? '[اأإآ]' : c === 'ي' ? '[يى]' : c).join(D));
    const m = re.exec(clean);
    if (m && (best < 0 || m.index < best)) best = m.index;
  }
  if (best < 0) return clean.slice(0, 500);
  const start = Math.max(0, best - 120);
  return (start > 0 ? '…' : '') + clean.slice(start, start + 500);
}
export function buildExtractiveFallback(sources: RagSource[], keywords: string[] = []): string {
  const parts = sources.slice(0, 3).map(s => {
    const clean = s.text.replace(/\s+/g, ' ').trim();
    const cut = clean.length > 500;
    return `${s.citationMarkdown}\n«${cut ? windowAround(clean, keywords) : clean}${cut ? '…' : ''}»`;
  });
  return 'لا أملك إجابة موثقة على هذا السؤال من المصادر المعتمدة. الفقرات التالية نتيجة بحث نصي آلي، وقد لا تتعلق بسؤالك؛ تُعرض للاستئناس فقط ولا تُعد إجابة:\n\n'
    + parts.join('\n\n')
    + '\n\nهذه نتائج بحث بالكلمات وليست حكماً على المصادر: عدم ظهور جواب فيها لا يعني أن المصادر المعتمدة تخلو منه.';
}


/** Conservative "source excerpts" mode for a SMALL, explicit list of contested-ruling topics. Deterministic trigger (regex on the normalized
 * question), not a safety classification: topics outside the list are NOT guaranteed safe and still use model generation. */
export function isContestedTopic(q: string): boolean {
  const t = normalizeArabic(q);
  const prayer = /(تصلي|تصلين|تارك[هةا]? الصلاه|ترك الصلاه|لا يصلي|لايصلي|ماتصلي|ما تصلي|ماتصليش|بتصلي|مبتصل|مش بتصل|مابتصل)/.test(t);
  const marriage = /(زواج|تزوج|اتجوز|نكاح|عقد|زوج[هةا]?\b|مراتي|جوزي|زوجتي|خطيبتي)/.test(t);
  if (prayer && marriage) return true;
  if (/(تكفير|اكفر|يكفر|حكم تارك الصلاه|حكم ترك الصلاه)/.test(t)) return true;
  if (/(طلاق|تطليق|اطلق|يقع الطلاق|ايمان الطلاق)/.test(t)) return true;
  if (/(بطلان|صحه) (عقد|نكاح|الزواج)|(شروط|اركان) (صحه )?(عقد|نكاح)/.test(t)) return true;
  return false;
}
/** Applicability gate for excerpt mode: per matched topic, every concept group must appear in the (normalized) passage. Fail-closed. */
export function topicGroups(q: string): RegExp[][] {
  const t = normalizeArabic(q);
  const out: RegExp[][] = [];
  const prayer = /(تصلي|تصلين|تارك[هةا]? الصلاه|ترك الصلاه|لا يصلي|لايصلي|ماتصلي|ما تصلي|ماتصليش|بتصلي|مبتصل|مش بتصل|مابتصل)/.test(t);
  const marriage = /(زواج|تزوج|اتجوز|نكاح|عقد|زوج[هةا]?\b|مراتي|جوزي|زوجتي|خطيبتي)/.test(t);
  if (prayer && marriage) out.push([/((لا|لم|ما|مش) (تصلي|يصلي|تصلين|تصل)|تارك[هةا]? الصلاه|ترك الصلاه|تركت الصلاه|تاركه للصلاه|لا تقيم الصلاه|مبتصل)/, /(زواج|تزوج|نكاح|زوجه|زوجها|زوجته|زوجت|التزوج|عقد)/]);
  if (/(تكفير|اكفر|يكفر|حكم تارك الصلاه|حكم ترك الصلاه)/.test(t)) out.push([/(كفر|تكفير|كافر)/]);
  if (/(طلاق|تطليق|اطلق|يقع الطلاق|ايمان الطلاق)/.test(t)) out.push([/(طلاق|طلق)/]);
  if (/(بطلان|صحه) (عقد|نكاح|الزواج)|(شروط|اركان) (صحه )?(عقد|نكاح)/.test(t)) out.push([/(عقد|نكاح)/, /(بطلان|باطل|صحه|صحيح|شرط|شروط|ركن|اركان|فساد|ولي|شاهد)/]);
  return out;
}
export function passageApplicable(text: string, groups: RegExp[][]): boolean {
  const h = normalizeArabic(text);
  return groups.some(g => g.every(re => re.test(h)));
}
export function buildExcerptMode(sources: RagSource[], keywords: string[], question = ''): string {
  const lab = (t: string) => t.replace(/\s+/g, ' ').replace(/(^|\s)س\s*:/g, '$1[سؤال السائل: سياق وليس حكماً] ').replace(/(^|\s)ج\s*:/g, '\n[جواب العالم] ');
  const strong = new Set(strongRelevant(sources, keywords).map(x => x.book_id + ':' + x.page_id));
  const groups = topicGroups(question);
  const pick = groups.length > 0 ? sources.filter(x => passageApplicable(x.text, groups)).sort((x, y) => Number(strong.has(y.book_id + ':' + y.page_id)) - Number(strong.has(x.book_id + ':' + x.page_id))).slice(0, 4) : [];
  if (pick.length === 0) return 'هذه مسألة خلافية، ولن أصوغ فيها حكماً بكلامي. لم أجد في المصادر المعتمدة نصاً مطابقاً لصياغة سؤالك. جرّب صياغة أقرب لعنوان الفتوى (مثل «حكم الزواج من امرأة لا تصلي»)، أو راجع عالماً ثقة.';
  const parts = pick.map(x => {
    const clean = lab(x.text.trim());
    if (clean.length <= 1500) return `${x.citationMarkdown}\n«${clean}»`;
    // Long passage: keep the asker's question (shortened, marked) AND the start of the scholar's answer, and say so.
    const ai = clean.indexOf('[جواب العالم]');
    if (ai > 0) {
      const q = clean.slice(0, ai).trim();
      const qs = q.length > 450 ? q.slice(0, 450) + ' […اختُصر نص السؤال هنا]' : q;
      const ans = clean.slice(ai, ai + 1000);
      return `${x.citationMarkdown}\n«${qs}\n${ans}${clean.length > ai + 1000 ? ' […اقتُطع باقي النص، راجع المصدر الكامل في الرابط]' : ''}»`;
    }
    return `${x.citationMarkdown}\n«${clean.slice(0, 1500)} […اقتُطع باقي النص، راجع المصدر الكامل في الرابط]»`;
  });
  return 'هذه مسألة خلافية، ولذلك أعرض لك نصوص المصادر نفسها كما وردت بدل أن أصوغ لك حكماً بكلامي. هذه مقتطفات من المصادر المسترجعة وليست إجابة مُركّبة؛ وهي نتيجة بحث آلي قد لا ينطبق بعضها على حالتك. انتبه لعبارات الخلاف والقيود الواردة فيها مثل «على الصحيح» و«وعند آخرين»، ولما بعد «سؤال السائل» فهو كلام السائل لا العالم، ولحالة السائل فقد تختلف عن حالتك. راجع عالماً ثقة في حالتك. وقد تنتهي بعض المقتطفات بلا اكتمال لأن المصدر المسترجع مقتطع؛ فراجع الرابط للنص الكامل.\n\n'
    + parts.join('\n\n');
}

/** Model-outage response: explicitly no generated answer; only verbatim retrieved
 * passages with their exact citations. */
export function buildOutageFallback(sources: RagSource[], keywords: string[] = []): string {
  return 'خوادم التوليد مضغوطة حالياً، فلا أقدّم إجابة مولّدة. هذه فقرات مسترجعة حرفياً من المصادر المعتمدة بتوثيقها الدقيق عبر بحث نصي آلي، وقد لا تتعلق بسؤالك:\n\n'
    + buildExtractiveFallback(sources, keywords).split('\n\n').slice(1).join('\n\n');
}


/** Lines that assert consensus/majority ("أجمع", "إجماع", "جمهور", "باتفاق") in the model's own prose (outside quoted passages)
 * get an explicit qualifier: word presence in some retrieved passage does not prove the same claim, so we do not claim it was verified. */
export function qualifyConsensusClaims(text: string): { text: string; qualified: number } {
  let n = 0;
  const TERM = /(أجمع|اجمع|إجماع|اجماع|جمهور|باتفاق|بالاتفاق|متفق عليه|لا خلاف)/;
  const out = text.split('\n').map(line => {
    if (line.startsWith('[[') || line.includes('shamela.ws')) return line;
    const bare = line.replace(/«[^»]*»/g, '').replace(/"[^"]*"/g, '');
    if (!TERM.test(bare)) return line;
    if (line.includes('لم يُتحقق من نصّ المصدر')) return line;
    n++;
    return line + ' (تنبيه: عبارة الإجماع/الجمهور هنا لم يُتحقق من نصّ المصدر على ثبوتها؛ قد يوجد خلاف، فراجع النصوص الموثقة أدناه.)';
  });
  return { text: out.join('\n'), qualified: n };
}

/** Remove "(كما في X)" style attributions naming a book that was not retrieved in this request. */
export function stripUnsupportedAttributions(text: string, sources: RagSource[]): { text: string; removed: number } {
  const GENERIC = new Set(['تفسير', 'كتاب', 'جامع', 'بيان', 'مجموع', 'شرح', 'فتاوي', 'فتاوى', 'سنن', 'صحيح']);
  const titleTokens = new Set<string>();
  for (const src of sources) {
    const m = src.citationMarkdown.match(/^\[([^\]]+?)(?:\s*\(|\])/);
    const title = m ? m[1] : '';
    for (const t of normalizeArabic(title).split(' ')) {
      const k = t.replace(/^ال/, '');
      if (k.length >= 3 && !GENERIC.has(k)) titleTokens.add(k);
    }
  }
  let removed = 0;
  const out = text.replace(/\((?:كما في|انظر|ينظر|ذكره في|وانظر)\s+([^)\n]{3,140})\)/g, (full, inner: string) => {
    const segs = inner.split(/\s+و(?=\S)|،|,/).map(x => x.trim()).filter(Boolean);
    const kept = segs.filter(seg => normalizeArabic(seg).split(' ').some(t => {
      const k = t.replace(/^ال/, '');
      return k.length >= 3 && !GENERIC.has(k) && titleTokens.has(k);
    }));
    if (kept.length === segs.length) return full;
    removed += segs.length - kept.length;
    return kept.length > 0 ? `(كما في ${kept.join(' و')})` : '';
  });
  return { text: out, removed };
}

export function validateAnswerCitations(answer: string, sources: RagSource[]): ValidationResult {
  const rsrc = buildRetrievedSources(sources);
  const allHaystack = rsrc.map(s => s.haystack).join(' ');
  let droppedCards = 0, removedSpans = 0, droppedLinks = 0, verifiedUnits = 0;
  let hadCitations = false;

  // 1) [[مراجع]] cards: title must match a retrieved source, the excerpt must be
  // verbatim in THAT source, and the card's shamela link must point at exactly
  // that source's book+page. No link, wrong page, or unverified quote: drop.
  const refMatch = answer.match(/\[\[مراجع\]\]([\s\S]*?)(?=\[\[متابعة\]\]|$)/);
  if (refMatch) {
    const lines = refMatch[1].split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const kept: string[] = [];
    for (const line of lines) {
      const cleanLine = line.replace(/^[-*•\d.)\s]+/, '').trim();
      if (!cleanLine) continue;
      let title = '', excerpt = '';
      if (cleanLine.includes('|')) {
        for (const p of cleanLine.split('|').map(p => p.trim())) {
          if (/^(?:الكتاب|المتن|المرجع)\s*[:：]/i.test(p)) title = p.replace(/^(?:الكتاب|المتن|المرجع)\s*[:：]\s*/i, '').trim();
          else if (/^(?:النص|الشاهد|نص المتن)\s*[:：]/i.test(p)) excerpt = p.replace(/^(?:النص|الشاهد|نص المتن)\s*[:：]\s*/i, '').trim();
          else if (!title) title = p;
          else if (!excerpt) excerpt = p;
        }
      } else {
        const ci = cleanLine.indexOf(':');
        if (ci > 0) { title = cleanLine.slice(0, ci).trim(); excerpt = cleanLine.slice(ci + 1).trim(); }
        else { title = cleanLine; }
      }
      const linkM = line.match(/shamela\.ws\/book\/(\d+)\/(\d+)/);
      const candidates = rsrc.filter(s => titleMatchesBook(title, s) && !!excerpt && quoteInHaystack(excerpt, s.haystack));
      const exact = linkM ? candidates.find(s => s.bookId === Number(linkM[1]) && s.pageId === Number(linkM[2])) : undefined;
      if (exact) { kept.push(line); verifiedUnits++; }
      else { droppedCards++; hadCitations = true; }
    }
    if (kept.length > 0) {
      answer = answer.replace(refMatch[0], '[[مراجع]]\n' + kept.join('\n') + '\n');
      hadCitations = true;
    } else {
      answer = answer.replace(/\[\[مراجع\]\][\s\S]*?(?=\[\[متابعة\]\]|$)/, '').trim();
    }
  }

  // 2) Inline shamela.ws links must point at an exact retrieved book+page.
  answer = answer.replace(/\[([^\]]*)\]\(https:\/\/shamela\.ws\/book\/(\d+)(?:\/(\d+))?[^)]*\)/g,
    (whole, label, b, p) => {
      hadCitations = true;
      if (p && rsrc.some(s => s.bookId === Number(b) && s.pageId === Number(p))) { verifiedUnits++; return whole; }
      droppedLinks++;
      return label;
    });

  // 3) Attributed quotations outside the references block («...» and ﴿...﴾) of
  // load-bearing length must be verbatim in retrieved text; otherwise the span is
  // REMOVED (fail closed: an unverified quotation is never shown as paraphrase).
  const UNVERIFIED = '(حُذف مقطع لم يتحقق من مصدره)';
  const refsBlock = answer.match(/\[\[مراجع\]\][\s\S]*?(?=\[\[متابعة\]\]|$)/)?.[0] || '';
  const marked = refsBlock ? answer.replace(refsBlock, '\u0000REFS\u0000') : answer;
  const check = (whole: string, q: string) => {
    const nq = normalizeArabic(q);
    if (nq.length < 15) return whole;
    hadCitations = true;
    if (allHaystack && quoteInHaystack(q, allHaystack)) { verifiedUnits++; return whole; }
    removedSpans++;
    return UNVERIFIED;
  };
  let validatedBody = marked.replace(/«([^»]+)»/g, check);
  validatedBody = validatedBody.replace(/﴿([^﴾]+)﴾/g, check);
  answer = refsBlock ? validatedBody.replace('\u0000REFS\u0000', refsBlock) : validatedBody;

  return { text: answer, hadCitations, verifiedUnits, droppedCards, removedSpans, droppedLinks };
}

/** Deterministic gate for a vague personal wish ("عاوز اتجوز") on the first turn: ask one short clarifying question
 * instead of answering with unrelated rulings. No model call, no sources, no religious claims. Returns null otherwise. */
export function vagueWishClarification(text: string, turnCount: number): string | null {
  if (turnCount > 1) return null;
  const toks = normalizeArabic(text).split(' ').filter(Boolean);
  if (toks.length < 2 || toks.length > 3) return null;
  const INTENT = new Set(['عاوز', 'عايز', 'عاوزه', 'عايزه', 'نفسي', 'اريد', 'ابغي', 'ابي', 'احب', 'ودي', 'ناوي', 'ناويه']);
  if (!INTENT.has(toks[0])) return null;
  const QUESTION = ['حكم', 'هل', 'كيف', 'ازاي', 'شروط', 'يجوز', 'ليه', 'لماذا', 'ماذا', 'معني', 'تفسير', 'دليل', 'حلال', 'حرام', 'اعرف', 'اسال', 'اتعلم', 'افهم', 'عن', 'ايه', 'اي'];
  if (toks.some(t => QUESTION.includes(t))) return null;
  const rest = toks.slice(1);
  const dia = dialectExpand(rest.join(' '));
  if (dia.keywords.some(k => k === 'زواج' || k === 'نكاح')) {
    return 'ربنا ييسّر أمرك. عشان أفيدك صح: تقصد إيه بالظبط؟\n- شروط عقد الزواج وأركانه (الولي، الشهود، المهر)\n- الخطبة والنظر للمخطوبة\n- اختيار الزوج أو الزوجة\n- آداب الزواج والوليمة\n- موقف أو مشكلة معينة (احكيلي التفاصيل)\n\nاكتب اللي يهمّك وأنا أجاوبك من المصادر المعتمدة.';
  }
  return 'ممكن توضّح أكتر؟ سؤالك «' + text.trim() + '» عام، وأنا مش عايز أرد بنصوص مالهاش علاقة. اكتب سؤالك الشرعي بشكل محدد (مثلاً: ما حكم كذا؟ أو ما شروط كذا؟ أو موقف معيّن حصل معاك) وأجاوبك من المصادر المعتمدة.';
}

/** Greetings / very short small-talk skip retrieval and the abstention rule. */
function isTrivialMessage(text: string): boolean {
  const t = text.trim();
  if (t.length > 60) return false;
  return /^(السلام|سلام|مرحبا|اهلا|أهلا|هاي|صباح|مساء|شكرا|جزاك|بارك|تمام|اه|نعم|لا|طيب|حمدا|الحمد)/.test(t);
}

function sanitizeMessagesForGemini(rawMessages: Array<{ role: string; content: string }>) {
  const filtered = rawMessages
    .filter(m => m && typeof m.content === 'string' && m.content.trim().length > 0)
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content.trim() }],
    }));

  if (filtered.length === 0) return [];

  const merged: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
  for (const msg of filtered) {
    if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
      merged[merged.length - 1].parts[0].text += '\n\n' + msg.parts[0].text;
    } else {
      merged.push({ role: msg.role as 'user' | 'model', parts: [{ text: msg.parts[0].text }] });
    }
  }

  while (merged.length > 0 && merged[0].role !== 'user') {
    merged.shift();
  }

  return merged;
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.post('/api/chat', async (req, res) => {
  const { messages, style = 'detailed', madhhab = 'none', diag = false } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'قائمة الرسائل غير صالحة أو فارغة.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: 'مفتاح GEMINI_API_KEY غير موجود في البيئة. يرجى التأكد من ضبط المفتاح في Secrets.'
    });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  let isAborted = false;
  res.on('close', () => {
    if (!res.writableEnded) {
      isAborted = true;
    }
  });

  let rag: Awaited<ReturnType<typeof retrieveEvidence>> = { ok: false, reason: 'upstream' };
  let trivial = false;
  let lastRelKeywords: string[] = [];
  let relevantCount = -1; // -1: relevance not assessed
  let relevantKeys: Set<string> | null = null;
  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemPrompt = `${SYSTEM_INSTRUCTION}\n${STYLE_INSTRUCTIONS[style] || STYLE_INSTRUCTIONS.detailed}${MADHHAB_INSTRUCTIONS[madhhab] || ''}${RAG_SYSTEM_ADDITION}`;

    const contents = sanitizeMessagesForGemini(messages);
    if (contents.length === 0) {
      res.write(`data: ${JSON.stringify({ error: 'لم يتم العثور على نص صالح للسؤال.' })}\n\n`);
      res.end();
      return;
    }

    // Verified retrieval over the curated corpus BEFORE any model call.
    // On empty results or retrieval outage: abstain without calling the model
    // (no authoritative religious answer without reliable evidence).
    const lastUserText = [...contents].reverse().find(c => c.role === 'user')?.parts[0]?.text || '';
    trivial = isTrivialMessage(lastUserText);
    const wishClar = vagueWishClarification(lastUserText, contents.length);
    if (wishClar) {
      console.log('timing vague-wish clarification (no model, no retrieval)');
      res.write(`data: ${JSON.stringify({ text: wishClar })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }
    // Deterministic scope gate: non-religious questions are declined outright
    // rather than answered from tangentially retrieved texts.
    const priorUserText = [...contents].reverse().filter(c => c.role === 'user').slice(1, 3).map(c => c.parts[0]?.text || '').join(' ');
    const tStart = Date.now();
    const kwInScope = !isOutOfScopeQuestion(lastUserText, priorUserText);
    let und: Understanding | null = null;
    if (!trivial && Date.now() >= understandBlockedUntil) {
      und = await understandQuestion(ai, lastUserText, priorUserText, 6000);
      if (!und) understandBlockedUntil = Date.now() + 45000;
    }
    const tUnderstand = Date.now() - tStart;
    // Scope: the model's classification when available; keyword gate only when it is not.
    // Model down: refuse only when the keyword gate misses AND the question names a clearly non-religious topic;
    // otherwise proceed (the relevance display filter handles junk) so in-scope colloquial questions are not wrongly refused.
    const normQ = normalizeArabic(lastUserText);
    const oosTopicHit = OOS_TOPICS.some(t => normQ.includes(t));
    const outOfScope = und ? !und.inScope : (!kwInScope && oosTopicHit);
    if (!trivial && outOfScope) {
      const msg = 'هذا المساعد مخصص للمسائل الشرعية والعلوم الإسلامية فقط، وسؤالك خارج هذا النطاق. اسأل عن مسألة شرعية أو عقدية أو من علوم الدين.';
      res.write(`data: ${JSON.stringify({ text: msg })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      console.log(`timing refuse-scope understand=${tUnderstand}ms via=${und ? 'model' : 'keywords'}`);
      return;
    }
    // Dialect-safe queries: original + standard-Arabic rewrite (model, else dictionary).
    const dia = dialectExpand(lastUserText);
    const msaQuery = (und && und.msa) ? und.msa : (dia.hit ? dia.msaQuery : '');
    const GENERIC_STOP = new Set(['ما', 'حكم', 'هل', 'من', 'في', 'علي', 'عن', 'الي', 'هذا', 'هذه', 'ان', 'او', 'كيف', 'يجوز', 'لماذا', 'متي', 'اذا', 'كان', 'يكون', 'الذي', 'التي', 'مع', 'بين', 'ثم', 'قال', 'كل', 'لا', 'لم', 'له', 'لي', 'به']);
    const queryTokens = normalizeArabic(lastUserText).split(' ').filter(t => t.length >= 3 && !GENERIC_STOP.has(t) && !DIALECT_STOP.has(t) && !DIALECT_MAP[t]);
    // keywords: model's standard-Arabic terms; else dictionary terms; else the question's own content words
    const relKeywords = (und && und.keywords.length) ? und.keywords : (dia.keywords.length ? dia.keywords : queryTokens.slice(0, 5));
    lastRelKeywords = relKeywords;
    const titleVariant = lastUserText.replace(/[؟?]/g, ' ').replace(/^\s*(هل\s+يجوز|هل\s+يصح|هل\s+يحل|ما\s+حكم|ايه\s+حكم|إيه\s+حكم|حكم)\s+/, 'حكم ').replace(/\s+/g, ' ').trim();
    const queries = msaQuery ? [msaQuery, ...((und && und.alts) || []), ...(titleVariant !== lastUserText.trim() ? [titleVariant] : []), lastUserText] : [lastUserText];
    const tRet0 = Date.now();
    rag = await retrieveMulti(queries, 8000);
    const tRetrieve = Date.now() - tRet0;
    console.log(`timing understand=${tUnderstand}ms(${und ? 'model' : 'none'}) retrieve=${tRetrieve}ms queries=${queries.length} dialectHit=${dia.hit}`);
    if (rag.ok && relKeywords.length > 0 && !trivial) {
      // Relevance heuristic (term overlap, NOT semantic proof): reorder so matching passages come first.
      // Nothing is dropped here; the outage display (below) is the only place non-matching passages are hidden.
      const rel = filterRelevant(rag.sources, relKeywords);
      const relSet = new Set(rel);
      rag = { ok: true, sources: [...rel, ...rag.sources.filter(x => !relSet.has(x))].slice(0, 15) };
      relevantCount = rel.length;
      relevantKeys = new Set(strongRelevant(rel, relKeywords).map(x => x.book_id + ':' + x.page_id));
    }
    if (DIAG_ENABLED && diag === true && !trivial) {
      // Opt-in audit event for evaluation only: returned to the requester, never logged server-side.
      const dsrc = rag.ok ? rag.sources : [];
      res.write(`data: ${JSON.stringify({ diag: { model: und ? { msa: und.msa, keywords: und.keywords } : null, dialect: { msa: msaQuery, keywords: dia.keywords }, relKeywords, queries, ok: rag.ok, passages: dsrc.map(x => ({ book_id: x.book_id, page_id: x.page_id, shown: !relevantKeys || relevantKeys.has(x.book_id + ':' + x.page_id), text: x.text.slice(0, 2500) })) } })}\n\n`);
    }
    if (!rag.ok && !trivial) {
      const msg = rag.reason === 'empty'
        ? 'لم أجد هذه المسألة في المراجع المعتمدة المتاحة حالياً، ولن أجيب إلا عن نص موثق منها. جرّب صياغة أخرى، أو اسأل عن مسألة من مسائل العلم المدوّنة في الكتب المعتمدة.'
        : 'تعذر الوصول إلى مكتبة المصادر حالياً، يرجى المحاولة بعد لحظات.';
      res.write(`data: ${JSON.stringify({ text: msg })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }
    if (rag.ok && !trivial && isContestedTopic(lastUserText + ' ' + (msaQuery || ''))) {
      console.log('timing excerpt-mode (contested topic, no generation)');
      res.write(`data: ${JSON.stringify({ text: buildExcerptMode(rag.sources, relKeywords, lastUserText + ' ' + (msaQuery || '')) })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }
    if (rag.ok) {
      // Inject evidence as data into the last user part.
      const lastUser = [...contents].reverse().find(c => c.role === 'user');
      if (lastUser) {
        lastUser.parts[0].text += '\n\n' + buildEvidenceBlock(rag.sources);
      }
    }

    // Route: light models only (Google lists Flash-Lite as the fastest and cheapest; production logs showed
    // the full Flash models returning 503 or hanging). One model at a time, so no extra quota is spent.
    // A failed or hung model is cancelled and cut by the caps below; the whole answer is buffered, so
    // partial text never reaches the client. If every model fails within the 120 s deadline (unchanged from
    // before), the existing sources-only fallback applies.
    const candidateModels = [
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.1-flash-lite',
    ];
    const tGenStart = Date.now();
    const fo = await generateWithFailover({
      models: preferLastGood(candidateModels),
      start: (model, signal) => ai.models.generateContentStream({ model, contents, config: { systemInstruction: systemPrompt, abortSignal: signal, httpOptions: { retryOptions: { attempts: 1 } } } }),
      ...PROD,
      shouldStop: () => isAborted,
      onAttempt: (a) => console.log(`timing model-attempt model=${a.model} outcome=${a.outcome} ms=${a.ms} firstChunk=${a.firstChunkMs ?? '-'} at=${Date.now() - tGenStart}ms`),
    });
    const fullText: string | null = fo.text;
    const fallbackText: string | null = null;
    const lastError: any = fo.text ? null : Object.assign(new Error('all models failed or timed out'), { status: fo.attempts.some(x => x.outcome === '429') ? 429 : fo.attempts.some(x => x.outcome === '503') ? 503 : 'CHUNK_TIMEOUT' });
    if (fo.model) lastGoodModel = fo.model;
    console.log(`timing generate model=${fo.model || 'none'} total=${Date.now() - tGenStart}ms chars=${fo.text ? fo.text.length : 0} attempts=${fo.attempts.length}`);

    let finalText = fullText || fallbackText;
    // Server-side citation validation, fail closed: only citations backed by text
    // retrieved in THIS request survive — exact book AND exact page. Unverified
    // quotations are removed, never relabeled as paraphrase. If nothing verifiable
    // remains on a non-trivial question, the user gets only the retrieved source
    // passages verbatim (extractive fallback), never an unbacked answer.
    if (finalText) {
      const ragSources = rag.ok ? rag.sources : [];
      const v = validateAnswerCitations(finalText, ragSources);
      if (v.droppedCards || v.removedSpans || v.droppedLinks) {
        console.log(`citation validation: droppedCards=${v.droppedCards} removedSpans=${v.removedSpans} droppedLinks=${v.droppedLinks} verified=${v.verifiedUnits}`);
      }
      finalText = v.text;
      const att = stripUnsupportedAttributions(finalText, ragSources);
      if (att.removed) { console.log(`attribution check: removed ${att.removed} unsupported book attribution(s)`); finalText = att.text; }
      const cq = qualifyConsensusClaims(finalText);
      if (cq.qualified) { console.log(`consensus check: qualified ${cq.qualified} line(s)`); finalText = cq.text; }
      if (!trivial && v.verifiedUnits === 0 && ragSources.length > 0) {
        const shownX = relevantKeys ? ragSources.filter(x => relevantKeys!.has(x.book_id + ':' + x.page_id)) : ragSources;
        finalText = shownX.length > 0 ? buildExtractiveFallback(shownX) : 'لا أملك إجابة موثقة على هذا السؤال، والبحث النصي لم يُرجع فقرات تشترك مع كلمات سؤالك المفتاحية. هذا لا يعني أن المصادر المعتمدة تخلو من الجواب؛ جرّب صياغة أخرى للسؤال.';
        console.log('citation validation: answer replaced with extractive fallback (no verifiable citation units)');
      }
    }
    if (finalText) {
      // Chunk out the completed answer smoothly
      const chunkSize = 20;
      for (let i = 0; i < finalText.length; i += chunkSize) {
        if (isAborted) break;
        const slice = finalText.slice(i, i + chunkSize);
        res.write(`data: ${JSON.stringify({ text: slice })}\n\n`);
      }
    } else {
      let friendlyError = 'تعذر الوصول إلى نماذج الذكاء الاصطناعي حالياً، يرجى المحاولة بعد لحظات.';
      const errMsg = lastError?.message || '';
      if (lastError?.status === 429 || errMsg.includes('Quota exceeded') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        friendlyError = 'تم استهلاك الحد اليومي لطلبات الحساب المجاني (Quota limit). يرجى المحاولة لاحقاً أو مراجعة إعدادات المفتاح.';
      } else if (lastError?.status === 503 || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE')) {
        friendlyError = 'الخدمة تشهد ضغطاً مؤقتاً في خوادم المعالجة، يرجى إعادة المحاولة بعد بضع ثوانٍ.';
      }
      throw new Error(friendlyError);
    }

    if (!isAborted) {
      res.write('data: [DONE]\n\n');
    }
    res.end();
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    if (!res.writableEnded) {
      // Graceful degradation: on model outage with retrieved evidence, return the
      // verbatim retrieved passages with exact citations and no generated answer.
      if (!trivial && rag.ok && rag.sources.length > 0) {
        console.log(`model outage: serving retrieval-only fallback (no generated answer) relevant=${relevantCount}`);
        const shown = relevantKeys ? rag.sources.filter(x => relevantKeys!.has(x.book_id + ':' + x.page_id)) : rag.sources;
        const outText = shown.length > 0
          ? buildOutageFallback(shown, lastRelKeywords)
          : 'خوادم التوليد مضغوطة حالياً، فلا أقدّم إجابة مولّدة. والبحث النصي لم يُرجع فقرات تشترك مع كلمات سؤالك المفتاحية. هذا لا يعني أن المصادر المعتمدة تخلو من الجواب؛ أعد المحاولة بعد قليل أو جرّب صياغة أخرى.';
        res.write(`data: ${JSON.stringify({ text: outText })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }
      const errorMessage = error?.message || 'حدث خطأ غير متوقع أثناء معالجة السؤال.';
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.end();
    }
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
  });
}

// On Vercel the platform serves the built UI and runs this app as a function (see api/index.ts),
// so only start the long-running listener elsewhere (local dev, other hosts).
if (!process.env.VERCEL) {
  startServer();
}

export default app;
