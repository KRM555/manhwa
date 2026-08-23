import React, { useState } from 'react';
import { Eye, Edit3, Download, ArrowRight, Layers, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ResultsViewProps {
  pages: any[];
  activePageIndex: number;
  setActivePageIndex: (index: number) => void;
  onReset: () => void;
  onUpdateBubble: (pageId: string, bubbleId: string, text: string, category: string) => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  pages,
  activePageIndex,
  setActivePageIndex,
  onReset,
  onUpdateBubble,
}) => {
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  const [copied, setCopied] = useState(false);
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

  const copyCurrentPageTxt = () => {
    if (!currentPage) return;
    let content = '';
    currentPage.bubbles?.forEach((b: any) => {
      content += `${b.translatedText}\n`;
    });
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success('تم نسخ نصوص الصفحة الحالية للتايبر!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!currentPage) return null;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-90px)] gap-4">
      {/* Top Action Control Toolbar */}
      <div className="flex items-center justify-between p-3.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg">
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-xl border border-slate-700 transition-all"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رفع صور جديدة</span>
        </button>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode('editor')}
            className={`flex items-center gap-2 text-xs px-4 py-2 rounded-lg font-bold transition-all ${
              viewMode === 'editor'
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>محرر التايبر (Editor)</span>
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`flex items-center gap-2 text-xs px-4 py-2 rounded-lg font-bold transition-all ${
              viewMode === 'preview'
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>معاينة مكبرة (Live Preview)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyCurrentPageTxt}
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-orange-400" />}
            <span>نسخ الصفحة الحالية</span>
          </button>

          <button
            onClick={handleExportTxt}
            className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/20 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>تصدير الكل (TXT)</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Workspace Layout */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        
        {/* Pages Sidebar list */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col gap-3 overflow-y-auto">
          <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
            <Layers className="w-4 h-4 text-orange-400" />
            <span>الصفحات ({pages.length})</span>
          </div>
          {pages.map((p, idx) => (
            <button
              key={p.id || idx}
              onClick={() => setActivePageIndex(idx)}
              className={`relative rounded-xl overflow-hidden border transition-all text-right p-1.5 flex flex-col gap-1.5 ${
                activePageIndex === idx
                  ? 'border-orange-500 bg-orange-500/10 shadow-md shadow-orange-500/10'
                  : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
              }`}
            >
              <img src={p.imageUrl} alt={`Page ${idx + 1}`} className="w-full h-24 object-cover rounded-lg" />
              <div className="flex justify-between items-center px-1">
                <span className="text-[11px] font-bold text-slate-300">صفحة {idx + 1}</span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                  {p.bubbles?.length || 0} نص
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Dynamic Main Stage */}
        <div className="col-span-10 flex gap-4 h-full min-h-0">
          {viewMode === 'editor' ? (
            <>
              {/* Image Preview Container (Large View) */}
              <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-center overflow-hidden relative shadow-xl">
                <img
                  src={currentPage.imageUrl}
                  alt="Manga Page"
                  className="max-h-full w-auto object-contain rounded-xl shadow-2xl border border-slate-800/80"
                />
              </div>

              {/* Text Translation Bubbles Editor Column */}
              <div className="w-[450px] bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 overflow-y-auto shadow-xl">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-sm text-slate-200">محرر فقرات الصفحة ({currentPage.bubbles?.length || 0})</h3>
                </div>

                <div className="space-y-3">
                  {currentPage.bubbles?.map((bubble: any, bIdx: number) => (
                    <div
                      key={bubble.id || bIdx}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 shadow-inner hover:border-slate-700 transition-all"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-mono font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">
                          #{bIdx + 1} [{bubble.category || 'dialogue'}]
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">Original</span>
                      </div>

                      <div className="text-xs text-slate-400 font-mono bg-slate-900/80 p-2 rounded-lg border border-slate-800/60 leading-relaxed">
                        {bubble.originalText}
                      </div>

                      <textarea
                        value={bubble.translatedText}
                        onChange={(e) => onUpdateBubble(currentPage.id, bubble.id, e.target.value, bubble.category)}
                        rows={3}
                        className="w-full p-2.5 text-xs border border-slate-700 rounded-lg bg-slate-900 text-slate-100 font-mono focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none resize-y leading-relaxed"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Full Live Preview Mode */
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex gap-8 overflow-y-auto shadow-xl">
              <div className="flex-1 flex justify-center items-start bg-slate-950 rounded-xl p-4 border border-slate-800">
                <img src={currentPage.imageUrl} alt="Preview" className="max-h-[80vh] w-auto object-contain rounded-lg shadow-2xl" />
              </div>
              <div className="w-[500px] space-y-4">
                <h3 className="font-bold text-base border-b border-slate-800 pb-3 text-orange-400">
                  النص النهائي الجاهز للتايبر (Page {activePageIndex + 1})
                </h3>
                <div className="space-y-3 font-mono text-xs">
                  {currentPage.bubbles?.map((b: any, idx: number) => (
                    <div key={b.id || idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 shadow-inner">
                      <div className="text-[10px] text-orange-400/80 font-bold">Bubble #{idx + 1}</div>
                      <div className="text-sm font-bold text-slate-100 leading-relaxed select-all">{b.translatedText}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};