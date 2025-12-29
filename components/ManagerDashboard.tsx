
import React, { useState, useEffect } from 'react';
import { BackendService } from '../services/backend';
// import { AIService } from '../services/ai'; // Removed AI Service
import { User, UserRole, Subject, Questionnaire, QuestionType, TeacherCategory, CombinedScore, Question, Institution } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from './ui';
import { Users, Check, BookOpen, Calculator, AlertCircle, Plus, Trash2, FileQuestion, ChevronDown, ChevronUp, UserPlus, Star, List, Type, BarChartHorizontal, Key, GraduationCap, PieChart as PieIcon, Download, Printer, Image as ImageIcon, Sparkles, RefreshCw, ScanText, Eye, Settings, Building2, Save, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

interface Props {
  institutionId: string;
}

export const ManagerDashboard: React.FC<Props> = ({ institutionId }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'teachers' | 'students' | 'questionnaire' | 'stats' | 'settings'>('overview');
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

  // Form State for New Subject
  const [newSubName, setNewSubName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubTeacher, setNewSubTeacher] = useState('');
  // New Fields
  const [newSubYear, setNewSubYear] = useState(new Date().getFullYear().toString());
  const [newSubLevel, setNewSubLevel] = useState('');
  const [newSubSemester, setNewSubSemester] = useState('1');
  const [newSubCourse, setNewSubCourse] = useState('');
  const [newSubClassGroup, setNewSubClassGroup] = useState(''); // Turma
  const [newSubShift, setNewSubShift] = useState('Diurno');
  const [newSubModality, setNewSubModality] = useState('Presencial');
  const [newSubCategory, setNewSubCategory] = useState<TeacherCategory>('assistente');

  // Form State for New Teacher
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherPwd, setNewTeacherPwd] = useState('');
  const [newTeacherAvatar, setNewTeacherAvatar] = useState('');

  // Form State for New Student
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentPwd, setNewStudentPwd] = useState('');
  const [newStudentCourse, setNewStudentCourse] = useState('');
  const [newStudentLevel, setNewStudentLevel] = useState('');
  const [newStudentAvatar, setNewStudentAvatar] = useState('');

  useEffect(() => {
    loadData();
  }, [institutionId]);

  // Recarregar questionário quando muda o alvo
  useEffect(() => {
      loadQuestionnaire();
  }, [targetRole, institutionId]);

  useEffect(() => {
    if (activeTab === 'stats') {
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
        const potentialTeachers = allUsers.filter(u => (u.role === UserRole.TEACHER || u.role === UserRole.INSTITUTION_MANAGER) && u.institutionId === institutionId);
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

  const handleApprove = async (id: string) => {
    await BackendService.approveTeacher(id);
    loadData();
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
      
      // Validação básica
      if (!newTeacherName.trim() || !newTeacherEmail.trim() || !newTeacherPwd.trim()) {
          alert("Por favor, preencha Nome, Email e Senha.");
          return;
      }

      try {
          console.log("Adicionando docente:", newTeacherName, newTeacherEmail);
          await BackendService.addTeacher(institutionId, newTeacherName, newTeacherEmail, newTeacherPwd, newTeacherAvatar);
          
          // Limpar campos
          setNewTeacherName('');
          setNewTeacherEmail('');
          setNewTeacherPwd('');
          setNewTeacherAvatar('');
          
          // Recarregar dados
          await loadData();
          alert(`Docente cadastrado com sucesso!`);
      } catch (error: any) {
          console.error("Erro ao adicionar docente:", error);
          alert("Erro ao cadastrar docente: " + error.message);
      }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!newStudentName.trim() || !newStudentEmail.trim() || !newStudentPwd.trim()) {
          alert("Por favor, preencha Nome, Email e Senha.");
          return;
      }

      try {
          console.log("Adicionando estudante:", newStudentName, newStudentEmail);
          await BackendService.addStudent(
              institutionId, 
              newStudentName, 
              newStudentEmail, 
              newStudentPwd, 
              newStudentCourse, 
              newStudentLevel,
              newStudentAvatar
          );
          
          setNewStudentName('');
          setNewStudentEmail('');
          setNewStudentPwd('');
          setNewStudentCourse('');
          setNewStudentLevel('');
          setNewStudentAvatar('');
          
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

  const handleCalculate = async () => {
      setCalculating(true);
      await BackendService.calculateScores(institutionId);
      setCalculating(false);
      alert("Cálculo realizado com sucesso!");
      if (activeTab === 'stats') BackendService.getAllScores(institutionId).then(setAllScores);
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newSubName || !newSubTeacher) {
          alert("Nome da disciplina e Docente são obrigatórios.");
          return;
      }
      await BackendService.assignSubject({
          name: newSubName,
          code: newSubCode,
          teacherId: newSubTeacher,
          institutionId: institutionId,
          academicYear: newSubYear,
          level: newSubLevel,
          semester: newSubSemester,
          course: newSubCourse,
          classGroup: newSubClassGroup,
          shift: newSubShift,
          modality: newSubModality,
          teacherCategory: newSubCategory
      });
      setNewSubName('');
      setNewSubCode('');
      setNewSubTeacher('');
      setNewSubLevel('');
      setNewSubCourse('');
      setNewSubClassGroup('');
      loadData();
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

  const getIconForType = (type: QuestionType) => {
      switch(type) {
          case 'stars': return <Star className="h-4 w-4 text-yellow-500" />;
          case 'scale_10': return <BarChartHorizontal className="h-4 w-4 text-blue-500" />;
          case 'binary': return <Check className="h-4 w-4 text-green-500" />;
          case 'text': return <Type className="h-4 w-4 text-gray-500" />;
          case 'choice': return <List className="h-4 w-4 text-purple-500" />;
      }
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
            <button onClick={() => setActiveTab('questionnaire')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'questionnaire' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>Questionários</button>
            <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'stats' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>Relatórios & Estatísticas</button>
            <button onClick={() => setActiveTab('settings')} className={`px-3 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-1 ${activeTab === 'settings' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>
                <Settings className="h-4 w-4" /> Configurações
            </button>
        </div>
      </header>

      {/* --- ABA CONFIGURAÇÕES (LOGO E NOME) --- */}
      {activeTab === 'settings' && institution && (
          <div className="grid gap-8 lg:grid-cols-2 max-w-4xl mx-auto">
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

      {/* --- ABA ESTATÍSTICAS --- */}
      {activeTab === 'stats' && (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
             {/* Report Header for Print */}
             <div className="hidden print:block text-center mb-8 border-b pb-4">
                 {institution?.logo && <img src={institution.logo} className="h-16 mx-auto mb-2" />}
                 <h1 className="text-2xl font-bold">{institution?.name || 'Relatório Institucional'}</h1>
                 <p className="text-gray-500">Relatório de Avaliação de Desempenho Docente</p>
                 <p className="text-xs text-gray-400 mt-1">Gerado em {new Date().toLocaleDateString()}</p>
             </div>

             {/* KPIs */}
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6 print:grid-cols-4">
                 <Card>
                     <CardContent className="pt-6">
                         <div className="text-2xl font-bold">{teachers.length}</div>
                         <p className="text-xs text-gray-500">Docentes Cadastrados</p>
                     </CardContent>
                 </Card>
                 <Card>
                     <CardContent className="pt-6">
                         <div className="text-2xl font-bold">{students.length}</div>
                         <p className="text-xs text-gray-500">Alunos Ativos</p>
                     </CardContent>
                 </Card>
                 <Card>
                     <CardContent className="pt-6">
                         <div className="text-2xl font-bold text-blue-600">{avgScore}</div>
                         <p className="text-xs text-gray-500">Média Geral da Instituição</p>
                     </CardContent>
                 </Card>
                 <Card>
                     <CardContent className="pt-6">
                         <div className="text-2xl font-bold text-green-600">{allScores.length}</div>
                         <p className="text-xs text-gray-500">Docentes Avaliados</p>
                     </CardContent>
                 </Card>
             </div>

             {/* Charts */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:block print:space-y-8">
                 <Card className="print:shadow-none print:border-none">
                     <CardHeader>
                         <CardTitle className="text-base">Distribuição de Resultados</CardTitle>
                     </CardHeader>
                     <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={scoreDistribution} 
                                    dataKey="value" 
                                    nameKey="name" 
                                    cx="50%" 
                                    cy="50%" 
                                    outerRadius={80} 
                                    label 
                                >
                                    {scoreDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                     </CardContent>
                 </Card>

                 <Card className="print:shadow-none print:border-none">
                     <CardHeader>
                         <CardTitle className="text-base">Médias por Componente</CardTitle>
                     </CardHeader>
                     <CardContent className="h-[300px]">
                        {allScores.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[
                                    { name: 'Auto-Avaliação', score: (allScores.reduce((a,b)=>a+b.selfEvalScore,0)/allScores.length).toFixed(1) },
                                    { name: 'Aval. Estudante', score: (allScores.reduce((a,b)=>a+b.studentScore,0)/allScores.length).toFixed(1) },
                                    { name: 'Aval. Qualitativa', score: (allScores.reduce((a,b)=>a+b.institutionalScore,0)/allScores.length).toFixed(1) },
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={60} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <p className="text-center py-10 text-gray-400">Sem dados.</p>}
                     </CardContent>
                 </Card>
             </div>

             {/* Table */}
             <Card>
                 <CardHeader>
                     <CardTitle>Detalhes por Docente</CardTitle>
                 </CardHeader>
                 <CardContent>
                     <div className="overflow-x-auto">
                         <table className="w-full text-sm text-left">
                             <thead className="bg-gray-50 text-gray-600 font-medium">
                                 <tr>
                                     <th className="p-3">Docente</th>
                                     <th className="p-3">Auto-Aval.</th>
                                     <th className="p-3">Aval. Estudante</th>
                                     <th className="p-3">Aval. Qualitativa</th>
                                     <th className="p-3 font-bold">Total</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y">
                                 {allScores.map(s => {
                                     const t = teachers.find(u => u.id === s.teacherId);
                                     return (
                                         <tr key={s.teacherId}>
                                             <td className="p-3 flex items-center gap-2">
                                                 {t?.avatar && <img src={t.avatar} className="h-6 w-6 rounded-full object-cover" />}
                                                 {t?.name || 'Desconhecido'}
                                             </td>
                                             <td className="p-3">{s.selfEvalScore}</td>
                                             <td className="p-3">{s.studentScore}</td>
                                             <td className="p-3">{s.institutionalScore}</td>
                                             <td className="p-3 font-bold">{s.finalScore}</td>
                                         </tr>
                                     )
                                 })}
                             </tbody>
                         </table>
                     </div>
                 </CardContent>
             </Card>

             {/* Actions */}
             <div className="flex justify-end gap-4 print:hidden">
                 <Button variant="outline" onClick={handlePrintPDF}>
                     <Printer className="mr-2 h-4 w-4" /> Imprimir Relatório (PDF)
                 </Button>
                 <Button onClick={handleExportCSV}>
                     <Download className="mr-2 h-4 w-4" /> Exportar Dados (CSV)
                 </Button>
             </div>
        </div>
      )}

      {/* --- ABA ALUNOS --- */}
      {activeTab === 'students' && (
          <div className="grid gap-8 lg:grid-cols-12 print:hidden">
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
                                    <Input value={newStudentCourse} onChange={e => setNewStudentCourse(e.target.value)} placeholder="Ex: Informática" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Ano/Nível</Label>
                                    <Input value={newStudentLevel} onChange={e => setNewStudentLevel(e.target.value)} placeholder="Ex: 1, 2" />
                                </div>
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
                                                               <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                                                                   Ativo
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

      {/* --- ABA DOCENTES --- */}
      {activeTab === 'teachers' && (
          <div className="grid gap-8 lg:grid-cols-12 print:hidden">
            <div className="lg:col-span-5 space-y-6">
                 {/* Teacher Management Form */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5" /> Cadastrar Novo Docente
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddTeacher} className="bg-gray-50 p-4 rounded-lg border space-y-4">
                                <div className="flex gap-4">
                                    <div className="flex-1 space-y-2">
                                        <Label>Nome</Label>
                                        <Input value={newTeacherName} onChange={e => setNewTeacherName(e.target.value)} placeholder="Nome completo" required />
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
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input type="email" value={newTeacherEmail} onChange={e => setNewTeacherEmail(e.target.value)} placeholder="email@instituicao.ac.mz" required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Senha de Acesso</Label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                        <Input 
                                            type="text" 
                                            value={newTeacherPwd} 
                                            onChange={e => setNewTeacherPwd(e.target.value)} 
                                            placeholder="Atribua uma senha" 
                                            className="pl-9"
                                            required 
                                        />
                                    </div>
                                </div>
                            <div className="flex justify-between items-center pt-2">
                                <p className="text-[10px] text-gray-500 w-1/2">* Dirigentes também podem ser cadastrados como docentes.</p>
                                <Button type="submit"><Plus className="mr-2 h-4 w-4" /> Salvar</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>

            <div className="lg:col-span-7 space-y-6">
                {/* Qualitative Eval & List */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Avaliação Qualitativa (Ficha de Indicadores)</CardTitle>
                        <p className="text-xs text-gray-500">Avalie os parâmetros abaixo. O sistema calculará o coeficiente automaticamente (0.46 ou 0.88).</p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {teachers.length === 0 && <p className="text-center py-8 text-gray-500">Nenhum docente cadastrado.</p>}
                        {teachers.map(t => {
                            const isExpanded = expandedTeacher === t.id;
                            const ev = qualEvals[t.id] || { deadlines: 0, quality: 0 };
                            return (
                                <div key={t.id} className="border rounded-lg bg-white shadow-sm overflow-hidden">
                                    <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50" onClick={() => setExpandedTeacher(isExpanded ? null : t.id)}>
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                                                {t.avatar ? <img src={t.avatar} className="h-full w-full object-cover" /> : <Users className="h-5 w-5 m-2.5 text-gray-400" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">{t.name}</span>
                                                <span className="text-xs text-gray-400">{t.email}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {(ev.deadlines > 0 || ev.quality > 0) && <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Avaliado</span>}
                                            {isExpanded ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
                                        </div>
                                    </div>
                                    {isExpanded && (
                                        <div className="p-4 bg-gray-50 border-t space-y-6 animate-in slide-in-from-top-2">
                                            
                                            {/* Indicador 1: Prazos */}
                                            <div className="space-y-3">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h5 className="font-bold text-sm text-gray-900">1. Cumprimento de tarefas e prazos (Max 10)</h5>
                                                        <p className="text-xs text-gray-500">Refere-se a prazos semestrais ou anuais.</p>
                                                    </div>
                                                    <span className="font-mono font-bold text-lg text-blue-600">{ev.deadlines} pts</span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {[
                                                        { val: 10, label: "Realiza tarefas em prazos mais curtos que o necessário" },
                                                        { val: 7.5, label: "Executa com rapidez, oportunidade e qualidade aceitável" },
                                                        { val: 5, label: "Realiza em regra dentro dos prazos estabelecidos" },
                                                        { val: 2.5, label: "Demasiado lento, atrasos no serviço" }
                                                    ].map((opt) => (
                                                        <button
                                                            key={opt.val}
                                                            onClick={() => handleEvalChange(t.id, 'deadlines', opt.val.toString())}
                                                            className={`text-left p-3 rounded-md border text-xs transition-all ${
                                                                ev.deadlines === opt.val 
                                                                ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500 text-blue-900' 
                                                                : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-600'
                                                            }`}
                                                        >
                                                            <span className="font-bold block mb-1">{opt.val} Pontos</span>
                                                            {opt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="h-px bg-gray-200"></div>

                                            {/* Indicador 2: Qualidade */}
                                            <div className="space-y-3">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h5 className="font-bold text-sm text-gray-900">2. Qualidade do trabalho realizado (Max 10)</h5>
                                                        <p className="text-xs text-gray-500">Avaliação da excelência e padrão do trabalho.</p>
                                                    </div>
                                                    <span className="font-mono font-bold text-lg text-purple-600">{ev.quality} pts</span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {[
                                                        { val: 10, label: "Qualidade excelente" },
                                                        { val: 7.5, label: "Muito boa qualidade e exemplar" },
                                                        { val: 5, label: "Boa qualidade e dentro do padrão estabelecido" },
                                                        { val: 2.5, label: "Qualidade insuficiente e necessita de correções" }
                                                    ].map((opt) => (
                                                        <button
                                                            key={opt.val}
                                                            onClick={() => handleEvalChange(t.id, 'quality', opt.val.toString())}
                                                            className={`text-left p-3 rounded-md border text-xs transition-all ${
                                                                ev.quality === opt.val 
                                                                ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500 text-purple-900' 
                                                                : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-600'
                                                            }`}
                                                        >
                                                            <span className="font-bold block mb-1">{opt.val} Pontos</span>
                                                            {opt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex justify-end pt-2">
                                                <Button size="sm" onClick={() => handleEvalSubmit(t.id)}>
                                                    <Save className="h-4 w-4 mr-2" /> Salvar Avaliação Qualitativa
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>
            </div>
          </div>
      )}

      {/* ... (rest of the file) ... */}
      {/* ... (Questionnaire tab and others remain similar) ... */}
      {activeTab === 'questionnaire' && (
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
      )} 
      
      {/* ... (Overview tab content remains unchanged) ... */}
      {activeTab === 'overview' && (
        <div className="text-center p-10"><p className="text-gray-500">Visão Geral Ativa</p></div>
      )}
    </div>
  );
};
