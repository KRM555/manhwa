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
  { id: '1', name: 'حوار', prefix: '', categoryKey: 'dialogue' },
  { id: '2', name: 'أفكار', prefix: '()', categoryKey: 'thought' },
  { id: '3', name: 'صراخ', prefix: '::', categoryKey: 'scream' },
  { id: '4', name: 'مؤثرات', prefix: 'SFX:', categoryKey: 'sfx' },
  { id: '5', name: 'نظام', prefix: '[]', categoryKey: 'system' },
  { id: '6', name: 'كلام خارجي', prefix: 'OT:', categoryKey: 'narrator' },
];

// نصوص واجهة المستخدم باللغتين العربية والإنجليزية
const uiTranslations = {
  ar: {
    title: "مترجم المانوا والتأثير الاحترافي",
    subtitle: "منصة التنضيد واستخراج النصوص الذكية لـ Photoshop",
    tagsBtn: "تعديل علامات التايبير",
    apiKeyLabel: "Gemini API Key:",
    apiKeyLink: "احصل على مفتاح مجاني من هنا ↗",
    apiKeyPlaceholder: "ضع الـ API Key الخاص بك هنا...",
    targetLangLabel: "لغة الترجمة المطلوبة:",
    ocrOnly: "استخراج النص الأصلي فقط (OCR Mode - بدون ترجمة)",
    dropzoneTitle: "اسحب الملفات هنا أو انقر للاختيار",
    dropzoneSubtitle: "يدعم ملفات ZIP المضغوطة أو تحديد صور متعددة معا (JPG, PNG, WEBP)",
  },
  en: {
    title: "Manga & Webtoon Translator Pro",
    subtitle: "Smart Typesetting & Text Extraction Platform for Photoshop",
    tagsBtn: "Edit Typer Tags",
    apiKeyLabel: "Gemini API Key:",
    apiKeyLink: "Get a free API Key here ↗",
    apiKeyPlaceholder: "Enter your API Key here...",
    targetLangLabel: "Target Translation Language:",
    ocrOnly: "Extract Original Text Only (OCR Mode - No Translation)",
    dropzoneTitle: "Drag & drop files here, or click to select",
    dropzoneSubtitle: "Supports ZIP archives or multiple images (JPG, PNG, WEBP)",
  }
};

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
  const [uiLang, setUiLang] = useState<'ar' | 'en'>('ar');

  // Typer Tags Settings State
  const [typerRules, setTyperRules] = useState<TyperRule[]>(() => {
    const saved = localStorage.getItem('typer_rules');
    return saved ? JSON.parse(saved) : DEFAULT_RULES;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Save API Key to localStorage
  useEffect(() => {
    localStorage.setItem('gemini_api_key', apiKey);
  }, [apiKey]);

  // Save Typer Rules to localStorage
  const handleSaveRules = () => {
    localStorage.setItem('typer_rules', JSON.stringify(typerRules));
    toast.success('تم حفظ إعدادات علامات التايبير بنجاح!');
    setIsSettingsOpen(false);
  };

  const handleAddRule = () => {
    const newRule: TyperRule = {
      id: Date.now().toString(),
      name: 'قاعدة جديدة',
      prefix: '',
      categoryKey: 'custom_' + Date.now(),
    };
    setTyperRules([...typerRules, newRule]);
  };

  const handleDeleteRule = (id: string) => {
    setTyperRules(typerRules.filter(r => r.id !== id));
  };

  const handleUpdateRule = (id: string, field: keyof TyperRule, value: string) => {
    setTyperRules(typerRules.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-300 font-sans`}>
      
      {/* Header Bar */}
      <header className="flex items-center justify-between p-4 bg-slate-900/60 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {/* UI Language Switcher */}
          <button
            onClick={() => setUiLang(uiLang === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:text-orange-400 text-xs font-bold transition-all shadow-sm"
          >
            <Globe className="w-4 h-4 text-orange-400" />
            <span>{uiLang === 'ar' ? 'English (EN)' : 'العربية (AR)'}</span>
          </button>

          {/* Edit Typer Tags Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white text-xs font-medium transition-all"
          >
            <Settings2 className="w-4 h-4 text-slate-400" />
            <span>{uiTranslations[uiLang].tagsBtn}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-400 hover:text-amber-400 transition-all"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span className="bg-orange-500/20 text-orange-400 text-[10px] px-2 py-0.5 rounded-full border border-orange-500/30 font-mono">v2.0 PRO</span>
              {uiTranslations[uiLang].title}
            </h1>
            <p className="text-xs text-slate-400">{uiTranslations[uiLang].subtitle}</p>
          </div>
          <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg shadow-orange-500/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto p-6 space-y-6" dir={uiLang === 'ar' ? 'rtl' : 'ltr'}>
        
        {view === 'upload' ? (
          <>
            {/* Control Panel Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                
                {/* API Key Section */}
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold flex items-center gap-2 text-slate-200">
                      <KeyRound className="w-4 h-4 text-orange-400" />
                      {uiTranslations[uiLang].apiKeyLabel}
                    </label>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-orange-400 hover:text-orange-300 underline font-medium"
                    >
                      {uiTranslations[uiLang].apiKeyLink}
                    </a>
                  </div>
                  <input
                    type="password"
                    className="w-full p-3.5 text-sm border border-slate-700 rounded-xl bg-slate-950/80 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 font-mono transition-all text-left"
                    dir="ltr"
                    placeholder={uiTranslations[uiLang].apiKeyPlaceholder}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>

                {/* Target Language Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center gap-2 text-slate-200">
                    <Globe className="w-4 h-4 text-orange-400" />
                    {uiTranslations[uiLang].targetLangLabel}
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
                    {uiTranslations[uiLang].ocrOnly}
                  </span>
                </label>
              </div>
            </div>

            {/* Drag & Drop Upload Zone */}
            <UploadZone
              apiKey={apiKey}
              targetLang={targetLang}
              isOcrOnly={isOcrOnly}
              typerRules={typerRules}
              onPagesLoaded={(loadedPages) => {
                setPages(loadedPages);
                setView('results');
              }}
            />
          </>
        ) : (
          <ResultsView
            pages={pages}
            setPages={setPages}
            activePageIndex={activePageIndex}
            setActivePageIndex={setActivePageIndex}
            onBack={() => setView('upload')}
            typerRules={typerRules}
          />
        )}
      </main>

      {/* Typer Tags Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2 text-slate-100 font-bold text-base">
                <Sparkles className="w-5 h-5 text-orange-400" />
                <span>إعدادات علامات التنضيد (Typer Rules)</span>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <p className="text-xs text-slate-400 leading-relaxed">
                قم بتحديد العلامة البادئة (Prefix) لكل نوع نص ليتم إضافتها تلقائياً عند النسخ لبرنامج الفوتوشوب.
              </p>

              <div className="space-y-3">
                {typerRules.map((rule) => (
                  <div key={rule.id} className="flex items-center gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    <input
                      type="text"
                      className="flex-1 p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-orange-500 font-medium"
                      placeholder="اسم النوع (مثال: حوار)"
                      value={rule.name}
                      onChange={(e) => handleUpdateRule(rule.id, 'name', e.target.value)}
                    />
                    <input
                      type="text"
                      className="w-32 p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-orange-400 font-mono text-center focus:outline-none focus:border-orange-500"
                      placeholder="البادئة (Prefix)"
                      value={rule.prefix}
                      onChange={(e) => handleUpdateRule(rule.id, 'prefix', e.target.value)}
                    />
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddRule}
                className="w-full py-2.5 border border-dashed border-slate-700 hover:border-orange-500/50 rounded-xl text-xs font-semibold text-slate-400 hover:text-orange-400 flex items-center justify-center gap-2 transition-all bg-slate-950/40"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة نوع جديد</span>
              </button>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-3">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveRules}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all hover:opacity-90"
              >
                <Save className="w-4 h-4" />
                <span>حفظ التغييرات</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}