import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface UploadZoneProps {
  apiKey: string;
  targetLang: string;
  isOcrOnly: boolean;
  typerRules: any[];
  onPagesLoaded: (pages: any[]) => void;
  onStartProcessing?: () => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  apiKey,
  targetLang,
  isOcrOnly,
  typerRules,
  onPagesLoaded,
  onStartProcessing,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (!apiKey) {
      toast.error('يرجى إدخال Gemini API Key أولاً لمعالجة الصور!');
      return;
    }

    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast.error('يرجى رفع صور فقط (PNG, JPG, WEBP)');
      return;
    }

    setIsLoading(true);
    
    // استدعاء دالة بداية المعالجة بأمان بدون تسبيب خطأ
    if (onStartProcessing) {
      onStartProcessing();
    }

    try {
      // تجهيز الصور وقراءتها كـ Base64
      const processedPages = await Promise.all(
        imageFiles.map(async (file, index) => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              resolve({
                id: `page_${Date.now()}_${index}`,
                name: file.name,
                imageUrl: e.target?.result as string,
                items: [], // سيتم ملء النصوص المستخرجة لاحقاً في صفحة النتائج
                status: 'pending'
              });
            };
            reader.readAsDataURL(file);
          });
        })
      );

      toast.success(`تم تحميل ${processedPages.length} صورة بنجاح!`);
      onPagesLoaded(processedPages);
    } catch (error) {
      console.error('Error processing uploaded images:', error);
      toast.error('حدث خطأ أثناء تحميل الصور، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileSelect(e.target.files)}
        multiple
        accept="image/*"
        className="hidden"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 relative overflow-hidden group ${
          isDragging
            ? 'border-orange-500 bg-orange-500/10 scale-[0.99]'
            : 'border-slate-800 hover:border-orange-500/50 bg-slate-900/40 hover:bg-slate-900/80'
        } ${isLoading ? 'opacity-75 pointer-events-none' : ''}`}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-amber-500/10 rounded-2xl border border-orange-500/30 flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform duration-300 shadow-xl">
              {isLoading ? (
                <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
              ) : (
                <Upload className="w-8 h-8" />
              )}
            </div>
            {!isLoading && (
              <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-1 rounded-full shadow-md">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-200 group-hover:text-orange-400 transition-colors">
              {isLoading ? 'جاري تجهيز الصور...' : 'اضغط هنا أو اسحب الصور وانسخها إلى هنا'}
            </h3>
            <p className="text-xs text-slate-400">
              يدعم فصول المانوا والمانهوا بصيغ (PNG, JPG, WEBP) رفع متعدد للملفات
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5 text-orange-400" />
              رفع دفعة كاملة (Batch Upload)
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              أقصى دقة مدعومة للصور عالية الوضوح
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};