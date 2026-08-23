import React, { useState } from 'react';
import { UploadZone } from '@/components/UploadZone';
import { TranslationConfig, MangaPageItem, DetectedBubble } from '@/types/manga';
import { CATEGORIES, applyTyperPrefix, generateChapterTextFile } from '@/utils/typerHelper';
import { exportChapterToDocx } from '@/utils/docxExport';
import { TARGET_LANGUAGES } from '@/data/samples';
import {
  ArrowLeft,
  Download,
  Save,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Layers,
  CheckCircle2,
  AlertCircle,
  FileText,
  Copy,
  Key,
  Info,
  FileDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function Index() {
  const [pages, setPages] = useState<MangaPageItem[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [view, setView] = useState<'upload' | 'results'>('upload');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [apiKey, setApiKey] = useState<string>(localStorage.getItem('gemini_api_key') || '');

  const [config, setConfig] = useState<TranslationConfig>({
    targetLanguage: 'ar',
    extractSFX: true,
    detectVerticalText: true,
  });

  const selectedLangObj = TARGET_LANGUAGES.find((l) => l.code === config.targetLanguage);
  const isRTL = selectedLangObj?.rtl ?? true;

  const handleAddPages = (newPages: MangaPageItem[]) => {
    setPages((prev) => [...prev, ...newPages]);
  };

  const handleRemovePage = (id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
  };

  const handleClearAll = () => {
    setPages([]);
    setActivePageIndex(0);
  };

  const handleConfigChange = (updated: Partial<TranslationConfig>) => {
    setConfig((prev) => ({ ...prev, ...updated }));
  };

  // Sequential batch processing to respect rate limits
  const handleAnalyzeAll = async () => {
    if (pages.length === 0) {
      toast.error('يرجى رفع صور أو ملف ZIP أولاً');
      return;
    }

    if (!apiKey.trim()) {
      toast.error('يرجى إدخال مفتاح Gemini API في الشريط العلوي لبدء الاستخراج والترجمة');
      return;
    }

    setIsAnalyzing(true);
    localStorage.setItem('gemini_api_key', apiKey.trim());
    setProcessingProgress({ current: 0, total: pages.length });

    const updatedPages = [...pages];

    for (let i = 0; i < updatedPages.length; i++) {
      const page = updatedPages[i];
      setProcessingProgress({ current: i + 1, total: updatedPages.length });

      // Update status to processing
      page.status = 'processing';
      setPages([...updatedPages]);

      try {
        const base64Data = page.previewUrl.split(',')[1];
        const mimeType = page.previewUrl.split(';')[0].split(':')[1] || 'image/png';

        const promptText = `You are an elite Manga/Manhwa/Manhua translation and typesetting OCR engine.

Target Language: ${selectedLangObj?.name || 'Arabic'}

TASKS:
1. Extract every speech bubble, monologue box, scream balloon, narrator note, and onomatopoeia SFX.
2. Translate all extracted text into high-quality, culturally nuanced ${selectedLangObj?.name || 'Arabic'}.
3. Assign each element strictly one of these exact categories:
   - dialogue (normal conversation)
   - thought (internal thoughts)
   - scream (yelling/shouting)
   - whisper (whispers)
   - anger (rage/furious shout)
   - fear (scared/trembling)
   - tension (tense moments)
   - pleasure (sighs/laughter)
   - monster (beast speech/growls)
   - system (status windows/game alerts)
   - phone (phone calls/smartphones)
   - message (text messages)
   - sfx (sound effects, hits, thuds)
   - narrator (story narration)
   - other

4. PHOTOSHOP TYPER SCRIPT FORMATTING RULES (Apply to 'translatedText'):
   - scream OR anger: Must start with :: (e.g. ":: سأقضي عليك!")
   - thought: Must be enclosed in () (e.g. "(هل كان يخدعني طوال الوقت؟)")
   - sfx: Must start with SFX: (e.g. "SFX: [صوت انفجار قوي - بااام]")
   - narrator OR other: Must start with OT: (e.g. "OT: في تلك الليلة المظلمة...")
   - system OR phone OR message: Must be enclosed in [] (e.g. "[تم تفعيل المهارة الخاصة]")
   - dialogue / whisper / fear / tension / pleasure / monster: Must be enclosed in "" (e.g. "\\"لا تقلق، كل شيء تحت السيطرة\\"")

OUTPUT FORMAT:
Return strictly a valid JSON array of objects without Markdown code wrappers:
[
  {
    "id": "1",
    "originalText": "original text here",
    "translatedText": ":: النص المترجم",
    "category": "scream"
  }
]`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey.trim()}`,
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
        if (data.error) {
          throw new Error(data.error.message || 'API request error');
        }

        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedItems: DetectedBubble[] = JSON.parse(cleanJson);

        page.items = parsedItems.map((item, idx) => ({
          id: item.id || `b-${i}-${idx}`,
          originalText: item.originalText || '',
          translatedText: item.translatedText || '',
          category: item.category || 'dialogue',
        }));
        page.status = 'completed';
      } catch (err: any) {
        console.error(`Error analyzing page ${page.fileName}:`, err);
        page.status = 'error';
        page.error = err.message || 'حدث خطأ أثناء معالجة الصفحة';
      }

      setPages([...updatedPages]);

      // Small delay between requests to protect API limits
      if (i < updatedPages.length - 1) {
        await new Promise((res) => setTimeout(res, 600));
      }
    }

    setIsAnalyzing(false);
    setView('results');
    toast.success('اكتملت معالجة جميع صفحات الفصل!');
  };

  const updateItem = (pageIdx: number, itemId: string, field: keyof DetectedBubble, value: string) => {
    setPages((prev) => {
      const copy = [...prev];
      const page = copy[pageIdx];
      if (!page) return prev;

      page.items = page.items.map((item) => {
        if (item.id !== itemId) return item;

        if (field === 'category') {
          // Re-apply prefix automatically when category changes
          const updatedTranslation = applyTyperPrefix(item.translatedText, value);
          return { ...item, category: value, translatedText: updatedTranslation };
        }

        return { ...item, [field]: value };
      });

      return copy;
    });
  };

  const handleExportAllTxt = () => {
    if (pages.length === 0) return;
    const textContent = generateChapterTextFile(pages);
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Manga_Chapter_Typer_Script_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('تم تحميل سكريبت التايبر (.txt) لجميع صفحات الفصل بنجاح!');
  };

  const handleExportDocx = async () => {
    if (pages.length === 0) return;
    try {
      setIsExportingDocx(true);
      await exportChapterToDocx(pages, isRTL);
      toast.success('تم إنشاء وتحميل ملف Word (.docx) بنجاح!');
    } catch (err: any) {
      console.error(err);
      toast.error('حدث خطأ أثناء إنشاء ملف Word: ' + (err.message || ''));
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleCopyPageText = (page: MangaPageItem) => {
    const text = page.items.map((it) => it.translatedText).join('\n');
    navigator.clipboard.writeText(text);
    toast.success(`تم نسخ نصوص الصفحة ${page.fileName} إلى الحافظة!`);
  };

  const currentPage = pages[activePageIndex] || pages[0];

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Key Input */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-border pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 bg-clip-text text-transparent">
              Manga Typer Studio AI
            </h1>
            <Badge className="bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200">
              Batch & ZIP Ready
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
            استخراج وترجمة صفحات المانجا والفصول كاملة بصيغة متوافقة 100% مع إضافة Photoshop Typer
          </p>
        </div>

        {/* API Key Box */}
        <div className="flex items-center gap-2 bg-muted/60 p-2.5 rounded-2xl border border-border w-full md:w-auto shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-orange-600/10 text-orange-600 flex items-center justify-center shrink-0">
            <Key className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Gemini API Key</span>
            <input
              type="password"
              placeholder="ألصق الـ API Key هنا"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-transparent text-xs font-semibold outline-none w-full sm:w-64 placeholder:text-muted-foreground/60"
            />
          </div>
        </div>
      </header>

      {/* Sequential Processing Banner */}
      {isAnalyzing && (
        <Card className="border-orange-500/40 bg-orange-50/30 dark:bg-orange-950/20 rounded-2xl p-5 shadow-md animate-in fade-in">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center animate-spin">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-foreground">
                    جاري معالجة صفحات الفصل تسلسلياً ({processingProgress.current} / {processingProgress.total})
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    جاري فحص الصفحة: {pages[processingProgress.current - 1]?.fileName || '...'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-orange-600 bg-orange-100 dark:bg-orange-900/50 px-3 py-1 rounded-full">
                {Math.round((processingProgress.current / (processingProgress.total || 1)) * 100)}%
              </span>
            </div>
            <Progress
              value={(processingProgress.current / (processingProgress.total || 1)) * 100}
              className="h-2 rounded-full"
            />
          </div>
        </Card>
      )}

      {/* Main View Switcher */}
      {view === 'upload' ? (
        <UploadZone
          pages={pages}
          config={config}
          isAnalyzing={isAnalyzing}
          onAddPages={handleAddPages}
          onRemovePage={handleRemovePage}
          onClearAll={handleClearAll}
          onConfigChange={handleConfigChange}
          onAnalyzeAll={handleAnalyzeAll}
        />
      ) : (
        /* Results View */
        <div className="space-y-6">
          {/* Top Results Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-card p-4 rounded-3xl border border-border shadow-sm">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setView('upload')}
                className="rounded-xl text-xs font-bold gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                العودة للرفع
              </Button>

              <Badge className="bg-orange-600 text-white font-<dyad-write path="src/pages/Index.tsx" description="Main studio page with batch queue processing, dynamic bidirectional text support, and Word (.docx) & Text (.txt) export">
import React, { useState } from 'react';
import { UploadZone } from '@/components/UploadZone';
import { TranslationConfig, MangaPageItem, DetectedBubble } from '@/types/manga';
import { CATEGORIES, applyTyperPrefix, generateChapterTextFile } from '@/utils/typerHelper';
import { exportChapterToDocx } from '@/utils/docxExport';
import { TARGET_LANGUAGES } from '@/data/samples';
import {
  ArrowLeft,
  Download,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  Copy,
  Key,
  Info,
  FileDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function Index() {
  const [pages, setPages] = useState<MangaPageItem[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [view, setView] = useState<'upload' | 'results'>('upload');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [apiKey, setApiKey] = useState<string>(localStorage.getItem('gemini_api_key') || '');

  const [config, setConfig] = useState<TranslationConfig>({
    targetLanguage: 'ar',
    extractSFX: true,
    detectVerticalText: true,
  });

  const selectedLangObj = TARGET_LANGUAGES.find((l) => l.code === config.targetLanguage);
  const isRTL = selectedLangObj?.rtl ?? true;

  const handleAddPages = (newPages: MangaPageItem[]) => {
    setPages((prev) => [...prev, ...newPages]);
  };

  const handleRemovePage = (id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
  };

  const handleClearAll = () => {
    setPages([]);
    setActivePageIndex(0);
  };

  const handleConfigChange = (updated: Partial<TranslationConfig>) => {
    setConfig((prev) => ({ ...prev, ...updated }));
  };

  // Sequential batch processing to respect rate limits
  const handleAnalyzeAll = async () => {
    if (pages.length === 0) {
      toast.error('يرجى رفع صور أو ملف ZIP أولاً');
      return;
    }

    if (!apiKey.trim()) {
      toast.error('يرجى إدخال مفتاح Gemini API في الشريط العلوي لبدء الاستخراج والترجمة');
      return;
    }

    setIsAnalyzing(true);
    localStorage.setItem('gemini_api_key', apiKey.trim());
    setProcessingProgress({ current: 0, total: pages.length });

    const updatedPages = [...pages];

    for (let i = 0; i < updatedPages.length; i++) {
      const page = updatedPages[i];
      setProcessingProgress({ current: i + 1, total: updatedPages.length });

      page.status = 'processing';
      setPages([...updatedPages]);

      try {
        const base64Data = page.previewUrl.split(',')[1];
        const mimeType = page.previewUrl.split(';')[0].split(':')[1] || 'image/png';

        const promptText = `You are an elite Manga/Manhwa/Manhua translation and typesetting OCR engine.

Target Language: ${selectedLangObj?.name || 'Arabic'}

TASKS:
1. Extract every speech bubble, monologue box, scream balloon, narrator note, and onomatopoeia SFX.
2. Translate all extracted text into high-quality, culturally nuanced ${selectedLangObj?.name || 'Arabic'}.
3. Assign each element strictly one of these exact categories:
   - dialogue (normal conversation)
   - thought (internal thoughts)
   - scream (yelling/shouting)
   - whisper (whispers)
   - anger (rage/furious shout)
   - fear (scared/trembling)
   - tension (tense moments)
   - pleasure (sighs/laughter)
   - monster (beast speech/growls)
   - system (status windows/game alerts)
   - phone (phone calls/smartphones)
   - message (text messages)
   - sfx (sound effects, hits, thuds)
   - narrator (story narration)
   - other

4. PHOTOSHOP TYPER SCRIPT FORMATTING RULES (Apply to 'translatedText'):
   - scream OR anger: Must start with :: (e.g. ":: سأقضي عليك!")
   - thought: Must be enclosed in () (e.g. "(هل كان يخدعني طوال الوقت؟)")
   - sfx: Must start with SFX: (e.g. "SFX: [صوت انفجار قوي - بااام]")
   - narrator OR other: Must start with OT: (e.g. "OT: في تلك الليلة المظلمة...")
   - system OR phone OR message: Must be enclosed in [] (e.g. "[تم تفعيل المهارة الخاصة]")
   - dialogue / whisper / fear / tension / pleasure / monster: Must be enclosed in "" (e.g. "\\"لا تقلق، كل شيء تحت السيطرة\\"")

OUTPUT FORMAT:
Return strictly a valid JSON array of objects without Markdown code wrappers:
[
  {
    "id": "1",
    "originalText": "original text here",
    "translatedText": ":: النص المترجم",
    "category": "scream"
  }
]`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey.trim()}`,
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
        if (data.error) {
          throw new Error(data.error.message || 'API request error');
        }

        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedItems: DetectedBubble[] = JSON.parse(cleanJson);

        page.items = parsedItems.map((item, idx) => ({
          id: item.id || `b-${i}-${idx}`,
          originalText: item.originalText || '',
          translatedText: item.translatedText || '',
          category: item.category || 'dialogue',
        }));
        page.status = 'completed';
      } catch (err: any) {
        console.error(`Error analyzing page ${page.fileName}:`, err);
        page.status = 'error';
        page.error = err.message || 'حدث خطأ أثناء معالجة الصفحة';
      }

      setPages([...updatedPages]);

      if (i < updatedPages.length - 1) {
        await new Promise((res) => setTimeout(res, 600));
      }
    }

    setIsAnalyzing(false);
    setView('results');
    toast.success('اكتملت معالجة جميع صفحات الفصل!');
  };

  const updateItem = (pageIdx: number, itemId: string, field: keyof DetectedBubble, value: string) => {
    setPages((prev) => {
      const copy = [...prev];
      const page = copy[pageIdx];
      if (!page) return prev;

      page.items = page.items.map((item) => {
        if (item.id !== itemId) return item;

        if (field === 'category') {
          const updatedTranslation = applyTyperPrefix(item.translatedText, value);
          return { ...item, category: value, translatedText: updatedTranslation };
        }

        return { ...item, [field]: value };
      });

      return copy;
    });
  };

  const handleExportAllTxt = () => {
    if (pages.length === 0) return;
    const textContent = generateChapterTextFile(pages);
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Manga_Chapter_Typer_Script_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('تم تحميل سكريبت التايبر (.txt) بنجاح!');
  };

  const handleExportDocx = async () => {
    if (pages.length === 0) return;
    try {
      setIsExportingDocx(true);
      await exportChapterToDocx(pages, isRTL);
      toast.success('تم إنشاء وتحميل ملف Word (.docx) بنجاح!');
    } catch (err: any) {
      console.error(err);
      toast.error('حدث خطأ أثناء إنشاء ملف Word: ' + (err.message || ''));
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleCopyPageText = (page: MangaPageItem) => {
    const text = page.items.map((it) => it.translatedText).join('\n');
    navigator.clipboard.writeText(text);
    toast.success(`تم نسخ نصوص الصفحة ${page.fileName} إلى الحافظة!`);
  };

  const currentPage = pages[activePageIndex] || pages[0];

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Key Input */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-border pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 bg-clip-text text-transparent">
              Manga Typer Studio AI
            </h1>
            <Badge className="bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200">
              Batch & ZIP Ready
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
            استخراج وترجمة صفحات المانجا والفصول كاملة بصيغة متوافقة 100% مع إضافة Photoshop Typer وتصدير Word/TXT
          </p>
        </div>

        {/* API Key Box */}
        <div className="flex items-center gap-2 bg-muted/60 p-2.5 rounded-2xl border border-border w-full md:w-auto shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-orange-600/10 text-orange-600 flex items-center justify-center shrink-0">
            <Key className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Gemini API Key</span>
            <input
              type="password"
              placeholder="ألصق الـ API Key هنا"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-transparent text-xs font-semibold outline-none w-full sm:w-64 placeholder:text-muted-foreground/60"
            />
          </div>
        </div>
      </header>

      {/* Sequential Processing Banner */}
      {isAnalyzing && (
        <Card className="border-orange-500/40 bg-orange-50/30 dark:bg-orange-950/20 rounded-2xl p-5 shadow-md animate-in fade-in">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center animate-spin">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-foreground">
                    جاري معالجة صفحات الفصل تسلسلياً ({processingProgress.current} / {processingProgress.total})
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    جاري فحص الصفحة: {pages[processingProgress.current - 1]?.fileName || '...'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-orange-600 bg-orange-100 dark:bg-orange-900/50 px-3 py-1 rounded-full">
                {Math.round((processingProgress.current / (processingProgress.total || 1)) * 100)}%
              </span>
            </div>
            <Progress
              value={(processingProgress.current / (processingProgress.total || 1)) * 100}
              className="h-2 rounded-full"
            />
          </div>
        </Card>
      )}

      {/* Main View Switcher */}
      {view === 'upload' ? (
        <UploadZone
          pages={pages}
          config={config}
          isAnalyzing={isAnalyzing}
          onAddPages={handleAddPages}
          onRemovePage={handleRemovePage}
          onClearAll={handleClearAll}
          onConfigChange={handleConfigChange}
          onAnalyzeAll={handleAnalyzeAll}
        />
      ) : (
        /* Results View */
        <div className="space-y-6">
          {/* Top Results Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-card p-4 rounded-3xl border border-border shadow-sm">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setView('upload')}
                className="rounded-xl text-xs font-bold gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                العودة للرفع
              </Button>

              <Badge className="bg-orange-600 text-white font-bold">
                {selectedLangObj?.flag} {selectedLangObj?.name || 'Arabic'}
              </Badge>
              <span className="text-xs font-bold text-muted-foreground">
                إجمالي الصفحات: {pages.length}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                disabled={isExportingDocx}
                onClick={handleExportDocx}
                className="border-blue-600/30 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-bold text-xs rounded-xl gap-2 h-9"
              >
                <FileDown className="w-4 h-4" />
                {isExportingDocx ? 'جاري التوليد...' : 'تصدير Word (.docx)'}
              </Button>

              <Button
                onClick={handleExportAllTxt}
                className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-orange-600/20 gap-2 h-9"
              >
                <Download className="w-4 h-4" />
                تصدير سكريبت التايبر (.txt)
              </Button>
            </div>
          </div>

          {/* Chapter Page Switcher Strip */}
          <div className="flex items-center gap-2 overflow-x-auto p-2 bg-muted/40 rounded-2xl border border-border">
            <span className="text-xs font-bold text-muted-foreground shrink-0 px-2">الصفحات:</span>
            {pages.map((p, idx) => {
              const isSelected = idx === activePageIndex;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePageIndex(idx)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                    isSelected
                      ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                      : 'bg-card hover:bg-accent text-muted-foreground border-border'
                  }`}
                >
                  <span>صفحة #{idx + 1}</span>
                  {p.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
                  {p.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                </button>
              );
            })}
          </div>

          {/* Page Details Grid */}
          {currentPage && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left Column: Image Viewer */}
              <Card className="rounded-3xl overflow-hidden border-border bg-card shadow-sm sticky top-24">
                <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">
                      صفحة #{activePageIndex + 1}: {currentPage.fileName}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {currentPage.items?.length || 0} فقرات
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={activePageIndex === 0}
                      onClick={() => setActivePageIndex((prev) => Math.max(0, prev - 1))}
                      className="h-8 w-8 rounded-lg"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={activePageIndex === pages.length - 1}
                      onClick={() => setActivePageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
                      className="h-8 w-8 rounded-lg"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <CardContent className="p-4 flex items-center justify-center bg-zinc-950/5 dark:bg-zinc-900/50 min-h-[500px]">
                  <img
                    src={currentPage.previewUrl}
                    alt={currentPage.fileName}
                    className="max-h-[680px] w-auto object-contain rounded-xl shadow-md"
                  />
                </CardContent>
              </Card>

              {/* Right Column: Extracted Typer Items Editor */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-2xl border border-border">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-orange-500" />
                    <span className="font-extrabold text-sm">نصوص الصفحة #{activePageIndex + 1}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyPageText(currentPage)}
                    className="text-xs rounded-xl h-8 font-semibold"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    نسخ نصوص هذه الصفحة
                  </Button>
                </div>

                {/* Legend for Typer Codes */}
                <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                  <Info className="w-4 h-4 text-orange-500 shrink-0" />
                  <span className="font-bold text-foreground">رموز التايبر:</span>
                  <span className="bg-background px-1.5 py-0.5 rounded border text-[11px] font-mono">:: للصراخ</span>
                  <span className="bg-background px-1.5 py-0.5 rounded border text-[11px] font-mono">() للأفكار</span>
                  <span className="bg-background px-1.5 py-0.5 rounded border text-[11px] font-mono">"" للحوار</span>
                  <span className="bg-background px-1.5 py-0.5 rounded border text-[11px] font-mono">SFX: للمؤثرات</span>
                  <span className="bg-background px-1.5 py-0.5 rounded border text-[11px] font-mono">[] للنظام</span>
                  <span className="bg-background px-1.5 py-0.5 rounded border text-[11px] font-mono">OT: للراوي</span>
                </div>

                {/* Items List */}
                <div className="space-y-4 max-h-[700px] overflow-y-auto pr-1">
                  {(!currentPage.items || currentPage.items.length === 0) ? (
                    <div className="text-center py-12 bg-card rounded-2xl border border-border">
                      <p className="text-sm text-muted-foreground">لم يتم العثور على حوارات أو نصوص في هذه الصفحة.</p>
                    </div>
                  ) : (
                    currentPage.items.map((item, idx) => (
                      <Card key={item.id} className="p-4 space-y-3 rounded-2xl border-border bg-card shadow-sm">
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-muted-foreground font-bold">فقرة #{idx + 1}</span>
                          <Select
                            value={item.category}
                            onValueChange={(val) => updateItem(activePageIndex, item.id, 'category', val)}
                          >
                            <SelectTrigger className="w-[190px] h-8 text-xs font-bold rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {CATEGORIES.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value} className="text-xs font-semibold">
                                  {cat.label} ({cat.prefix})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-muted-foreground uppercase">
                            النص الأصلي (OCR):
                          </label>
                          <Textarea
                            value={item.originalText}
                            onChange={(e) => updateItem(activePageIndex, item.id, 'originalText', e.target.value)}
                            dir="ltr"
                            className="min-h-[45px] text-xs font-mono rounded-xl bg-muted/30"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase">
                              النص المترجم مع كود التايبر:
                            </label>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              اتجاه: {isRTL ? 'RTL (يمين)' : 'LTR (يسار)'}
                            </span>
                          </div>
                          <Textarea
                            value={item.translatedText}
                            onChange={(e) => updateItem(activePageIndex, item.id, 'translatedText', e.target.value)}
                            dir={isRTL ? 'rtl' : 'ltr'}
                            style={{ textAlign: isRTL ? 'right' : 'left' }}
                            className={`min-h-[60px] text-sm font-semibold rounded-xl border-orange-500/30 focus-visible:ring-orange-500 ${
                              isRTL ? 'font-serif' : 'font-sans'
                            }`}
                          />
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}