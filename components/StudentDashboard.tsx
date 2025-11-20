
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
    
    // Basic validation: Allow empty text answers, enforce others? 
    // For now enforcing all fields.
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

  // --- Dynamic Question Renderer ---
  const renderQuestionInput = (q: Question) => {
      const val = answers[q.id];

      switch (q.type) {
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
                                  className={`h-8 w-8 ${(val as number) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                              />
                          </button>
                      ))}
                  </div>
              );
          
          case 'scale_10':
              return (
                  <div className="space-y-2 w-full max-w-md">
                      <div className="flex justify-between text-xs text-gray-500 px-1">
                          <span>0 (Ruim)</span>
                          <span>10 (Excelente)</span>
                      </div>
                      <div className="flex gap-1">
                        {[0,1,2,3,4,5,6,7,8,9,10].map(num => (
                             <button
                                key={num}
                                onClick={() => setAnswers(prev => ({ ...prev, [q.id]: num }))}
                                className={`flex-1 h-10 rounded-md text-sm font-medium border transition-all ${
                                    val === num 
                                    ? 'bg-blue-600 text-white border-blue-700 shadow-md scale-110' 
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                }`}
                             >
                                 {num}
                             </button>
                        ))}
                      </div>
                  </div>
              );

          case 'binary':
              return (
                  <div className="flex gap-4">
                      <button 
                        onClick={() => setAnswers(prev => ({...prev, [q.id]: 0}))}
                        className={`flex-1 py-2 px-4 rounded-md border text-sm font-medium transition-all ${
                            val === 0 ? 'bg-red-100 text-red-800 border-red-300 ring-2 ring-red-200' : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                          Não
                      </button>
                      <button 
                        onClick={() => setAnswers(prev => ({...prev, [q.id]: 1}))}
                        className={`flex-1 py-2 px-4 rounded-md border text-sm font-medium transition-all ${
                            val === 1 ? 'bg-green-100 text-green-800 border-green-300 ring-2 ring-green-200' : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                          Sim
                      </button>
                  </div>
              );

          case 'choice':
              return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                      {q.options?.map((opt) => (
                          <button
                              key={opt}
                              onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                              className={`py-2 px-4 rounded-md border text-sm text-left transition-all ${
                                  val === opt 
                                  ? 'bg-slate-800 text-white border-slate-900' 
                                  : 'bg-white text-gray-700 hover:bg-gray-50'
                              }`}
                          >
                              {opt}
                          </button>
                      ))}
                  </div>
              );

          case 'text':
              return (
                  <textarea
                      className="w-full min-h-[100px] p-3 rounded-md border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y"
                      placeholder="Digite sua resposta ou sugestão aqui..."
                      value={val as string || ''}
                      onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  />
              );

          default:
              return null;
      }
  };

  if (!data) return <div className="p-8 text-center animate-pulse">Carregando questionários...</div>;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="text-center md:text-left">
        <h1 className="text-3xl font-bold text-gray-900">{data.questionnaire.title}</h1>
        <p className="text-gray-500 mt-1">Avaliação anónima de desempenho docente</p>
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
                    <Label>Selecione a Disciplina</Label>
                    <Select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} className="mt-2 bg-white">
                        <option value="">Escolha...</option>
                        {data.subjects.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.name} — Prof. {s.teacherName}
                            </option>
                        ))}
                    </Select>
                </CardHeader>
            </Card>

            {selectedSubjectId && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
                    {data.questionnaire.questions.map((q, idx) => (
                        <Card key={q.id} className="overflow-visible">
                            <CardContent className="pt-6">
                                <div className="mb-4">
                                    <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded mr-2">
                                        #{idx + 1}
                                    </span>
                                    <span className="font-medium text-gray-900 text-lg block mt-1">{q.text}</span>
                                </div>
                                <div className="mt-2">
                                    {renderQuestionInput(q)}
                                </div>
                            </CardContent>
                        </Card>
                    ))}

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
