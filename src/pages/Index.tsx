import React, { useState } from 'react';
import { UploadZone } from '@/components/UploadZone';
import { TranslationConfig, SampleManga } from '@/types/manga';
import { ArrowLeft, Download, Save, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
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

export default function Index() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [view, setView] = useState<'upload' | 'results'>('upload');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiKey, setApiKey] = useState<string>(localStorage.getItem('gemini_api_key') || '');

  const [config, setConfig] = useState<TranslationConfig>({
    targetLanguage: 'ar',
    extractSFX: true,
    detectVerticalText: true,
  });

  const [items, setItems] = useState<ExtractedText[]>([]);

  const handleImageSelected = (url: string, name: string, _sampleData?: SampleManga) => {
    setImagePreview(url);
    setFileName(name);
  };

  const handleClearImage = () => {
    setImagePreview(null);
    setFileName(null);
  };

  const handleConfigChange = (updated: Partial<TranslationConfig>) => {
    setConfig((prev) => ({ ...prev, ...updated }));
  };

  // Real Gemini Analysis Function
  const handleAnalyze = async () => {
    if (!imagePreview) return;

    if (!apiKey) {
      toast.error('يرجى إدخال مفتاح Gemini API أولاً للاستخراج الحقيقي');
      return;
    }

    setIsAnalyzing(true);
    localStorage.setItem('gemini_api_key', apiKey);

    try {
      const base64Data = imagePreview.split(',')[1];
      const mimeType = imagePreview.split(';')[0].split(':')[1] || 'image/png';

      const promptText = `You are a professional Manhua/Manga translator.
1. Perform high-precision OCR to read Chinese/Japanese/Korean text (including vertical text and stylized sound effects).
2. Translate the text into natural, fluent Arabic. Avoid literal translation; capture tone, context, and character emotions (e.g., cultivation terms, modern slang, honorifics).
3. Identify the category: dialogue, thought, scream, whisper, anger, fear, tension, pleasure, monster, system, phone, message, sfx, narrator, other.

Return STRICTLY a raw JSON array like this:
[
  {
    "id": "1",
    "originalText": "النص الأصلي",
    "translatedText": "الترجمة العربية الاحترافية",
    "category": "dialogue"
  }
]`;

      const response = await fetch(
`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

      if (data.error) {
        throw new Error(data.error.message || 'API Call failed');
      }

      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedItems: ExtractedText[] = JSON.parse(cleanJson);

      setItems(parsedItems);
      setView('results');
      toast.success('تم تحليل الصفحة واستخراج النصوص بنجاح!');
    } catch (err: any) {
      console.error(err);
      toast.error('حدث خطأ أثناء تحليل الصورة: ' + (err.message || 'تأكد من صحة الـ API Key'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateItem = (id: string, field: keyof ExtractedText, value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-orange-600 dark:text-orange-500">
            Manga Translator Studio
          </h1>
          <p className="text-xs text-muted-foreground">أداة استخراج وترجمة المانجا الاحترافية</p>
        </div>

        {/* Gemini API Key Bar */}
        <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-xl border border-border w-full sm:w-auto">
          <Sparkles className="w-4 h-4 text-orange-500 shrink-0" />
          <input
            type="password"
            placeholder="أدخل Gemini API Key هنا"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="bg-transparent text-xs outline-none px-2 w-full sm:w-64"
          />
        </div>
      </header>

      {/* View Switcher */}
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
          <div className="flex items-center justify-between bg-card p-4 rounded-2xl border border-border">
            <Button variant="outline" onClick={() => setView('upload')} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> العودة للرفع
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" className="gap-2">
                <Save className="w-4 h-4" /> حفظ المسودة
              </Button>
              <Button className="bg-orange-600 hover:bg-orange-700 text-white gap-2">
                <Download className="w-4 h-4" /> تصدير
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl overflow-hidden border-border">
              <CardContent className="p-4 flex items-center justify-center bg-zinc-950/5 min-h-[500px]">
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Uploaded Page"
                    className="max-h-[700px] w-auto object-contain rounded-lg shadow-md"
                  />
                )}
              </CardContent>
            </Card>

            <div className="space-y-4 max-h-[750px] overflow-y-auto pr-2">
              <h3 className="font-bold text-lg text-foreground">
                النصوص المستخرجة ({items.length})
              </h3>

              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">لم يتم العثور على نصوص في هذه الصفحة.</p>
              ) : (
                items.map((item, idx) => (
                  <Card key={item.id || idx} className="p-4 space-y-3 border-border rounded-xl">
                    <div className="flex justify-between items-center text-xs text-muted-foreground font-semibold">
                      <span>فقرة #{idx + 1}</span>
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
                      <label className="text-xs font-semibold text-muted-foreground">النص الأصلي:</label>
                      <Textarea
                        value={item.originalText}
                        onChange={(e) => updateItem(item.id, 'originalText', e.target.value)}
                        className="min-h-[50px] text-sm dir-ltr"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                        النص المترجم:
                      </label>
                      <Textarea
                        value={item.translatedText}
                        onChange={(e) => updateItem(item.id, 'translatedText', e.target.value)}
                        className="min-h-[50px] text-sm font-medium"
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