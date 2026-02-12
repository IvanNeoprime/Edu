
import React, { useState, useEffect, useMemo } from 'react';
import { BackendService } from '../services/backend';
import { User, UserRole, Subject, Questionnaire, QuestionType, TeacherCategory, Question, Institution } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, cn } from './ui';
import { Users, BookOpen, Plus, Trash2, GraduationCap, Settings, Briefcase, CalendarClock, Eye, FileText, X, Lock, Unlock, MessageSquare, Star, Hash, CheckSquare, Save, PieChart as PieIcon, BarChart3, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid } from 'recharts';

interface Props {
  institutionId: string;
}

export const ManagerDashboard: React.FC<Props> = ({ institutionId }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'teachers' | 'students' | 'subjects' | 'questionnaire' | 'analytics' | 'settings'>('overview');
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [qTarget, setQTarget] = useState<'student' | 'teacher'>('student');
  const [editingQuestions, setEditingQuestions] = useState<Question[]>([]);
  const [qTitle, setQTitle] = useState('');
  const [previewModal, setPreviewModal] = useState<{ open: boolean; type: 'standard' | 'current'; data?: Question[] }>({ open: false, type: 'standard' });

  const [subForm, setSubForm] = useState({ name: '', code: '', tId: '', course: '', level: '1', shift: 'Diurno' as any, group: 'A', semester: '1' as '1' | '2' });

  useEffect(() => { loadData(); }, [institutionId]);
  useEffect(() => { loadCurrentQuestionnaire(); }, [qTarget, institutionId]);

  const loadData = async () => {
    setLoading(true);
    try {
        const inst = await BackendService.getInstitution(institutionId);
        if (inst) setInstitution(inst);
        const allUsers = await BackendService.getUsers();
        setTeachers(allUsers.filter(u => u.role === UserRole.TEACHER && u.institutionId === institutionId));
        setStudents(allUsers.filter(u => u.role === UserRole.STUDENT && u.institutionId === institutionId));
        setSubjects(await BackendService.getInstitutionSubjects(institutionId));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadCurrentQuestionnaire = async () => {
    const q = await BackendService.getInstitutionQuestionnaire(institutionId, qTarget);
    if (q) { setEditingQuestions(q.questions); setQTitle(q.title); }
    else { setEditingQuestions([]); setQTitle(qTarget === 'student' ? 'Avaliação do Desempenho Docente' : 'Avaliação das Condições Institucionais'); }
  };

  const handleSaveQuestionnaire = async () => {
    try {
        await BackendService.saveQuestionnaire({
            id: 'q_' + qTarget + '_' + institutionId,
            institutionId, title: qTitle, targetRole: qTarget, questions: editingQuestions, active: true
        });
        alert("Inquérito publicado!");
    } catch (e) { alert("Erro ao salvar."); }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    await BackendService.assignSubject({ ...subForm, teacherId: subForm.tId, institutionId, academicYear: '2024' });
    setSubForm({ ...subForm, name: '', code: '' });
    loadData();
  };

  // Mocked Analytics Data
  const participationData = [
    { name: 'Avaliaram', value: Math.round(students.length * 0.65), color: '#10b981' },
    { name: 'Pendentes', value: Math.round(students.length * 0.35), color: '#f59e0b' }
  ];

  const performanceByCourse = [
    { name: 'Engenharia', score: 4.2 },
    { name: 'Direito', score: 3.8 },
    { name: 'Economia', score: 4.5 },
    { name: 'Medicina', score: 4.1 },
  ];

  const trendData = [
    { period: '2022/1', score: 3.5 }, { period: '2022/2', score: 3.7 },
    { period: '2023/1', score: 3.9 }, { period: '2023/2', score: 4.2 },
  ];

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto animate-fade-in relative min-h-screen">
        <header className="border-b pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
              {institution?.logo && <img src={institution.logo} className="h-16 w-16 object-contain" alt="Logo" />}
              <div>
                  <h1 className="text-3xl font-black tracking-tight text-gray-900 uppercase">Gestão {institution?.code}</h1>
                  <p className="text-gray-500 font-medium">{institution?.evaluationPeriodName}</p>
              </div>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-2xl flex-wrap gap-1 shadow-inner border border-gray-200">
              {[
                  {id: 'overview', label: 'Início', icon: Briefcase},
                  {id: 'teachers', label: 'Docentes', icon: Users},
                  {id: 'students', label: 'Alunos', icon: GraduationCap},
                  {id: 'subjects', label: 'Cadeiras', icon: BookOpen},
                  {id: 'questionnaire', label: 'Inquérito', icon: FileText},
                  {id: 'analytics', label: 'Analytics', icon: BarChart3},
                  {id: 'settings', label: 'Definições', icon: Settings},
              ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={cn("px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all", activeTab === tab.id ? "bg-white shadow text-black" : "text-gray-500 hover:text-gray-900")}>
                      <tab.icon size={14} /> {tab.label.toUpperCase()}
                  </button>
              ))}
          </div>
        </header>

        {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-blue-50 border-blue-100"><CardContent className="pt-6"><p className="text-[10px] text-blue-600 uppercase font-black mb-1">Docentes</p><p className="text-4xl font-black">{teachers.length}</p></CardContent></Card>
                <Card className="bg-indigo-50 border-indigo-100"><CardContent className="pt-6"><p className="text-[10px] text-indigo-600 uppercase font-black mb-1">Alunos</p><p className="text-4xl font-black">{students.length}</p></CardContent></Card>
                <Card className="bg-purple-50 border-purple-100"><CardContent className="pt-6"><p className="text-[10px] text-purple-600 uppercase font-black mb-1">Cadeiras</p><p className="text-4xl font-black">{subjects.length}</p></CardContent></Card>
                <Card className={cn(institution?.isEvaluationOpen ? 'bg-green-50' : 'bg-red-50')}><CardContent className="pt-6"><p className="text-[10px] uppercase font-black mb-1">Estado</p><p className="text-xl font-black">{institution?.isEvaluationOpen ? 'ABERTO' : 'FECHADO'}</p></CardContent></Card>
            </div>
        )}

        {activeTab === 'analytics' && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader><CardTitle className="text-sm uppercase flex items-center gap-2"><PieIcon size={16}/> Participação dos Alunos</CardTitle></CardHeader>
                    <CardContent className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={participationData} cx="50%" cy="50%" outerRadius={70} paddingAngle={10} dataKey="value">
                                    {participationData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader><CardTitle className="text-sm uppercase flex items-center gap-2"><BarChart3 size={16}/> Performance por Faculdade/Curso</CardTitle></CardHeader>
                    <CardContent className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={performanceByCourse}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis domain={[0, 5]} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{fill: '#f1f5f9'}} />
                                <Bar dataKey="score" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3">
                    <CardHeader><CardTitle className="text-sm uppercase flex items-center gap-2"><TrendingUp size={16}/> Evolução do Score Médio Global</CardTitle></CardHeader>
                    <CardContent className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="period" axisLine={false} tickLine={false} />
                                <YAxis domain={[0, 5]} axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Line type="stepAfter" dataKey="score" stroke="#3b82f6" strokeWidth={5} dot={{r: 8, fill: '#3b82f6'}} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        )}

        {/* Mantendo as outras abas existentes */}
        {activeTab === 'teachers' && <TeachersTab teachers={teachers} institutionId={institutionId} onUpdate={loadData} />}
        {activeTab === 'students' && <StudentsTab students={students} institutionId={institutionId} onUpdate={loadData} />}
        {activeTab === 'subjects' && <div className="grid lg:grid-cols-12 gap-8"><div className="lg:col-span-5"><Card><CardHeader><CardTitle>Add Cadeira</CardTitle></CardHeader><CardContent><form onSubmit={handleAddSubject} className="space-y-4"><Input placeholder="Nome" value={subForm.name} onChange={e=>setSubForm({...subForm, name: e.target.value})} /><Input placeholder="Código" value={subForm.code} onChange={e=>setSubForm({...subForm, code: e.target.value})} /><Select value={subForm.tId} onChange={e=>setSubForm({...subForm, tId: e.target.value})}><option value="">Docente...</option>{teachers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</Select><Button type="submit" className="w-full">Criar</Button></form></CardContent></Card></div><div className="lg:col-span-7 space-y-3">{subjects.map(s=><div key={s.id} className="p-4 border rounded-xl flex justify-between"><div><p className="font-bold">{s.name}</p><p className="text-xs text-gray-400">{s.code}</p></div><Button size="sm" variant="ghost" className="text-red-500" onClick={()=>BackendService.deleteSubject(s.id).then(loadData)}><Trash2 size={16}/></Button></div>)}</div></div>}
        {activeTab === 'questionnaire' && (
            <div className="grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4"><Card><CardHeader><CardTitle>Opções</CardTitle></CardHeader><CardContent className="space-y-4"><Select value={qTarget} onChange={e=>setQTarget(e.target.value as any)}><option value="student">Alunos</option><option value="teacher">Docentes</option></Select><Input value={qTitle} onChange={e=>setQTitle(e.target.value)} /><Button className="w-full" onClick={handleSaveQuestionnaire}>Salvar</Button></CardContent></Card></div>
                <div className="lg:col-span-8 space-y-4"><Button onClick={() => setEditingQuestions([...editingQuestions, {id:'q'+Date.now(), text:'', type:'stars', weight:1}])}>+ Pergunta</Button>{editingQuestions.map((q,i)=>(<Card key={q.id}><CardContent className="pt-6 flex gap-4"><Input value={q.text} onChange={e=>{const n=[...editingQuestions]; n[i].text=e.target.value; setEditingQuestions(n);}} /><Select value={q.type} onChange={e=>{const n=[...editingQuestions]; n[i].type=e.target.value as any; setEditingQuestions(n);}}><option value="stars">Estrelas</option><option value="binary">Sim/Não</option><option value="text">Texto</option></Select><Button variant="ghost" onClick={()=>{const n=editingQuestions.filter((_,idx)=>idx!==i); setEditingQuestions(n);}}><Trash2/></Button></CardContent></Card>))}</div>
            </div>
        )}
        {activeTab === 'settings' && institution && <SettingsTab institution={institution} onUpdate={loadData} />}
    </div>
  );
};

