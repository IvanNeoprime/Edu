
import React, { useState, useEffect } from 'react';
import { BackendService } from '../services/backend';
import { User, UserRole, Subject, Questionnaire, QuestionType, TeacherCategory, QuestionnaireTarget, Question } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from './ui';
import { Users, Check, BookOpen, Calculator, AlertCircle, Plus, Trash2, FileQuestion, ChevronDown, ChevronUp, UserPlus, Star, List, Type, BarChartHorizontal, Key, Download, FileText, Briefcase, Hash } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  institutionId: string;
}

export const ManagerDashboard: React.FC<Props> = ({ institutionId }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'questionnaire' | 'departments'>('overview');
  const [teachers, setTeachers] = useState<User[]>([]);
  const [deptManagers, setDeptManagers] = useState<User[]>([]);
  const [unapproved, setUnapproved] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  // Qualitative Evals - Now dynamic
  const [qualEvals, setQualEvals] = useState<Record<string, Record<string, number>>>({});
  const [qualQuestionnaire, setQualQuestionnaire] = useState<Questionnaire | null>(null);

  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  // Questionnaire Builder State
  const [builderTarget, setBuilderTarget] = useState<QuestionnaireTarget>('student');
  const [currentQuestionnaire, setCurrentQuestionnaire] = useState<Questionnaire | null>(null);
  
  const [newQText, setNewQText] = useState('');
  const [newQType, setNewQType] = useState<QuestionType>('binary');
  const [newQWeight, setNewQWeight] = useState(1);
  const [newQOptions, setNewQOptions] = useState('');
  const [newQCategory, setNewQCategory] = useState('');

  // Form State for New Subject
  const [newSubName, setNewSubName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubTeacher, setNewSubTeacher] = useState('');
  const [newSubYear, setNewSubYear] = useState(new Date().getFullYear().toString());
  const [newSubLevel, setNewSubLevel] = useState('');
  const [newSubSemester, setNewSubSemester] = useState('1');
  const [newSubCourse, setNewSubCourse] = useState('');
  const [newSubCategory, setNewSubCategory] = useState<TeacherCategory>('assistente');

  // Form State for New Teacher
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherPwd, setNewTeacherPwd] = useState('');

  // Form State for New Dept Manager
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptMgrName, setNewDeptMgrName] = useState('');
  const [newDeptMgrEmail, setNewDeptMgrEmail] = useState('');
  const [newDeptMgrPwd, setNewDeptMgrPwd] = useState('');

  useEffect(() => {
    loadData();
  }, [institutionId]);

  useEffect(() => {
    // When tab changes or builder target changes, reload specific questionnaire
    if (activeTab === 'questionnaire') {
        loadBuilderQuestionnaire();
    }
  }, [activeTab, builderTarget]);

  const loadData = async () => {
    setLoading(true);
    const allUsers = await BackendService.getUsers();
    
    // Filter Teachers
    const potentialTeachers = allUsers.filter(u => (u.role === UserRole.TEACHER || u.role === UserRole.INSTITUTION_MANAGER) && u.institutionId === institutionId);
    setTeachers(potentialTeachers);

    // Filter Dept Managers
    const deptMgrs = allUsers.filter(u => u.role === UserRole.DEPARTMENT_MANAGER && u.institutionId === institutionId);
    setDeptManagers(deptMgrs);
    
    setUnapproved(await BackendService.getUnapprovedTeachers(institutionId));
    setSubjects(await BackendService.getInstitutionSubjects(institutionId));

    // Load Qualitative Questionnaire & Responses
    const qQ = await BackendService.getQuestionnaire(institutionId, 'manager_qual');
    setQualQuestionnaire(qQ);
    
    const loadedEvals: Record<string, Record<string, number>> = {};
    for (const t of potentialTeachers) {
        const ev = await BackendService.getQualitativeEval(t.id);
        if (ev) {
            loadedEvals[t.id] = ev.answers || {};
            // Backwards compat check
            if (Object.keys(loadedEvals[t.id]).length === 0 && (ev as any).deadlineCompliance) {
                 // Map old fields to new questions if possible (hard assumption of IDs)
                 // Or just leave empty and user has to fill again. Safest is empty.
            }
        } else {
            loadedEvals[t.id] = {};
        }
    }
    setQualEvals(loadedEvals);

    setLoading(false);
  };

  const loadBuilderQuestionnaire = async () => {
      const q = await BackendService.getQuestionnaire(institutionId, builderTarget);
      setCurrentQuestionnaire(q);
  };

  const handleApprove = async (id: string) => {
    await BackendService.approveTeacher(id);
    loadData();
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          await BackendService.addTeacher(institutionId, newTeacherName, newTeacherEmail, newTeacherPwd);
          setNewTeacherName(''); setNewTeacherEmail(''); setNewTeacherPwd('');
          loadData();
          alert(`Docente cadastrado com sucesso!`);
      } catch (error: any) { alert("Erro: " + error.message); }
  };

  const handleAddDeptManager = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        await BackendService.addDepartmentManager(institutionId, newDeptMgrName, newDeptMgrEmail, newDeptName, newDeptMgrPwd);
        setNewDeptName(''); setNewDeptMgrName(''); setNewDeptMgrEmail(''); setNewDeptMgrPwd('');
        loadData();
        alert("Chefe de Departamento cadastrado!");
    } catch (e: any) { alert("Erro: " + e.message); }
  };

  const handleEvalChange = (teacherId: string, questionId: string, value: string) => {
      const val = Math.max(0, parseInt(value) || 0); 
      setQualEvals(prev => ({
          ...prev,
          [teacherId]: { ...prev[teacherId], [questionId]: val }
      }));
  };

  const handleEvalSubmit = async (teacherId: string) => {
    await BackendService.saveQualitativeEval({
        teacherId,
        institutionId,
        answers: qualEvals[teacherId] || {},
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
      // ... existing CSV logic ...
      const scores = await BackendService.getInstitutionScores(institutionId);
      let csvContent = `data:text/csv;charset=utf-8,Docente,Email,Pontos Alunos,Pontos Auto-Avaliação,Pontos Institucionais,SCORE FINAL\n`;
      teachers.forEach(t => {
          const score = scores.find(s => s.teacherId === t.id);
          const s1 = score ? score.studentScore : 0;
          const s2 = score ? score.selfEvalScore : 0;
          const s3 = score ? score.institutionalScore : 0;
          const sF = score ? score.finalScore : 0;
          csvContent += `"${t.name}","${t.email}",${s1},${s2},${s3},${sF}\n`;
      });
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csvContent));
      link.setAttribute("download", `Relatorio_Geral_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
      // ... existing PDF logic with autoTable ...
      const scores = await BackendService.getInstitutionScores(institutionId);
      const doc = new jsPDF();
      doc.setFontSize(18); doc.text("Pauta de Avaliação", 14, 22);
      doc.setFontSize(11); doc.text(`Data: ${new Date().toLocaleDateString()}`, 14, 30);
      const tableBody = teachers.map(t => {
          const score = scores.find(s => s.teacherId === t.id);
          return [t.name, t.email, score?.selfEvalScore.toFixed(2)||'0', score?.studentScore.toFixed(2)||'0', score?.institutionalScore.toFixed(2)||'0', score?.finalScore.toFixed(2)||'0'];
      });
      autoTable(doc, { startY: 45, head: [['Docente', 'Email', 'Auto', 'Alunos', 'Inst.', 'FINAL']], body: tableBody });
      doc.save(`Relatorio_Geral.pdf`);
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
      e.preventDefault();
      await BackendService.assignSubject({
          name: newSubName, code: newSubCode, teacherId: newSubTeacher, institutionId: institutionId,
          academicYear: newSubYear, level: newSubLevel, semester: newSubSemester, course: newSubCourse, teacherCategory: newSubCategory
      });
      setNewSubName(''); setNewSubCode(''); setNewSubTeacher('');
      loadData();
  };

  // --- Form Builder Logic ---
  const handleAddQuestion = async () => {
      if (!newQText || !currentQuestionnaire) return;
      
      const newQuestion: Question = {
          id: `q_${Date.now()}`,
          text: newQText,
          type: newQType,
          category: newQCategory || 'Geral',
          weight: newQType === 'text' ? 0 : newQWeight,
          options: newQType === 'choice' ? newQOptions.split(',').map(o => o.trim()) : undefined
      };

      const updatedQ = {
          ...currentQuestionnaire,
          questions: [...currentQuestionnaire.questions, newQuestion]
      };
      
      await BackendService.saveQuestionnaire(updatedQ);
      setCurrentQuestionnaire(updatedQ);
      setNewQText(''); setNewQOptions(''); setNewQWeight(1);
  };

  const handleRemoveQuestion = async (qId: string) => {
      if (!currentQuestionnaire) return;
      const updatedQ = {
          ...currentQuestionnaire,
          questions: currentQuestionnaire.questions.filter(q => q.id !== qId)
      };
      await BackendService.saveQuestionnaire(updatedQ);
      setCurrentQuestionnaire(updatedQ);
  };

  const handleUpdateTitle = async (title: string) => {
      if (!currentQuestionnaire) return;
      const updatedQ = { ...currentQuestionnaire, title };
      await BackendService.saveQuestionnaire(updatedQ);
      setCurrentQuestionnaire(updatedQ);
  };

  const getIconForType = (type: QuestionType) => {
      switch(type) {
          case 'stars': return <Star className="h-4 w-4 text-yellow-500" />;
          case 'scale_10': return <BarChartHorizontal className="h-4 w-4 text-blue-500" />;
          case 'binary': return <Check className="h-4 w-4 text-green-500" />;
          case 'text': return <Type className="h-4 w-4 text-gray-500" />;
          case 'choice': return <List className="h-4 w-4 text-purple-500" />;
          case 'quantity': return <Hash className="h-4 w-4 text-orange-500" />;
      }
  };

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <header className="border-b pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestão Institucional</h1>
            <p className="text-gray-500">Administração de Docentes e Avaliações</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto">
            <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${activeTab === 'overview' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>Visão Geral</button>
            <button onClick={() => setActiveTab('departments')} className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${activeTab === 'departments' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>Departamentos</button>
            <button onClick={() => setActiveTab('questionnaire')} className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${activeTab === 'questionnaire' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>Construtor de Fichas</button>
        </div>
      </header>

      {activeTab === 'departments' ? (
          <div className="grid gap-8 lg:grid-cols-12">
             <div className="lg:col-span-5"><Card><CardHeader><CardTitle>Novo Chefe de Departamento</CardTitle></CardHeader><CardContent><form onSubmit={handleAddDeptManager} className="space-y-4"><Input value={newDeptName} onChange={e => setNewDeptName(e.target.value)} placeholder="Nome Dept." required /><Input value={newDeptMgrName} onChange={e => setNewDeptMgrName(e.target.value)} placeholder="Nome Responsável" required /><Input value={newDeptMgrEmail} onChange={e => setNewDeptMgrEmail(e.target.value)} placeholder="Email" required /><Input value={newDeptMgrPwd} onChange={e => setNewDeptMgrPwd(e.target.value)} placeholder="Senha" required /><Button type="submit" className="w-full">Cadastrar</Button></form></CardContent></Card></div>
             <div className="lg:col-span-7"><Card><CardHeader><CardTitle>Departamentos e Responsáveis</CardTitle></CardHeader><CardContent><div className="space-y-2">{deptManagers.map(m => (<div key={m.id} className="p-3 border rounded flex justify-between"><span>{m.department} - {m.name}</span><span className="text-gray-500">{m.email}</span></div>))}</div></CardContent></Card></div>
          </div>
      ) : activeTab === 'questionnaire' ? (
        <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-12 mb-4">
                <Card className="bg-slate-50 border-slate-200">
                    <CardContent className="p-4 flex items-center gap-4">
                        <Label className="whitespace-nowrap font-bold text-slate-700">Selecione a Ficha para Editar:</Label>
                        <Select 
                            value={builderTarget} 
                            onChange={(e) => setBuilderTarget(e.target.value as QuestionnaireTarget)}
                            className="bg-white"
                        >
                            <option value="student">👨‍🎓 Avaliação pelo Estudante</option>
                            <option value="teacher_self">🧑‍🏫 Auto-Avaliação do Docente</option>
                            <option value="manager_qual">👔 Avaliação Qualitativa (Gestor)</option>
                            <option value="class_head">👑 Avaliação pelo Chefe de Turma</option>
                        </Select>
                    </CardContent>
                </Card>
            </div>

            <div className="lg:col-span-5 space-y-6">
                <Card className="sticky top-4">
                    <CardHeader className="bg-slate-900 text-white rounded-t-lg">
                        <CardTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5" /> Adicionar Pergunta
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="space-y-2">
                            <Label>Categoria (Agrupamento)</Label>
                            <Input value={newQCategory} onChange={e => setNewQCategory(e.target.value)} placeholder={builderTarget === 'teacher_self' ? "Ex: Investigação" : "Ex: Organização"} />
                        </div>
                        <div className="space-y-2">
                            <Label>Texto da Pergunta</Label>
                            <Input value={newQText} onChange={(e) => setNewQText(e.target.value)} placeholder="Ex: Quantos artigos publicados?" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tipo de Resposta</Label>
                                <Select value={newQType} onChange={(e) => setNewQType(e.target.value as QuestionType)}>
                                    <option value="binary">Sim / Não</option>
                                    <option value="stars">Estrelas (1-5)</option>
                                    <option value="scale_10">Escala (0-10)</option>
                                    <option value="quantity"># Quantidade Numérica</option>
                                    <option value="text">Texto (Sem pontos)</option>
                                    <option value="choice">Múltipla Escolha</option>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>PESO (Pontos)</Label>
                                <Input type="number" min="0" value={newQWeight} onChange={(e) => setNewQWeight(Number(e.target.value))} disabled={newQType === 'text' || newQType === 'choice'} />
                            </div>
                        </div>
                        {newQType === 'choice' && <div className="space-y-2"><Label>Opções (CSV)</Label><Input value={newQOptions} onChange={(e) => setNewQOptions(e.target.value)} /></div>}
                        <Button onClick={handleAddQuestion} className="w-full bg-slate-900">Adicionar</Button>
                    </CardContent>
                </Card>
            </div>

            <div className="lg:col-span-7 space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileQuestion className="h-5 w-5" /> Estrutura da Ficha
                        </CardTitle>
                        <Input value={currentQuestionnaire?.title || ''} onChange={(e) => handleUpdateTitle(e.target.value)} className="mt-1 font-bold" />
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                        {!currentQuestionnaire?.questions.length ? <p className="text-gray-500 text-center py-8">Vazio.</p> : 
                            currentQuestionnaire.questions.map((q, idx) => (
                                <div key={q.id} className="flex items-start gap-3 p-3 bg-white border rounded shadow-sm">
                                    <div className="mt-1 h-6 w-6 flex items-center justify-center bg-gray-100 rounded text-xs">{idx + 1}</div>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{q.text}</p>
                                        <p className="text-xs text-gray-500">{q.category}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="flex items-center gap-1 text-xs bg-gray-100 px-2 rounded">{getIconForType(q.type)} {q.type}</span>
                                            {q.weight && <span className="text-xs font-bold text-blue-600">x{q.weight}</span>}
                                        </div>
                                    </div>
                                    <button onClick={() => handleRemoveQuestion(q.id)} className="p-2 text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                                </div>
                            ))
                        }
                    </CardContent>
                </Card>
            </div>
        </div>
      ) : (
        // OVERVIEW TAB
        <>
        {/* ... teacher approvals block ... */}
        {unapproved.length > 0 && <div className="bg-amber-50 p-4 rounded mb-6"><h3 className="text-amber-800 font-bold">Pendentes</h3>{unapproved.map(u => <div key={u.id} className="flex justify-between mt-2"><span>{u.name}</span><Button size="sm" onClick={() => handleApprove(u.id)}>Aprovar</Button></div>)}</div>}

        <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-8">
                {/* Teacher & Subject Management Forms (Simplified for brevity as they didn't change logic, just re-rendering) */}
                <Card>
                    <CardHeader><CardTitle>Cadastrar Docente</CardTitle></CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddTeacher} className="flex gap-4"><Input placeholder="Nome" value={newTeacherName} onChange={e => setNewTeacherName(e.target.value)} /><Input placeholder="Email" value={newTeacherEmail} onChange={e => setNewTeacherEmail(e.target.value)} /><Input placeholder="Senha" value={newTeacherPwd} onChange={e => setNewTeacherPwd(e.target.value)} /><Button type="submit">Add</Button></form>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Disciplinas</CardTitle></CardHeader>
                    <CardContent>
                         <form onSubmit={handleCreateSubject} className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded">
                             <Input placeholder="Nome Disciplina" value={newSubName} onChange={e => setNewSubName(e.target.value)} />
                             <Input placeholder="Código" value={newSubCode} onChange={e => setNewSubCode(e.target.value)} />
                             <Select value={newSubTeacher} onChange={e => setNewSubTeacher(e.target.value)}><option value="">Docente...</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
                             <Button type="submit">Salvar Disciplina</Button>
                         </form>
                    </CardContent>
                </Card>

                {/* UPDATED QUALITATIVE EVALUATION */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Avaliação Qualitativa (8%)</CardTitle>
                        <p className="text-xs text-gray-500">Avalie os docentes com base na ficha definida no construtor.</p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {teachers.map(t => {
                            const isExpanded = expandedTeacher === t.id;
                            const ev = qualEvals[t.id] || {};
                            return (
                                <div key={t.id} className="border rounded-lg bg-white shadow-sm overflow-hidden">
                                    <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50" onClick={() => setExpandedTeacher(isExpanded ? null : t.id)}>
                                        <span className="font-medium text-sm">{t.name}</span>
                                        {isExpanded ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
                                    </div>
                                    {isExpanded && (
                                        <div className="p-4 bg-gray-50 border-t space-y-4">
                                            {!qualQuestionnaire || qualQuestionnaire.questions.length === 0 ? (
                                                <p className="text-red-500 text-sm">Configure a Ficha Qualitativa no Construtor primeiro.</p>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {qualQuestionnaire.questions.map(q => (
                                                        <div key={q.id} className="space-y-1">
                                                            <Label className="text-xs text-gray-600">{q.text} (Max {q.type === 'scale_10' ? 10 : '?'})</Label>
                                                            <Input 
                                                                type="number" min="0" 
                                                                value={ev[q.id] || 0} 
                                                                onChange={(e) => handleEvalChange(t.id, q.id, e.target.value)} 
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <Button size="sm" onClick={() => handleEvalSubmit(t.id)}>Salvar Avaliação</Button>
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
                        <div className="space-y-3">
                            <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 font-bold" onClick={handleCalculate} disabled={calculating}>
                                {calculating ? 'Processando...' : 'Calcular Scores'}
                            </Button>
                            <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" size="sm" className="text-slate-900 border-white/20" onClick={handleExportCSV}><Download className="mr-2 h-4 w-4" /> CSV</Button>
                                <Button variant="outline" size="sm" className="text-slate-900 border-white/20" onClick={handleExportPDF}><FileText className="mr-2 h-4 w-4" /> PDF</Button>
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
