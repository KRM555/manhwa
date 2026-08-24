import React, { useState, useRef } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface UploadZoneProps {
  apiKey: string;
  targetLang: string;
  isOcrOnly: boolean;
  typerRules?: any[];
  onPagesLoaded: (pages: any[]) => void;
  onStartProcessing?: () => void;
}

interface GeminiTextItem {
  originalText?: string;
  translatedText?: string;
  category?: string;
}

const normalizeCategory = (category: string | undefined) => {
  const value = (category || '').toLowerCase().trim();

  if (
    value === 'dialogue' ||
    value === 'thought' ||
    value === 'sfx' ||
    value === 'system'
  ) {
    return value;
  }

  if (
    value.includes('thought') ||
    value.includes('thinking') ||
    value.includes('inner')
  ) {
    return 'thought';
  }

  if (
    value.includes('sound') ||
    value.includes('effect') ||
    value.includes('sfx')
  ) {
    return 'sfx';
  }

  if (
    value.includes('system') ||
    value.includes('ui') ||
    value.includes('interface')
  ) {
    return 'system';
  }

  return 'dialogue';
};

const extractJsonFromResponse = (text: string): any[] => {
  if (!text || typeof text !== 'string') {
    throw new Error('Gemini لم يُرجع أي نص');
  }

  let cleaned = text.trim();

  // إزالة Markdown code fences إن وجدت
  cleaned = cleaned
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // المحاولة الأولى: JSON مباشر
  try {
    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (Array.isArray(parsed.blocks)) {
      return parsed.blocks;
    }

    if (Array.isArray(parsed.items)) {
      return parsed.items;
    }

    if (Array.isArray(parsed.results)) {
      return parsed.results;
    }
  } catch {
    // ننتقل لمحاولة استخراج الـ JSON من النص
  }

  // البحث عن JSON array داخل الرد
  const arrayStart = cleaned.indexOf('[');
  const arrayEnd = cleaned.lastIndexOf(']');

  if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
    const jsonArray = cleaned.substring(arrayStart, arrayEnd + 1);

    try {
      const parsed = JSON.parse(jsonArray);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // continue
    }
  }

  // البحث عن JSON object
  const objectStart = cleaned.indexOf('{');
  const objectEnd = cleaned.lastIndexOf('}');

  if (
    objectStart !== -1 &&
    objectEnd !== -1 &&
    objectEnd > objectStart
  ) {
    const jsonObject = cleaned.substring(
      objectStart,
      objectEnd + 1
    );

    try {
      const parsed = JSON.parse(jsonObject);

      if (Array.isArray(parsed.blocks)) {
        return parsed.blocks;
      }

      if (Array.isArray(parsed.items)) {
        return parsed.items;
      }

      if (Array.isArray(parsed.results)) {
        return parsed.results;
      }
    } catch {
      // continue
    }
  }

  console.error('RAW GEMINI RESPONSE:', text);

  throw new Error(
    'تم استلام رد من Gemini لكن لم يمكن تحويله إلى JSON صحيح'
  );
};

