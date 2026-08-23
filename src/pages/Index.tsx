import React, { useState } from 'react';
import { UploadZone } from '@/components/UploadZone';
import { ResultsView } from '@/components/ResultsView';
import { MangaPageItem } from '@/types/manga';
import { toast } from 'sonner';
import { KeyRound, Sparkles } from 'lucide-react';

export default function Index() {
  const [pages, setPages] = useState<MangaPageItem[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [view, setView] = useState<'upload' | 'results'>('upload');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>(
    () => localStorage.getItem('gemini_api_key') || ''
  );

  const handleProcessPages = async (uploadedPages: MangaPageItem[]) => {
    if (!apiKey) {
      toast.error('يرجى إدخال مفتاح Gemini API أولاً');
      return;
    }

    setIsAnalyzing(true);
    localStorage.setItem('gemini_api_key', apiKey);
    setPages(uploadedPages);

    try {
      const updatedPages = [...uploadedPages];

      for (let i = 0; i < updatedPages.length; i++) {
        const page = updatedPages[i];
        const base64Data = page.imageUrl.split(',')[1];
        const mimeType = page.imageUrl.split(';')[0].split(':')[1] || 'image/png';

        const promptText = `You are a professional Manhua/Manga/Manhwa translator and typesetter assistant.

1. Perform OCR to extract all visible text (Chinese/Japanese/Korean) including vertical text and SFX.
2. Translate each text block into fluent, natural Arabic capturing emotions, tone, and cultivation/slang context.
3. Categorize each text block into one of these EXACT categories: 
   - dialogue, thought, scream, whisper, anger, fear, tension, pleasure, monster, system, phone, message, sfx, narrator, other.

4. CRITICAL TYPER TOOL RULE (Prefixing Only): 
   Place the formatting symbol strictly at the VERY BEGINNING of the "translatedText" string based on its category so that the Photoshop Typer extension can read it:
   - scream / anger: Prefix with :: (e.g., ":: النص المترجم")
   - thought: Prefix with () (e.g., "() النص المترجم")
   - dialogue / whisper / fear / tension / pleasure / monster: Prefix with "" (e.g., '"" النص المترجم')
   - sfx: Prefix with SFX: (e.g., "SFX: النص المترجم")
   - narrator / other: Prefix with OT: (e.g., "OT: النص المترجم")
   - system / phone / message: Prefix with [] (e.g., "[] النص المترجم")

Return STRICTLY a raw JSON array of objects without markdown headers like this:
[
  {
    "id": "1",
    "originalText": "original text",
    "translatedText": ":: النص المترجم",
    "category": "scream"
  }
]`;

       const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent`,
  {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey.trim()
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: promptText },
            { inline_data: { mime_type: mimeType, data: base64Data } },
          ],
        },
      ],
    }),
  }
);

        const data = await response.json();
        if (data.error) throw new Error(data.error.message || 'API Error');

        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedBubbles = JSON.parse(cleanJson);

        updatedPages[i] = {
          ...page,
          bubbles: parsedBubbles,
          status: 'completed',
        };

        setPages([...updatedPages]);
      }

      setView('results');
      toast.success('تم تحليل كافة الصفحات وتطبيق رموز التايبر بنجاح!');
    } catch (err: any) {
      console.error(err);
      toast.error('حدث خطأ أثناء معالجة الصور: ' + (err.message || 'تأكد من الـ API Key'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateBubble = (
    pageId: string,
    bubbleId: string,
    updatedText: string,
    category: string
  ) => {
    setPages((prevPages) =>
      prevPages.map((page) => {
        if (page.id !== pageId) return page;
        return {
          ...page,
          bubbles: page.bubbles.map((b) =>
            b.id === bubbleId ? { ...b, translatedText: updatedText, category } : b
          ),
        };
      })
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col justify-center py-12 px-4" dir="rtl">
      {view === 'upload' ? (
        <div className="mx-auto w-full max-w-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
          {/* Header section */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 bg-orange-100 dark:bg-orange-950/50 text-orange-600 rounded-2xl mb-1">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              مترجم المانوا والتايبر الآلي
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              ارفع الفصول كملف ZIP أو صور متعددة لاستخراج النص وتنسيقه للتايبر فوراً
            </p>
          </div>

          {/* API Key Box */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 p-4 rounded-xl space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-orange-500" />
              Gemini API Key:
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all font-mono"
              placeholder="ضع الـ API Key الخاص بك هنا..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          {/* Upload Zone Component */}
          <UploadZone onStartProcessing={handleProcessPages} isAnalyzing={isAnalyzing} />
        </div>
      ) : (
        <ResultsView
          pages={pages}
          activePageIndex={activePageIndex}
          setActivePageIndex={setActivePageIndex}
          onReset={() => setView('upload')}
          onUpdateBubble={handleUpdateBubble}
        />
      )}
    </div>
  );
}