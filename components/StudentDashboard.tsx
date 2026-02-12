
import React, { useState, useEffect, useMemo } from 'react';
import { User, Questionnaire, Question, Institution } from '../types';
import { BackendService, SubjectWithTeacher } from '../services/backend';
import { Card, CardContent, CardHeader, CardTitle, Button, Select, Label, Input } from './ui';
import { Lock, Send, CheckCircle2, AlertCircle, Star, User as UserIcon, BookOpen, Check, CalendarClock } from 'lucide-react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  user: User;
}

export const StudentDashboard: React.FC<Props> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'survey' | 'stats'>('survey');
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

  // FILTRO INTELIGENTE DE DISCIPLINAS
  const mySubjects = useMemo(() => {
      if (!data) return [];
      return data.subjects.filter(s => {
          // Normalização para comparação
          const studentCourse = user.course?.trim().toLowerCase();
          const subjectCourse = s.course?.trim().toLowerCase();
          
          // 1. Curso: Deve bater exatamente ou ser compatível
          const courseMatch = !studentCourse || !subjectCourse || subjectCourse === studentCourse;
          
          // 2. Nível: Deve ser o mesmo ano curricular
          const levelMatch = !user.level || !s.level || String(user.level) === String(s.level);
          
          // 3. Turno: Deve estar na lista de turnos do aluno
          const shiftMatch = !s.shift || !user.shifts || user.shifts.includes(s.shift);
          
          // 4. Turma: Aluno deve pertencer à turma da disciplina
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
    
    if (aCount < qCount) return alert(`Por favor responda todas as questões.`);

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
      switch (q.type) {
          case 'stars':
              return (
                  <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                          <button key={star} onClick={() => setAnswers(prev => ({ ...prev, [q.id]: star }))} className="focus:outline-none">
                              <Star className={`h-8 w-8 ${(val as number) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                          </button>
                      ))}
                  </div>
              );
          case 'binary':
              return (
                  <div className="flex gap-4">
                      <button onClick={() => setAnswers(prev => ({...prev, [q.id]: 0}))} className={`flex-1 py-2 rounded-md border ${val === 0 ? 'bg-red-100 border-red-300' : 'bg-white'}`}>Não</button>
                      <button onClick={() => setAnswers(prev => ({...prev, [q.id]: 1}))} className={`flex-1 py-2 rounded-md border ${val === 1 ? 'bg-green-100 border-green-300' : 'bg-white'}`}>Sim</button>
                  </div>
              );
          case 'text':
              return <textarea className="w-full p-3 rounded-md border text-sm" placeholder="Sua resposta..." value={val as string || ''} onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))} />;
          default:
              return null;
      }
  };

  if (!data) return <div className="p-8 text-center animate-pulse">Carregando questionários...</div>;

  const isEvaluationOpen = institution?.isEvaluationOpen ?? true;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-8 animate-fade-in">
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-gray-900">{data.questionnaire.title}</h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2">
                Avaliação Académica • {user.course} • {user.level}º Ano
            </p>
        </div>
      </header>

      {success ? (
          <Card className="bg-green-50 border-green-200 py-12 text-center animate-in zoom-in">
              <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-600" />
              <h2 className="text-xl font-bold text-green-800">Avaliação Enviada!</h2>
              <p className="text-green-700">Obrigado por participar. Sua resposta é 100% anónima.</p>
          </Card>
      ) : !isEvaluationOpen ? (
          <Card className="bg-yellow-50 border-yellow-200 py-12 text-center">
              <Lock className="h-12 w-12 mx-auto mb-4 text-yellow-600" />
              <h2 className="text-xl font-bold">Período de Avaliação Fechado</h2>
              <p>Contacte a secretaria para mais informações.</p>
          </Card>
      ) : (
          <div className="space-y-6">
              <Card>
                  <CardHeader className="bg-gray-50 border-b">
                      <CardTitle className="text-base">Dados da Cadeira</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label>Docente</Label>
                          <Select value={selectedTeacherId} onChange={e => { setSelectedTeacherId(e.target.value); setSelectedSubjectId(''); }}>
                              <option value="">Escolher docente...</option>
                              {uniqueTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </Select>
                      </div>
                      <div className="space-y-2">
                          <Label>Disciplina</Label>
                          <Select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} disabled={!selectedTeacherId}>
                              <option value="">Escolher disciplina...</option>
                              {availableSubjectsForTeacher.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code}) - Turma {s.classGroup}</option>)}
                          </Select>
                      </div>
                  </CardContent>
              </Card>

              {selectedSubjectId && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4">
                      {data.questionnaire.questions.map((q, idx) => (
                          <Card key={q.id}>
                              <CardContent className="pt-6">
                                  <p className="font-bold text-lg mb-4">{idx + 1}. {q.text}</p>
                                  {renderQuestionInput(q)}
                              </CardContent>
                          </Card>
                      ))}
                      <Button size="lg" className="w-full bg-black hover:bg-gray-800" onClick={handleSubmit} disabled={submitting}>
                          {submitting ? 'Enviando...' : 'Submeter Avaliação Anónima'}
                      </Button>
                  </div>
              )}
          </div>
      )}
    </div>
  );
};
