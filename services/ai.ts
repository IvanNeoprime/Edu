
import { Question } from "../types";
import { GoogleGenAI, Type } from "@google/genai";

// Implementação do serviço de IA usando a API Gemini 3
export const AIService = {
  /**
   * Gera insights pedagógicos sobre o desempenho do docente com base nos scores.
   */
  async generateTeacherInsights(score: any, name: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analise o desempenho do docente ${name} que obteve os seguintes scores: 
        Média Final: ${score?.finalScore || 0}/20, 
        Avaliação dos Alunos: ${score?.studentScore || 0}/20, 
        Auto-Avaliação: ${score?.selfEvalScore || 0}/20, 
        Nota Institucional: ${score?.institutionalScore || 0}/20. 
        Forneça um parágrafo construtivo e motivador em Português de Moçambique.`,
      });
      return response.text || "Análise de IA temporariamente indisponível.";
    } catch (error) {
      console.error("Gemini AI Error:", error);
      return "Não foi possível gerar a análise inteligente.";
    }
  },

  /**
   * Converte conteúdo de documentos em questões estruturadas para o sistema.
   */
  async convertDocumentToQuestions(base64Data: string, mimeType: string): Promise<Question[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: "Extraia 5 perguntas para um inquérito de avaliação docente deste documento. Retorne apenas um array JSON válido de objetos Question.",
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                text: { type: Type.STRING },
                type: { 
                    type: Type.STRING,
                    description: "Tipos permitidos: stars, binary, text"
                },
              },
              required: ["id", "text", "type"],
            },
          },
        },
      });

      const jsonStr = response.text || "[]";
      return JSON.parse(jsonStr.trim());
    } catch (error) {
      console.error("Gemini AI Error:", error);
      return [];
    }
  }
};
