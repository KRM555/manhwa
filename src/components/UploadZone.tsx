import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface UploadZoneProps {
  apiKey: string;
  targetLang: string;
  isOcrOnly: boolean;
  typerRules: any[];
  onPagesLoaded: (pages: any[]) => void;
  onStartProcessing?: () => void;
}

// دالة الاتصال المباشر بـ Gemini API
async function processImageWithGeminiDirect(
  imageBase64: string,
  apiKey: string,
  targetLang: string,
  isOcrOnly: boolean
) {
  const systemInstruction = `You are a professional manga/webtoon OCR and translation tool. 
Analyze the image and extract all text bubbles, thought boxes, SFX, and system texts in reading order (top-to-bottom, right-to-left for manga, top-to-bottom for webtoons).
Return ONLY a valid JSON array of objects. Do not include markdown code blocks like \`\`\`json.`;

  const prompt = isOcrOnly
    ? `Extract all text elements. 
Return JSON format: 
[
  {
    "originalText": "text in original language",
    "translatedText": "text in original language",
    "category": "dialogue" | "thought" | "scream" | "sfx" | "system" | "narrator"
  }
]`
    : `Extract all text elements and translate them into ${targetLang === 'ar' ? 'Arabic' : 'English'}.
Return JSON format:
[
  {
    "originalText": "text in original language",
    "translatedText": "translated text",
    "category": "dialogue" | "thought" | "scream" | "sfx" | "system" | "narrator"
  }
]`;

  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [
          {
            parts: [
              { text: prompt },
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
          response_mime_type: 'application/json',
          temperature: 0.2,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'فشل الاتصال بـ Gemini API');
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  
  try {
    return JSON.parse(rawText);
  } catch (e) {
    console.error('Failed to parse JSON response:', rawText);
    return [];
  }
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  apiKey,
  targetLang,
  isOcrOnly,
  typerRules,
  onPagesLoaded,
  onStartProcessing,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (!apiKey) {
      toast.error('يرجى إدخال Gemini API Key أولاً لمعالجة الصور!');
      return;
    }

    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast.error('يرجى رفع صور فقط (PNG, JPG, WEBP)');
      return;
    }

    setIsLoading(true);
    if (onStartProcessing) onStartProcessing();

    try {
      const processedPages = [];

      for (let index = 0; index < imageFiles.length; index++) {
        const file = imageFiles[index];
        setStatusText(`جاري استخراج وترجمة الصفحة (${index + 1}/${imageFiles.length})...`);

        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });

        let extractedItems: any[] = [];
        try {
          const apiResult = await processImageWithGeminiDirect(base64Data, apiKey, targetLang, isOcrOnly);
          extractedItems = apiResult.map((item: any, idx: number) => ({
            id: `item_${Date.now()}_${idx}`,
            originalText: item.originalText || '',
            translatedText: item.translatedText || item.originalText || '',
            category: item.category || 'dialogue',
          }));
        } catch (err: any) {
          console.error('API Error:', err);
          toast.error(err.message || `تعذر استخراج النصوص للصورة ${file.name}`);
        }

        processedPages.push({
          id: `page_${Date.now()}_${index}`,
          name: file.name,
          imageUrl: base64Data,
          items: extractedItems,
          status: 'completed'
        });
      }

      toast.success(`تمت معالجة وترجمة ${processedPages.length} صورة بنجاح!`);
      onPagesLoaded(processedPages);
    } catch (error) {
      console.error('Error processing uploaded images:', error);
      toast.error('حدث خطأ أثناء معالجة الصور.');
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
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileSelect(e.dataTransfer.files); }}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 relative overflow-hidden group ${
          isDragging ? 'border-orange-500 bg-orange-500/10' : 'border-slate-800 hover:border-orange-500/50 bg-slate-900/40'
        } ${isLoading ? 'opacity-75 pointer-events-none' : ''}`}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 bg-orange-500/20 rounded-2xl border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-xl">
            {isLoading ? <Loader2 className="w-8 h-8 animate-spin text-orange-400" /> : <Upload className="w-8 h-8" />}
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-200">
              {isLoading ? statusText : 'اضغط هنا أو اسحب الصور وانسخها إلى هنا'}
            </h3>
            <p className="text-xs text-slate-400">
              يدعم فصول المانوا والمانهوا بصيغ (PNG, JPG, WEBP)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};