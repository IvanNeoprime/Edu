
import React, { useState, useEffect, useMemo } from 'react';
import { BackendService, PDF_STANDARD_QUESTIONS } from '../services/backend';
import { User, UserRole, Subject, Questionnaire, QuestionType, TeacherCategory, CombinedScore, Question, Institution, SelfEvaluation, Course } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, cn } from './ui';
import { Users, BookOpen, Calculator, Plus, Trash2, FileQuestion, ChevronDown, ChevronUp, Star, BarChartHorizontal, GraduationCap, Download, Printer, Image as ImageIcon, RefreshCw, Settings, Save, X, Edit, Scale, Award } from 'lucide-react';

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
  const [newCourseSemester, setNewCourseSemester] = useState('1'); 
  const [newCourseModality, setNewCourseModality] = useState<'Presencial' | 'Online'>('Presencial');

  // Edit User State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editJobTitle, setEditJobTitle] = useState('');

  // Questionnaire State
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  
  // Form Builder State
  const [newQText, setNewQText] = useState('');
  const [newQType, setNewQType] = useState<QuestionType>('binary'); 
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
    loadQuestionnaire();
  }, [institutionId]);

  useEffect(() => {
    if (activeTab === 'stats' || activeTab === 'overview') {
        BackendService.getAllScores(institutionId).then(setAllScores);
    }
  }, [activeTab, institutionId]);

  const loadQuestionnaire = async () => {
    const q = await BackendService.getInstitutionQuestionnaire(institutionId);
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
        
        const instSubjects = await BackendService.getInstitutionSubjects(institutionId);
        setSubjects(instSubjects);

        const instCourses = await BackendService.getInstitutionCourses(institutionId);
        setCourses(instCourses);
        
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
    setEditJobTitle(user.jobTitle || '');
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser) return;
      try {
          await BackendService.updateUser(editingUser.id, {
              name: editName,
              email: editEmail,
              jobTitle: editJobTitle
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
          alert("Erro ao adicionar curso: " + e.message);
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
      setTempSubject({ name: '', code: '', course: '', level: '', classGroup: '', shift: 'Diurno'}); // Reset form
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
              newTeacherCourses
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
            id: `q_${institutionId}_student`,
            institutionId,
            title: 'Avaliação de Desempenho Docente (Estudantes)',
            active: true,
            questions: updatedQuestions,
            targetRole: 'student'
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

  const handleResetDefaults = async () => {
    if(!confirm("Tem certeza? Isso substituirá as perguntas atuais pelas padrão do sistema.")) return;
    const defaults = PDF_STANDARD_QUESTIONS;
    const updatedQ: Questionnaire = questionnaire 
        ? { ...questionnaire, questions: defaults }
        : {
            id: `def_student_${institutionId}`,
            institutionId,
            title: `Avaliação de Desempenho Docente (Estudantes)`,
            active: true,
            questions: defaults,
            targetRole: 'student'
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
        case 'binary': return <div className="flex gap-4 w-full"><Button variant="outline" disabled className="flex-1 bg-red-50 text-red-800 border-red-200">Não</Button><Button variant="outline" disabled className="flex-1 bg-green-50 text-green-800 border-green-200">Sim</Button></div>;
        case 'scale_10': return <div className="flex gap-1 overflow-x-auto pb-1">{[...Array(11)].map((_, i) => <div key={i} className="h-8 w-8 flex items-center justify-center border rounded text-xs text-gray-400 bg-white shrink-0">{i}</div>)}</div>;
        case 'text': return <div className="h-20 w-full border rounded-md bg-gray-50 text-gray-400 p-2 text-sm italic">Área de resposta de texto...</div>;
        case 'choice': return <div className="space-y-2">{q.options?.map(o => <div key={o} className="flex items-center gap-2 text-gray-500 text-sm"><div className="h-4 w-4 rounded-full border border-gray-300"></div><span>{o}</span></div>)}</div>;
        default: return <Input disabled placeholder="Campo de resposta" />;
    }
  };

  // Calculations for Stats
  const avgScore = allScores.length > 0 ? (allScores.reduce((acc, curr) => acc + curr.finalScore, 0) / allScores.length).toFixed(1) : '0';

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

  const MAX_SCORE_FOR_CONVERSION = 130; 
  const calculateClassification20 = (finalScore: number) => (finalScore / MAX_SCORE_FOR_CONVERSION) * 20;
  const calculatePercentage = (finalScore: number) => (finalScore / MAX_SCORE_FOR_CONVERSION) * 100;
  const getAppreciation = (classification20: number) => {
      if (classification20 >= 18) return 'Excelente';
      if (classification20 >= 14) return 'Bom';
      if (classification20 >= 10) return 'Suficiente';
      return 'Insuficiente';
  };

  const handlePrintReport = (teacher: User) => {
      const score = allScores.find(s => s.teacherId === teacher.id);
      const selfEval = allSelfEvals[teacher.id];

      if (!score) {
        alert("Este docente ainda não tem uma pontuação final calculada.");
        return;
      }
      
      setPrintingTeacher(teacher);
      setPrintingScore(score);
      setPrintingSelfEval(selfEval || null);

      setTimeout(() => {
        window.print();
      }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Modal de Edição de Usuário */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader>
                    <CardTitle>Editar Usuário</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSaveEditUser} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nome Completo</Label>
                            <Input value={editName} onChange={e => setEditName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Email Institucional</Label>
                            <Input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Função/Cargo (Job Title)</Label>
                            <Input value={editJobTitle} onChange={e => setEditJobTitle(e.target.value)} placeholder="Ex: Diretor, Regente, Docente..." />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="ghost" onClick={() => setEditingUser(null)}>Cancelar</Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Salvar Alterações</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
      )}

      {/* --- INÍCIO DO CONTEÚDO PARA IMPRESSÃO --- */}
      <div className="hidden print:block font-serif">
        {printingTeacher && printingScore ? (
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
                        <h2 className="text-base">FOLHA DE CLASSIFICAÇÃO ANUAL DE DOCENTES</h2>
                    </div>
                    
                    <div className="space-y-1 mb-6">
                        <p><strong>Nome:</strong> {printingTeacher.name}</p>
                        <p><strong>Categoria:</strong> {printingTeacher.category}</p>
                        <p><strong>Função:</strong> {printingSelfEval?.header.function || printingTeacher.jobTitle || 'Docente'}</p>
                    </div>
                    
                    <div className="mb-6">
                        <table className="w-full border-collapse border-2 border-black">
                            <thead>
                                <tr className="font-bold bg-gray-100">
                                    <td className="border border-black p-1">Componente</td>
                                    <td className="border border-black p-1 text-center">Pontos</td>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-black p-1">Auto-avaliação</td>
                                    <td className="border border-black p-1 text-center">{printingScore.selfEvalScore.toFixed(1)}</td>
                                </tr>
                                 <tr>
                                    <td className="border border-black p-1">Avaliação Estudante</td>
                                    <td className="border border-black p-1 text-center">{printingScore.studentScore.toFixed(1)}</td>
                                </tr>
                                 <tr>
                                    <td className="border border-black p-1">Avaliação Institucional</td>
                                    <td className="border border-black p-1 text-center">{printingScore.institutionalScore.toFixed(1)}</td>
                                </tr>
                                <tr className="font-bold">
                                    <td className="border border-black p-1">Total</td>
                                    <td className="border border-black p-1 text-center">{printingScore.finalScore.toFixed(1)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>
        ) : null}
      </div>
      {/* --- FIM DO CONTEÚDO PARA IMPRESSÃO --- */}

      <div className="print:hidden max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">{institution?.name || 'Painel de Gestão'}</h1>
            <p className="text-gray-500">Gestão Académica Integrada • Semestre 1 / {new Date().getFullYear()}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setActiveTab('settings')}>
                <Settings size={16}/> Configurações
            </Button>
            <div className="flex bg-white rounded-lg border p-1 shadow-sm">
                <Button variant={activeTab === 'overview' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('overview')} className="gap-2">
                    <BarChartHorizontal size={16} /> Visão Geral
                </Button>
                <Button variant={activeTab === 'courses' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('courses')} className="gap-2">
                    <BookOpen size={16} /> Cursos
                </Button>
                <Button variant={activeTab === 'teachers' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('teachers')} className="gap-2">
                    <Users size={16} /> Docentes
                </Button>
                <Button variant={activeTab === 'students' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('students')} className="gap-2">
                    <GraduationCap size={16} /> Estudantes
                </Button>
                <Button variant={activeTab === 'questionnaire' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('questionnaire')} className="gap-2">
                    <FileQuestion size={16} /> Questionário
                </Button>
            </div>
          </div>
        </header>

        {activeTab === 'overview' && (
             <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-sm">
                    <CardContent className="p-6 flex flex-col items-center text-center">
                        <div className="p-3 bg-blue-100 rounded-full text-blue-600 mb-3"><Users size={24} /></div>
                        <h3 className="text-2xl font-bold">{teachers.length}</h3>
                        <p className="text-sm text-gray-500">Docentes Cadastrados</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="p-6 flex flex-col items-center text-center">
                        <div className="p-3 bg-emerald-100 rounded-full text-emerald-600 mb-3"><GraduationCap size={24} /></div>
                        <h3 className="text-2xl font-bold">{students.length}</h3>
                        <p className="text-sm text-gray-500">Estudantes Ativos</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="p-6 flex flex-col items-center text-center">
                        <div className="p-3 bg-purple-100 rounded-full text-purple-600 mb-3"><BookOpen size={24} /></div>
                        <h3 className="text-2xl font-bold">{subjects.length}</h3>
                        <p className="text-sm text-gray-500">Disciplinas Alocadas</p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 text-white shadow-lg">
                    <CardContent className="p-6 flex flex-col items-center text-center justify-center h-full">
                        <h3 className="text-lg font-bold mb-2">Fecho do Semestre</h3>
                        <Button size="sm" variant="secondary" onClick={handleCalculateScores} disabled={calculating} className="w-full">
                           {calculating ? <RefreshCw className="animate-spin mr-2 h-4 w-4"/> : <Calculator className="mr-2 h-4 w-4"/>} 
                           {calculating ? 'Processando...' : 'Calcular Scores'}
                        </Button>
                        <p className="text-xs text-slate-400 mt-2">Atualiza todas as notas finais.</p>
                    </CardContent>
                </Card>

                {/* --- AVALIAÇÃO QUALITATIVA (NOVO LOCAL) --- */}
                <Card className="md:col-span-2 lg:col-span-4 border-l-4 border-l-orange-500">
                    <CardHeader className="bg-orange-50 border-b border-orange-100">
                        <CardTitle className="text-orange-900 flex items-center gap-2">
                            <Scale className="h-5 w-5"/> Avaliação Qualitativa (Peso: 10 Pontos)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y max-h-[400px] overflow-y-auto">
                            {teachers.length === 0 ? <p className="p-6 text-center text-gray-500">Nenhum docente cadastrado.</p> : teachers.map(t => (
                                <div key={t.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpandedTeacher(expandedTeacher === t.id ? null : t.id)}>
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
                                                {t.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{t.name}</p>
                                                <p className="text-xs text-gray-500">{t.email} • {t.jobTitle || 'Docente'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right text-xs">
                                                <span className={`px-2 py-1 rounded-full ${qualEvals[t.id]?.comments ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {qualEvals[t.id]?.comments ? 'Avaliado' : 'Pendente'}
                                                </span>
                                            </div>
                                            {expandedTeacher === t.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                                        </div>
                                    </div>
                                    
                                    {expandedTeacher === t.id && (
                                        <div className="mt-4 pt-4 border-t bg-gray-50 p-4 rounded-md animate-in slide-in-from-top-2">
                                            <div className="grid md:grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <Label>Cumprimento de Prazos (0-10)</Label>
                                                    <Input 
                                                        type="number" 
                                                        min="0" max="10" 
                                                        value={qualEvals[t.id]?.deadlines || 0} 
                                                        onChange={e => handleEvalChange(t.id, 'deadlines', e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Qualidade Pedagógica (0-10)</Label>
                                                    <Input 
                                                        type="number" 
                                                        min="0" max="10" 
                                                        value={qualEvals[t.id]?.quality || 0} 
                                                        onChange={e => handleEvalChange(t.id, 'quality', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="mb-4">
                                                <Label>Observações da Gestão</Label>
                                                <Input 
                                                    value={qualEvals[t.id]?.comments || ''} 
                                                    onChange={e => handleEvalChange(t.id, 'comments', e.target.value)}
                                                    placeholder="Feedback para o docente..."
                                                />
                                            </div>
                                            <Button size="sm" onClick={() => handleEvalSubmit(t.id)} className="w-full">
                                                <Save className="h-4 w-4 mr-2" /> Salvar Avaliação
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
             </div>
        )}

        {/* --- ABA COURSES --- */}
        {activeTab === 'courses' && (
            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cursos da Instituição</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {courses.length === 0 ? (
                                    <p className="text-gray-500 italic">Nenhum curso cadastrado.</p>
                                ) : (
                                    courses.map(c => (
                                        <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg bg-white shadow-sm">
                                            <div>
                                                <h4 className="font-semibold">{c.name} ({c.code})</h4>
                                                <p className="text-xs text-gray-500">
                                                    {c.duration} Anos • {c.semester}º Semestre • {c.modality}
                                                </p>
                                            </div>
                                            <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDeleteCourse(c.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Adicionar Curso</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddCourse} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Nome do Curso</Label>
                                    <Input value={newCourseName} onChange={e => setNewCourseName(e.target.value)} placeholder="Ex: Engenharia Informática" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Código (Sigla)</Label>
                                    <Input value={newCourseCode} onChange={e => setNewCourseCode(e.target.value)} placeholder="Ex: LEI" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-2">
                                        <Label>Duração (Anos)</Label>
                                        <Input type="number" value={newCourseDuration} onChange={e => setNewCourseDuration(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Semestre Atual</Label>
                                        <Select value={newCourseSemester} onChange={e => setNewCourseSemester(e.target.value)}>
                                            <option value="1">1º Semestre</option>
                                            <option value="2">2º Semestre</option>
                                            <option value="Anual">Anual</option>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Modalidade</Label>
                                    <Select value={newCourseModality} onChange={e => setNewCourseModality(e.target.value as any)}>
                                        <option value="Presencial">Presencial</option>
                                        <option value="Online">Online</option>
                                    </Select>
                                </div>
                                <Button type="submit" className="w-full">Adicionar Curso</Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )}

        {/* --- ABA TEACHERS --- */}
        {activeTab === 'teachers' && (
            <div className="space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Corpo Docente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {teachers.map(t => (
                                <div key={t.id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
                                            {t.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold">{t.name}</h4>
                                            <p className="text-xs text-gray-500">{t.email}</p>
                                            <p className="text-xs text-blue-600 font-medium">{t.jobTitle || 'Docente'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => handlePrintReport(t)}>
                                            <Printer className="h-4 w-4" />
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => startEditUser(t)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader>
                        <CardTitle className="text-blue-900">Cadastrar Novo Docente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddTeacher} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nome Completo</Label>
                                    <Input value={newTeacherName} onChange={e => setNewTeacherName(e.target.value)} placeholder="Ex: Prof. Dr. João" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email Institucional</Label>
                                    <Input type="email" value={newTeacherEmail} onChange={e => setNewTeacherEmail(e.target.value)} placeholder="email@uni.ac.mz" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Senha Inicial</Label>
                                    <Input value={newTeacherPwd} onChange={e => setNewTeacherPwd(e.target.value)} placeholder="Defina uma senha provisória" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Categoria</Label>
                                    <Select value={newTeacherCategory} onChange={e => setNewTeacherCategory(e.target.value as any)}>
                                        <option value="assistente">Assistente</option>
                                        <option value="assistente_estagiario">Assistente Estagiário</option>
                                    </Select>
                                </div>
                            </div>
                            
                            {/* Course Selection */}
                            <div className="bg-gray-50 p-4 rounded-md border">
                                <h4 className="text-sm font-semibold mb-2">Cursos Vinculados</h4>
                                <div className="flex gap-2 mb-2">
                                    <Select value={selectedCourseToAdd} onChange={e => setSelectedCourseToAdd(e.target.value)}>
                                        <option value="">Selecione um curso...</option>
                                        {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </Select>
                                    <Button type="button" onClick={handleAddTeacherCourse} disabled={!selectedCourseToAdd}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {newTeacherCourses.map(c => (
                                        <span key={c} className="bg-white border px-2 py-1 rounded text-xs flex items-center gap-1">
                                            {c} <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveTeacherCourse(c)}/>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Subject Builder */}
                            <div className="bg-gray-50 p-4 rounded-md border">
                                <h4 className="text-sm font-semibold mb-2">Adicionar Disciplinas (Opcional)</h4>
                                <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-2">
                                    <Input placeholder="Nome da Disciplina" className="md:col-span-2" value={tempSubject.name} onChange={e => setTempSubject({...tempSubject, name: e.target.value})} />
                                    <Input placeholder="Curso (Sigla)" value={tempSubject.course} onChange={e => setTempSubject({...tempSubject, course: e.target.value})} />
                                    <Input placeholder="Turma (ex: A)" value={tempSubject.classGroup} onChange={e => setTempSubject({...tempSubject, classGroup: e.target.value})} />
                                    <Select value={tempSubject.shift} onChange={e => setTempSubject({...tempSubject, shift: e.target.value as any})}>
                                        <option value="Diurno">Diurno</option>
                                        <option value="Noturno">Noturno</option>
                                    </Select>
                                    <Button type="button" onClick={handleAddTempSubject}><Plus className="h-4 w-4"/></Button>
                                </div>
                                <div className="space-y-1">
                                    {newTeacherSubjects.map((s, i) => (
                                        <div key={i} className="flex justify-between text-xs bg-white p-2 border rounded">
                                            <span>{s.name} ({s.course}) - Turma {s.classGroup} ({s.shift})</span>
                                            <X className="h-3 w-3 cursor-pointer text-red-500" onClick={() => handleRemoveTempSubject(i)}/>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Button type="submit" className="w-full">Cadastrar Docente</Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        )}

        {/* --- ABA QUESTIONNAIRE --- */}
        {activeTab === 'questionnaire' && (
            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row justify-between items-center">
                            <CardTitle>Perguntas do Questionário</CardTitle>
                            <Button variant="outline" size="sm" onClick={handleResetDefaults} className="text-red-600 hover:bg-red-50 border-red-200">
                                <RefreshCw className="h-3 w-3 mr-2"/> Restaurar Padrão
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {questionnaire?.questions.length === 0 && <p className="text-gray-500 italic">Sem perguntas.</p>}
                                {questionnaire?.questions.map((q, idx) => (
                                    <div key={q.id} className="p-4 border rounded-lg bg-white relative group">
                                        <div className="absolute top-2 right-2 hidden group-hover:block">
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => handleRemoveQuestion(q.id)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <div className="flex gap-3">
                                            <span className="font-mono text-gray-400 text-sm">#{idx + 1}</span>
                                            <div className="flex-1 space-y-2">
                                                <p className="font-medium text-gray-900">{q.text}</p>
                                                <div className="bg-gray-50 p-2 rounded border border-dashed border-gray-300">
                                                    {renderPreviewInput(q)}
                                                </div>
                                                <div className="flex gap-2 text-xs text-gray-400">
                                                    <span className="uppercase bg-gray-100 px-1 rounded">{q.type}</span>
                                                    <span>Peso: {q.weight}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
                
                <div>
                    <Card className="sticky top-24">
                        <CardHeader>
                            <CardTitle>Adicionar Pergunta</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Texto da Pergunta</Label>
                                    <Input value={newQText} onChange={e => setNewQText(e.target.value)} placeholder="Ex: O docente foi pontual?" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tipo de Resposta</Label>
                                    <Select value={newQType} onChange={e => setNewQType(e.target.value as any)}>
                                        <option value="binary">Sim / Não (Binário)</option>
                                        <option value="scale_10">Escala 0 a 10</option>
                                        <option value="stars">Estrelas (1 a 5)</option>
                                        <option value="text">Texto Livre</option>
                                        <option value="choice">Múltipla Escolha</option>
                                    </Select>
                                </div>
                                {newQType !== 'text' && (
                                    <div className="space-y-2">
                                        <Label>Peso na Nota</Label>
                                        <Input type="number" min="0" value={newQWeight} onChange={e => setNewQWeight(parseInt(e.target.value) || 0)} />
                                    </div>
                                )}
                                {newQType === 'choice' && (
                                    <div className="space-y-2">
                                        <Label>Opções (separadas por vírgula)</Label>
                                        <Input value={newQOptions} onChange={e => setNewQOptions(e.target.value)} placeholder="Ex: Ótimo, Bom, Regular, Mau" />
                                    </div>
                                )}
                                <Button onClick={handleAddQuestion} className="w-full">
                                    <Plus className="h-4 w-4 mr-2" /> Adicionar ao Questionário
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )}

        {/* --- ABA STUDENTS --- */}
        {activeTab === 'students' && (
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Estudantes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {students.length === 0 && <p className="text-gray-500 italic">Nenhum estudante cadastrado.</p>}
                            {students.map(s => (
                                <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                                    <div>
                                        <h4 className="font-semibold">{s.name}</h4>
                                        <p className="text-xs text-gray-500">{s.email}</p>
                                        <p className="text-xs text-blue-500">{s.course} • {s.level}º Ano</p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => startEditUser(s)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle>Matricular Novo Estudante</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddStudent} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Nome Completo</Label>
                                <Input value={newStudentName} onChange={e => setNewStudentName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input type="email" value={newStudentEmail} onChange={e => setNewStudentEmail(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Senha Inicial</Label>
                                <Input value={newStudentPwd} onChange={e => setNewStudentPwd(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-2">
                                    <Label>Curso</Label>
                                    <Select value={newStudentCourse} onChange={e => setNewStudentCourse(e.target.value)}>
                                        <option value="">Selecione...</option>
                                        {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Ano/Nível</Label>
                                    <Input value={newStudentLevel} onChange={e => setNewStudentLevel(e.target.value)} placeholder="Ex: 1" />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Turnos (Múltipla Seleção)</Label>
                                <div className="flex gap-2">
                                    {['Diurno', 'Noturno'].map(shift => (
                                        <div 
                                            key={shift}
                                            onClick={() => handleToggleShift(shift)}
                                            className={`px-3 py-1 rounded border cursor-pointer text-sm ${newStudentShifts.includes(shift) ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white hover:bg-gray-50'}`}
                                        >
                                            {shift}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Turmas (Separadas por vírgula)</Label>
                                <Input value={newStudentClassGroups} onChange={e => setNewStudentClassGroups(e.target.value)} placeholder="Ex: A, B" />
                            </div>

                            <Button type="submit" className="w-full">Matricular</Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        )}

        {/* --- ABA SETTINGS --- */}
        {activeTab === 'settings' && (
            <Card>
                <CardHeader>
                    <CardTitle>Configurações da Instituição</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpdateInstitution} className="space-y-4 max-w-md">
                        <div className="space-y-2">
                            <Label>Nome da Instituição</Label>
                            <Input 
                                value={institution?.name || ''} 
                                onChange={e => institution && setInstitution({...institution, name: e.target.value})} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Logotipo da Instituição</Label>
                            <div className="flex items-center gap-4">
                                <div className="h-16 w-16 border rounded bg-gray-50 flex items-center justify-center overflow-hidden">
                                    {institution?.logo ? <img src={institution.logo} className="w-full h-full object-contain" /> : <ImageIcon className="text-gray-300"/>}
                                </div>
                                <Input type="file" accept="image/*" onChange={handleInstLogoUpload} />
                            </div>
                        </div>
                        <Button type="submit">Salvar Alterações</Button>
                    </form>
                </CardContent>
            </Card>
        )}

      </div>
    </div>
  );
};
