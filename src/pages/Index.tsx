import React, { useState, useEffect } from 'react';
import { UploadZone } from '@/components/UploadZone';
import { ResultsView } from '@/components/ResultsView';
import { toast } from 'sonner';
import { KeyRound, Image as ImageIcon, BookOpen, Settings2, Moon, Sun, Languages, Plus, Trash2, Save, X } from 'lucide-react';

interface TyperRule {
  id: string;
  name: string;
  prefix: string;
  categoryKey: string;
}

const DEFAULT_RULES: TyperRule[] = [
  { id: '1', name: 'حوار', prefix: '""', categoryKey: 'dialogue' },
  { id: '2', name: 'أفكار', prefix: '()', categoryKey: 'thought' },
  { id: '3', name: 'صراخ', prefix: '::', categoryKey: 'scream' },
  { id: '4', name: 'مؤثرات', prefix: 'SFX:', categoryKey: 'sfx' },
  { id: '5', name: 'نظام', prefix: '[]', categoryKey: 'system' },
  { id: '6', name: 'كلام خارجي', prefix: 'OT:', categoryKey: 'narrator' },
];

export default function Index() {
  const [pages, setPages] = useState<any[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [view, setView] = useState<'upload' | 'results'>('upload');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // General Options
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
  const [targetLang, setTargetLang] = useState<'ar' | 'en'>('ar');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Typer Tags Settings State
  const [typerRules, setTyperRules] = useState<TyperRule[]>(() => {
    const saved = localStorage.getItem('custom_typer_rules');
    return saved ? JSON.parse(saved) : DEFAULT_RULES;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleProcessPages = async (uploadedPages: any[]) => {
    if (!apiKey.trim()) {
      toast.error('يرجى إدخال مفتاح Gemini API أولاً');
      return;
    }

    setIsAnalyzing(true);
    localStorage.setItem('gemini_api_key', apiKey.trim());
    setPages(uploadedPages);

    try {
      const updatedPages = [...uploadedPages];
      const categoriesList = typerRules.map((r) => r.categoryKey).join(', ');
      const prefixRulesPrompt = typerRules
        .map((r) => `   - ${r.categoryKey} (${r.name}): Prefix with ${r.prefix}`)
        .join('\n');

      const targetLangInstruction =
        targetLang === 'en'
          ? 'Translate each text block into fluent English capturing tone and context.'
          : 'Translate each text block into fluent Arabic capturing tone and context.';

      const promptText = `You are a professional Manhua/Manga translator assistant.
1. Perform OCR on the image.
2. ${targetLangInstruction}
3. Categorize each text block into: ${categoriesList}
4. Place symbol at VERY BEGINNING of "translatedText":
${prefixRulesPrompt}

Return STRICTLY a raw JSON array:
[{"id": "1", "originalText": "text", "translatedText": "${typerRules[0]?.prefix || ''} translated", "category": "${typerRules[0]?.categoryKey || 'dialogue'"}]`;

      for (let i = 0; i < updatedPages.length; i++) {
        const page = updatedPages[i];
        const base64Data = page.imageUrl.split(',')[1];
        const mimeType = page.imageUrl.split(';')[0].split(':')[1] || 'image/png';

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey.trim(),
            },
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
        if (data.error) throw new Error(data.error.message || 'API Error');

        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedBubbles = JSON.parse(cleanJson);

        updatedPages[i] = {
          ...page,
          bubbles: parsedBubbles,
          status: 'completed',
        };

        setPages([...updatedPages]);
      }

      setView('results');
      toast.success('تم تحليل الصفحات وتطبيق علامات التايبر بنجاح!');
    } catch (err: any) {
      console.error(err);
      toast.error('حدث خطأ: ' + (err.message || 'API Error'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateBubble = (pageId: string, bubbleId: string, updatedText: string, category: string) => {
    setPages((prevPages) =>
      prevPages.map((page) => {
        if (page.id !== pageId) return page;
        return {
          ...page,
          bubbles: page.bubbles.map((b: any) =>
            b.id === bubbleId ? { ...b, translatedText: updatedText, category } : b
          ),
        };
      })
    );
  };

  const saveRulesToStorage = (newRules: TyperRule[]) => {
    setTyperRules(newRules);
    localStorage.setItem('custom_typer_rules', JSON.stringify(newRules));
    toast.success('تم حفظ قواعد علامات التايبر!');
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors" dir="rtl">
      {/* Header Bar */}
      <header className="border-b border-orange-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500 text-white rounded-xl">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none dark:text-white">مترجم المانوا والتايبر الآلي</h1>
            <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">TyperTool Assistant</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Dark Mode Button */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Edit Typer Tags Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 text-sm px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 font-medium"
          >
            <Settings2 className="w-4 h-4 text-orange-500" />
            <span>تعديل علامات التايبر</span>
          </button>
        </div>
      </header>

      {/* Main Area */}
      <main className="flex-1 container mx-auto py-8 px-4 max-w-4xl">
        {view === 'upload' ? (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 border border-orange-200 dark:border-slate-700 rounded-xl p-5 shadow-sm space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2 dark:text-white">
                  <KeyRound className="w-4 h-4 text-orange-500" />
                  Gemini API Key:
                </label>
                <input
                  type="password"
                  className="w-full p-3 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                  placeholder="ضع الـ API Key الخاص بك هنا..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>

              {/* Target Translation Language Selector */}
              <div className="flex items-center justify-between border-t dark:border-slate-700 pt-3">
                <label className="text-sm font-bold dark:text-white">لغة الترجمة المطلوبة:</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTargetLang('ar')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                      targetLang === 'ar' ? 'bg-orange-500 text-white' : 'bg-slate-50 dark:bg-slate-700'
                    }`}
                  >
                    العربية (Arabic)
                  </button>
                  <button
                    onClick={() => setTargetLang('en')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                      targetLang === 'en' ? 'bg-orange-500 text-white' : 'bg-slate-50 dark:bg-slate-700'
                    }`}
                  >
                    English (الإنجليزية)
                  </button>
                </div>
              </div>
            </div>

            <UploadZone onStartProcessing={handleProcessPages} isAnalyzing={isAnalyzing} />
          </div>
        ) : (
          <ResultsView
            pages={pages}
            activePageIndex={activePageIndex}
            setActivePageIndex={setActivePageIndex}
            onReset={() => setView('upload')}
            onUpdateBubble={handleUpdateBubble}
          />
        )}
      </main>

      {/* Embedded Tag Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center border-b pb-2 dark:border-slate-700">
              <h3 className="font-bold dark:text-white">تعديل علامات التايبر (Typer Tags)</h3>
              <button onClick={() => setIsSettingsOpen(false)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {typerRules.map((rule, idx) => (
                <div key={rule.id} className="flex gap-2 items-center">
                  <input
                    value={rule.name}
                    onChange={(e) => {
                      const updated = [...typerRules];
                      updated[idx].name = e.target.value;
                      setTyperRules(updated);
                    }}
                    className="p-1.5 border rounded text-xs w-1/2 dark:bg-slate-700 dark:text-white"
                  />
                  <input
                    value={rule.prefix}
                    onChange={(e) => {
                      const updated = [...typerRules];
                      updated[idx].prefix = e.target.value;
                      setTyperRules(updated);
                    }}
                    className="p-1.5 border rounded text-xs w-1/3 font-mono dark:bg-slate-700 dark:text-white"
                  />
                  <button
                    onClick={() => setTyperRules(typerRules.filter((r) => r.id !== rule.id))}
                    className="text-red-500 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() =>
                setTyperRules([
                  ...typerRules,
                  { id: Date.now().toString(), name: 'تصنيف جديد', prefix: 'TAG:', categoryKey: `custom_${Date.now()}` },
                ])
              }
              className="w-full py-1.5 border border-dashed border-orange-400 text-orange-500 rounded text-xs font-bold flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" /> إضافة تصنيف
            </button>
            <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-700">
              <button
                onClick={() => {
                  saveRulesToStorage(typerRules);
                  setIsSettingsOpen(false);
                }}
                className="px-4 py-1.5 bg-orange-500 text-white rounded text-xs font-bold flex items-center gap-1"
              >
                <Save className="w-4 h-4" /> حفظ القواعد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}