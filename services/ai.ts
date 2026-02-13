
import { Question, CombinedScore } from "../types";
import { GoogleGenAI, Type } from "@google/genai";

// Implementação moderna usando Google Gemini SDK
export const AIService = {
  /**
   * Gera uma análise qualitativa inteligente baseada nos scores do docente.
   */
  async generateTeacherInsights(score: CombinedScore, name: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const prompt = `
        Aja como um consultor pedagógico sénior. Analise o desempenho do docente ${name}:
        - Média Final: ${score.finalScore}/20
        - Avaliação dos Alunos: ${score.studentScore}/20
        - Auto-Avaliação: ${score.selfEvalScore}/20
        - Nota Institucional: ${score.institutionalScore}/20

        Forneça um feedback construtivo, motivador e focado em melhoria contínua em Português de Moçambique. 
        Seja conciso (máximo 150 palavras).
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      return response.text || "Não foi possível gerar insights automáticos no momento.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "O serviço de análise inteligente está temporariamente indisponível.";
    }
  },

  /**
   * Sugere questões para inquéritos com base em tópicos pedagógicos.
   */
  async suggestQuestions(topic: string): Promise<Question[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Gere 5 perguntas de avaliação docente sobre o tema: "${topic}".`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                text: { type: Type.STRING },
                type: { type: Type.STRING, description: "stars, binary, or scale_10" },
                weight: { type: Type.NUMBER }
              },
              required: ["id", "text", "type", "weight"]
            }
          }
        }
      });

      return JSON.parse(response.text || "[]");
    } catch (error) {
      console.error("Gemini Error:", error);
      return [];
    }
  }
};
