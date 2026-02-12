
import React, { useState, useEffect, useMemo } from 'react';
import { BackendService } from '../services/backend';
import { User, UserRole, Subject, Questionnaire, QuestionType, TeacherCategory, Question, Institution } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, cn } from './ui';
import { Users, BookOpen, Plus, Trash2, GraduationCap, Settings, Briefcase, CalendarClock, Eye, FileText, X, Lock, Unlock, MessageSquare, Star, Hash, CheckSquare, Save, PieChart as PieIcon, BarChart3, TrendingUp, ClipboardCheck, ChevronDown, LayoutGrid, FileDown, Download, Printer } from 'lucide-react';
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
  const [isPreviewMode, setIsPreviewMode] = useState(false);

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
    else { setEditingQuestions([]); setQTitle(qTarget === 'student' ? 'Inquérito de Avaliação do Docente' : 'Auto-Avaliação Docente'); }
  };

  const handleAddQuestion = () => {
    const newQ: Question = { id: 'q_' + Date.now(), text: 'Nova pergunta...', type: 'stars', weight: 5 };
    setEditingQuestions([...editingQuestions, newQ]);
  };

  const handleUpdateQuestion = (id: string, updates: Partial<Question>) => {
    setEditingQuestions(editingQuestions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const handleRemoveQuestion = (id: string) => {
    setEditingQuestions(editingQuestions.filter(q => q.id !== id));
  };

  const handleSaveQuestionnaire = async () => {
    try {
        await BackendService.saveQuestionnaire({
            id: 'q_' + qTarget + '_' + institutionId,
            institutionId, title: qTitle, targetRole: qTarget, questions: editingQuestions, active: true
        });
        alert("Configuração de inquérito publicada!");
    } catch (e) { alert("Erro ao salvar."); }
  };

  const exportTeachersToExcel = () => {
    const headers = ["ID", "Nome", "Email", "Categoria", "Instituicao"];
    const rows = teachers.map(t => [t.id, t.name, t.email, t.category || 'N/A', institution?.code]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers, ...rows].map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `docentes_${institution?.code}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto animate-fade-in relative min-h-screen">
        <header className="border-b pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-black text-white rounded-xl flex items-center justify-center font-black text-sm">
                  {institution?.code.slice(0,2)}
              </div>
              <div>
                  <h1 className="text-lg font-bold tracking-tight text-gray-900 uppercase">Gestão Académica</h1>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{institution?.name} • {institution?.evaluationPeriodName}</p>
              </div>
          </div>
          <div className="flex bg-gray-100/50 p-1 rounded-xl flex-wrap gap-1 border border-gray-200 no-print">
              {[
                  {id: 'overview', label: 'Dashboard', icon: Briefcase},
                  {id: 'teachers', label: 'Docentes', icon: Users},
                  {id: 'students', label: 'Estudantes', icon: GraduationCap},
                  {id: 'questionnaire', label: 'Inquéritos', icon: FileText},
                  {id: 'analytics', label: 'Resultados', icon: BarChart3},
                  {id: 'settings', label: 'Definições', icon: Settings},
              ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={cn("px-3 py-1.5 text-[9px] font-black rounded-lg flex items-center gap-2 transition-all uppercase tracking-wider", activeTab === tab.id ? "bg-white shadow-sm text-black border border-gray-200" : "text-gray-400 hover:text-gray-700")}>
                      <tab.icon size={11} /> {tab.label}
                  </button>
              ))}
          </div>
        </header>

        {activeTab === 'overview' && (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-none shadow-sm bg-blue-50/50"><CardContent className="pt-4"><p className="text-[8px] text-blue-600 uppercase font-black tracking-widest mb-1">Docentes</p><p className="text-2xl font-black">{teachers.length}</p></CardContent></Card>
                    <Card className="border-none shadow-sm bg-indigo-50/50"><CardContent className="pt-4"><p className="text-[8px] text-indigo-600 uppercase font-black tracking-widest mb-1">Estudantes</p><p className="text-2xl font-black">{students.length}</p></CardContent></Card>
                    <Card className="border-none shadow-sm bg-purple-50/50"><CardContent className="pt-4"><p className="text-[8px] text-purple-600 uppercase font-black tracking-widest mb-1">Cadeiras</p><p className="text-2xl font-black">{subjects.length}</p></CardContent></Card>
                    <Card className={cn("border-none shadow-sm", institution?.isEvaluationOpen ? 'bg-emerald-50/50' : 'bg-rose-50/50')}><CardContent className="pt-4"><p className="text-[8px] uppercase font-black tracking-widest mb-1">Portal</p><p className="text-[11px] font-black">{institution?.isEvaluationOpen ? 'ABERTO' : 'ENCERRADO'}</p></CardContent></Card>
                </div>
                
                <div className="flex justify-end gap-2 no-print">
                   <Button variant="outline" size="sm" onClick={exportTeachersToExcel} className="text-[9px] font-black uppercase tracking-widest h-8 px-4 border-gray-200">
                      <FileDown size={14} className="mr-2"/> Excel (CSV)
                   </Button>
                   <Button variant="outline" size="sm" onClick={printReport} className="text-[9px] font-black uppercase tracking-widest h-8 px-4 border-gray-200">
                      <Printer size={14} className="mr-2"/> Gerar PDF
                   </Button>
                </div>
            </div>
        )}

        {activeTab === 'teachers' && <TeachersTab teachers={teachers} institutionId={institutionId} onUpdate={loadData} onExport={exportTeachersToExcel} />}
        {activeTab === 'students' && <StudentsTab students={students} institutionId={institutionId} onUpdate={loadData} />}

        {activeTab === 'questionnaire' && (
            <div className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4 space-y-4 no-print">
                    <Card className="rounded-2xl border-none shadow-lg">
                        <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-black tracking-widest text-gray-400">Configuração</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <Label className="text-[9px] uppercase font-black opacity-50">Perfil Alvo</Label>
                                <Select value={qTarget} onChange={e=>setQTarget(e.target.value as any)} className="h-8 text-[11px]">
                                    <option value="student">Avaliação pelos Alunos</option>
                                    <option value="teacher">Auto-Avaliação Docente</option>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px] uppercase font-black opacity-50">Título do Formulário</Label>
                                <Input value={qTitle} onChange={e=>setQTitle(e.target.value)} className="h-8 text-[11px] font-bold" />
                            </div>
                            <div className="pt-2">
                                <Button onClick={() => setIsPreviewMode(!isPreviewMode)} variant="outline" className="w-full text-[9px] font-black uppercase mb-2 h-8">
                                    {isPreviewMode ? 'Editar Questões' : 'Previsualizar'}
                                </Button>
                                <Button onClick={handleSaveQuestionnaire} className="w-full text-[9px] font-black uppercase bg-blue-600 hover:bg-blue-700 h-9">Publicar Inquérito</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-8 space-y-4">
                    {isPreviewMode ? (
                        <div className="space-y-4 animate-fade-in">
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b pb-2">Previsualização</h2>
                            {editingQuestions.map((q, idx) => (
                                <Card key={q.id} className="rounded-2xl border-none shadow-sm card">
                                    <CardContent className="pt-4">
                                        <div className="flex gap-3">
                                            <div className="h-6 w-6 rounded-lg bg-gray-100 flex items-center justify-center font-black text-[10px] text-gray-400 shrink-0">{idx+1}</div>
                                            <div className="space-y-3 flex-1">
                                                <p className="font-bold text-gray-900 text-sm">{q.text}</p>
                                                <div className="opacity-50 pointer-events-none">
                                                    {q.type === 'stars' && <div className="flex gap-1 text-yellow-400"><Star size={16}/><Star size={16}/><Star size={16}/><Star size={16}/><Star size={16}/></div>}
                                                    {q.type === 'binary' && <div className="flex gap-2"><div className="h-6 w-12 bg-gray-100 rounded-lg" /><div className="h-6 w-12 bg-gray-100 rounded-lg" /></div>}
                                                    {q.type === 'scale_10' && <div className="flex gap-1">{[1,2,3,4,5].map(n=><div key={n} className="h-6 w-6 bg-gray-100 rounded-lg" />)}</div>}
                                                    {q.type === 'text' && <div className="h-12 w-full bg-gray-50 rounded-lg" />}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fade-in no-print">
                            <div className="flex justify-between items-center">
                                <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Editor de Questões</h2>
                                <Button onClick={handleAddQuestion} size="sm" className="h-7 text-[8px] font-black uppercase tracking-widest"><Plus size={12} className="mr-1"/> Adicionar</Button>
                            </div>
                            {editingQuestions.map((q, i) => (
                                <Card key={q.id} className="rounded-2xl border-none shadow-md hover:shadow-lg transition-all group">
                                    <CardContent className="p-4 flex gap-3 items-start">
                                        <div className="h-6 w-6 bg-gray-50 rounded-lg flex items-center justify-center text-[9px] font-black text-gray-300">{i+1}</div>
                                        <div className="flex-1 space-y-2">
                                            <Input value={q.text} onChange={e=>handleUpdateQuestion(q.id, {text: e.target.value})} className="border-none bg-gray-50 font-bold h-8 text-[11px] focus:ring-0" placeholder="Digite a pergunta..." />
                                            <div className="flex flex-wrap gap-4 items-end">
                                                <div className="space-y-1">
                                                    <Label className="text-[8px] uppercase font-black opacity-30">Tipo</Label>
                                                    <Select value={q.type} onChange={e=>handleUpdateQuestion(q.id, {type: e.target.value as any})} className="h-7 text-[9px] font-black uppercase">
                                                        <option value="stars">Estrelas (1-5)</option>
                                                        <option value="binary">Sim / Não</option>
                                                        <option value="scale_10">Escala (1-10)</option>
                                                        <option value="text">Texto Livre</option>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[8px] uppercase font-black opacity-30">Peso</Label>
                                                    <Input type="number" value={q.weight} onChange={e=>handleUpdateQuestion(q.id, {weight: parseInt(e.target.value)})} className="h-7 w-12 text-[10px] font-black" />
                                                </div>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={()=>handleRemoveQuestion(q.id)} className="text-gray-300 hover:text-red-500 rounded-lg"><Trash2 size={14}/></Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'settings' && institution && (
            <div className="max-w-md mx-auto space-y-6 no-print">
                <Card className="rounded-2xl border-none shadow-xl overflow-hidden">
                    <CardHeader className="bg-gray-50 pb-4"><CardTitle className="text-[10px] uppercase font-black tracking-widest opacity-40 text-center">Configurações de Acesso</CardTitle></CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div>
                                <p className="font-bold text-xs">Estado da Avaliação</p>
                                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">{institution.isEvaluationOpen ? 'Ativa' : 'Encerrada'}</p>
                            </div>
                            <Button variant={institution.isEvaluationOpen ? "destructive" : "primary"} size="sm" className="font-black text-[9px] uppercase px-4 h-8" onClick={()=>BackendService.updateInstitution(institution.id, { isEvaluationOpen: !institution.isEvaluationOpen }).then(loadData)}>
                                {institution.isEvaluationOpen ? "Encerrar" : "Abrir"}
                            </Button>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[8px] font-black uppercase opacity-40 ml-1">Identificador do Semestre</Label>
                            <Input defaultValue={institution.evaluationPeriodName} onBlur={e=>BackendService.updateInstitution(institution.id, { evaluationPeriodName: e.target.value }).then(loadData)} className="h-8 text-[11px] font-bold" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}
    </div>
  );
};

const TeachersTab = ({ teachers, institutionId, onUpdate, onExport }: any) => {
    const [f, setF] = useState({ name: '', email: '', pwd: '', cat: 'assistente' as any });
    const add = async (e: any) => { e.preventDefault(); await BackendService.addTeacher(institutionId, f.name, f.email, f.pwd, '', f.cat); setF({ name: '', email: '', pwd: '', cat: 'assistente' }); onUpdate(); };
    return (
        <div className="grid lg:grid-cols-12 gap-6 animate-fade-in">
            <div className="lg:col-span-4 no-print">
                <Card className="rounded-2xl border-none shadow-lg">
                    <CardHeader><CardTitle className="text-[10px] font-black uppercase tracking-widest text-gray-400">Novo Docente</CardTitle></CardHeader>
                    <CardContent>
                        <form onSubmit={add} className="space-y-4">
                            <div className="space-y-1"><Label className="text-[9px] uppercase font-black opacity-40">Nome Completo</Label><Input placeholder="Ex: Prof. José Maria" value={f.name} onChange={e=>setF({...f, name: e.target.value})} className="h-8 text-[11px]" /></div>
                            <div className="space-y-1"><Label className="text-[9px] uppercase font-black opacity-40">Email</Label><Input type="email" placeholder="jose@univ.ac.mz" value={f.email} onChange={e=>setF({...f, email: e.target.value})} className="h-8 text-[11px]" /></div>
                            <div className="space-y-1"><Label className="text-[9px] uppercase font-black opacity-40">Categoria</Label>
                                <Select value={f.cat} onChange={e=>setF({...f, cat: e.target.value as any})} className="h-8 text-[10px] uppercase font-black">
                                    <option value="assistente">Assistente</option>
                                    <option value="auxiliar">Auxiliar</option>
                                    <option value="associado">Associado</option>
                                    <option value="catedratico">Catedrático</option>
                                </Select>
                            </div>
                            <Button type="submit" className="w-full text-[9px] font-black uppercase h-9 mt-2">Cadastrar</Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-8 space-y-2">
                <div className="flex justify-between items-center mb-2 no-print">
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Corpo Docente ({teachers.length})</h2>
                    <Button onClick={onExport} variant="ghost" size="sm" className="h-7 text-[8px] font-black uppercase text-blue-600"><Download size={12} className="mr-1"/> Exportar Lista</Button>
                </div>
                <div className="space-y-2">
                    {teachers.map((t:any)=>(
                        <Card key={t.id} className="rounded-xl border-none shadow-sm hover:shadow-md transition-all group card">
                            <CardContent className="p-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center font-black text-blue-600 uppercase border border-gray-100 text-xs">{t.name[0]}</div>
                                    <div>
                                        <p className="font-bold text-gray-900 text-xs leading-none mb-1">{t.name}</p>
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{t.category} • {t.email}</p>
                                    </div>
                                </div>
                                <div className="no-print">
                                    <Button size="sm" variant="ghost" className="text-gray-200 hover:text-red-500" onClick={()=>BackendService.deleteUser(t.id).then(onUpdate)}><Trash2 size={14}/></Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
};

const StudentsTab = ({ students, institutionId, onUpdate }: any) => {
    const [f, setF] = useState({ name: '', email: '', pwd: '', course: '', level: '1', shift: 'Diurno' as any, group: 'A' });
    const add = async (e: any) => { e.preventDefault(); await BackendService.addStudent(institutionId, f.name, f.email, f.pwd, f.course, f.level, '', [f.shift], [f.group]); setF({ name: '', email: '', pwd: '', course: '', level: '1', shift: 'Diurno', group: 'A' }); onUpdate(); };
    return (
        <div className="grid lg:grid-cols-12 gap-6 animate-fade-in">
            <div className="lg:col-span-5 no-print">
                <Card className="rounded-2xl border-none shadow-lg">
                    <CardHeader><CardTitle className="text-[10px] font-black uppercase tracking-widest text-gray-400">Matrícula</CardTitle></CardHeader>
                    <CardContent>
                        <form onSubmit={add} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1 col-span-2"><Label className="text-[8px] uppercase font-black opacity-40">Nome</Label><Input value={f.name} onChange={e=>setF({...f, name: e.target.value})} className="h-8 text-[11px]" /></div>
                                <div className="space-y-1 col-span-2"><Label className="text-[8px] uppercase font-black opacity-40">Email</Label><Input type="email" value={f.email} onChange={e=>setF({...f, email: e.target.value})} className="h-8 text-[11px]" /></div>
                                <div className="space-y-1"><Label className="text-[8px] uppercase font-black opacity-40">Curso</Label><Input value={f.course} onChange={e=>setF({...f, course: e.target.value})} className="h-8 text-[11px]" /></div>
                                <div className="space-y-1"><Label className="text-[8px] uppercase font-black opacity-40">Nível</Label>
                                    <Select value={f.level} onChange={e=>setF({...f, level: e.target.value})} className="h-8 text-[9px] uppercase font-black">
                                        {[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n}º ANO</option>)}
                                    </Select>
                                </div>
                            </div>
                            <Button type="submit" className="w-full text-[9px] font-black uppercase h-9 mt-4 bg-indigo-600 hover:bg-indigo-700">Registrar</Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-7 space-y-2">
                 <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Estudantes ({students.length})</h2>
                 <div className="grid gap-2 overflow-y-auto max-h-[500px] pr-1">
                    {students.map((s:any)=>(
                        <div key={s.id} className="p-2 bg-white border border-gray-100 rounded-xl flex items-center justify-between group hover:border-indigo-200 transition-all card">
                            <div className="flex items-center gap-3">
                                <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center font-black text-indigo-400 text-[10px] uppercase">{s.name[0]}</div>
                                <div>
                                    <p className="font-bold text-gray-900 text-[11px] leading-tight">{s.name}</p>
                                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">{s.course} • {s.level}º ANO</p>
                                </div>
                            </div>
                            <div className="no-print">
                                <Button size="sm" variant="ghost" className="text-gray-200 hover:text-red-500" onClick={()=>BackendService.deleteUser(s.id).then(onUpdate)}><Trash2 size={13}/></Button>
                            </div>
                        </div>
                    ))}
                 </div>
            </div>
        </div>
    );
};
