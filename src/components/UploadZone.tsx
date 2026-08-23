import React, { useState } from 'react';
import JSZip from 'jszip';
import { MangaPageItem } from '@/types/manga';
import { Button } from '@/components/ui/button';
import { Upload, FileArchive, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface UploadZoneProps {
  onStartProcessing: (pages: MangaPageItem[]) => void;
  isAnalyzing: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onStartProcessing, isAnalyzing }) => {
  const [selectedPages, setSelectedPages] = useState<MangaPageItem[]>([]);
  const [isUnzipping, setIsUnzipping] = useState<boolean>(false);

  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const zipFile = fileArray.find((f) => f.name.endsWith('.zip') || f.type.includes('zip'));

    if (zipFile) {
      // Handle ZIP File Unpacking
      setIsUnzipping(true);
      try {
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(zipFile);
        const extractedPages: MangaPageItem[] = [];

        const imageEntries = Object.entries(zipContent.files).filter(
          ([filename, fileObj]) => !fileObj.dir && /\.(jpg|jpeg|png|webp)$/i.test(filename)
        );

        // Sort images alphabetically by filename
        imageEntries.sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));

        for (let i = 0; i < imageEntries.length; i++) {
          const [filename, fileObj] = imageEntries[i];
          const blob = await fileObj.async('blob');
          const imageUrl = await blobToDataURL(blob);

          extractedPages.push({
            id: `page_${Date.now()}_${i}`,
            fileName: filename,
            imageUrl,
            bubbles: [],
            status: 'pending',
          });
        }

        if (extractedPages.length === 0) {
          toast.error('لم يتم العثور على أي صور داخل ملف الـ ZIP');
        } else {
          setSelectedPages(extractedPages);
          toast.success(`تم فك الضغط واستخراج ${extractedPages.length} صورة بنجاح`);
        }
      } catch (err) {
        console.error(err);
        toast.error('حدث خطأ أثناء فك ضغط ملف الـ ZIP');
      } finally {
        setIsUnzipping(false);
      }
    } else {
      // Handle Multiple Image Files
      const imageFiles = fileArray.filter((f) => f.type.startsWith('image/'));
      imageFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

      const pagesPromises = imageFiles.map(async (file, index) => {
        const imageUrl = await blobToDataURL(file);
        return {
          id: `page_${Date.now()}_${index}`,
          fileName: file.name,
          imageUrl,
          bubbles: [],
          status: 'pending' as const,
        };
      });

      const pages = await Promise.all(pagesPromises);
      setSelectedPages(pages);
      if (pages.length > 0) {
        toast.success(`تم اختيار ${pages.length} صورة`);
      }
    }
  };

  const blobToDataURL = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  return (
    <div className="space-y-6">
      {/* Drag & Drop Box */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed rounded-xl p-8 text-center bg-card hover:bg-accent/10 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[220px]"
      >
        <input
          type="file"
          id="fileInput"
          multiple
          accept="image/*,.zip"
          className="hidden"
          onChange={handleFileSelect}
        />
        <label htmlFor="fileInput" className="cursor-pointer space-y-3 flex flex-col items-center">
          <div className="p-3 rounded-full bg-primary/10 text-primary">
            {isUnzipping ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <Upload className="w-8 h-8" />
            )}
          </div>
          <div>
            <p className="font-semibold text-base">اسحب الملفات هنا أو انقر للاختيار</p>
            <p className="text-xs text-muted-foreground mt-1">
              يدعم ملفات ZIP المضغوطة أو تحديد صور متعددة معاً (JPG, PNG, WEBP)
            </p>
          </div>
        </label>
      </div>

      {/* Uploaded Files Summary & Action Button */}
      {(selectedPages?.length ?? 0) > 0 && (
        <div className="bg-card border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              <span className="font-medium text-sm">
                تم تجهيز {selectedPages.length} صفحة للتحليل
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPages([])}
              disabled={isAnalyzing}
            >
              إلغاء
            </Button>
          </div>

          <Button
            className="w-full bg-primary text-primary-foreground font-semibold py-2"
            onClick={() => onStartProcessing(selectedPages)}
            disabled={isAnalyzing || isUnzipping}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                جاري تحليل الفصل وترجمته...
              </>
            ) : (
              `بدء ترجمة الفصل بالكامل (${selectedPages.length} صفحة)`
            )}
          </Button>
        </div>
      )}
    </div>
  );
};