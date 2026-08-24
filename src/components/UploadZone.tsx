import React, { useRef, useState } from 'react';
import { Upload, Loader2, Play } from 'lucide-react';
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

type TextCategory = 'dialogue' | 'thought' | 'sfx' | 'system';

const normalizeCategory = (category?: string): TextCategory => {
  const value = (category || '').toLowerCase().trim();
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

export async function extractTextWithGemini(
  imageBase64: string,
  apiKey: string,
  targetLang: string,
  isOcrOnly: boolean,
  mimeType: string = 'image/jpeg'
): Promise<GeminiTextItem[]> {
  const cleanKey = apiKey?.trim();

  if (!cleanKey) {
    throw new Error('يرجى إدخال Gemini API Key أولاً من الإعدادات');
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
Classify every text element into exactly one category: dialogue, thought, sfx, system.
`;

  const translationPrompt = `
You are a professional Manga, Manhwa, Webtoon and Comic OCR and translation engine.
Analyze the uploaded image carefully.
For EVERY visible text element:
1. Extract the original text accurately.
2. Translate it naturally into ${targetLanguageName}.
3. Classify it into exactly one category: dialogue, thought, sfx, system.
`;

  const promptText = isOcrOnly ? ocrPrompt : translationPrompt;
  const MODEL_NAME = 'gemini-3.6-flash';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${encodeURIComponent(cleanKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: promptText },
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
              originalText: { type: 'STRING' },
              translatedText: { type: 'STRING' },
              category: {
                type: 'STRING',
                enum: ['dialogue', 'thought', 'sfx', 'system'],
              },
            },
            required: ['originalText', 'translatedText', 'category'],
          },
        },
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `فشل الاتصال بـ API (${response.status})`);
  }

  const resData = await response.json();
  const parts = resData.candidates?.[0]?.content?.parts || [];
  const textResult = parts
    .filter((part: any) => typeof part?.text === 'string')
    .map((part: any) => part.text)
    .join('')
    .trim();

  if (!textResult) {
    throw new Error('Gemini لم يُرجع أي نصوص.');
  }

  const parsedResult = JSON.parse(textResult);

  return parsedResult.map((item: any) => ({
    originalText: String(item.originalText || ''),
    translatedText: String(item.translatedText || item.originalText || ''),
    category: normalizeCategory(item.category),
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
  const [uploadedFiles, setUploadedFiles] = useState<{ file: File; base64: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('فشل قراءة الصورة'));
      reader.readAsDataURL(file);
    });
  };

  // 1. مرحلة رفع الصور المبدئية فقط (بدون استدعاء API)
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast.error('يرجى اختيار صور فقط');
      return;
    }

    try {
      const loadedFiles: { file: File; base64: string }[] = [];
      const pendingPages: any[] = [];

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const base64 = await readFileAsDataUrl(file);
        
        loadedFiles.push({ file, base64 });
        pendingPages.push({
          id: `page_${Date.now()}_${i}`,
          name: file.name,
          imageUrl: base64,
          items: [],
          blocks: [],
          status: 'pending',
          error: null,
        });
      }

      setUploadedFiles(loadedFiles);
      onPagesLoaded(pendingPages); // إرسال المعاينة الأولية للواجهة
      toast.success(`تم تحميل ${imageFiles.length} صورة! اضغط على "بدء الترجمة" للمعالجة.`);
    } catch (error: any) {
      toast.error('حدث خطأ أثناء تحميل الصور');
    }
  };

  // 2. مرحلة معالجة الترجمة عند الضغط على الزر
  const handleStartTranslation = async () => {
    if (uploadedFiles.length === 0) {
      toast.error('يرجى رفع الصور أولاً');
      return;
    }

    if (!apiKey?.trim()) {
      toast.error('برجاء إدخال Gemini API Key أولاً من الإعدادات!');
      return;
    }

    setIsLoading(true);
    if (typeof onStartProcessing === 'function') {
      onStartProcessing();
    }

    const processedPages: any[] = [];
    let successCount = 0;

    try {
      for (let i = 0; i < uploadedFiles.length; i++) {
        const { file, base64 } = uploadedFiles[i];

        setStatusText(`جاري تحليل وترجمة الصورة ${i + 1} من ${uploadedFiles.length}...`);

        try {
          const rawItems = await extractTextWithGemini(
            base64,
            apiKey,
            targetLang,
            isOcrOnly,
            file.type || 'image/jpeg'
          );

          const pageItems = rawItems.map((item, index) => ({
            id: `item_${Date.now()}_${i}_${index}`,
            originalText: item.originalText,
            translatedText: item.translatedText,
            text: item.translatedText || item.originalText,
            original: item.originalText,
            translated: item.translatedText,
            category: item.category,
            type: item.category,
            isEdited: false,
          }));

          processedPages.push({
            id: `page_${Date.now()}_${i}`,
            name: file.name,
            imageUrl: base64,
            items: pageItems,
            blocks: pageItems,
            status: 'completed',
            error: null,
          });

          successCount++;
        } catch (pageError: any) {
          processedPages.push({
            id: `page_${Date.now()}_${i}`,
            name: file.name,
            imageUrl: base64,
            items: [],
            blocks: [],
            status: 'error',
            error: pageError?.message || 'فشل استخراج النصوص',
          });

          toast.error(`فشل في ${file.name}: ${pageError?.message}`);
        }
      }

      onPagesLoaded(processedPages); // إرسال النتائج النهائية الكاملة
      toast.success(`تم إكمال ترجمة ${successCount} صورة بنجاح!`);
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ أثناء معالجة الصور');
    } finally {
      setIsLoading(false);
      setStatusText('');
    }
  };

  return (
    <div className="w-full space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={(event) => handleFileSelect(event.target.files)}
        multiple
        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
        className="hidden"
      />

      {/* منطقة رفع الصور */}
      <div
        onClick={() => {
          if (!isLoading) {
            fileInputRef.current?.click();
          }
        }}
        className={`w-full border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all bg-slate-900/40 border-slate-800 hover:border-orange-500/50 ${
          isLoading ? 'opacity-75 pointer-events-none' : ''
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 bg-orange-500/20 rounded-2xl border border-orange-500/30 flex items-center justify-center text-orange-400">
            {isLoading ? (
              <Loader2 className="w-7 h-7 animate-spin" />
            ) : (
              <Upload className="w-7 h-7" />
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-200">
              {isLoading ? statusText : 'اضغط هنا أو اسحب الصور لرفعها'}
            </h3>
            <p className="mt-1 text-xs text-slate-500">PNG • JPG • JPEG • WEBP</p>
          </div>
        </div>
      </div>

      {/* زر بدء الترجمة والاستخراج */}
      {uploadedFiles.length > 0 && (
        <button
          type="button"
          onClick={handleStartTranslation}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-700 text-white font-bold rounded-xl shadow-lg transition-all"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>جاري المعالجة...</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>بدء الاستخراج والترجمة ({uploadedFiles.length} صور)</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default UploadZone;