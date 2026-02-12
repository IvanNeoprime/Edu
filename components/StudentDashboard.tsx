
import React, { useState, useEffect, useMemo } from 'react';
import { User, Questionnaire, Question, Institution } from '../types';
import { BackendService, SubjectWithTeacher } from '../services/backend';
import { Card, CardContent, CardHeader, CardTitle, Button, Select, Label, cn } from './ui';
import { Lock, CheckCircle2, Star, BookOpen, AlertCircle, ArrowRight } from 'lucide-react';

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
            if (d) {
                setData(d);
                BackendService.getStudentProgress(user.id).then(p => setProgress({ completed: p.completed, pending: 0 }));
            }
        });
    }
  }, [user.institutionId, user.id]);

  const mySubjects = useMemo(() => {
      if (!data) return [];
      return data.subjects.filter(s => {
          const cMatch = !s.course || s.course.toLowerCase() === user.course?.toLowerCase();
          const lMatch = !s.level || String(s.level) === String(user.level);
          const sMatch = !s.semester || s.semester === user.semester;
          return cMatch && lMatch && sMatch;
      });
  }, [data, user]);

  const uniqueTeachers = useMemo(() => {
      const seen = new Set();
      const list: { id: string, name: string }[] = [];
      mySubjects.forEach(s => {
          if (!seen.has(s.teacherId)) {
              seen.add(s.teacherId);
              list.push({ id: s.teacherId, name: s.teacherName });
          }
      });
      return list;
  }, [mySubjects]);

  const availableSubjects = useMemo(() => {
      if (!selectedTeacherId) return [];
      return mySubjects.filter(s => s.teacherId === selectedTeacherId);
  }, [mySubjects, selectedTeacherId]);

  const handleSubmit = async () => {
    if (!data || !selectedSubjectId || !user.institutionId) return;
    if (Object.keys(answers).length < data.questionnaire.questions.length) return alert(`Por favor, responda a todas as perguntas.`);

    setSubmitting(true);
    try {
        const subject = data.subjects.find(s => s.id === selectedSubjectId);
        await BackendService.submitAnonymousResponse(user.id, {
            institutionId: user.institutionId,
            questionnaireId: data.questionnaire.id,
            subjectId: selectedSubjectId,
            teacherId: subject?.teacherId,
            answers: Object.entries(answers).map(([k, v]) => ({ questionId: k, value: v })),
            timestamp: new Date().toISOString()
        });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) { alert(e.message); } finally { setSubmitting(false); }
  };

  if (!data) return <div className="p-8 text-center text-gray-400 font-bold animate-pulse">CARREGANDO PORTAL...</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-fade-in pb-24">
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-6 border-b pb-8">
        <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-black rounded-3xl flex items-center justify-center text-white shadow-xl rotate-3"><BookOpen size={32} /></div>
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Avaliação Docente</h1>
                <p className="text-gray-500 font-bold text-[10px] uppercase">{user.course} • {user.level}º ANO • S{user.semester}</p>
            </div>
        </div>
      </header>

      {success ? (
          <Card className="bg-green-50 border-green-200 py-16 text-center animate-in zoom-in rounded-[3rem]">
              <div className="h-16 w-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-lg"><CheckCircle2 size={32} /></div>
              <h2 className="text-2xl font-black text-green-900 uppercase">Avaliação Submetida!</h2>
              <p className="text-green-700 mt-2 font-medium">Sua contribuição anónima é fundamental.</p>
          </Card>
      ) : (
          <div className="space-y-6">
              <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden">
                  <CardHeader className="bg-gray-50/50 border-b p-6"><CardTitle className="text-sm flex items-center gap-2 uppercase font-black"><ArrowRight size={18}/> Selecione o Alvo</CardTitle></CardHeader>
                  <CardContent className="p-8 grid md:grid-cols-2 gap-6">
                      <div className="space-y-2"><Label>Docente</Label><Select value={selectedTeacherId} onChange={e => { setSelectedTeacherId(e.target.value); setSelectedSubjectId(''); }}><option value="">-- DOCENTE --</option>{uniqueTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></div>
                      <div className="space-y-2"><Label>Cadeira</Label><Select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} disabled={!selectedTeacherId}><option value="">-- CADEIRA --</option>{availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name} (S{s.semester})</option>)}</Select></div>
                  </CardContent>
              </Card>

              {selectedSubjectId && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                      <div className="bg-blue-600 p-6 rounded-[2rem] text-white shadow-xl flex items-start gap-4">
                          <AlertCircle size={24} className="shrink-0 text-blue-200" />
                          <p className="text-sm font-medium leading-relaxed">Seu voto é 100% anónimo. O sistema encripta as respostas e desassocia do seu perfil de utilizador.</p>
                      </div>

                      {data.questionnaire.questions.map((q, idx) => (
                        <Card key={q.id} className="p-8 rounded-[2rem] border-none shadow-lg">
                           <div className="flex gap-4 mb-6"><div className="h-8 w-8 bg-black text-white rounded-xl flex items-center justify-center font-black text-xs shrink-0">{idx+1}</div><p className="font-black text-xl text-gray-900">{q.text}</p></div>
                           <div className="md:pl-12">
                             {q.type === 'stars' && <div className="flex gap-2">{[1,2,3,4,5].map(s=><button key={s} onClick={()=>setAnswers({...answers, [q.id]: s})} className={cn("transition-all hover:scale-110", (answers[q.id] as number) >= s ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200')}><Star size={40}/></button>)}</div>}
                             {q.type === 'binary' && <div className="flex gap-4"><button onClick={()=>setAnswers({...answers, [q.id]: 1})} className={cn("px-8 py-3 rounded-xl border-2 font-black transition-all", answers[q.id] === 1 ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white text-gray-300')}>SIM</button><button onClick={()=>setAnswers({...answers, [q.id]: 0})} className={cn("px-8 py-3 rounded-xl border-2 font-black transition-all", answers[q.id] === 0 ? 'bg-red-100 border-red-500 text-red-700' : 'bg-white text-gray-300')}>NÃO</button></div>}
                           </div>
                        </Card>
                      ))}

                      <Button size="lg" className="w-full h-16 bg-black text-white rounded-[2rem] font-black text-xl shadow-2xl" onClick={handleSubmit} disabled={submitting}>{submitting ? 'SUBMETENDO...' : 'ENVIAR AVALIAÇÃO'}</Button>
                  </div>
              )}
          </div>
      )}
    </div>
  );
};
