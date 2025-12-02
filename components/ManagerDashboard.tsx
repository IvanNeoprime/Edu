
import React, { useState, useEffect } from 'react';
import { BackendService } from '../services/backend';
import { User, UserRole, Subject, Questionnaire, QuestionType, TeacherCategory } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from './ui';
import { Users, Check, BookOpen, Calculator, AlertCircle, Plus, Trash2, FileQuestion, ChevronDown, ChevronUp, UserPlus, Star, List, Type, BarChartHorizontal, Key, Download, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  institutionId: string;
}

export const ManagerDashboard: React.FC<Props> = ({ institutionId }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'questionnaire'>('overview');
  const [teachers, setTeachers] = useState<User[]>([]);
  const [unapproved, setUnapproved] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  const [qualEvals, setQualEvals] = useState<Record<string, { deadlines: number, quality: number }>>({});
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  // Questionnaire State
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
  const [newSubCategory, setNewSubCategory] = useState<TeacherCategory>('assistente');

  // Form State for New Teacher
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherPwd, setNewTeacherPwd] = useState('');

  useEffect(() => {
    loadData();
  }, [institutionId]);

  const loadData = async () => {
    setLoading(true);
    const allUsers = await BackendService.getUsers();
    // Allow Managers to appear in list if they are also teachers (by role check or context)
    // For now, filter by TEACHER role as primary check, or MANAGER if assigned to subjects
    const potentialTeachers = allUsers.filter(u => (u.role === UserRole.TEACHER || u.role === UserRole.INSTITUTION_MANAGER) && u.institutionId === institutionId);
    setTeachers(potentialTeachers);
    
    setUnapproved(await BackendService.getUnapprovedTeachers(institutionId));
    
    const instSubjects = await BackendService.getInstitutionSubjects(institutionId);
    setSubjects(instSubjects);

    const q = await BackendService.getInstitutionQuestionnaire(institutionId);
    setQuestionnaire(q);
    
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

  const handleAddTeacher = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTeacherName || !newTeacherEmail || !newTeacherPwd) {
          alert("Nome, Email e Senha são obrigatórios.");
          return;
      }
      try {
          await BackendService.addTeacher(institutionId, newTeacherName, newTeacherEmail, newTeacherPwd);
          setNewTeacherName('');
          setNewTeacherEmail('');
          setNewTeacherPwd('');
          loadData();
          alert(`Docente cadastrado com sucesso!`);
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
  };

  const handleExportCSV = async () => {
      const scores = await BackendService.getInstitutionScores(institutionId);
      if (scores.length === 0) {
          alert("Ainda não há pontuações calculadas para exportar.");
          return;
      }

      let csvContent = `data:text/csv;charset=utf-8,`;
      csvContent += "Docente,Email,Pontos Alunos (Estudante),Pontos Auto-Avaliação,Pontos Institucionais,SCORE FINAL\n";

      teachers.forEach(t => {
          const score = scores.find(s => s.teacherId === t.id);
          if (score) {
              csvContent += `"${t.name}","${t.email}",${score.studentScore},${score.selfEvalScore},${score.institutionalScore},${score.finalScore}\n`;
          } else {
              csvContent += `"${t.name}","${t.email}",0,0,0,0\n`;
          }
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Relatorio_Geral_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
      const scores = await BackendService.getInstitutionScores(institutionId);
      if (scores.length === 0) {
          alert("Ainda não há pontuações calculadas para exportar.");
          return;
      }

      const doc = new jsPDF();

      // Header
      doc.setFontSize(18);
      doc.text("Pauta de Avaliação de Desempenho Docente", 14, 22);
      doc.setFontSize(11);
      doc.text(`Data de Emissão: ${new Date().toLocaleDateString()}`, 14, 30);
      doc.text("Este documento contém o resumo das pontuações do semestre.", 14, 36);

      // Data for Table
      const tableBody = teachers.map(t => {
          const score = scores.find(s => s.teacherId === t.id);
          return [
              t.name,
              t.email,
              score ? score.selfEvalScore.toFixed(2) : "0.00",
              score ? score.studentScore.toFixed(2) : "0.00",
              score ? score.institutionalScore.toFixed(2) : "0.00",
              score ? score.finalScore.toFixed(2) : "0.00"
          ];
      });

      // Table - using function explicitly
      autoTable(doc, {
          startY: 45,
          head: [['Docente', 'Email', 'Auto-Aval.', 'Alunos', 'Inst.', 'FINAL']],
          body: tableBody,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185], textColor: 255 },
          styles: { fontSize: 9 },
      });

      doc.save(`Relatorio_Geral_${new Date().toISOString().slice(0,10)}.pdf`);
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
          teacherCategory: newSubCategory
      });
      setNewSubName('');
      setNewSubCode('');
      setNewSubTeacher('');
      setNewSubLevel('');
      setNewSubCourse('');
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
              id: `q_${institutionId}`,
              institutionId,
              title: 'Avaliação Personalizada',
              active: true,
              questions: [newQuestion]
          };
      } else {
          updatedQ = {
              ...questionnaire,
              questions: [...questionnaire.questions, newQuestion]
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

  const getIconForType = (type: QuestionType) => {
      switch(type) {
          case 'stars': return <Star className="h-4 w-4 text-yellow-500" />;
          case 'scale_10': return <BarChartHorizontal className="h-4 w-4 text-blue-500" />;
          case 'binary': return <Check className="h-4 w-4 text-green-500" />;
          case 'text': return <Type className="h-4 w-4 text-gray-500" />;
          case 'choice': return <List className="h-4 w-4 text-purple-500" />;
      }
  };

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <header className="border-b pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestão Institucional</h1>
            <p className="text-gray-500">Administração de Docentes e Avaliações</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'overview' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>Visão Geral</button>
            <button onClick={() => setActiveTab('questionnaire')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'questionnaire' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>Construtor de Questionário</button>
        </div>
      </header>

      {activeTab === 'questionnaire' ? (
        <div className="grid gap-8 lg:grid-cols-12">
            {/* Left: Builder Form */}
            <div className="lg:col-span-5 space-y-6">
                <Card className="sticky top-4">
                    <CardHeader className="bg-slate-900 text-white rounded-t-lg">
                        <CardTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5" /> Adicionar Nova Pergunta
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
                                <Label>PONTOS OBTIDOS (Se SIM)</Label>
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
                        
                        <p className="text-xs text-gray-500 leading-relaxed">
                            <strong>Nota (Full Mark):</strong> Para o tipo 'Sim / Não', o docente ganha a totalidade dos pontos definidos caso a resposta seja SIM, e zero se NÃO.
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Right: Preview List */}
            <div className="lg:col-span-7 space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileQuestion className="h-5 w-5" /> Ficha de Avaliação (Estudantes)
                        </CardTitle>
                        <div className="pt-2">
                            <Label className="text-xs text-gray-500">Título do Questionário (Visível ao Aluno)</Label>
                            <Input 
                                value={questionnaire?.title || ''} 
                                onChange={(e) => handleUpdateTitle(e.target.value)} 
                                className="mt-1"
                                placeholder="Ex: Ficha de Avaliação de Desempenho"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(!questionnaire || questionnaire.questions.length === 0) ? (
                            <div className="text-center py-12 border-2 border-dashed rounded-lg text-gray-400">
                                <List className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                <p>O questionário está vazio.</p>
                                <p className="text-sm">Adicione perguntas usando o formulário ao lado.</p>
                            </div>
                        ) : (
                            questionnaire.questions.map((q, idx) => (
                                <div key={q.id} className="flex items-start gap-3 p-3 bg-white border rounded-lg shadow-sm group hover:border-gray-400 transition-colors">
                                    <div className="mt-1 h-6 w-6 flex items-center justify-center bg-gray-100 rounded text-xs font-mono text-gray-500 shrink-0">
                                        {q.code || idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm text-gray-900">{q.text}</p>
                                        {q.category && (
                                            <p className="text-xs text-gray-500 mt-1">Categoria: {q.category}</p>
                                        )}
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
      ) : (
        // OVERVIEW TAB
        <>
        {/* Pending Approvals */}
        {unapproved.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
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

        <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-8">
                {/* Teacher Management */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5" /> Cadastrar Novo Docente
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddTeacher} className="bg-gray-50 p-4 rounded-lg border space-y-4">
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Nome</Label>
                                    <Input value={newTeacherName} onChange={e => setNewTeacherName(e.target.value)} placeholder="Nome completo" required />
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
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <p className="text-xs text-gray-500">* Dirigentes também podem ser cadastrados como docentes (use o mesmo email).</p>
                                <Button type="submit"><Plus className="mr-2 h-4 w-4" /> Adicionar Docente</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
                
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

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label>Ano Lectivo</Label>
                                    <Input value={newSubYear} onChange={e => setNewSubYear(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nível (Ano)</Label>
                                    <Input value={newSubLevel} onChange={e => setNewSubLevel(e.target.value)} placeholder="1º, 2º..." />
                                </div>
                                <div className="space-y-2">
                                    <Label>Semestre</Label>
                                    <Select value={newSubSemester} onChange={e => setNewSubSemester(e.target.value)}>
                                        <option value="1">1º Semestre</option>
                                        <option value="2">2º Semestre</option>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Categoria Docente (Avaliado)</Label>
                                    <Select value={newSubCategory} onChange={e => setNewSubCategory(e.target.value as TeacherCategory)}>
                                        <option value="assistente">Assistente</option>
                                        <option value="assistente_estagiario">Assistente Estagiário</option>
                                        <option value="pleno">Pleno</option>
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
                                            <span>{sub.course} - {sub.level}º Ano</span>
                                            <span>{teacher?.name || 'Desconhecido'} ({sub.teacherCategory === 'assistente_estagiario' ? 'AE' : 'A'})</span>
                                        </div>
                                    </div>
                                );
                             })}
                        </div>
                    </CardContent>
                </Card>

                {/* Qualitative Eval */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Avaliação Qualitativa (8%)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {teachers.map(t => {
                            const isExpanded = expandedTeacher === t.id;
                            const ev = qualEvals[t.id] || { deadlines: 0, quality: 0 };
                            return (
                                <div key={t.id} className="border rounded-lg bg-white shadow-sm overflow-hidden">
                                    <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50" onClick={() => setExpandedTeacher(isExpanded ? null : t.id)}>
                                        <span className="font-medium text-sm">{t.name}</span>
                                        {isExpanded ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
                                    </div>
                                    {isExpanded && (
                                        <div className="p-4 bg-gray-50 border-t space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Prazos (0-10)</Label>
                                                    <Input type="number" min="0" max="10" value={ev.deadlines} onChange={(e) => handleEvalChange(t.id, 'deadlines', e.target.value)} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Qualidade (0-10)</Label>
                                                    <Input type="number" min="0" max="10" value={ev.quality} onChange={(e) => handleEvalChange(t.id, 'quality', e.target.value)} />
                                                </div>
                                            </div>
                                            <Button size="sm" onClick={() => handleEvalSubmit(t.id)}>Salvar</Button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>
            </div>

            <div className="lg:col-span-4 space-y-6">
                <Card className="bg-slate-900 text-white border-slate-800 shadow-xl sticky top-4">
                    <CardHeader><CardTitle className="text-white flex items-center gap-2"><Calculator className="h-5 w-5" /> Fecho do Semestre</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-sm text-slate-300 mb-4">Calcula a pontuação acumulada (Student Points + Self Eval + Qualitative).</p>
                        <div className="space-y-3">
                            <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 font-bold" onClick={handleCalculate} disabled={calculating}>
                                {calculating ? 'Processando...' : 'Calcular Scores'}
                            </Button>
                            
                            <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" size="sm" className="w-full text-slate-900 hover:bg-slate-100 border-white/20" onClick={handleExportCSV}>
                                    <Download className="mr-2 h-4 w-4" /> CSV
                                </Button>
                                <Button variant="outline" size="sm" className="w-full text-slate-900 hover:bg-slate-100 border-white/20" onClick={handleExportPDF}>
                                    <FileText className="mr-2 h-4 w-4" /> PDF
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
        </>
      )}
    </div>
  );
};