export async function extractTextWithGemini(
  imageBase64: string,
  apiKey: string,
  targetLang: string,
  isOcrOnly: boolean,
  mimeType: string = 'image/jpeg'
) {
  const cleanKey = apiKey?.trim();

  if (!cleanKey) {
    throw new Error(
      'يرجى إدخال Gemini API Key أولاً من الإعدادات'
    );
  }

  // إزالة الجزء الخاص بـ data:image/...;base64,
  const cleanBase64 = imageBase64.includes(',')
    ? imageBase64.split(',')[1]
    : imageBase64;

  const targetLanguageName =
    targetLang === 'ar'
      ? 'Arabic'
      : targetLang === 'en'
      ? 'English'
      : targetLang;

  const promptText = isOcrOnly
    ? `
You are a highly accurate OCR engine specialized in Manga, Manhwa, Webtoon and Comics.

Analyze the uploaded image carefully.

Extract EVERY visible text element in natural reading order.

Classify each text element into exactly one of:
- dialogue
- thought
- sfx
- system

Return ONLY valid JSON.
Do NOT use markdown.
Do NOT add explanations.
Do NOT add comments.

Use exactly this format:

[
  {
    "originalText": "exact original text",
    "translatedText": "same as original text",
    "category": "dialogue"
  }
]

Important:
- Extract all visible text, including speech bubbles, narration, system windows and sound effects.
- Preserve the original text as accurately as possible.
- Never return an empty array if readable text exists.
`
    : `
You are a professional Manga, Manhwa, Webtoon and Comics OCR and translation engine.

Analyze the uploaded image very carefully.

Your job:
1. Extract EVERY visible text element in natural reading order.
2. Preserve the original text accurately.
3. Translate every text element naturally into ${targetLanguageName}.
4. Classify each element into exactly one of:
   - dialogue
   - thought
   - sfx
   - system

Return ONLY valid JSON.
Do NOT use markdown.
Do NOT add explanations.
Do NOT add comments.
Do NOT wrap the response in \`\`\`.

Use exactly this format:

[
  {
    "originalText": "original text",
    "translatedText": "translated text",
    "category": "dialogue"
  }
]

Translation rules:
- dialogue: natural spoken dialogue
- thought: internal thoughts
- sfx: translate the sound effect naturally
- system: system messages, game interfaces, notifications, status windows

Important:
- Extract ALL readable text from the image.
- Never return an empty array if readable text exists.
- Do not merge unrelated speech bubbles.
- Keep each text block as a separate object.
- Return valid JSON only.
`;

  /*
   * Official current Gemini model endpoint.
   * You can change MODEL_NAME if you want another model.
   */
  const MODEL_NAME = 'gemini-3.6-flash';

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${MODEL_NAME}:generateContent?key=${encodeURIComponent(cleanKey)}`;

  let response: Response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: promptText,
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: cleanBase64,
                },
              },
            ],
          },
        ],

        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.1,
        },
      }),
    });
  } catch (networkError: any) {
    console.error('NETWORK ERROR:', networkError);

    throw new Error(
      'تعذر الاتصال بـ Gemini API. تحقق من الإنترنت أو من إعدادات API Key.'
    );
  }

  let resData: any = {};

  try {
    resData = await response.json();
  } catch {
    throw new Error(
      `Gemini API أرجع استجابة غير قابلة للقراءة (${response.status})`
    );
  }

  console.log('FULL GEMINI RESPONSE:', resData);

  if (!response.ok) {
    const errorMessage =
      resData?.error?.message ||
      `فشل الاتصال بـ Gemini API. HTTP ${response.status}`;

    console.error('GEMINI API ERROR:', resData);

    throw new Error(errorMessage);
  }

  // التحقق من وجود candidates
  if (
    !resData?.candidates ||
    !Array.isArray(resData.candidates) ||
    resData.candidates.length === 0
  ) {
    console.error('NO CANDIDATES:', resData);

    throw new Error(
      'Gemini لم يُرجع أي نتيجة. تحقق من API Key أو حدود الاستخدام.'
    );
  }

  // جمع النص من كل parts بدل الاعتماد على أول part فقط
  const parts =
    resData.candidates?.[0]?.content?.parts || [];

  const textResult = parts
    .filter((part: any) => typeof part.text === 'string')
    .map((part: any) => part.text)
    .join('')
    .trim();

  console.log('GEMINI TEXT RESULT:', textResult);

  if (!textResult) {
    const finishReason =
      resData.candidates?.[0]?.finishReason;

    console.error('EMPTY GEMINI RESULT:', resData);

    throw new Error(
      `Gemini لم يُرجع نصًا. Finish reason: ${
        finishReason || 'unknown'
      }`
    );
  }

  const parsedItems = extractJsonFromResponse(textResult);

  return parsedItems.map((item: GeminiTextItem) => ({
    originalText:
      item.originalText ||
      (item as any).original ||
      (item as any).sourceText ||
      '',

    translatedText:
      item.translatedText ||
      (item as any).translated ||
      (item as any).translation ||
      item.originalText ||
      (item as any).original ||
      '',

    category: normalizeCategory(
      item.category ||
        (item as any).type ||
        (item as any).classification
    ),
  }));
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  apiKey,
  targetLang,
  isOcrOnly,
  onPagesLoaded,
  onStartProcessing,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('فشل تحويل الصورة'));
        }
      };

      reader.onerror = () => {
        reject(new Error('فشل قراءة الصورة'));
      };

      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (
    files: FileList | null
  ) => {
    if (!files || files.length === 0) {
      return;
    }

    if (!apiKey?.trim()) {
      toast.error(
        'برجاء إدخال Gemini API Key أولاً من الإعدادات!'
      );
      return;
    }

    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith('image/')
    );

    if (imageFiles.length === 0) {
      toast.error('يرجى اختيار صور فقط');
      return;
    }

    setIsLoading(true);

    if (typeof onStartProcessing === 'function') {
      onStartProcessing();
    }

    const pages: any[] = [];
    let successfulPages = 0;
    let failedPages = 0;

    try {
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];

        setStatusText(
          `جاري تحليل وترجمة الصورة (${i + 1}/${imageFiles.length})...`
        );

        try {
          const base64 = await readFileAsDataUrl(file);

          const rawItems = await extractTextWithGemini(
            base64,
            apiKey,
            targetLang,
            isOcrOnly,
            file.type || 'image/jpeg'
          );

          const pageItems = rawItems.map(
            (item: GeminiTextItem, idx: number) => ({
              id: `item_${Date.now()}_${i}_${idx}_${Math.random()
                .toString(36)
                .slice(2, 7)}`,

              originalText: item.originalText || '',

              translatedText:
                item.translatedText ||
                item.originalText ||
                '',

              category:
                normalizeCategory(item.category),

              isEdited: false,
            })
          );

          pages.push({
            id: `page_${Date.now()}_${i}_${Math.random()
              .toString(36)
              .slice(2, 7)}`,

            name: file.name,

            imageUrl: base64,

            items: pageItems,

            status: 'completed',
          });

          successfulPages++;

          console.log(
            `PAGE ${file.name} RESULTS:`,
            pageItems
          );
        } catch (pageError: any) {
          failedPages++;

          console.error(
            `ERROR PROCESSING ${file.name}:`,
            pageError
          );

          // نضيف الصفحة حتى لو فشل Gemini
          // حتى لا تختفي الصورة
          const base64 = await readFileAsDataUrl(file);

          pages.push({
            id: `page_${Date.now()}_${i}_${Math.random()
              .toString(36)
              .slice(2, 7)}`,

            name: file.name,

            imageUrl: base64,

            items: [],

            status: 'error',

            error:
              pageError?.message ||
              'فشل استخراج النصوص',
          });

          toast.error(
            `${file.name}: ${
              pageError?.message ||
              'فشل استخراج النصوص'
            }`
          );
        }
      }

      if (pages.length > 0) {
        onPagesLoaded(pages);
      }

      if (successfulPages > 0 && failedPages === 0) {
        toast.success(
          `تم تحليل وترجمة ${successfulPages} صورة بنجاح!`
        );
      } else if (successfulPages > 0) {
        toast.warning(
          `تمت معالجة ${successfulPages} صورة، وفشل ${failedPages} صورة`
        );
      } else {
        toast.error(
          'فشلت معالجة جميع الصور. افتح Console لمعرفة الخطأ.'
        );
      }
    } catch (error: any) {
      console.error('UPLOAD ERROR:', error);

      toast.error(
        error?.message ||
        'حدث خطأ غير متوقع أثناء رفع الملفات'
      );
    } finally {
      setIsLoading(false);
      setStatusText('');

      // يسمح برفع نفس الملفات مرة أخرى
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) =>
          handleFileSelect(e.target.files)
        }
        multiple
        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
        className="hidden"
      />

      <div
        onClick={() => {
          if (!isLoading) {
            fileInputRef.current?.click();
          }
        }}
        className={`
          border-2
          border-dashed
          rounded-2xl
          p-10
          text-center
          cursor-pointer
          transition-all
          bg-slate-900/40
          border-slate-800
          hover:border-orange-500/50
          ${
            isLoading
              ? 'opacity-75 pointer-events-none'
              : ''
          }
        `}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 bg-orange-500/20 rounded-2xl border border-orange-500/30 flex items-center justify-center text-orange-400">
            {isLoading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <Upload className="w-8 h-8" />
            )}
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-200">
              {isLoading
                ? statusText
                : 'اضغط هنا أو اسحب الصور للرفع والاستخراج والترجمة'}
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              PNG • JPG • JPEG • WEBP
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadZone;