
import React, { useState, useEffect, useMemo } from 'react';
import { BackendService, PDF_STANDARD_QUESTIONS, DEFAULT_SELF_EVAL_TEMPLATE, GroupedComments } from '../services/backend';
import { User, UserRole, Subject, Questionnaire, QuestionType, TeacherCategory, CombinedScore, Question, Institution, SelfEvaluation, Course, SelfEvalTemplate } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, cn } from './ui';
import { Users, BookOpen, Calculator, Plus, Trash2, FileQuestion, ChevronDown, ChevronUp, Star, BarChartHorizontal, GraduationCap, Download, Printer, Image as ImageIcon, RefreshCw, Settings, Save, X, Edit, Scale, Award, FileSpreadsheet, ListChecks, FileText, Layers, AlertTriangle, Menu, Eye, MessageSquare, RotateCcw } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

interface CurricularSubject {
    name: string;
    level: string;
    semester: string;
}

export const ManagerDashboard: React.FC<Props> = ({ institutionId }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'teachers' | 'students' | 'qualitative' | 'evaluations' | 'stats' | 'settings'>('overview');
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [allScores, setAllScores] = useState<CombinedScore[]>([]);
  const [allSelfEvals, setAllSelfEvals] = useState<Record<string, SelfEvaluation>>({});
  
  const [qualEvals, setQualEvals] = useState<Record<string, { deadlines: number, quality: number, comments: string }>>({});
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  // States for individual teacher report printing
  const [printingTeacher, setPrintingTeacher] = useState<User | null>(null);
  const [printingScore, setPrintingScore] = useState<CombinedScore | null>(null);
  const [printingSelfEval, setPrintingSelfEval] = useState<SelfEvaluation | null>(null);
  
  // State for Comments Viewing/Printing
  const [viewingCommentsFor, setViewingCommentsFor] = useState<User | null>(null);
  const [teacherComments, setTeacherComments] = useState<GroupedComments[]>([]);

  // New Course State
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseDuration, setNewCourseDuration] = useState('4');
  const [newCourseSemester, setNewCourseSemester] = useState('1'); 
  const [newCourseModality, setNewCourseModality] = useState<'Presencial' | 'Online'>('Presencial');
  
  // Estado para Disciplinas do Curso (Estrutura Curricular)
  const [courseSubjects, setCourseSubjects] = useState<CurricularSubject[]>([]);
  const [tempCourseSubjectName, setTempCourseSubjectName] = useState('');
  const [tempCourseSubjectLevel, setTempCourseSubjectLevel] = useState('1');
  const [tempCourseSubjectSemester, setTempCourseSubjectSemester] = useState('1');
  
  // Estado para Cálculo de Scores
  const [calcTarget, setCalcTarget] = useState<string>('all');

  // Edit User State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editJobTitle, setEditJobTitle] = useState('');

  // Questionnaire State
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  
  // Self Eval Template State
  const [selfEvalTemplate, setSelfEvalTemplate] = useState<SelfEvalTemplate>(DEFAULT_SELF_EVAL_TEMPLATE);
  const [evalTabMode, setEvalTabMode] = useState<'student' | 'teacher'>('student');
  const [previewMode, setPreviewMode] = useState<'none' | 'student' | 'teacher'>('none');
  const [previewCategory, setPreviewCategory] = useState<TeacherCategory>('assistente');

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
    loadSelfEvalTemplate();
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
  
  const loadSelfEvalTemplate = async () => {
      const t = await BackendService.getInstitutionSelfEvalTemplate(institutionId);
      setSelfEvalTemplate(t);
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

  // ... (Existing helper functions unchanged) ...
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
        const targetId = calcTarget === 'all' ? undefined : calcTarget;
        await BackendService.calculateScores(institutionId, targetId);
        const scores = await BackendService.getAllScores(institutionId);
        setAllScores(scores);
        const msg = targetId ? `Cálculo realizado para o docente selecionado.` : `Cálculo realizado para ${teachers.length} docentes.`;
        alert(msg);
    } catch (e) {
        alert("Erro ao calcular: " + e);
    } finally {
        setCalculating(false);
    }
  };

  const handleUpdateSelfEvalTemplate = async (groupId: string, itemKey: string, field: 'label' | 'description' | 'scoreValue' | 'exclusiveTo', value: any) => {
      const newGroups = selfEvalTemplate.groups.map(g => {
          if (g.id !== groupId) return g;
          return {
              ...g,
              items: g.items.map(i => {
                  if (i.key !== itemKey) return i;
                  return { ...i, [field]: value };
              })
          };
      });
      const newTemplate = { groups: newGroups };
      setSelfEvalTemplate(newTemplate);
  };
  
  const handleAddItemToGroup = (groupId: string) => {
      const newKey = `custom_${Date.now()}`;
      const newGroups = selfEvalTemplate.groups.map(g => {
          if (g.id !== groupId) return g;
          return {
              ...g,
              items: [...g.items, { key: newKey, label: 'Novo Critério', description: 'Descrição', scoreValue: 1 }]
          };
      });
      setSelfEvalTemplate({ groups: newGroups });
  };

  const handleDeleteItemFromGroup = (groupId: string, itemKey: string) => {
      if(!confirm("Tem certeza que deseja remover este critério? Os dados já preenchidos para ele serão perdidos.")) return;
      const newGroups = selfEvalTemplate.groups.map(g => {
          if (g.id !== groupId) return g;
          return {
              ...g,
              items: g.items.filter(i => i.key !== itemKey)
          };
      });
      setSelfEvalTemplate({ groups: newGroups });
  };
  
  const saveSelfEvalChanges = async () => {
      await BackendService.saveInstitutionSelfEvalTemplate(institutionId, selfEvalTemplate);
      alert("Modelo de Auto-Avaliação atualizado com sucesso!");
  };

  const handleResetSelfEvalDefaults = async () => {
      if(!confirm("Isso reverterá todas as alterações para o modelo padrão do sistema. Continuar?")) return;
      setSelfEvalTemplate(DEFAULT_SELF_EVAL_TEMPLATE);
      await BackendService.saveInstitutionSelfEvalTemplate(institutionId, DEFAULT_SELF_EVAL_TEMPLATE);
  };

  const handleViewComments = async (teacher: User) => {
      setViewingCommentsFor(teacher);
      try {
          const comments = await BackendService.getTeacherComments(teacher.id, institutionId);
          setTeacherComments(comments);
      } catch (e) {
          console.error(e);
          setTeacherComments([]);
      }
  };

  // ... (Handlers for Courses, Teachers, Students unchanged) ...
  
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 500 * 1024) return alert("Foto muito grande. Máx 500KB.");
          const reader = new FileReader();
          reader.onload = (ev) => setter(ev.target?.result as string);
          reader.readAsDataURL(file);
      }
  };

  const handleAddCourseSubject = () => {
      if(!tempCourseSubjectName.trim()) return;
      setCourseSubjects([...courseSubjects, { name: tempCourseSubjectName, level: tempCourseSubjectLevel, semester: tempCourseSubjectSemester }]);
      setTempCourseSubjectName('');
  };

  const handleRemoveCourseSubject = (index: number) => { setCourseSubjects(courseSubjects.filter((_, i) => i !== index)); };

  const handleAddCourse = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newCourseName || !newCourseCode) return;
      try {
          const result = await BackendService.addCourse(institutionId, newCourseName, newCourseCode, parseInt(newCourseDuration), newCourseSemester, newCourseModality);
          if (result) {
            setCourses(prev => [...prev, result]);
            if (courseSubjects.length > 0) {
                const year = new Date().getFullYear().toString();
                for (const sub of courseSubjects) {
                    await BackendService.assignSubject({
                        name: sub.name, code: `${newCourseCode}-${sub.level}${sub.semester}`, teacherId: undefined, institutionId: institutionId, academicYear: year, level: sub.level, semester: sub.semester, course: newCourseName, classGroup: 'A', shift: 'Diurno', modality: newCourseModality as any
                    });
                }
                await loadData();
            }
          }
          setNewCourseName(''); setNewCourseCode(''); setNewCourseDuration('4'); setNewCourseSemester('1'); setNewCourseModality('Presencial'); setCourseSubjects([]);
          alert(`Curso "${newCourseName}" criado com ${courseSubjects.length} disciplinas!`);
      } catch(e: any) { alert("Erro ao adicionar curso: " + e.message); }
  };

  const handleDeleteCourse = async (id: string) => {
      if(confirm("Tem certeza?")) {
          try { await BackendService.deleteCourse(id); setCourses(prev => prev.filter(c => c.id !== id)); } catch(e: any) { alert("Erro ao remover curso: " + e.message); }
      }
  };

  const handleAddTempSubject = () => {
      if (!tempSubject.name.trim() || !tempSubject.course.trim()) { alert("Preencha pelo menos o Nome e o Curso da disciplina."); return; }
      setNewTeacherSubjects([...newTeacherSubjects, tempSubject]);
      setTempSubject({ name: '', code: '', course: '', level: '', classGroup: '', shift: 'Diurno'});
  };
  
  const handleRemoveTempSubject = (index: number) => { setNewTeacherSubjects(newTeacherSubjects.filter((_, i) => i !== index)); };
  const handleAddTeacherCourse = () => { if (selectedCourseToAdd && !newTeacherCourses.includes(selectedCourseToAdd)) { setNewTeacherCourses([...newTeacherCourses, selectedCourseToAdd]); setSelectedCourseToAdd(''); } };
  const handleRemoveTeacherCourse = (course: string) => { setNewTeacherCourses(newTeacherCourses.filter(c => c !== course)); };

  const handleAddTeacher = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTeacherName.trim() || !newTeacherEmail.trim() || !newTeacherPwd.trim()) { alert("Por favor, preencha Nome, Email e Senha do docente."); return; }
      try {
          const newUser = await BackendService.addTeacher(institutionId, newTeacherName, newTeacherEmail, newTeacherPwd, newTeacherAvatar, newTeacherCategory, newTeacherCourses);
          if (newTeacherSubjects.length > 0) {
              for (const sub of newTeacherSubjects) {
                  if (sub.name) {
                      await BackendService.assignSubject({ name: sub.name, code: sub.code, teacherId: newUser.id, institutionId: institutionId, academicYear: new Date().getFullYear().toString(), level: sub.level, semester: '1', course: sub.course, classGroup: sub.classGroup, shift: sub.shift, modality: 'Presencial', teacherCategory: newTeacherCategory });
                  }
              }
          }
          setNewTeacherName(''); setNewTeacherEmail(''); setNewTeacherPwd(''); setNewTeacherAvatar(''); setNewTeacherCategory('assistente'); setNewTeacherSubjects([]); setNewTeacherCourses([]);
          await loadData(); alert(`Docente e ${newTeacherSubjects.length} disciplinas cadastrados com sucesso!`);
      } catch (error: any) { alert("Erro ao cadastrar docente: " + error.message); }
  };

  const handleToggleShift = (shift: string) => {
      if (newStudentShifts.includes(shift)) { setNewStudentShifts(newStudentShifts.filter(s => s !== shift)); } else { setNewStudentShifts([...newStudentShifts, shift]); }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newStudentName.trim() || !newStudentEmail.trim() || !newStudentPwd.trim()) { alert("Por favor, preencha Nome, Email e Senha."); return; }
      if (!newStudentCourse) { alert("Por favor, selecione um Curso para o estudante."); return; }
      if (newStudentShifts.length === 0) { alert("Selecione pelo menos um turno."); return; }
      try {
          const classGroups = newStudentClassGroups.split(',').map(s => s.trim()).filter(s => s.length > 0);
          await BackendService.addStudent(institutionId, newStudentName, newStudentEmail, newStudentPwd, newStudentCourse, newStudentLevel, newStudentAvatar, newStudentShifts, classGroups, newStudentSemester, newStudentModality);
          setNewStudentName(''); setNewStudentEmail(''); setNewStudentPwd(''); setNewStudentCourse(''); setNewStudentLevel(''); setNewStudentAvatar(''); setNewStudentClassGroups(''); setNewStudentShifts([]); setNewStudentSemester('1'); setNewStudentModality('Presencial');
          await loadData(); alert(`Estudante cadastrado com sucesso!`);
      } catch (error: any) { alert("Erro ao cadastrar estudante: " + error.message); }
  };

  const handleEvalChange = (teacherId: string, field: 'deadlines' | 'quality' | 'comments', value: string) => {
    const isNumber = field !== 'comments';
    const finalValue = isNumber ? parseFloat(value) || 0 : value;
    setQualEvals(prev => ({ ...prev, [teacherId]: { ...prev[teacherId], [field]: finalValue as any } }));
  };

  const handleEvalSubmit = async (teacherId: string) => {
    const evalData = qualEvals[teacherId];
    await BackendService.saveQualitativeEval({ teacherId, institutionId, deadlineCompliance: evalData.deadlines, workQuality: evalData.quality, comments: evalData.comments, evaluatedAt: new Date().toISOString() });
    setExpandedTeacher(null); alert("Avaliação qualitativa salva com sucesso.");
  };

  const handleAddQuestion = async () => {
      if (!newQText) return;
      const newQuestion: Question = { id: `q_${Date.now()}`, text: newQText, type: newQType, weight: newQType === 'text' ? 0 : newQWeight, options: newQType === 'choice' ? newQOptions.split(',').map(o => o.trim()) : undefined };
      const currentQuestions = questionnaire?.questions || [];
      const updatedQuestions = [...currentQuestions, newQuestion];
      const updatedQ: Questionnaire = questionnaire ? { ...questionnaire, questions: updatedQuestions } : { id: `q_${institutionId}_student`, institutionId, title: 'Avaliação de Desempenho Docente (Estudantes)', active: true, questions: updatedQuestions, targetRole: 'student' };
      setQuestionnaire(updatedQ);
      await BackendService.saveQuestionnaire(updatedQ);
      setNewQText(''); setNewQOptions(''); setNewQWeight(1);
  };

  const handleRemoveQuestion = async (qId: string) => {
      if (!questionnaire) return;
      const updatedQ = { ...questionnaire, questions: questionnaire.questions.filter(q => q.id !== qId) };
      setQuestionnaire(updatedQ); await BackendService.saveQuestionnaire(updatedQ);
  };

  const handleResetDefaults = async () => {
    if(!confirm("Tem certeza? Isso substituirá as perguntas atuais pelas padrão do sistema.")) return;
    const defaults = PDF_STANDARD_QUESTIONS;
    const updatedQ: Questionnaire = questionnaire ? { ...questionnaire, questions: defaults } : { id: `def_student_${institutionId}`, institutionId, title: `Avaliação de Desempenho Docente (Estudantes)`, active: true, questions: defaults, targetRole: 'student' };
    setQuestionnaire(updatedQ); await BackendService.saveQuestionnaire(updatedQ);
  };
  
  const handleUpdateInstitution = async (e: React.FormEvent) => {
    e.preventDefault(); if (!institution) return;
    try { await BackendService.updateInstitution(institution.id, { name: institution.name, logo: institution.logo }); alert("Dados da instituição atualizados com sucesso!"); } catch (e: any) { alert("Erro ao atualizar: " + e.message); }
  };

  const handleInstLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && institution) {
          if (file.size > 500 * 1024) return alert("Logotipo muito grande. O limite é 500KB.");
          const reader = new FileReader();
          reader.onload = (ev) => { setInstitution({ ...institution, logo: ev.target?.result as string }); };
          reader.readAsDataURL(file);
      }
  };

  // ... (Export, Print, Render helper functions unchanged) ...
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
  
  const calculateClassification20 = (finalScore: number) => { if (finalScore > 20) return (finalScore / 175) * 20; return finalScore; };
  const getAppreciation = (classification20: number) => { if (classification20 >= 18) return 'Excelente'; if (classification20 >= 14) return 'Bom'; if (classification20 >= 10) return 'Suficiente'; return 'Insuficiente'; };
  const fullReportData = useMemo(() => {
    return teachers.map(teacher => {
        const score = allScores.find(s => s.teacherId === teacher.id);
        const hasScore = !!score;
        const val20 = hasScore ? calculateClassification20(score.finalScore) : 0;
        return { teacherId: teacher.id, teacherName: teacher.name, teacherEmail: teacher.email, teacherCategory: teacher.category || 'N/A', teacherJob: teacher.jobTitle || 'Docente', hasScore, selfEvalScore: score?.selfEvalScore || 0, studentScore: score?.studentScore || 0, institutionalScore: score?.institutionalScore || 0, finalScore: score?.finalScore || 0, subjectDetails: score?.subjectDetails || [], val20, classification: hasScore ? getAppreciation(val20) : 'Pendente' };
    }).sort((a, b) => b.finalScore - a.finalScore);
  }, [allScores, teachers]);

  const handlePrintReport = (teacher: User) => {
      const score = allScores.find(s => s.teacherId === teacher.id); const selfEval = allSelfEvals[teacher.id];
      if (!score) { alert("Este docente ainda não tem uma pontuação final calculada."); return; }
      setPrintingTeacher(teacher); setPrintingScore(score); setPrintingSelfEval(selfEval || null); setTimeout(() => { window.print(); }, 100);
  };
  const handlePrintStats = () => { window.print(); };

  const handleExportCSV = () => {
    if (fullReportData.length === 0) {
        alert("Não há dados para exportar.");
        return;
    }

    const headers = ["Docente", "Email", "Categoria", "Função", "Auto-Avaliação (80%)", "Avaliação Estudante (12%)", "Avaliação Institucional (8%)", "Nota Final", "Classificação"];
    
    // Add BOM for Excel UTF-8 compatibility
    const csvContent = "\uFEFF" + [
        headers.join(";"),
        ...fullReportData.map(row => [
            `"${row.teacherName}"`,
            `"${row.teacherEmail}"`,
            `"${row.teacherCategory}"`,
            `"${row.teacherJob}"`,
            row.selfEvalScore.toFixed(2).replace('.', ','),
            row.studentScore.toFixed(2).replace('.', ','),
            row.institutionalScore.toFixed(2).replace('.', ','),
            row.finalScore.toFixed(2).replace('.', ','),
            `"${row.classification}"`
        ].join(";"))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_docentes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadDetailedPDF = () => {
      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text(institution?.name || "Relatório de Gestão", 14, 20);
      
      doc.setFontSize(10);
      doc.text("Pauta de Avaliação de Desempenho Docente", 14, 28);
      doc.text(`Data de Emissão: ${new Date().toLocaleDateString()}`, 14, 33);

      const tableColumn = ["Docente", "Categoria", "Auto (80%)", "Est. (12%)", "Inst. (8%)", "Final", "Classif."];
      const tableRows = fullReportData.map(row => [
          row.teacherName,
          row.teacherCategory,
          row.selfEvalScore.toFixed(1),
          row.studentScore.toFixed(1),
          row.institutionalScore.toFixed(1),
          row.finalScore.toFixed(1),
          row.classification
      ]);

      autoTable(doc, {
          startY: 40,
          head: [tableColumn],
          body: tableRows,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185], textColor: 255 },
          styles: { fontSize: 8, cellPadding: 2 },
      });

      doc.save("relatorio_desempenho_docente.pdf");
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* --- PREVIEW MODALS --- */}
      {previewMode !== 'none' && (
          <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
                  <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                          <Eye className="h-5 w-5"/> 
                          {previewMode === 'student' ? 'Pré-visualização: Aluno' : 'Pré-visualização: Docente'}
                      </h3>
                      {previewMode === 'teacher' && (
                          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-md">
                              <span className="text-xs font-semibold text-gray-500 pl-2">Simular como:</span>
                              <button 
                                onClick={() => setPreviewCategory('assistente')}
                                className={`px-2 py-1 text-xs rounded ${previewCategory === 'assistente' ? 'bg-white shadow text-black' : 'text-gray-500'}`}
                              >
                                  Assistente
                              </button>
                              <button 
                                onClick={() => setPreviewCategory('assistente_estagiario')}
                                className={`px-2 py-1 text-xs rounded ${previewCategory === 'assistente_estagiario' ? 'bg-white shadow text-black' : 'text-gray-500'}`}
                              >
                                  Assistente Estagiário
                              </button>
                          </div>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setPreviewMode('none')}><X/></Button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
                      {previewMode === 'student' ? (
                          <div className="max-w-2xl mx-auto space-y-6">
                              {/* Mock Student View */}
                              <div className="space-y-4">
                                  {questionnaire?.questions.map((q, idx) => (
                                      <Card key={q.id}>
                                          <CardContent className="pt-6">
                                              <div className="mb-4">
                                                  <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded mr-2">#{idx + 1}</span>
                                                  <span className="font-medium text-gray-900 text-lg block mt-1">{q.text}</span>
                                              </div>
                                              <div className="mt-2 pointer-events-none opacity-80">{renderPreviewInput(q)}</div>
                                          </CardContent>
                                      </Card>
                                  ))}
                              </div>
                          </div>
                      ) : (
                          <div className="max-w-3xl mx-auto space-y-4">
                              {/* Mock Teacher View */}
                              {selfEvalTemplate.groups.map(group => {
                                  // Check exclusion for preview
                                  if (group.exclusiveTo && group.exclusiveTo.length > 0 && !group.exclusiveTo.includes(previewCategory)) return null;

                                  return (
                                    <Card key={group.id}>
                                        <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
                                            <div className="font-semibold text-gray-800">{group.title}</div>
                                            <span className="text-xs bg-white px-2 py-1 rounded border">Máx: {group.maxPoints} pts</span>
                                        </div>
                                        <CardContent className="p-6 space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {group.items.map(item => {
                                                    // Check exclusion for items
                                                    if (item.exclusiveTo && item.exclusiveTo.length > 0 && !item.exclusiveTo.includes(previewCategory)) return null;
                                                    return (
                                                        <div key={item.key}>
                                                            <Label>{item.label}</Label>
                                                            <Input type="number" placeholder="0" disabled />
                                                            <p className="text-xs text-gray-500 mt-1">{item.description} (Valor: {item.scoreValue})</p>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </CardContent>
                                    </Card>
                                  )
                              })}
                          </div>
                      )}
                  </div>
                  <div className="p-4 border-t bg-white flex justify-end">
                      <Button onClick={() => setPreviewMode('none')}>Fechar Pré-visualização</Button>
                  </div>
              </div>
          </div>
      )}
      
      {/* --- COMMENTS PRINT MODAL --- */}
      {viewingCommentsFor && (
        <div className="fixed inset-0 bg-white z-[200] overflow-auto animate-in fade-in">
             <div className="max-w-4xl mx-auto p-8 font-serif">
                <div className="print:hidden flex justify-between items-center mb-8 sticky top-0 bg-white/95 backdrop-blur py-4 border-b">
                    <h2 className="text-xl font-bold">Relatório de Comentários</h2>
                    <div className="flex gap-2">
                        <Button onClick={() => window.print()} className="bg-blue-600 text-white hover:bg-blue-700">
                            <Printer className="mr-2 h-4 w-4"/> Imprimir Respostas
                        </Button>
                        <Button variant="outline" onClick={() => setViewingCommentsFor(null)}>
                            <X className="mr-2 h-4 w-4"/> Fechar
                        </Button>
                    </div>
                </div>

                <div className="text-center mb-8">
                     {institution?.logo && <img src={institution.logo} className="h-16 object-contain mx-auto mb-2" alt="Logo"/>}
                     <h1 className="text-xl font-bold uppercase tracking-wide">{institution?.name}</h1>
                     <p className="text-sm text-gray-500 uppercase">Relatório de Feedback Qualitativo (Respostas)</p>
                     <p className="text-xs mt-1">Gerado em: {new Date().toLocaleDateString()}</p>
                </div>

                <div className="mb-8 border-b pb-4">
                    <p><strong>Docente:</strong> {viewingCommentsFor.name}</p>
                    <p><strong>Cargo:</strong> {viewingCommentsFor.jobTitle || 'Docente'}</p>
                    <p><strong>Email:</strong> {viewingCommentsFor.email}</p>
                </div>

                {teacherComments.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 italic border-2 border-dashed rounded-lg">
                        Nenhum comentário textual foi registrado para este docente ainda.
                    </div>
                ) : (
                    <div className="space-y-8">
                        {teacherComments.map((group, idx) => (
                            <div key={idx} className="break-inside-avoid">
                                <div className="bg-gray-100 p-3 rounded-t-lg border border-gray-300 font-bold text-gray-800 flex justify-between items-center">
                                    <span>{group.subjectName}</span>
                                    <span className="text-xs font-normal bg-white px-2 py-1 rounded border">
                                        Turma {group.classGroup} • {group.shift}
                                    </span>
                                </div>
                                <div className="border border-t-0 border-gray-300 rounded-b-lg p-4 bg-white">
                                    <ul className="list-disc pl-5 space-y-2">
                                        {group.comments.map((comment, cIdx) => (
                                            <li key={cIdx} className="text-sm text-gray-800 leading-relaxed pl-1">
                                                {comment}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
             </div>
        </div>
      )}

      {/* ... (Existing Modal editingUser code) ... */}
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
      
      {/* ... (Existing Print Views) ... */}
      <div className="hidden print:block font-serif">
        {printingTeacher && printingScore ? (
            <div className="p-4 text-sm break-after-page">
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
                        <table className="w-full border-collapse border-2 border-black mb-6">
                            <thead>
                                <tr className="font-bold bg-gray-100">
                                    <td className="border border-black p-1">Componente de Avaliação</td>
                                    <td className="border border-black p-1 text-center">Pontos Obtidos</td>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-black p-1">Auto-avaliação (Peso 80%)</td>
                                    <td className="border border-black p-1 text-center">{printingScore.selfEvalScore.toFixed(1)}</td>
                                </tr>
                                 <tr>
                                    <td className="border border-black p-1">Avaliação pelo Estudante (Peso 12%)</td>
                                    <td className="border border-black p-1 text-center">{printingScore.studentScore.toFixed(1)}</td>
                                </tr>
                                 <tr>
                                    <td className="border border-black p-1">Avaliação Institucional (Peso 8%)</td>
                                    <td className="border border-black p-1 text-center">{printingScore.institutionalScore.toFixed(1)}</td>
                                </tr>
                                <tr className="font-bold bg-gray-50">
                                    <td className="border border-black p-1">Classificação Final</td>
                                    <td className="border border-black p-1 text-center">{printingScore.finalScore.toFixed(1)}</td>
                                </tr>
                            </tbody>
                        </table>

                        {printingScore.subjectDetails && printingScore.subjectDetails.length > 0 && (
                            <div className="mt-8">
                                <h3 className="font-bold text-sm mb-2 uppercase border-b border-black pb-1">Detalhamento Pedagógico por Turma</h3>
                                <table className="w-full border-collapse border border-black text-xs">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border border-black p-1 text-left">Disciplina</th>
                                            <th className="border border-black p-1 text-left">Curso</th>
                                            <th className="border border-black p-1 text-center">Turma</th>
                                            <th className="border border-black p-1 text-center">Turno</th>
                                            <th className="border border-black p-1 text-center">Nº Avaliações</th>
                                            <th className="border border-black p-1 text-center">Média (0-20)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {printingScore.subjectDetails.map((det, idx) => (
                                            <tr key={idx}>
                                                <td className="border border-black p-1">{det.subjectName}</td>
                                                <td className="border border-black p-1">{det.course}</td>
                                                <td className="border border-black p-1 text-center">{det.classGroup}</td>
                                                <td className="border border-black p-1 text-center">{det.shift}</td>
                                                <td className="border border-black p-1 text-center">{det.responseCount}</td>
                                                <td className="border border-black p-1 text-center font-bold">{det.score.toFixed(1)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        ) : null}
      </div>

      <div className="print:hidden max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
        
        {/* HEADER RESPONSIVO */}
        <div className="bg-white p-4 rounded-xl shadow-sm border mb-6 relative z-30">
            {/* ... (Existing Header) ... */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-xl md:text-3xl font-bold tracking-tight text-gray-900 truncate max-w-[200px] md:max-w-none">{institution?.name || 'Painel de Gestão'}</h1>
                    <p className="text-xs md:text-sm text-gray-500">Gestão Académica • {new Date().getFullYear()}</p>
                </div>
                
                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('settings')} className="gap-2"><Settings size={16}/> Configurações</Button>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <Button variant={activeTab === 'overview' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('overview')} className="gap-2"><BarChartHorizontal size={16} /> Visão Geral</Button>
                        <Button variant={activeTab === 'stats' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('stats')} className="gap-2"><ListChecks size={16} /> Relatórios</Button>
                        <Button variant={activeTab === 'courses' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('courses')} className="gap-2"><BookOpen size={16} /> Cursos</Button>
                        <Button variant={activeTab === 'teachers' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('teachers')} className="gap-2"><Users size={16} /> Docentes</Button>
                        <Button variant={activeTab === 'students' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('students')} className="gap-2"><GraduationCap size={16} /> Estudantes</Button>
                        {/* Renamed Tab */}
                        <Button variant={activeTab === 'evaluations' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('evaluations')} className="gap-2"><FileQuestion size={16} /> Modelos</Button>
                    </div>
                </div>
                {/* Mobile Menu Button */}
                <button className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>{isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}</button>
            </div>
            
            {/* Mobile Menu Content */}
            {isMobileMenuOpen && (
                <div className="md:hidden absolute top-full left-0 w-full bg-white shadow-xl border-b z-50 rounded-b-xl animate-in slide-in-from-top-2 p-2">
                    <div className="grid gap-1">
                        <button onClick={() => {setActiveTab('overview'); setIsMobileMenuOpen(false)}} className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'overview' ? 'bg-slate-900 text-white' : 'hover:bg-gray-100 text-gray-700'}`}><BarChartHorizontal size={18} /> Visão Geral</button>
                        <button onClick={() => {setActiveTab('stats'); setIsMobileMenuOpen(false)}} className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'stats' ? 'bg-slate-900 text-white' : 'hover:bg-gray-100 text-gray-700'}`}><ListChecks size={18} /> Relatórios</button>
                        <button onClick={() => {setActiveTab('courses'); setIsMobileMenuOpen(false)}} className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'courses' ? 'bg-slate-900 text-white' : 'hover:bg-gray-100 text-gray-700'}`}><BookOpen size={18} /> Cursos</button>
                        <button onClick={() => {setActiveTab('teachers'); setIsMobileMenuOpen(false)}} className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'teachers' ? 'bg-slate-900 text-white' : 'hover:bg-gray-100 text-gray-700'}`}><Users size={18} /> Docentes</button>
                        <button onClick={() => {setActiveTab('students'); setIsMobileMenuOpen(false)}} className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'students' ? 'bg-slate-900 text-white' : 'hover:bg-gray-100 text-gray-700'}`}><GraduationCap size={18} /> Estudantes</button>
                        <button onClick={() => {setActiveTab('evaluations'); setIsMobileMenuOpen(false)}} className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'evaluations' ? 'bg-slate-900 text-white' : 'hover:bg-gray-100 text-gray-700'}`}><FileQuestion size={18} /> Modelos de Avaliação</button>
                        <button onClick={() => {setActiveTab('settings'); setIsMobileMenuOpen(false)}} className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'settings' ? 'bg-slate-900 text-white' : 'hover:bg-gray-100 text-gray-700'}`}><Settings size={18} /> Configurações</button>
                    </div>
                </div>
            )}
        </div>

        {/* ... (Overview logic unchanged) ... */}
        {activeTab === 'overview' && (
             <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
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
                        
                        <div className="w-full space-y-2 mb-2 text-left">
                            <Label className="text-xs text-slate-300">Alvo do Cálculo</Label>
                            <select 
                                value={calcTarget} 
                                onChange={e => setCalcTarget(e.target.value)}
                                className="w-full bg-slate-800 border-slate-700 text-white text-sm rounded p-2 focus:ring-slate-500"
                            >
                                <option value="all">Todos os Docentes</option>
                                {teachers.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>

                        <Button size="sm" variant="secondary" onClick={handleCalculateScores} disabled={calculating} className="w-full">
                           {calculating ? <RefreshCw className="animate-spin mr-2 h-4 w-4"/> : <Calculator className="mr-2 h-4 w-4"/>} 
                           {calculating ? 'Processando...' : 'Calcular Scores'}
                        </Button>
                        <p className="text-xs text-slate-400 mt-2">
                           {calcTarget === 'all' ? 'Atualiza notas de todos.' : 'Atualiza apenas o docente selecionado.'}
                        </p>
                    </CardContent>
                </Card>

                <Card className="col-span-1 md:col-span-2 lg:col-span-4 border-l-4 border-l-orange-500">
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
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
        
        {/* --- ABA STATS (ATUALIZADA) --- */}
        {activeTab === 'stats' && (
             <div className="space-y-6">
                 <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-4 rounded-lg shadow-sm border">
                    <div>
                        <h2 className="text-lg font-bold">Relatórios e Resultados Finais</h2>
                        <p className="text-sm text-gray-500">Consulte a pauta, exporte para Excel ou imprima relatórios oficiais.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={handleExportCSV} className="text-green-700 hover:text-green-800 hover:bg-green-50 border-green-200">
                            <FileSpreadsheet className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Exportar Excel</span>
                        </Button>
                        <Button onClick={handleDownloadDetailedPDF} className="bg-red-600 hover:bg-red-700 text-white">
                            <FileText className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Baixar PDF</span>
                        </Button>
                        <Button variant="ghost" onClick={handlePrintStats} className="text-gray-600">
                             <Printer className="h-4 w-4" />
                        </Button>
                    </div>
                 </div>
                 
                 {/* DESKTOP VIEW: TABLE */}
                 <Card className="hidden md:block">
                    <CardHeader>
                        <CardTitle>Pauta Geral (Todos os Docentes)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <table className="w-full text-sm min-w-[800px]">
                            <thead className="bg-gray-50 text-gray-600 font-medium">
                                <tr>
                                    <th className="p-4 text-left">Docente</th>
                                    <th className="p-4 text-left">Categoria</th>
                                    <th className="p-4 text-center">Auto-Aval (80%)</th>
                                    <th className="p-4 text-center">Estudante (12%)</th>
                                    <th className="p-4 text-center">Institucional (8%)</th>
                                    <th className="p-4 text-center font-bold">Nota Final</th>
                                    <th className="p-4 text-center">Classificação</th>
                                    <th className="p-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {fullReportData.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-gray-500 italic">
                                            Nenhum docente cadastrado na instituição.
                                        </td>
                                    </tr>
                                ) : fullReportData.map(score => {
                                    const isExpanded = expandedDetails === score.teacherId;
                                    return (
                                        <React.Fragment key={score.teacherId}>
                                            <tr className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4">
                                                    <div className="font-medium text-gray-900">{score.teacherName}</div>
                                                    <div className="text-xs text-gray-500">{score.teacherEmail}</div>
                                                </td>
                                                <td className="p-4 text-gray-600 capitalize">{score.teacherCategory.replace('_', ' ')}</td>
                                                {score.hasScore ? (
                                                    <>
                                                        <td className="p-4 text-center">{score.selfEvalScore.toFixed(1)}</td>
                                                        <td className="p-4 text-center">{score.studentScore.toFixed(1)}</td>
                                                        <td className="p-4 text-center">{score.institutionalScore.toFixed(1)}</td>
                                                        <td className="p-4 text-center font-bold text-base">{score.finalScore.toFixed(1)}</td>
                                                        <td className="p-4 text-center">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                score.val20 >= 14 ? 'bg-green-100 text-green-800' :
                                                                score.val20 >= 10 ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-red-100 text-red-800'
                                                            }`}>
                                                                {score.classification}
                                                            </span>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <td colSpan={5} className="p-4 text-center text-gray-400 italic bg-gray-50/50">
                                                        Aguardando cálculo...
                                                    </td>
                                                )}
                                                
                                                <td className="p-4 text-center flex items-center justify-center gap-2">
                                                    {score.hasScore && (
                                                        <>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                title="Ver Detalhes"
                                                                onClick={() => setExpandedDetails(isExpanded ? null : score.teacherId)}
                                                            >
                                                                {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                title="Imprimir Relatório"
                                                                onClick={() => {
                                                                    const user = teachers.find(t => t.id === score.teacherId);
                                                                    if (user) handlePrintReport(user);
                                                                }}
                                                            >
                                                                <Printer className="h-4 w-4 text-gray-400 hover:text-black"/>
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                title="Ver Respostas dos Alunos"
                                                                onClick={() => {
                                                                    const user = teachers.find(t => t.id === score.teacherId);
                                                                    if (user) handleViewComments(user);
                                                                }}
                                                            >
                                                                <MessageSquare className="h-4 w-4 text-blue-500 hover:text-blue-700"/>
                                                            </Button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                            {isExpanded && score.subjectDetails && score.subjectDetails.length > 0 && (
                                                <tr className="bg-blue-50/50 animate-in fade-in">
                                                    <td colSpan={8} className="p-4">
                                                        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                                                            <div className="bg-blue-50 px-4 py-2 text-xs font-bold text-blue-800 uppercase tracking-wide border-b border-blue-100">
                                                                Detalhamento por Disciplina
                                                            </div>
                                                            <table className="w-full text-xs">
                                                                <thead>
                                                                    <tr className="text-gray-500 bg-gray-50/50 border-b">
                                                                        <th className="p-2 text-left">Disciplina</th>
                                                                        <th className="p-2 text-center">Turma</th>
                                                                        <th className="p-2 text-center">Turno</th>
                                                                        <th className="p-2 text-center">Avaliações</th>
                                                                        <th className="p-2 text-center">Média (0-20)</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {score.subjectDetails.map((det, idx) => (
                                                                        <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                                                                            <td className="p-2 font-medium">{det.subjectName}</td>
                                                                            <td className="p-2 text-center">{det.classGroup}</td>
                                                                            <td className="p-2 text-center">{det.shift}</td>
                                                                            <td className="p-2 text-center">{det.responseCount}</td>
                                                                            <td className="p-2 text-center font-bold text-blue-600">{det.score.toFixed(1)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    )
                                })}
                            </tbody>
                        </table>
                    </CardContent>
                 </Card>
             </div>
        )}

        {/* --- ABA EVALUATIONS (UPDATED) --- */}
        {activeTab === 'evaluations' && (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div className="flex bg-white p-1 rounded-lg border shadow-sm">
                        <button 
                            onClick={() => setEvalTabMode('student')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${evalTabMode === 'student' ? 'bg-slate-900 text-white shadow' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Inquérito ao Estudante
                        </button>
                        <button 
                            onClick={() => setEvalTabMode('teacher')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${evalTabMode === 'teacher' ? 'bg-slate-900 text-white shadow' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Ficha de Auto-Avaliação
                        </button>
                    </div>
                    
                    <Button onClick={() => setPreviewMode(evalTabMode)} className="bg-white text-slate-900 border hover:bg-gray-50">
                        <Eye className="mr-2 h-4 w-4"/> Pré-visualizar Modelo
                    </Button>
                </div>

                {evalTabMode === 'student' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-4">
                            {/* Lista de Perguntas */}
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-lg">Perguntas Ativas</h3>
                                <Button variant="ghost" size="sm" onClick={handleResetDefaults} className="text-red-500 text-xs">Restaurar Padrão</Button>
                            </div>
                            <div className="space-y-3">
                                {questionnaire?.questions.length === 0 && <p className="text-gray-400 italic">Nenhuma pergunta configurada.</p>}
                                {questionnaire?.questions.map((q, idx) => (
                                    <div key={q.id} className="bg-white p-4 rounded-lg border shadow-sm relative group hover:border-blue-300 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1 w-full mr-8">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-gray-100 text-gray-500 text-xs px-1.5 py-0.5 rounded font-mono">#{idx+1}</span>
                                                    <span className="text-xs uppercase font-bold text-gray-400">{q.type}</span>
                                                </div>
                                                <p className="font-medium text-gray-900">{q.text}</p>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => handleRemoveQuestion(q.id)} className="text-gray-400 hover:text-red-500 absolute top-2 right-2">
                                                <Trash2 size={16}/>
                                            </Button>
                                        </div>
                                        <div className="mt-3 pt-3 border-t">
                                            <div className="opacity-60 pointer-events-none scale-95 origin-left">
                                                {renderPreviewInput(q)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <Card className="sticky top-24">
                                <CardHeader>
                                    <CardTitle>Adicionar Pergunta</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Texto da Pergunta</Label>
                                        <Input value={newQText} onChange={e => setNewQText(e.target.value)} placeholder="Ex: O docente foi pontual?" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tipo de Resposta</Label>
                                        <Select value={newQType} onChange={e => setNewQType(e.target.value as any)}>
                                            <option value="binary">Sim / Não</option>
                                            <option value="scale_10">Escala 0 a 10</option>
                                            <option value="stars">5 Estrelas</option>
                                            <option value="text">Texto Livre</option>
                                            <option value="choice">Múltipla Escolha</option>
                                        </Select>
                                    </div>
                                    {newQType === 'choice' && (
                                        <div className="space-y-2">
                                            <Label>Opções (separadas por vírgula)</Label>
                                            <Input value={newQOptions} onChange={e => setNewQOptions(e.target.value)} placeholder="Opção A, Opção B, Opção C"/>
                                        </div>
                                    )}
                                    <Button onClick={handleAddQuestion} className="w-full">Adicionar ao Inquérito</Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {evalTabMode === 'teacher' && (
                    <div className="space-y-6">
                        <Card className="bg-blue-50 border-blue-100">
                            <CardContent className="p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="text-sm text-blue-800">
                                    <p className="font-bold mb-1">Modelo de Auto-Avaliação Dinâmico</p>
                                    <p>Aqui você pode adicionar, remover ou editar critérios. Você também pode definir se um critério é exclusivo para Assistentes ou Estagiários.</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={handleResetSelfEvalDefaults} className="border-blue-300 text-blue-800 hover:bg-blue-100">
                                        <RotateCcw className="mr-2 h-4 w-4"/> Restaurar Padrão
                                    </Button>
                                    <Button onClick={saveSelfEvalChanges} className="bg-blue-700 hover:bg-blue-800 text-white whitespace-nowrap">
                                        <Save className="mr-2 h-4 w-4"/> Salvar Alterações
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid gap-6 md:grid-cols-2">
                            {selfEvalTemplate.groups.map(group => (
                                <Card key={group.id} className="overflow-hidden">
                                    <div className="bg-gray-100 px-4 py-3 border-b flex justify-between items-center">
                                        <span className="font-bold text-gray-700">{group.title}</span>
                                        <span className="text-xs bg-white px-2 py-1 rounded border shadow-sm">Máx: {group.maxPoints} pts</span>
                                    </div>
                                    <CardContent className="p-0">
                                        <div className="divide-y">
                                            {group.items.map(item => (
                                                <div key={item.key} className="p-4 space-y-3 hover:bg-gray-50 transition-colors relative group">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={() => handleDeleteItemFromGroup(group.id, item.key)}
                                                        className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 size={16}/>
                                                    </Button>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-gray-400 uppercase">Título do Item</Label>
                                                        <Input 
                                                            value={item.label} 
                                                            onChange={(e) => handleUpdateSelfEvalTemplate(group.id, item.key, 'label', e.target.value)}
                                                            className="h-8 font-medium"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-gray-400 uppercase">Descrição</Label>
                                                            <Input 
                                                                value={item.description} 
                                                                onChange={(e) => handleUpdateSelfEvalTemplate(group.id, item.key, 'description', e.target.value)}
                                                                className="h-8 text-sm text-gray-600"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-gray-400 uppercase">Valor (Pontos)</Label>
                                                            <Input 
                                                                type="number"
                                                                value={item.scoreValue} 
                                                                onChange={(e) => handleUpdateSelfEvalTemplate(group.id, item.key, 'scoreValue', parseFloat(e.target.value))}
                                                                className="h-8 text-sm text-gray-600"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1 pt-1 border-t border-dashed mt-2">
                                                        <Label className="text-xs text-gray-400 uppercase">Disponível Para</Label>
                                                        <Select 
                                                            value={item.exclusiveTo && item.exclusiveTo.length > 0 ? item.exclusiveTo[0] : 'todos'} 
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                const newVal = val === 'todos' ? [] : [val];
                                                                handleUpdateSelfEvalTemplate(group.id, item.key, 'exclusiveTo', newVal);
                                                            }}
                                                            className="h-8 text-xs bg-gray-50 border-gray-200"
                                                        >
                                                            <option value="todos">Todos os Docentes</option>
                                                            <option value="assistente">Apenas Assistente</option>
                                                            <option value="assistente_estagiario">Apenas Assistente Estagiário</option>
                                                        </Select>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="p-3 bg-gray-50 text-center">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => handleAddItemToGroup(group.id)}
                                                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 w-full border border-dashed border-blue-200"
                                                >
                                                    <Plus size={14} className="mr-1"/> Adicionar Critério
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* --- ABA COURSES (RESTAURADA) --- */}
        {activeTab === 'courses' && (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
                <div className="md:col-span-2 space-y-4 order-2 md:order-1">
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
                <div className="order-1 md:order-2">
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
                                        <Select value={newCourseDuration} onChange={e => setNewCourseDuration(e.target.value)}>
                                            {[1, 2, 3, 4, 5, 6].map(year => (
                                                <option key={year} value={year.toString()}>{year} Anos</option>
                                            ))}
                                        </Select>
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

                                {/* Seção para Adicionar Disciplinas/Cadeiras */}
                                <div className="space-y-3 pt-4 border-t">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-gray-700 font-semibold flex items-center gap-2">
                                            <Layers size={14} /> Estrutura Curricular (Disciplinas)
                                        </Label>
                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{courseSubjects.length} adicionadas</span>
                                    </div>
                                    
                                    <div className="bg-gray-50 p-3 rounded-md border space-y-3">
                                        <div className="space-y-2">
                                            <Input 
                                                value={tempCourseSubjectName} 
                                                onChange={e => setTempCourseSubjectName(e.target.value)} 
                                                placeholder="Nome da Cadeira (ex: Matemática I)"
                                                className="bg-white"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Select value={tempCourseSubjectLevel} onChange={e => setTempCourseSubjectLevel(e.target.value)}>
                                                {[...Array(parseInt(newCourseDuration))].map((_, i) => (
                                                    <option key={i+1} value={(i+1).toString()}>{i+1}º Ano</option>
                                                ))}
                                            </Select>
                                            <Select value={tempCourseSubjectSemester} onChange={e => setTempCourseSubjectSemester(e.target.value)}>
                                                <option value="1">1º Sem.</option>
                                                <option value="2">2º Sem.</option>
                                            </Select>
                                        </div>
                                        <Button type="button" size="sm" onClick={handleAddCourseSubject} className="w-full bg-slate-800 text-white hover:bg-slate-700">
                                            <Plus size={14} className="mr-1"/> Adicionar Cadeira
                                        </Button>
                                    </div>

                                    {/* Lista de Cadeiras Adicionadas */}
                                    {courseSubjects.length > 0 && (
                                        <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                                            {courseSubjects.map((sub, idx) => (
                                                <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border text-xs shadow-sm">
                                                    <div>
                                                        <span className="font-medium">{sub.name}</span>
                                                        <span className="text-gray-500 ml-2">({sub.level}º Ano, {sub.semester}º Sem)</span>
                                                    </div>
                                                    <button type="button" onClick={() => handleRemoveCourseSubject(idx)} className="text-red-500 hover:text-red-700">
                                                        <X size={14}/>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <Button type="submit" className="w-full">
                                    {courseSubjects.length > 0 ? `Criar Curso e ${courseSubjects.length} Disciplinas` : 'Criar Curso'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )}

        {/* --- ABA TEACHERS (RESTAURADA) --- */}
        {activeTab === 'teachers' && (
            <div className="space-y-6">
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader>
                        <CardTitle className="text-blue-900">Cadastrar Novo Docente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddTeacher} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                <div className="flex flex-col sm:flex-row gap-2 mb-2">
                                    <Select value={selectedCourseToAdd} onChange={e => setSelectedCourseToAdd(e.target.value)}>
                                        <option value="">Selecione um curso...</option>
                                        {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </Select>
                                    <Button type="button" onClick={handleAddTeacherCourse} disabled={!selectedCourseToAdd} className="w-full sm:w-auto">
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2 mb-2">
                                    <Input placeholder="Nome da Disciplina" className="md:col-span-2" value={tempSubject.name} onChange={e => setTempSubject({...tempSubject, name: e.target.value})} />
                                    <Input placeholder="Curso (Sigla)" value={tempSubject.course} onChange={e => setTempSubject({...tempSubject, course: e.target.value})} />
                                    <Input placeholder="Turma (ex: A)" value={tempSubject.classGroup} onChange={e => setTempSubject({...tempSubject, classGroup: e.target.value})} />
                                    <Select value={tempSubject.shift} onChange={e => setTempSubject({...tempSubject, shift: e.target.value as any})}>
                                        <option value="Diurno">Diurno</option>
                                        <option value="Noturno">Noturno</option>
                                    </Select>
                                    <Button type="button" onClick={handleAddTempSubject} className="w-full sm:w-auto"><Plus className="h-4 w-4"/></Button>
                                </div>
                                <div className="space-y-1">
                                    {newTeacherSubjects.map((s, i) => (
                                        <div key={i} className="flex flex-col sm:flex-row sm:justify-between text-xs bg-white p-2 border rounded">
                                            <span>{s.name} ({s.course}) - Turma {s.classGroup} ({s.shift})</span>
                                            <X className="h-3 w-3 cursor-pointer text-red-500 mt-1 sm:mt-0" onClick={() => handleRemoveTempSubject(i)}/>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Button type="submit" className="w-full">Cadastrar Docente</Button>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Corpo Docente Existente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {teachers.map(t => (
                                <div key={t.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-white gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 shrink-0">
                                            {t.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold">{t.name}</h4>
                                            <p className="text-xs text-gray-500">{t.email}</p>
                                            <p className="text-xs text-blue-600 font-medium">{t.jobTitle || 'Docente'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto justify-end">
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
            </div>
        )}

        {/* --- ABA STUDENTS (RESTAURADA) --- */}
        {activeTab === 'students' && (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
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
                                    <Select value={newStudentLevel} onChange={e => setNewStudentLevel(e.target.value)}>
                                        <option value="">Selecione o Ano...</option>
                                        {[1, 2, 3, 4, 5, 6].map(year => (
                                            <option key={year} value={year.toString()}>{year}º Ano</option>
                                        ))}
                                    </Select>
                                </div>
                            </div>
                            
                            {/* Novos Campos: Semestre e Modalidade */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-2">
                                    <Label>Semestre</Label>
                                    <Select value={newStudentSemester} onChange={e => setNewStudentSemester(e.target.value)}>
                                        <option value="1">1º Semestre</option>
                                        <option value="2">2º Semestre</option>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Modalidade</Label>
                                    <Select value={newStudentModality} onChange={e => setNewStudentModality(e.target.value as any)}>
                                        <option value="Presencial">Presencial</option>
                                        <option value="Online">Online</option>
                                        <option value="Híbrido">Híbrido</option>
                                    </Select>
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

        {/* --- ABA SETTINGS (RESTAURADA) --- */}
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
                                <div className="h-16 w-16 border rounded bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
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
