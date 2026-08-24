import React, { useState } from 'react';
import { UploadZone } from '@/components/UploadZone';
import { TranslationConfig, SampleManga } from '@/types/manga';
import { ArrowLeft, Download, Save, Sparkles, Key, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export interface ExtractedText {
  id: string;
  originalText: string;
  translatedText: string;
  category: string;
}

const CATEGORIES = [
  { value: 'dialogue', label: 'حوار (Dialogue)' },
  { value: 'thought', label: 'أفكار (Thought)' },
  { value: 'scream', label: 'صراخ (Scream)' },
  { value: 'whisper', label: 'همس (Whisper)' },
  { value: 'anger', label: 'غضب (Anger)' },
  { value: 'fear', label: 'خوف (Fear)' },
  { value: 'tension', label: 'توتر (Tension)' },
  { value: 'pleasure', label: 'متعة (Pleasure)' },
  { value: 'monster', label: 'وحش (Monster)' },
  { value: 'system', label: 'نظام (System)' },
  { value: 'phone', label: 'هاتف (Phone)' },
  { value: 'message', label: 'رسالة (Message)' },
  { value: 'sfx', label: 'مؤثر صوتي (SFX)' },
  { value: 'narrator', label: 'راوي (Narrator)' },
  { value: 'other', label: 'أخرى (Other)' },
];

// قائمة الموديلات المرشحة للعمل بالترتيب
const CANDIDATE_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-2.0-flash-lite',
];

