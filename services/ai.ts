
import { Question } from "../types";

// Serviço de IA descontinuado/removido.
// Mantido apenas para evitar quebras de importação legada, se houver.

export const AIService = {
  async generateTeacherInsights(score: any, name: string): Promise<string> {
    return "Análise de IA não disponível.";
  },

  async convertDocumentToQuestions(base64Data: string, mimeType: string): Promise<Question[]> {
    console.warn("Funcionalidade de IA removida.");
    return [];
  }
};
