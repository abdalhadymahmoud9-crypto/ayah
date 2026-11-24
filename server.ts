import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
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

function buildEvidenceBlock(sources: RagSource[]): string {
  const items = sources.map((s, i) => `[${i + 1}] ${s.citationMarkdown}\n${s.text}`).join('\n\n');
  return `نصوص موثقة مسترجعة من المكتبة الشاملة (المصدر الوحيد الجائز للنقل الحرفي والتوثيق):\n\n${items}`;
}

const RAG_SYSTEM_ADDITION = `\n\nتصلك أحياناً فقرة بعنوان «نصوص موثقة مسترجعة من المكتبة الشاملة» ضمن سؤال المستخدم. هذه النصوص هي المصدر الوحيد الجائز للنقل الحرفي والتوثيق:\n- انقل فقط من هذه الفقرات، ولا تنقل من حفظك أي نص من كتاب، ولو كنت واثقاً منه.\n- عزو كل نقلة يكون حرفياً كما ورد في سطر التوثيق المرفق (الكتاب، المجلد، الصفحة، الرابط).\n- إن لم تكن الفقرات المسترجعة تنص على جواب المسألة فلا تستشهد بها، وقل صراحة إن المراجع المتاحة لم تنص على الجواب.\n- لا تُدرج في قسم المتون والمراجع أي كتاب أو مجلد أو صفحة لم ترد في الفقرات المسترجعة.`;

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
  const { messages, style = 'detailed', madhhab = 'none' } = req.body;

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
    const trivial = isTrivialMessage(lastUserText);
    // Always retrieve: even greetings get real evidence, so the model never has to
    // cite from memory. Abstention applies only to non-trivial messages.
    const rag = await retrieveEvidence(lastUserText, 8000);
    if (!rag.ok && !trivial) {
      const msg = rag.reason === 'empty'
        ? 'لم أجد هذه المسألة في المراجع المعتمدة المتاحة حالياً، ولن أجيب إلا عن نص موثق منها. جرّب صياغة أخرى، أو اسأل عن مسألة من مسائل العلم المدوّنة في الكتب المعتمدة.'
        : 'تعذر الوصول إلى مكتبة المصادر حالياً، يرجى المحاولة بعد لحظات.';
      res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
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

    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.7-flash',
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemini-flash-lite-latest',
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite-preview'
    ];

    let stream: any = null;
    let fullText: string | null = null;
    let fallbackText: string | null = null;
    let lastError: any = null;
    const deadline = Date.now() + 120000; // overall cap across all model attempts

    for (const model of candidateModels) {
      if (isAborted || Date.now() > deadline) break;
      stream = null;

      for (let attempt = 0; attempt < 2; attempt++) {
        if (isAborted) break;
        try {
          const initRemaining = Math.max(deadline - Date.now(), 1000);
          stream = await Promise.race([
            ai.models.generateContentStream({
              model,
              contents,
              config: {
                systemInstruction: systemPrompt,
              },
            }),
            new Promise<never>((_, reject) => setTimeout(() => {
              const e: any = new Error('Stream init timeout (deadline-bounded)');
              e.status = 'CHUNK_TIMEOUT';
              reject(e);
            }, Math.min(45000, initRemaining))),
          ]);
          break;
        } catch (err: any) {
          lastError = err;
          const status = err?.status || err?.code;
          const msg = err?.message || '';

          // If quota exceeded on this model, immediately try next model
          if (status === 429 || msg.includes('Quota exceeded') || msg.includes('limit:')) {
            break;
          }

          // If 503 high demand spike, retry after a short pause
          if (status === 503 || msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
            if (attempt === 0) {
              await new Promise(r => setTimeout(r, 600));
              continue;
            }
          }
          break;
        }
      }

      // If streaming was established, BUFFER the full answer before sending
      // anything to the client. A mid-stream failure or stall then cleanly
      // fails over to the next model: partial output is never sent, so the
      // client can never show a truncated answer as complete, and no two
      // model answers are ever stitched together.
      if (stream) {
        let chunkTimer: ReturnType<typeof setTimeout> | null = null;
        const CHUNK_TIMEOUT_MS = 45000;
        let buffered = '';
        try {
          const iterator = stream[Symbol.asyncIterator]();
          while (true) {
            if (isAborted) break;
            const remainingMs = Math.max(deadline - Date.now(), 1000);
            const thisChunkTimeout = Math.min(CHUNK_TIMEOUT_MS, remainingMs);
            const timeoutPromise = new Promise<never>((_, reject) => {
              chunkTimer = setTimeout(() => {
                const e: any = new Error('Chunk wait exceeded ' + thisChunkTimeout + 'ms (deadline-bounded)');
                e.status = 'CHUNK_TIMEOUT';
                reject(e);
              }, thisChunkTimeout);
            });
            if (Date.now() > deadline) {
              if (chunkTimer) clearTimeout(chunkTimer);
              const e: any = new Error('Overall deadline exceeded');
              e.status = 'DEADLINE';
              throw e;
            }
            const next = await Promise.race([iterator.next(), timeoutPromise]);
            if (chunkTimer) clearTimeout(chunkTimer);
            if (next.done) break;
            const text = next.value?.text;
            if (text) {
              buffered += text;
            }
          }
          stream = null; // consumed
          if (isAborted) break;
          if (buffered.trim().length > 0) {
            fullText = buffered;
            break;
          }
          // Empty answer from this model is not accepted; try the fallback below, then next model.
          lastError = new Error('Empty answer from model');
        } catch (streamErr: any) {
          if (chunkTimer) clearTimeout(chunkTimer);
          lastError = streamErr;
          console.error('Error during chunk streaming:', streamErr);
          stream = null;
          // Nothing was sent to the client; try non-streaming fallback below, then next model.
        }
      }

      // If streaming failed before any output, try standard non-streaming generateContent on this model
      if (Date.now() <= deadline) {
        try {
          const directRes = await Promise.race([
            ai.models.generateContent({
              model,
              contents,
              config: {
                systemInstruction: systemPrompt,
              },
            }),
            new Promise<never>((_, reject) => setTimeout(() => {
              const e: any = new Error('Non-streaming fallback timeout');
              e.status = 'CHUNK_TIMEOUT';
              reject(e);
            }, Math.min(45000, Math.max(deadline - Date.now(), 1000)))),
          ]);
          if (directRes.text) {
            fallbackText = directRes.text;
            break;
          }
        } catch (err: any) {
          lastError = err;
        }
      }
    }

    const finalText = fullText || fallbackText;
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

startServer();
