
import { GoogleGenAI, Type } from "@google/genai";
import { FrameAnalysisResult, ChatMessage } from "../../types";

const apiKey = process.env.API_KEY || '';

// Fallback mock data matching the new complex structure
const MOCK_RESULT: FrameAnalysisResult = {
  score: 79,
  developing_frame: true,
  subscores: {
    authority: 80,
    magnetism: 45,
    boundaries: 78,
    energy: 82,
    clarity: 85,
    emotional_tone: 50,
    brand_congruence: 75,
    sales_strength: 35
  },
  critical_signal: {
    title: "Apologetic framing detected",
    description: "Subject exhibits beta syntax by qualifying requests and assuming burden.",
    quotes: ["I was wondering if", "you're busy", "potentially help"]
  },
  corrections: [
    "Remove 'just' qualifiers",
    "State purpose directly",
    "Shift to assumption of value",
    "Lead with specific result",
    "Use definitive language"
  ],
  transcription: "This is a mock transcription of the audio analysis. In a real scenario, this would contain the speech-to-text output from the Gemini model processing your audio file."
};

export const analyzeFrame = async (text: string, imageBase64?: string, mimeType?: string): Promise<FrameAnalysisResult> => {
  if (!apiKey) {
    console.warn("No API Key found. Returning mock data.");
    await new Promise(resolve => setTimeout(resolve, 1500)); 
    return MOCK_RESULT;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    let prompt = "";
    let contents: any = [];

    // Common schema for both text and image/audio
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            score: { type: Type.INTEGER },
            subscores: {
                type: Type.OBJECT,
                properties: {
                    authority: { type: Type.INTEGER },
                    magnetism: { type: Type.INTEGER },
                    boundaries: { type: Type.INTEGER },
                    energy: { type: Type.INTEGER },
                    clarity: { type: Type.INTEGER },
                    emotional_tone: { type: Type.INTEGER },
                    brand_congruence: { type: Type.INTEGER },
                    sales_strength: { type: Type.INTEGER }
                }
            },
            critical_signal: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    quotes: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            },
            corrections: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            },
            transcription: { type: Type.STRING }
        }
    };

    if (imageBase64 && mimeType) {
        if (mimeType.startsWith('audio/')) {
            prompt = `Analyze this audio recording for 'Vocal Frame' dynamics.
            ${text ? `User Context/Tags: "${text}"` : ""}
            
            Evaluate: Tonality, Pace, Pauses, Confidence, Interruptions.
            
            Return a JSON object with:
            - score (0-100)
            - subscores (authority, magnetism, boundaries, energy, clarity, emotional_tone, brand_congruence, sales_strength)
            - critical_signal: { title, description, quotes (from audio) }
            - corrections: List of 3-5 specific vocal adjustments.
            - transcription: A full transcript of the audio.
            `;
        } else {
            prompt = `Analyze this image for 'Visual Frame' dynamics.
            ${text ? `User Context/Tags: "${text}"` : ""}
            
            Evaluate: Posture, Orientation, Eye Level, Space Usage.
            
            Return a JSON object with:
            - score (0-100)
            - subscores (authority, magnetism, boundaries, energy, clarity, emotional_tone, brand_congruence, sales_strength)
            - critical_signal: { title (e.g. "Slouched Posture"), description, quotes (use descriptions of visual elements like "Rounded shoulders") }
            - corrections: List of 3-5 specific physical adjustments.
            `;
        }
        
        contents = [
            { inlineData: { mimeType: mimeType, data: imageBase64 } },
            { text: prompt }
        ];

    } else {
        prompt = `Analyze the following text for Frame Control.
        
        Input Text: "${text}"
        
        The user may use CRM tags:
        - @Name (Specific Contact)
        - /Context (e.g., /SalesCall, /Email, /Date)
        
        Use these tags to inform the context.
        
        Return a JSON object with:
        1. score (0-100)
        2. subscores (0-100 for: authority, magnetism, boundaries, energy, clarity, emotional_tone, brand_congruence, sales_strength)
        3. critical_signal: { 
             title: Short alert (e.g. "Apologetic Framing"), 
             description: 1 sentence explanation, 
             quotes: Array of exact substrings from the text that are weak.
           }
        4. corrections: Array of 3-5 short, imperative commands to fix the frame (e.g., "Remove 'just'", "State price directly").
        `;

        contents = [{ text: prompt }];
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: contents },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as FrameAnalysisResult;
    }
    
    throw new Error("Empty response");

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return MOCK_RESULT;
  }
};

export const submitApplicationChat = async (history: ChatMessage[], newUserMessage: string): Promise<string> => {
    // ... existing implementation
    if (!apiKey) return "System Offline: API Key missing.";
    const ai = new GoogleGenAI({ apiKey });
    const conversationHistory = history.map(m => `${m.role === 'user' ? 'APPLICANT' : 'OFFICER'}: ${m.content}`).join('\n');
    const prompt = `You are the Senior Case Officer... \n\n${conversationHistory}\nAPPLICANT: ${newUserMessage}\nOFFICER RESPONSE:`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: { text: prompt } });
        return response.text || "Connection interrupted.";
    } catch (e) { return "Error connecting."; }
};

export const submitBetaApplicationChat = async (history: ChatMessage[], newUserMessage: string): Promise<string> => {
    // ... existing implementation
    if (!apiKey) return "System Offline.";
    const ai = new GoogleGenAI({ apiKey });
    const conversationHistory = history.map(m => `${m.role === 'user' ? 'USER' : 'DIRECTOR'}: ${m.content}`).join('\n');
    const prompt = `You are the Beta Program Director... \n\n${conversationHistory}\nUSER: ${newUserMessage}\nDIRECTOR RESPONSE:`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: { text: prompt } });
        return response.text || "Connection interrupted.";
    } catch (e) { return "Error connecting."; }
};