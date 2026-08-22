import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { UploadZone } from '@/components/UploadZone';
import { AnalysisLoader } from '@/components/AnalysisLoader';
import { TranslationViewer } from '@/components/TranslationViewer';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { DetectedBubble, TranslationConfig, SampleManga } from '@/types/manga';
import { SAMPLE_MANGA_PAGES } from '@/data/samples';
import { toast } from 'sonner';

const DEFAULT_CONFIG: TranslationConfig = {
  targetLanguage: 'ar',
  sourceLanguage: 'auto',
  extractSFX: true,
  detectVerticalText: true,
  fontStyle: 'manga-default',
  keepOriginalFontColor: true,
};

const Index: React.FC = () => {
  const [imagePreview, setImagePreview] = useState<string | null>(SAMPLE_MANGA_PAGES[0].fullImage);
  const [fileName, setFileName] = useState<string | null>(SAMPLE_MANGA_PAGES[0].title);
  const [config, setConfig] = useState<TranslationConfig>(DEFAULT_CONFIG);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [bubbles, setBubbles] = useState<DetectedBubble[] | null>(null);
  const [activeSample, setActiveSample] = useState<SampleManga | null>(SAMPLE_MANGA_PAGES[0]);

  const handleImageSelected = (url: string, name: string, sampleData?: SampleManga) => {
    setImagePreview(url);
    setFileName(name);
    setActiveSample(sampleData || null);
    setBubbles(null);
  };

  const handleClearImage = () => {
    setImagePreview(null);
    setFileName(null);
    setActiveSample(null);
    setBubbles(null);
  };

  const handleConfigChange = (updated: Partial<TranslationConfig>) => {
    setConfig((prev) => ({ ...prev, ...updated }));
  };

  const handleAnalyze = () => {
    if (!imagePreview) return;
    setIsAnalyzing(true);
    setProgress(10);
    setAnalysisStep(0);

    const stepInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(stepInterval);
          return 90;
        }
        const next = prev + 25;
        if (next >= 75) setAnalysisStep(3);
        else if (next >= 50) setAnalysisStep(2);
        else if (next >= 25) setAnalysisStep(1);
        return next;
      });
    }, 450);

    setTimeout(() => {
      clearInterval(stepInterval);
      setProgress(100);
      setAnalysisStep(4);
      setIsAnalyzing(false);

      // Generate or load detected bubbles
      const targetBubbles: DetectedBubble[] = activeSample
        ? activeSample.sampleBubbles
        : [
            {
              id: 'custom-1',
              x: 20,
              y: 20,
              width: 35,
              height: 18,
              originalText: 'どうしてここにいるの？',
              translatedText: config.targetLanguage === 'ar' ? 'لماذا أنت متواجد هنا؟' : 'Why are you here?',
              type: 'speech',
            },
            {
              id: 'custom-2',
              x: 55,
              y: 50,
              width: 38,
              height: 20,
              originalText: '絶対に諦めない！',
              translatedText: config.targetLanguage === 'ar' ? 'لن أستسلم أبداً مهما حدث!' : 'I will never give up!',
              type: 'speech',
            },
            ...(config.extractSFX
              ? [
                  {
                    id: 'custom-sfx',
                    x: 40,
                    y: 78,
                    width: 25,
                    height: 12,
                    originalText: 'ドドド… (ドカーン)',
                    translatedText: config.targetLanguage === 'ar' ? '[صوت انفجار قوي - بوووم]' : '[BOOM - Loud Explosion]',
                    type: 'sfx' as const,
                  },
                ]
              : []),
          ];

      setBubbles(targetBubbles);
      toast.success('Manga translation completed successfully!');
    }, 2200);
  };

  const handleUpdateBubble = (id: string, newText: string) => {
    if (!bubbles) return;
    setBubbles(bubbles.map((b) => (b.id === id ? { ...b, translatedText: newText } : b)));
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-orange-500/30">
      <div>
        <Header />

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          {/* If analysis finished and bubbles are available, show translation viewer */}
          {bubbles && imagePreview ? (
            <TranslationViewer
              imageSrc={imagePreview}
              bubbles={bubbles}
              config={config}
              onUpdateBubble={handleUpdateBubble}
              onReset={() => {
                setBubbles(null);
                setImagePreview(null);
              }}
            />
          ) : (
            <div className="space-y-6">
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

              {isAnalyzing && (
                <AnalysisLoader currentStep={analysisStep} progress={progress} />
              )}
            </div>
          )}
        </main>
      </div>

      <footer className="border-t border-border/50 py-6 mt-12">
        <MadeWithDyad />
      </footer>
    </div>
  );
};

export default Index;