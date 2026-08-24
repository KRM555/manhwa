import React, { useRef, useState } from 'react';
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
  originalText: string;
  translatedText: string;
  category: 'dialogue' | 'thought' | 'sfx' | 'system';
}

type TextCategory =
  | 'dialogue'
  | 'thought'
  | 'sfx'
  | 'system';

/**
 * توحيد نوع التصنيف القادم من Gemini
 */
const normalizeCategory = (
  category?: string
): TextCategory => {
  const value = (category || '')
    .toLowerCase()
    .trim();

  switch (value) {
    case 'thought':
    case 'thoughts':
    case 'inner':
    case 'inner monologue':
      return 'thought';

    case 'sfx':
    case 'sound':
    case 'sound effect':
    case 'sound_effect':
      return 'sfx';

    case 'system':
    case 'system text':
    case 'ui':
    case 'interface':
      return 'system';

    case 'dialogue':
    default:
      return 'dialogue';
  }
};

/**
 * استخراج وتحويل النص باستخدام Gemini
 */
export async function extractTextWithGemini(
  imageBase64: string,
  apiKey: string,
  targetLang: string,
  isOcrOnly: boolean,
  mimeType: string = 'image/jpeg'
): Promise<GeminiTextItem[]> {
  const cleanKey = apiKey?.trim();

  if (!cleanKey) {
    throw new Error(
      'يرجى إدخال Gemini API Key أولاً من الإعدادات'
    );
  }

  const cleanBase64 = imageBase64.includes(',')
    ? imageBase64.split(',')[1]
    : imageBase64;

  const targetLanguageName =
    targetLang === 'ar'
      ? 'Arabic'
      : targetLang === 'en'
      ? 'English'
      : targetLang;

  const ocrPrompt = `
You are a highly accurate OCR engine specialized in Manga, Manhwa, Webtoon and Comics.
Analyze the uploaded image carefully.
Extract EVERY visible text element in natural reading order.
Classify every text element into exactly one category:
- dialogue
- thought
- sfx
- system

Definitions:
dialogue: Spoken dialogue inside speech bubbles.
thought: Inner monologue, thoughts or internal narration.
sfx: Sound effects and action sounds.
system: Game UI, status windows, missions, notifications, statistics, skill descriptions and system messages.

Important rules:
- Extract ALL readable text.
- Do not skip small text.
- Do not merge unrelated text blocks.
- Keep separate speech bubbles as separate items.
- Preserve line breaks where meaningful.
- For OCR mode, translatedText must contain the same content as originalText.
`;

  const translationPrompt = `
You are a professional Manga, Manhwa, Webtoon and Comic OCR and translation engine.
Analyze the uploaded image carefully.

For EVERY visible text element:
1. Extract the original text accurately.
2. Translate it naturally into ${targetLanguageName}.
3. Classify it into exactly one category:
- dialogue
- thought
- sfx
- system

Classification rules:
dialogue: Spoken dialogue in speech bubbles.
thought: Inner monologue, thoughts or internal narration.
sfx: Sound effects, impact sounds and action sounds.
system: Game interfaces, missions, statistics, status windows, skill descriptions, notifications and system messages.

Translation rules:
- Translate naturally according to the context.
- Preserve the meaning and tone.
- Do not omit readable text.
- Do not merge separate text blocks.
- Keep every independent speech bubble or text region as a separate item.
- Preserve useful line breaks.
- For system text, preserve numbers, levels, statistics and game terminology accurately.
- For SFX, translate the sound naturally when possible.

Important:
Extract ALL readable text from the image.
Never intentionally return an empty result if text exists.
`;

  const promptText = isOcrOnly
    ? ocrPrompt
    : translationPrompt;

  const MODEL_NAME = 'gemini-3.6-flash';

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${MODEL_NAME}:generateContent?key=${encodeURIComponent(
      cleanKey
    )}`;

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
          response_schema: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                originalText: {
                  type: 'STRING',
                  description:
                    'The exact original text extracted from the manga image.',
                },
                translatedText: {
                  type: 'STRING',
                  description:
                    'The translated version of the original text.',
                },
                category: {
                  type: 'STRING',
                  enum: [
                    'dialogue',
                    'thought',
                    'sfx',
                    'system',
                  ],
                  description:
                    'The category of this manga text block.',
                },
              },
              required: [
                'originalText',
                'translatedText',
                'category',
              ],
            },
          },
          temperature: 0.1,
        },
      }),
    });
  } catch (networkError) {
    console.error('NETWORK ERROR:', networkError);
    throw new Error(
      'تعذر الاتصال بـ Gemini API. تحقق من اتصال الإنترنت.'
    );
  }

  let resData: any;

  try {
    resData = await response.json();
  } catch (error) {
    console.error('RESPONSE JSON ERROR:', error);
    throw new Error(
      `تعذر قراءة استجابة Gemini. HTTP Status: ${response.status}`
    );
  }

  console.log('FULL GEMINI RESPONSE:', resData);

  if (!response.ok) {
    console.error('GEMINI API ERROR:', resData);
    const errorMessage =
      resData?.error?.message ||
      `فشل Gemini API. HTTP ${response.status}`;
    throw new Error(errorMessage);
  }

  if (
    !resData?.candidates ||
    !Array.isArray(resData.candidates) ||
    resData.candidates.length === 0
  ) {
    console.error('NO CANDIDATES:', resData);
    const promptBlockReason =
      resData?.promptFeedback?.blockReason;

    if (promptBlockReason) {
      throw new Error(`تم حظر الطلب: ${promptBlockReason}`);
    }

    throw new Error('Gemini لم يُرجع أي نتيجة.');
  }

  const parts =
    resData.candidates[0]?.content?.parts || [];

  const textResult = parts
    .filter(
      (part: any) =>
        typeof part?.text === 'string'
    )
    .map((part: any) => part.text)
    .join('')
    .trim();

  console.log('GEMINI TEXT RESULT:', textResult);

  if (!textResult) {
    const finishReason =
      resData.candidates[0]?.finishReason;
    console.error('EMPTY GEMINI RESULT:', resData);
    throw new Error(
      `Gemini لم يُرجع نصًا. Finish Reason: ${
        finishReason || 'Unknown'
      }`
    );
  }

  let parsedResult: any;

  try {
    parsedResult = JSON.parse(textResult);
  } catch (parseError) {
    console.error('JSON PARSE ERROR:', parseError);
    throw new Error(
      'Gemini أرجع بيانات غير قابلة للقراءة كـ JSON.'
    );
  }

  if (!Array.isArray(parsedResult)) {
    console.error('EXPECTED ARRAY BUT RECEIVED:', parsedResult);
    throw new Error(
      'تم استلام JSON لكن بصيغة غير متوقعة.'
    );
  }

  const normalizedItems = parsedResult
    .filter(
      (item: any) =>
        item &&
        typeof item === 'object'
    )
    .map(
      (item: any): GeminiTextItem => ({
        originalText: String(item.originalText || ''),
        translatedText: String(
          item.translatedText ||
            item.originalText ||
            ''
        ),
        category: normalizeCategory(item.category),
      })
    )
    .filter(
      (item: GeminiTextItem) =>
        item.originalText.trim() !== '' ||
        item.translatedText.trim() !== ''
    );

  console.log('NORMALIZED GEMINI ITEMS:', normalizedItems);

  return normalizedItems;
}

/**
 * UploadZone Component
 */
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

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    if (!apiKey?.trim()) {
      toast.error('برجاء إدخال Gemini API Key أولاً من الإعدادات!');
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
          `جاري تحليل وترجمة الصورة ${i + 1} من ${
            imageFiles.length
          }...`
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

          /**
           * توحيد أسماء الحقول المرجعة للتوافق مع مكونات الواجهة (UI Compatibility)
           */
          const pageItems = rawItems.map((item, index) => ({
            id: `item_${Date.now()}_${i}_${index}_${Math.random()
              .toString(36)
              .slice(2, 8)}`,
            originalText: item.originalText,
            translatedText: item.translatedText,
            text: item.translatedText || item.originalText, // لضمان التوافق مع الكارتات
            original: item.originalText,
            translated: item.translatedText,
            category: item.category,
            type: item.category, // لضمان التوافق مع فلتر الفئات (ALL, DIALOGUE, SFX...)
            isEdited: false,
          }));

          pages.push({
            id: `page_${Date.now()}_${i}_${Math.random()
              .toString(36)
              .slice(2, 8)}`,
            name: file.name,
            imageUrl: base64,
            items: pageItems,
            blocks: pageItems, // بعض المكونات تستخدم blocks بدلاً من items
            status: 'completed',
            error: null,
          });

          successfulPages++;
          console.log(`SUCCESSFULLY PROCESSED: ${file.name}`);
          console.log('PAGE ITEMS:', pageItems);
        } catch (pageError: any) {
          failedPages++;
          console.error(
            `ERROR PROCESSING ${file.name}:`,
            pageError
          );

          let fallbackImageUrl = '';
          try {
            fallbackImageUrl = await readFileAsDataUrl(file);
          } catch (imageReadError) {
            console.error('FALLBACK IMAGE ERROR:', imageReadError);
          }

          pages.push({
            id: `page_error_${Date.now()}_${i}_${Math.random()
              .toString(36)
              .slice(2, 8)}`,
            name: file.name,
            imageUrl: fallbackImageUrl,
            items: [],
            blocks: [],
            status: 'error',
            error:
              pageError?.message || 'فشل استخراج النصوص',
          });

          toast.error(
            `${file.name}: ${
              pageError?.message || 'حدث خطأ أثناء المعالجة'
            }`
          );
        }
      }

      if (pages.length > 0) {
        console.log('ALL PAGES SENT TO APP:', pages);
        onPagesLoaded(pages);
      }

      if (successfulPages > 0 && failedPages === 0) {
        toast.success(
          `تم تحليل وترجمة ${successfulPages} صورة بنجاح!`
        );
      } else if (successfulPages > 0 && failedPages > 0) {
        toast.warning(
          `تمت معالجة ${successfulPages} صورة، وفشل ${failedPages} صورة`
        );
      } else {
        toast.error(
          'فشلت معالجة جميع الصور. افتح Console لمعرفة السبب.'
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
        onChange={(event) =>
          handleFileSelect(event.target.files)
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
          w-full
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
          ${isLoading ? 'opacity-75 pointer-events-none' : ''}
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