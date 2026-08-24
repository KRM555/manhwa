export async function extractTextWithGemini(
  imageBase64: string,
  apiKey: string,
  targetLang: string,
  isOcrOnly: boolean
) {
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  const promptText = isOcrOnly
    ? `You are an OCR tool for manga/comics. Extract all text elements in reading order. Return ONLY a valid JSON array of objects without markdown formatting: [{"originalText": "text", "translatedText": "text", "category": "dialogue"}]`
    : `You are a manga translation tool. Extract and translate all text elements into ${targetLang === 'ar' ? 'Arabic' : 'English'}. Return ONLY a valid JSON array of objects without markdown formatting: [{"originalText": "text", "translatedText": "translated text", "category": "dialogue"}]`;

  const cleanKey = apiKey.trim();
  
  // تحديث المسار المباشر للموديل
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: cleanBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0.2
      }
    }),
  });

  if (!response.ok) {
    const errorRes = await response.json().catch(() => ({}));
    const errorMsg = errorRes.error?.message || `فشل الاتصال (${response.status})`;
    
    if (response.status === 404) {
      throw new Error("تأكد من استخدام API Key صحيح يبدأ بـ AIzaSy... من Google AI Studio");
    }
    throw new Error(errorMsg);
  }

  const resData = await response.json();
  let textResult = resData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

  try {
    const parsed = JSON.parse(textResult);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to parse Gemini response:', textResult);
    return [];
  }
}