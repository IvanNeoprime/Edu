
import { CombinedScore, Question } from "../types";

// AI Service removed as per request.
export const AIService = {
  async generateTeacherInsights(score: CombinedScore, name: string): Promise<string> {
    return "Análise de IA desativada.";
  },

  async convertDocumentToQuestions(base64Data: string, mimeType: string): Promise<Question[]> {
    return [];
  }
};
