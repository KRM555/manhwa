import React, { useState } from 'react';
import UploadZone from '@/components/UploadZone';
import { TranslationConfig } from '@/types/manga';
import { ArrowLeft, Download, Save } from 'lucide-react';
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
  const [view, setView] = useState<'upload' | 'results'>('upload');

  // المفتاح واللغة المفترضة (يمكنك ربطهما بحالة إعدادات التطبيق لديك)
  const [apiKey, setApiKey] = useState<string>(localStorage.getItem('gemini_api_key') || '');
  const [targetLang, setTargetLang] = useState<string>('ar');
  const [isOcrOnly, setIsOcrOnly] = useState<boolean>(false);

  const [items, setItems] = useState<ExtractedText[]>([]);

  // استلام نتائج معالجة Gemini من مكون UploadZone
  const handlePagesLoaded = (pages: any[]) => {
    if (!pages || pages.length === 0) return;

    const firstPage = pages[0];
    setImagePreview(firstPage.imageUrl || null);

    // دمج نصوص الصفحات إذا تم رفع أكثر من صورة أو أخذ الصفحة الأولى
    const extractedItems: ExtractedText[] = (firstPage.items || firstPage.blocks || []).map(
      (item: any, idx: number) => ({
        id: item.id || `text_${idx}`,
        originalText: item.originalText || item.original || '',
        translatedText: item.translatedText || item.translated || item.text || '',
        category: item.category || item.type || 'dialogue',
      })
    );

    setItems(extractedItems);

    // إذا اكتمل الاستخراج تحول لصفحة النتائج تلقائياً
    if (firstPage.status === 'completed') {
      setView('results');
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
      <header className="mb-8 flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-orange-600 dark:text-orange-500">
            Manga Translator Studio
          </h1>
          <p className="text-xs text-muted-foreground">أداة استخراج وترجمة المانجا الاحترافية</p>
        </div>
      </header>

      {/* View Switcher */}
      {view === 'upload' ? (
        <div className="space-y-4">
          <UploadZone
            apiKey={apiKey}
            targetLang={targetLang}
            isOcrOnly={isOcrOnly}
            onPagesLoaded={handlePagesLoaded}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Bar */}
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

          {/* Side by Side Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl overflow-hidden border-border">
              <CardContent className="p-4 flex items-center justify-center bg-zinc-950/5 min-h-[500px]">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Uploaded Page"
                    className="max-h-[700px] w-auto object-contain rounded-lg shadow-md"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">لا توجد صورة معروضة</p>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4 max-h-[750px] overflow-y-auto pr-2">
              <h3 className="font-bold text-lg text-foreground">
                النصوص المستخرجة ({items.length})
              </h3>

              {items.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground border border-dashed rounded-xl">
                  لم يتم العثور على نصوص في هذه الصورة.
                </div>
              ) : (
                items.map((item, idx) => (
                  <Card key={item.id} className="p-4 space-y-3 border-border rounded-xl">
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