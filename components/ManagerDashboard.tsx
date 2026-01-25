
import React, { useState, useEffect, useMemo } from 'react';
import { BackendService } from '../services/backend';
// import { AIService } from '../services/ai'; // Removed AI Service
import { User, UserRole, Subject, Questionnaire, QuestionType, TeacherCategory, CombinedScore, Question, Institution } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from './ui';
import { Users, Check, BookOpen, Calculator, AlertCircle, Plus, Trash2, FileQuestion, ChevronDown, ChevronUp, UserPlus, Star, List, Type, BarChartHorizontal, Key, GraduationCap, PieChart as PieIcon, Download, Printer, Image as ImageIcon, Sparkles, RefreshCw, ScanText, Eye, Settings, Building2, Save, FileText, X, TrendingUp, ClipboardList, CheckCircle2, Lock, Shield, Edit } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

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
  
  const [qualEvals, setQualEvals] = useState<Record<string, { deadlines: number, quality: number, comments: string }>>({});
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  // Edit User State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Questionnaire State
  const [targetRole, setTargetRole] = useState<'student' | 'teacher'>('student');
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  
  // Form Builder State
  const [newQText, setNewQText] = useState('');
  const [newQType, setNewQType] = useState<QuestionType>('binary'); // Default Sim/Não
  const [newQWeight, setNewQWeight] = useState(1);
  const [newQOptions, setNewQOptions] = useState(''); // Comma separated

  // Form State for New Teacher
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherPwd, setNewTeacherPwd] = useState('');
  const [newTeacherAvatar, setNewTeacherAvatar] = useState('');
  const [newTeacherCategory, setNewTeacherCategory] = useState<TeacherCategory>('assistente');
  const [newTeacherSubjects, setNewTeacherSubjects] = useState<NewSubjectItem[]>([]);

  // Form State for New Student
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentPwd, setNewStudentPwd] = useState('');
  const [newStudentCourse, setNewStudentCourse] = useState('');
  const [newStudentLevel, setNewStudentLevel] = useState('');
  const [newStudentAvatar, setNewStudentAvatar] = useState('');
  // Multi-selection states
  const [newStudentShifts, setNewStudentShifts] = useState<string[]>([]);
  const [newStudentClassGroups, setNewStudentClassGroups] = useState('');

  // Calculate unique courses available in the institution
  const uniqueCourses = useMemo(() => {
      const courses = new Set<string>();
      subjects.forEach(s => {
          if (s.course && s.course.trim() !== '') {
              courses.add(s.course.trim());
          }
      });
      return Array.from(courses).sort();
  }, [subjects]);

  useEffect(() => {
    loadData();
  }, [institutionId]);

  useEffect(() => {
      loadQuestionnaire();
  }, [targetRole, institutionId]);

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
        
        const potentialTeachers = allUsers.filter(u => u.role === UserRole.TEACHER && u.institutionId === institutionId);
        setTeachers(potentialTeachers);
        
        const instStudents = allUsers.filter(u => u.role === UserRole.STUDENT && u.institutionId === institutionId);
        setStudents(instStudents);

        setUnapproved(await BackendService.getUnapprovedTeachers(institutionId));
        
        const instSubjects = await BackendService.getInstitutionSubjects(institutionId);
        setSubjects(instSubjects);

        loadQuestionnaire();
        
        const loadedEvals: Record<string, { deadlines: number, quality: number, comments: string }> = {};
        for (const t of potentialTeachers) {
            const ev = await BackendService.getQualitativeEval(t.id);
            loadedEvals[t.id] = {
                deadlines: ev?.deadlineCompliance || 0,
                quality: ev?.workQuality || 0,
                comments: ev?.comments || ''
            };
        }
        setQualEvals(loadedEvals);
    } catch (e) {
        console.error("Erro ao carregar dados:", e);
    } finally {
        setLoading(false);
    }
  };

  const startEditUser = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
  };

  const handleSaveEditUser = async () => {
      if (!editingUser) return;
      try {
          await BackendService.updateUser(editingUser.id, {
              name: editName,
              email: editEmail
          });
          alert("Dados atualizados com sucesso!");
          setEditingUser(null);
          loadData();
      } catch (e: any) {
          alert("Erro ao atualizar: " + e.message);
      }
  };

  const handleCalculateScores = async () => {
    setCalculating(true);
    try {
        await BackendService.calculateScores(institutionId);
        const scores = await BackendService.getAllScores(institutionId);
        setAllScores(scores);
        alert("Cálculo de notas realizado com sucesso!");
    } catch (e) {
        alert("Erro ao calcular: " + e);
    } finally {
        setCalculating(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 500 * 1024) return alert("Foto muito grande. Máx 500KB.");
          const reader = new FileReader();
          reader.onload = (ev) => setter(ev.target?.result as string);
          reader.readAsDataURL(file);
      }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!newTeacherName.trim() || !newTeacherEmail.trim() || !newTeacherPwd.trim()) {
          alert("Por favor, preencha Nome, Email e Senha.");
          return;
      }

      try {
          const newUser = await BackendService.addTeacher(
              institutionId, 
              newTeacherName, 
              newTeacherEmail, 
              newTeacherPwd, 
              newTeacherAvatar,
              newTeacherCategory
          );
          
          if (newTeacherSubjects.length > 0) {
              for (const sub of newTeacherSubjects) {
                  if (sub.name) {
                      await BackendService.assignSubject({
                          name: sub.name,
                          code: sub.code,
                          teacherId: newUser.id,
                          institutionId: institutionId,
                          academicYear: new Date().getFullYear().toString(),
                          level: sub.level,
                          semester: '1',
                          course: sub.course,
                          classGroup: sub.classGroup,
                          shift: sub.shift,
                          modality: 'Presencial',
                          teacherCategory: newTeacherCategory
                      });
                  }
              }
          }
          
          setNewTeacherName('');
          setNewTeacherEmail('');
          setNewTeacherPwd('');
          setNewTeacherAvatar('');
          setNewTeacherCategory('assistente');
          setNewTeacherSubjects([]);
          
          await loadData();
          alert(`Docente e ${newTeacherSubjects.length} disciplinas cadastrados com sucesso!`);
      } catch (error: any) {
          console.error("Erro ao adicionar docente:", error);
          alert("Erro ao cadastrar docente: " + error.message);
      }
  };

  const handleToggleShift = (shift: string) => {
      if (newStudentShifts.includes(shift)) {
          setNewStudentShifts(newStudentShifts.filter(s => s !== shift));
      } else {
          setNewStudentShifts([...newStudentShifts, shift]);
      }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!newStudentName.trim() || !newStudentEmail.trim() || !newStudentPwd.trim()) {
          alert("Por favor, preencha Nome, Email e Senha.");
          return;
      }

      if (newStudentShifts.length === 0) {
          alert("Selecione pelo menos um turno.");
          return;
      }

      try {
          const classGroups = newStudentClassGroups.split(',').map(s => s.trim()).filter(s => s.length > 0);

          await BackendService.addStudent(
              institutionId, 
              newStudentName, 
              newStudentEmail, 
              newStudentPwd, 
              newStudentCourse, 
              newStudentLevel,
              newStudentAvatar,
              newStudentShifts,
              classGroups
          );
          
          setNewStudentName('');
          setNewStudentEmail('');
          setNewStudentPwd('');
          setNewStudentCourse('');
          setNewStudentLevel('');
          setNewStudentAvatar('');
          setNewStudentClassGroups('');
          setNewStudentShifts([]);
          
          await loadData();
          alert(`Estudante cadastrado com sucesso!`);
      } catch (error: any) {
          console.error("Erro ao adicionar estudante:", error);
          alert("Erro ao cadastrar estudante: " + error.message);
      }
  };

  const handleEvalChange = (teacherId: string, field: 'deadlines' | 'quality' | 'comments', value: string) => {
    const isNumber = field !== 'comments';
    const finalValue = isNumber ? parseFloat(value) || 0 : value;
    setQualEvals(prev => ({
        ...prev,
        [teacherId]: { ...prev[teacherId], [field]: finalValue as any }
    }));
  };

  const handleEvalSubmit = async (teacherId: string) => {
    const evalData = qualEvals[teacherId];
    await BackendService.saveQualitativeEval({
        teacherId,
        institutionId,
        deadlineCompliance: evalData.deadlines,
        workQuality: evalData.quality,
        comments: evalData.comments,
        evaluatedAt: new Date().toISOString()
    });
    setExpandedTeacher(null);
    alert("Avaliação qualitativa salva com sucesso.");
  };

  const handleAddQuestion = async () => {
      if (!newQText) return;
      
      const newQuestion: Question = {
          id: `q_${Date.now()}`,
          text: newQText,
          type: newQType,
          weight: newQType === 'text' ? 0 : newQWeight,
          options: newQType === 'choice' ? newQOptions.split(',').map(o => o.trim()) : undefined
      };

      const currentQuestions = questionnaire?.questions || [];
      const updatedQuestions = [...currentQuestions, newQuestion];

      const updatedQ: Questionnaire = questionnaire
        ? { ...questionnaire, questions: updatedQuestions }
        : {
            id: `q_${institutionId}_${targetRole}`,
            institutionId,
            title: targetRole === 'student' ? 'Avaliação de Desempenho' : 'Inquérito ao Docente',
            active: true,
            questions: updatedQuestions,
            targetRole: targetRole
          };
      
      setQuestionnaire(updatedQ);
      await BackendService.saveQuestionnaire(updatedQ);
      
      setNewQText('');
      setNewQOptions('');
      setNewQWeight(1);
  };

  const handleRemoveQuestion = async (qId: string) => {
      if (!questionnaire) return;
      const updatedQ = {
          ...questionnaire,
          questions: questionnaire.questions.filter(q => q.id !== qId)
      };
      setQuestionnaire(updatedQ);
      await BackendService.saveQuestionnaire(updatedQ);
  };

  const handleUpdateTitle = async (title: string) => {
    if (!questionnaire) return;
    
    // Optimistic UI update
    const updatedQ = { ...questionnaire, title };
    setQuestionnaire(updatedQ);
    
    // Debounced save would be ideal here, but for now we save directly
    await BackendService.saveQuestionnaire(updatedQ);
  };
  
  const handleUpdateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution) return;
    try {
        await BackendService.updateInstitution(institution.id, {
            name: institution.name,
            logo: institution.logo
        });
        alert("Dados da instituição atualizados com sucesso!");
    } catch (e: any) {
        alert("Erro ao atualizar: " + e.message);
    }
  };

  const handleInstLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && institution) {
          if (file.size > 500 * 1024) return alert("Logotipo muito grande. O limite é 500KB.");
          const reader = new FileReader();
          reader.onload = (ev) => {
              setInstitution({ ...institution, logo: ev.target?.result as string });
          };
          reader.readAsDataURL(file);
      }
  };

  const renderPreviewInput = (q: Question) => {
    switch (q.type) {
        case 'stars': return <div className="flex gap-2 text-gray-300"><Star className="h-6 w-6" /><Star className="h-6 w-6" /><Star className="h-6 w-6" /><Star className="h-6 w-6" /><Star className="h-6 w-6" /></div>;
        case 'binary': return <div className="flex gap-4 max-w-xs"><Button variant="outline" disabled className="flex-1">Não</Button><Button variant="outline" disabled className="flex-1">Sim</Button></div>;
        case 'scale_10': return <div className="flex gap-1 overflow-x-auto pb-1">{[...Array(11)].map((_, i) => <div key={i} className="h-8 w-8 flex items-center justify-center border rounded text-xs text-gray-400 bg-white shrink-0">{i}</div>)}</div>;
        case 'text': return <div className="h-20 w-full border rounded-md bg-gray-50 text-gray-400 p-2 text-sm italic">Área de resposta de texto...</div>;
        case 'choice': return <div className="space-y-2">{q.options?.map(o => <div key={o} className="flex items-center gap-2 text-gray-500 text-sm"><div className="h-4 w-4 rounded-full border border-gray-300"></div><span>{o}</span></div>)}</div>;
        default: return <Input disabled placeholder="Campo de resposta" />;
    }
  };

  const handleExportCSV = () => {
    if (allScores.length === 0) return alert("Sem dados para exportar.");
    let csv = "Docente,Avaliação Estudante,Auto-Avaliação,Avaliação Qualitativa,Classificação Final,Data\n";
    allScores.forEach(s => {
        const t = teachers.find(u => u.id === s.teacherId);
        csv += `"${t?.name || 'Desconhecido'}",${s.studentScore},${s.selfEvalScore},${s.institutionalScore},${s.finalScore},${new Date(s.lastCalculated).toLocaleDateString()}\n`;
    });
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_global_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const groupedStudents = useMemo(() => students.reduce((acc, student) => {
      const course = student.course || 'Sem Curso Atribuído';
      const level = student.level ? `${student.level}º Ano` : 'Sem Ano';
      if (!acc[course]) acc[course] = {};
      if (!acc[course][level]) acc[course][level] = [];
      acc[course][level].push(student);
      return acc;
  }, {} as Record<string, Record<string, User[]>>), [students]);

  const avgScore = allScores.length > 0 ? (allScores.reduce((acc, curr) => acc + curr.finalScore, 0) / allScores.length).toFixed(1) : '0';

  const chartData = useMemo(() => allScores.map(score => {
      const teacher = teachers.find(t => t.id === score.teacherId);
      return {
          name: teacher ? teacher.name.split(' ')[0] : 'N/A',
          finalScore: score.finalScore,
          studentScore: score.studentScore,
          selfEvalScore: score.selfEvalScore,
          institutionalScore: score.institutionalScore
      }
  }), [allScores, teachers]);

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500 print:p-0 print:max-w-none">
      
      {editingUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-md shadow-2xl">
                  <CardHeader className="border-b">
                      <CardTitle className="flex items-center gap-2">
                          <Edit className="h-5 w-5" /> Editar Dados do {editingUser.role === UserRole.TEACHER ? 'Docente' : 'Aluno'}
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                      <div className="space-y-2">
                          <Label>Nome Completo</Label>
                          <Input value={editName} onChange={e => setEditName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                          <Label>Email Institucional</Label>
                          <Input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                      </div>
                      <div className="flex justify-end gap-3 pt-4">
                          <Button variant="ghost" onClick={() => setEditingUser(null)}>Cancelar</Button>
                          <Button onClick={handleSaveEditUser}>Salvar Alterações</Button>
                      </div>
                  </CardContent>
              </Card>
          </div>
      )}

      <header className="border-b pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div className="flex items-center gap-4">
             {institution?.logo && (
                 <div className="h-16 w-16 bg-white border rounded-lg p-1 flex items-center justify-center shadow-sm">
                     <img src={institution.logo} className="h-full w-full object-contain" />
                 </div>
             )}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{institution?.name || 'Gestão Institucional'}</h1>
                <p className="text-gray-500">Administração de Docentes e Avaliações</p>
            </div>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg flex-wrap gap-1">
            <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'overview' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>Visão Geral</button>
            <button onClick={() => setActiveTab('teachers')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'teachers' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>Docentes</button>
            <button onClick={() => setActiveTab('students')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'students' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>Alunos</button>
            <button onClick={() => setActiveTab('qualitative')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-1 ${activeTab === 'qualitative' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>
                <ClipboardList className="h-4 w-4" /> Avaliação Qualitativa
            </button>
            <button onClick={() => setActiveTab('questionnaire')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-1 ${activeTab === 'questionnaire' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>
                <Shield className="h-3 w-3" /> Questionários
            </button>
            <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'stats' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>Relatórios</button>
            <button onClick={() => setActiveTab('settings')} className={`px-3 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-1 ${activeTab === 'settings' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>
                <Settings className="h-4 w-4" /> Config
            </button>
        </div>
      </header>

      {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card><CardHeader><CardTitle className="text-base font-medium text-gray-500">Total de Docentes</CardTitle></CardHeader><CardContent><div className="text-4xl font-bold">{teachers.length}</div></CardContent></Card>
                  <Card><CardHeader><CardTitle className="text-base font-medium text-gray-500">Total de Alunos</CardTitle></CardHeader><CardContent><div className="text-4xl font-bold">{students.length}</div></CardContent></Card>
                  <Card><CardHeader><CardTitle className="text-base font-medium text-gray-500">Média Geral (Final)</CardTitle></CardHeader><CardContent><div className="text-4xl font-bold">{avgScore}</div></CardContent></Card>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                      <CardHeader><CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-yellow-500"/> Ações Pendentes</CardTitle></CardHeader>
                      <CardContent>
                          {unapproved.length > 0 ? (
                              <div className="space-y-2">{unapproved.map(t => <div key={t.id} className="flex justify-between items-center p-2 bg-yellow-50 rounded-md"><span>{t.name}</span><Button size="sm">Aprovar</Button></div>)}</div>
                          ) : <p className="text-gray-500">Nenhuma ação pendente.</p>}
                      </CardContent>
                  </Card>
                  <Card className="bg-slate-800 text-white">
                      <CardHeader><CardTitle>Fecho do Semestre</CardTitle></CardHeader>
                      <CardContent>
                          <p className="text-sm text-slate-300 mb-4">Clique para processar todas as avaliações (Alunos, Auto-avaliação, Gestão) e gerar os relatórios finais.</p>
                          <Button onClick={handleCalculateScores} disabled={calculating} className="w-full bg-white text-slate-900 hover:bg-slate-200">
                              {calculating ? 'Calculando...' : <><Calculator className="mr-2 h-4 w-4"/> Calcular Notas Finais</>}
                          </Button>
                      </CardContent>
                  </Card>
              </div>
          </div>
      )}

      {activeTab === 'teachers' && (
          <div className="grid gap-8 lg:grid-cols-12 print:hidden">
            <div className="lg:col-span-5 space-y-6">
                <Card className="border-indigo-100 shadow-md">
                    <CardHeader className="bg-indigo-50/50 pb-4"><CardTitle className="flex items-center gap-2 text-indigo-900"><UserPlus className="h-5 w-5" /> Cadastrar Novo Docente</CardTitle></CardHeader>
                    <CardContent className="pt-4"><form onSubmit={handleAddTeacher} className="space-y-5"><div className="space-y-4"><div className="flex gap-4"><div className="flex-1 space-y-2"><Label>Nome Completo</Label><Input value={newTeacherName} onChange={e => setNewTeacherName(e.target.value)} required /></div><div className="w-16 space-y-2"><Label>Foto</Label><div className="relative h-10 w-full"><input type="file" accept="image/*" onChange={(e) => handleAvatarUpload(e, setNewTeacherAvatar)} className="absolute inset-0 opacity-0 cursor-pointer z-10" /><div className="h-full w-full border rounded flex items-center justify-center bg-white">{newTeacherAvatar ? <img src={newTeacherAvatar} className="h-full w-full object-cover rounded" /> : <ImageIcon className="h-4 w-4 text-gray-400" />}</div></div></div></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Email</Label><Input type="email" value={newTeacherEmail} onChange={e => setNewTeacherEmail(e.target.value)} required /></div><div className="space-y-2"><Label>Senha</Label><Input type="text" value={newTeacherPwd} onChange={e => setNewTeacherPwd(e.target.value)} required /></div></div><div className="space-y-2"><Label>Categoria</Label><Select value={newTeacherCategory} onChange={(e) => setNewTeacherCategory(e.target.value as TeacherCategory)}><option value="assistente">Assistente (Pleno)</option><option value="assistente_estagiario">Assistente Estagiário</option></Select></div></div><Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"><Check className="mr-2 h-4 w-4" /> Confirmar Cadastro</Button></form></CardContent>
                </Card>
            </div>
            <div className="lg:col-span-7 space-y-6">
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Corpo Docente ({teachers.length})</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        {teachers.map(t => (
                            <div key={t.id} className="border rounded-lg bg-white shadow-sm flex items-center justify-between p-4">
                                <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">{t.avatar ? <img src={t.avatar} className="h-full w-full object-cover" /> : <Users className="h-5 w-5 m-2.5 text-gray-400" />}</div><div className="flex flex-col"><div className="font-medium text-sm">{t.name}</div><span className="text-xs text-gray-400">{t.email}</span></div></div>
                                <Button size="sm" variant="ghost" onClick={() => startEditUser(t)} className="text-gray-500"><Edit className="h-4 w-4" /></Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
          </div>
      )}

      {activeTab === 'students' && (
          <div className="grid gap-8 lg:grid-cols-12 print:hidden animate-in fade-in">
              <div className="lg:col-span-4 space-y-6"><Card><CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Cadastrar Aluno</CardTitle></CardHeader><CardContent><form onSubmit={handleAddStudent} className="bg-gray-50 p-4 rounded-lg border space-y-4"><div className="space-y-2"><Label>Nome</Label><Input value={newStudentName} onChange={e => setNewStudentName(e.target.value)} required /></div><div className="space-y-2"><Label>Email</Label><Input type="email" value={newStudentEmail} onChange={e => setNewStudentEmail(e.target.value)} required /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Curso</Label><Select value={newStudentCourse} onChange={e => setNewStudentCourse(e.target.value)} disabled={uniqueCourses.length === 0}><option value="">Curso...</option>{uniqueCourses.map(c => <option key={c} value={c}>{c}</option>)}</Select></div><div className="space-y-2"><Label>Ano/Nível</Label><Input value={newStudentLevel} onChange={e => setNewStudentLevel(e.target.value)} /></div></div><div className="space-y-2"><Label>Senha</Label><Input type="text" value={newStudentPwd} onChange={e => setNewStudentPwd(e.target.value)} required /></div><Button type="submit" className="w-full"><Plus className="mr-2 h-4 w-4" /> Adicionar Estudante</Button></form></CardContent></Card></div>
              <div className="lg:col-span-8"><Card><CardHeader><CardTitle className="flex items-center gap-2">Lista de Estudantes ({students.length})</CardTitle></CardHeader><CardContent><div className="space-y-6">{Object.entries(groupedStudents).map(([course, levels]) => (<div key={course} className="border rounded-md overflow-hidden"><div className="bg-gray-100 px-4 py-2 font-semibold text-gray-800 border-b">{course}</div><div className="divide-y">{Object.entries(levels).map(([level, users]) => (<div key={level}><div className="bg-gray-50 px-4 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider border-b">{level}</div><div>{users.map(std => (<div key={std.id} className="p-4 bg-white hover:bg-gray-50 flex justify-between items-center border-b last:border-0"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">{std.avatar ? <img src={std.avatar} className="h-full w-full object-cover" /> : <Users className="h-4 w-4 m-2 text-gray-400" />}</div><div><p className="font-medium text-gray-900">{std.name}</p><p className="text-sm text-gray-500">{std.email}</p></div></div><Button size="sm" variant="ghost" onClick={() => startEditUser(std)} className="text-gray-500"><Edit className="h-4 w-4" /></Button></div>))}</div></div>))}</div></div>))}</div></CardContent></Card></div>
          </div>
      )}

      {activeTab === 'questionnaire' && (
        <div className="animate-in fade-in space-y-6">
            <div className="grid gap-8 lg:grid-cols-12 print:hidden">
                <div className="lg:col-span-5 space-y-6"><Card><CardHeader className="pb-3"><CardTitle className="text-sm">Público Alvo do Questionário</CardTitle></CardHeader><CardContent><Select value={targetRole} onChange={(e) => setTargetRole(e.target.value as 'student' | 'teacher')}><option value="student">🎓 Alunos (Avaliar Docentes)</option><option value="teacher">👨‍🏫 Docentes (Institucional)</option></Select></CardContent></Card><Card><CardHeader className="bg-slate-900 text-white rounded-t-lg"><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Adicionar Pergunta</CardTitle></CardHeader><CardContent className="space-y-4 pt-6"><div className="space-y-2"><Label>Texto</Label><Input value={newQText} onChange={(e) => setNewQText(e.target.value)} /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Tipo</Label><Select value={newQType} onChange={(e) => setNewQType(e.target.value as QuestionType)}><option value="binary">Sim / Não</option><option value="stars">Estrelas (1-5)</option><option value="scale_10">Escala (0-10)</option><option value="text">Texto</option><option value="choice">Múltipla Escolha</option></Select></div><div className="space-y-2"><Label>Pontos (Se SIM)</Label><Input type="number" min="0" value={newQWeight} onChange={(e) => setNewQWeight(Number(e.target.value))} disabled={newQType === 'text' || newQType === 'choice'} /></div></div><Button onClick={handleAddQuestion} className="w-full bg-slate-900">Adicionar Pergunta</Button></CardContent></Card></div>
                <div className="lg:col-span-7 space-y-6"><Card className="h-full flex flex-col bg-gray-50/50"><CardHeader className="bg-white border-b border-gray-200"><div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2 text-gray-800"><Eye className="h-5 w-5 text-indigo-600" /> Pré-visualização do Formulário</CardTitle></div><Input value={questionnaire?.title || ''} onChange={(e) => handleUpdateTitle(e.target.value)} className="mt-4 font-bold text-lg" placeholder="Título do Formulário" /></CardHeader><CardContent className="flex-1 overflow-y-auto p-6 space-y-4">{(!questionnaire || questionnaire.questions.length === 0) ? (<div className="flex flex-col items-center justify-center h-64 text-gray-400"><FileQuestion className="h-12 w-12 mb-3 opacity-20" /><p className="font-medium">O formulário está vazio.</p></div>) : (questionnaire.questions.map((q, idx) => (<div key={q.id} className="relative group bg-white p-5 rounded-lg border border-gray-200 shadow-sm"><div className="absolute right-3 top-3"><button onClick={() => handleRemoveQuestion(q.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div><div className="mb-3 pr-8"><p className="font-medium text-gray-900 text-base">#{idx + 1}. {q.text}</p></div><div className="pl-4 opacity-70 pointer-events-none">{renderPreviewInput(q)}</div></div>)))}</CardContent></Card></div>
            </div>
        </div>
      )} 
      
      {activeTab === 'qualitative' && (
          <div className="animate-in fade-in">
              <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Avaliação Qualitativa Institucional</CardTitle><p className="text-sm text-gray-500 pt-1">Atribua uma nota de 0 a 10 para cada indicador. Esta avaliação representa 8% da nota final do docente.</p></CardHeader>
                  <CardContent className="space-y-2">
                      {teachers.map(t => (
                          <div key={t.id} className="border rounded-lg overflow-hidden">
                              <button onClick={() => setExpandedTeacher(prev => prev === t.id ? null : t.id)} className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors">
                                  <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">{t.avatar ? <img src={t.avatar} className="h-full w-full object-cover" /> : <Users className="h-5 w-5 m-2.5 text-gray-400" />}</div><div className="text-left"><p className="font-medium">{t.name}</p><p className="text-sm text-gray-500">{t.email}</p></div></div>
                                  <div className="flex items-center gap-2 text-gray-500">{expandedTeacher === t.id ? <ChevronUp/> : <ChevronDown/>}</div>
                              </button>
                              {expandedTeacher === t.id && (
                                  <div className="p-4 bg-gray-50/70 border-t space-y-4 animate-in fade-in duration-300">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div className="space-y-2">
                                              <Label>Cumprimento de Prazos (0-10)</Label>
                                              <Input type="number" min="0" max="10" value={qualEvals[t.id]?.deadlines || 0} onChange={e => handleEvalChange(t.id, 'deadlines', e.target.value)} />
                                          </div>
                                          <div className="space-y-2">
                                              <Label>Qualidade de Trabalho (0-10)</Label>
                                              <Input type="number" min="0" max="10" value={qualEvals[t.id]?.quality || 0} onChange={e => handleEvalChange(t.id, 'quality', e.target.value)} />
                                          </div>
                                      </div>
                                      <div className="space-y-2"><Label>Comentários / Observações</Label><textarea value={qualEvals[t.id]?.comments || ''} onChange={e => handleEvalChange(t.id, 'comments', e.target.value)} className="w-full min-h-[80px] p-2 border rounded" placeholder="Adicione notas sobre o desempenho..." /></div>
                                      <Button onClick={() => handleEvalSubmit(t.id)}><Save className="mr-2 h-4 w-4"/> Salvar Avaliação</Button>
                                  </div>
                              )}
                          </div>
                      ))}
                  </CardContent>
              </Card>
          </div>
      )}

      {activeTab === 'stats' && (
          <div className="space-y-6 animate-in fade-in">
              <Card>
                  <CardHeader className="flex flex-row justify-between items-center">
                      <CardTitle className="flex items-center gap-2"><BarChartHorizontal className="h-5 w-5" /> Relatório de Desempenho Global</CardTitle>
                      <Button variant="outline" onClick={handleExportCSV}><Download className="mr-2 h-4 w-4" /> Exportar CSV</Button>
                  </CardHeader>
                  <CardContent>
                      <div className="h-[400px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="name" />
                                  <YAxis />
                                  <Tooltip />
                                  <Legend />
                                  <Bar dataKey="finalScore" fill="#1f2937" name="Nota Final" />
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                  </CardContent>
              </Card>
          </div>
      )}

      {activeTab === 'settings' && institution && (
          <div className="animate-in fade-in">
              <Card className="max-w-2xl mx-auto">
                  <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Configurações da Instituição</CardTitle></CardHeader>
                  <CardContent>
                      <form onSubmit={handleUpdateInstitution} className="space-y-4">
                          <div className="space-y-2">
                              <Label>Nome da Instituição</Label>
                              <Input value={institution.name} onChange={e => setInstitution({...institution, name: e.target.value})}/>
                          </div>
                          <div className="space-y-2">
                              <Label>Logotipo</Label>
                              <div className="flex items-center gap-4">
                                  <div className="h-16 w-16 border rounded bg-white p-1 flex items-center justify-center">
                                      {institution.logo ? <img src={institution.logo} className="object-contain h-full w-full" /> : <ImageIcon className="h-6 w-6 text-gray-300"/>}
                                  </div>
                                  <Input type="file" accept="image/*" onChange={handleInstLogoUpload} />
                              </div>
                          </div>
                          <Button type="submit"><Save className="mr-2 h-4 w-4"/> Salvar Alterações</Button>
                      </form>
                  </CardContent>
              </Card>
          </div>
      )}
    </div>
  );
};
