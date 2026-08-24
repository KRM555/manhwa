import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, Sparkles, X, CheckCircle2, Sliders, Volume2, FileText, ArrowRight } from 'lucide-react';
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
import { TranslationConfig, SampleManga } from '@/types/manga';
import { toast } from 'sonner';

interface UploadZoneProps {
  imagePreview: string | null;
  fileName: string | null;
  config: TranslationConfig;
  isAnalyzing: boolean;
  onImageSelected: (url: string, name: string, sampleData?: SampleManga) => void;
  onClearImage: () => void;
  onConfigChange: (updated: Partial<TranslationConfig>) => void;
  onAnalyze: () => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  imagePreview,
  fileName,
  config,
  isAnalyzing,
  onImageSelected,
  onClearImage,
  onConfigChange,
  onAnalyze,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      onImageSelected(url, file.name);
      toast.success(`Loaded image: ${file.name}`);
    };
    reader.readAsDataURL(file);
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
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Upload Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-3xl transition-all duration-300 overflow-hidden ${
          isDragging
            ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 scale-[1.005]'
            : imagePreview
            ? 'border-primary/30 bg-card shadow-sm'
            : 'border-border/80 bg-muted/20 hover:border-orange-400/80 hover:bg-orange-50/20 dark:hover:bg-zinc-900/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInputChange}
        />

        {!imagePreview ? (
          <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
              <Upload className="w-8 h-8 stroke-[2.2]" />
            </div>

            <h3 className="text-xl font-bold tracking-tight text-foreground mb-2">
              Drag & Drop your Manga / Manhwa page
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Supports Japanese Manga, Korean Manhwa, Chinese Manhua, or raw scans (PNG, JPG, WEBP).
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-md shadow-orange-600/20 px-6 h-11 rounded-xl"
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Upload Image
              </Button>
            </div>

            {/* Quick Demo Samples */}
            <div className="mt-8 pt-6 border-t border-border/50 w-full max-w-lg">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Or try a sample page:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {SAMPLE_MANGA_PAGES.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => {
                      onImageSelected(sample.fullImage, sample.title, sample);
                      toast.success(`Loaded sample: ${sample.title}`);
                    }}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-border bg-card/80 hover:bg-accent/70 hover:border-orange-500/50 transition-all text-left group"
                  >
                    <img
                      src={sample.thumbnail}
                      alt={sample.title}
                      className="w-12 h-12 rounded-lg object-cover border border-border group-hover:scale-105 transition-transform"
                    />
                    <div className="truncate">
                      <p className="text-xs font-bold text-foreground truncate">{sample.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{sample.genre}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
              <div className="flex items-center gap-3 truncate">
                <div className="w-9 h-9 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <p className="text-sm font-bold text-foreground truncate">{fileName || 'Selected Image'}</p>
                  <p className="text-xs text-muted-foreground">Ready for OCR detection and translation</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs rounded-lg"
                >
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onClearImage}
                  className="text-muted-foreground hover:text-destructive rounded-lg h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Preview image */}
            <div className="relative rounded-2xl overflow-hidden bg-zinc-950/5 dark:bg-zinc-900 border border-border max-h-[380px] flex items-center justify-center p-2">
              <img
                src={imagePreview}
                alt="Manga Preview"
                className="max-h-[360px] w-auto object-contain rounded-xl shadow-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Options Controls Section */}
      <Card className="rounded-2xl border-border shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <Sliders className="w-4 h-4 text-orange-500" />
            <h3 className="font-bold text-base text-foreground">Translation & Extraction Controls</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Target Language Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Target Language
              </Label>
              <Select
                value={config.targetLanguage}
                onValueChange={(val) => onConfigChange({ targetLanguage: val })}
              >
                <SelectTrigger className="h-11 rounded-xl font-medium">
                  <SelectValue placeholder="Select target language" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {TARGET_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code} className="font-medium">
                      <span className="mr-2 text-base">{lang.flag}</span>
                      {lang.name} {lang.code === 'ar' ? '(Default)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Manga text will be cleared and replaced with this language.
              </p>
            </div>

            {/* SFX and OCR Toggles */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center space-x-3 p-2.5 rounded-xl bg-muted/40 border border-border/60 hover:bg-muted/60 transition-colors">
                <Checkbox
                  id="extract-sfx"
                  checked={config.extractSFX}
                  onCheckedChange={(checked) => onConfigChange({ extractSFX: !!checked })}
                  className="data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600 rounded-md"
                />
                <div className="grid gap-0.5 leading-none cursor-pointer" onClick={() => onConfigChange({ extractSFX: !config.extractSFX })}>
                  <Label
                    htmlFor="extract-sfx"
                    className="text-sm font-semibold cursor-pointer flex items-center gap-1.5"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-orange-500" />
                    Extract Sound Effects (SFX)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Translates onomatopoeia (e.g. ドドド, 쾅, BOOM) alongside speech bubbles.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-2.5 rounded-xl bg-muted/40 border border-border/60 hover:bg-muted/60 transition-colors">
                <Checkbox
                  id="vertical-text"
                  checked={config.detectVerticalText}
                  onCheckedChange={(checked) => onConfigChange({ detectVerticalText: !!checked })}
                  className="data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600 rounded-md"
                />
                <div className="grid gap-0.5 leading-none cursor-pointer" onClick={() => onConfigChange({ detectVerticalText: !config.detectVerticalText })}>
                  <Label
                    htmlFor="vertical-text"
                    className="text-sm font-semibold cursor-pointer flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    Vertical Text & Right-to-Left Auto Detect
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically scans vertical Japanese manga reading flow.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Prominent Analyze Button */}
          <div className="mt-6 pt-5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-orange-500 shrink-0" />
              <span>Processes OCR, Text Inpainting & Translation in a single step</span>
            </div>

            <Button
              type="button"
              disabled={!imagePreview || isAnalyzing}
              onClick={onAnalyze}
              className="w-full sm:w-auto px-8 h-12 rounded-xl font-bold text-base bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-lg shadow-orange-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Analyzing Page...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Analyze Image
                  <ArrowRight className="w-4 h-4 ml-1" />
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};