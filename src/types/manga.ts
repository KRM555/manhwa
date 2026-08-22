export interface DetectedBubble {
  id: string;
  x: number; // percentage from left
  y: number; // percentage from top
  width: number;
  height: number;
  originalText: string;
  translatedText: string;
  type: 'speech' | 'sfx' | 'thought' | 'narrator';
}

export interface TranslationConfig {
  targetLanguage: string;
  sourceLanguage: string;
  extractSFX: boolean;
  detectVerticalText: boolean;
  fontStyle: 'wildwords' | 'comic' | 'manga-default' | 'anime-serif';
  keepOriginalFontColor: boolean;
}

export interface SampleManga {
  id: string;
  title: string;
  genre: string;
  thumbnail: string;
  fullImage: string;
  sampleBubbles: DetectedBubble[];
}