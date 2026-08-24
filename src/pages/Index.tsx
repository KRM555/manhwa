import React, { useState, useEffect } from 'react';
import { UploadZone } from '@/components/UploadZone';
import { ResultsView } from '@/components/ResultsView';
import { toast } from 'sonner';
import { KeyRound, BookOpen, Settings2, Moon, Sun, Plus, Trash2, Save, X, Sparkles, Globe } from 'lucide-react';

interface TyperRule {
  id: string;
  name: string;
  prefix: string;
  categoryKey: string;
}

const DEFAULT_RULES: TyperRule[] = [
  { id: '1', name: 'حوار', prefix: '""', categoryKey: 'dialogue' },
  { id: '2', name: 'أفكار', prefix: '():', categoryKey: 'thought' },
  { id: '3', name: 'صراخ', prefix: '::', categoryKey: 'scream' },
  { id: '4', name: 'مؤثرات', prefix: 'SFX:', categoryKey: 'sfx' },
  { id: '5', name: 'نظام', prefix: '[]:', categoryKey: 'system' },
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
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [isOcrOnly, setIsOcrOnly] = useState<boolean>(false);

  // Typer Tags Settings State
  const [typerRules, setTyperRules] = useState<TyperRule[]>(() => {
    const saved = localStorage.getItem('custom_typer_rules');
    return saved ? JSON.parse(saved) : DEFAULT_RULES;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Dark Mode Toggle
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

      const promptText = isOcrOnly
        ? `You are an expert Manga/Manhua/Manhwa OCR tool.
Extract ONLY raw original text from each bubble/text box without translating it.
Strictly return a raw JSON array of objects format:
[{"id": "1", "originalText": "text", "translatedText": "text", "category": "dialogue"}]`
        : `You are a professional Manhua/Manga/Manhwa translator and typesetter assistant.

1. Perform OCR to extract all visible text.
2. ${targetLangInstruction}
3. Categorize each text block into ONE of these categories: ${categoriesList}

4. CRITICAL FORMATTING RULE FOR TYPERTOOL:
   You MUST prepend the exact Category Prefix strictly at the VERY BEGINNING of the "translatedText" string.
   Do NOT wrap the text or add closing brackets/tags at the end. Only place the prefix at the start.

Examples of correct format:
- System category (prefix "[]:"): "[]: عدد نقاطك 10452 نقطة أتريد الشراء؟"
- Thought category (prefix "():"): "(): هل هذا هو الوحش الذي يلتهم الجميع؟"
- Scream category (prefix "::"): ":: غواااااا!"
- SFX category (prefix "SFX:"): "SFX: خطوات ثقيلة"
- Dialogue category (prefix '""'): '""ما هذا؟ هل هو وحش؟'

Return STRICTLY a raw JSON array of objects:
[{"id": "1", "originalText": "text", "translatedText": "[]: عدد نقاطك 10452", "category": "system"}]`;

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans transition-colors" dir="rtl">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-8 py-3.5 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-orange-600 to-amber-500 text-white rounded-xl shadow-lg shadow-orange-500/20">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight text-white flex items-center gap-2">
              مترجم المانوا والتايبر الاحترافي
              <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full font-mono">v2.0 PRO</span>
            </h1>
            <p className="text-xs text-slate-400">منصة التنضيد واستخراج النصوص الذكية لـ Photoshop</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 transition-all text-amber-400"
            title="تبديل المظهر"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5 text-slate-300" />}
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 font-medium text-slate-200 transition-all shadow-sm"
          >
            <Settings2 className="w-4 h-4 text-orange-400" />
            <span>تعديل علامات التايبر</span>
          </button>
        </div>
      </header>

      {/* Main Full-Width Container */}
      <main className="flex-1 w-full px-6 py-6 flex flex-col">
        {view === 'upload' ? (
          <div className="max-w-6xl mx-auto w-full space-y-6 my-auto">
           {/* Control Panel Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-sm relative overflow-hidden" dir="rtl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                {/* API Key Section */}
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold flex items-center gap-2 text-slate-200">
                      <KeyRound className="w-4 h-4 text-orange-400" />
                      Gemini API Key:
                    </label>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-orange-400 hover:text-orange-300 underline font-medium"
                    >
                      احصل على مفتاح مجاني من هنا ↗
                    </a>
                  </div>
                  <input
                    type="password"
                    className="w-full p-3.5 text-sm border border-slate-700 rounded-xl bg-slate-950/80 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 font-mono transition-all text-left"
                    dir="ltr"
                    placeholder="ضع الـ API Key الخاص بك هنا..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>

                {/* Target Language Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center gap-2 text-slate-200">
                    <Globe className="w-4 h-4 text-orange-400" />
                    لغة الترجمة المطلوبة:
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setTargetLang('ar')}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${
                        targetLang === 'ar'
                          ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      العربية (Arabic)
                    </button>
                    <button
                      onClick={() => setTargetLang('en')}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${
                        targetLang === 'en'
                          ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      English
                    </button>
                  </div>
                </div>
              </div>

              {/* OCR Toggle */}
              <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-start">
                <label className="flex items-center gap-2.5 cursor-pointer select-none text-sm text-slate-300 hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={isOcrOnly}
                    onChange={(e) => setIsOcrOnly(e.target.checked)}
                    className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-orange-400">
                    استخراج النص الأصلي فقط (OCR Mode - بدون ترجمة)
                  </span>
                </label>
              </div>
            </div>

            {/* Upload Zone */}
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-2 shadow-2xl">
              <UploadZone onStartProcessing={handleProcessPages} isAnalyzing={isAnalyzing} />
            </div>
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

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-400" />
                إعدادات علامات التايبر (Typer Tags)
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {typerRules.map((rule, idx) => (
                <div key={rule.id} className="flex gap-2 items-center bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                  <input
                    value={rule.name}
                    onChange={(e) => {
                      const updated = [...typerRules];
                      updated[idx].name = e.target.value;
                      setTyperRules(updated);
                    }}
                    className="p-2 border border-slate-700 rounded-lg text-xs w-1/2 bg-slate-900 text-slate-200"
                    placeholder="اسم التصنيف"
                  />
                  <input
                    value={rule.prefix}
                    onChange={(e) => {
                      const updated = [...typerRules];
                      updated[idx].prefix = e.target.value;
                      setTyperRules(updated);
                    }}
                    className="p-2 border border-slate-700 rounded-lg text-xs w-1/3 font-mono bg-slate-900 text-orange-400 font-bold"
                    placeholder="البادئة (Tag)"
                  />
                  <button
                    onClick={() => setTyperRules(typerRules.filter((r) => r.id !== rule.id))}
                    className="text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
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
              className="w-full py-2.5 border border-dashed border-orange-500/40 text-orange-400 hover:bg-orange-500/10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" /> إضافة تصنيف جديد
            </button>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  saveRulesToStorage(typerRules);
                  setIsSettingsOpen(false);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-orange-500/20"
              >
                <Save className="w-4 h-4" /> حفظ وإغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