export default function Index() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [view, setView] = useState<'upload' | 'results'>('upload');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const [apiKey, setApiKey] = useState<string>(
    import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key') || ''
  );

  const [config, setConfig] = useState<TranslationConfig>({
    targetLanguage: 'ar',
    extractSFX: true,
    detectVerticalText: true,
  });

  const [items, setItems] = useState<ExtractedText[]>([]);

  const handleImageSelected = (url: string, name: string, sampleData?: SampleManga) => {
    setImagePreview(url);
    setFileName(name);

    if (sampleData && (sampleData as any).items) {
      setItems((sampleData as any).items);
    } else {
      setItems([]);
    }
  };

  const handleClearImage = () => {
    setImagePreview(null);
    setFileName(null);
    setItems([]);
  };

  const handleConfigChange = (updated: Partial<TranslationConfig>) => {
    setConfig((prev) => ({ ...prev, ...updated }));
  };

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  // دالة التحليل مع تجربة عدة موديلات تلقائياً
  const handleAnalyze = async () => {
    if (!imagePreview) {
      toast.error('الرجاء اختيار صورة أولاً');
      return;
    }

    if (!apiKey || apiKey.trim() === '') {
      toast.error('يرجى إدخال مفتاح Gemini API Key في أعلى الصفحة أولاً');
      return;
    }

    setIsAnalyzing(true);
    toast.info('جاري الاتصال بـ Gemini واستخرج النصوص...');

    const mimeTypeMatch = imagePreview.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
    const base64Data = imagePreview.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

    const promptText = `
      أنت مترجم مانجا وويب تون محترف وخبير في التعرف الضوئي على الحروف (OCR).
      قم بفحص وتحليل هذه الصورة واستخراج كاااافة النصوص والفقرات بدون استثناء من البداية للنهاية.
      يشمل ذلك: الحوارات داخل الفقاقيع، الأفكار، المؤثرات الصوتية (SFX)، نصوص النظام، والهمس.
      
      تعليمات الهيكلة:
      1. استخرج كافة النصوص بترتيب القراءة البصري (من الأعلى إلى الأسفل).
      2. ترجم كافة النصوص بدقة عالية إلى اللغة العربية.
      3. قم بتصنيف كل فقرة إلى الفئة المناسبة لها (dialogue, thought, scream, whisper, anger, fear, tension, pleasure, monster, system, phone, message, sfx, narrator, other).
      ${config.extractSFX ? '4. احرص على استخراج كافة المؤثرات الصوتية (SFX).' : '4. تجاهل المؤثرات الصوتية غير المكتوبة بداخل فقاعات.'}
    `;

    let success = false;
    let lastErrorMsg = '';

    // تجربة الموديلات المتاحة واحدًا تلو الآخر
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
                  description: 'قائمة بكل الفقرات المستخرجة',
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

        if (!response.ok) {
          const errJson = await response.json();
          lastErrorMsg = errJson.error?.message || `Model ${model} failed`;
          continue; // تجربة الموديل التالي عند الفشل
        }

        const data = await response.json();
        const rawJsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (rawJsonText) {
          const parsedItems: ExtractedText[] = JSON.parse(rawJsonText);
          const formattedItems = parsedItems.map((item, idx) => ({
            ...item,
            id: item.id || `item_${idx}_${Date.now()}`,
          }));

          setItems(formattedItems);
          toast.success(`تم استخراج وترجمة ${formattedItems.length} فقرة بنجاح!`);
          setView('results');
          success = true;
          break; // خروج من الحلقة فور النجاح
        }
      } catch (err: any) {
        lastErrorMsg = err.message || 'Network error';
      }
    }

    if (!success) {
      toast.error(`تعذر استخراج النصوص: ${lastErrorMsg}`);
    }

    setIsAnalyzing(false);
  };

  const updateItem = (id: string, field: keyof ExtractedText, value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8 max-w-7xl mx-auto dir-rtl">
      {/* Header */}
      <header className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-orange-600 dark:text-orange-500">
            Manga Translator Studio
          </h1>
          <p className="text-xs text-muted-foreground">أداة استخراج وترجمة المانجا والويب تون بالذكاء الاصطناعي</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Key className="w-4 h-4 text-orange-500 shrink-0" />
          <Input
            type="password"
            placeholder="Gemini API Key"
            value={apiKey}
            onChange={(e) => handleSaveApiKey(e.target.value)}
            className="h-9 text-xs w-full sm:w-64 dir-ltr"
          />
        </div>
      </header>

      {/* Main View */}
      {view === 'upload' ? (
        <UploadZone
          imagePreview={imagePreview}
          fileName={fileName}
          config={config}
          isAnalyzing={isAnalyzing}
          onImageSelected={handleImageSelected}
          onClearImage={handleClearImage}
          onConfigChange={handleConfigChange}
          onAnalyze={handleAnalyze}
        />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between bg-card p-4 rounded-2xl border border-border gap-3">
            <Button variant="outline" onClick={() => setView('upload')} className="gap-2 text-xs font-bold">
              <ArrowLeft className="w-4 h-4" /> العودة للرفع
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="gap-2 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} /> إعادة التحليل
              </Button>
              <Button variant="secondary" className="gap-2 text-xs">
                <Save className="w-4 h-4" /> حفظ المسودة
              </Button>
              <Button className="bg-orange-600 hover:bg-orange-700 text-white gap-2 text-xs font-bold">
                <Download className="w-4 h-4" /> تصدير النصوص
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl overflow-hidden border-border bg-zinc-950/5 flex flex-col h-[750px]">
              <div className="p-3 border-b border-border bg-card/60 flex justify-between items-center text-xs text-muted-foreground font-semibold">
                <span>معاينة الصفحة</span>
                <span>استخدم التمرير (Scroll) لعرض كامل الشريط</span>
              </div>
              <CardContent className="p-4 flex-1 overflow-y-auto flex justify-center items-start">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Webtoon Page"
                    className="w-full max-w-[450px] h-auto object-contain rounded-lg shadow-md"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground m-auto">لا توجد صورة معروضة</p>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4 h-[750px] overflow-y-auto pl-2">
              <div className="flex justify-between items-center sticky top-0 bg-background/95 backdrop-blur py-2 z-10">
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-500" />
                  النصوص المستخرجة ({items.length})
                </h3>
              </div>

              {items.length === 0 ? (
                <div className="text-center p-12 text-muted-foreground border border-dashed rounded-2xl bg-card/50">
                  لم يتم العثور على أي نصوص في هذه الصورة.
                </div>
              ) : (
                items.map((item, idx) => (
                  <Card key={item.id} className="p-4 space-y-3 border-border rounded-xl shadow-sm hover:border-orange-500/30 transition-colors">
                    <div className="flex justify-between items-center text-xs text-muted-foreground font-semibold">
                      <span className="bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2.5 py-1 rounded-md font-bold">
                        فقرة #{idx + 1}
                      </span>
                      <Select
                        value={item.category}
                        onValueChange={(val) => updateItem(item.id, 'category', val)}
                      >
                        <SelectTrigger className="w-[180px] h-8 text-xs font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground">النص الأصلي:</Label>
                      <Textarea
                        value={item.originalText}
                        onChange={(e) => updateItem(item.id, 'originalText', e.target.value)}
                        className="min-h-[50px] text-sm dir-ltr bg-muted/20"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                        النص المترجم:
                      </Label>
                      <Textarea
                        value={item.translatedText}
                        onChange={(e) => updateItem(item.id, 'translatedText', e.target.value)}
                        className="min-h-[50px] text-sm font-medium bg-card"
                      />
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}