
import React, { useState, useEffect, useMemo } from 'react';
import { User, Questionnaire, Question, Institution } from '../types';
import { BackendService, SubjectWithTeacher } from '../services/backend';
import { Card, CardContent, CardHeader, CardTitle, Button, Select, Label, cn } from './ui';
import { Lock, CheckCircle2, Star, User as UserIcon, BookOpen, Hash, MessageSquare, AlertCircle, ArrowRight } from 'lucide-react';

interface Props {
  user: User;
}

export const StudentDashboard: React.FC<Props> = ({ user }) => {
  const [data, setData] = useState<{questionnaire: Questionnaire, subjects: SubjectWithTeacher[]} | null>(null);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [progress, setProgress] = useState<{completed: number, pending: number}>({ completed: 0, pending: 0 });
  
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  
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
                    setProgress({ completed: p.completed, pending: 0 });
                });
            }
        });
    }
  }, [user.institutionId, user.id]);

  const mySubjects = useMemo(() => {
      if (!data) return [];
      return data.subjects.filter(s => {
          const studentCourse = user.course?.trim().toLowerCase();
          const subjectCourse = s.course?.trim().toLowerCase();
          const courseMatch = !studentCourse || !subjectCourse || subjectCourse === studentCourse;
          const levelMatch = !user.level || !s.level || String(user.level) === String(s.level);
          const shiftMatch = !s.shift || !user.shifts || user.shifts.includes(s.shift);
          const groupMatch = !s.classGroup || !user.classGroups || user.classGroups.includes(s.classGroup);
          return courseMatch && levelMatch && shiftMatch && groupMatch;
      });
  }, [data, user]);

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

  const availableSubjectsForTeacher = useMemo(() => {
      if (!selectedTeacherId) return [];
      return mySubjects.filter(s => s.teacherId === selectedTeacherId);
  }, [mySubjects, selectedTeacherId]);

  const handleSubmit = async () => {
    if (!data || !selectedSubjectId || !user.institutionId) return;
    
    const qCount = data.questionnaire.questions.length;
    const aCount = Object.keys(answers).length;
    
    if (aCount < qCount) return alert(`Por favor, preencha todas as perguntas do inquérito antes de submeter.`);

    setSubmitting(true);
    try {
        const subject = data.subjects.find(s => s.id === selectedSubjectId);
        if (!subject) throw new Error("Cadeira não encontrada");

        await BackendService.submitAnonymousResponse(user.id, {
            institutionId: user.institutionId,
            questionnaireId: data.questionnaire.id,
            subjectId: selectedSubjectId,
            teacherId: subject.teacherId,
            answers: Object.entries(answers).map(([k, v]) => ({ questionId: k, value: v }))
        });
        setSuccess(true);
        setProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
        setAnswers({});
        setSelectedSubjectId('');
        setSelectedTeacherId('');
        setTimeout(() => setSuccess(false), 4000);
    } catch (e: any) {
        alert(e.message || "Erro de submissão");
    } finally {
        setSubmitting(false);
    }
  };

  const renderQuestionInput = (q: Question) => {
      const val = answers[q.id];
      const setV = (v: any) => setAnswers(prev => ({ ...prev, [q.id]: v }));

      switch (q.type) {
          case 'stars':
              return (
                  <div className="flex gap-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                          <button key={star} onClick={() => setV(star)} className="focus:outline-none transition-all hover:scale-125">
                              <Star className={cn("h-12 w-12", (val as number) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200')} />
                          </button>
                      ))}
                  </div>
              );
          case 'binary':
              return (
                  <div className="flex gap-4 max-w-sm">
                      <button onClick={() => setV(1)} className={cn("flex-1 py-5 rounded-2xl border-2 font-black text-lg transition-all", val === 1 ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50')}>SIM</button>
                      <button onClick={() => setV(0)} className={cn("flex-1 py-5 rounded-2xl border-2 font-black text-lg transition-all", val === 0 ? 'bg-red-100 border-red-500 text-red-700' : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50')}>NÃO</button>
                  </div>
              );
          case 'scale_10':
              return (
                  <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                          <button key={n} onClick={() => setV(n)} className={cn("h-11 w-11 rounded-xl border-2 font-black text-sm transition-all", val === n ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400 hover:border-blue-200')}>{n}</button>
                      ))}
                  </div>
              );
          case 'text':
              return <textarea className="w-full p-5 rounded-2xl border-2 border-gray-100 bg-white text-gray-900 focus:border-blue-400 transition-all text-sm outline-none shadow-sm" rows={4} placeholder="Diga-nos o que pensa com honestidade..." value={val as string || ''} onChange={(e) => setV(e.target.value)} />;
          default:
              return null;
      }
  };

  if (!data) return <div className="p-8 text-center animate-pulse text-gray-400 font-bold uppercase tracking-widest">Carregando portal académico...</div>;

  const isEvaluationOpen = institution?.isEvaluationOpen ?? true;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-fade-in pb-24 transition-colors">
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-6 border-b pb-10">
        <div className="flex items-center gap-6">
            <div className="h-20 w-20 bg-black rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl rotate-3">
                <BookOpen size={40} strokeWidth={2.5} />
            </div>
            <div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Avaliação de Ensino</h1>
                <p className="text-gray-500 font-bold text-sm flex items-center gap-2">
                   {user.course} • {user.level}º ANO • {institution?.evaluationPeriodName || 'Semestre 1'}
                </p>
            </div>
        </div>
      </header>

      {success ? (
          <Card className="bg-green-50 border-green-200 py-24 text-center animate-in zoom-in shadow-2xl rounded-[3rem]">
              <div className="h-24 w-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8 text-white shadow-lg animate-bounce">
                <CheckCircle2 size={48} />
              </div>
              <h2 className="text-4xl font-black text-green-900 uppercase tracking-tighter">Obrigado pela sua voz!</h2>
              <p className="text-green-700 mt-4 text-lg font-medium">Sua avaliação anónima foi registada com sucesso.</p>
              <Button onClick={() => window.location.reload()} variant="outline" className="mt-10 rounded-2xl px-10 h-14 font-black">FAZER NOVA AVALIAÇÃO</Button>
          </Card>
      ) : !isEvaluationOpen ? (
          <Card className="bg-yellow-50 border-yellow-200 py-20 text-center rounded-[3rem] shadow-xl">
              <Lock className="h-20 w-20 mx-auto mb-8 text-yellow-600 opacity-40" />
              <h2 className="text-3xl font-black text-yellow-900 tracking-tight uppercase">Portal Fechado</h2>
              <p className="text-yellow-700 mt-2 font-medium">O período de submissões para este semestre encontra-se encerrado.</p>
          </Card>
      ) : (
          <div className="space-y-8">
              <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden">
                  <CardHeader className="bg-gray-50/50 border-b p-8">
                      <CardTitle className="text-xl flex items-center gap-3 uppercase font-black tracking-tight">
                        <ArrowRight className="text-blue-600" size={24}/> Identificação da Aula
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-4">
                          <Label className="font-black text-gray-700 uppercase tracking-widest text-xs">Selecione o Docente</Label>
                          <Select value={selectedTeacherId} onChange={e => { setSelectedTeacherId(e.target.value); setSelectedSubjectId(''); }} className="h-14 text-lg font-bold">
                              <option value="">-- LISTA DE DOCENTES --</option>
                              {uniqueTeachers.map(t => <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>)}
                          </Select>
                      </div>
                      <div className="space-y-4">
                          <Label className="font-black text-gray-700 uppercase tracking-widest text-xs">Selecione a Cadeira</Label>
                          <Select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} disabled={!selectedTeacherId} className="h-14 text-lg font-bold">
                              <option value="">-- CADEIRAS VINCULADAS --</option>
                              {availableSubjectsForTeacher.map(s => (
                                  <option key={s.id} value={s.id}>
                                      {s.name.toUpperCase()} (SEM {s.semester})
                                  </option>
                              ))}
                          </Select>
                      </div>
                  </CardContent>
              </Card>

              {selectedSubjectId && (
                  <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-500">
                      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 rounded-[2rem] text-white shadow-2xl flex items-start gap-5">
                          <AlertCircle size={32} className="shrink-0 text-blue-200 mt-1" />
                          <div className="space-y-2">
                              <p className="font-black text-2xl uppercase tracking-tighter leading-none">Aviso de Privacidade</p>
                              <p className="text-blue-100 text-sm font-medium leading-relaxed">Suas respostas são encriptadas e armazenadas de forma que ninguém, nem o gestor nem o docente, pode identificar o autor. Sua honestidade é o que melhora o ensino.</p>
                          </div>
                      </div>

                      <div className="space-y-6">
                        {data.questionnaire.questions.map((q, idx) => (
                            <Card key={q.id} className="border-none shadow-xl hover:shadow-2xl transition-all rounded-[2rem] overflow-hidden group">
                                <CardContent className="p-10">
                                    <div className="flex gap-6 items-start mb-8">
                                        <div className="h-10 w-10 bg-gray-900 text-white rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-lg group-hover:scale-110 transition-transform">{idx + 1}</div>
                                        <p className="font-black text-2xl text-gray-900 leading-tight tracking-tight">{q.text}</p>
                                    </div>
                                    <div className="md:pl-16">
                                        {renderQuestionInput(q)}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                      </div>

                      <div className="pt-10">
                        <Button size="lg" className="w-full bg-black hover:bg-gray-800 h-20 text-2xl font-black rounded-[2rem] shadow-2xl transition-all active:scale-95 text-white" onClick={handleSubmit} disabled={submitting}>
                            {submitting ? 'PROCESSANDO INQUÉRITO...' : 'SUBMETER AVALIAÇÃO AGORA'}
                        </Button>
                        <p className="text-center text-gray-400 text-[10px] font-black uppercase tracking-widest mt-6">Ao submeter, os dados tornam-se propriedade estatística da instituição</p>
                      </div>
                  </div>
              )}
          </div>
      )}
    </div>
  );
};
