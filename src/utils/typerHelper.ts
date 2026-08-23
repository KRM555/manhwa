import { MangaPageItem } from '@/types/manga';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

// 1. Helper to format full script for Photoshop Typer syntax
export const generateTyperScript = (pages: MangaPageItem[]): string => {
  let script = '';

  pages.forEach((page, index) => {
    script += `=== Page ${index + 1} (${page.fileName}) ===\n\n`;
    page.bubbles.forEach((bubble) => {
      script += `${bubble.translatedText}\n`;
    });
    script += '\n\n';
  });

  return script;
};

// 2. Export to Text (.txt)
export const exportToTxt = (pages: MangaPageItem[]) => {
  const content = generateTyperScript(pages);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `Manga_Translation_Typer_${Date.now()}.txt`);
};

// 3. Export to Word (.docx)
export const exportToWord = async (pages: MangaPageItem[]) => {
  const docChildren: Paragraph[] = [];

  pages.forEach((page, index) => {
    // Page Title
    docChildren.push(
      new Paragraph({
        text: `الصفحة ${index + 1} (${page.fileName})`,
        heading: HeadingLevel.HEADING_2,
        bidirectional: true,
        alignment: AlignmentType.RIGHT,
        spacing: { before: 240, after: 120 },
      })
    );

    // Page Bubbles
    page.bubbles.forEach((bubble) => {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: bubble.translatedText,
              size: 24, // 12pt
            }),
          ],
          bidirectional: true,
          alignment: AlignmentType.RIGHT,
          spacing: { after: 100 },
        })
      );
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Manga_Translation_${Date.now()}.docx`);
};