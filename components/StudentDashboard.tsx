import React, { useState, useEffect } from 'react';
import { User, Questionnaire, Question } from '../types';
import { BackendService, SubjectWithTeacher } from '../services/backend';
import { Card, CardContent, CardHeader, CardTitle, Button, Select, Label, Input } from './ui';
import { Lock, Send, CheckCircle2, AlertCircle, Star } from 'lucide-react';

interface Props {
  user: User;
}

export const StudentDashboard: React.FC<Props> = ({ user }) => {
  const [data, setData] = useState<{questionnaire: Questionnaire, subjects: SubjectWithTeacher[]} | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  // Answer value can be string (for text/choice) or number
  const [answers, setAnswers] = useState<Record<string, string | number>>({}); 
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user.institutionId) {
        BackendService.getAvailableSurveys(user.institutionId).then(setData);
    }
  }, [user.institutionId]);

  const handleSubmit = async () => {
    if (!data || !selectedSubjectId) return;
    
    const qCount = data.questionnaire.questions.length;
    const aCount = Object.keys(answers).length;
    
    if (aCount < qCount) {
        alert(`Por favor responda todas as questões.`);
        return;
    }

    setSubmitting(true);
    try {
        const subject = data.subjects.find(s => s.id === selectedSubjectId);
        if (!subject) throw new Error("Disciplina inválida");

        await BackendService.submitAnonymousResponse(user.id, {
            questionnaireId: data.questionnaire.id,
            subjectId: selectedSubjectId,
            teacherId: subject.teacherId,
            answers: Object.entries(answers).map(([k, v]) => ({ questionId: k, value: v }))
        });
        setSuccess(true);
        setAnswers({});
        setSelectedSubjectId('');
        setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
        alert(e.message || "Erro ao submeter");
    } finally {
        setSubmitting(false);
    }
  };

  // Group questions by category
  const groupedQuestions = React.useMemo<Record<string, Question[]>>(() => {
      if (!data?.questionnaire) return {};
      const groups: Record<string, Question[]> = {};
      data.questionnaire.questions.forEach(q => {
          const cat = q.category || 'Outros';
          if (!groups[cat]) groups[cat] = [];
          groups[cat].push(q);
      });
      return groups;
  }, [data?.questionnaire]);

  const renderQuestionInput = (q: Question) => {
      const val = answers[q.id];

      switch (q.type) {
          case 'binary':
              return (
                  <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setAnswers(prev => ({...prev, [q.id]: 0}))}
                        className={`px-4 py-1.5 rounded-md border text-sm font-medium transition-all ${
                            val === 0 ? 'bg-red-600 text-white border-red-600' : 'bg-white hover:bg-red-50 text-gray-700'
                        }`}
                      >
                          Não
                      </button>
                      <button 
                        onClick={() => setAnswers(prev => ({...prev, [q.id]: 1}))}
                        className={`px-4 py-1.5 rounded-md border text-sm font-medium transition-all ${
                            val === 1 ? 'bg-green-600 text-white border-green-600' : 'bg-white hover:bg-green-50 text-gray-700'
                        }`}
                      >
                          Sim
                      </button>
                  </div>
              );
          
          case 'stars':
              return (
                  <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                          <button
                              key={star}
                              onClick={() => setAnswers(prev => ({ ...prev, [q.id]: star }))}
                              className="focus:outline-none transition-transform active:scale-95"
                          >
                              <Star 
                                  className={`h-6 w-6 ${(val as number) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                              />
                          </button>
                      ))}
                  </div>
              );
          
          default:
              return (
                  <input 
                      type="text" 
                      className="w-full border p-2 rounded" 
                      placeholder="Sua resposta..." 
                      value={val as string || ''}
                      onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  />
              );
      }
  };

  if (!data) return <div className="p-8 text-center animate-pulse">Carregando questionários...</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="text-center md:text-left">
        <h1 className="text-3xl font-bold text-gray-900">FICHA DE AVALIAÇÃO DO DESEMPENHO</h1>
        <p className="text-gray-500 mt-1">Avaliação do Docente pelo Estudante</p>
        <div className="mt-3 inline-flex items-center gap-2 text-xs text-blue-800 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
            <Lock className="h-3 w-3" /> 100% Anónimo e Seguro
        </div>
      </header>

      {success ? (
          <Card className="bg-green-50 border-green-200 animate-in zoom-in duration-300">
              <CardContent className="flex flex-col items-center justify-center py-12 text-green-800">
                  <CheckCircle2 className="h-16 w-16 mb-4" />
                  <h2 className="text-xl font-bold">Obrigado!</h2>
                  <p>Sua avaliação foi registrada com sucesso.</p>
              </CardContent>
          </Card>
      ) : (
        <div className="space-y-6">
            <Card>
                <CardHeader className="bg-gray-50 border-b pb-4">
                    <Label>Selecione a Disciplina e Docente</Label>
                    <Select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} className="mt-2 bg-white">
                        <option value="">Escolha...</option>
                        {data.subjects.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.name} — {s.teacherName}
                            </option>
                        ))}
                    </Select>
                </CardHeader>
            </Card>

            {selectedSubjectId && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
                    
                    {/* INSTRUÇÕES */}
                    <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-900 border border-blue-100">
                        <strong>INSTRUÇÕES:</strong>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>Responda as questões usando "Sim" ou "Não".</li>
                            <li>Cada parâmetro tem uma única opção de resposta.</li>
                        </ul>
                    </div>

                    <Card>
                        <CardContent className="p-0">
                             <div className="w-full text-left border-collapse">
                                <div className="bg-gray-800 text-white grid grid-cols-12 text-sm font-semibold p-3 rounded-t-lg">
                                    <div className="col-span-2 md:col-span-1 text-center">Cod</div>
                                    <div className="col-span-7 md:col-span-9">Descrição (Parâmetro)</div>
                                    <div className="col-span-3 md:col-span-2 text-center">Resposta</div>
                                </div>
                                
                                {Object.entries(groupedQuestions).map(([category, questions]: [string, Question[]]) => (
                                    <div key={category} className="border-b last:border-0">
                                        <div className="bg-gray-100 p-3 font-bold text-gray-700 text-sm border-y border-gray-200">
                                            INDICADOR: {category}
                                        </div>
                                        {questions.map((q, idx) => (
                                            <div key={q.id} className="grid grid-cols-12 p-3 items-center hover:bg-gray-50 border-b last:border-0">
                                                <div className="col-span-2 md:col-span-1 text-center font-mono text-xs text-gray-500">
                                                    {q.code || q.id}
                                                </div>
                                                <div className="col-span-7 md:col-span-9 text-sm text-gray-900 pr-4">
                                                    {q.text}
                                                </div>
                                                <div className="col-span-3 md:col-span-2 flex justify-center">
                                                    {renderQuestionInput(q)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                             </div>
                        </CardContent>
                    </Card>

                    <div className="sticky bottom-4 pt-4 pb-8 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none flex justify-center">
                        <Button 
                            size="lg" 
                            className="w-full max-w-sm shadow-xl text-base font-semibold h-12 bg-black hover:bg-gray-800 pointer-events-auto" 
                            onClick={handleSubmit} 
                            disabled={submitting}
                        >
                            {submitting ? 'Enviando...' : <><Send className="mr-2 h-4 w-4" /> Enviar Avaliação</>}
                        </Button>
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
};