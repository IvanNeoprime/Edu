
import { GoogleGenAI } from "@google/genai";
import { CombinedScore } from "../types";

// Inicializa o cliente apenas se a chave estiver disponível
const apiKey = process.env.API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const AIService = {
  async generateTeacherInsights(score: CombinedScore, name: string): Promise<string> {
    if (!ai) {
      console.warn("API Key do Gemini não configurada.");
      return "Análise de IA indisponível no momento.";
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-latest",
        contents: `Aja como um consultor pedagógico universitário sênior.
        Analise os dados do docente: ${name}.
        
        DADOS DE PERFORMANCE:
        - Nota Final: ${score.finalScore}/100
        - Avaliação dos Alunos: ${score.studentScore} pontos (Peso 12%)
        - Auto-Avaliação: ${score.selfEvalScore} pontos (Peso 80%)
        - Avaliação Institucional: ${score.institutionalScore} pontos (Peso 8%)

        INSTRUÇÃO:
        Gere uma análise muito breve (máximo 2 frases) e construtiva. Fale diretamente com o docente.
        Se a nota for alta, parabenize com foco em excelência.
        Se a nota for baixa, sugira foco na relação pedagógica ou produção científica.`,
      });
      return response.text || "Continue com o bom trabalho.";
    } catch (e) {
      console.error("Erro na IA:", e);
      return "Não foi possível gerar a análise inteligente no momento.";
    }
  }
};
