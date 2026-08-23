import React from 'react';
import { MangaPageItem } from '@/types/manga';
import { TyperItemCard } from './TyperItemCard';
import { exportToWord, exportToTxt } from '@/utils/typerHelper';
import { Button } from '@/components/ui/button';
import { FileText, Download, ArrowRight, ArrowLeft } from 'lucide-react';

interface ResultsViewProps {
  pages: MangaPageItem[];
  activePageIndex: number;
  setActivePageIndex: (index: number) => void;
  onReset: () => void;
  onUpdateBubble: (pageId: string, bubbleId: string, updatedText: string, category: string) => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  pages,
  activePageIndex,
  setActivePageIndex,
  onReset,
  onUpdateBubble,
}) => {
  const currentPage = pages[activePageIndex];

  if (!currentPage) return null;

  return (
    <div className="container mx-auto p-4 space-y-6" dir="rtl">
      {/* Header Actions */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <Button variant="outline" onClick={onReset}>
          رفع صور جديدة
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportToTxt(pages)}>
            <FileText className="w-4 h-4 ml-2" />
            تصدير TXT
          </Button>
          <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => exportToWord(pages)}>
            <Download className="w-4 h-4 ml-2" />
            تصدير Word (.docx)
          </Button>
        </div>
      </div>

      {/* Pagination Bar */}
      {pages.length > 1 && (
        <div className="flex items-center justify-center gap-4 bg-muted/40 p-2 rounded-md">
          <Button
            size="sm"
            variant="ghost"
            disabled={activePageIndex === 0}
            onClick={() => setActivePageIndex(activePageIndex - 1)}
          >
            <ArrowRight className="w-4 h-4 ml-1" /> الصفحة السابقة
          </Button>
          <span className="text-sm font-medium">
            صفحة {activePageIndex + 1} من {pages.length} ({currentPage.fileName})
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={activePageIndex === pages.length - 1}
            onClick={() => setActivePageIndex(activePageIndex + 1)}
          >
            الصفحة التالية <ArrowLeft className="w-4 h-4 mr-1" />
          </Button>
        </div>
      )}

      {/* Main Content View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Image Preview */}
        <div className="border rounded-lg overflow-hidden bg-black/5 flex items-center justify-center p-2">
          <img
            src={currentPage.imageUrl}
            alt={currentPage.fileName}
            className="max-h-[75vh] object-contain rounded-md"
          />
        </div>

        {/* Right: Extracted & Formatted Bubbles */}
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
          <h3 className="font-bold text-lg border-b pb-2">
            النصوص المترجمة (صفحة {activePageIndex + 1})
          </h3>
          {currentPage.bubbles.length === 0 ? (
            <p className="text-muted-foreground text-sm">لم يتم اكتشاف أي نصوص في هذه الصفحة.</p>
          ) : (
            currentPage.bubbles.map((bubble) => (
              <TyperItemCard
                key={bubble.id}
                item={bubble}
                onChange={(updatedText, category) =>
                  onUpdateBubble(currentPage.id, bubble.id, updatedText, category)
                }
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};