const TeachersTab = ({ teachers, institutionId, onUpdate }: any) => {
    const [f, setF] = useState({ name: '', email: '', pwd: '', cat: 'assistente' });
    const add = async (e: any) => { e.preventDefault(); await BackendService.addTeacher(institutionId, f.name, f.email, f.pwd, '', f.cat as any); setF({ name: '', email: '', pwd: '', cat: 'assistente' }); onUpdate(); };
    return (<div className="grid lg:grid-cols-12 gap-8"><div className="lg:col-span-4"><Card><CardHeader><CardTitle>Add Docente</CardTitle></CardHeader><CardContent><form onSubmit={add} className="space-y-4"><Input placeholder="Nome" value={f.name} onChange={e=>setF({...f, name: e.target.value})} /><Input placeholder="Email" value={f.email} onChange={e=>setF({...f, email: e.target.value})} /><Input placeholder="Senha" type="password" value={f.pwd} onChange={e=>setF({...f, pwd: e.target.value})} /><Button type="submit" className="w-full">Cadastrar</Button></form></CardContent></Card></div><div className="lg:col-span-8 space-y-2">{teachers.map((t:any)=>(<div key={t.id} className="p-3 border rounded-lg flex justify-between"><div><p className="font-bold">{t.name}</p><p className="text-xs">{t.email}</p></div><Button size="sm" variant="ghost" onClick={()=>BackendService.deleteUser(t.id).then(onUpdate)}><Trash2 size={16}/></Button></div>))}</div></div>);
};

