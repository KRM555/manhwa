import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import {
  ArrowLeft,
  Download,
  Save,
  Sparkles,
  Key,
  RefreshCw,
  Sun,
  Moon,
  Globe,
  Upload,
  FileArchive,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export interface ExtractedText {
  id: string;
  originalText: string;
  translatedText: string;
  category: string;
}

export interface MangaPage {
  id: string;
  name: string;
  imageUrl: string;
  items: ExtractedText[];
}

const CATEGORIES = [
  { value: 'dialogue', labelAr: 'حوار (Dialogue)', labelEn: 'Dialogue' },
  { value: 'thought', labelAr: 'أفكار (Thought)', labelEn: 'Thought' },
  { value: 'scream', labelAr: 'صراخ (Scream)', labelEn: 'Scream' },
  { value: 'whisper', labelAr: 'همس (Whisper)', labelEn: 'Whisper' },
  { value: 'anger', labelAr: 'غضب (Anger)', labelEn: 'Anger' },
  { value: 'fear', labelAr: 'خوف (Fear)', labelEn: 'Fear' },
  { value: 'system', labelAr: 'نظام (System)', labelEn: 'System' },
  { value: 'phone', labelAr: 'هاتف (Phone)', labelEn: 'Phone' },
  { value: 'message', labelAr: 'رسالة (Message)', labelEn: 'Message' },
  { value: 'sfx', labelAr: 'مؤثر صوتي (SFX)', labelEn: 'SFX' },
  { value: 'narrator', labelAr: 'راوي (Narrator)', labelEn: 'Narrator' },
  { value: 'other', labelAr: 'أخرى (Other)', labelEn: 'Other' },
];

const CANDIDATE_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.6-flash'];

// قواميس الترجمة بين العربية والإنجليزية للواجهة
const I18N = {
  ar: {
    title: 'مستودع ترجمة المانجا والويب تون',
    subtitle: 'أداة استخراج وترجمة وتنسيق سكريبتات التبييض',
    apiKeyPlaceholder: 'مفتاح Gemini API Key',
    uploadTitle: 'إسقاط أو اختيار الصور / ملف ZIP',
    uploadDesc: 'يمكنك رفع حتى 10 صور أو ملف مضغوط يحتوي على الصفحات',
    extractOnly: 'استخراج النص فقط (دون ترجمة)',
    analyzeBtn: 'بدء تحليل واستخراج الصفحات',
    exportBtn: 'تصدير TXT المنسق (لكل الصفحات)',
    saveDraft: 'حفظ المسودة',
    backToUpload: 'العودة للرفع',
    reAnalyze: 'إعادة التحليل',
    preview: 'معاينة الصفحة',
    extractedTexts: 'النصوص المستخرجة',
    originalText: 'النص الأصلي:',
    translatedText: 'النص المترجم:',
    page: 'صفحة',
    noImages: 'لم يتم رفع أي صور بعد',
    maxImagesError: 'الحد الأقصى المسموح به هو 10 صور فقط',
    analyzing: 'جاري معالجة واستخراج النصوص بواسطة Gemini...',
  },
  en: {
    title: 'Manga Translator Studio',
    subtitle: 'Webtoon text extraction, translation & typesetting tool',
    apiKeyPlaceholder: 'Gemini API Key',
    uploadTitle: 'Drop or select Images / ZIP file',
    uploadDesc: 'Upload up to 10 images or a ZIP file containing pages',
    extractOnly: 'Extract Text Only (No Translation)',
    analyzeBtn: 'Start Extraction & Analysis',
    exportBtn: 'Export Formatted TXT (All Pages)',
    saveDraft: 'Save Draft',
    backToUpload: 'Back to Upload',
    reAnalyze: 'Re-analyze',
    preview: 'Page Preview',
    extractedTexts: 'Extracted Texts',
    originalText: 'Original Text:',
    translatedText: 'Translated Text:',
    page: 'Page',
    noImages: 'No images uploaded yet',
    maxImagesError: 'Maximum limit is 10 images at a time',
    analyzing: 'Processing and extracting texts with Gemini...',
  },
};

const formatTextByCategory = (text: string, category: string): string => {
  const cleanText = text.trim();
  switch (category) {
    case 'dialogue':
      return `"": ${cleanText}`;
    case 'thought':
      return `(): ${cleanText}`;
    case 'scream':
    case 'anger':
    case 'fear':
      return `<>: ${cleanText}`;
    case 'system':
      return `[]: ${cleanText}`;
    case 'phone':
    case 'message':
      return `**: ${cleanText}`;
    case 'narrator':
      return `NA: ${cleanText}`;
    case 'sfx':
      return `sfx: ${cleanText}`;
    case 'whisper':
      return `ST: ${cleanText}`;
    default:
      return cleanText;
  }
};

export default function Index() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [view, setView] = useState<'upload' | 'results'>('upload');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [extractOnly, setExtractOnly] = useState<boolean>(false);

  const [pages, setPages] = useState<MangaPage[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);

  const [apiKey, setApiKey] = useState<string>(
    import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key') || ''
  );

  const t = I18N[lang];

  // إدارة وضع الثيم الداكن والفيزيائي
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  // معالجة ملفات الصور والـ ZIP المرفوعة (حد أقصى 10)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newPages: MangaPage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // إذا كان الملف ZIP
      if (file.name.endsWith('.zip') || file.type.includes('zip')) {
        try {
          const zip = new JSZip();
          const zipContent = await zip.loadAsync(file);
          const imageEntries = Object.keys(zipContent.files).filter(
            (filename) => !zipContent.files[filename].dir && /\.(jpg|jpeg|png|webp)$/i.test(filename)
          );

          for (const filename of imageEntries) {
            if (newPages.length + pages.length >= 10) break;
            const blob = await zipContent.files[filename].async('blob');
            const imageUrl = URL.createObjectURL(blob);
            newPages.push({
              id: `page_${Date.now()}_${Math.random()}`,
              name: filename,
              imageUrl,
              items: [],
            });
          }
        } catch (err) {
          toast.error(lang === 'ar' ? 'حدث خطأ أثناء قراءة ملف الـ ZIP' : 'Error reading ZIP file');
        }
      } else if (file.type.startsWith('image/')) {
        if (newPages.length + pages.length >= 10) break;
        const imageUrl = URL.createObjectURL(file);
        newPages.push({
          id: `page_${Date.now()}_${Math.random()}`,
          name: file.name,
          imageUrl,
          items: [],
        });
      }
    }

    if (pages.length + newPages.length > 10) {
      toast.warning(t.maxImagesError);
    }

    const updatedPages = [...pages, ...newPages].slice(0, 10);
    setPages(updatedPages);
  };

  const handleRemovePage = (index: number) => {
    const updated = pages.filter((_, i) => i !== index);
    setPages(updated);
    if (activePageIndex >= updated.length) {
      setActivePageIndex(Math.max(0, updated.length - 1));
    }
  };

  // تحليل صورة واحدة عبر Gemini
  const analyzeSinglePage = async (page: MangaPage): Promise<ExtractedText[]> => {
    // تحويل Image URL إلى Base64
    const responseImg = await fetch(page.imageUrl);
    const blob = await responseImg.blob();
    const base64Data = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        resolve(res.replace(/^data:image\/[a-zA-Z+]+;base64,/, ''));
      };
      reader.readAsDataURL(blob);
    });

    const promptText = extractOnly
      ? `أنت أداة OCR واستخراج نصوص مانجا احترافية.
         قم باستخراج كافة النصوص من الصورة بالترتيب من الأعلى للأسفل.
         ضع النص الأصلي المستخرج في كل من originalText و translatedText (بدون ترجمة).
         صنّف كل عنصر إلى إحدى الفئات التالية:
         (dialogue, thought, scream, whisper, anger, fear, system, phone, message, sfx, narrator, other).`
      : `أنت مترجم مانجا وويب تون محترف لخلق سكريبتات تبييض سريعة.
         قم بتحليل الصورة واستخراج كافة النصوص بالترتيب من الأعلى للأسفل.
         صنّف كل عنصر إلى إحدى الفئات التالية:
         (dialogue, thought, scream, whisper, anger, fear, system, phone, message, sfx, narrator, other).
         ترجم كافة النصوص إلى اللغة العربية بدقة ودون تحريف.`;

    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                    { text: promptText },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: 'ARRAY',
                  description: 'قائمة الفقرات المستخرجة',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      id: { type: 'STRING' },
                      originalText: { type: 'STRING' },
                      translatedText: { type: 'STRING' },
                      category: { type: 'STRING' },
                    },
                    required: ['id', 'originalText', 'translatedText', 'category'],
                  },
                },
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const rawJsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawJsonText) {
            const parsedItems: ExtractedText[] = JSON.parse(rawJsonText);
            return parsedItems.map((item, idx) => ({
              ...item,
              id: item.id || `item_${idx}_${Date.now()}`,
            }));
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  };

  // بدء تحليل كافة الصفحات المرفوعة
  const handleAnalyzeAll = async () => {
    if (pages.length === 0) {
      toast.error(t.noImages);
      return;
    }

    if (!apiKey || apiKey.trim() === '') {
      toast.error(lang === 'ar' ? 'يرجى إدخال مفتاح Gemini API Key أولاً' : 'Please enter Gemini API Key');
      return;
    }

    setIsAnalyzing(true);
    toast.info(t.analyzing);

    const updatedPages = [...pages];

    for (let i = 0; i < updatedPages.length; i++) {
      const items = await analyzeSinglePage(updatedPages[i]);
      updatedPages[i] = { ...updatedPages[i], items };
    }

    setPages(updatedPages);
    setIsAnalyzing(false);
    setView('results');
    toast.success(lang === 'ar' ? 'تم استخراج كافة الصفحات بنجاح!' : 'All pages extracted successfully!');
  };

  // تصدير الشيت لكافة الصفحات بالترتيب
  const handleExport = () => {
    if (pages.length === 0) return;

    let fileContent = '';

    pages.forEach((page, pIdx) => {
      fileContent += `Page ${pIdx + 1}\n\n`;
      if (page.items.length > 0) {
        fileContent += page.items
          .map((item) => formatTextByCategory(item.translatedText, item.category))
          .join('\n\n');
      }
      fileContent += `\n\n${'='.repeat(30)}\n\n`;
    });

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `manga_script_all_pages.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(lang === 'ar' ? 'تم تصدير ملف النصوص المنسق!' : 'Formatted script exported!');
  };

  const updateActiveItem = (id: string, field: keyof ExtractedText, value: string) => {
    setPages((prev) =>
      prev.map((page, index) => {
        if (index !== activePageIndex) return page;
        return {
          ...page,
          items: page.items.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
        };
      })
    );
  };

  const activePage = pages[activePageIndex];

  return (
    <div
      className={`min-h-screen bg-background text-foreground p-4 sm:p-8 max-w-7xl mx-auto ${
        lang === 'ar' ? 'dir-rtl' : 'dir-ltr'
      }`}
    >
      {/* Navbar Header */}
      <header className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-orange-600 dark:text-orange-500">
            {t.title}
          </h1>
          <p className="text-xs text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Key Input */}
          <div className="flex items-center gap-2 border border-border px-2.5 py-1 rounded-lg bg-card">
            <Key className="w-4 h-4 text-orange-500 shrink-0" />
            <Input
              type="password"
              placeholder={t.apiKeyPlaceholder}
              value={apiKey}
              onChange={(e) => handleSaveApiKey(e.target.value)}
              className="h-8 text-xs border-0 focus-visible:ring-0 w-36 sm:w-48 dir-ltr"
            />
          </div>

          {/* Language Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="gap-1 text-xs"
          >
            <Globe className="w-3.5 h-3.5 text-orange-500" />
            {lang === 'ar' ? 'English' : 'العربية'}
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-xs"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </Button>
        </div>
      </header>

      {/* Main View Switch */}
      {view === 'upload' ? (
        <div className="space-y-6">
          {/* File Upload Zone */}
          <Card className="border-2 border-dashed border-border hover:border-orange-500/50 transition-colors p-8 text-center rounded-2xl bg-card/50">
            <input
              type="file"
              multiple
              accept="image/*,.zip"
              onChange={handleFileUpload}
              className="hidden"
              id="manga-upload-input"
            />
            <label htmlFor="manga-upload-input" className="cursor-pointer space-y-4 block">
              <div className="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mx-auto">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{t.uploadTitle}</h3>
                <p className="text-xs text-muted-foreground mt-1">{t.uploadDesc}</p>
              </div>
            </label>
          </Card>

          {/* Config Options */}
          <div className="flex flex-wrap items-center justify-between bg-card p-4 rounded-xl border border-border gap-4">
            <div className="flex items-center gap-3">
              <Switch
                id="extract-only-mode"
                checked={extractOnly}
                onCheckedChange={setExtractOnly}
              />
              <Label htmlFor="extract-only-mode" className="text-sm font-semibold cursor-pointer">
                {t.extractOnly}
              </Label>
            </div>

            <Button
              onClick={handleAnalyzeAll}
              disabled={isAnalyzing || pages.length === 0}
              className="bg-orange-600 hover:bg-orange-700 text-white gap-2 text-sm font-bold w-full sm:w-auto"
            >
              <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
              {t.analyzeBtn} ({pages.length})
            </Button>
          </div>

          {/* Uploaded Thumbnails Grid (Up to 10) */}
          {pages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {pages.map((page, idx) => (
                <Card key={page.id} className="relative group overflow-hidden border-border rounded-xl">
                  <img src={page.imageUrl} alt={page.name} className="w-full h-44 object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRemovePage(idx)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="p-2 text-center text-xs truncate bg-card font-medium">
                    {t.page} {idx + 1}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Results View */
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between bg-card p-4 rounded-2xl border border-border gap-3">
            <Button variant="outline" onClick={() => setView('upload')} className="gap-2 text-xs font-bold">
              <ArrowLeft className="w-4 h-4" /> {t.backToUpload}
            </Button>

            {/* Pagination Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-md py-1">
              {pages.map((p, idx) => (
                <Button
                  key={p.id}
                  size="sm"
                  variant={activePageIndex === idx ? 'default' : 'secondary'}
                  className={`text-xs px-3 font-bold ${
                    activePageIndex === idx ? 'bg-orange-600 text-white' : ''
                  }`}
                  onClick={() => setActivePageIndex(idx)}
                >
                  {t.page} {idx + 1}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleExport} className="bg-orange-600 hover:bg-orange-700 text-white gap-2 text-xs font-bold">
                <Download className="w-4 h-4" /> {t.exportBtn}
              </Button>
            </div>
          </div>

          {/* Image & Text Editor Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image Preview */}
            <Card className="rounded-2xl overflow-hidden border-border bg-zinc-950/5 flex flex-col h-[750px]">
              <div className="p-3 border-b border-border bg-card/60 flex justify-between items-center text-xs text-muted-foreground font-semibold">
                <span>{t.preview} - {t.page} {activePageIndex + 1}</span>
              </div>
              <CardContent className="p-4 flex-1 overflow-y-auto flex justify-center items-start">
                {activePage?.imageUrl ? (
                  <img
                    src={activePage.imageUrl}
                    alt="Manga Page"
                    className="w-full max-w-[450px] h-auto object-contain rounded-lg shadow-md"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground m-auto">{t.noImages}</p>
                )}
              </CardContent>
            </Card>

            {/* Extracted Items */}
            <div className="space-y-4 h-[750px] overflow-y-auto pl-2">
              <div className="flex justify-between items-center sticky top-0 bg-background/95 backdrop-blur py-2 z-10">
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-500" />
                  {t.extractedTexts} ({activePage?.items?.length || 0})
                </h3>
              </div>

              {activePage?.items?.map((item, idx) => (
                <Card
                  key={item.id}
                  className="p-4 space-y-3 border-border rounded-xl shadow-sm hover:border-orange-500/30 transition-colors"
                >
                  <div className="flex justify-between items-center text-xs text-muted-foreground font-semibold">
                    <span className="bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2.5 py-1 rounded-md font-bold">
                      #{idx + 1}
                    </span>
                    <Select
                      value={item.category}
                      onValueChange={(val) => updateActiveItem(item.id, 'category', val)}
                    >
                      <SelectTrigger className="w-[180px] h-8 text-xs font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {lang === 'ar' ? cat.labelAr : cat.labelEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground">{t.originalText}</Label>
                    <Textarea
                      value={item.originalText}
                      onChange={(e) => updateActiveItem(item.id, 'originalText', e.target.value)}
                      className="min-h-[50px] text-sm dir-ltr bg-muted/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                      {t.translatedText}
                    </Label>
                    <Textarea
                      value={item.translatedText}
                      onChange={(e) => updateActiveItem(item.id, 'translatedText', e.target.value)}
                      className="min-h-[50px] text-sm font-medium bg-card"
                    />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}