import { GoogleGenAI } from "@google/genai";

// Per coding guidelines, the API key is assumed to be available in process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

interface HintResult {
  hint: string;
  word: string;
}

export const getHintFromGemini = async (letters: string, foundWords: string[], allWords: string[]): Promise<HintResult> => {
  const unFoundWords = allWords.filter(word => !foundWords.includes(word));
  if (unFoundWords.length === 0) {
    // This case is handled in the UI, but as a fallback, we throw an error.
    throw new Error("All words have been found.");
  }

  const targetWord = unFoundWords[Math.floor(Math.random() * unFoundWords.length)];

  // Improved prompt for better clarity and to follow a more direct instruction style.
  const prompt = `
    You are an AI assistant for a word game. Your task is to provide a short, clever, one-sentence hint for a given word.
    The hint must not reveal the word itself. It should be a definition or a clue.

    Game context:
    - Available letters: ${letters.split('').join(', ')}
    - The word to provide a hint for is "${targetWord}". It has ${targetWord.length} letters.
    
    Example hint for the word "WATER": "It's a clear liquid essential for life."

    Provide your hint for "${targetWord}":
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    // The Gemini API response for a simple text prompt is accessed via the .text property.
    return { hint: response.text.trim(), word: targetWord };
  } catch (error) {
    console.error("Error fetching hint from Gemini:", error);
    throw new Error("Could not get a hint at this time. Please try again later.");
  }
};