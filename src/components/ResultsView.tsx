import React, { useState } from 'react';
import { Eye, Edit3, Download, ArrowRight, FileText } from 'lucide-react';

interface ResultsViewProps {
  pages: any[];
  activePageIndex: number;
  setActivePageIndex: (index: number) => void;
  onReset: () => void;
  onUpdateBubble: (pageId: string, bubbleId: string, text: string, category: string) => void;
  uiLang?: string;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  pages,
  activePageIndex,
  setActivePageIndex,
  onReset,
  onUpdateBubble,
}) => {
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  const currentPage = pages[activePageIndex];

  const handleExportTxt = () => {
    let content = '';
    pages.forEach((page, pIdx) => {
      content += `=== Page ${pIdx + 1} ===\n`;
      page.bubbles?.forEach((b: any) => {
        content += `${b.translatedText}\n`;
      });
      content += '\n';
    });
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `typer_translation_${Date.now()}.txt`;
    link.click();
  };

  if (!currentPage) return null;

  return (
    <div className="space-y-6">
      {/* Top Bar Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-sm">
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 font-medium"
        >
          <ArrowRight className="w-4 h-4" />
          <span>الصور / الرفع</span>
        </button>

        {/* View Switcher: Editor vs Live Preview */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('editor')}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
              viewMode === 'editor'
                ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>محرر النصوص</span>
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
              viewMode === 'preview'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>وضع المعاينة (Preview)</span>
          </button>
        </div>

        <button
          onClick={handleExportTxt}
          className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          <span>تصدير TXT</span>
        </button>
      </div>

      {/* Pages Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {pages.map((p, idx) => (
          <button
            key={p.id || idx}
            onClick={() => setActivePageIndex(idx)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              activePageIndex === idx
                ? 'bg-orange-500 text-white border-orange-600 shadow-sm'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            Page {idx + 1}
          </button>
        ))}
      </div>

      {/* Main Mode View */}
      {viewMode === 'editor' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 p-4 border dark:border-slate-700 rounded-xl shadow-sm flex items-center justify-center">
            <img src={currentPage.imageUrl} alt="Manga" className="max-h-[650px] object-contain rounded-lg" />
          </div>

          <div className="space-y-4 max-h-[650px] overflow-y-auto pr-1">
            {currentPage.bubbles?.map((bubble: any) => (
              <div key={bubble.id} className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-4 shadow-sm space-y-2">
                <span className="text-xs font-bold text-orange-500">[{bubble.category || 'نص'}]</span>
                <div className="text-xs text-slate-400 font-mono bg-slate-50 dark:bg-slate-900 p-2 rounded">{bubble.originalText}</div>
                <textarea
                  value={bubble.translatedText}
                  onChange={(e) => onUpdateBubble(currentPage.id, bubble.id, e.target.value, bubble.category)}
                  rows={2}
                  className="w-full p-2 text-sm border dark:border-slate-600 rounded bg-white dark:bg-slate-900 dark:text-white focus:ring-1 focus:ring-orange-500 outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Preview Mode */
        <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-6 shadow-sm flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/2 flex justify-center">
            <img src={currentPage.imageUrl} alt="Preview" className="max-h-[700px] object-contain rounded-lg border dark:border-slate-700" />
          </div>
          <div className="w-full md:w-1/2 space-y-4">
            <h3 className="font-bold text-lg border-b pb-2 dark:border-slate-700 flex items-center gap-2 dark:text-white">
              <FileText className="w-5 h-5 text-orange-500" />
              <span>معاينة نصوص الصفحة (Page {activePageIndex + 1})</span>
            </h3>
            <div className="space-y-3 font-sans text-sm">
              {currentPage.bubbles?.map((b: any, idx: number) => (
                <div key={b.id || idx} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 space-y-1">
                  <span className="text-xs font-bold text-orange-500">#{idx + 1} [{b.category}]</span>
                  <div className="font-mono text-base font-medium text-slate-800 dark:text-slate-100">{b.translatedText}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};