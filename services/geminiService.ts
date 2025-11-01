
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you might show a more user-friendly error.
  // For this environment, we assume the API key is always present.
  console.warn("API_KEY not found in environment variables. Gemini features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const getHintFromGemini = async (letters: string, foundWords: string[], allWords: string[]): Promise<string> => {
  if (!API_KEY) {
    return "Gemini is not available. Check your API key.";
  }

  const unFoundWords = allWords.filter(word => !foundWords.includes(word));
  if (unFoundWords.length === 0) {
    return "You have found all the words!";
  }

  const targetWord = unFoundWords[Math.floor(Math.random() * unFoundWords.length)];

  const prompt = `
    I am playing a word game.
    The available letters are: ${letters.split('').join(', ')}.
    I need a hint for a ${targetWord.length}-letter word.
    Please give me a short, clever, one-sentence hint for the word "${targetWord}".
    Do not reveal the word itself in the hint. The hint should be a definition or a clue.
    Example for "WATER": "It's a clear liquid essential for life."
    Hint for "${targetWord}":
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error fetching hint from Gemini:", error);
    return "Could not get a hint at this time. Please try again later.";
  }
};
