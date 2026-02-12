
import React, { useState, useEffect, useMemo } from 'react';
import { BackendService } from '../services/backend';
import { User, UserRole, Subject, Questionnaire, QuestionType, TeacherCategory, CombinedScore, Question, Institution, SelfEvaluation } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from './ui';
import { Users, Check, BookOpen, Calculator, AlertCircle, Plus, Trash2, FileQuestion, ChevronDown, ChevronUp, UserPlus, Star, BarChartHorizontal, Key, GraduationCap, Download, Printer, Image as ImageIcon, Settings, Building2, Save, FileText, ClipboardList, Shield, Edit, Lock, Unlock, CalendarClock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  institutionId: string;
}

interface NewSubjectItem {
    name: string;
    code: string;
    course: string;
    level: string;
    classGroup: string;
    shift: 'Diurno' | 'Noturno';
}

export const ManagerDashboard: React.FC<Props> = ({ institutionId }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'teachers' | 'students' | 'qualitative' | 'questionnaire' | 'stats' | 'settings'>('overview');
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [unapproved, setUnapproved] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allScores, setAllScores] = useState<CombinedScore[]>([]);
  const [allSelfEvals, setAllSelfEvals] = useState<Record<string, SelfEvaluation>>({});
  
  const [qualEvals, setQualEvals] = useState<Record<string, { deadlines: number, quality: number, comments: string }>>({});
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  // States for printing
  const [printingTeacher, setPrintingTeacher] = useState<User | null>(null);
  const [printingScore, setPrintingScore] = useState<CombinedScore | null>(null);
  const [printingSelfEval, setPrintingSelfEval] = useState<SelfEvaluation | null>(null);

  // Edit User State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Questionnaire State
  const [targetRole, setTargetRole] = useState<'student' | 'teacher'>('student');
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  
  // Form Builder State
  const [newQText, setNewQText] = useState('');
  const [newQType, setNewQType] = useState<QuestionType>('binary');
  const [newQWeight, setNewQWeight] = useState(1);
  const [newQOptions, setNewQOptions] = useState('');

  // Form State for New Teacher
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherPwd, setNewTeacherPwd] = useState('');
  const [newTeacherAvatar, setNewTeacherAvatar] = useState('');
  const [newTeacherCategory, setNewTeacherCategory] = useState<TeacherCategory>('assistente');
  const [newTeacherSubjects, setNewTeacherSubjects] = useState<NewSubjectItem[]>([]);

  // Temp subject form
  const [tempSubject, setTempSubject] = useState<NewSubjectItem>({ name: '', code: '', course: '', level: '', classGroup: '', shift: 'Diurno'});

  // Form State for New Student
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentPwd, setNewStudentPwd] = useState('');
  const [newStudentCourse, setNewStudentCourse] = useState('');
  const [newStudentLevel, setNewStudentLevel] = useState('');
  const [newStudentAvatar, setNewStudentAvatar] = useState('');
  const [newStudentShifts, setNewStudentShifts] = useState<string[]>([]);
  const [newStudentClassGroups, setNewStudentClassGroups] = useState('');

  useEffect(() => { loadData(); }, [institutionId]);
  useEffect(() => { loadQuestionnaire(); }, [targetRole, institutionId]);

  useEffect(() => {
    if (activeTab === 'stats' || activeTab === 'overview') {
        BackendService.getAllScores(institutionId).then(setAllScores);
    }
  }, [activeTab, institutionId]);

  const loadQuestionnaire = async () => {
    const q = await BackendService.getInstitutionQuestionnaire(institutionId, targetRole);
    setQuestionnaire(q);
  };

  const loadData = async () => {
    setLoading(true);
    try {
        const inst = await BackendService.getInstitution(institutionId);
        if (inst) setInstitution(inst);
        const allUsers = await BackendService.getUsers();
        setTeachers(allUsers.filter(u => u.role === UserRole.TEACHER && u.institutionId === institutionId));
        setStudents(allUsers.filter(u => u.role === UserRole.STUDENT && u.institutionId === institutionId));
        setUnapproved(await BackendService.getUnapprovedTeachers(institutionId));
        setSubjects(await BackendService.getInstitutionSubjects(institutionId));
        loadQuestionnaire();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja eliminar o utilizador "${name}"? Todos os seus dados associados serão perdidos.`)) {
        await BackendService.deleteUser(userId);
        alert("Utilizador eliminado.");
        loadData();
    }
  };

  const handleToggleEvaluation = async () => {
    if (!institution) return;
    const newState = !institution.isEvaluationOpen;
    await BackendService.updateInstitution(institutionId, { isEvaluationOpen: newState });
    setInstitution({ ...institution, isEvaluationOpen: newState });
    alert(`Período de avaliação ${newState ? 'Aberto' : 'Fechado'}.`);
  };

  const handleUpdatePeriodName = async (name: string) => {
    if (!institution) return;
    await BackendService.updateInstitution(institutionId, { evaluationPeriodName: name });
    setInstitution({ ...institution, evaluationPeriodName: name });
  };

  const handleCalculateScores = async () => {
    setCalculating(true);
    try {
        await BackendService.calculateScores(institutionId);
        const scores = await BackendService.getAllScores(institutionId);
        setAllScores(scores);
        alert("Cálculo concluído!");
    } catch (e) { alert(e); } finally { setCalculating(false); }
  };

  const startEditUser = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
  };

  const handleSaveEditUser = async () => {
    if (!editingUser) return;
    await BackendService.updateUser(editingUser.id, { name: editName, email: editEmail });
    alert("Dados atualizados.");
    setEditingUser(null);
    loadData();
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    const newUser = await BackendService.addTeacher(institutionId, newTeacherName, newTeacherEmail, newTeacherPwd, newTeacherAvatar, newTeacherCategory);
    for (const sub of newTeacherSubjects) {
        await BackendService.assignSubject({ ...sub, teacherId: newUser.id, institutionId });
    }
    setNewTeacherName(''); setNewTeacherSubjects([]);
    loadData();
    alert("Docente cadastrado!");
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    await BackendService.addStudent(institutionId, newStudentName, newStudentEmail, newStudentPwd, newStudentCourse, newStudentLevel, newStudentAvatar, newStudentShifts, newStudentClassGroups.split(',').map(s=>s.trim()));
    setNewStudentName('');
    loadData();
    alert("Estudante cadastrado!");
  };

  const handleAddQuestion = async () => {
    if (!newQText) return;
    const newQuestion = { id: 'q_'+Date.now(), text: newQText, type: newQType, weight: newQWeight, options: newQOptions ? newQOptions.split(',') : undefined };
    const updatedQ = questionnaire ? { ...questionnaire, questions: [...questionnaire.questions, newQuestion] } : { id: 'q_'+Date.now(), institutionId, title: 'Questionário', questions: [newQuestion], active: true, targetRole };
    setQuestionnaire(updatedQ as any);
    await BackendService.saveQuestionnaire(updatedQ);
    setNewQText('');
  };

  const groupedStudents = useMemo(() => students.reduce((acc, student) => {
    const course = student.course || 'Sem Curso';
    const level = student.level || 'Sem Ano';
    if (!acc[course]) acc[course] = {};
    if (!acc[course][level]) acc[course][level] = [];
    acc[course][level].push(student);
    return acc;
  }, {} as any), [students]);

  const chartData = useMemo(() => allScores.map(score => {
    const teacher = teachers.find(t => t.id === score.teacherId);
    return { name: teacher?.name.split(' ')[0] || 'Docente', finalScore: score.finalScore };
  }), [allScores, teachers]);

  return (
    <div className="print:hidden space-y-8 p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
        {editingUser && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-md shadow-2xl">
                    <CardHeader className="border-b"><CardTitle>Editar Utilizador</CardTitle></CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <div><Label>Nome</Label><Input value={editName} onChange={e => setEditName(e.target.value)} /></div>
                        <div><Label>Email</Label><Input value={editEmail} onChange={e => setEditEmail(e.target.value)} /></div>
                        <div className="flex justify-end gap-3 pt-4"><Button variant="ghost" onClick={() => setEditingUser(null)}>Cancelar</Button><Button onClick={handleSaveEditUser}>Salvar</Button></div>
                    </CardContent>
                </Card>
            </div>
        )}

        <header className="border-b pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
              {institution?.logo && <img src={institution.logo} className="h-16 w-16 object-contain" alt="Logo" />}
              <div>
                  <h1 className="text-3xl font-bold tracking-tight">{institution?.name || 'Gestão'}</h1>
                  <p className="text-gray-500">Administração de Docentes e Avaliações</p>
              </div>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-lg flex-wrap gap-1">
              {['overview', 'teachers', 'students', 'qualitative', 'questionnaire', 'stats', 'settings'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === tab ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
              ))}
          </div>
        </header>

        {activeTab === 'overview' && (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card><CardHeader><CardTitle className="text-gray-500 text-sm">Docentes</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{teachers.length}</CardContent></Card>
                    <Card><CardHeader><CardTitle className="text-gray-500 text-sm">Alunos</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{students.length}</CardContent></Card>
                    <Card className={institution?.isEvaluationOpen ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}><CardHeader><CardTitle className="text-gray-500 text-sm">Estado do Período</CardTitle></CardHeader><CardContent className="text-xl font-bold flex items-center gap-2">{institution?.isEvaluationOpen ? <Unlock className="text-green-600"/> : <Lock className="text-red-600"/>} {institution?.isEvaluationOpen ? 'Aberto' : 'Fechado'}</CardContent></Card>
                </div>
                <Card className="bg-slate-800 text-white"><CardContent className="pt-6 flex justify-between items-center"><p>Processar notas finais do semestre.</p><Button onClick={handleCalculateScores} disabled={calculating} className="bg-white text-black hover:bg-gray-100"><Calculator className="mr-2 h-4 w-4"/> Calcular Agora</Button></CardContent></Card>
            </div>
        )}

        {activeTab === 'teachers' && (
            <div className="grid gap-8 lg:grid-cols-12">
                <div className="lg:col-span-5"><Card><CardHeader><CardTitle>Cadastrar Docente</CardTitle></CardHeader><CardContent><form onSubmit={handleAddTeacher} className="space-y-4"><div><Label>Nome</Label><Input value={newTeacherName} onChange={e=>setNewTeacherName(e.target.value)} required/></div><div><Label>Email</Label><Input value={newTeacherEmail} onChange={e=>setNewTeacherEmail(e.target.value)} required/></div><div><Label>Senha</Label><Input value={newTeacherPwd} onChange={e=>setNewTeacherPwd(e.target.value)} required/></div><Button type="submit" className="w-full">Cadastrar</Button></form></CardContent></Card></div>
                <div className="lg:col-span-7"><Card><CardHeader><CardTitle>Lista de Docentes</CardTitle></CardHeader><CardContent className="space-y-2">{teachers.map(t=>(<div key={t.id} className="p-3 border rounded-lg flex justify-between items-center"><div><p className="font-medium">{t.name}</p><p className="text-xs text-gray-500">{t.email}</p></div><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={()=>startEditUser(t)}><Edit size={16}/></Button><Button variant="ghost" size="sm" onClick={()=>handleDeleteUser(t.id, t.name)} className="text-red-500"><Trash2 size={16}/></Button></div></div>))}</CardContent></Card></div>
            </div>
        )}

        {activeTab === 'students' && (
            <div className="grid gap-8 lg:grid-cols-12">
                <div className="lg:col-span-4"><Card><CardHeader><CardTitle>Cadastrar Aluno</CardTitle></CardHeader><CardContent><form onSubmit={handleAddStudent} className="space-y-4"><div><Label>Nome</Label><Input value={newStudentName} onChange={e=>setNewStudentName(e.target.value)} required/></div><div><Label>Email</Label><Input value={newStudentEmail} onChange={e=>setNewStudentEmail(e.target.value)} required/></div><Button type="submit" className="w-full">Cadastrar</Button></form></CardContent></Card></div>
                <div className="lg:col-span-8"><Card><CardHeader><CardTitle>Lista de Alunos</CardTitle></CardHeader><CardContent className="space-y-2">{students.map(s=>(<div key={s.id} className="p-3 border rounded-lg flex justify-between items-center"><div><p className="font-medium">{s.name}</p><p className="text-xs text-gray-500">{s.email}</p></div><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={()=>startEditUser(s)}><Edit size={16}/></Button><Button variant="ghost" size="sm" onClick={()=>handleDeleteUser(s.id, s.name)} className="text-red-500"><Trash2 size={16}/></Button></div></div>))}</CardContent></Card></div>
            </div>
        )}

        {activeTab === 'settings' && (
            <div className="space-y-6 max-w-2xl mx-auto">
                <Card className="border-indigo-100 shadow-sm">
                    <CardHeader className="bg-indigo-50/50"><CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-indigo-700"/> Gestão do Período de Avaliação</CardTitle></CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="space-y-2">
                            <Label>Nome do Período Atual</Label>
                            <Input value={institution?.evaluationPeriodName || ''} onChange={e => handleUpdatePeriodName(e.target.value)} placeholder="Ex: Semestre 1, 2024" />
                            <p className="text-xs text-gray-500">Este nome aparecerá nos relatórios e para os alunos.</p>
                        </div>
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                            <div>
                                <h4 className="font-bold">Estado das Submissões</h4>
                                <p className="text-sm text-gray-500">{institution?.isEvaluationOpen ? 'Alunos e Docentes podem preencher formulários.' : 'O sistema está bloqueado para novas respostas.'}</p>
                            </div>
                            <Button variant={institution?.isEvaluationOpen ? 'destructive' : 'primary'} onClick={handleToggleEvaluation}>
                                {institution?.isEvaluationOpen ? <><Lock className="mr-2 h-4 w-4"/> Fechar Período</> : <><Unlock className="mr-2 h-4 w-4"/> Abrir Período</>}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                <Card><CardHeader><CardTitle>Dados da Instituição</CardTitle></CardHeader><CardContent className="space-y-4"><div><Label>Nome</Label><Input value={institution?.name || ''} onChange={e=>setInstitution({...institution!, name: e.target.value})}/></div><Button onClick={()=>BackendService.updateInstitution(institutionId, {name: institution?.name})}>Salvar Alterações</Button></CardContent></Card>
            </div>
        )}

        {activeTab === 'stats' && (
            <Card><CardHeader><CardTitle>Resultados Globais</CardTitle></CardHeader><CardContent><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Tooltip/><Legend/><Bar dataKey="finalScore" fill="#3b82f6" name="Pontuação Final"/></BarChart></ResponsiveContainer></div></CardContent></Card>
        )}
    </div>
  );
};
