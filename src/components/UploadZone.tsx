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

export async function extractTextWithGemini(
  imageBase64: string,
  apiKey: string,
  targetLang: string,
  isOcrOnly: boolean
) {
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  const promptText = isOcrOnly
    ? `You are an OCR tool for manga/comics. Extract all text elements in reading order. Return ONLY a valid JSON array of objects without markdown formatting: [{"originalText": "text", "translatedText": "text", "category": "dialogue"}]`
    : `You are a manga translation tool. Extract and translate all text elements into ${targetLang === 'ar' ? 'Arabic' : 'English'}. Return ONLY a valid JSON array of objects without markdown formatting: [{"originalText": "text", "translatedText": "translated text", "category": "dialogue"}]`;

  const cleanKey = apiKey ? apiKey.trim() : '';

  if (!cleanKey) {
    throw new Error("يرجى إدخال API Key الخاص بـ Gemini أولاً من الإعدادات");
  }

  // التحديث للموديل المطلوبة gemini-3.6-flash
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${cleanKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: cleanBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0.2
      }
    }),
  });

  if (!response.ok) {
    const errorRes = await response.json().catch(() => ({}));
    const errorMsg = errorRes.error?.message || `فشل الاتصال بـ API (${response.status})`;
    throw new Error(errorMsg);
  }

  const resData = await response.json();
  let textResult = resData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

  try {
    const parsed = JSON.parse(textResult);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to parse Gemini response:', textResult);
    return [];
  }
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

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (!apiKey) {
      toast.error('برجاء إدخال Gemini API Key أولاً من الإعدادات!');
      return;
    }

    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast.error('يرجى اختيار صور فقط');
      return;
    }

    setIsLoading(true);

    if (typeof onStartProcessing === 'function') {
      onStartProcessing();
    }

    try {
      const pages = [];

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        setStatusText(`جاري تحليل الصورة واستخراج النصوص (${i + 1}/${imageFiles.length})...`);

        const base64 = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = (e) => resolve(e.target?.result as string);
          r.readAsDataURL(file);
        });

        let items: any[] = [];
        try {
          const rawItems = await extractTextWithGemini(base64, apiKey, targetLang, isOcrOnly);
          items = rawItems.map((item: any, idx: number) => ({
            id: `item_${Date.now()}_${idx}`,
            originalText: item.originalText || '',
            translatedText: item.translatedText || item.originalText || '',
            category: item.category || 'dialogue',
          }));
        } catch (e: any) {
          console.error(e);
          toast.error(e.message || 'حدث خطأ أثناء الاستخراج');
        }

        pages.push({
          id: `page_${Date.now()}_${i}`,
          name: file.name,
          imageUrl: base64,
          items: items,
          status: 'completed'
        });
      }

      toast.success('تمت العملية بنجاح!');
      onPagesLoaded(pages);
    } catch (err) {
      toast.error('حدث خطأ غير متوقع أثناء رفع الملفات');
    } finally {
      setIsLoading(false);
      setStatusText('');
    }
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileSelect(e.target.files)}
        multiple
        accept="image/*"
        className="hidden"
      />

      <div
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all bg-slate-900/40 border-slate-800 hover:border-orange-500/50 ${
          isLoading ? 'opacity-75 pointer-events-none' : ''
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 bg-orange-500/20 rounded-2xl border border-orange-500/30 flex items-center justify-center text-orange-400">
            {isLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
          </div>
          <h3 className="text-base font-bold text-slate-200">
            {isLoading ? statusText : 'اضغط هنا أو اسحب الصور للرفع والاستخراج الفوري'}
          </h3>
        </div>
      </div>
    </div>
  );
};