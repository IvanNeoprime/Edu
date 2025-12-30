
import React, { useState, useEffect, useMemo } from 'react';
import { BackendService } from '../services/backend';
// import { AIService } from '../services/ai'; // Removed AI Service
import { User, UserRole, Subject, Questionnaire, QuestionType, TeacherCategory, CombinedScore, Question, Institution } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from './ui';
import { Users, Check, BookOpen, Calculator, AlertCircle, Plus, Trash2, FileQuestion, ChevronDown, ChevronUp, UserPlus, Star, List, Type, BarChartHorizontal, Key, GraduationCap, PieChart as PieIcon, Download, Printer, Image as ImageIcon, Sparkles, RefreshCw, ScanText, Eye, Settings, Building2, Save, FileText, X, TrendingUp, ClipboardList, CheckCircle2, Lock, Shield } from 'lucide-react';
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
  
  const [qualEvals, setQualEvals] = useState<Record<string, { deadlines: number, quality: number }>>({});
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

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

  // Recarregar questionário quando muda o alvo
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
        
        // Strict Filter: Only get actual teachers, excluding managers from the list
        const potentialTeachers = allUsers.filter(u => u.role === UserRole.TEACHER && u.institutionId === institutionId);
        setTeachers(potentialTeachers);
        
        const instStudents = allUsers.filter(u => u.role === UserRole.STUDENT && u.institutionId === institutionId);
        setStudents(instStudents);

        setUnapproved(await BackendService.getUnapprovedTeachers(institutionId));
        
        const instSubjects = await BackendService.getInstitutionSubjects(institutionId);
        setSubjects(instSubjects);

        loadQuestionnaire();
        
        const loadedEvals: Record<string, { deadlines: number, quality: number }> = {};
        for (const t of potentialTeachers) {
            const ev = await BackendService.getQualitativeEval(t.id);
            if (ev) {
                loadedEvals[t.id] = {
                    deadlines: ev.deadlineCompliance || 0,
                    quality: ev.workQuality || 0
                };
            } else {
                loadedEvals[t.id] = { deadlines: 0, quality: 0 };
            }
        }
        setQualEvals(loadedEvals);
    } catch (e) {
        console.error("Erro ao carregar dados:", e);
    } finally {
        setLoading(false);
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

  // --- TEACHER & SUBJECT MANAGEMENT ---

  const handleAddSubjectToTeacherList = () => {
      setNewTeacherSubjects([
          ...newTeacherSubjects,
          { name: '', code: '', course: '', level: '1', classGroup: '', shift: 'Diurno' }
      ]);
  };

  const handleRemoveSubjectFromList = (index: number) => {
      setNewTeacherSubjects(newTeacherSubjects.filter((_, i) => i !== index));
  };

  const handleSubjectListChange = (index: number, field: keyof NewSubjectItem, value: string) => {
      const updated = [...newTeacherSubjects];
      // @ts-ignore
      updated[index][field] = value;
      setNewTeacherSubjects(updated);
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!newTeacherName.trim() || !newTeacherEmail.trim() || !newTeacherPwd.trim()) {
          alert("Por favor, preencha Nome, Email e Senha.");
          return;
      }

      try {
          console.log("Adicionando docente:", newTeacherName, newTeacherEmail);
          const newUser = await BackendService.addTeacher(
              institutionId, 
              newTeacherName, 
              newTeacherEmail, 
              newTeacherPwd, 
              newTeacherAvatar,
              newTeacherCategory
          );
          
          // Bulk create subjects
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
                          semester: '1', // Default
                          course: sub.course,
                          classGroup: sub.classGroup,
                          shift: sub.shift,
                          modality: 'Presencial',
                          teacherCategory: newTeacherCategory
                      });
                  }
              }
          }
          
          // Limpar campos
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
          // Parse class groups
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

  const handleEvalChange = (teacherId: string, field: 'deadlines' | 'quality', value: string) => {
      const val = parseFloat(value) || 0;
      setQualEvals(prev => ({
          ...prev,
          [teacherId]: { ...prev[teacherId], [field]: val }
      }));
  };

  const handleEvalSubmit = async (teacherId: string) => {
    const evalData = qualEvals[teacherId];
    await BackendService.saveQualitativeEval({
        teacherId,
        institutionId,
        deadlineCompliance: evalData.deadlines,
        workQuality: evalData.quality,
        evaluatedAt: new Date().toISOString()
    });
    setExpandedTeacher(null);
    alert("Avaliação qualitativa salva com sucesso.");
  };

  // --- Form Builder Logic ---
  const handleAddQuestion = async () => {
      if (!newQText) return;
      
      const newQuestion = {
          id: `q_${Date.now()}`,
          text: newQText,
          type: newQType,
          weight: newQType === 'text' ? 0 : newQWeight,
          options: newQType === 'choice' ? newQOptions.split(',').map(o => o.trim()) : undefined
      };

      let updatedQ: Questionnaire;
      if (!questionnaire) {
          updatedQ = {
              id: `q_${institutionId}_${targetRole}`,
              institutionId,
              title: targetRole === 'student' ? 'Avaliação de Desempenho' : 'Inquérito ao Docente',
              active: true,
              questions: [newQuestion],
              targetRole: targetRole
          };
      } else {
          updatedQ = {
              ...questionnaire,
              questions: [...questionnaire.questions, newQuestion],
              targetRole: targetRole
          };
      }
      
      await BackendService.saveQuestionnaire(updatedQ);
      setQuestionnaire(updatedQ);
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
      await BackendService.saveQuestionnaire(updatedQ);
      setQuestionnaire(updatedQ);
  };

  const handleUpdateTitle = async (title: string) => {
      if (!questionnaire) return;
      const updatedQ = { ...questionnaire, title };
      await BackendService.saveQuestionnaire(updatedQ);
      setQuestionnaire(updatedQ);
  };

  // --- SETTINGS (LOGO UPDATE) ---
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

  // --- PREVIEW RENDERER HELPERS ---
  const renderPreviewInput = (q: Question) => {
    switch (q.type) {
        case 'stars':
            return (
                <div className="flex gap-2 text-gray-300">
                    {[1, 2, 3, 4, 5].map(s => <Star key={s} className="h-6 w-6" />)}
                </div>
            );
        case 'binary':
            return (
                <div className="flex gap-4 max-w-xs">
                    <div className="flex-1 py-2 px-4 rounded-md border text-center text-sm text-gray-400 bg-white">Não</div>
                    <div className="flex-1 py-2 px-4 rounded-md border text-center text-sm text-gray-400 bg-white">Sim</div>
                </div>
            );
        case 'scale_10':
            return (
                <div className="flex gap-1 overflow-x-auto pb-1">
                    {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                        <div key={n} className="h-8 w-8 flex items-center justify-center border rounded text-xs text-gray-400 bg-white shrink-0">{n}</div>
                    ))}
                </div>
            );
        case 'text':
            return <div className="h-20 w-full border rounded-md bg-gray-50 text-gray-400 p-2 text-sm italic">Área de resposta de texto...</div>;
        case 'choice':
            return (
                <div className="space-y-2">
                    {q.options?.map(o => (
                        <div key={o} className="flex items-center gap-2 text-gray-500 text-sm">
                            <div className="h-4 w-4 rounded-full border border-gray-300"></div>
                            <span>{o}</span>
                        </div>
                    ))}
                </div>
            );
        default:
            return <Input disabled placeholder="Campo de resposta" />;
    }
  };

  // --- REPORT GENERATION ---
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

  const handlePrintPDF = () => {
    window.print();
  };

  const groupedStudents = students.reduce((acc, student) => {
      const course = student.course || 'Sem Curso Atribuído';
      const level = student.level ? `${student.level}º Ano` : 'Sem Ano';
      
      if (!acc[course]) acc[course] = {};
      if (!acc[course][level]) acc[course][level] = [];
      
      acc[course][level].push(student);
      return acc;
  }, {} as Record<string, Record<string, User[]>>);

  const scoreDistribution = [
      { name: '0-50 (Insuficiente)', value: allScores.filter(s => s.finalScore <= 50).length, color: '#ef4444' },
      { name: '51-70 (Razoável)', value: allScores.filter(s => s.finalScore > 50 && s.finalScore <= 70).length, color: '#eab308' },
      { name: '71-85 (Bom)', value: allScores.filter(s => s.finalScore > 70 && s.finalScore <= 85).length, color: '#3b82f6' },
      { name: '86-100 (Excelente)', value: allScores.filter(s => s.finalScore > 85).length, color: '#22c55e' }
  ].filter(d => d.value > 0);

  const avgScore = allScores.length > 0 
    ? (allScores.reduce((acc, curr) => acc + curr.finalScore, 0) / allScores.length).toFixed(1)
    : '0';

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-6xl mx-auto animate-in fade-in duration-500 print:p-0 print:max-w-none">
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
            <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'stats' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>Relatórios & Estatísticas</button>
            <button onClick={() => setActiveTab('settings')} className={`px-3 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-1 ${activeTab === 'settings' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>
                <Settings className="h-4 w-4" /> Config
            </button>
        </div>
      </header>

      {/* --- ABA VISÃO GERAL (OVERVIEW) --- */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Docentes</CardTitle>
                        <Users className="h-4 w-4 text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{teachers.length}</div>
                        <p className="text-xs text-gray-500">
                            {unapproved.length > 0 ? `${unapproved.length} pendentes de aprovação` : 'Todos ativos'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
                        <GraduationCap className="h-4 w-4 text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{students.length}</div>
                        <p className="text-xs text-gray-500">Matriculados na instituição</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Média Institucional</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgScore}</div>
                        <p className="text-xs text-gray-500">Score médio (0-100)</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Disciplinas</CardTitle>
                        <BookOpen className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{subjects.length}</div>
                        <p className="text-xs text-gray-500">Ofertadas neste semestre</p>
                    </CardContent>
                </Card>
             </div>

             {unapproved.length > 0 && (
                 <Card className="border-yellow-200 bg-yellow-50">
                     <CardHeader>
                         <CardTitle className="text-yellow-800 flex items-center gap-2">
                             <AlertCircle className="h-5 w-5" /> Aprovação Pendente
                         </CardTitle>
                     </CardHeader>
                     <CardContent>
                         <p className="text-sm text-yellow-700 mb-4">
                             Existem {unapproved.length} docentes que se registraram e aguardam sua aprovação para acessar o sistema.
                         </p>
                         <div className="space-y-2">
                             {unapproved.map(u => (
                                 <div key={u.id} className="flex items-center justify-between bg-white p-3 rounded border border-yellow-200">
                                     <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                                            {u.avatar ? <img src={u.avatar} className="h-full w-full object-cover"/> : <Users className="h-4 w-4 text-gray-500"/>}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-sm">{u.name}</div>
                                            <div className="text-xs text-gray-500">{u.email}</div>
                                        </div>
                                     </div>
                                     <Button size="sm" onClick={() => BackendService.approveTeacher(u.id).then(loadData)} className="bg-yellow-600 hover:bg-yellow-700 text-white border-0">
                                         Aprovar Acesso
                                     </Button>
                                 </div>
                             ))}
                         </div>
                     </CardContent>
                 </Card>
             )}
        </div>
      )}

      {/* --- ABA DOCENTES --- */}
      {activeTab === 'teachers' && (
          <div className="grid gap-8 lg:grid-cols-12 print:hidden">
            <div className="lg:col-span-5 space-y-6">
                 {/* Teacher Management Form */}
                <Card className="border-indigo-100 shadow-md">
                    <CardHeader className="bg-indigo-50/50 pb-4">
                        <CardTitle className="flex items-center gap-2 text-indigo-900">
                            <UserPlus className="h-5 w-5" /> Cadastrar Novo Docente
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <form onSubmit={handleAddTeacher} className="space-y-5">
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <div className="flex-1 space-y-2">
                                            <Label>Nome Completo</Label>
                                            <Input value={newTeacherName} onChange={e => setNewTeacherName(e.target.value)} placeholder="Ex: Dr. Carlos Silva" required />
                                        </div>
                                        <div className="w-16 space-y-2">
                                            <Label>Foto</Label>
                                            <div className="relative h-10 w-full">
                                                <input type="file" accept="image/*" onChange={(e) => handleAvatarUpload(e, setNewTeacherAvatar)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                <div className="h-full w-full border rounded flex items-center justify-center bg-white hover:bg-gray-50">
                                                    {newTeacherAvatar ? <img src={newTeacherAvatar} className="h-full w-full object-cover rounded" /> : <ImageIcon className="h-4 w-4 text-gray-400" />}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Email Institucional</Label>
                                            <Input type="email" value={newTeacherEmail} onChange={e => setNewTeacherEmail(e.target.value)} placeholder="email@uni.ac.mz" required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Senha Inicial</Label>
                                            <div className="relative">
                                                <Key className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                                <Input 
                                                    type="text" 
                                                    value={newTeacherPwd} 
                                                    onChange={e => setNewTeacherPwd(e.target.value)} 
                                                    placeholder="Senha" 
                                                    className="pl-9"
                                                    required 
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Categoria do Docente</Label>
                                        <Select value={newTeacherCategory} onChange={(e) => setNewTeacherCategory(e.target.value as TeacherCategory)}>
                                            <option value="assistente">Assistente (Pleno)</option>
                                            <option value="assistente_estagiario">Assistente Estagiário</option>
                                        </Select>
                                        <p className="text-[10px] text-gray-500">* Estagiários não pontuam em supervisão de teses.</p>
                                    </div>
                                </div>
                                
                                <div className="border-t pt-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-gray-700 font-semibold">Atribuir Disciplinas/Turmas</Label>
                                        <Button type="button" size="sm" variant="outline" onClick={handleAddSubjectToTeacherList} className="text-xs h-7">
                                            <Plus className="h-3 w-3 mr-1" /> Adicionar Disciplina
                                        </Button>
                                    </div>

                                    {/* Datalist for Suggesting existing courses */}
                                    <datalist id="available-courses-list">
                                        {uniqueCourses.map(course => (
                                            <option key={course} value={course} />
                                        ))}
                                    </datalist>

                                    {newTeacherSubjects.length === 0 ? (
                                        <div className="text-center p-4 border border-dashed rounded bg-gray-50 text-xs text-gray-400">
                                            Nenhuma disciplina adicionada. Clique acima para adicionar.
                                        </div>
                                    ) : (
                                        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                            {newTeacherSubjects.map((sub, idx) => (
                                                <div key={idx} className="p-3 bg-white border rounded shadow-sm space-y-2 relative group">
                                                    <button type="button" onClick={() => handleRemoveSubjectFromList(idx)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500">
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                    
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <Input 
                                                            placeholder="Nome da Disciplina" 
                                                            value={sub.name} 
                                                            onChange={e => handleSubjectListChange(idx, 'name', e.target.value)}
                                                            className="h-8 text-xs"
                                                        />
                                                        <Input 
                                                            placeholder="Código (Ex: INF101)" 
                                                            value={sub.code} 
                                                            onChange={e => handleSubjectListChange(idx, 'code', e.target.value)}
                                                            className="h-8 text-xs"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-2"> {/* Increased cols for Year */}
                                                        <Input 
                                                            placeholder="Curso (Ex: LEI)" 
                                                            value={sub.course} 
                                                            onChange={e => handleSubjectListChange(idx, 'course', e.target.value)}
                                                            className="h-8 text-xs"
                                                            list="available-courses-list" // Add suggestion capability
                                                        />
                                                        <Select
                                                            className="h-8 text-xs border rounded px-1 bg-white"
                                                            value={sub.level}
                                                            // @ts-ignore
                                                            onChange={e => handleSubjectListChange(idx, 'level', e.target.value)}
                                                        >
                                                            {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}º Ano</option>)}
                                                        </Select>
                                                        <Input 
                                                            placeholder="Turma" 
                                                            value={sub.classGroup} 
                                                            onChange={e => handleSubjectListChange(idx, 'classGroup', e.target.value)}
                                                            className="h-8 text-xs"
                                                        />
                                                        <select 
                                                            className="h-8 text-xs border rounded px-1 bg-white"
                                                            value={sub.shift}
                                                            // @ts-ignore
                                                            onChange={e => handleSubjectListChange(idx, 'shift', e.target.value)}
                                                        >
                                                            <option value="Diurno">Diurno</option>
                                                            <option value="Noturno">Noturno</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                                <Check className="mr-2 h-4 w-4" /> Confirmar Cadastro
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>

            <div className="lg:col-span-7 space-y-6">
                {/* JUST LIST, NO EVAL */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Corpo Docente ({teachers.length})</CardTitle>
                        <p className="text-xs text-gray-500">Listagem de docentes cadastrados. Para realizar avaliações, acesse a aba "Avaliação Qualitativa".</p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {teachers.length === 0 && <p className="text-center py-8 text-gray-500">Nenhum docente cadastrado.</p>}
                        {teachers.map(t => (
                            <div key={t.id} className="border rounded-lg bg-white shadow-sm overflow-hidden flex items-center justify-between p-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                                        {t.avatar ? <img src={t.avatar} className="h-full w-full object-cover" /> : <Users className="h-5 w-5 m-2.5 text-gray-400" />}
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">{t.name}</span>
                                            {t.category === 'assistente_estagiario' && (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded border border-yellow-200">Estagiário</span>
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-400">{t.email}</span>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-400">
                                    Cadastrado em {new Date().toLocaleDateString()}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
          </div>
      )}

      {/* --- ABA AVALIAR QUALITATIVA (NOVA E DEDICADA) --- */}
      {activeTab === 'qualitative' && (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-right-4">
               <Card className="border-l-4 border-l-blue-600 shadow-md mb-6">
                   <CardHeader>
                       <CardTitle className="flex items-center gap-2 text-blue-900">
                           <FileText className="h-6 w-6" /> Avaliação Institucional (Exclusivo para Docentes)
                       </CardTitle>
                       <p className="text-sm text-gray-500">
                           Avalie o desempenho qualitativo dos docentes. Esta pontuação corresponde a <strong>8%</strong> da nota final e é calculada com base no cumprimento de prazos e qualidade do trabalho.
                       </p>
                   </CardHeader>
               </Card>

               <div className="space-y-4">
                    {teachers.length === 0 && (
                        <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-lg bg-gray-50">
                             <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                             <p>Nenhum docente disponível para avaliação.</p>
                        </div>
                    )}

                    {teachers.map(t => {
                        const isExpanded = expandedTeacher === t.id;
                        const ev = qualEvals[t.id] || { deadlines: 0, quality: 0 };
                        const isEvaluated = ev.deadlines > 0 || ev.quality > 0;

                        return (
                            <Card key={t.id} className={`transition-all duration-300 ${isExpanded ? 'ring-2 ring-blue-100 shadow-lg' : 'hover:shadow-md'}`}>
                                <div className="flex items-center justify-between p-5 cursor-pointer" onClick={() => setExpandedTeacher(isExpanded ? null : t.id)}>
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-full bg-gray-100 border flex items-center justify-center overflow-hidden">
                                            {t.avatar ? <img src={t.avatar} className="h-full w-full object-cover" /> : <Users className="h-6 w-6 text-gray-400" />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">{t.name}</h4>
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <span>{t.email}</span>
                                                <span className="text-gray-300">•</span>
                                                <span className="capitalize">{t.category?.replace('_', ' ')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right hidden sm:block">
                                            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Status</div>
                                            {isEvaluated ? (
                                                <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                                    <CheckCircle2 className="h-3 w-3" /> Avaliado ({ev.deadlines + ev.quality} pts)
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                                                    Pendente
                                                </span>
                                            )}
                                        </div>
                                        <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                            <ChevronDown className="h-5 w-5 text-gray-400" />
                                        </div>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="px-5 pb-6 pt-2 border-t bg-gray-50/50 space-y-6 animate-in slide-in-from-top-2">
                                        <div className="grid md:grid-cols-2 gap-8">
                                            {/* Indicador 1: Prazos */}
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <h5 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                                        <ClipboardList className="h-4 w-4 text-blue-600" /> 1. Cumprimento de Prazos (0-10)
                                                    </h5>
                                                    <span className="font-mono font-bold text-lg text-blue-600 bg-white border px-2 rounded shadow-sm">{ev.deadlines}</span>
                                                </div>
                                                <p className="text-xs text-gray-500">Refere-se a entrega de pautas, relatórios e cumprimento do calendário.</p>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {[
                                                        { val: 10, label: "Excelente (Antes do prazo)" },
                                                        { val: 7.5, label: "Bom (Rapidez e qualidade)" },
                                                        { val: 5, label: "Suficiente (No prazo limite)" },
                                                        { val: 2.5, label: "Insuficiente (Com atrasos)" }
                                                    ].map((opt) => (
                                                        <button
                                                            key={opt.val}
                                                            onClick={() => handleEvalChange(t.id, 'deadlines', opt.val.toString())}
                                                            className={`text-left px-3 py-2 rounded border text-xs transition-all flex justify-between items-center ${
                                                                ev.deadlines === opt.val 
                                                                ? 'bg-blue-600 text-white border-blue-700 shadow-md' 
                                                                : 'bg-white hover:bg-gray-100 border-gray-200 text-gray-600'
                                                            }`}
                                                        >
                                                            <span>{opt.label}</span>
                                                            <span className="font-bold">{opt.val} pts</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Indicador 2: Qualidade */}
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <h5 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                                        <Star className="h-4 w-4 text-purple-600" /> 2. Qualidade do Trabalho (0-10)
                                                    </h5>
                                                    <span className="font-mono font-bold text-lg text-purple-600 bg-white border px-2 rounded shadow-sm">{ev.quality}</span>
                                                </div>
                                                <p className="text-xs text-gray-500">Avaliação da excelência pedagógica e rigor científico.</p>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {[
                                                        { val: 10, label: "Excelente (Exemplar)" },
                                                        { val: 7.5, label: "Muito Bom (Acima da média)" },
                                                        { val: 5, label: "Bom (Dentro do padrão)" },
                                                        { val: 2.5, label: "Insuficiente (Necessita melhorias)" }
                                                    ].map((opt) => (
                                                        <button
                                                            key={opt.val}
                                                            onClick={() => handleEvalChange(t.id, 'quality', opt.val.toString())}
                                                            className={`text-left px-3 py-2 rounded border text-xs transition-all flex justify-between items-center ${
                                                                ev.quality === opt.val 
                                                                ? 'bg-purple-600 text-white border-purple-700 shadow-md' 
                                                                : 'bg-white hover:bg-gray-100 border-gray-200 text-gray-600'
                                                            }`}
                                                        >
                                                            <span>{opt.label}</span>
                                                            <span className="font-bold">{opt.val} pts</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-4 border-t border-gray-200">
                                            <Button onClick={() => handleEvalSubmit(t.id)} className="bg-gray-900 text-white hover:bg-black">
                                                <Save className="h-4 w-4 mr-2" /> Salvar Avaliação de {t.name.split(' ')[0]}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        );
                    })}
               </div>
          </div>
      )}

      {/* --- ABA ALUNOS --- */}
      {activeTab === 'students' && (
          <div className="grid gap-8 lg:grid-cols-12 print:hidden animate-in fade-in">
              <div className="lg:col-span-4 space-y-6">
                  <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <GraduationCap className="h-5 w-5" /> Cadastrar Aluno
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddStudent} className="bg-gray-50 p-4 rounded-lg border space-y-4">
                             <div className="flex gap-4">
                                <div className="flex-1 space-y-2">
                                    <Label>Nome</Label>
                                    <Input value={newStudentName} onChange={e => setNewStudentName(e.target.value)} placeholder="Nome completo" required />
                                </div>
                                <div className="w-16 space-y-2">
                                    <Label>Foto</Label>
                                    <div className="relative h-10 w-full">
                                        <input type="file" accept="image/*" onChange={(e) => handleAvatarUpload(e, setNewStudentAvatar)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                        <div className="h-full w-full border rounded flex items-center justify-center bg-white hover:bg-gray-50">
                                            {newStudentAvatar ? <img src={newStudentAvatar} className="h-full w-full object-cover rounded" /> : <ImageIcon className="h-4 w-4 text-gray-400" />}
                                        </div>
                                    </div>
                                </div>
                             </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input type="email" value={newStudentEmail} onChange={e => setNewStudentEmail(e.target.value)} placeholder="email@instituicao.ac.mz" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Curso</Label>
                                    <Select 
                                        value={newStudentCourse} 
                                        onChange={e => setNewStudentCourse(e.target.value)} 
                                        disabled={uniqueCourses.length === 0}
                                    >
                                        <option value="">Selecione o Curso...</option>
                                        {uniqueCourses.map(c => <option key={c} value={c}>{c}</option>)}
                                    </Select>
                                    {uniqueCourses.length === 0 && <span className="text-[10px] text-red-500">Adicione disciplinas aos docentes primeiro.</span>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Ano/Nível</Label>
                                    <Input value={newStudentLevel} onChange={e => setNewStudentLevel(e.target.value)} placeholder="Ex: 1, 2" />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Turnos (Multi-seleção)</Label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 text-sm border p-2 rounded w-full bg-white cursor-pointer hover:bg-gray-50">
                                        <input 
                                            type="checkbox" 
                                            checked={newStudentShifts.includes('Diurno')} 
                                            onChange={() => handleToggleShift('Diurno')}
                                            className="rounded text-indigo-600 focus:ring-indigo-500"
                                        />
                                        Diurno
                                    </label>
                                    <label className="flex items-center gap-2 text-sm border p-2 rounded w-full bg-white cursor-pointer hover:bg-gray-50">
                                        <input 
                                            type="checkbox" 
                                            checked={newStudentShifts.includes('Noturno')} 
                                            onChange={() => handleToggleShift('Noturno')}
                                            className="rounded text-indigo-600 focus:ring-indigo-500"
                                        />
                                        Noturno
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Turmas (Separadas por vírgula)</Label>
                                <Input 
                                    value={newStudentClassGroups} 
                                    onChange={e => setNewStudentClassGroups(e.target.value)} 
                                    placeholder="Ex: A, B, PL1" 
                                />
                                <p className="text-[10px] text-gray-500">O aluno terá acesso às disciplinas destas turmas.</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Senha de Acesso</Label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                    <Input 
                                        type="text" 
                                        value={newStudentPwd} 
                                        onChange={e => setNewStudentPwd(e.target.value)} 
                                        placeholder="Atribua uma senha" 
                                        className="pl-9"
                                        required 
                                    />
                                </div>
                            </div>
                            <Button type="submit" className="w-full"><Plus className="mr-2 h-4 w-4" /> Adicionar Estudante</Button>
                        </form>
                    </CardContent>
                  </Card>
              </div>
              <div className="lg:col-span-8">
                  <Card>
                      <CardHeader>
                          <CardTitle className="flex items-center gap-2">Lista de Estudantes ({students.length})</CardTitle>
                      </CardHeader>
                      <CardContent>
                           {students.length === 0 && <p className="p-8 text-center text-gray-500 italic">Nenhum estudante cadastrado.</p>}
                           
                           <div className="space-y-6">
                               {Object.entries(groupedStudents).map(([course, levels]) => (
                                   <div key={course} className="border rounded-md overflow-hidden">
                                       <div className="bg-gray-100 px-4 py-2 font-semibold text-gray-800 border-b">
                                           {course}
                                       </div>
                                       <div className="divide-y">
                                           {Object.entries(levels).map(([level, users]) => (
                                               <div key={level}>
                                                   <div className="bg-gray-50 px-4 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                                       {level}
                                                   </div>
                                                   <div>
                                                       {users.map(std => (
                                                           <div key={std.id} className="p-4 bg-white hover:bg-gray-50 flex justify-between items-center border-b last:border-0">
                                                               <div className="flex items-center gap-3">
                                                                   <div className="h-8 w-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                                                                       {std.avatar ? <img src={std.avatar} className="h-full w-full object-cover" /> : <Users className="h-4 w-4 m-2 text-gray-400" />}
                                                                   </div>
                                                                   <div>
                                                                       <p className="font-medium text-gray-900">{std.name}</p>
                                                                       <p className="text-sm text-gray-500">{std.email}</p>
                                                                   </div>
                                                               </div>
                                                               <div className="text-right">
                                                                    <div className="text-xs font-semibold text-gray-700">
                                                                        {std.shifts?.join(', ') || 'S/T'}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 mt-0.5">
                                                                        Turmas: {std.classGroups?.join(', ') || 'N/A'}
                                                                    </div>
                                                               </div>
                                                           </div>
                                                       ))}
                                                   </div>
                                               </div>
                                           ))}
                                       </div>
                                   </div>
                               ))}
                           </div>
                      </CardContent>
                  </Card>
              </div>
          </div>
      )}

      {/* --- ABA QUESTIONÁRIOS --- */}
      {activeTab === 'questionnaire' && (
        <div className="animate-in fade-in space-y-6">
            <Card className="border-l-4 border-l-purple-600 shadow-md">
                   <CardHeader>
                       <CardTitle className="flex items-center gap-2 text-purple-900">
                           <Shield className="h-6 w-6" /> Configuração de Questionários (Privilégio de Gestor)
                       </CardTitle>
                       <p className="text-sm text-gray-500">
                           Defina as perguntas que serão aplicadas em toda a instituição. Apenas gestores podem alterar estes modelos.
                           As alterações afetam todos os usuários imediatamente.
                       </p>
                   </CardHeader>
            </Card>

            <div className="grid gap-8 lg:grid-cols-12 print:hidden">
                {/* Left: Builder Form */}
                <div className="lg:col-span-5 space-y-6">
                    
                    {/* Target Audience Selector */}
                    <Card className="border-gray-300">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Público Alvo do Questionário</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Select value={targetRole} onChange={(e) => setTargetRole(e.target.value as 'student' | 'teacher')}>
                                <option value="student">🎓 Para Alunos (Avaliar Docentes)</option>
                                <option value="teacher">👨‍🏫 Para Docentes (Inquéritos Institucionais)</option>
                            </Select>
                            <p className="text-xs text-gray-500 mt-2">
                                {targetRole === 'student' 
                                ? 'Este questionário será exibido aos alunos quando entrarem na disciplina.'
                                : 'Este questionário aparecerá no painel do docente para preenchimento.'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="sticky top-4">
                        <CardHeader className="bg-slate-900 text-white rounded-t-lg">
                            <CardTitle className="flex items-center gap-2">
                                <Plus className="h-5 w-5" /> Adicionar Pergunta Manual
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            <div className="space-y-2">
                                <Label>Texto da Pergunta</Label>
                                <Input 
                                    value={newQText}
                                    onChange={(e) => setNewQText(e.target.value)}
                                    placeholder="Ex: O docente apresentou o programa?"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Tipo de Resposta</Label>
                                    <Select value={newQType} onChange={(e) => setNewQType(e.target.value as QuestionType)}>
                                        <option value="binary">✅ Sim / Não (Full Mark)</option>
                                        <option value="stars">⭐ Estrelas (1-5)</option>
                                        <option value="scale_10">📊 Escala (0-10)</option>
                                        <option value="text">📝 Texto (Sem pontos)</option>
                                        <option value="choice">🔘 Múltipla Escolha</option>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Pontos Obtidos (Se SIM)</Label>
                                    <Input 
                                        type="number" min="0"
                                        value={newQWeight}
                                        onChange={(e) => setNewQWeight(Number(e.target.value))}
                                        disabled={newQType === 'text' || newQType === 'choice'}
                                    />
                                </div>
                            </div>

                            {newQType === 'choice' && (
                                <div className="space-y-2">
                                    <Label>Opções (separadas por vírgula)</Label>
                                    <Input 
                                        value={newQOptions}
                                        onChange={(e) => setNewQOptions(e.target.value)}
                                        placeholder="Ex: Ruim, Regular, Bom, Excelente"
                                    />
                                </div>
                            )}

                            <Button onClick={handleAddQuestion} className="w-full bg-slate-900">
                                Adicionar ao Questionário
                            </Button>
                            
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Preview List */}
                <div className="lg:col-span-7 space-y-6">
                    <Card className="h-full flex flex-col bg-gray-50/50 border-dashed">
                        <CardHeader className="bg-white border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-gray-800">
                                    <Eye className="h-5 w-5 text-indigo-600" /> Pré-visualização do Formulário
                                </CardTitle>
                                <div className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md font-medium border border-indigo-100">
                                    Modo de Edição
                                </div>
                            </div>
                            <div className="pt-4">
                                <Label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Título do Formulário</Label>
                                <Input 
                                    value={questionnaire?.title || ''} 
                                    onChange={(e) => handleUpdateTitle(e.target.value)} 
                                    className="mt-1 font-bold text-lg border-transparent hover:border-gray-300 focus:border-indigo-500 transition-colors bg-transparent px-0 shadow-none h-auto"
                                    placeholder={targetRole === 'student' ? "Ex: Ficha de Avaliação" : "Ex: Inquérito de Satisfação"}
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
                            {(!questionnaire || questionnaire.questions.length === 0) ? (
                                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                    <FileQuestion className="h-12 w-12 mb-3 opacity-20" />
                                    <p className="font-medium">O formulário está vazio.</p>
                                    <p className="text-sm text-center max-w-xs mt-1">Adicione perguntas manualmente à esquerda para começar.</p>
                                </div>
                            ) : (
                                questionnaire.questions.map((q, idx) => (
                                    <div key={q.id} className="relative group bg-white p-5 rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all">
                                        <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleRemoveQuestion(q.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                                                title="Excluir Pergunta"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                        
                                        <div className="mb-3 pr-8">
                                            <div className="flex items-start gap-3">
                                                <span className="text-sm font-bold text-gray-300 select-none">#{idx + 1}</span>
                                                <div>
                                                    <p className="font-medium text-gray-900 text-base">{q.text}</p>
                                                    {q.weight !== undefined && q.weight > 0 && (
                                                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded ml-2 inline-block mt-1">
                                                            Peso: {q.weight} pts
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="pl-8">
                                            {renderPreviewInput(q)}
                                        </div>
                                    </div>
                                ))
                            )}
                            
                            {questionnaire && questionnaire.questions.length > 0 && (
                                <div className="text-center pt-8 pb-4 opacity-50">
                                    <Button disabled className="w-full max-w-sm bg-gray-300 text-gray-500 cursor-not-allowed">
                                        Enviar Respostas (Simulação)
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
      )} 
      
      {/* --- ABA RELATÓRIOS & STATS --- */}
      {activeTab === 'stats' && (
        <div className="space-y-6 animate-in fade-in">
             <div className="flex justify-between items-center bg-gray-900 text-white p-6 rounded-lg shadow-lg print:hidden">
                 <div>
                     <h2 className="text-xl font-bold">Fecho do Semestre</h2>
                     <p className="text-gray-400 text-sm mt-1">Gere os scores finais combinando Auto-Avaliação + Estudantes + Institucional.</p>
                 </div>
                 <Button onClick={handleCalculateScores} disabled={calculating} className="bg-white text-black hover:bg-gray-200 h-12 px-6">
                     {calculating ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin"/> Calculando...</> : <><Calculator className="mr-2 h-4 w-4"/> Calcular Scores</>}
                 </Button>
             </div>

             {allScores.length > 0 && (
                 <>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 print:hidden">
                        <Card>
                            <CardHeader><CardTitle className="text-sm">Média Global</CardTitle></CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-indigo-600">{avgScore}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="text-sm">Total Avaliados</CardTitle></CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{allScores.length}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="text-sm">Melhor Desempenho</CardTitle></CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-green-600">{Math.max(...allScores.map(s => s.finalScore)).toFixed(1)}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="text-sm">Pior Desempenho</CardTitle></CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-red-600">{Math.min(...allScores.map(s => s.finalScore)).toFixed(1)}</div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 print:hidden">
                        <Card>
                            <CardHeader><CardTitle>Distribuição de Classificação</CardTitle></CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={scoreDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                                            {scoreDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Scores Finais por Docente</CardTitle></CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={allScores.map(s => {
                                        const t = teachers.find(u => u.id === s.teacherId);
                                        return { name: t?.name?.split(' ')[0] || 'Doc', score: s.finalScore };
                                    })}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="score" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-white rounded-lg border shadow-sm overflow-hidden print:border-0 print:shadow-none">
                        <div className="hidden print:block mb-4">
                            <h2 className="text-xl font-bold uppercase">{institution?.name}</h2>
                            <p className="text-sm text-gray-500 uppercase">Relatório Geral de Avaliação Docente - {new Date().toLocaleDateString()}</p>
                        </div>
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b print:bg-gray-100 print:border-black">
                                <tr>
                                    <th className="px-6 py-3 text-left font-medium text-gray-500 print:text-black">Docente</th>
                                    <th className="px-6 py-3 text-right font-medium text-gray-500 print:text-black">Auto-Aval.</th>
                                    <th className="px-6 py-3 text-right font-medium text-gray-500 print:text-black">Estudantes</th>
                                    <th className="px-6 py-3 text-right font-medium text-gray-500 print:text-black">Qualitativa</th>
                                    <th className="px-6 py-3 text-right font-medium text-gray-900 print:text-black">FINAL</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y print:divide-gray-300">
                                {allScores.map(s => {
                                    const t = teachers.find(u => u.id === s.teacherId);
                                    return (
                                        <tr key={s.teacherId} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-medium">{t?.name || 'Desconhecido'}</td>
                                            <td className="px-6 py-4 text-right text-gray-500">{s.selfEvalScore}</td>
                                            <td className="px-6 py-4 text-right text-gray-500">{s.studentScore}</td>
                                            <td className="px-6 py-4 text-right text-gray-500">{s.institutionalScore}</td>
                                            <td className="px-6 py-4 text-right font-bold text-indigo-600 print:text-black">{s.finalScore}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end gap-2 mt-4 print:hidden">
                        <Button variant="outline" onClick={handlePrintPDF}>
                            <Printer className="mr-2 h-4 w-4" /> Imprimir
                        </Button>
                        <Button onClick={handleExportCSV}>
                            <Download className="mr-2 h-4 w-4" /> Exportar CSV
                        </Button>
                    </div>
                 </>
             )}
             
             {allScores.length === 0 && !calculating && (
                 <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-lg">
                     <Calculator className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                     <p>Nenhum cálculo realizado ainda.</p>
                     <p className="text-xs">Clique em "Calcular Scores" acima para processar as avaliações.</p>
                 </div>
             )}
        </div>
      )}

      {/* --- SETTINGS (LOGO UPDATE) --- */}
      {activeTab === 'settings' && institution && (
          <div className="grid gap-8 lg:grid-cols-2 max-w-4xl mx-auto print:hidden">
              <Card>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                          <Building2 className="h-5 w-5" /> Identidade da Instituição
                      </CardTitle>
                      <p className="text-sm text-gray-500">Atualize o nome e o logotipo que aparecem nos relatórios.</p>
                  </CardHeader>
                  <CardContent>
                      <form onSubmit={handleUpdateInstitution} className="space-y-6">
                          <div className="space-y-2">
                              <Label>Nome da Instituição</Label>
                              <Input 
                                value={institution.name} 
                                onChange={(e) => setInstitution({...institution, name: e.target.value})} 
                              />
                          </div>

                          <div className="space-y-2">
                              <Label>Logotipo</Label>
                              <div className="flex items-center gap-4">
                                  <div className="h-24 w-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden relative">
                                      {institution.logo ? (
                                          <img src={institution.logo} className="h-full w-full object-contain p-2" />
                                      ) : (
                                          <ImageIcon className="h-8 w-8 text-gray-300" />
                                      )}
                                      <input 
                                          type="file" 
                                          accept="image/*" 
                                          onChange={handleInstLogoUpload}
                                          className="absolute inset-0 opacity-0 cursor-pointer" 
                                      />
                                  </div>
                                  <div className="flex-1 text-sm text-gray-500">
                                      <p>Clique na imagem para alterar.</p>
                                      <p className="text-xs mt-1">Recomendado: PNG ou JPG com fundo transparente. Máx 500KB.</p>
                                  </div>
                              </div>
                          </div>
                          
                          <div className="space-y-2">
                              <Label>Código / Sigla</Label>
                              <Input 
                                disabled
                                value={institution.code} 
                                className="bg-gray-100 text-gray-500"
                              />
                              <p className="text-xs text-gray-400">O código da instituição não pode ser alterado.</p>
                          </div>

                          <Button type="submit" className="w-full">
                              <Save className="mr-2 h-4 w-4" /> Salvar Alterações
                          </Button>
                      </form>
                  </CardContent>
              </Card>

              <Card className="bg-blue-50/50 border-blue-100">
                  <CardHeader>
                      <CardTitle className="text-blue-900">Sobre sua conta</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <div className="p-4 bg-white rounded-lg border shadow-sm">
                          <p className="text-sm font-medium text-gray-500">Código de Convite</p>
                          <div className="flex items-center gap-2 mt-1">
                              <Key className="h-4 w-4 text-gray-400" />
                              <span className="font-mono text-lg font-bold">{institution.inviteCode || 'N/A'}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-2">Use este código se precisar convidar outros gestores (Funcionalidade futura).</p>
                      </div>
                  </CardContent>
              </Card>
          </div>
      )}
    </div>
  );
};