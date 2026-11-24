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

    const systemPrompt = `${SYSTEM_INSTRUCTION}\n${STYLE_INSTRUCTIONS[style] || STYLE_INSTRUCTIONS.detailed}${MADHHAB_INSTRUCTIONS[madhhab] || ''}`;

    const contents = sanitizeMessagesForGemini(messages);
    if (contents.length === 0) {
      res.write(`data: ${JSON.stringify({ error: 'لم يتم العثور على نص صالح للسؤال.' })}\n\n`);
      res.end();
      return;
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
    let fallbackText: string | null = null;
    let lastError: any = null;

    for (const model of candidateModels) {
      if (isAborted) break;

      for (let attempt = 0; attempt < 2; attempt++) {
        if (isAborted) break;
        try {
          stream = await ai.models.generateContentStream({
            model,
            contents,
            config: {
              systemInstruction: systemPrompt,
            },
          });
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

      if (stream) break;

      // If stream couldn't be initialized, try standard non-streaming generateContent on this model
      try {
        const directRes = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: systemPrompt,
          },
        });
        if (directRes.text) {
          fallbackText = directRes.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    // If streaming was established, stream chunks out
    if (stream) {
      try {
        for await (const chunk of stream) {
          if (isAborted) break;
          const text = chunk.text;
          if (text) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        }
      } catch (streamErr: any) {
        // If stream broke mid-way, log and end
        console.error('Error during chunk streaming:', streamErr);
      }
    } else if (fallbackText) {
      // Chunk out the fallback text smoothly
      const chunkSize = 20;
      for (let i = 0; i < fallbackText.length; i += chunkSize) {
        if (isAborted) break;
        const slice = fallbackText.slice(i, i + chunkSize);
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
