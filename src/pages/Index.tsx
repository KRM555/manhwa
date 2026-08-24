import React, { useState, useEffect } from 'react';
import { UploadZone } from '@/components/UploadZone';
import { TranslationConfig, SampleManga } from '@/types/manga';
import { 
  ArrowLeft, Download, Save, Sparkles, Key, RefreshCw, 
  Sun, Moon, Languages, Images, ChevronRight, ChevronLeft, Trash2, HelpCircle, ExternalLink 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export interface ExtractedText {
  id: string;
  originalText: string;
  translatedText: string;
  category: string;
}

interface ImageItem {
  id: string;
  url: string;
  name: string;
}

const CATEGORIES = [
  { value: 'dialogue', label: { ar: 'حوار (Dialogue)', en: 'Dialogue' } },
  { value: 'thought', label: { ar: 'أفكار (Thought)', en: 'Thought' } },
  { value: 'scream', label: { ar: 'صراخ (Scream)', en: 'Scream' } },
  { value: 'whisper', label: { ar: 'همس (Whisper)', en: 'Whisper' } },
  { value: 'anger', label: { ar: 'غضب (Anger)', en: 'Anger' } },
  { value: 'fear', label: { ar: 'خوف (Fear)', en: 'Fear' } },
  { value: 'tension', label: { ar: 'توتر (Tension)', en: 'Tension' } },
  { value: 'pleasure', label: { ar: 'متعة (Pleasure)', en: 'Pleasure' } },
  { value: 'monster', label: { ar: 'وحش (Monster)', en: 'Monster' } },
  { value: 'system', label: { ar: 'نظام (System)', en: 'System' } },
  { value: 'phone', label: { ar: 'هاتف (Phone)', en: 'Phone' } },
  { value: 'message', label: { ar: 'رسالة (Message)', en: 'Message' } },
  { value: 'sfx', label: { ar: 'مؤثر صوتي (SFX)', en: 'SFX' } },
  { value: 'narrator', label: { ar: 'راوي (Narrator)', en: 'Narrator' } },
  { value: 'other', label: { ar: 'أخرى (Other)', en: 'Other' } },
];

// الموديلات الخاصة بك كما هي تماماً بدون تغيير
const CANDIDATE_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

const UI_TEXT = {
  ar: {
    title: 'Manga Translator Studio',
    subtitle: 'أداة استخراج وترجمة وتنسيق سكريبتات الويب تون والمانجا',
    apiLabel: 'مفتاح Gemini API:',
    apiHint: 'احصل على مفتاح مجاني من Google AI Studio',
    apiKeyPlaceholder: 'AIzaSy...',
    backToUpload: 'العودة للرفع',
    reAnalyze: 'إعادة التحليل',
    saveDraft: 'حفظ المسودة',
    exportTxt: 'تصدير TXT المنسق',
    pagePreview: 'معاينة الصفحة',
    extractedTexts: 'النصوص المستخرجة',
    originalText: 'النص الأصلي:',
    translatedText: 'النص المترجم:',
    noImage: 'لا توجد صورة محددة',
    page: 'صفحة',
    multiImageLimit: 'الحد الأقصى هو 10 صور فقط',
    paragraph: 'فقرة',
    selectImageFirst: 'الرجاء اختيار صورة واحدة على الأقل',
    enterApiKey: 'يرجى إدخال مفتاح Gemini API Key أولاً',
    analyzing: 'جاري معالجة واستخراج النصوص بواسطة Gemini...',
    successExtract: 'تم استخراج وترجمة النصوص بنجاح!',
    noItemsToExport: 'لا توجد نصوص لتصديرها',
    clearAll: 'حذف الكل',
  },
  en: {
    title: 'Manga Translator Studio',
    subtitle: 'Webtoon & Manga OCR, Translation and Typesetting tool',
    apiLabel: 'Gemini API Key:',
    apiHint: 'Get free key from Google AI Studio',
    apiKeyPlaceholder: 'AIzaSy...',
    backToUpload: 'Back to Upload',
    reAnalyze: 'Re-analyze',
    saveDraft: 'Save Draft',
    exportTxt: 'Export Formatted TXT',
    pagePreview: 'Page Preview',
    extractedTexts: 'Extracted Texts',
    originalText: 'Original Text:',
    translatedText: 'Translated Text:',
    noImage: 'No image selected',
    page: 'Page',
    multiImageLimit: 'Maximum limit is 10 images',
    paragraph: 'Block',
    selectImageFirst: 'Please select at least one image',
    enterApiKey: 'Please enter a valid Gemini API Key first',
    analyzing: 'Processing and extracting text with Gemini...',
    successExtract: 'Texts successfully extracted and translated!',
    noItemsToExport: 'No texts available for export',
    clearAll: 'Clear All',
  },
};

const formatTextByCategory = (text: string, category: string): string => {
  const cleanText = text.trim();
  switch (category) {
    case 'dialogue': return `"": ${cleanText}`;
    case 'thought': return `(): ${cleanText}`;
    case 'scream':
    case 'anger':
    case 'fear': return `<>: ${cleanText}`;
    case 'system': return `[]: ${cleanText}`;
    case 'phone':
    case 'message': return `**: ${cleanText}`;
    case 'narrator': return `NA: ${cleanText}`;
    case 'sfx': return `sfx: ${cleanText}`;
    case 'whisper': return `ST: ${cleanText}`;
    default: return cleanText;
  }
};

export default function Index() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [view, setView] = useState<'upload' | 'results'>('upload');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  const [apiKey, setApiKey] = useState<string>(
    import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key') || ''
  );

  const [config, setConfig] = useState<TranslationConfig>({
    targetLanguage: 'ar',
    extractSFX: true,
    detectVerticalText: true,
  });

  const [items, setItems] = useState<ExtractedText[]>([]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const t = UI_TEXT[lang];
  const activeImage = images[activeImageIndex] || null;

  const handleImageSelected = (url: string, name: string, sampleData?: SampleManga) => {
    if (images.length >= 10) {
      toast.error(t.multiImageLimit);
      return;
    }
    const newImage: ImageItem = { id: `img_${Date.now()}_${Math.random()}`, url, name };
    setImages((prev) => [...prev, newImage]);
    setActiveImageIndex(images.length);

    if (sampleData && (sampleData as any).items) {
      setItems((sampleData as any).items);
    }
  };

  const handleMultipleImagesSelected = (newImages: { url: string; name: string }[]) => {
    const formatted = newImages.map((img) => ({
      id: `img_${Date.now()}_${Math.random()}`,
      url: img.url,
      name: img.name,
    }));
    setImages((prev) => [...prev, ...formatted].slice(0, 10));
    setActiveImageIndex(0);
  };

  const handleRemoveImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    setImages(updated);
    if (activeImageIndex >= updated.length) {
      setActiveImageIndex(Math.max(0, updated.length - 1));
    }
  };

  const handleClearAllImages = () => {
    setImages([]);
    setActiveImageIndex(0);
    setItems([]);
  };

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  const handleSaveDraft = () => {
    if (items.length === 0) {
      toast.error(t.noItemsToExport);
      return;
    }
    localStorage.setItem('manga_draft_items', JSON.stringify(items));
    toast.success(lang === 'ar' ? 'تم حفظ المسودة!' : 'Draft saved!');
  };

  const handleExport = () => {
    if (items.length === 0) {
      toast.error(t.noItemsToExport);
      return;
    }

    let fileContent = `Page ${activeImageIndex + 1}\n\n`;
    fileContent += items
      .map((item) => formatTextByCategory(item.translatedText, item.category))
      .join('\n\n');

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanName = activeImage?.name ? activeImage.name.replace(/\.[^/.]+$/, '') : 'manga_page';
    link.download = `${cleanName}_script.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(lang === 'ar' ? 'تم التصدير بنجاح!' : 'Export successful!');
  };

  const handleAnalyze = async () => {
    if (!activeImage) {
      toast.error(t.selectImageFirst);
      return;
    }

    if (!apiKey || apiKey.trim() === '') {
      toast.error(t.enterApiKey);
      return;
    }

    setIsAnalyzing(true);
    toast.info(t.analyzing);

    const mimeTypeMatch = activeImage.url.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
    const base64Data = activeImage.url.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

    const promptText = `
      You are a professional webtoon/manga translator and typesetter script assistant.
      Extract all texts from the image in reading order top to bottom.
      Categorize each block into one of these types:
      (dialogue, thought, scream, whisper, anger, fear, tension, pleasure, monster, system, phone, message, sfx, narrator, other).
      Translate all extracted texts to ${config.targetLanguage === 'ar' ? 'Arabic' : 'English'} accurately.
    `;

    let success = false;
    let lastErrorMsg = '';

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
                    { inlineData: { mimeType, data: base64Data } },
                    { text: promptText },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: 'ARRAY',
                  description: 'List of extracted manga dialogue items',
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

        if (!response.ok) {
          const errJson = await response.json();
          lastErrorMsg = errJson.error?.message || `Model ${model} failed`;
          continue;
        }

        const data = await response.json();
        const rawJsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (rawJsonText) {
          const parsedItems: ExtractedText[] = JSON.parse(rawJsonText);
          const formattedItems = parsedItems.map((item, idx) => ({
            ...item,
            id: item.id || `item_${idx}_${Date.now()}`,
          }));

          setItems(formattedItems);
          toast.success(t.successExtract);
          setView('results');
          success = true;
          break;
        }
      } catch (err: any) {
        lastErrorMsg = err.message || 'Network error';
      }
    }

    if (!success) {
      toast.error(`${lang === 'ar' ? 'تعذر استخراج النصوص' : 'Extraction failed'}: ${lastErrorMsg}`);
    }

    setIsAnalyzing(false);
  };

  const updateItem = (id: string, field: keyof ExtractedText, value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  return (
    <div className={`min-h-screen bg-background text-foreground p-4 sm:p-6 w-full max-w-6xl mx-auto ${lang === 'ar' ? 'dir-rtl' : 'dir-ltr'}`}>
      {/* Header */}
      <header className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-orange-600 dark:text-orange-500">
            {t.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Toggle Theme */}
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-xl"
            onClick={() => setIsDarkMode(!isDarkMode)}
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-orange-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </Button>

          {/* Toggle Language */}
          <Button
            variant="outline"
            className="h-9 gap-1.5 text-xs font-bold px-3 rounded-xl"
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          >
            <Languages className="w-4 h-4 text-orange-500" />
            {lang === 'ar' ? 'English' : 'عربي'}
          </Button>

          {/* API Key Box with Explanation */}
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <div className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span className="text-[11px] font-bold text-muted-foreground">{t.apiLabel}</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-orange-500 hover:underline flex items-center gap-0.5 ml-auto"
                title={t.apiHint}
              >
                {lang === 'ar' ? 'جلب مفتاح مجاني' : 'Get Free Key'}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <Input
              type="password"
              placeholder={t.apiKeyPlaceholder}
              value={apiKey}
              onChange={(e) => handleSaveApiKey(e.target.value)}
              className="h-9 text-xs w-full sm:w-64 dir-ltr rounded-xl"
            />
          </div>
        </div>
      </header>

      {/* Multi-Image Navigation Bar */}
      {images.length > 0 && (
        <div className="mb-6 p-3 bg-card border border-border rounded-2xl flex items-center justify-between gap-3 overflow-x-auto shadow-sm">
          <div className="flex items-center gap-2">
            <Images className="w-4 h-4 text-orange-500 shrink-0" />
            <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">
              {t.page} ({images.length}/10):
            </span>
            <div className="flex gap-1.5 overflow-x-auto py-1">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                    activeImageIndex === idx
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'bg-muted hover:bg-muted/80 text-foreground'
                  }`}
                >
                  #{idx + 1}
                  <Trash2
                    className="w-3 h-3 hover:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage(idx);
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClearAllImages} className="text-xs text-red-500 hover:text-red-600 font-bold shrink-0">
            {t.clearAll}
          </Button>
        </div>
      )}

      {/* Main View Switcher */}
      {view === 'upload' ? (
        <UploadZone
          imagePreview={activeImage?.url || null}
          fileName={activeImage?.name || null}
          config={config}
          isAnalyzing={isAnalyzing}
          onImageSelected={handleImageSelected}
          onMultipleImagesSelected={handleMultipleImagesSelected}
          onClearImage={handleClearAllImages}
          onConfigChange={(updated) => setConfig((prev) => ({ ...prev, ...updated }))}
          onAnalyze={handleAnalyze}
          lang={lang}
        />
      ) : (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between bg-card p-4 rounded-2xl border border-border gap-3">
            <Button variant="outline" onClick={() => setView('upload')} className="gap-2 text-xs font-bold rounded-xl">
              <ArrowLeft className="w-4 h-4" /> {t.backToUpload}
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="gap-2 text-xs font-bold rounded-xl"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} /> {t.reAnalyze}
              </Button>

              <Button variant="secondary" onClick={handleSaveDraft} className="gap-2 text-xs font-bold rounded-xl">
                <Save className="w-4 h-4" /> {t.saveDraft}
              </Button>

              <Button onClick={handleExport} className="bg-orange-600 hover:bg-orange-700 text-white gap-2 text-xs font-bold rounded-xl">
                <Download className="w-4 h-4" /> {t.exportTxt}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image Preview Panel */}
            <Card className="rounded-2xl overflow-hidden border-border bg-zinc-950/5 flex flex-col h-[700px]">
              <div className="p-3 border-b border-border bg-card/60 flex justify-between items-center text-xs text-muted-foreground font-semibold">
                <span>{t.pagePreview} (#{activeImageIndex + 1})</span>
                {images.length > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6 rounded-md"
                      disabled={activeImageIndex === 0}
                      onClick={() => setActiveImageIndex((prev) => prev - 1)}
                    >
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6 rounded-md"
                      disabled={activeImageIndex === images.length - 1}
                      onClick={() => setActiveImageIndex((prev) => prev + 1)}
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
              <CardContent className="p-4 flex-1 overflow-y-auto flex justify-center items-start">
                {activeImage ? (
                  <img
                    src={activeImage.url}
                    alt="Manga Page"
                    className="w-full max-w-[480px] h-auto object-contain rounded-lg shadow-md"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground m-auto">{t.noImage}</p>
                )}
              </CardContent>
            </Card>

            {/* Extracted Texts List */}
            <div className="space-y-4 h-[700px] overflow-y-auto pl-2">
              <div className="flex justify-between items-center sticky top-0 bg-background/95 backdrop-blur py-2 z-10 border-b border-border/50">
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-500" />
                  {t.extractedTexts} ({items.length})
                </h3>
              </div>

              {items.map((item, idx) => (
                <Card key={item.id} className="p-4 space-y-3 border-border rounded-xl shadow-sm hover:border-orange-500/30 transition-colors">
                  <div className="flex justify-between items-center text-xs text-muted-foreground font-semibold">
                    <span className="bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2.5 py-1 rounded-md font-bold">
                      {t.paragraph} #{idx + 1}
                    </span>
                    <Select
                      value={item.category}
                      onValueChange={(val) => updateItem(item.id, 'category', val)}
                    >
                      <SelectTrigger className="w-[180px] h-8 text-xs font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {typeof cat.label === 'string' ? cat.label : cat.label[lang]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground">{t.originalText}</Label>
                    <Textarea
                      value={item.originalText}
                      onChange={(e) => updateItem(item.id, 'originalText', e.target.value)}
                      className="min-h-[50px] text-sm dir-ltr bg-muted/20 rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                      {t.translatedText}
                    </Label>
                    <Textarea
                      value={item.translatedText}
                      onChange={(e) => updateItem(item.id, 'translatedText', e.target.value)}
                      className="min-h-[50px] text-sm font-medium bg-card rounded-lg"
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