
import React, { useState, useEffect, useMemo } from 'react';
import { BackendService } from '../services/backend';
// import { AIService } from '../services/ai'; // Removed AI Service
import { User, UserRole, Subject, Questionnaire, QuestionType, TeacherCategory, CombinedScore, Question, Institution, SelfEvaluation } from '../types';
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
  const [allSelfEvals, setAllSelfEvals] = useState<Record<string, SelfEvaluation>>({});
  
  const [qualEvals, setQualEvals] = useState<Record<string, { deadlines: number, quality: number, comments: string }>>({});
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  // States for individual teacher report printing
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

  // Temp state for new subject form
  const [tempSubject, setTempSubject] = useState<NewSubjectItem>({ name: '', code: '', course: '', level: '', classGroup: '', shift: 'Diurno'});

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
        
        const loadedQualEvals: Record<string, { deadlines: number, quality: number, comments: string }> = {};
        const loadedSelfEvals: Record<string, SelfEvaluation> = {};
        
        for (const t of potentialTeachers) {
            const qualEv = await BackendService.getQualitativeEval(t.id);
            loadedQualEvals[t.id] = {
                deadlines: qualEv?.deadlineCompliance || 0,
                quality: qualEv?.workQuality || 0,
                comments: qualEv?.comments || ''
            };
            const selfEv = await BackendService.getSelfEval(t.id);
            if(selfEv) loadedSelfEvals[t.id] = selfEv;
        }
        setQualEvals(loadedQualEvals);
        setAllSelfEvals(loadedSelfEvals);

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

  const handleAddTempSubject = () => {
      if (!tempSubject.name.trim() || !tempSubject.course.trim()) {
          alert("Preencha pelo menos o Nome e o Curso da disciplina.");
          return;
      }
      setNewTeacherSubjects([...newTeacherSubjects, tempSubject]);
      setTempSubject({ name: '', code: '', course: '', level: '', classGroup: '', shift: 'Diurno' }); // Reset form
  };
  
  const handleRemoveTempSubject = (index: number) => {
      setNewTeacherSubjects(newTeacherSubjects.filter((_, i) => i !== index));
  };


  const handleAddTeacher = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!newTeacherName.trim() || !newTeacherEmail.trim() || !newTeacherPwd.trim()) {
          alert("Por favor, preencha Nome, Email e Senha do docente.");
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
  
  const handlePrintSummaryReport = () => {
      setPrintingTeacher(null); // Garantir que o relatório individual não seja impresso
      setTimeout(() => window.print(), 100);
  };

  const handlePrintTeacherReport = (teacher: User) => {
      const score = allScores.find(s => s.teacherId === teacher.id);
      const selfEval = allSelfEvals[teacher.id];

      if (!score) {
        alert("Este docente ainda não tem uma pontuação final calculada para gerar o relatório.");
        return;
      }
      
      setPrintingTeacher(teacher);
      setPrintingScore(score);
      setPrintingSelfEval(selfEval || null);

      setTimeout(() => {
        window.print();
      }, 100);
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

  // Funções de cálculo para o relatório individual
  const MAX_SCORE_FOR_CONVERSION = 130; // Ponto máximo teórico
  const calculateClassification20 = (finalScore: number) => (finalScore / MAX_SCORE_FOR_CONVERSION) * 20;
  const calculatePercentage = (finalScore: number) => (finalScore / MAX_SCORE_FOR_CONVERSION) * 100;
  const getAppreciation = (classification20: number) => {
      if (classification20 >= 18) return 'Excelente';
      if (classification20 >= 14) return 'Bom';
      if (classification20 >= 10) return 'Suficiente';
      return 'Insuficiente';
  };

  return (
    <>
      {/* --- INÍCIO DO CONTEÚDO PARA IMPRESSÃO --- */}
      <div className="hidden print:block font-serif">
        {printingTeacher && printingScore ? (
            // --- NOVO RELATÓRIO INDIVIDUAL (FOLHA DE CLASSIFICAÇÃO) ---
            <div className="p-4 text-sm">
                <header className="flex justify-between items-start mb-6">
                    <div className="text-center">
                        {institution?.logo && <img src={institution.logo} className="h-20 w-20 object-contain mx-auto" alt="Logo"/>}
                        <h1 className="font-bold">{institution?.name}</h1>
                        <p>Auditoria de Moçambique</p>
                    </div>
                    <div className="border-2 border-black p-2 w-64 text-center h-24">
                        <p className="font-bold">Despacho de homologação</p>
                        <p className="mt-4">O Director Geral</p>
                        <p className="mt-8">Data: ___/___/_____</p>
                    </div>
                </header>

                <div className="text-center font-bold my-6">
                    <p>Divisão Pedagógica</p>
                    <h2 className="text-base">FOLHA DE CLASSIFICAÇÃO ANUAL DE DOCENTES E INVESTIGADORES</h2>
                </div>
                
                <div className="space-y-1 mb-6">
                    <p><strong>Unidade orgânica (UO):</strong> Divisão Pedagógica</p>
                    <p><strong>Departamento:</strong> Graduação</p>
                </div>

                <div className="space-y-1 mb-6">
                    <p><strong>1. Dados pessoais</strong></p>
                    <p><strong>2. Nome completo:</strong> {printingTeacher.name}</p>
                    <p><strong>3. Categoria:</strong> {printingTeacher.category === 'assistente_estagiario' ? 'Assistente Estagiário' : 'Assistente'}</p>
                    <p><strong>4. Função de direcção ou de chefia:</strong> {printingSelfEval?.header.function || 'Docente'}</p>
                    <p><strong>5. Regime laboral (tempo inteiro/tempo parcial):</strong> {printingSelfEval?.header.contractRegime || 'Tempo Inteiro'}</p>
                    <p><strong>6. Período a que se refere a avaliação:</strong> de 01/01/{new Date().getFullYear()} a 31/12/{new Date().getFullYear()}</p>
                </div>
                
                <div className="mb-6">
                    <p className="font-bold mb-2">7. Tabela de indicadores do desempenho</p>
                    <table className="w-full border-collapse border-2 border-black">
                        <thead>
                            <tr className="font-bold bg-gray-100">
                                <td className="border border-black p-1">Grupos de indicadores (por ficha)</td>
                                <td className="border border-black p-1 text-center">Pontos obtidos</td>
                                <td className="border border-black p-1 text-center">%</td>
                                <td className="border border-black p-1 text-center">Pontos bonificados</td>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-black p-1">Auto-avaliação (1)</td>
                                <td className="border border-black p-1 text-center">{printingScore.selfEvalScore.toFixed(1)}</td>
                                <td className="border border-black p-1"></td>
                                <td className="border border-black p-1"></td>
                            </tr>
                             <tr>
                                <td className="border border-black p-1">Avaliação do docente pelo estudante (2) a)</td>
                                <td className="border border-black p-1 text-center">{printingScore.studentScore.toFixed(1)}</td>
                                <td className="border border-black p-1"></td>
                                <td className="border border-black p-1"></td>
                            </tr>
                             <tr>
                                <td className="border border-black p-1">Avaliação qualitativa (3)</td>
                                <td className="border border-black p-1 text-center">{printingScore.institutionalScore.toFixed(1)}</td>
                                <td className="border border-black p-1"></td>
                                <td className="border border-black p-1"></td>
                            </tr>
                            <tr className="font-bold bg-gray-100">
                                <td className="border border-black p-1">Total de pontos (1+2+3)</td>
                                <td className="border border-black p-1 text-center">{printingScore.finalScore.toFixed(1)}</td>
                                <td className="border border-black p-1 text-center">{calculatePercentage(printingScore.finalScore).toFixed(1)}%</td>
                                <td className="border border-black p-1"></td>
                            </tr>
                        </tbody>
                    </table>
                    <p className="text-xs mt-1">a) Para os Investigadores científicos é dispensável.</p>
                </div>

                <div className="space-y-1 mb-6">
                    <p className="font-bold">8. Classificação obtida:</p>
                    <p>a) Pontuação total final obtida: <span className="font-bold">{printingScore.finalScore.toFixed(1)}</span> pontos;</p>
                    <p>b) Classificação final: <span className="font-bold">{calculateClassification20(printingScore.finalScore).toFixed(2)}</span> valores;</p>
                    <p>c) Percentagem: <span className="font-bold">{calculatePercentage(printingScore.finalScore).toFixed(1)}%</span>;</p>
                    <p>d) Apreciação final obtida: <span className="font-bold">{getAppreciation(calculateClassification20(printingScore.finalScore))}</span>;</p>
                    <p>e) Pontuação bonificada total obtida: 0 pontos.</p>
                </div>
                
                <div className="mb-12">
                    <p className="font-bold">9. Distinções, louvores, bónus ou prémios obtidos na última avaliação do desempenho:</p>
                    <p>- Nada Consta.</p>
                    <div className="border-b border-black mt-2 w-full"></div>
                </div>

                <div className="flex justify-around items-center text-center mt-16">
                    <div>
                        <p>Tomei conhecimento</p>
                        <p className="font-bold mt-2">O Docente Avaliado</p>
                        <p className="mt-12">Data: ___/___/_____</p>
                    </div>
                     <div>
                        <p>O Avaliador</p>
                        <p className="font-bold mt-2">O Director da Divisão Pedagógica</p>
                        <p className="mt-12">Data: ___/___/_____</p>
                    </div>
                </div>

                <footer className="mt-16 pt-4 text-center text-xs">
                    <p className="font-bold">{institution?.name}</p>
                    <p>Rua John Issa, n° 93, Tel: +258 21328657, Fax: +258 21328657, Cel.: +258 823053873</p>
                    <p>www.iscam.ac.mz; E-mail: info@gmail.com; O FUTURO COM EXCELÊNCIA</p>
                </footer>
            </div>
        ) : (
            // --- RELATÓRIO DE RESUMO (ANTIGO) ---
            <div className="p-6">
                <header className="text-center mb-10">
                    <div className="flex justify-center items-center gap-4 mb-4">
                        {institution?.logo && <img src={institution.logo} className="h-20 w-20 object-contain" alt="Logo"/>}
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">{institution?.name}</h1>
                            <p className="text-lg text-gray-600">Relatório de Desempenho Global de Docentes</p>
                        </div>
                    </div>
                    <p className="text-sm text-gray-500">Data de Emissão: {new Date().toLocaleDateString()}</p>
                </header>

                <section className="mb-8 p-4 border rounded-lg bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-700 mb-3 text-center">Resumo Geral do Período</h2>
                    <div className="flex justify-around items-center text-center">
                        <div><p className="text-2xl font-bold text-gray-800">{teachers.length}</p><p className="text-sm text-gray-600">Total de Docentes</p></div>
                        <div className="border-l h-12 border-gray-200"></div>
                        <div><p className="text-2xl font-bold text-gray-800">{allScores.length}</p><p className="text-sm text-gray-600">Avaliações Processadas</p></div>
                        <div className="border-l h-12 border-gray-200"></div>
                        <div><p className="text-2xl font-bold text-gray-800">{avgScore}</p><p className="text-sm text-gray-600">Média Institucional</p></div>
                    </div>
                </section>
                
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Resultados Detalhados por Docente</h2>
                    <table className="w-full text-sm border-collapse border border-gray-300">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-3 border border-gray-300 font-semibold text-left">Docente</th>
                                <th className="p-3 border border-gray-300 font-semibold text-center">Av. Alunos</th>
                                <th className="p-3 border border-gray-300 font-semibold text-center">Auto-Av.</th>
                                <th className="p-3 border border-gray-300 font-semibold text-center">Av. Institucional</th>
                                <th className="p-3 border border-gray-300 font-semibold text-center">Nota Final</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allScores.sort((a,b) => b.finalScore - a.finalScore).map((score, index) => (
                                <tr key={score.teacherId} className={`break-inside-avoid ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                    <td className="p-2 border border-gray-300 text-left">{teachers.find(t => t.id === score.teacherId)?.name || 'N/A'}</td>
                                    <td className="p-2 border border-gray-300 text-center">{score.studentScore.toFixed(2)}</td>
                                    <td className="p-2 border border-gray-300 text-center">{score.selfEvalScore.toFixed(2)}</td>
                                    <td className="p-2 border border-gray-300 text-center">{score.institutionalScore.toFixed(2)}</td>
                                    <td className="p-2 border border-gray-300 text-center font-bold text-gray-800">{score.finalScore.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
                <footer className="mt-16 pt-4 border-t border-gray-300 text-center text-xs text-gray-500"><p className="font-semibold">{institution?.name}</p><p>Relatório gerado pelo Sistema AvaliaDocente MZ</p></footer>
            </div>
        )}
      </div>
      {/* --- FIM DO CONTEÚDO PARA IMPRESSÃO --- */}

      <div className="print:hidden space-y-8 p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
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

        <header className="border-b pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
              {institution?.logo && (
                  <div className="h-16 w-16 bg-white border rounded-lg p-1 flex items-center justify-center shadow-sm">
                      <img src={institution.logo} className="h-full w-full object-contain" alt="Logo da Instituição" />
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

        {activeTab === 'overview' && ( <div className="space-y-6 animate-in fade-in"><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><Card><CardHeader><CardTitle className="text-base font-medium text-gray-500">Total de Docentes</CardTitle></CardHeader><CardContent><div className="text-4xl font-bold">{teachers.length}</div></CardContent></Card><Card><CardHeader><CardTitle className="text-base font-medium text-gray-500">Total de Alunos</CardTitle></CardHeader><CardContent><div className="text-4xl font-bold">{students.length}</div></CardContent></Card><Card><CardHeader><CardTitle className="text-base font-medium text-gray-500">Média Geral (Final)</CardTitle></CardHeader><CardContent><div className="text-4xl font-bold">{avgScore}</div></CardContent></Card></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><Card><CardHeader><CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-yellow-500"/> Ações Pendentes</CardTitle></CardHeader><CardContent>{unapproved.length > 0 ? (<div className="space-y-2">{unapproved.map(t => <div key={t.id} className="flex justify-between items-center p-2 bg-yellow-50 rounded-md"><span>{t.name}</span><Button size="sm">Aprovar</Button></div>)}</div>) : <p className="text-gray-500">Nenhuma ação pendente.</p>}</CardContent></Card><Card className="bg-slate-800 text-white"><CardHeader><CardTitle>Fecho do Semestre</CardTitle></CardHeader><CardContent><p className="text-sm text-slate-300 mb-4">Clique para processar todas as avaliações (Alunos, Auto-avaliação, Gestão) e gerar os relatórios finais.</p><Button onClick={handleCalculateScores} disabled={calculating} className="w-full bg-white text-slate-900 hover:bg-slate-200">{calculating ? 'Calculando...' : <><Calculator className="mr-2 h-4 w-4"/> Calcular Notas Finais</>}</Button></CardContent></Card></div></div>)}
        {activeTab === 'teachers' && ( <div className="grid gap-8 lg:grid-cols-12"><div className="lg:col-span-5 space-y-6"><Card className="border-indigo-100 shadow-md"><CardHeader className="bg-indigo-50/50 pb-4"><CardTitle className="flex items-center gap-2 text-indigo-900"><UserPlus className="h-5 w-5" /> Cadastrar Novo Docente</CardTitle></CardHeader><CardContent className="pt-4"><form onSubmit={handleAddTeacher} className="space-y-5"><div className="space-y-4"><div className="flex gap-4"><div className="flex-1 space-y-2"><Label>Nome Completo</Label><Input value={newTeacherName} onChange={e => setNewTeacherName(e.target.value)} required /></div><div className="w-16 space-y-2"><Label>Foto</Label><div className="relative h-10 w-full"><input type="file" accept="image/*" onChange={(e) => handleAvatarUpload(e, setNewTeacherAvatar)} className="absolute inset-0 opacity-0 cursor-pointer z-10" /><div className="h-full w-full border rounded flex items-center justify-center bg-white">{newTeacherAvatar ? <img src={newTeacherAvatar} className="h-full w-full object-cover rounded" alt="Avatar"/> : <ImageIcon className="h-4 w-4 text-gray-400" />}</div></div></div></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Email</Label><Input type="email" value={newTeacherEmail} onChange={e => setNewTeacherEmail(e.target.value)} required /></div><div className="space-y-2"><Label>Senha</Label><Input type="text" value={newTeacherPwd} onChange={e => setNewTeacherPwd(e.target.value)} required /></div></div><div className="space-y-2"><Label>Categoria</Label><Select value={newTeacherCategory} onChange={(e) => setNewTeacherCategory(e.target.value as TeacherCategory)}><option value="assistente">Assistente (Pleno)</option><option value="assistente_estagiario">Assistente Estagiário</option></Select></div></div><div className="space-y-4 border-t pt-4 mt-4"><h3 className="text-sm font-medium text-gray-600">Disciplinas a Lecionar</h3>{newTeacherSubjects.length > 0 && (<div className="space-y-2">{newTeacherSubjects.map((s, i) => (<div key={i} className="flex items-center justify-between text-xs bg-gray-100 p-2 rounded"><span className="font-medium">{s.name}</span><button type="button" onClick={() => handleRemoveTempSubject(i)}><Trash2 className="h-3 w-3 text-red-500"/></button></div>))}</div>)}<div className="p-3 bg-gray-50 rounded-lg border space-y-3"><div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label className="text-xs">Nome da Disciplina</Label><Input value={tempSubject.name} onChange={e => setTempSubject({...tempSubject, name: e.target.value})} /></div><div className="space-y-1"><Label className="text-xs">Código</Label><Input value={tempSubject.code} onChange={e => setTempSubject({...tempSubject, code: e.target.value})} /></div></div><div className="space-y-1"><Label className="text-xs">Curso</Label><Select value={tempSubject.course} onChange={e => setTempSubject({...tempSubject, course: e.target.value})}><option value="">Selecione...</option>{uniqueCourses.map(c=><option key={c} value={c}>{c}</option>)}</Select></div><div className="grid grid-cols-3 gap-2"><div className="space-y-1"><Label className="text-xs">Ano</Label><Input value={tempSubject.level} onChange={e => setTempSubject({...tempSubject, level: e.target.value})} /></div><div className="space-y-1"><Label className="text-xs">Turma</Label><Input value={tempSubject.classGroup} onChange={e => setTempSubject({...tempSubject, classGroup: e.target.value})} /></div><div className="space-y-1"><Label className="text-xs">Turno</Label><Select value={tempSubject.shift} onChange={e => setTempSubject({...tempSubject, shift: e.target.value as any})}><option value="Diurno">Diurno</option><option value="Noturno">Noturno</option></Select></div></div><Button type="button" variant="secondary" size="sm" className="w-full" onClick={handleAddTempSubject}><Plus className="h-4 w-4 mr-2" />Adicionar Disciplina à Lista</Button></div></div><Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"><Check className="mr-2 h-4 w-4" /> Confirmar Cadastro</Button></form></CardContent></Card></div><div className="lg:col-span-7 space-y-6"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Corpo Docente ({teachers.length})</CardTitle></CardHeader><CardContent className="space-y-2">{teachers.map(t => ( <div key={t.id} className="border rounded-lg bg-white shadow-sm flex items-center justify-between p-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">{t.avatar ? <img src={t.avatar} className="h-full w-full object-cover" alt="Avatar"/> : <Users className="h-5 w-5 m-2.5 text-gray-400" />}</div><div className="flex flex-col"><div className="font-medium text-sm">{t.name}</div><span className="text-xs text-gray-400">{t.email}</span></div></div><div className="flex items-center gap-2"><Button size="sm" variant="ghost" onClick={() => startEditUser(t)} className="text-gray-500"><Edit className="h-4 w-4" /></Button><Button size="sm" variant="ghost" onClick={() => handlePrintTeacherReport(t)} className="text-gray-500" title="Gerar Folha de Classificação"><FileText className="h-4 w-4" /></Button></div></div>))} </CardContent></Card></div></div>)}
        {activeTab === 'students' && ( <div className="grid gap-8 lg:grid-cols-12 animate-in fade-in"><div className="lg:col-span-4 space-y-6"><Card><CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Cadastrar Aluno</CardTitle></CardHeader><CardContent><form onSubmit={handleAddStudent} className="bg-gray-50 p-4 rounded-lg border space-y-4"><div className="space-y-2"><Label>Nome</Label><Input value={newStudentName} onChange={e => setNewStudentName(e.target.value)} required /></div><div className="space-y-2"><Label>Email</Label><Input type="email" value={newStudentEmail} onChange={e => setNewStudentEmail(e.target.value)} required /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Curso</Label><Select value={newStudentCourse} onChange={e => setNewStudentCourse(e.target.value)} disabled={uniqueCourses.length === 0}><option value="">Curso...</option>{uniqueCourses.map(c => <option key={c} value={c}>{c}</option>)}</Select></div><div className="space-y-2"><Label>Ano/Nível</Label><Input value={newStudentLevel} onChange={e => setNewStudentLevel(e.target.value)} /></div></div><div className="space-y-2"><Label>Senha</Label><Input type="text" value={newStudentPwd} onChange={e => setNewStudentPwd(e.target.value)} required /></div><Button type="submit" className="w-full"><Plus className="mr-2 h-4 w-4" /> Adicionar Estudante</Button></form></CardContent></Card></div><div className="lg:col-span-8"><Card><CardHeader><CardTitle className="flex items-center gap-2">Lista de Estudantes ({students.length})</CardTitle></CardHeader><CardContent><div className="space-y-6">{Object.entries(groupedStudents).map(([course, levels]) => (<div key={course} className="border rounded-md overflow-hidden"><div className="bg-gray-100 px-4 py-2 font-semibold text-gray-800 border-b">{course}</div><div className="divide-y">{Object.entries(levels).map(([level, users]) => (<div key={level}><div className="bg-gray-50 px-4 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider border-b">{level}</div><div>{users.map(std => (<div key={std.id} className="p-4 bg-white hover:bg-gray-50 flex justify-between items-center border-b last:border-0"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">{std.avatar ? <img src={std.avatar} className="h-full w-full object-cover" alt="Avatar"/> : <Users className="h-4 w-4 m-2 text-gray-400" />}</div><div><p className="font-medium text-gray-900">{std.name}</p><p className="text-sm text-gray-500">{std.email}</p></div></div><Button size="sm" variant="ghost" onClick={() => startEditUser(std)} className="text-gray-500"><Edit className="h-4 w-4" /></Button></div>))}</div></div>))}</div></div>))}</div></CardContent></Card></div></div>)}
        {activeTab === 'questionnaire' && ( <div className="animate-in fade-in space-y-6"><div className="grid gap-8 lg:grid-cols-12"><div className="lg:col-span-5 space-y-6"><Card><CardHeader className="pb-3"><CardTitle className="text-sm">Público Alvo do Questionário</CardTitle></CardHeader><CardContent><Select value={targetRole} onChange={(e) => setTargetRole(e.target.value as 'student' | 'teacher')}><option value="student">🎓 Alunos (Avaliar Docentes)</option><option value="teacher">👨‍🏫 Docentes (Institucional)</option></Select></CardContent></Card><Card><CardHeader className="bg-slate-900 text-white rounded-t-lg"><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Adicionar Pergunta</CardTitle></CardHeader><CardContent className="space-y-4 pt-6"><div className="space-y-2"><Label>Texto</Label><Input value={newQText} onChange={(e) => setNewQText(e.target.value)} /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Tipo</Label><Select value={newQType} onChange={(e) => setNewQType(e.target.value as QuestionType)}><option value="binary">Sim / Não</option><option value="stars">Estrelas (1-5)</option><option value="scale_10">Escala (0-10)</option><option value="text">Texto</option><option value="choice">Múltipla Escolha</option></Select></div><div className="space-y-2"><Label>Pontos (Se SIM)</Label><Input type="number" min="0" value={newQWeight} onChange={(e) => setNewQWeight(Number(e.target.value))} disabled={newQType === 'text' || newQType === 'choice'} /></div></div><Button onClick={handleAddQuestion} className="w-full bg-slate-900">Adicionar Pergunta</Button></CardContent></Card></div><div className="lg:col-span-7 space-y-6"><Card className="h-full flex flex-col bg-gray-50/50"><CardHeader className="bg-white border-b border-gray-200"><div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2 text-gray-800"><Eye className="h-5 w-5 text-indigo-600" /> Pré-visualização do Formulário</CardTitle></div><Input value={questionnaire?.title || ''} onChange={(e) => handleUpdateTitle(e.target.value)} className="mt-4 font-bold text-lg" placeholder="Título do Formulário" /></CardHeader><CardContent className="flex-1 overflow-y-auto p-6 space-y-4">{(!questionnaire || questionnaire.questions.length === 0) ? (<div className="flex flex-col items-center justify-center h-64 text-gray-400"><FileQuestion className="h-12 w-12 mb-3 opacity-20" /><p className="font-medium">O formulário está vazio.</p></div>) : (questionnaire.questions.map((q, idx) => (<div key={q.id} className="relative group bg-white p-5 rounded-lg border border-gray-200 shadow-sm"><div className="absolute right-3 top-3"><button onClick={() => handleRemoveQuestion(q.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div><div className="mb-3 pr-8"><p className="font-medium text-gray-900 text-base">#{idx + 1}. {q.text}</p></div><div className="pl-4 opacity-70 pointer-events-none">{renderPreviewInput(q)}</div></div>)))}</CardContent></Card></div></div></div>)} 
        {activeTab === 'qualitative' && ( <div className="animate-in fade-in"><Card><CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Avaliação Qualitativa Institucional</CardTitle><p className="text-sm text-gray-500 pt-1">Atribua uma nota de 0 a 10 para cada indicador. Esta avaliação representa 8% da nota final do docente.</p></CardHeader><CardContent className="space-y-2">{teachers.map(t => ( <div key={t.id} className="border rounded-lg overflow-hidden"><button onClick={() => setExpandedTeacher(prev => prev === t.id ? null : t.id)} className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">{t.avatar ? <img src={t.avatar} className="h-full w-full object-cover" alt="Avatar"/> : <Users className="h-5 w-5 m-2.5 text-gray-400" />}</div><div className="text-left"><p className="font-medium">{t.name}</p><p className="text-sm text-gray-500">{t.email}</p></div></div><div className="flex items-center gap-2 text-gray-500">{expandedTeacher === t.id ? <ChevronUp/> : <ChevronDown/>}</div></button>{expandedTeacher === t.id && ( <div className="p-4 bg-gray-50/70 border-t space-y-4 animate-in fade-in duration-300"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><Label>Cumprimento de Prazos (0-10)</Label><Input type="number" min="0" max="10" value={qualEvals[t.id]?.deadlines || 0} onChange={e => handleEvalChange(t.id, 'deadlines', e.target.value)} /></div><div className="space-y-2"><Label>Qualidade de Trabalho (0-10)</Label><Input type="number" min="0" max="10" value={qualEvals[t.id]?.quality || 0} onChange={e => handleEvalChange(t.id, 'quality', e.target.value)} /></div></div><div className="space-y-2"><Label>Comentários / Observações</Label><textarea value={qualEvals[t.id]?.comments || ''} onChange={e => handleEvalChange(t.id, 'comments', e.target.value)} className="w-full min-h-[80px] p-2 border rounded" placeholder="Adicione notas sobre o desempenho..." /></div><Button onClick={() => handleEvalSubmit(t.id)}><Save className="mr-2 h-4 w-4"/> Salvar Avaliação</Button></div>)}</div>))} </CardContent></Card></div>)}
        {activeTab === 'stats' && ( <div className="space-y-6 animate-in fade-in"><Card><CardHeader className="flex flex-row justify-between items-center"><CardTitle className="flex items-center gap-2"><BarChartHorizontal className="h-5 w-5" /> Relatório de Desempenho Global</CardTitle><div className="flex gap-2"><Button variant="outline" onClick={handleExportCSV}><Download className="mr-2 h-4 w-4" /> Exportar CSV</Button><Button variant="outline" onClick={handlePrintSummaryReport}><Printer className="mr-2 h-4 w-4" /> Exportar Resumo PDF</Button></div></CardHeader><CardContent><div className="h-[400px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="finalScore" fill="#1f2937" name="Nota Final" /></BarChart></ResponsiveContainer></div></CardContent></Card></div>)}
        {activeTab === 'settings' && institution && ( <div className="animate-in fade-in"><Card className="max-w-2xl mx-auto"><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Configurações da Instituição</CardTitle></CardHeader><CardContent><form onSubmit={handleUpdateInstitution} className="space-y-4"><div className="space-y-2"><Label>Nome da Instituição</Label><Input value={institution.name} onChange={e => setInstitution({...institution, name: e.target.value})}/></div><div className="space-y-2"><Label>Logotipo</Label><div className="flex items-center gap-4"><div className="h-16 w-16 border rounded bg-white p-1 flex items-center justify-center">{institution.logo ? <img src={institution.logo} className="object-contain h-full w-full" alt="Logo"/> : <ImageIcon className="h-6 w-6 text-gray-300"/>}</div><Input type="file" accept="image/*" onChange={handleInstLogoUpload} /></div></div><Button type="submit"><Save className="mr-2 h-4 w-4"/> Salvar Alterações</Button></form></CardContent></Card></div>)}
      </div>
    </>
  );
};
