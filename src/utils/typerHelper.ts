import { MangaPageItem } from "@/types/manga";

export const CATEGORIES = [
  { value: 'dialogue', label: 'حوار (Dialogue)', prefix: '""' },
  { value: 'thought', label: 'أفكار (Thought)', prefix: '()' },
  { value: 'scream', label: 'صراخ (Scream)', prefix: '::' },
  { value: 'whisper', label: 'همس (Whisper)', prefix: '""' },
  { value: 'anger', label: 'غضب (Anger)', prefix: '::' },
  { value: 'fear', label: 'خوف (Fear)', prefix: '""' },
  { value: 'tension', label: 'توتر (Tension)', prefix: '""' },
  { value: 'pleasure', label: 'متعة (Pleasure)', prefix: '""' },
  { value: 'monster', label: 'وحش (Monster)', prefix: '""' },
  { value: 'system', label: 'نظام (System)', prefix: '[]' },
  { value: 'phone', label: 'هاتف (Phone)', prefix: '[]' },
  { value: 'message', label: 'رسالة (Message)', prefix: '[]' },
  { value: 'sfx', label: 'مؤثر صوتي (SFX)', prefix: 'SFX:' },
  { value: 'narrator', label: 'راوي (Narrator)', prefix: 'OT:' },
  { value: 'other', label: 'أخرى (Other)', prefix: 'OT:' },
];

export function applyTyperPrefix(text: string, category: string): string {
  let cleanText = text.trim();
  // Strip existing known prefixes
  cleanText = cleanText
    .replace(/^::\s*/, '')
    .replace(/^SFX:\s*/i, '')
    .replace(/^OT:\s*/i, '')
    .replace(/^\[\]\s*/, '')
    .replace(/^\[(.*?)\]$/, '$1')
    .replace(/^\((.*?)\)$/, '$1')
    .replace(/^""\s*/, '')
    .replace(/^"(.*?)"$/, '$1')
    .trim();

  switch (category) {
    case 'scream':
    case 'anger':
      return `:: ${cleanText}`;
    case 'thought':
      return `(${cleanText})`;
    case 'sfx':
      return `SFX: ${cleanText}`;
    case 'narrator':
    case 'other':
      return `OT: ${cleanText}`;
    case 'system':
    case 'phone':
    case 'message':
      return `[${cleanText}]`;
    case 'dialogue':
    case 'whisper':
    case 'fear':
    case 'tension':
    case 'pleasure':
    case 'monster':
    default:
      return `"${cleanText}"`;
  }
}

export function generateChapterTextFile(pages: MangaPageItem[]): string {
  let result = `=====================================\n`;
  result += `MANGA TRANSLATION SCRIPT FOR TYPER\n`;
  result += `TOTAL PAGES: ${pages.length}\n`;
  result += `=====================================\n\n`;

  pages.forEach((page, index) => {
    const pageNumber = index + 1;
    result += `-------------------------------------\n`;
    result += `PAGE #${pageNumber} (${page.fileName})\n`;
    result += `-------------------------------------\n`;

    if (!page.items || page.items.length === 0) {
      result += `// No dialogue detected on this page\n\n`;
      return;
    }

    page.items.forEach((item) => {
      const formatted = item.translatedText.trim();
      result += `${formatted}\n`;
    });

    result += `\n`;
  });

  return result;
}