
import React, { useState, useEffect, useMemo } from 'react';
import { BackendService } from '../services/backend';
import { User, UserRole, Subject, Questionnaire, QuestionType, TeacherCategory, Question, Institution, QualitativeEval } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, cn } from './ui';
import { Users, BookOpen, Plus, Trash2, GraduationCap, Settings, Briefcase, CalendarClock, Eye, FileText, X, Lock, Unlock, MessageSquare, Star, Hash, CheckSquare, Save, PieChart as PieIcon, BarChart3, TrendingUp, ClipboardCheck, Calculator, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid, AreaChart, Area } from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border-none shadow-2xl rounded-2xl ring-1 ring-black/5">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">{label || payload[0].name}</p>
        <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full" style={{backgroundColor: payload[0].color || payload[0].fill}} />
            <p className="text-base font-black text-gray-900">{payload[0].value} <span className="text-xs font-medium text-gray-400">{payload[0].unit || 'pts'}</span></p>
        </div>
      </div>
    );
  }
  return null;
};

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
  const [processingScores, setProcessingScores] = useState(false);
  
  const [evaluatingTeacher, setEvaluatingTeacher] = useState<User | null>(null);
  const [qualForm, setQualForm] = useState({ deadline: 0, quality: 0, comments: '' });

  const [qTarget, setQTarget] = useState<'student' | 'teacher'>('student');
  const [editingQuestions, setEditingQuestions] = useState<Question[]>([]);
  const [qTitle, setQTitle] = useState('');
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

  // Fix: Added missing openEvalModal function
  const openEvalModal = (teacher: User) => {
    setEvaluatingTeacher(teacher);
    setQualForm({ deadline: 0, quality: 0, comments: '' });
  };

  const participationData = [
    { name: 'Avaliaram', value: Math.round(students.length * 0.78), color: '#10b981' },
    { name: 'Em Falta', value: Math.round(students.length * 0.22), color: '#f1f5f9' }
  ];

  const performanceByCourse = [
    { name: 'ENG', score: 4.5 }, { name: 'DIR', score: 3.9 },
    { name: 'ECO', score: 4.8 }, { name: 'MED', score: 4.2 },
    { name: 'LET', score: 3.5 }, { name: 'AGR', score: 4.1 },
  ];

  const trendData = [
    { period: '22/1', score: 3.2 }, { period: '22/2', score: 3.8 },
    { period: '23/1', score: 3.5 }, { period: '23/2', score: 4.4 },
  ];

  return (
    <div className="space-y-10 p-4 md:p-8 max-w-7xl mx-auto animate-fade-in relative min-h-screen">
        
        {evaluatingTeacher && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-lg animate-in zoom-in-95 rounded-[2.5rem] border-none shadow-2xl overflow-hidden">
                    <CardHeader className="bg-blue-600 p-8">
                        <CardTitle className="flex items-center gap-3 text-white uppercase tracking-tighter text-2xl">
                            <ClipboardCheck size={28} />
                            Avaliar: {evaluatingTeacher.name}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex justify-between items-end"><Label className="uppercase text-[10px] font-black text-gray-400">Prazos e Metas</Label><span className="text-2xl font-black text-blue-600">{qualForm.deadline}<span className="text-sm text-gray-300">/10</span></span></div>
                                <input type="range" min="0" max="10" step="1" value={qualForm.deadline} onChange={e=>setQualForm({...qualForm, deadline: parseInt(e.target.value)})} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-end"><Label className="uppercase text-[10px] font-black text-gray-400">Qualidade Pedagógica</Label><span className="text-2xl font-black text-blue-600">{qualForm.quality}<span className="text-sm text-gray-300">/10</span></span></div>
                                <input type="range" min="0" max="10" step="1" value={qualForm.quality} onChange={e=>setQualForm({...qualForm, quality: parseInt(e.target.value)})} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                            </div>
                            <textarea className="w-full p-5 bg-gray-50 border-none rounded-[1.5rem] text-sm h-32 outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={qualForm.comments} onChange={e=>setQualForm({...qualForm, comments: e.target.value})} placeholder="Adicione comentários qualitativos sobre o desempenho do docente..." />
                        </div>
                        <div className="flex gap-4">
                            <Button variant="outline" className="flex-1 h-14 rounded-2xl border-gray-200" onClick={() => setEvaluatingTeacher(null)}>DESCARTAR</Button>
                            <Button className="flex-1 h-14 bg-black hover:bg-gray-800 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl" onClick={() => { BackendService.saveQualitativeEval({ teacherId: evaluatingTeacher.id, institutionId, deadlineCompliance: qualForm.deadline, workQuality: qualForm.quality, comments: qualForm.comments, score: (qualForm.deadline+qualForm.quality)/2 }).then(()=>setEvaluatingTeacher(null)) }}>GUARDAR NOTA</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}

        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b pb-8">
          <div className="flex items-center gap-6">
              {institution?.logo ? <img src={institution.logo} className="h-16 w-16 object-contain" alt="Logo" /> : <div className="h-16 w-16 bg-black text-white rounded-2xl flex items-center justify-center font-black text-2xl">{institution?.code.slice(0,2)}</div>}
              <div>
                  <h1 className="text-4xl font-black tracking-tighter text-gray-900 uppercase leading-none mb-1">Painel Gestor {institution?.code}</h1>
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">{institution?.evaluationPeriodName} • Campus Central</p>
              </div>
          </div>
          <div className="flex bg-gray-100 p-1.5 rounded-[1.5rem] flex-wrap gap-1 shadow-inner ring-1 ring-black/5">
              {[
                  {id: 'overview', label: 'Início', icon: Briefcase},
                  {id: 'teachers', label: 'Corpo Docente', icon: Users},
                  {id: 'analytics', label: 'Métricas', icon: BarChart3},
                  {id: 'settings', label: 'Definições', icon: Settings},
              ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={cn("px-5 py-2.5 text-[10px] font-black rounded-xl flex items-center gap-2 transition-all uppercase tracking-widest", activeTab === tab.id ? "bg-white shadow-xl text-black scale-105" : "text-gray-400 hover:text-gray-600")}>
                      <tab.icon size={12} /> {tab.label}
                  </button>
              ))}
          </div>
        </header>

        {activeTab === 'overview' && (
            <div className="space-y-10 animate-in fade-in duration-700">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[
                        {l: 'Docentes Ativos', v: teachers.length, c: 'blue'},
                        {l: 'Alunos Inscritos', v: students.length, c: 'indigo'},
                        {l: 'Cadeiras Registadas', v: subjects.length, c: 'violet'},
                        {l: 'Período', v: institution?.isEvaluationOpen ? 'ABERTO' : 'FECHADO', c: institution?.isEvaluationOpen ? 'emerald' : 'rose'}
                    ].map((s, i) => (
                        <Card key={i} className={`bg-${s.c}-50/30 border-none shadow-sm rounded-[2rem] p-8`}>
                            <p className={`text-[10px] text-${s.c}-600 uppercase font-black tracking-widest mb-2 opacity-60`}>{s.l}</p>
                            <p className="text-4xl font-black tracking-tighter text-gray-900">{s.v}</p>
                        </Card>
                    ))}
                </div>

                <div className="grid lg:grid-cols-3 gap-10">
                    <Card className="lg:col-span-2 border-none shadow-2xl rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-blue-700 text-white overflow-hidden group">
                        <div className="p-10 relative z-10">
                            <h2 className="text-3xl font-black tracking-tighter uppercase mb-4 flex items-center gap-3"><Calculator size={32} className="text-indigo-200" /> Fecho de Resultados</h2>
                            <p className="text-indigo-100 font-medium mb-8 max-w-lg leading-relaxed">Consolide os dados de <strong>80% Auto-Avaliação</strong>, <strong>12% Inquéritos</strong> e <strong>8% Nota Qualitativa</strong> para gerar os scores finais da instituição.</p>
                            <div className="flex items-center gap-4 bg-white/10 p-5 rounded-2xl border border-white/10 backdrop-blur-md mb-8">
                                <AlertCircle className="text-amber-300 shrink-0" size={24} />
                                <p className="text-xs font-bold leading-normal">Assegure-se de que a Avaliação Qualitativa na aba "Docentes" foi concluída para todos os perfis antes do processamento global.</p>
                            </div>
                            <Button className="h-16 px-10 bg-white text-indigo-700 hover:bg-indigo-50 font-black uppercase tracking-widest text-lg rounded-[1.5rem] shadow-2xl transition-all active:scale-95 disabled:opacity-50" onClick={() => BackendService.calculateScores(institutionId).then(()=>alert('Sucesso!'))} disabled={processingScores}>
                                {processingScores ? 'A Processar...' : 'Gerar Scores Globais'}
                            </Button>
                        </div>
                        <div className="absolute -right-20 -bottom-20 h-80 w-80 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-1000"></div>
                    </Card>

                    <Card className="border-none shadow-xl rounded-[2.5rem] p-8 bg-white flex flex-col items-center">
                        <h3 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-10 w-full text-center">Adesão dos Alunos</h3>
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={participationData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={10} dataKey="value" stroke="none" cornerRadius={12}>
                                        {/* Fix: Removed invalid cornerRadius prop from Cell */}
                                        {participationData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-8 grid grid-cols-2 gap-8 w-full">
                            <div className="text-center"><p className="text-2xl font-black text-emerald-500">{participationData[0].value}</p><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Avaliaram</p></div>
                            <div className="text-center"><p className="text-2xl font-black text-gray-300">{participationData[1].value}</p><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pendentes</p></div>
                        </div>
                    </Card>
                </div>
            </div>
        )}

        {activeTab === 'analytics' && (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 animate-in slide-in-from-bottom-6">
                <Card className="lg:col-span-2 rounded-[2.5rem] border-none shadow-xl p-8">
                    <CardHeader className="p-0 mb-8"><CardTitle className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><BarChart3 size={16} className="text-blue-500"/> Performance por Departamento</CardTitle></CardHeader>
                    <CardContent className="h-72 p-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={performanceByCourse}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                                <YAxis domain={[0, 5]} hide />
                                <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                                <Bar dataKey="score" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={40} animationDuration={1500} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="rounded-[2.5rem] border-none shadow-xl p-8 bg-black text-white overflow-hidden relative">
                    <CardHeader className="p-0 mb-8"><CardTitle className="text-xs font-black text-indigo-300 uppercase tracking-widest flex items-center gap-2"><TrendingUp size={16}/> Tendência Institucional</CardTitle></CardHeader>
                    <CardContent className="h-72 p-0 relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="period" hide />
                                <YAxis domain={[0, 5]} hide />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="score" stroke="#818cf8" strokeWidth={5} fillOpacity={1} fill="url(#colorScore)" dot={{r: 6, fill: '#818cf8', strokeWidth: 0}} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-8xl font-black text-white/5 pointer-events-none uppercase">Trend</div>
                </Card>
            </div>
        )}

        {activeTab === 'teachers' && (
            <div className="grid lg:grid-cols-12 gap-10 animate-in fade-in">
                <div className="lg:col-span-12">
                    <div className="flex justify-between items-end mb-6">
                        <h2 className="text-2xl font-black tracking-tight text-gray-900 uppercase">Gestão de Corpo Docente</h2>
                        <Button className="h-11 px-6 bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest"><Plus className="mr-2" size={14}/> NOVO DOCENTE</Button>
                    </div>
                    <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50 border-b">
                                        <tr>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Docente</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Categoria</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Email Institucional</th>
                                            <th className="p-5 text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {teachers.map((t)=>(
                                            <tr key={t.id} className="hover:bg-gray-50/50 transition-all group">
                                                <td className="p-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-11 w-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-lg group-hover:scale-110 transition-transform">{t.name[0]}</div>
                                                        <span className="font-bold text-gray-900">{t.name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-5"><span className="px-3 py-1 bg-gray-100 text-[10px] font-black uppercase tracking-widest rounded-lg text-gray-500">{t.category}</span></td>
                                                <td className="p-5 text-sm text-gray-500 font-medium">{t.email}</td>
                                                <td className="p-5 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button size="sm" variant="outline" className="h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => openEvalModal(t)}>AVALIAR</Button>
                                                        <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl" onClick={()=>BackendService.deleteUser(t.id).then(loadData)}><Trash2 size={16}/></Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )}
    </div>
  );
};

const SettingsTab = ({ institution, onUpdate }: any) => (
    <Card className="max-w-md mx-auto rounded-[2.5rem] border-none shadow-2xl overflow-hidden">
        <CardHeader className="bg-gray-50 p-8"><CardTitle className="uppercase font-black tracking-widest text-xs opacity-50">Configuração de Período</CardTitle></CardHeader>
        <CardContent className="p-8 space-y-8">
            <div className="flex justify-between items-center p-6 bg-blue-50 rounded-2xl border-2 border-blue-100 border-dashed">
                <div>
                    <p className="font-black text-blue-900 uppercase tracking-tight text-lg leading-none mb-1">Portal de Avaliação</p>
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Acesso de alunos e docentes</p>
                </div>
                <Button variant={institution.isEvaluationOpen ? "destructive" : "primary"} className="h-12 px-6 rounded-xl font-black uppercase tracking-widest shadow-lg" onClick={()=>BackendService.updateInstitution(institution.id, { isEvaluationOpen: !institution.isEvaluationOpen }).then(onUpdate)}>
                    {institution.isEvaluationOpen ? "FECHAR" : "ABRIR"}
                </Button>
            </div>
            <div className="space-y-2">
                <Label className="uppercase text-[10px] font-black opacity-50 ml-1">Identificador de Semestre</Label>
                <Input defaultValue={institution.evaluationPeriodName} onBlur={e => BackendService.updateInstitution(institution.id, { evaluationPeriodName: e.target.value }).then(onUpdate)} className="h-12 rounded-xl font-bold" />
            </div>
        </CardContent>
    </Card>
);
