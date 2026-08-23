import React, { useState } from 'react';
import { UploadZone } from '@/components/UploadZone';
import { ResultsView } from '@/components/ResultsView';
import { MangaPageItem } from '@/types/manga';
import { toast } from 'sonner';

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

    // Save initial pages state
    setPages(uploadedPages);

    try {
      // Loop sequentially over pages to avoid Rate Limits
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
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
    <div className="min-h-screen bg-background text-foreground">
      {view === 'upload' ? (
        <div className="container mx-auto py-10 px-4 max-w-3xl">
          <div className="mb-6 space-y-2 text-center">
            <h1 className="text-3xl font-bold">مترجم المانوا والتايبر الآلي</h1>
            <p className="text-muted-foreground">
              ارفع الفصول كملف ZIP أو صور متعددة لاستخراج النص وتنسيقه للتايبر فوراً
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Gemini API Key:</label>
            <input
              type="password"
              className="w-full p-2 border rounded-md bg-card"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

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