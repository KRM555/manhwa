import React, { useRef, useState } from 'react';
import { Upload, Archive, Image as ImageIcon, Sparkles, X, CheckCircle2, Sliders, Volume2, FileText, ArrowRight, Layers, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { TARGET_LANGUAGES, SAMPLE_MANGA_PAGES } from '@/data/samples';
import { MangaPageItem, TranslationConfig, SampleManga } from '@/types/manga';
import { toast } from 'sonner';
import JSZip from 'jszip';

interface UploadZoneProps {
  pages: MangaPageItem[];
  config: TranslationConfig;
  isAnalyzing: boolean;
  onAddPages: (newPages: MangaPageItem[]) => void;
  onRemovePage: (id: string) => void;
  onClearAll: () => void;
  onConfigChange: (updated: Partial<TranslationConfig>) => void;
  onAnalyzeAll: () => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  pages,
  config,
  isAnalyzing,
  onAddPages,
  onRemovePage,
  onClearAll,
  onConfigChange,
  onAnalyzeAll,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUnzipping, setIsUnzipping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // Natural alphabetical sorting for filenames like page1.png, page2.png, page10.png
  const naturalSort = (a: string, b: string) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const zipFiles = fileArray.filter((f) => f.name.endsWith('.zip') || f.type.includes('zip'));
    const imageFiles = fileArray.filter((f) => f.type.startsWith('image/'));

    if (zipFiles.length > 0) {
      await processZipFile(zipFiles[0]);
    }

    if (imageFiles.length > 0) {
      // Sort images
      imageFiles.sort((a, b) => naturalSort(a.name, b.name));

      const newPageItems: MangaPageItem[] = [];
      for (const file of imageFiles) {
        const url = await readFileAsDataUrl(file);
        newPageItems.push({
          id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          fileName: file.name,
          previewUrl: url,
          status: 'pending',
          items: [],
        });
      }
      onAddPages(newPageItems);
      toast.success(`تمت إضافة ${newPageItems.length} صفحة بنجاح`);
    }
  };

  const processZipFile = async (zipFile: File) => {
    setIsUnzipping(true);
    toast.loading('جاري فك ضغط ملف الـ ZIP واستخراج الصفحات...', { id: 'zip-toast' });

    try {
      const zip = new JSZip();
      const content = await zip.loadAsync(zipFile);
      const imageEntries: { name: string; file: JSZip.JSZipObject }[] = [];

      content.forEach((relativePath, zipEntry) => {
        if (
          !zipEntry.dir &&
          !relativePath.startsWith('__MACOSX') &&
          !relativePath.includes('.DS_Store') &&
          /\.(jpe?g|png|webp|bmp|gif)$/i.test(relativePath)
        ) {
          imageEntries.push({ name: relativePath.split('/').pop() || relativePath, file: zipEntry });
        }
      });

      if (imageEntries.length === 0) {
        toast.error('لم يتم العثور على أي صور صالحة داخل ملف الـ ZIP', { id: 'zip-toast' });
        setIsUnzipping(false);
        return;
      }

      // Sort natural order (01.jpg, 02.jpg, 10.jpg)
      imageEntries.sort((a, b) => naturalSort(a.name, b.name));

      const newPages: MangaPageItem[] = [];
      for (const entry of imageEntries) {
        const blob = await entry.file.async('blob');
        const url = await readFileAsDataUrl(blob);
        newPages.push({
          id: `zip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          fileName: entry.name,
          previewUrl: url,
          status: 'pending',
          items: [],
        });
      }

      onAddPages(newPages);
      toast.success(`تم استخراج وترتيب ${newPages.length} صفحة من الـ ZIP!`, { id: 'zip-toast' });
    } catch (err: any) {
      console.error(err);
      toast.error('فشل فك ضغط الملف: ' + (err.message || 'الملف تالف'), { id: 'zip-toast' });
    } finally {
      setIsUnzipping(false);
    }
  };

  const readFileAsDataUrl = (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleLoadSample = (sample: SampleManga) => {
    const newPage: MangaPageItem = {
      id: `sample-${Date.now()}`,
      fileName: `${sample.title}.jpg`,
      previewUrl: sample.fullImage,
      status: 'pending',
      items: sample.sampleBubbles,
    };
    onAddPages([newPage]);
    toast.success(`تم تحميل نموذج: ${sample.title}`);
  };

  return (
    <div className="space-y-6">
      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files && processFiles(e.target.files)}
      />
      <input
        ref={zipInputRef}
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed"
        className="hidden"
        onChange={(e) => e.target.files && processFiles(e.target.files)}
      />

      {/* Main Upload Drop Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-3xl transition-all duration-300 overflow-hidden ${
          isDragging
            ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 scale-[1.005]'
            : 'border-border/80 bg-muted/20 hover:border-orange-400/80 hover:bg-orange-50/20 dark:hover:bg-zinc-900/40'
        }`}
      >
        <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[260px]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shadow-sm">
              <Upload className="w-7 h-7 stroke-[2.2]" />
            </div>
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-sm">
              <Archive className="w-7 h-7 stroke-[2.2]" />
            </div>
          </div>

          <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground mb-2">
            رفع عدة صفحات أو أرشيف ZIP كامل
          </h3>
          <p className="text-sm text-muted-foreground max-w-lg mb-6">
            اسحب وأفلت مجلد الفصل المضغوط (.zip) أو مجموعة من صور المانجا المُرتبة ليتم معالجتها واستخراج نصوصها تباعاً.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-md shadow-orange-600/20 px-6 h-11 rounded-xl"
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              اختيار صور متعددة
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => zipInputRef.current?.click()}
              disabled={isUnzipping}
              className="border-orange-500/30 hover:bg-orange-500/10 text-foreground font-bold px-6 h-11 rounded-xl"
            >
              <Archive className="w-4 h-4 mr-2 text-amber-600" />
              {isUnzipping ? 'جاري فك الضغط...' : 'رفع ملف ZIP مضغوط'}
            </Button>
          </div>

          {/* Quick Demo Samples */}
          {pages.length === 0 && (
            <div className="mt-8 pt-6 border-t border-border/50 w-full max-w-lg">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                أو جرب أحد النماذج الجاهزة:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {SAMPLE_MANGA_PAGES.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => handleLoadSample(sample)}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-border bg-card/80 hover:bg-accent/70 hover:border-orange-500/50 transition-all text-left group"
                  >
                    <img
                      src={sample.thumbnail}
                      alt={sample.title}
                      className="w-12 h-12 rounded-lg object-cover border border-border group-hover:scale-105 transition-transform"
                    />
                    <div className="truncate text-right w-full">
                      <p className="text-xs font-bold text-foreground truncate">{sample.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{sample.genre}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pages Queue Preview Grid */}
      {pages.length > 0 && (
        <Card className="rounded-3xl border-border shadow-sm overflow-hidden">
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-orange-500" />
                <h4 className="font-extrabold text-base text-foreground">
                  الصفحات المُجهزة للترجمة ({pages.length} صفحة)
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl text-xs"
                >
                  + إضافة صور أخرى
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearAll}
                  className="text-xs text-destructive hover:bg-destructive/10 rounded-xl"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  إفراغ الكل
                </Button>
              </div>
            </div>

            {/* Thumbnail Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-80 overflow-y-auto p-1">
              {pages.map((p, index) => (
                <div
                  key={p.id}
                  className="relative group rounded-2xl overflow-hidden border border-border bg-card shadow-sm flex flex-col"
                >
                  <div className="aspect-[3/4] relative bg-zinc-950/10">
                    <img
                      src={p.previewUrl}
                      alt={p.fileName}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-1.5 left-1.5 bg-black/75 backdrop-blur-md text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                      #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemovePage(p.id)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-600/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="p-1.5 bg-muted/40 text-center">
                    <p className="text-[11px] font-medium text-foreground truncate" title={p.fileName}>
                      {p.fileName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings & Execution Control Card */}
      <Card className="rounded-3xl border-border shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <Sliders className="w-4 h-4 text-orange-500" />
            <h3 className="font-bold text-base text-foreground">إعدادات التحليل والتايبر</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Target Language */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                لغة الترجمة المستهدفة
              </Label>
              <Select
                value={config.targetLanguage}
                onValueChange={(val) => onConfigChange({ targetLanguage: val })}
              >
                <SelectTrigger className="h-11 rounded-xl font-medium">
                  <SelectValue placeholder="اختر لغة الترجمة" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {TARGET_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code} className="font-medium">
                      <span className="mr-2 text-base">{lang.flag}</span>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                تحديد اللغة يضبط تلقائياً اتجاه الكتابة (RTL للعربية / LTR للغات الأخرى).
              </p>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center space-x-3 space-x-reverse p-2.5 rounded-xl bg-muted/40 border border-border/60 hover:bg-muted/60 transition-colors">
                <Checkbox
                  id="extract-sfx"
                  checked={config.extractSFX}
                  onCheckedChange={(checked) => onConfigChange({ extractSFX: !!checked })}
                  className="data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600 rounded-md"
                />
                <div className="grid gap-0.5 leading-none cursor-pointer pr-2" onClick={() => onConfigChange({ extractSFX: !config.extractSFX })}>
                  <Label htmlFor="extract-sfx" className="text-sm font-semibold cursor-pointer flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-orange-500" />
                    استخراج المؤثرات الصوتية (SFX) وترجمتها
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    إرفاق كود التايبر (SFX:) تلقائياً أمام أصوات الضربات والمؤثرات.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 space-x-reverse p-2.5 rounded-xl bg-muted/40 border border-border/60 hover:bg-muted/60 transition-colors">
                <Checkbox
                  id="vertical-text"
                  checked={config.detectVerticalText}
                  onCheckedChange={(checked) => onConfigChange({ detectVerticalText: !!checked })}
                  className="data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600 rounded-md"
                />
                <div className="grid gap-0.5 leading-none cursor-pointer pr-2" onClick={() => onConfigChange({ detectVerticalText: !config.detectVerticalText })}>
                  <Label htmlFor="vertical-text" className="text-sm font-semibold cursor-pointer flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    التعرف على النصوص العمودية والمانجا اليابانية
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    يدعم قراءة تسلسل فقرات المانجا الكلاسيكية من اليمين إلى اليسار.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-6 pt-5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-orange-500 shrink-0" />
              <span>يتم إرسال الصور تسلسلياً (Sequential Queue) لتجنب تجاوز حد الـ Rate Limit لـ Gemini</span>
            </div>

            <Button
              type="button"
              disabled={pages.length === 0 || isAnalyzing}
              onClick={onAnalyzeAll}
              className="w-full sm:w-auto px-8 h-12 rounded-xl font-extrabold text-base bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-lg shadow-orange-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  جاري التحليل...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  تحليل وترجمة كل الصفحات ({pages.length})
                  <ArrowRight className="w-4 h-4 mr-1" />
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};