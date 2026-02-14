
import React, { useState, useEffect, useMemo } from 'react';
import { User, Questionnaire, Question, Institution } from '../types';
import { BackendService, SubjectWithTeacher } from '../services/backend';
import { Card, CardContent, CardHeader, CardTitle, Button, Select, Label, Input } from './ui';
import { Lock, Send, CheckCircle2, AlertCircle, Star, User as UserIcon, BookOpen, PieChart as PieChartIcon, Check, CalendarClock, ArrowRight, Library } from 'lucide-react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  user: User;
}

export const StudentDashboard: React.FC<Props> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'survey' | 'stats'>('survey');
  const [data, setData] = useState<{questionnaire: Questionnaire, subjects: SubjectWithTeacher[]} | null>(null);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [progress, setProgress] = useState<{completed: number, pending: number, evaluatedSubjectIds: string[]}>({ completed: 0, pending: 0, evaluatedSubjectIds: [] });
  
  // Estado para armazenar a disciplina que está sendo avaliada no momento
  const [currentSubject, setCurrentSubject] = useState<SubjectWithTeacher | null>(null);
  
  // Answer value can be string (for text/choice) or number
  const [answers, setAnswers] = useState<Record<string, string | number>>({}); 
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user.institutionId) {
        BackendService.getInstitution(user.institutionId).then(setInstitution);
        BackendService.getAvailableSurveys(user.institutionId).then(d => {
            setData(d);
            if(d) {
                BackendService.getStudentProgress(user.id).then(p => {
                    const totalSubjects = d.subjects.length; // This is raw total, not filtered yet
                    // No need to calculate global pending here, we do it in the view
                    setProgress({ 
                        completed: p.completed, 
                        pending: 0, 
                        evaluatedSubjectIds: p.evaluatedSubjectIds 
                    });
                });
            }
        });
    }
  }, [user.institutionId, user.id]);

  // Filtrar disciplinas disponíveis para o aluno AUTOMATICAMENTE baseado no Curso
  const mySubjects = useMemo(() => {
      if (!data) return [];
      return data.subjects.filter(s => {
          // 1. Verificação de Turno: O turno da disciplina deve estar na lista de turnos do aluno
          const shiftMatch = s.shift && user.shifts ? user.shifts.includes(s.shift) : true;
          
          // 2. Verificação de Turma: Se a disciplina tem turma (ex: A), o aluno deve pertencer a essa turma.
          const classMatch = s.classGroup && user.classGroups 
                ? user.classGroups.includes(s.classGroup) 
                : true;

          // 3. Verificação de Curso (CRÍTICO: Filtra apenas disciplinas do curso do aluno)
          const courseMatch = user.course && s.course 
                ? s.course.toLowerCase().includes(user.course.toLowerCase()) || user.course.toLowerCase().includes(s.course.toLowerCase()) 
                : true;
          
          return shiftMatch && classMatch && courseMatch;
      });
  }, [data, user.shifts, user.classGroups, user.course]);

  // Atualizar contadores baseados na lista filtrada
  const pendingCount = useMemo(() => {
      return mySubjects.filter(s => !progress.evaluatedSubjectIds.includes(s.id)).length;
  }, [mySubjects, progress.evaluatedSubjectIds]);

  const handleSubmit = async () => {
    if (!data || !currentSubject || !user.institutionId) return;
    
    const qCount = data.questionnaire.questions.length;
    const aCount = Object.keys(answers).length;
    
    if (aCount < qCount) {
        alert(`Por favor responda todas as questões.`);
        return;
    }

    setSubmitting(true);
    try {
        await BackendService.submitAnonymousResponse(user.id, {
            institutionId: user.institutionId,
            questionnaireId: data.questionnaire.id,
            subjectId: currentSubject.id,
            teacherId: currentSubject.teacherId,
            answers: Object.entries(answers).map(([k, v]) => ({ questionId: k, value: v }))
        });
        setSuccess(true);
        // Atualiza progresso localmente
        setProgress(prev => ({ 
            ...prev, 
            completed: prev.completed + 1, 
            evaluatedSubjectIds: [...prev.evaluatedSubjectIds, currentSubject.id] 
        }));
        
        setAnswers({});
        setTimeout(() => {
            setSuccess(false);
            setCurrentSubject(null); // Volta para a lista
        }, 2000);
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
                      <div className="flex gap-1 overflow-x-auto pb-2">
                        {[0,1,2,3,4,5,6,7,8,9,10].map(num => (
                             <button
                                key={num}
                                onClick={() => setAnswers(prev => ({ ...prev, [q.id]: num }))}
                                className={`h-10 w-10 shrink-0 rounded-md text-sm font-medium border transition-all ${
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

  const chartData = [
      { name: 'Avaliado', value: progress.completed, color: '#22c55e' },
      { name: 'Pendente', value: pendingCount, color: '#e5e7eb' },
  ];
  
  const isEvaluationOpen = institution?.isEvaluationOpen ?? true; 

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b pb-6">
        <div>
            <h1 className="text-3xl font-bold text-gray-900">{institution?.name || 'Painel do Estudante'}</h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2">
                <span className="font-semibold text-gray-700">{user.course || 'Curso Geral'}</span>
                <span className="text-gray-300">•</span>
                {user.shifts && user.shifts.length > 0 && (
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full flex items-center gap-1 border">
                        <CalendarClock size={12}/> {user.shifts.join(' + ')}
                    </span>
                )}
            </p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg shrink-0">
            <button onClick={() => setActiveTab('survey')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'survey' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>Avaliações</button>
            <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'stats' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>Meu Progresso</button>
        </div>
      </header>

      {/* --- ABA MEU PROGRESSO --- */}
      {activeTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                  <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2"><Check className="h-4 w-4"/> Status de Avaliação</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                      {/* FIX: Container com altura explícita para evitar erro do Recharts */}
                      <div className="w-full h-[250px] min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Legend verticalAlign="bottom" height={36}/>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                      </div>
                  </CardContent>
              </Card>
              <div className="space-y-4">
                  <Card>
                      <CardContent className="pt-6">
                          <div className="text-3xl font-bold text-green-600">{progress.completed}</div>
                          <p className="text-gray-500 text-sm">Disciplinas Avaliadas</p>
                      </CardContent>
                  </Card>
                  <Card>
                      <CardContent className="pt-6">
                          <div className="text-3xl font-bold text-gray-400">{pendingCount}</div>
                          <p className="text-gray-500 text-sm">Disciplinas Pendentes</p>
                      </CardContent>
                  </Card>
              </div>
          </div>
      )}

      {/* --- ABA AVALIAR --- */}
      {activeTab === 'survey' && (
        <>
            {success ? (
                <Card className="bg-green-50 border-green-200 animate-in zoom-in duration-300">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-green-800">
                        <CheckCircle2 className="h-16 w-16 mb-4" />
                        <h2 className="text-xl font-bold">Obrigado!</h2>
                        <p>Sua avaliação foi registrada com sucesso.</p>
                    </CardContent>
                </Card>
            ) : !isEvaluationOpen ? (
                <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-yellow-800">
                        <Lock className="h-12 w-12 mb-4" />
                        <h2 className="text-xl font-bold">Período de Avaliação Fechado</h2>
                        <p className="text-center">O período para submissão de avaliações ("{institution?.evaluationPeriodName || 'Atual'}") foi encerrado pela instituição.</p>
                    </CardContent>
                </Card>
            ) : currentSubject ? (
                // --- FORMULÁRIO DE AVALIAÇÃO ---
                <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <button 
                            onClick={() => { setCurrentSubject(null); setAnswers({}); }}
                            className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
                        >
                            ← Voltar para lista
                        </button>
                        <div className="inline-flex items-center gap-2 text-xs text-blue-800 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                            <Lock className="h-3 w-3" /> Avaliação Anónima
                        </div>
                    </div>

                    <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg mb-6">
                        <h2 className="text-2xl font-bold">{currentSubject.name}</h2>
                        <p className="text-slate-400 flex items-center gap-2 mt-1">
                            <UserIcon size={16}/> {currentSubject.teacherName}
                        </p>
                    </div>

                    {data.questionnaire.questions.map((q, idx) => (
                        <Card key={q.id} className="overflow-visible border-l-4 border-l-transparent hover:border-l-blue-500 transition-all">
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

                    <div className="sticky bottom-4 pt-4 pb-8 bg-gradient-to-t from-gray-50 via-gray-50/90 to-transparent pointer-events-none flex justify-center z-10">
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
            ) : (
                // --- LISTA DE DISCIPLINAS (GRID) ---
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <Library className="h-5 w-5"/> Minhas Disciplinas
                        </h2>
                        {mySubjects.length === 0 && (
                            <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-md border border-orange-100">
                                Nenhuma encontrada para seu turno/turma.
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {mySubjects.map(subject => {
                            const isEvaluated = progress.evaluatedSubjectIds.includes(subject.id);
                            return (
                                <div 
                                    key={subject.id} 
                                    className={`relative group bg-white border rounded-xl p-5 shadow-sm transition-all duration-300 ${isEvaluated ? 'opacity-75 hover:opacity-100 border-green-200' : 'hover:shadow-md hover:border-blue-300 border-gray-200'}`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className={`p-2 rounded-lg ${isEvaluated ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                                            <BookOpen size={20} />
                                        </div>
                                        {isEvaluated ? (
                                            <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full flex items-center gap-1">
                                                <CheckCircle2 size={12}/> Concluído
                                            </span>
                                        ) : (
                                            <span className="text-xs font-bold text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full flex items-center gap-1">
                                                Pendente
                                            </span>
                                        )}
                                    </div>
                                    
                                    <h3 className="font-bold text-gray-900 mb-1 line-clamp-1" title={subject.name}>{subject.name}</h3>
                                    <p className="text-sm text-gray-500 mb-4 flex items-center gap-1">
                                        <UserIcon size={12}/> {subject.teacherName}
                                    </p>
                                    
                                    <div className="text-xs text-gray-400 mb-4 flex gap-2">
                                        <span className="bg-gray-50 px-1.5 py-0.5 rounded border">{subject.shift}</span>
                                        {subject.classGroup && <span className="bg-gray-50 px-1.5 py-0.5 rounded border">Turma {subject.classGroup}</span>}
                                    </div>

                                    <Button 
                                        onClick={() => setCurrentSubject(subject)}
                                        disabled={isEvaluated}
                                        variant={isEvaluated ? "outline" : "primary"}
                                        className="w-full"
                                    >
                                        {isEvaluated ? 'Avaliado' : 'Avaliar Agora'} 
                                        {!isEvaluated && <ArrowRight size={14} className="ml-2"/>}
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
      )}
    </div>
  );
};
