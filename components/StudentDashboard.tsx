
import React, { useState, useEffect, useMemo } from 'react';
import { User, Questionnaire, Question, Institution } from '../types';
import { BackendService, SubjectWithTeacher } from '../services/backend';
import { Card, CardContent, CardHeader, CardTitle, Button, Select, Label, Input } from './ui';
import { Lock, Send, CheckCircle2, AlertCircle, Star, User as UserIcon, BookOpen, PieChart as PieChartIcon, Check, CalendarClock } from 'lucide-react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  user: User;
}

export const StudentDashboard: React.FC<Props> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'survey' | 'stats'>('survey');
  const [data, setData] = useState<{questionnaire: Questionnaire, subjects: SubjectWithTeacher[]} | null>(null);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [progress, setProgress] = useState<{completed: number, pending: number}>({ completed: 0, pending: 0 });
  
  // Estados para seleção em duas etapas
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  
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
                    // Calculo de pendentes aproximado: total subjects - completed (simplified)
                    const totalSubjects = d.subjects.length;
                    setProgress({ completed: p.completed, pending: Math.max(0, totalSubjects - p.completed) });
                });
            }
        });
    }
  }, [user.institutionId, user.id]);

  // Filtrar disciplinas disponíveis para o aluno com base nos Turnos e Turmas
  const mySubjects = useMemo(() => {
      if (!data) return [];
      return data.subjects.filter(s => {
          // 1. Verificação de Turno: O turno da disciplina deve estar na lista de turnos do aluno
          const shiftMatch = s.shift && user.shifts ? user.shifts.includes(s.shift) : true;
          
          // 2. Verificação de Turma: Se a disciplina tem turma (ex: A), o aluno deve pertencer a essa turma.
          // Se a disciplina não tem turma definida, é visível para todos do turno.
          const classMatch = s.classGroup && user.classGroups 
                ? user.classGroups.includes(s.classGroup) 
                : true;

          // 3. Verificação de Curso
          const courseMatch = user.course && s.course ? s.course.toLowerCase().includes(user.course.toLowerCase()) || user.course.toLowerCase().includes(s.course.toLowerCase()) : true;
          
          return shiftMatch && classMatch && courseMatch;
      });
  }, [data, user.shifts, user.classGroups, user.course]);

  // Extrair lista única de docentes disponíveis baseada nas disciplinas FILTRADAS
  const uniqueTeachers = useMemo(() => {
      const seen = new Set();
      const teachers: { id: string, name: string }[] = [];
      
      mySubjects.forEach(s => {
          if (!seen.has(s.teacherId)) {
              seen.add(s.teacherId);
              teachers.push({ id: s.teacherId, name: s.teacherName });
          }
      });
      return teachers;
  }, [mySubjects]);

  // Filtrar disciplinas do docente selecionado (dentro do subset já filtrado)
  const availableSubjectsForTeacher = useMemo(() => {
      if (!selectedTeacherId) return [];
      return mySubjects.filter(s => s.teacherId === selectedTeacherId);
  }, [mySubjects, selectedTeacherId]);

  const handleTeacherChange = (teacherId: string) => {
      setSelectedTeacherId(teacherId);
      setSelectedSubjectId(''); // Reseta disciplina ao trocar docente
      setAnswers({});
  };

  const handleSubmit = async () => {
    if (!data || !selectedSubjectId || !user.institutionId) return;
    
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
            institutionId: user.institutionId,
            questionnaireId: data.questionnaire.id,
            subjectId: selectedSubjectId,
            teacherId: subject.teacherId,
            answers: Object.entries(answers).map(([k, v]) => ({ questionId: k, value: v }))
        });
        setSuccess(true);
        // Update stats
        setProgress(prev => ({ completed: prev.completed + 1, pending: Math.max(0, prev.pending - 1) }));
        setAnswers({});
        setSelectedSubjectId('');
        setSelectedTeacherId('');
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

  const chartData = [
      { name: 'Avaliado', value: progress.completed, color: '#22c55e' },
      { name: 'Pendente', value: progress.pending, color: '#e5e7eb' },
  ];
  
  const isEvaluationOpen = institution?.isEvaluationOpen ?? true; // Assume aberto se não definido

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-gray-900">{data.questionnaire.title}</h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2">
                Avaliação anónima
                {user.shifts && user.shifts.length > 0 && (
                    <span className="text-xs bg-black text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CalendarClock size={12}/> {user.shifts.join(' + ')}
                    </span>
                )}
                {user.classGroups && user.classGroups.length > 0 && (
                    <span className="text-xs border px-2 py-0.5 rounded-full bg-white">
                        Turmas: {user.classGroups.join(', ')}
                    </span>
                )}
            </p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setActiveTab('survey')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'survey' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>Avaliar</button>
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
                  <CardContent className="flex items-center justify-center">
                      <div className="w-full h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Legend />
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
                          <div className="text-3xl font-bold text-gray-400">{progress.pending}</div>
                          <p className="text-gray-500 text-sm">Disciplinas Pendentes (Estimado)</p>
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
            ) : (
                <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 text-xs text-blue-800 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                        <Lock className="h-3 w-3" /> 100% Anónimo e Seguro
                    </div>
                    {/* Selection Card */}
                    <Card>
                        <CardHeader className="bg-gray-50 border-b pb-4">
                            <CardTitle className="text-base text-gray-700">Seleção de Avaliação</CardTitle>
                            {uniqueTeachers.length === 0 && (
                                <p className="text-xs text-orange-500 mt-1 flex items-center gap-1">
                                    <AlertCircle size={12} />
                                    Nenhuma disciplina encontrada compatível com seus turnos ({user.shifts?.join(', ') || 'N/A'}).
                                </p>
                            )}
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <UserIcon className="h-4 w-4" /> 1. Selecione o Docente
                                    </Label>
                                    <Select 
                                        value={selectedTeacherId} 
                                        onChange={e => handleTeacherChange(e.target.value)} 
                                        className="bg-white"
                                        disabled={uniqueTeachers.length === 0}
                                    >
                                        <option value="">Escolha o docente...</option>
                                        {uniqueTeachers.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </Select>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <BookOpen className="h-4 w-4" /> 2. Selecione a Disciplina
                                    </Label>
                                    <Select 
                                        value={selectedSubjectId} 
                                        onChange={e => setSelectedSubjectId(e.target.value)} 
                                        className="bg-white"
                                        disabled={!selectedTeacherId}
                                    >
                                        <option value="">Escolha a disciplina...</option>
                                        {availableSubjectsForTeacher.length === 0 && selectedTeacherId && (
                                            <option disabled>Sem disciplinas compatíveis</option>
                                        )}
                                        {availableSubjectsForTeacher.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.name} ({s.code || 'S/C'}) - {s.shift} {s.classGroup ? `(Turma ${s.classGroup})` : ''}
                                            </option>
                                        ))}
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
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
        </>
      )}
    </div>
  );
};