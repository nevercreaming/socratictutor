
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Message } from "../types";

const GET_SYSTEM_INSTRUCTION = (subject: string) => `
You are a direct and highly efficient Socratic Tutor for ${subject}. 
Your goal is to guide the student toward the answer by providing concise explanations followed by multiple-choice options for the next step.

CONVERSATIONAL MEMORY & CONTEXT:
1. ALWAYS remember the original problem or question provided at the start of the chat.
2. Track the student's progress. If they move from step 1 to step 2, don't repeat step 1 unless they ask "Why?".
3. If a student chooses an option that represents a common mistake, use the history to understand their specific point of confusion.
4. Keep the thread of logic consistent throughout the entire conversation.

STRATEGY:
1. NO DIRECT ANSWERS: Never provide the final solution or the direct answer to the user's primary problem.
2. GUIDED STEPS: Break the problem down. Explain the current concept in 1-2 sentences.
3. MULTIPLE CHOICE: You MUST always provide 3-4 distinct options for the user to choose from. 
   - These options should represent different potential steps, common misconceptions, or answers to a guiding question.
   - Keep the options short and clear.
4. FEEDBACK: If the user picks an incorrect option, explain why that logic is flawed in the 'explanation' field of your next response and provide a new set of options.
5. CONCISION: Be brief. Get straight to the logic.

JSON FORMAT:
You must respond in JSON with:
- "explanation": Your Socratic guidance/text.
- "options": An array of 3-4 strings representing the choices for the user.
`;

export const getGeminiResponse = async (history: Message[], subject: string): Promise<{ explanation: string; options: string[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: history.map(m => ({
      role: m.role,
      parts: m.parts.map(p => {
        if (p.text) return { text: p.text };
        if (p.inlineData) return { inlineData: p.inlineData };
        return { text: "" };
      })
    })),
    config: {
      systemInstruction: GET_SYSTEM_INSTRUCTION(subject),
      thinkingConfig: { thinkingBudget: 4000 },
      temperature: 0.5,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          explanation: {
            type: Type.STRING,
            description: "The Socratic explanation and guidance."
          },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "3-4 options for the student to choose from."
          }
        },
        required: ["explanation", "options"]
      }
    },
  });

  try {
    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON response:", response.text);
    return {
      explanation: "I'm sorry, I hit a snag in my reasoning. Let's try that last step again.",
      options: ["Retry last step", "Explain the previous concept again", "Help me start this problem over"]
    };
  }
};
