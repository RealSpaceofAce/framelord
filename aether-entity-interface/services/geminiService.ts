import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';

// Initialize the client
// Note: In a real production build, ensure the key is present. 
// For this demo, we handle the missing key gracefully in the UI if possible, 
// but the guidelines say assume it's valid.
const ai = new GoogleGenAI({ apiKey });

export const generateResponse = async (
  prompt: string, 
  history: { role: string; parts: { text: string }[] }[]
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    
    // Convert history to the format expected by the SDK if necessary, 
    // strictly strictly using the guidelines.
    // The SDK simplifies chat significantly.
    
    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction: "You are Aether, a digital spirit entity. You are ethereal, calm, and wise. You exist as a floating orb of energy. Keep your responses concise, somewhat poetic but helpful. Do not use markdown formatting like bold or lists often, keep it conversational.",
      },
      history: history,
    });

    const result = await chat.sendMessage({ message: prompt });
    
    // Accessing .text directly as per guidelines
    return result.text || "I... I cannot find the words right now.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "My connection to the ether is disrupted. Please try again.";
  }
};
