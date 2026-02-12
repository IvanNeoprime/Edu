
import React, { useState, useEffect, useMemo } from 'react';
import { BackendService } from '../services/backend';
import { User, UserRole, Subject, Questionnaire, QuestionType, TeacherCategory, Question, Institution } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, cn } from './ui';
import { Users, BookOpen, Plus, Trash2, GraduationCap, Settings, Briefcase, CalendarClock, Eye, FileText, X, Lock, Unlock, MessageSquare, Star, Hash, CheckSquare, Save } from 'lucide-react';

interface Props {
  institutionId: string;
}

export const ManagerDashboard: React.FC<Props> = ({ institutionId }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'teachers' | 'students' | 'subjects' | 'questionnaire' | 'settings'>('overview');
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Questionnaire Editor State
  const [qTarget, setQTarget] = useState<'student' | 'teacher'>('student');
  const [editingQuestions, setEditingQuestions] = useState<Question[]>([]);
  const [qTitle, setQTitle] = useState('');
  
  // Preview States
  const [previewModal, setPreviewModal] = useState<{ open: boolean; type: 'standard' | 'current'; data?: Question[] }>({ open: false, type: 'standard' });

  // Forms States
  const [tForm, setTForm] = useState({ name: '', email: '', pwd: '', cat: 'assistente' as TeacherCategory });
  const [sForm, setSForm] = useState({ name: '', email: '', pwd: '', course: '', level: '1', shift: 'Diurno', groups: '' });
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
    if (q) {
        setEditingQuestions(q.questions);
        setQTitle(q.title);
    } else {
        setEditingQuestions([]);
        setQTitle(qTarget === 'student' ? 'Avaliação do Desempenho Docente' : 'Avaliação das Condições Institucionais');
    }
  };

  const addQuestion = () => {
    const newQ: Question = { id: 'q_' + Date.now(), text: '', type: 'stars', weight: 1 };
    setEditingQuestions([...editingQuestions, newQ]);
  };

  const updateQuestion = (id: string, field: keyof Question, value: any) => {
    setEditingQuestions(editingQuestions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const removeQuestion = (id: string) => {
    setEditingQuestions(editingQuestions.filter(q => q.id !== id));
  };

  const handleSaveQuestionnaire = async () => {
    if (editingQuestions.some(q => !q.text)) return alert("Todas as perguntas devem ter um texto.");
    try {
        await BackendService.saveQuestionnaire({
            id: 'q_' + qTarget + '_' + institutionId,
            institutionId,
            title: qTitle,
            targetRole: qTarget,
            questions: editingQuestions,
            active: true
        });
        alert("Inquérito salvo e publicado com sucesso!");
    } catch (e) { alert("Erro ao salvar inquérito."); }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    await BackendService.assignSubject({
        ...subForm,
        teacherId: subForm.tId,
        institutionId,
        academicYear: new Date().getFullYear().toString()
    });
    setSubForm({ ...subForm, name: '', code: '' });
    loadData();
    alert("Cadeira registada!");
  };

  const getQuestionTypeIcon = (type: QuestionType) => {
      switch(type) {
          case 'stars': return <Star size={16} className="text-yellow-500" />;
          case 'binary': return <CheckSquare size={16} className="text-green-500" />;
          case 'text': return <MessageSquare size={16} className="text-blue-500" />;
          case 'scale_10': return <Hash size={16} className="text-purple-500" />;
          default: return <Plus size={16} />;
      }
  };

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto animate-fade-in relative dark:bg-slate-950 min-h-screen transition-colors duration-300">
        {/* Preview Modal */}
        {previewModal.open && (
            <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 dark:bg-slate-900 dark:border-slate-800">
                    <button onClick={() => setPreviewModal({ ...previewModal, open: false })} className="absolute right-4 top-4 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-slate-500">
                        <X size={20} />
                    </button>
                    <CardHeader className="border-b dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
                        <CardTitle className="flex items-center gap-2 dark:text-white">
                            <Eye className="text-blue-600" />
                            {previewModal.type === 'standard' ? 'Modelo Padrão MECES' : `Preview: ${qTitle}`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {(previewModal.type === 'standard' ? [
                            { text: "O docente apresentou o programa temático?", type: 'binary' },
                            { text: "O docente foi acessível aos estudantes?", type: 'stars' },
                            { text: "Espaço para comentários adicionais", type: 'text' }
                        ] : editingQuestions).map((q: any, i) => (
                            <div key={i} className="p-5 border rounded-2xl bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm">
                                <p className="font-bold text-gray-800 dark:text-slate-100 mb-4">{i+1}. {q.text}</p>
                                <div className="flex gap-2">
                                    {q.type === 'binary' && <><div className="h-10 w-24 border rounded-lg bg-gray-50 dark:bg-slate-900 flex items-center justify-center text-xs font-bold dark:text-slate-400">Sim</div><div className="h-10 w-24 border rounded-lg bg-gray-50 dark:bg-slate-900 flex items-center justify-center text-xs font-bold dark:text-slate-400">Não</div></>}
                                    {q.type === 'stars' && <div className="flex gap-2">{[1,2,3,4,5].map(n => <Star key={n} size={24} className="text-gray-200 dark:text-slate-700" />)}</div>}
                                    {q.type === 'text' && <div className="h-24 w-full border rounded-lg bg-gray-50 dark:bg-slate-900 p-3 text-xs text-gray-400 dark:text-slate-500 italic">Resposta livre...</div>}
                                    {q.type === 'scale_10' && <div className="flex flex-wrap gap-1">{[1,2,3,4,5,6,7,8,9,10].map(n => <div key={n} className="h-8 w-8 border rounded-md flex items-center justify-center text-xs text-gray-400 dark:text-slate-500">{n}</div>)}</div>}
                                </div>
                            </div>
                        ))}
                        <Button onClick={() => setPreviewModal({ ...previewModal, open: false })} className="w-full h-12 rounded-xl">Fechar Visualização</Button>
                    </CardContent>
                </Card>
            </div>
        )}

        <header className="border-b dark:border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
              {institution?.logo && <img src={institution.logo} className="h-16 w-16 object-contain" alt="Logo" />}
              <div>
                  <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white uppercase">Gestão Académica</h1>
                  <p className="text-gray-500 dark:text-slate-400 font-medium">Instituição: {institution?.name} • {institution?.evaluationPeriodName}</p>
              </div>
          </div>
          <div className="flex bg-gray-100 dark:bg-slate-900 p-1 rounded-2xl flex-wrap gap-1 shadow-inner border dark:border-slate-800">
              {[
                  {id: 'overview', label: 'Dashboard', icon: Briefcase},
                  {id: 'teachers', label: 'Docentes', icon: Users},
                  {id: 'students', label: 'Alunos', icon: GraduationCap},
                  {id: 'subjects', label: 'Cadeiras', icon: BookOpen},
                  {id: 'questionnaire', label: 'Inquérito', icon: FileText},
                  {id: 'settings', label: 'Definições', icon: Settings},
              ].map(tab => (
                  <button 
                    key={tab.id} 
                    onClick={() => setActiveTab(tab.id as any)} 
                    className={cn(
                        "px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all",
                        activeTab === tab.id 
                          ? "bg-white dark:bg-slate-800 shadow-md text-black dark:text-white scale-105" 
                          : "text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100"
                    )}
                  >
                      <tab.icon size={14} /> {tab.label.toUpperCase()}
                  </button>
              ))}
          </div>
        </header>

        {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-2">
                <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-slate-900 dark:to-slate-900 border-blue-100 dark:border-blue-900/30">
                  <CardContent className="pt-6">
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-black tracking-widest mb-1">Total Docentes</p>
                    <p className="text-4xl font-black dark:text-white">{teachers.length}</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-indigo-50 to-white dark:from-slate-900 dark:to-slate-900 border-indigo-100 dark:border-indigo-900/30">
                  <CardContent className="pt-6">
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-black tracking-widest mb-1">Alunos Ativos</p>
                    <p className="text-4xl font-black dark:text-white">{students.length}</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-slate-900 dark:to-slate-900 border-purple-100 dark:border-purple-900/30">
                  <CardContent className="pt-6">
                    <p className="text-[10px] text-purple-600 dark:text-purple-400 uppercase font-black tracking-widest mb-1">Disciplinas</p>
                    <p className="text-4xl font-black dark:text-white">{subjects.length}</p>
                  </CardContent>
                </Card>
                <Card className={cn("border-2", institution?.isEvaluationOpen ? 'bg-green-50/30 border-green-200 dark:bg-green-900/10 dark:border-green-900/30' : 'bg-red-50/30 border-red-200 dark:bg-red-900/10 dark:border-red-900/30')}>
                  <CardContent className="pt-6">
                    <p className="text-[10px] uppercase font-black tracking-widest mb-1 dark:text-slate-400">Portal Público</p>
                    <p className="text-xl font-black flex items-center gap-2 dark:text-white">
                      {institution?.isEvaluationOpen ? <><Unlock className="text-green-600" size={20}/> ABERTO</> : <><Lock className="text-red-600" size={20}/> FECHADO</>}
                    </p>
                  </CardContent>
                </Card>
            </div>
        )}

        {activeTab === 'questionnaire' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-right-4">
                <div className="lg:col-span-4 space-y-6">
                    <Card className="border-black dark:border-slate-800 shadow-xl dark:bg-slate-900">
                        <CardHeader><CardTitle className="dark:text-white">Estrutura Global</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Público-Alvo</Label>
                                <div className="flex p-1 bg-gray-100 dark:bg-slate-800 rounded-xl gap-1">
                                    <button onClick={() => setQTarget('student')} className={cn("flex-1 py-2 text-[10px] font-black rounded-lg transition-all", qTarget === 'student' ? "bg-white dark:bg-slate-700 shadow text-black dark:text-white" : "text-gray-500")}>ALUNOS</button>
                                    <button onClick={() => setQTarget('teacher')} className={cn("flex-1 py-2 text-[10px] font-black rounded-lg transition-all", qTarget === 'teacher' ? "bg-white dark:bg-slate-700 shadow text-black dark:text-white" : "text-gray-500")}>DOCENTES</button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Título do Inquérito</Label>
                                <Input value={qTitle} onChange={e => setQTitle(e.target.value)} placeholder="Ex: Avaliação Docente 2024" />
                            </div>
                            <div className="space-y-3 pt-4 border-t dark:border-slate-800">
                                <Button variant="outline" className="w-full justify-start rounded-xl" onClick={() => setPreviewModal({ open: true, type: 'standard' })}><FileText className="mr-2 h-4 w-4" /> Modelo MECES (Padrão)</Button>
                                <Button variant="outline" className="w-full justify-start text-blue-600 border-blue-200 dark:border-blue-900/50 rounded-xl" onClick={() => setPreviewModal({ open: true, type: 'current', data: editingQuestions })}><Eye className="mr-2 h-4 w-4" /> Ver Rascunho Atual</Button>
                                <Button className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white rounded-xl" onClick={handleSaveQuestionnaire}><Save className="mr-2 h-4 w-4" /> Publicar Inquérito</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-8 space-y-4">
                    <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-5 rounded-2xl border dark:border-slate-800 shadow-sm">
                        <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2">QUESTÕES ({editingQuestions.length})</h3>
                        <Button size="sm" onClick={addQuestion} className="bg-black dark:bg-blue-600 dark:hover:bg-blue-500 text-white hover:scale-105 transition-all rounded-xl"><Plus size={16} className="mr-1" /> ADICIONAR QUESTÃO</Button>
                    </div>

                    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                        {editingQuestions.length === 0 && (
                            <div className="text-center py-24 border-2 border-dashed rounded-[2rem] bg-gray-50 dark:bg-slate-900 dark:border-slate-800">
                                <p className="text-gray-400 dark:text-slate-500 font-bold uppercase tracking-widest">Nenhuma questão no rascunho</p>
                            </div>
                        )}
                        {editingQuestions.map((q, index) => (
                            <Card key={q.id} className="group hover:border-blue-400 dark:hover:border-blue-500 transition-all rounded-2xl shadow-sm dark:bg-slate-900">
                                <CardContent className="pt-6">
                                    <div className="flex gap-4">
                                        <div className="flex flex-col items-center gap-2 shrink-0">
                                            <div className="h-10 w-10 bg-gray-900 dark:bg-slate-800 text-white rounded-2xl flex items-center justify-center font-black text-sm shadow-lg">{index + 1}</div>
                                            <div className="h-full w-0.5 bg-gray-100 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30"></div>
                                        </div>
                                        <div className="flex-1 space-y-5">
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <textarea 
                                                      placeholder="Digite a pergunta aqui..." 
                                                      value={q.text} 
                                                      onChange={e => updateQuestion(q.id, 'text', e.target.value)} 
                                                      className="w-full bg-transparent font-bold text-lg dark:text-slate-100 border-none focus:ring-0 px-0 resize-none h-auto min-h-[40px] outline-none"
                                                      rows={1}
                                                    />
                                                </div>
                                                <Button variant="ghost" size="sm" onClick={() => removeQuestion(q.id)} className="text-gray-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400"><Trash2 size={18} /></Button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border dark:border-slate-800">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] uppercase dark:text-slate-500">Tipo de Resposta</Label>
                                                    <Select value={q.type} onChange={e => updateQuestion(q.id, 'type', e.target.value as QuestionType)} className="h-9 text-xs font-bold">
                                                        <option value="stars">ESTRELAS (1-5)</option>
                                                        <option value="binary">SIM / NÃO</option>
                                                        <option value="scale_10">ESCALA (1-10)</option>
                                                        <option value="text">RESPOSTA ABERTA</option>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] uppercase dark:text-slate-500">Peso Académico</Label>
                                                    <Select value={q.weight} onChange={e => updateQuestion(q.id, 'weight', parseInt(e.target.value))} className="h-9 text-xs font-bold">
                                                        <option value="1">NORMAL (1x)</option>
                                                        <option value="2">IMPORTANTE (2x)</option>
                                                        <option value="3">CRÍTICO (3x)</option>
                                                    </Select>
                                                </div>
                                                <div className="flex items-end justify-center lg:justify-end">
                                                    <div className="flex items-center gap-2 text-gray-400 dark:text-slate-500 text-[10px] font-black uppercase bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border dark:border-slate-800">
                                                        {getQuestionTypeIcon(q.type)}
                                                        {q.type.replace('_', ' ')}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'subjects' && (
            <div className="grid gap-8 lg:grid-cols-12 animate-in slide-in-from-left-4">
                <div className="lg:col-span-5">
                    <Card className="border-blue-200 dark:border-slate-800 shadow-xl dark:bg-slate-900">
                        <CardHeader className="bg-blue-50/50 dark:bg-slate-800/50 rounded-t-xl border-b dark:border-slate-800"><CardTitle className="dark:text-white">Registo de Cadeira</CardTitle></CardHeader>
                        <CardContent className="pt-6">
                            <form onSubmit={handleAddSubject} className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2"><Label>Nome da Cadeira</Label><Input value={subForm.name} onChange={e=>setSubForm({...subForm, name: e.target.value})} placeholder="Ex: Geologia de Moçambique" /></div>
                                    <div><Label>Código</Label><Input value={subForm.code} onChange={e=>setSubForm({...subForm, code: e.target.value})} placeholder="Ex: GEO301" /></div>
                                    <div>
                                        <Label>Docente</Label>
                                        <Select value={subForm.tId} onChange={e=>setSubForm({...subForm, tId: e.target.value})}>
                                            <option value="">Escolher...</option>
                                            {teachers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                                        </Select>
                                    </div>
                                    <div className="col-span-2"><Label>Curso</Label><Input value={subForm.course} onChange={e=>setSubForm({...subForm, course: e.target.value})} placeholder="Ex: Engenharia de Minas" /></div>
                                    <div><Label>Ano Curricular</Label><Select value={subForm.level} onChange={e=>setSubForm({...subForm, level: e.target.value})}><option value="1">1º Ano</option><option value="2">2º Ano</option><option value="3">3º Ano</option><option value="4">4º Ano</option><option value="5">5º Ano</option><option value="6">6º Ano</option></Select></div>
                                    <div><Label>Semestre</Label><Select value={subForm.semester} onChange={e=>setSubForm({...subForm, semester: e.target.value as any})}><option value="1">1º Semestre</option><option value="2">2º Semestre</option></Select></div>
                                    <div><Label>Turma</Label><Input value={subForm.group} onChange={e=>setSubForm({...subForm, group: e.target.value})} placeholder="Ex: B" /></div>
                                    <div><Label>Turno</Label><Select value={subForm.shift} onChange={e=>setSubForm({...subForm, shift: e.target.value as any})}><option value="Diurno">Diurno</option><option value="Noturno">Noturno</option></Select></div>
                                </div>
                                <Button type="submit" className="w-full h-12 bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-xl font-bold">CRIAR CADEIRA</Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-7 space-y-4">
                    <h3 className="font-black text-lg dark:text-white uppercase tracking-tight">Cadeiras Registadas ({subjects.length})</h3>
                    <div className="grid grid-cols-1 gap-4 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
                        {subjects.map(s => (
                            <div key={s.id} className="p-5 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl flex justify-between items-center shadow-sm hover:shadow-lg transition-all">
                                <div className="flex gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-slate-800 flex flex-col items-center justify-center font-black text-gray-500 dark:text-slate-400 border dark:border-slate-700">
                                      <span className="text-[8px] uppercase">Sem</span>
                                      <span className="text-lg">{s.semester}</span>
                                    </div>
                                    <div>
                                        <p className="font-black text-gray-900 dark:text-white text-lg">{s.name} <span className="text-xs text-gray-400 font-normal uppercase">[{s.code}]</span></p>
                                        <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">{s.course} • {s.level}º Ano • Turma {s.classGroup}</p>
                                        <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 mt-2 uppercase flex items-center gap-1"><Users size={12}/> {teachers.find(t=>t.id === s.teacherId)?.name || 'N/D'}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={()=>BackendService.deleteSubject(s.id).then(loadData)} className="text-gray-300 dark:text-slate-700 hover:text-red-500 dark:hover:text-red-400"><Trash2 size={20}/></Button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Reusing components but updating them for Dark Mode and 6 years */}
        {activeTab === 'teachers' && <TeachersTab teachers={teachers} institutionId={institutionId} onUpdate={loadData} />}
        {activeTab === 'students' && <StudentsTab students={students} institutionId={institutionId} onUpdate={loadData} />}
        {activeTab === 'settings' && institution && <SettingsTab institution={institution} onUpdate={loadData} />}
    </div>
  );
};

// Simplified sub-components updated for dark mode and 6 years
const TeachersTab = ({ teachers, institutionId, onUpdate }: any) => {
    const [f, setF] = useState({ name: '', email: '', pwd: '', cat: 'assistente' });
    const add = async (e: any) => {
        e.preventDefault();
        await BackendService.addTeacher(institutionId, f.name, f.email, f.pwd, '', f.cat as any);
        setF({ name: '', email: '', pwd: '', cat: 'assistente' });
        onUpdate();
        alert("Docente adicionado!");
    };
    return (
        <div className="grid lg:grid-cols-12 gap-8 animate-in fade-in">
            <div className="lg:col-span-4">
                <Card className="dark:bg-slate-900 dark:border-slate-800"><CardHeader><CardTitle className="dark:text-white">Novo Docente</CardTitle></CardHeader>
                <CardContent><form onSubmit={add} className="space-y-4">
                    <Input placeholder="Nome Completo" value={f.name} onChange={e=>setF({...f, name: e.target.value})} />
                    <Input placeholder="Email Institucional" value={f.email} onChange={e=>setF({...f, email: e.target.value})} />
                    <Input placeholder="Senha de Primeiro Acesso" type="password" value={f.pwd} onChange={e=>setF({...f, pwd: e.target.value})} />
                    <Select value={f.cat} onChange={e=>setF({...f, cat: e.target.value})}><option value="assistente">Assistente (Pleno)</option><option value="assistente_estagiario">Assistente Estagiário</option></Select>
                    <Button type="submit" className="w-full h-12 rounded-xl">CADASTRAR</Button>
                </form></CardContent></Card>
            </div>
            <div className="lg:col-span-8">
                <Card className="dark:bg-slate-900 dark:border-slate-800"><CardContent className="pt-6 space-y-2 max-h-[70vh] overflow-y-auto custom-scrollbar">{teachers.map((t:any)=>(<div key={t.id} className="p-4 border dark:border-slate-800 rounded-xl flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/20"><div><p className="font-bold dark:text-white">{t.name}</p><p className="text-xs text-gray-500 dark:text-slate-400">{t.email} • {t.category}</p></div><Button size="sm" variant="ghost" className="text-red-500" onClick={()=>BackendService.deleteUser(t.id).then(onUpdate)}><Trash2 size={18}/></Button></div>))}</CardContent></Card>
            </div>
        </div>
    );
};

const StudentsTab = ({ students, institutionId, onUpdate }: any) => {
    const [f, setF] = useState({ name: '', email: '', pwd: '', course: '', level: '1', shift: 'Diurno', groups: '' });
    const add = async (e: any) => {
        e.preventDefault();
        await BackendService.addStudent(institutionId, f.name, f.email, f.pwd, f.course, f.level, '', [f.shift as any], f.groups.split(','));
        setF({ name: '', email: '', pwd: '', course: '', level: '1', shift: 'Diurno', groups: '' });
        onUpdate();
        alert("Aluno adicionado!");
    };
    return (
        <div className="grid lg:grid-cols-12 gap-8 animate-in fade-in">
            <div className="lg:col-span-4">
                <Card className="dark:bg-slate-900 dark:border-slate-800"><CardHeader><CardTitle className="dark:text-white">Novo Aluno</CardTitle></CardHeader>
                <CardContent><form onSubmit={add} className="space-y-4">
                    <Input placeholder="Nome Completo" value={f.name} onChange={e=>setF({...f, name: e.target.value})} />
                    <Input placeholder="Email" value={f.email} onChange={e=>setF({...f, email: e.target.value})} />
                    <Input placeholder="Senha" type="password" value={f.pwd} onChange={e=>setF({...f, pwd: e.target.value})} />
                    <Input placeholder="Curso (Ex: Direito)" value={f.course} onChange={e=>setF({...f, course: e.target.value})} />
                    <Select value={f.level} onChange={e=>setF({...f, level: e.target.value})}><option value="1">1º Ano</option><option value="2">2º Ano</option><option value="3">3º Ano</option><option value="4">4º Ano</option><option value="5">5º Ano</option><option value="6">6º Ano</option></Select>
                    <Select value={f.shift} onChange={e=>setF({...f, shift: e.target.value})}><option value="Diurno">Diurno</option><option value="Noturno">Noturno</option></Select>
                    <Input placeholder="Turmas (Ex: A, B)" value={f.groups} onChange={e=>setF({...f, groups: e.target.value})} />
                    <Button type="submit" className="w-full h-12 rounded-xl">CADASTRAR</Button>
                </form></CardContent></Card>
            </div>
            <div className="lg:col-span-8">
                <Card className="dark:bg-slate-900 dark:border-slate-800"><CardContent className="pt-6 space-y-2 max-h-[70vh] overflow-y-auto custom-scrollbar">{students.map((t:any)=>(<div key={t.id} className="p-4 border dark:border-slate-800 rounded-xl flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/20"><div><p className="font-bold dark:text-white">{t.name}</p><p className="text-xs text-gray-500 dark:text-slate-400">{t.course} • {t.level}º Ano</p></div><Button size="sm" variant="ghost" className="text-red-500" onClick={()=>BackendService.deleteUser(t.id).then(onUpdate)}><Trash2 size={18}/></Button></div>))}</CardContent></Card>
            </div>
        </div>
    );
};

const SettingsTab = ({ institution, onUpdate }: any) => {
    return (
        <Card className="max-w-md mx-auto dark:bg-slate-900 dark:border-slate-800">
            <CardHeader><CardTitle className="dark:text-white">Estado do Sistema</CardTitle></CardHeader>
            <CardContent className="space-y-6">
                <div className="flex justify-between items-center p-5 border dark:border-slate-800 rounded-2xl bg-gray-50/50 dark:bg-slate-800/20">
                    <div><p className="font-bold dark:text-white uppercase tracking-wider text-xs">Avaliação Pública</p><p className="text-[10px] text-gray-500 dark:text-slate-400">Controla o acesso de alunos</p></div>
                    <Button variant={institution.isEvaluationOpen ? "destructive" : "primary"} onClick={()=>BackendService.updateInstitution(institution.id, { isEvaluationOpen: !institution.isEvaluationOpen }).then(onUpdate)} className="rounded-xl px-6">
                        {institution.isEvaluationOpen ? "FECHAR" : "ABRIR"}
                    </Button>
                </div>
                <div className="space-y-2">
                    <Label>Identificador do Período</Label>
                    <Input value={institution.evaluationPeriodName} onChange={e => BackendService.updateInstitution(institution.id, { evaluationPeriodName: e.target.value }).then(onUpdate)} />
                </div>
            </CardContent>
        </Card>
    );
};
