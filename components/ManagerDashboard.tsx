
import React, { useState, useEffect } from 'react';
import { BackendService } from '../services/backend';
import { User, UserRole, Subject, Questionnaire, QuestionType, TeacherCategory, CombinedScore } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from './ui';
import { Users, Check, BookOpen, Calculator, AlertCircle, Plus, Trash2, FileQuestion, ChevronDown, ChevronUp, UserPlus, Star, List, Type, BarChartHorizontal, Key, GraduationCap, Upload, FileText, PieChart as PieIcon, Download, Printer, Image as ImageIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

interface Props {
  institutionId: string;
}

export const ManagerDashboard: React.FC<Props> = ({ institutionId }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'teachers' | 'students' | 'questionnaire' | 'stats'>('overview');
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
    const allUsers = await BackendService.getUsers();
    // Allow Managers to appear in list if they are also teachers (by role check or context)
    // For now, filter by TEACHER role as primary check, or MANAGER if assigned to subjects
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

    setLoading(false);
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
      if (!newTeacherName || !newTeacherEmail || !newTeacherPwd) {
          alert("Nome, Email e Senha são obrigatórios.");
          return;
      }
      try {
          await BackendService.addTeacher(institutionId, newTeacherName, newTeacherEmail, newTeacherPwd, newTeacherAvatar);
          setNewTeacherName('');
          setNewTeacherEmail('');
          setNewTeacherPwd('');
          setNewTeacherAvatar('');
          loadData();
          alert(`Docente cadastrado com sucesso!`);
      } catch (error: any) {
          alert("Erro: " + error.message);
      }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newStudentName || !newStudentEmail || !newStudentPwd) {
          alert("Nome, Email e Senha são obrigatórios.");
          return;
      }
      try {
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
          loadData();
          alert(`Estudante cadastrado com sucesso!`);
      } catch (error: any) {
          alert("Erro: " + error.message);
      }
  };

  const handleEvalChange = (teacherId: string, field: 'deadlines' | 'quality', value: string) => {
      const val = Math.min(Math.max(parseInt(value) || 0, 0), 10); 
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
      // Refresh stats if on stats tab
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
          code: newSubCode, // Optional
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
      // Reset weight default
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Limit size to ~2MB for LocalStorage safety
      if (file.size > 2 * 1024 * 1024) {
          alert("O ficheiro é muito grande. O limite é 2MB.");
          return;
      }

      const reader = new FileReader();
      reader.onload = async (ev) => {
          const base64 = ev.target?.result as string;
          
          let updatedQ: Questionnaire;
          if (!questionnaire) {
              updatedQ = {
                  id: `q_${institutionId}_${targetRole}`,
                  institutionId,
                  title: targetRole === 'student' ? 'Avaliação com Anexo' : 'Inquérito com Anexo',
                  active: true,
                  questions: [],
                  attachmentUrl: base64,
                  attachmentName: file.name,
                  targetRole: targetRole
              };
          } else {
              updatedQ = {
                  ...questionnaire,
                  attachmentUrl: base64,
                  attachmentName: file.name,
                  targetRole: targetRole
              };
          }
          await BackendService.saveQuestionnaire(updatedQ);
          setQuestionnaire(updatedQ);
          alert("Ficheiro anexado com sucesso!");
      };
      reader.readAsDataURL(file);
  };

  const handleRemoveFile = async () => {
      if (!questionnaire) return;
      const updatedQ = {
          ...questionnaire,
          attachmentUrl: undefined,
          attachmentName: undefined
      };
      await BackendService.saveQuestionnaire(updatedQ);
      setQuestionnaire(updatedQ);
  };

  // --- REPORT GENERATION ---
  const handleExportCSV = () => {
    if (allScores.length === 0) return alert("Sem dados para exportar.");
    
    let csv = "Docente,Score Alunos,Score Auto-Aval.,Score Institucional,Score Final,Data\n";
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

  // Group Students Logic
  const groupedStudents = students.reduce((acc, student) => {
      const course = student.course || 'Sem Curso Atribuído';
      const level = student.level ? `${student.level}º Ano` : 'Sem Ano';
      
      if (!acc[course]) acc[course] = {};
      if (!acc[course][level]) acc[course][level] = [];
      
      acc[course][level].push(student);
      return acc;
  }, {} as Record<string, Record<string, User[]>>);

  // Stats Logic
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
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestão Institucional</h1>
            <p className="text-gray-500">Administração de Docentes e Avaliações</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg flex-wrap gap-1">
            <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'overview' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>Visão Geral</button>
            <button onClick={() => setActiveTab('teachers')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'teachers' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>Docentes</button>
            <button onClick={() => setActiveTab('students')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'students' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>Alunos</button>
            <button onClick={() => setActiveTab('questionnaire')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'questionnaire' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>Questionários</button>
            <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'stats' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>Relatórios & Estatísticas</button>
        </div>
      </header>

      {/* --- ABA ESTATÍSTICAS --- */}
      {activeTab === 'stats' && (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
             {/* Report Header for Print */}
             <div className="hidden print:block text-center mb-8 border-b pb-4">
                 <h1 className="text-2xl font-bold">Relatório de Avaliação de Desempenho Docente</h1>
                 <p className="text-gray-500">Relatório Gerado em {new Date().toLocaleDateString()}</p>
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
                                    { name: 'Alunos', score: (allScores.reduce((a,b)=>a+b.studentScore,0)/allScores.length).toFixed(1) },
                                    { name: 'Gestor', score: (allScores.reduce((a,b)=>a+b.institutionalScore,0)/allScores.length).toFixed(1) },
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
                                     <th className="p-3">Auto-Aval. (Max 80)</th>
                                     <th className="p-3">Alunos (Max 12)</th>
                                     <th className="p-3">Gestor (Max 8)</th>
                                     <th className="p-3 font-bold">Final</th>
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
                        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Lista de Docentes & Avaliação Qualitativa</CardTitle>
                        <p className="text-xs text-gray-500">Expanda para atribuir nota de 0 a 10 nos critérios institucionais.</p>
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
                                        <div className="p-4 bg-gray-50 border-t space-y-4 animate-in slide-in-from-top-2">
                                            <h5 className="text-xs font-bold text-gray-700 uppercase">Avaliação do Gestor (Peso 8%)</h5>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Cumprimento de Prazos (0-10)</Label>
                                                    <Input type="number" min="0" max="10" value={ev.deadlines} onChange={(e) => handleEvalChange(t.id, 'deadlines', e.target.value)} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Qualidade do Trabalho (0-10)</Label>
                                                    <Input type="number" min="0" max="10" value={ev.quality} onChange={(e) => handleEvalChange(t.id, 'quality', e.target.value)} />
                                                </div>
                                            </div>
                                            <Button size="sm" onClick={() => handleEvalSubmit(t.id)}>Salvar Avaliação</Button>
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

      {/* --- ABA QUESTIONÁRIO --- */}
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

                {/* Upload Section */}
                <Card className="border-blue-200 bg-blue-50/30">
                     <CardHeader className="pb-3">
                         <CardTitle className="flex items-center gap-2 text-blue-900">
                             <Upload className="h-5 w-5" /> Upload de Ficheiro
                         </CardTitle>
                         <p className="text-xs text-gray-500">Anexe PDF, Word ou Docx.</p>
                     </CardHeader>
                     <CardContent>
                         <div className="space-y-4">
                            <Input 
                                type="file" 
                                accept=".pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                onChange={handleFileUpload}
                                className="cursor-pointer bg-white"
                            />
                            {questionnaire?.attachmentName ? (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between p-3 bg-white rounded border border-blue-200">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                            <span className="text-sm truncate">{questionnaire.attachmentName}</span>
                                        </div>
                                        <Button variant="ghost" size="sm" className="text-red-500 h-8 w-8 p-0" onClick={handleRemoveFile}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-gray-500 text-center">Ficheiro anexado com sucesso.</p>
                                </div>
                            ) : (
                                <p className="text-xs text-center text-gray-400 italic py-2">Nenhum ficheiro anexado.</p>
                            )}
                         </div>
                     </CardContent>
                </Card>

                <Card className="sticky top-4">
                    <CardHeader className="bg-slate-900 text-white rounded-t-lg">
                        <CardTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5" /> Adicionar Pergunta Digital
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
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileQuestion className="h-5 w-5" /> {targetRole === 'student' ? 'Formulário do Aluno' : 'Formulário do Docente'}
                        </CardTitle>
                        <div className="pt-2">
                            <Label className="text-xs text-gray-500">Título do Questionário (Visível ao Respondente)</Label>
                            <Input 
                                value={questionnaire?.title || ''} 
                                onChange={(e) => handleUpdateTitle(e.target.value)} 
                                className="mt-1"
                                placeholder={targetRole === 'student' ? "Ex: Ficha de Avaliação" : "Ex: Inquérito de Satisfação"}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(!questionnaire || questionnaire.questions.length === 0) ? (
                            <div className="text-center py-12 border-2 border-dashed rounded-lg text-gray-400">
                                <List className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                <p>O questionário está vazio.</p>
                                <p className="text-sm">Adicione perguntas manualmente.</p>
                            </div>
                        ) : (
                            questionnaire.questions.map((q, idx) => (
                                <div key={q.id} className="flex items-start gap-3 p-3 bg-white border rounded-lg shadow-sm group hover:border-gray-400 transition-colors">
                                    <div className="mt-1 h-6 w-6 flex items-center justify-center bg-gray-100 rounded text-xs font-mono text-gray-500 shrink-0">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm text-gray-900">{q.text}</p>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            <span className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                                                {getIconForType(q.type)}
                                                {q.type === 'scale_10' ? 'Escala 0-10' : 
                                                 q.type === 'stars' ? 'Estrelas' :
                                                 q.type === 'binary' ? 'Sim/Não' :
                                                 q.type === 'text' ? 'Texto' : 'Múltipla Escolha'}
                                            </span>
                                            {q.weight !== undefined && q.weight > 0 && (
                                                <span className="text-xs font-bold text-blue-600">Vale {q.weight} pts</span>
                                            )}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleRemoveQuestion(q.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        title="Remover Pergunta"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
      )} 
      
      {/* --- ABA VISÃO GERAL --- */}
      {activeTab === 'overview' && (
        <>
        {/* Pending Approvals */}
        {unapproved.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 print:hidden">
            <div className="flex items-center gap-2 text-amber-800 mb-3">
                <AlertCircle className="h-5 w-5" />
                <h3 className="font-semibold">Aprovações Pendentes</h3>
            </div>
            <div className="grid gap-2">
                {unapproved.map(u => (
                <div key={u.id} className="flex items-center justify-between bg-white p-3 rounded border border-amber-100">
                    <span>{u.name} ({u.email})</span>
                    <Button size="sm" onClick={() => handleApprove(u.id)}>
                    <Check className="mr-1 h-3 w-3" /> Aprovar
                    </Button>
                </div>
                ))}
            </div>
            </div>
        )}

        <div className="grid gap-8 lg:grid-cols-12 print:hidden">
            <div className="lg:col-span-8 space-y-8">
                {/* Subject Management */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" /> Gestão de Disciplinas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <form onSubmit={handleCreateSubject} className="bg-gray-50 p-4 rounded-lg border space-y-4">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Detalhes da Disciplina</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Nome da Disciplina *</Label>
                                    <Input value={newSubName} onChange={e => setNewSubName(e.target.value)} placeholder="Ex: Matemática I" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Código (Opcional)</Label>
                                    <Input value={newSubCode} onChange={e => setNewSubCode(e.target.value)} placeholder="Ex: MAT101" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Curso</Label>
                                    <Input value={newSubCourse} onChange={e => setNewSubCourse(e.target.value)} placeholder="Ex: Eng. Informática" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div className="space-y-2">
                                    <Label>Ano Lectivo</Label>
                                    <Input value={newSubYear} onChange={e => setNewSubYear(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nível (Ano)</Label>
                                    <Input value={newSubLevel} onChange={e => setNewSubLevel(e.target.value)} placeholder="1º, 2º..." />
                                </div>
                                <div className="space-y-2">
                                    <Label>Ident. Turma</Label>
                                    <Input value={newSubClassGroup} onChange={e => setNewSubClassGroup(e.target.value)} placeholder="Ex: A, B" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Turno</Label>
                                    <Select value={newSubShift} onChange={e => setNewSubShift(e.target.value)}>
                                        <option value="Diurno">Diurno</option>
                                        <option value="Noturno">Noturno</option>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Modalidade</Label>
                                    <Select value={newSubModality} onChange={e => setNewSubModality(e.target.value)}>
                                        <option value="Presencial">Presencial</option>
                                        <option value="Online">Online</option>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Semestre</Label>
                                    <Select value={newSubSemester} onChange={e => setNewSubSemester(e.target.value)}>
                                        <option value="1">1º Semestre</option>
                                        <option value="2">2º Semestre</option>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Categoria Docente</Label>
                                    <Select value={newSubCategory} onChange={e => setNewSubCategory(e.target.value as TeacherCategory)}>
                                        <option value="assistente">Assistente</option>
                                        <option value="assistente_estagiario">Assistente Estagiário</option>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Docente Responsável *</Label>
                                <Select value={newSubTeacher} onChange={e => setNewSubTeacher(e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {teachers.map(t => (<option key={t.id} value={t.id}>{t.name} {t.role === 'institution_manager' ? '(Gestor)' : ''}</option>))}
                                </Select>
                            </div>

                            <Button type="submit" className="w-full" disabled={teachers.length === 0}>Adicionar Disciplina</Button>
                        </form>

                        <div className="divide-y border rounded-md overflow-hidden max-h-[300px] overflow-y-auto">
                             {subjects.length === 0 && <p className="p-4 text-center text-gray-500 italic">Nenhuma disciplina cadastrada.</p>}
                             {subjects.map(sub => {
                                const teacher = teachers.find(t => t.id === sub.teacherId);
                                return (
                                    <div key={sub.id} className="p-3 bg-white hover:bg-gray-50 text-sm">
                                        <div className="flex justify-between font-medium">
                                            <span>{sub.name}</span>
                                            <span className="text-gray-500">{sub.code || 'S/ Cod'}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                                            <span>{sub.course} ({sub.shift}, {sub.modality})</span>
                                            <span>{teacher?.name || 'Desconhecido'}</span>
                                        </div>
                                    </div>
                                );
                             })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="lg:col-span-4 space-y-6">
                <Card className="bg-slate-900 text-white border-slate-800 shadow-xl sticky top-4">
                    <CardHeader><CardTitle className="text-white flex items-center gap-2"><Calculator className="h-5 w-5" /> Fecho do Semestre</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-sm text-slate-300 mb-4">Calcula a pontuação acumulada (Student Points + Self Eval + Qualitative).</p>
                        <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 font-bold" onClick={handleCalculate} disabled={calculating}>
                            {calculating ? 'Processando...' : 'Calcular Scores'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
        </>
      )}
    </div>
  );
};
