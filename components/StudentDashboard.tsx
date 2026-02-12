
import React, { useState, useEffect, useMemo } from 'react';
import { User, Questionnaire, Question, Institution } from '../types';
import { BackendService, SubjectWithTeacher } from '../services/backend';
import { Card, CardContent, CardHeader, CardTitle, Button, Select, Label, cn } from './ui';
import { Lock, CheckCircle2, Star, User as UserIcon, BookOpen, Hash, MessageSquare, AlertCircle } from 'lucide-react';

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
    
    if (aCount < qCount) return alert(`Por favor responda todas as questões antes de submeter.`);

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
        setProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
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

  const renderQuestionInput = (q: Question) => {
      const val = answers[q.id];
      const setV = (v: any) => setAnswers(prev => ({ ...prev, [q.id]: v }));

      switch (q.type) {
          case 'stars':
              return (
                  <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                          <button key={star} onClick={() => setV(star)} className="focus:outline-none transition-transform hover:scale-110">
                              <Star className={cn("h-10 w-10", (val as number) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200')} />
                          </button>
                      ))}
                  </div>
              );
          case 'binary':
              return (
                  <div className="flex gap-4">
                      <button onClick={() => setV(1)} className={cn("flex-1 py-4 rounded-2xl border-2 font-bold transition-all", val === 1 ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50')}>SIM</button>
                      <button onClick={() => setV(0)} className={cn("flex-1 py-4 rounded-2xl border-2 font-bold transition-all", val === 0 ? 'bg-red-100 border-red-500 text-red-700' : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50')}>NÃO</button>
                  </div>
              );
          case 'scale_10':
              return (
                  <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                          <button key={n} onClick={() => setV(n)} className={cn("h-10 w-10 rounded-lg border-2 font-bold text-xs transition-all", val === n ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-gray-100 text-gray-400 hover:border-purple-200')}>{n}</button>
                      ))}
                  </div>
              );
          case 'text':
              return <textarea className="w-full p-4 rounded-2xl border-2 border-gray-100 focus:border-blue-400 transition-all text-sm outline-none" rows={3} placeholder="Sua opinião sincera..." value={val as string || ''} onChange={(e) => setV(e.target.value)} />;
          default:
              return null;
      }
  };

  if (!data) return <div className="p-8 text-center animate-pulse text-gray-400">Ligando ao portal universitário...</div>;

  const isEvaluationOpen = institution?.isEvaluationOpen ?? true;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b pb-8">
        <div className="flex items-center gap-5">
            <div className="h-16 w-16 bg-black rounded-3xl flex items-center justify-center text-white shadow-xl rotate-3">
                <BookOpen size={32} />
            </div>
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Avaliação Semestral</h1>
                <p className="text-gray-500 font-medium flex items-center gap-2">
                   {user.course} • {user.level}º Ano • {institution?.evaluationPeriodName || 'Semestre 1'}
                </p>
            </div>
        </div>
      </header>

      {success ? (
          <Card className="bg-green-50 border-green-200 py-20 text-center animate-in zoom-in shadow-2xl rounded-3xl">
              <div className="h-20 w-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-lg">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-3xl font-black text-green-900">Submissão Concluída!</h2>
              <p className="text-green-700 mt-2">Sua voz ajuda a melhorar o ensino em Moçambique.</p>
              <Button onClick={() => window.location.reload()} variant="outline" className="mt-8">Fazer Nova Avaliação</Button>
          </Card>
      ) : !isEvaluationOpen ? (
          <Card className="bg-yellow-50 border-yellow-200 py-16 text-center rounded-3xl">
              <Lock className="h-16 w-16 mx-auto mb-6 text-yellow-600 opacity-50" />
              <h2 className="text-2xl font-black text-yellow-900 tracking-tight">Portal Temporariamente Indisponível</h2>
              <p className="text-yellow-700">O período de submissões está encerrado ou ainda não iniciou.</p>
          </Card>
      ) : (
          <div className="space-y-8">
              <Card className="border-none shadow-xl bg-white rounded-3xl">
                  <CardHeader className="bg-gray-50/50 border-b rounded-t-3xl p-6">
                      <CardTitle className="text-lg flex items-center gap-2"><ArrowRightIcon /> Seleção de Cadeira</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                          <Label className="font-bold text-gray-700">Selecione o Docente</Label>
                          <Select value={selectedTeacherId} onChange={e => { setSelectedTeacherId(e.target.value); setSelectedSubjectId(''); }}>
                              <option value="">-- Escolher Docente --</option>
                              {uniqueTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </Select>
                      </div>
                      <div className="space-y-3">
                          <Label className="font-bold text-gray-700">Selecione a Disciplina</Label>
                          <Select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} disabled={!selectedTeacherId}>
                              <option value="">-- Escolher Disciplina --</option>
                              {availableSubjectsForTeacher.map(s => (
                                  <option key={s.id} value={s.id}>
                                      {s.name} (Semestre {s.semester}) • Turma {s.classGroup}
                                  </option>
                              ))}
                          </Select>
                      </div>
                  </CardContent>
              </Card>

              {selectedSubjectId && (
                  <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-500">
                      <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-lg flex items-start gap-4">
                          <AlertCircle size={24} className="shrink-0 text-blue-200" />
                          <div className="space-y-1">
                              <p className="font-black text-lg">Inquérito de Avaliação</p>
                              <p className="text-blue-100 text-sm">Responda com honestidade. Sua identidade está protegida por encriptação e anonimato garantido por lei moçambicana.</p>
                          </div>
                      </div>

                      {data.questionnaire.questions.map((q, idx) => (
                          <Card key={q.id} className="border-none shadow-md hover:shadow-xl transition-shadow rounded-3xl">
                              <CardContent className="p-8">
                                  <div className="flex gap-4 items-start mb-6">
                                      <div className="h-8 w-8 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center font-bold text-sm shrink-0">{idx + 1}</div>
                                      <p className="font-black text-xl text-gray-900 leading-tight">{q.text}</p>
                                  </div>
                                  <div className="pl-12">
                                      {renderQuestionInput(q)}
                                  </div>
                              </CardContent>
                          </Card>
                      ))}

                      <div className="pt-8">
                        <Button size="lg" className="w-full bg-black hover:bg-gray-800 h-16 text-xl font-black rounded-3xl shadow-2xl transition-all active:scale-95" onClick={handleSubmit} disabled={submitting}>
                            {submitting ? 'A processar inquérito...' : 'Finalizar e Submeter Agora'}
                        </Button>
                        <p className="text-center text-gray-400 text-xs mt-4">Ao clicar, você confirma a veracidade das informações para fins estatísticos.</p>
                      </div>
                  </div>
              )}
          </div>
      )}
    </div>
  );
};

const ArrowRightIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);
