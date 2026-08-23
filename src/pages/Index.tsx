import React, { useState } from 'react';
import { UploadZone } from '@/components/UploadZone';
import { ResultsView } from '@/components/ResultsView';
import { MangaPageItem } from '@/types/manga';
import { toast } from 'sonner';
import { KeyRound, Sparkles, Image as ImageIcon, BookOpen } from 'lucide-react';

export default function Index() {
  const [pages, setPages] = useState<MangaPageItem[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [view, setView] = useState<'upload' | 'results'>('upload');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>(
    () => localStorage.getItem('gemini_api_key') || ''
  );

  const handleProcessPages = async (uploadedPages: MangaPageItem[]) => {
    if (!apiKey.trim()) {
      toast.error('يرجى إدخال مفتاح Gemini API أولاً');
      return;
    }

    setIsAnalyzing(true);
    localStorage.setItem('gemini_api_key', apiKey.trim());
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
    <div className="min-h-screen bg-background text-foreground flex flex-col" dir="rtl">
      {/* Header Bar */}
      <header className="border-b bg-card px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">مترجم المانوا والتايبر الآلي</h1>
            <span className="text-xs text-muted-foreground">TyperTool Automation Assistant</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('upload')}
            className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-all ${
              view === 'upload'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'hover:bg-accent border-transparent'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>الصور البديلة / الرفع</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto py-8 px-4 max-w-5xl">
        {view === 'upload' ? (
          <div className="space-y-6">
            <div className="bg-card border rounded-xl p-5 shadow-sm space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-primary" />
                Gemini API Key:
              </label>
              <input
                type="password"
                className="w-full p-2.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                placeholder="ضع الـ API Key الخاص بك هنا..."
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
      </main>
    </div>
  );
}