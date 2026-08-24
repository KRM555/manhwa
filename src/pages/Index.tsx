import React, { useState, useEffect } from 'react';
import { UploadZone } from '@/components/UploadZone';
import { TranslationConfig } from '@/types/manga';
import { 
  ArrowLeft, Download, Sparkles, Key, RefreshCw, 
  Sun, Moon, Languages, Images, ChevronRight, ChevronLeft, Trash2,
  ExternalLink, FileText, Plus, Settings2, Play, FileDown, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

export interface TagRule {
  value: string;
  label: string;
  prefix: string;
  suffix: string;
}

const DEFAULT_TAGS: TagRule[] = [
  { value: 'dialogue', label: 'حوار (Dialogue)', prefix: '"": ', suffix: '' },
  { value: 'thought', label: 'أفكار (Thought)', prefix: '(): ', suffix: '' },
  { value: 'scream', label: 'صراخ (Scream)', prefix: '<>: ', suffix: '' },
  { value: 'system', label: 'نظام (System)', prefix: '[]: ', suffix: '' },
  { value: 'phone', label: 'هاتف (Phone)', prefix: '**: ', suffix: '' },
  { value: 'narrator', label: 'راوي (Narrator)', prefix: 'NA: ', suffix: '' },
  { value: 'sfx', label: 'مؤثر صوتي (SFX)', prefix: 'sfx: ', suffix: '' },
  { value: 'whisper', label: 'همس (Whisper)', prefix: 'ST: ', suffix: '' },
  { value: 'other', label: 'أخرى (Other)', prefix: '', suffix: '' },
];

const CANDIDATE_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

const UI_TEXT = {
  ar: {
    subtitle: 'أداة استخراج وترجمة وتنسيق سكريبتات الويب تون والمانجا',
    apiLabel: 'مفتاح Gemini API:',
    apiHint: 'احصل على مفتاح مجاني من Google AI Studio',
    apiKeyPlaceholder: 'AIzaSy...',
    backToUpload: 'العودة للرفع',
    reAnalyze: 'إعادة التحليل',
    analyzeAll: 'تحليل كافة الصور',
    extractOcrOnly: 'استخراج النص فقط (OCR)',
    saveDraft: 'حفظ المسودة',
    exportOriginal: 'تصدير النص الأصلي (OCR)',
    exportTranslated: 'تصدير النص المترجم',
    exportCurrentPage: 'الصفحة الحالية فقط',
    exportAllPages: 'كافة الصفحات',
    pagePreview: 'معاينة الصفحة',
    extractedTexts: 'النصوص المستخرجة',
    originalText: 'النص الأصلي:',
    translatedText: 'النص المترجم / الناتج:',
    noImage: 'لا توجد صورة محددة',
    page: 'صفحة',
    multiImageLimit: 'الحد الأقصى هو 10 صور فقط',
    paragraph: 'فقرة',
    selectImageFirst: 'الرجاء اختيار صورة واحدة على الأقل',
    enterApiKey: 'يرجى إدخال مفتاح Gemini API Key أولاً',
    analyzing: 'جاري معالجة واستخراج النصوص بواسطة Gemini...',
    successExtract: 'تم استخراج النصوص بنجاح!',
    noItemsToExport: 'لا توجد نصوص لتصديرها لهذه الصفحة',
    clearAll: 'حذف الكل',
    tagSettings: 'إعدادات العلامات والتنسيق',
    addNewTag: 'إضافة علامة جديدة',
    tagName: 'اسم العلامة',
    tagPrefix: 'البادئة (Prefix)',
    tagSuffix: 'اللاحقة (Suffix)',
    add: 'إضافة',
    deleteTag: 'حذف العلامة',
  },
  en: {
    subtitle: 'Webtoon & Manga OCR, Translation and Typesetting tool',
    apiLabel: 'Gemini API Key:',
    apiHint: 'Get free key from Google AI Studio',
    apiKeyPlaceholder: 'AIzaSy...',
    backToUpload: 'Back to Upload',
    reAnalyze: 'Re-analyze',
    analyzeAll: 'Analyze All Images',
    extractOcrOnly: 'Extract Text Only (OCR)',
    saveDraft: 'Save Draft',
    exportOriginal: 'Export Original (OCR)',
    exportTranslated: 'Export Translated',
    exportCurrentPage: 'Current Page Only',
    exportAllPages: 'All Pages',
    pagePreview: 'Page Preview',
    extractedTexts: 'Extracted Texts',
    originalText: 'Original Text:',
    translatedText: 'Translated / Result Text:',
    noImage: 'No image selected',
    page: 'Page',
    multiImageLimit: 'Maximum limit is 10 images',
    paragraph: 'Block',
    selectImageFirst: 'Please select at least one image',
    enterApiKey: 'Please enter a valid Gemini API Key first',
    analyzing: 'Processing text with Gemini...',
    successExtract: 'Texts successfully extracted!',
    noItemsToExport: 'No texts available to export',
    clearAll: 'Clear All',
    tagSettings: 'Tag Formatting Settings',
    addNewTag: 'Add Custom Tag',
    tagName: 'Tag Name',
    tagPrefix: 'Prefix',
    tagSuffix: 'Suffix',
    add: 'Add Tag',
    deleteTag: 'Delete Tag',
  },
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

  const [resultsMap, setResultsMap] = useState<Record<string, ExtractedText[]>>({});

  const [tags, setTags] = useState<TagRule[]>(() => {
    const saved = localStorage.getItem('custom_manga_tags');
    return saved ? JSON.parse(saved) : DEFAULT_TAGS;
  });

  const [newTagLabel, setNewTagLabel] = useState('');
  const [newTagPrefix, setNewTagPrefix] = useState('');
  const [newTagSuffix, setNewTagSuffix] = useState('');

  useEffect(() => {
    localStorage.setItem('custom_manga_tags', JSON.stringify(tags));
  }, [tags]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const t = UI_TEXT[lang];
  const activeImage = images[activeImageIndex] || null;
  const currentItems = activeImage ? (resultsMap[activeImage.id] || []) : [];

  const handleImageSelected = (url: string, name: string) => {
    if (images.length >= 10) {
      toast.error(t.multiImageLimit);
      return;
    }
    const newImage: ImageItem = { id: `img_${Date.now()}_${Math.random()}`, url, name };
    setImages((prev) => [...prev, newImage]);
    setActiveImageIndex(images.length);
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
    const imgToRemove = images[index];
    const updated = images.filter((_, i) => i !== index);
    setImages(updated);
    
    if (imgToRemove) {
      const newMap = { ...resultsMap };
      delete newMap[imgToRemove.id];
      setResultsMap(newMap);
    }

    if (activeImageIndex >= updated.length) {
      setActiveImageIndex(Math.max(0, updated.length - 1));
    }
  };

  const handleClearAllImages = () => {
    setImages([]);
    setActiveImageIndex(0);
    setResultsMap({});
  };

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  const handleAddCustomTag = () => {
    if (!newTagLabel.trim()) return;
    const val = `custom_${Date.now()}`;
    const newTag: TagRule = {
      value: val,
      label: newTagLabel,
      prefix: newTagPrefix,
      suffix: newTagSuffix,
    };
    setTags([...tags, newTag]);
    setNewTagLabel('');
    setNewTagPrefix('');
    setNewTagSuffix('');
    toast.success(lang === 'ar' ? 'تمت إضافة العلامة الجديدة!' : 'Custom tag added!');
  };

  // دالة حذف العلامات
  const handleDeleteTag = (index: number) => {
    if (tags.length <= 1) {
      toast.error(lang === 'ar' ? 'يجب الإبقاء على علامة واحدة على الأقل' : 'At least one tag must remain');
      return;
    }
    const updated = tags.filter((_, i) => i !== index);
    setTags(updated);
    toast.success(lang === 'ar' ? 'تم حذف العلامة بنجاح' : 'Tag deleted successfully');
  };

  const formatTextWithRules = (text: string, categoryVal: string): string => {
    const cleanText = text.trim();
    const rule = tags.find((t) => t.value === categoryVal);
    if (!rule) return cleanText;
    return `${rule.prefix}${cleanText}${rule.suffix}`;
  };

  const processGeminiRequest = async (targetImg: ImageItem, ocrOnly = false): Promise<ExtractedText[] | null> => {
    const mimeTypeMatch = targetImg.url.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
    const base64Data = targetImg.url.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

    const promptText = ocrOnly
      ? `Extract all original texts from this manga page top to bottom without translation. Categorize each block into best matching category among existing tags.`
      : `
        Extract all texts from the image in reading order top to bottom.
        Categorize each block into one of these types: (${tags.map(t => t.value).join(', ')}).
        Translate all extracted texts to ${config.targetLanguage === 'ar' ? 'Arabic' : 'English'} accurately.
      `;

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

        if (!response.ok) continue;

        const data = await response.json();
        const rawJsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (rawJsonText) {
          const parsedItems: ExtractedText[] = JSON.parse(rawJsonText);
          return parsedItems.map((item, idx) => ({
            ...item,
            id: item.id || `item_${idx}_${Date.now()}`,
            translatedText: ocrOnly ? item.originalText : item.translatedText,
          }));
        }
      } catch (err) {
        console.error(err);
      }
    }
    return null;
  };

  const handleAnalyzeCurrent = async (ocrOnly = false) => {
    if (!activeImage) {
      toast.error(t.selectImageFirst);
      return;
    }
    if (!apiKey.trim()) {
      toast.error(t.enterApiKey);
      return;
    }

    setIsAnalyzing(true);
    toast.info(t.analyzing);

    const res = await processGeminiRequest(activeImage, ocrOnly);
    if (res) {
      setResultsMap((prev) => ({ ...prev, [activeImage.id]: res }));
      toast.success(t.successExtract);
      setView('results');
    } else {
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء معالجة الصورة' : 'Failed to process image');
    }
    setIsAnalyzing(false);
  };

  const handleAnalyzeAll = async (ocrOnly = false) => {
    if (images.length === 0) {
      toast.error(t.selectImageFirst);
      return;
    }
    if (!apiKey.trim()) {
      toast.error(t.enterApiKey);
      return;
    }

    setIsAnalyzing(true);
    toast.info(lang === 'ar' ? `جاري تحليل جميع الصور (${images.length})...` : `Analyzing all ${images.length} images...`);

    const newMap = { ...resultsMap };
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const res = await processGeminiRequest(img, ocrOnly);
      if (res) {
        newMap[img.id] = res;
      }
    }

    setResultsMap(newMap);
    setIsAnalyzing(false);
    toast.success(lang === 'ar' ? 'تمت معالجة كافة الصور بنجاح!' : 'All images processed successfully!');
    setView('results');
  };

  const handleExportText = (scope: 'current' | 'all', textType: 'original' | 'translated') => {
    const targetImages = scope === 'current' ? (activeImage ? [activeImage] : []) : images;
    if (targetImages.length === 0) return;

    let fullOutput = '';

    targetImages.forEach((img) => {
      const realIndex = images.findIndex((i) => i.id === img.id);
      const itemsForImg = resultsMap[img.id] || [];
      if (itemsForImg.length > 0) {
        fullOutput += `=== Page ${realIndex + 1}: ${img.name} ===\n\n`;
        itemsForImg.forEach((item) => {
          const contentToExport = textType === 'original' ? item.originalText : item.translatedText;
          fullOutput += formatTextWithRules(contentToExport, item.category) + '\n\n';
        });
        fullOutput += '\n';
      }
    });

    if (!fullOutput.trim()) {
      toast.error(t.noItemsToExport);
      return;
    }

    const blob = new Blob([fullOutput], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    let fileName = '';
    if (textType === 'original') {
      fileName = scope === 'current' 
        ? `page_${activeImageIndex + 1}_ocr_original_script.txt` 
        : `full_ocr_original_script.txt`;
    } else {
      fileName = scope === 'current' 
        ? `page_${activeImageIndex + 1}_translated_script.txt` 
        : `full_translated_script.txt`;
    }
    
    link.download = fileName;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(
      lang === 'ar'
        ? `تم تصدير (${fileName}) بنجاح!`
        : `Exported (${fileName}) successfully!`
    );
  };

  const updateItem = (id: string, field: keyof ExtractedText, value: string) => {
    if (!activeImage) return;
    setResultsMap((prev) => {
      const list = prev[activeImage.id] || [];
      const updated = list.map((item) => (item.id === id ? { ...item, [field]: value } : item));
      return { ...prev, [activeImage.id]: updated };
    });
  };

  return (
    <div className={`min-h-screen bg-background text-foreground p-4 sm:p-8 w-full max-w-[1550px] mx-auto ${lang === 'ar' ? 'dir-rtl' : 'dir-ltr'}`}>
      {/* Header */}
      <header className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border pb-4 gap-4">
        <div>
          {/* اسم الموقع الثابت */}
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-orange-600 dark:text-orange-500">
            Manhwa Transtool Studio
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-9 gap-1.5 text-xs font-bold px-3 rounded-xl">
                <Settings2 className="w-4 h-4 text-orange-500" />
                {t.tagSettings}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-base font-bold">{t.tagSettings}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {tags.map((tag, i) => (
                    <div key={tag.value || i} className="flex items-center gap-1.5 bg-muted/40 p-2 rounded-lg text-xs">
                      <span className="font-bold w-24 truncate">{tag.label}</span>
                      <Input
                        value={tag.prefix}
                        onChange={(e) => {
                          const updated = [...tags];
                          updated[i].prefix = e.target.value;
                          setTags(updated);
                        }}
                        className="h-7 text-xs w-16"
                        placeholder="Prefix"
                      />
                      <Input
                        value={tag.suffix}
                        onChange={(e) => {
                          const updated = [...tags];
                          updated[i].suffix = e.target.value;
                          setTags(updated);
                        }}
                        className="h-7 text-xs w-16"
                        placeholder="Suffix"
                      />
                      {/* زر حذف العلامة */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTag(i)}
                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-950/50 shrink-0"
                        title={t.deleteTag}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-3 space-y-2">
                  <Label className="text-xs font-bold">{t.addNewTag}</Label>
                  <Input
                    placeholder={t.tagName}
                    value={newTagLabel}
                    onChange={(e) => setNewTagLabel(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder={t.tagPrefix}
                      value={newTagPrefix}
                      onChange={(e) => setNewTagPrefix(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder={t.tagSuffix}
                      value={newTagSuffix}
                      onChange={(e) => setNewTagSuffix(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <Button onClick={handleAddCustomTag} className="w-full h-8 text-xs font-bold bg-orange-600 text-white">
                    <Plus className="w-3.5 h-3.5 ml-1" /> {t.add}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-xl"
            onClick={() => setIsDarkMode(!isDarkMode)}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-orange-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </Button>

          <Button
            variant="outline"
            className="h-9 gap-1.5 text-xs font-bold px-3 rounded-xl"
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          >
            <Languages className="w-4 h-4 text-orange-500" />
            {lang === 'ar' ? 'English' : 'عربي'}
          </Button>

          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <div className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span className="text-[11px] font-bold text-muted-foreground">{t.apiLabel}</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-orange-500 hover:underline flex items-center gap-0.5 ml-auto"
              >
                {lang === 'ar' ? 'مفتاح مجاني' : 'Free Key'}
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
                  {resultsMap[img.id] && <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>}
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
          <Button variant="ghost" size="sm" onClick={handleClearAllImages} className="text-xs text-red-500 font-bold shrink-0">
            {t.clearAll}
          </Button>
        </div>
      )}

      {/* Main View Switcher */}
      {view === 'upload' ? (
        <div className="space-y-6">
          <UploadZone
            imagePreview={activeImage?.url || null}
            fileName={activeImage?.name || null}
            config={config}
            isAnalyzing={isAnalyzing}
            onImageSelected={handleImageSelected}
            onMultipleImagesSelected={handleMultipleImagesSelected}
            onClearImage={handleClearAllImages}
            onConfigChange={(updated) => setConfig((prev) => ({ ...prev, ...updated }))}
            onAnalyze={() => handleAnalyzeCurrent(false)}
            lang={lang}
          />

          {images.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button
                onClick={() => handleAnalyzeCurrent(false)}
                disabled={isAnalyzing}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold h-11 px-6 rounded-xl gap-2 shadow-md"
              >
                <Sparkles className="w-4 h-4" />
                {lang === 'ar' ? 'تحليل الصورة الحالية' : 'Analyze Current Image'}
              </Button>

              <Button
                onClick={() => handleAnalyzeCurrent(true)}
                disabled={isAnalyzing}
                variant="outline"
                className="border-orange-500/40 text-orange-600 dark:text-orange-400 font-bold h-11 px-6 rounded-xl gap-2"
              >
                <FileText className="w-4 h-4" />
                {t.extractOcrOnly}
              </Button>

              <Button
                onClick={() => handleAnalyzeAll(false)}
                disabled={isAnalyzing}
                className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold h-11 px-6 rounded-xl gap-2 shadow-md"
              >
                <Play className="w-4 h-4 text-orange-400" />
                {t.analyzeAll} ({images.length})
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between bg-card p-4 rounded-2xl border border-border gap-3">
            <Button variant="outline" onClick={() => setView('upload')} className="gap-2 text-xs font-bold rounded-xl">
              <ArrowLeft className="w-4 h-4" /> {t.backToUpload}
            </Button>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => handleAnalyzeCurrent(false)}
                disabled={isAnalyzing}
                className="gap-2 text-xs font-bold rounded-xl"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} /> {t.reAnalyze}
              </Button>

              <Button
                variant="outline"
                onClick={() => handleAnalyzeCurrent(true)}
                disabled={isAnalyzing}
                className="gap-2 text-xs font-bold rounded-xl text-orange-500"
              >
                <FileText className="w-3.5 h-3.5" /> {t.extractOcrOnly}
              </Button>

              <Button
                variant="secondary"
                onClick={() => handleAnalyzeAll(false)}
                disabled={isAnalyzing}
                className="gap-2 text-xs font-bold rounded-xl"
              >
                <Play className="w-3.5 h-3.5" /> {t.analyzeAll}
              </Button>

              {/* قائمة تصدير النص الأصلي (OCR) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-orange-500/40 text-orange-600 dark:text-orange-400 gap-1.5 text-xs font-bold rounded-xl">
                    <FileDown className="w-4 h-4" />
                    {t.exportOriginal}
                    <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuLabel className="text-xs font-bold">{t.exportOriginal}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExportText('current', 'original')} className="text-xs font-medium cursor-pointer">
                    {t.exportCurrentPage} (page_{activeImageIndex + 1}_ocr_original_script.txt)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportText('all', 'original')} className="text-xs font-medium cursor-pointer">
                    {t.exportAllPages} (full_ocr_original_script.txt)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* قائمة تصدير النص المترجم */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5 text-xs font-bold rounded-xl">
                    <Download className="w-4 h-4" />
                    {t.exportTranslated}
                    <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuLabel className="text-xs font-bold">{t.exportTranslated}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExportText('current', 'translated')} className="text-xs font-medium cursor-pointer">
                    {t.exportCurrentPage} (page_{activeImageIndex + 1}_translated_script.txt)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportText('all', 'translated')} className="text-xs font-medium cursor-pointer">
                    {t.exportAllPages} (full_translated_script.txt)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image Preview Panel */}
            <Card className="rounded-2xl overflow-hidden border-border bg-zinc-950/5 flex flex-col h-[750px]">
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
                    className="w-full max-w-[550px] h-auto object-contain rounded-lg shadow-md"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground m-auto">{t.noImage}</p>
                )}
              </CardContent>
            </Card>

            {/* Extracted Texts List */}
            <div className="space-y-4 h-[750px] overflow-y-auto pl-2">
              <div className="flex justify-between items-center sticky top-0 bg-background/95 backdrop-blur py-2 z-10 border-b border-border/50">
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-500" />
                  {t.extractedTexts} ({currentItems.length})
                </h3>
              </div>

              {currentItems.map((item, idx) => (
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
                        {tags.map((tag) => (
                          <SelectItem key={tag.value} value={tag.value}>
                            {tag.label}
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