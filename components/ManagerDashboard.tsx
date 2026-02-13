
import React, { useState, useEffect, useMemo } from 'react';
import { BackendService, PDF_STANDARD_QUESTIONS, TEACHER_STANDARD_QUESTIONS } from '../services/backend';
// import { AIService } from '../services/ai'; // Removed AI Service
import { User, UserRole, Subject, Questionnaire, QuestionType, TeacherCategory, CombinedScore, Question, Institution, SelfEvaluation, Course } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, cn } from './ui';
import { Users, Check, BookOpen, Calculator, AlertCircle, Plus, Trash2, FileQuestion, ChevronDown, ChevronUp, UserPlus, Star, List, Type, BarChartHorizontal, Key, GraduationCap, PieChart as PieIcon, Download, Printer, Image as ImageIcon, Sparkles, RefreshCw, ScanText, Eye, Settings, Building2, Save, FileText, X, TrendingUp, ClipboardList, CheckCircle2, Lock, Shield, Edit, Table2, Award, Scale } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'teachers' | 'students' | 'qualitative' | 'questionnaire' | 'stats' | 'settings'>('overview');
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [unapproved, setUnapproved] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
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

  // New Course State
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseDuration, setNewCourseDuration] = useState('4');
  const [newCourseSemester, setNewCourseSemester] = useState('1'); // Novo
  const [newCourseModality, setNewCourseModality] = useState<'Presencial' | 'Online'>('Presencial'); // Novo

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
  
  // New: Multiple courses for teacher
  const [newTeacherCourses, setNewTeacherCourses] = useState<string[]>([]);
  const [selectedCourseToAdd, setSelectedCourseToAdd] = useState('');

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
  
  // Novos Estados para Aluno (Semestre e Modalidade)
  const [newStudentSemester, setNewStudentSemester] = useState('1');
  const [newStudentModality, setNewStudentModality] = useState<'Presencial' | 'Online' | 'Híbrido'>('Presencial');

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

        const instCourses = await BackendService.getInstitutionCourses(institutionId);
        setCourses(instCourses);

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

  const handleAddCourse = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newCourseName || !newCourseCode) return;
      
      try {
          const result = await BackendService.addCourse(
              institutionId, 
              newCourseName, 
              newCourseCode, 
              parseInt(newCourseDuration),
              newCourseSemester,
              newCourseModality
          );
          
          if (result) {
            setCourses(prev => [...prev, result]);
          }
          
          setNewCourseName('');
          setNewCourseCode('');
          setNewCourseDuration('4');
          setNewCourseSemester('1');
          setNewCourseModality('Presencial');
          alert("Curso adicionado com sucesso!");
      } catch(e: any) {
          alert("Erro ao adicionar curso: " + e.message + "\n\nSe estiver usando Supabase, verifique se a tabela 'courses' foi criada e atualizada no banco de dados.");
      }
  };

  const handleDeleteCourse = async (id: string) => {
      if(confirm("Tem certeza? Isso não apagará os alunos vinculados, mas pode causar inconsistências.")) {
          try {
            await BackendService.deleteCourse(id);
            setCourses(prev => prev.filter(c => c.id !== id)); // Atualização imediata
          } catch(e: any) {
            alert("Erro ao remover curso: " + e.message);
          }
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

  const handleAddTeacherCourse = () => {
      if (selectedCourseToAdd && !newTeacherCourses.includes(selectedCourseToAdd)) {
          setNewTeacherCourses([...newTeacherCourses, selectedCourseToAdd]);
          setSelectedCourseToAdd('');
      }
  };

  const handleRemoveTeacherCourse = (course: string) => {
      setNewTeacherCourses(newTeacherCourses.filter(c => c !== course));
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
              newTeacherCategory,
              newTeacherCourses // Passando a lista de cursos
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
          setNewTeacherCourses([]);
          
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
              classGroups,
              newStudentSemester,
              newStudentModality
          );
          
          setNewStudentName('');
          setNewStudentEmail('');
          setNewStudentPwd('');
          setNewStudentCourse('');
          setNewStudentLevel('');
          setNewStudentAvatar('');
          setNewStudentClassGroups('');
          setNewStudentShifts([]);
          setNewStudentSemester('1');
          setNewStudentModality('Presencial');
          
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

  const handleResetDefaults = async () => {
    if(!confirm("Tem certeza? Isso substituirá as perguntas atuais pelas padrão do sistema.")) return;
    
    // Select defaults based on active role
    const defaults = targetRole === 'student' ? PDF_STANDARD_QUESTIONS : TEACHER_STANDARD_QUESTIONS;
    
    // Create updated questionnaire object
    const updatedQ: Questionnaire = questionnaire 
        ? { ...questionnaire, questions: defaults }
        : {
            id: `def_${targetRole}_${institutionId}`,
            institutionId,
            title: `Questionário ${targetRole === 'student' ? 'Estudante' : 'Docente'}`,
            active: true,
            questions: defaults,
            targetRole: targetRole
          };

    setQuestionnaire(updatedQ);
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

  // --- DATA PREPARATION FOR TABLES ---

  const sortedScores = useMemo(() => {
      return [...allScores].sort((a,b) => b.finalScore - a.finalScore).map(score => {
        const teacher = teachers.find(t => t.id === score.teacherId);
        return {
            ...score,
            teacherName: teacher?.name || 'Desconhecido',
            teacherEmail: teacher?.email
        };
      });
  }, [allScores, teachers]);

  const gradeDistribution = useMemo(() => {
      const dist = {
          excellent: 0, // >= 18
          good: 0,      // 14-17
          sufficient: 0,// 10-13
          insufficient: 0 // < 10
      };

      allScores.forEach(s => {
          const val20 = (s.finalScore / 130) * 20;
          if (val20 >= 18) dist.excellent++;
          else if (val20 >= 14) dist.good++;
          else if (val20 >= 10) dist.sufficient++;
          else dist.insufficient++;
      });
      return dist;
  }, [allScores]);


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
                <main>
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
                </main>
                
                <footer className="mt-24">
                    <div className="flex justify-around items-start text-center">
                        <div className="w-2/5">
                            <p>Tomei conhecimento</p>
                            <p>O Docente Avaliado</p>
                            <div className="border-b border-black mt-12 mb-2"></div>
                            <p>Data: ___ / ___ / 20___</p>
                        </div>
                         <div className="w-2/5">
                            <p>O Avaliador</p>
                            <p>O Director da Divisão Pedagógica</p>
                            <div className="border-b border-black mt-12 mb-2"></div>
                            <p>Data: ___ / ___ / 20___</p>
                        </div>
                    </div>

                    <div className="mt-12 pt-4 text-center text-xs border-t border-black">
                        <p className="font-bold">{institution?.name}</p>
                        <p>Rua John Issa, n° 93, Tel: +258 21328657, Fax: +258 21328657, Cel.: +258 823053873</p>
                        <p>www.iscam.ac.mz; E-mail: info@gmail.com; O FUTURO COM EXCELÊNCIA</p>
                    </div>
                </footer>
            </div>
        ) : (
            // --- RELATÓRIO DE RESUMO EM TABELA (GLOBAL) ---
            <div className="p-8 font-sans">
                <header className="mb-8 border-b-2 border-gray-800 pb-4">
                    <div className="flex justify-between items-end">
                        <div>
                             <h1 className="text-2xl font-bold uppercase tracking-wide text-gray-900">{institution?.name}</h1>
                             <p className="text-sm font-medium text-gray-600 uppercase">Relatório de Desempenho Docente</p>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                            <p>Data de Emissão: {new Date().toLocaleDateString()}</p>
                            <p>Total de Docentes: {teachers.length}</p>
                        </div>
                    </div>
                </header>

                <section className="mb-8">
                     <h2 className="text-sm font-bold uppercase text-gray-800 mb-2 border-l-4 border-gray-800 pl-2">Resumo Estatístico</h2>
                     <table className="w-full text-sm border-collapse border border-gray-300">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="border border-gray-300 p-2 text-left">Indicador</th>
                                <th className="border border-gray-300 p-2 text-center">Valor</th>
                                <th className="border border-gray-300 p-2 text-left">Distribuição de Classificações</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-gray-300 p-2 font-medium">Média Institucional</td>
                                <td className="border border-gray-300 p-2 text-center font-bold">{avgScore}</td>
                                <td className="border border-gray-300 p-2" rowSpan={3}>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>Excelente (≥18): <strong>{gradeDistribution.excellent}</strong></div>
                                        <div>Bom (14-17): <strong>{gradeDistribution.good}</strong></div>
                                        <div>Suficiente (10-13): <strong>{gradeDistribution.sufficient}</strong></div>
                                        <div>Insuficiente (&lt;10): <strong>{gradeDistribution.insufficient}</strong></div>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 p-2 font-medium">Avaliações Processadas</td>
                                <td className="border border-gray-300 p-2 text-center">{allScores.length}</td>
                            </tr>
                        </tbody>
                     </table>
                </section>
                
                <section>
                    <h2 className="text-sm font-bold uppercase text-gray-800 mb-2 border-l-4 border-gray-800 pl-2">Detalhamento de Notas</h2>
                    <table className="w-full text-sm border-collapse border border-gray-300">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-2 border border-gray-300 text-left w-10">#</th>
                                <th className="p-2 border border-gray-300 text-left">Docente</th>
                                <th className="p-2 border border-gray-300 text-center">Av. Alunos (20)</th>
                                <th className="p-2 border border-gray-300 text-center">Auto-Av. (100)</th>
                                <th className="p-2 border border-gray-300 text-center">Inst. (10)</th>
                                <th className="p-2 border border-gray-300 text-center bg-gray-200">Nota Final</th>
                                <th className="p-2 border border-gray-300 text-center">Classificação (0-20)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedScores.map((score, index) => {
                                const final20 = calculateClassification20(score.finalScore);
                                return (
                                    <tr key={score.teacherId} className="hover:bg-gray-50">
                                        <td className="p-2 border border-gray-300 text-center">{index + 1}</td>
                                        <td className="p-2 border border-gray-300 font-medium">{score.teacherName}</td>
                                        <td className="p-2 border border-gray-300 text-center">{score.studentScore.toFixed(1)}</td>
                                        <td className="p-2 border border-gray-300 text-center">{score.selfEvalScore.toFixed(1)}</td>
                                        <td className="p-2 border border-gray-300 text-center">{score.institutionalScore.toFixed(1)}</td>
                                        <td className="p-2 border border-gray-300 text-center font-bold bg-gray-50">{score.finalScore.toFixed(1)}</td>
                                        <td className="p-2 border border-gray-300 text-center font-bold">
                                            {final20.toFixed(1)} ({getAppreciation(final20)})
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </section>
                <footer className="mt-8 text-center text-xs text-gray-500 border-t pt-2">
                    Sistema AvaliaDocente MZ - Relatório Gerado Automaticamente
                </footer>
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
              <button onClick={() => setActiveTab('courses')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'courses' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>Cursos</button>
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
        
        {/* ABA DE CURSOS */}
        {activeTab === 'courses' && (
            <div className="grid gap-8 lg:grid-cols-12 animate-in fade-in">
                <div className="lg:col-span-5 space-y-6">
                    <Card className="border-amber-100 shadow-md">
                        <CardHeader className="bg-amber-50/50 pb-4">
                            <CardTitle className="flex items-center gap-2 text-amber-900"><Award className="h-5 w-5" /> Cadastrar Curso</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <form onSubmit={handleAddCourse} className="space-y-5">
                                <div className="space-y-2">
                                    <Label>Nome do Curso</Label>
                                    <Input placeholder="Ex: Engenharia Informática" value={newCourseName} onChange={e => setNewCourseName(e.target.value)} required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Sigla / Código</Label>
                                        <Input placeholder="Ex: LEI" value={newCourseCode} onChange={e => setNewCourseCode(e.target.value)} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Duração (Anos)</Label>
                                        <Input type="number" min="1" max="7" value={newCourseDuration} onChange={e => setNewCourseDuration(e.target.value)} required />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Semestre Atual</Label>
                                        <Select value={newCourseSemester} onChange={e => setNewCourseSemester(e.target.value)}>
                                            <option value="1">1º Semestre</option>
                                            <option value="2">2º Semestre</option>
                                            <option value="Anual">Anual</option>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Modalidade</Label>
                                        <Select value={newCourseModality} onChange={e => setNewCourseModality(e.target.value as any)}>
                                            <option value="Presencial">Presencial</option>
                                            <option value="Online">Online</option>
                                        </Select>
                                    </div>
                                </div>
                                <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white">Adicionar Curso</Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-7">
                    <Card>
                        <CardHeader><CardTitle>Cursos da Instituição ({courses.length})</CardTitle></CardHeader>
                        <CardContent>
                            {courses.length === 0 ? <p className="text-gray-500 italic">Nenhum curso cadastrado.</p> : (
                                <div className="space-y-2">
                                    {courses.filter(c => c).map(c => (
                                        <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                                            <div>
                                                <p className="font-medium text-gray-900">{c.name}</p>
                                                <p className="text-xs text-gray-500">
                                                    {c.code} • {c.duration} Anos • {c.semester}º Sem. • {c.modality || 'Presencial'}
                                                </p>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => handleDeleteCourse(c.id)} className="text-red-500"><Trash2 size={16} /></Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        )}

        {activeTab === 'teachers' && ( <div className="grid gap-8 lg:grid-cols-12"><div className="lg:col-span-5 space-y-6"><Card className="border-indigo-100 shadow-md"><CardHeader className="bg-indigo-50/50 pb-4"><CardTitle className="flex items-center gap-2 text-indigo-900"><UserPlus className="h-5 w-5" /> Cadastrar Novo Docente</CardTitle></CardHeader><CardContent className="pt-4"><form onSubmit={handleAddTeacher} className="space-y-5"><div className="space-y-4"><div className="flex gap-4"><div className="flex-1 space-y-2"><Label>Nome Completo</Label><Input value={newTeacherName} onChange={e => setNewTeacherName(e.target.value)} required /></div><div className="w-16 space-y-2"><Label>Foto</Label><div className="relative h-10 w-full"><input type="file" accept="image/*" onChange={(e) => handleAvatarUpload(e, setNewTeacherAvatar)} className="absolute inset-0 opacity-0 cursor-pointer z-10" /><div className="h-full w-full border rounded flex items-center justify-center bg-white">{newTeacherAvatar ? <img src={newTeacherAvatar} className="h-full w-full object-cover rounded" alt="Avatar"/> : <ImageIcon className="h-4 w-4 text-gray-400" />}</div></div></div></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Email</Label><Input type="email" value={newTeacherEmail} onChange={e => setNewTeacherEmail(e.target.value)} required /></div><div className="space-y-2"><Label>Senha</Label><Input type="text" value={newTeacherPwd} onChange={e => setNewTeacherPwd(e.target.value)} required /></div></div><div className="space-y-2"><Label>Categoria</Label><Select value={newTeacherCategory} onChange={(e) => setNewTeacherCategory(e.target.value as TeacherCategory)}><option value="assistente">Assistente (Pleno)</option><option value="assistente_estagiario">Assistente Estagiário</option></Select></div>
        
        {/* Nova seção: Múltiplos Cursos */}
        <div className="space-y-2 border-t pt-2 mt-2">
            <Label>Vincular a Cursos/Departamentos</Label>
            <div className="flex gap-2">
                <Select value={selectedCourseToAdd} onChange={(e) => setSelectedCourseToAdd(e.target.value)}>
                    <option value="">Selecione um curso...</option>
                    {courses.filter(c => c).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </Select>
                <Button type="button" onClick={handleAddTeacherCourse} variant="secondary">Adicionar</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
                {newTeacherCourses.map(course => (
                    <div key={course} className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        {course}
                        <button type="button" onClick={() => handleRemoveTeacherCourse(course)} className="hover:text-indigo-900"><X size={12} /></button>
                    </div>
                ))}
            </div>
        </div>

        </div><div className="space-y-4 border-t pt-4 mt-4"><h3 className="text-sm font-medium text-gray-600">Disciplinas a Lecionar</h3>{newTeacherSubjects.length > 0 && (<div className="space-y-2">{newTeacherSubjects.map((s, i) => (<div key={i} className="flex items-center justify-between text-xs bg-gray-100 p-2 rounded"><span className="font-medium">{s.name}</span><button type="button" onClick={() => handleRemoveTempSubject(i)}><Trash2 className="h-3 w-3 text-red-500"/></button></div>))}</div>)}<div className="p-3 bg-gray-50 rounded-lg border space-y-3"><div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label className="text-xs">Nome da Disciplina</Label><Input value={tempSubject.name} onChange={e => setTempSubject({...tempSubject, name: e.target.value})} /></div><div className="space-y-1"><Label className="text-xs">Código</Label><Input value={tempSubject.code} onChange={e => setTempSubject({...tempSubject, code: e.target.value})} /></div></div><div className="space-y-1"><Label className="text-xs">Curso</Label><Select value={tempSubject.course} onChange={e => setTempSubject({...tempSubject, course: e.target.value})}><option value="">Selecione...</option>{courses.filter(c => c).map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</Select></div><div className="grid grid-cols-3 gap-2"><div className="space-y-1"><Label className="text-xs">Ano</Label><Input value={tempSubject.level} onChange={e => setTempSubject({...tempSubject, level: e.target.value})} /></div><div className="space-y-1"><Label className="text-xs">Turma</Label><Input value={tempSubject.classGroup} onChange={e => setTempSubject({...tempSubject, classGroup: e.target.value})} /></div><div className="space-y-1"><Label className="text-xs">Turno</Label><Select value={tempSubject.shift} onChange={e => setTempSubject({...tempSubject, shift: e.target.value as any})}><option value="Diurno">Diurno</option><option value="Noturno">Noturno</option></Select></div></div><Button type="button" variant="secondary" size="sm" className="w-full" onClick={handleAddTempSubject}><Plus className="h-4 w-4 mr-2" />Adicionar Disciplina à Lista</Button></div></div><Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"><Check className="mr-2 h-4 w-4" /> Confirmar Cadastro</Button></form></CardContent></Card></div><div className="lg:col-span-7 space-y-6"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Corpo Docente ({teachers.length})</CardTitle></CardHeader><CardContent className="space-y-2">{teachers.map(t => ( <div key={t.id} className="border rounded-lg bg-white shadow-sm flex items-center justify-between p-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">{t.avatar ? <img src={t.avatar} className="h-full w-full object-cover" alt="Avatar"/> : <Users className="h-5 w-5 m-2.5 text-gray-400" />}</div><div className="flex flex-col"><div className="font-medium text-sm">{t.name}</div><span className="text-xs text-gray-400">{t.email}</span>
        {/* Exibir cursos associados */}
        {t.courses && t.courses.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
                {t.courses.map(c => <span key={c} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{c}</span>)}
            </div>
        )}
        </div></div><div className="flex items-center gap-2"><Button size="sm" variant="ghost" onClick={() => startEditUser(t)} className="text-gray-500"><Edit className="h-4 w-4" /></Button><Button size="sm" variant="ghost" onClick={() => handlePrintTeacherReport(t)} className="text-gray-500" title="Gerar Folha de Classificação"><FileText className="h-4 w-4" /></Button></div></div>))} </CardContent></Card></div></div>)}
        {activeTab === 'questionnaire' && ( <div className="animate-in fade-in space-y-6"><div className="grid gap-8 lg:grid-cols-12"><div className="lg:col-span-5 space-y-6"><Card><CardHeader className="pb-3"><CardTitle className="text-sm">Público Alvo do Questionário</CardTitle></CardHeader><CardContent><Select value={targetRole} onChange={(e) => setTargetRole(e.target.value as 'student' | 'teacher')}><option value="student">🎓 Alunos (Avaliar Docentes)</option><option value="teacher">👨‍🏫 Docentes (Institucional)</option></Select></CardContent></Card><Card><CardHeader className="bg-slate-900 text-white rounded-t-lg"><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Adicionar Pergunta</CardTitle></CardHeader><CardContent className="space-y-4 pt-6"><div className="space-y-2"><Label>Texto</Label><Input value={newQText} onChange={(e) => setNewQText(e.target.value)} /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Tipo</Label><Select value={newQType} onChange={(e) => setNewQType(e.target.value as QuestionType)}><option value="binary">Sim / Não</option><option value="stars">Estrelas (1-5)</option><option value="scale_10">Escala (0-10)</option><option value="text">Texto</option><option value="choice">Múltipla Escolha</option></Select></div><div className="space-y-2"><Label>Pontos (Se SIM)</Label><Input type="number" min="0" value={newQWeight} onChange={(e) => setNewQWeight(Number(e.target.value))} disabled={newQType === 'text' || newQType === 'choice'} /></div></div><Button onClick={handleAddQuestion} className="w-full bg-slate-900">Adicionar Pergunta</Button></CardContent></Card></div><div className="lg:col-span-7 space-y-6"><Card className="h-full flex flex-col bg-gray-50/50"><CardHeader className="bg-white border-b border-gray-200"><div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2 text-gray-800"><Eye className="h-5 w-5 text-indigo-600" /> Pré-visualização do Formulário</CardTitle><Button variant="outline" size="sm" onClick={handleResetDefaults} title="Restaurar perguntas originais"><RefreshCw className="h-4 w-4 mr-2" /> Restaurar Padrão</Button></div><Input value={questionnaire?.title || ''} onChange={(e) => handleUpdateTitle(e.target.value)} className="mt-4 font-bold text-lg" placeholder="Título do Formulário" /></CardHeader><CardContent className="flex-1 overflow-y-auto p-6 space-y-4">{(!questionnaire || questionnaire.questions.length === 0) ? (<div className="flex flex-col items-center justify-center h-64 text-gray-400"><FileQuestion className="h-12 w-12 mb-3 opacity-20" /><p className="font-medium">O formulário está vazio.</p></div>) : (questionnaire.questions.map((q, idx) => (<div key={q.id} className="relative group bg-white p-5 rounded-lg border border-gray-200 shadow-sm"><div className="absolute right-3 top-3"><button onClick={() => handleRemoveQuestion(q.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div><div className="mb-3 pr-8"><p className="font-medium text-gray-900 text-base">#{idx + 1}. {q.text}</p></div><div className="pl-4 opacity-70 pointer-events-none flex items-center justify-between"><div>{renderPreviewInput(q)}</div>{q.type === 'binary' && <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200">Vale {q.weight} pts (Sim)</span>}</div></div>)))}</CardContent></Card></div></div></div>)} 
        {activeTab === 'qualitative' && ( <div className="animate-in fade-in grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2 space-y-6"><Card><CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Avaliação Qualitativa Institucional</CardTitle><p className="text-sm text-gray-500 pt-1">Atribua uma nota de 0 a 10 para cada indicador. Esta avaliação representa 8% da nota final do docente.</p></CardHeader><CardContent className="space-y-2">{teachers.map(t => ( <div key={t.id} className="border rounded-lg overflow-hidden"><button onClick={() => setExpandedTeacher(prev => prev === t.id ? null : t.id)} className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">{t.avatar ? <img src={t.avatar} className="h-full w-full object-cover" alt="Avatar"/> : <Users className="h-5 w-5 m-2.5 text-gray-400" />}</div><div className="text-left"><p className="font-medium">{t.name}</p><p className="text-sm text-gray-500">{t.email}</p></div></div><div className="flex items-center gap-2 text-gray-500">{expandedTeacher === t.id ? <ChevronUp/> : <ChevronDown/>}</div></button>{expandedTeacher === t.id && ( <div className="p-4 bg-gray-50/70 border-t space-y-4 animate-in fade-in duration-300"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><Label>Cumprimento de tarefas e prazos (0-10)</Label><Input type="number" min="0" max="10" value={qualEvals[t.id]?.deadlines || 0} onChange={e => handleEvalChange(t.id, 'deadlines', e.target.value)} /></div><div className="space-y-2"><Label>Qualidade do trabalho realizado (0-10)</Label><Input type="number" min="0" max="10" value={qualEvals[t.id]?.quality || 0} onChange={e => handleEvalChange(t.id, 'quality', e.target.value)} /></div></div><div className="space-y-2"><Label>Comentários / Observações</Label><textarea value={qualEvals[t.id]?.comments || ''} onChange={e => handleEvalChange(t.id, 'comments', e.target.value)} className="w-full min-h-[80px] p-2 border rounded" placeholder="Adicione notas sobre o desempenho..." /></div><Button onClick={() => handleEvalSubmit(t.id)}><Save className="mr-2 h-4 w-4"/> Salvar Avaliação</Button></div>)}</div>))} </CardContent></Card></div><div className="lg:col-span-1"><Card className="h-fit sticky top-4"><CardHeader className="bg-slate-50 pb-3 border-b"><CardTitle className="text-sm flex items-center gap-2 text-slate-800"><Scale className="h-4 w-4" /> Guião de Pontuação (Rubrica)</CardTitle></CardHeader><CardContent className="p-0"><table className="w-full text-xs text-left"><thead className="bg-slate-100 font-bold text-slate-600"><tr><th className="p-2 border-b">Classif.</th><th className="p-2 border-b">Pontos</th><th className="p-2 border-b">Critério</th></tr></thead><tbody className="divide-y text-slate-700"><tr className="bg-green-50"><td className="p-2 font-bold text-green-800">Excelente</td><td className="p-2 font-bold">10.0</td><td className="p-2">Qualidade excepcional ou prazos superados (antecipação).</td></tr><tr><td className="p-2 font-bold text-blue-800">Muito Bom</td><td className="p-2 font-bold">7.5</td><td className="p-2">Trabalho exemplar e com rapidez/oportunidade.</td></tr><tr><td className="p-2 font-bold text-yellow-800">Bom</td><td className="p-2 font-bold">5.0</td><td className="p-2">Dentro do padrão e dos prazos estabelecidos.</td></tr><tr className="bg-red-50"><td className="p-2 font-bold text-red-800">Mau</td><td className="p-2 font-bold">2.5</td><td className="p-2">Insuficiente, atrasos frequentes ou erros.</td></tr></tbody></table><div className="p-3 text-xs text-gray-400 italic bg-gray-50 border-t">Baseado na Ficha de Indicadores de Avaliação Qualitativa</div></CardContent></Card></div></div>)}
        {activeTab === 'stats' && (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Relatório de Desempenho Global</h2>
                        <p className="text-slate-500 text-sm">Visão consolidada do corpo docente</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-slate-600 border-slate-300">
                            <Download className="mr-2 h-4 w-4" /> CSV
                        </Button>
                        <Button variant="outline" size="sm" onClick={handlePrintSummaryReport} className="text-slate-600 border-slate-300">
                            <Printer className="mr-2 h-4 w-4" /> PDF
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Resumo em Tabela Minimalista */}
                    <Card className="lg:col-span-1 border-none shadow-md overflow-hidden bg-white">
                        <CardHeader className="border-b border-gray-100 pb-2 bg-gray-50">
                            <CardTitle className="text-sm uppercase tracking-wider text-gray-500 font-bold">Resumo Estatístico</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <table className="w-full text-sm">
                                <tbody className="divide-y divide-gray-100">
                                    <tr><td className="p-4 text-gray-500">Total de Avaliações</td><td className="p-4 text-right font-bold">{allScores.length}</td></tr>
                                    <tr><td className="p-4 text-gray-500">Média Institucional</td><td className="p-4 text-right font-bold text-blue-600">{avgScore}</td></tr>
                                    <tr className="bg-gray-50/50"><td colSpan={2} className="p-2 text-xs font-bold text-center uppercase tracking-widest text-gray-400">Distribuição</td></tr>
                                    <tr><td className="p-3 pl-6 text-green-700 font-medium">Excelente (≥18)</td><td className="p-3 text-right font-bold">{gradeDistribution.excellent}</td></tr>
                                    <tr><td className="p-3 pl-6 text-blue-700 font-medium">Bom (14-17)</td><td className="p-3 text-right font-bold">{gradeDistribution.good}</td></tr>
                                    <tr><td className="p-3 pl-6 text-yellow-700 font-medium">Suficiente (10-13)</td><td className="p-3 text-right font-bold">{gradeDistribution.sufficient}</td></tr>
                                    <tr><td className="p-3 pl-6 text-red-700 font-medium">Insuficiente (&lt;10)</td><td className="p-3 text-right font-bold">{gradeDistribution.insufficient}</td></tr>
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>

                    {/* Ranking em Tabela Minimalista */}
                    <Card className="lg:col-span-2 border-none shadow-md bg-white">
                        <CardHeader className="border-b border-gray-100 pb-2 bg-gray-50">
                            <CardTitle className="text-sm uppercase tracking-wider text-gray-500 font-bold flex items-center gap-2"><Table2 size={16}/> Ranking de Desempenho (Top 15)</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <th className="p-3 w-10">#</th>
                                        <th className="p-3">Docente</th>
                                        <th className="p-3 text-center">Final</th>
                                        <th className="p-3 text-center">Situação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                    {sortedScores.slice(0, 15).map((score, index) => {
                                        const final20 = calculateClassification20(score.finalScore);
                                        return (
                                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-3 font-medium text-gray-400">{index + 1}</td>
                                                <td className="p-3 font-medium text-gray-900">{score.teacherName}</td>
                                                <td className="p-3 text-center font-bold text-gray-800">{score.finalScore.toFixed(1)}</td>
                                                <td className="p-3 text-center">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded text-xs font-bold uppercase",
                                                        final20 >= 14 ? "bg-green-100 text-green-800" :
                                                        final20 >= 10 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
                                                    )}>
                                                        {getAppreciation(final20)}
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {sortedScores.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-500">Sem dados.</td></tr>}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )}
        {activeTab === 'settings' && institution && ( <div className="animate-in fade-in"><Card className="max-w-2xl mx-auto"><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Configurações da Instituição</CardTitle></CardHeader><CardContent><form onSubmit={handleUpdateInstitution} className="space-y-4"><div className="space-y-2"><Label>Nome da Instituição</Label><Input value={institution.name} onChange={e => setInstitution({...institution, name: e.target.value})}/></div><div className="space-y-2"><Label>Logotipo</Label><div className="flex items-center gap-4"><div className="h-16 w-16 border rounded bg-white p-1 flex items-center justify-center">{institution.logo ? <img src={institution.logo} className="object-contain h-full w-full" alt="Logo"/> : <ImageIcon className="h-6 w-6 text-gray-300"/>}</div><Input type="file" accept="image/*" onChange={handleInstLogoUpload} /></div></div><Button type="submit"><Save className="mr-2 h-4 w-4"/> Salvar Alterações</Button></form></CardContent></Card></div>)}
      </div>
    </>
  );
};