const StudentsTab = ({ students, institutionId, onUpdate }: any) => {
    const [f, setF] = useState({ name: '', email: '', pwd: '', course: '', level: '1' });
    const add = async (e: any) => { e.preventDefault(); await BackendService.addStudent(institutionId, f.name, f.email, f.pwd, f.course, f.level, '', ['Diurno'], ['A']); setF({ name: '', email: '', pwd: '', course: '', level: '1' }); onUpdate(); };
    return (<div className="grid lg:grid-cols-12 gap-8"><div className="lg:col-span-4"><Card><CardHeader><CardTitle>Add Aluno</CardTitle></CardHeader><CardContent><form onSubmit={add} className="space-y-4"><Input placeholder="Nome" value={f.name} onChange={e=>setF({...f, name: e.target.value})} /><Input placeholder="Email" value={f.email} onChange={e=>setF({...f, email: e.target.value})} /><Input placeholder="Curso" value={f.course} onChange={e=>setF({...f, course: e.target.value})} /><Button type="submit" className="w-full">Cadastrar</Button></form></CardContent></Card></div><div className="lg:col-span-8 space-y-2">{students.map((t:any)=>(<div key={t.id} className="p-3 border rounded-lg flex justify-between"><div><p className="font-bold">{t.name}</p><p className="text-xs">{t.course}</p></div><Button size="sm" variant="ghost" onClick={()=>BackendService.deleteUser(t.id).then(onUpdate)}><Trash2 size={16}/></Button></div>))}</div></div>);
};

const SettingsTab = ({ institution, onUpdate }: any) => (
    <Card className="max-w-md mx-auto"><CardHeader><CardTitle>Sistema</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex justify-between p-4 border rounded-xl bg-gray-50"><div><p className="font-bold">Avaliação Pública</p></div><Button variant={institution.isEvaluationOpen ? "destructive" : "primary"} onClick={()=>BackendService.updateInstitution(institution.id, { isEvaluationOpen: !institution.isEvaluationOpen }).then(onUpdate)}>{institution.isEvaluationOpen ? "Fechar" : "Abrir"}</Button></div></CardContent></Card>
);
