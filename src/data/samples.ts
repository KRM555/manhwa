import { SampleManga } from "@/types/manga";

export const SAMPLE_MANGA_PAGES: SampleManga[] = [
  {
    id: "action-shonen",
    title: "Battle Climax (Shonen)",
    genre: "Action / Supernatural",
    thumbnail: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80",
    fullImage: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80",
    sampleBubbles: [
      {
        id: "b1",
        x: 22,
        y: 18,
        width: 32,
        height: 18,
        originalText: "オレの本当の力を…見せてやる！",
        translatedText: "سأريك... قوتي الحقيقية الآن!",
        type: "speech"
      },
      {
        id: "b2",
        x: 62,
        y: 35,
        width: 25,
        height: 15,
        originalText: "ゴゴゴゴ… (ドドン)",
        translatedText: "[صوت هدير قوي - دمرررر]",
        type: "sfx"
      },
      {
        id: "b3",
        x: 35,
        y: 65,
        width: 38,
        height: 20,
        originalText: "まさか…ここまで成長していたとは…！",
        translatedText: "لا يعقل... هل تطور إلى هذا الحد بالفعل...؟!",
        type: "thought"
      }
    ]
  },
  {
    id: "manhwa-romance",
    title: "The Duke's Secret (Webtoon)",
    genre: "Romance / Drama",
    thumbnail: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&auto=format&fit=crop&q=80",
    fullImage: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200&auto=format&fit=crop&q=80",
    sampleBubbles: [
      {
        id: "m1",
        x: 18,
        y: 25,
        width: 36,
        height: 16,
        originalText: "당신이 왜 여기에 있는 겁니까?",
        translatedText: "لماذا أنت متواجد هنا في هذا الوقت؟",
        type: "speech"
      },
      {
        id: "m2",
        x: 48,
        y: 58,
        width: 40,
        height: 22,
        originalText: "더 이상 도망칠 생각은 하지 마세요.",
        translatedText: "إياك والتفكير في الهروب مجدداً.",
        type: "speech"
      }
    ]
  }
];

export const TARGET_LANGUAGES = [
  { code: "ar", name: "Arabic (العربية)", flag: "🇸🇦", rtl: true },
  { code: "en", name: "English", flag: "🇺🇸", rtl: false },
  { code: "es", name: "Spanish (Español)", flag: "🇪🇸", rtl: false },
  { code: "ja", name: "Japanese (日本語)", flag: "🇯🇵", rtl: false },
  { code: "fr", name: "French (Français)", flag: "🇫🇷", rtl: false },
  { code: "de", name: "German (Deutsch)", flag: "🇩🇪", rtl: false },
  { code: "pt", name: "Portuguese (Português)", flag: "🇧🇷", rtl: false },
];