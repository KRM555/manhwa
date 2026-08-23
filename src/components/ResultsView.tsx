import React from 'react';
import { MangaPageItem, DetectedBubble } from '@/types/manga';
import { TyperItemCard } from '@/components/TyperItemCard';
import {
  ArrowLeft,
  Download,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  Copy,
  Info,
  FileDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ResultsViewProps {
  pages: MangaPageItem[];
  activePageIndex: number;
  selectedLangObj?: { code: string; name: string; flag: string; rtl: boolean };
  isRTL: boolean;
  isExportingDocx: boolean;
  onBackToUpload: () => void;
  onSelectPageIndex: (index: number) => void;
  onExportDocx: () => void;
  onExportTxt: () => void;
  onUpdateItem: (pageIdx: number, itemId: string, field: keyof DetectedBubble, value: string) => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  pages,
  activePageIndex,
  selectedLangObj,
  isRTL,
  isExportingDocx,
  onBackToUpload,
  onSelectPageIndex,
  onExportDocx,
  onExportTxt,
  onUpdateItem,
}) => {
  const currentPage = pages[activePageIndex] || pages[0];

  const handleCopyPageText = (page: MangaPageItem) => {
    const text = (page.items || []).map((it) => it.translatedText).join('\n');
    navigator.clipboard.writeText(text);
    toast.success(`تم نسخ نصوص الصفحة ${page.fileName} إلى الحافظة!`);
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card p-4 rounded-3xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onBackToUpload} className="rounded-xl text-xs font-bold gap-2">
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
            onClick={onExportDocx}
            className="border-blue-600/30 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-bold text-xs rounded-xl gap-2 h-9"
          >
            <FileDown className="w-4 h-4" />
            {isExportingDocx ? 'جاري التوليد...' : 'تصدير Word (.docx)'}
          </Button>

          <Button
            onClick={onExportTxt}
            className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-orange-600/20 gap-2 h-9"
          >
            <Download className="w-4 h-4" />
            تصدير سكريبت التايبر (.txt)
          </Button>
        </div>
      </div>

      {/* Pages selector ribbon */}
      <div className="flex items-center gap-2 overflow-x-auto p-2 bg-muted/40 rounded-2xl border border-border">
        <span className="text-xs font-bold text-muted-foreground shrink-0 px-2">الصفحات:</span>
        {pages.map((p, idx) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelectPageIndex(idx)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
              idx === activePageIndex
                ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                : 'bg-card hover:bg-accent text-muted-foreground border-border'
            }`}
          >
            <span>صفحة #{idx + 1}</span>
            {p.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
            {p.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
          </button>
        ))}
      </div>

      {/* Main Grid */}
      {currentPage && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Manga Image Viewer */}
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
                  onClick={() => onSelectPageIndex(Math.max(0, activePageIndex - 1))}
                  className="h-8 w-8 rounded-lg"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={activePageIndex === pages.length - 1}
                  onClick={() => onSelectPageIndex(Math.min(pages.length - 1, activePageIndex + 1))}
                  className="h-8 w-8 rounded-lg"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <CardContent className="p-4 flex items-center justify-center bg-zinc-950/5 dark:bg-zinc-900/50 min-h-[480px]">
              <img
                src={currentPage.previewUrl}
                alt={currentPage.fileName}
                className="max-h-[640px] w-auto object-contain rounded-xl shadow-md"
              />
            </CardContent>
          </Card>

          {/* Right Column: Bubble / Typer Cards */}
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

            {/* Quick Typer Legend */}
            <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-xs text-muted-foreground flex flex-wrap items-center gap-1.5">
              <Info className="w-4 h-4 text-orange-500 shrink-0" />
              <span className="font-bold text-foreground">رموز التايبر:</span>
              <span className="bg-background px-1.5 py-0.5 rounded border text-[11px] font-mono">:: للصراخ</span>
              <span className="bg-background px-1.5 py-0.5 rounded border text-[11px] font-mono">() للأفكار</span>
              <span className="bg-background px-1.5 py-0.5 rounded border text-[11px] font-mono">"" للحوار</span>
              <span className="bg-background px-1.5 py-0.5 rounded border text-[11px] font-mono">SFX: للمؤثرات</span>
              <span className="bg-background px-1.5 py-0.5 rounded border text-[11px] font-mono">[] للنظام</span>
              <span className="bg-background px-1.5 py-0.5 rounded border text-[11px] font-mono">OT: للراوي</span>
            </div>

            {/* List of items */}
            <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
              {!currentPage.items || currentPage.items.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-2xl border border-border">
                  <p className="text-sm text-muted-foreground">لم يتم العثور على حوارات أو نصوص في هذه الصفحة.</p>
                </div>
              ) : (
                currentPage.items.map((item, idx) => (
                  <TyperItemCard
                    key={item.id}
                    item={item}
                    index={idx}
                    isRTL={isRTL}
                    onUpdate={(field, val) => onUpdateItem(activePageIndex, item.id, field, val)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};