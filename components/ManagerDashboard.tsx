
import React, { useState, useEffect, useMemo } from 'react';
import { BackendService, PDF_STANDARD_QUESTIONS, DEFAULT_SELF_EVAL_TEMPLATE } from '../services/backend';
import { User, UserRole, Subject, Questionnaire, QuestionType, TeacherCategory, CombinedScore, Question, Institution, SelfEvaluation, Course, SelfEvalTemplate } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, cn } from './ui';
import { Users, BookOpen, Calculator, Plus, Trash2, FileQuestion, ChevronDown, ChevronUp, Star, BarChartHorizontal, GraduationCap, Download, Printer, Image as ImageIcon, RefreshCw, Settings, Save, X, Edit, Scale, Award, FileSpreadsheet, ListChecks, FileText, Layers, AlertTriangle, Menu, Eye } from 'lucide-react';
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
  const [expandedDetails, setExpandedDetails] = useState<string | null>(null); // ID do professor para ver detalhes na tabela

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

  // ... (Other handlers unchanged until SelfEval updates) ...

  const handleUpdateSelfEvalTemplate = async (groupId: string, itemKey: string, field: 'label' | 'description', value: string) => {
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
  
  const saveSelfEvalChanges = async () => {
      await BackendService.saveInstitutionSelfEvalTemplate(institutionId, selfEvalTemplate);
      alert("Modelo de Auto-Avaliação atualizado com sucesso!");
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
  
  const avgScore = allScores.length > 0 ? (allScores.reduce((acc, curr) => acc + curr.finalScore, 0) / allScores.length).toFixed(1) : '0';
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
  const handleExportCSV = () => { /* ... existing CSV logic ... */ };
  const handleDownloadDetailedPDF = () => { /* ... existing PDF logic ... */ };
  const handlePrintStats = () => { window.print(); };

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
                              {selfEvalTemplate.groups.map(group => (
                                  <Card key={group.id}>
                                      <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
                                          <div className="font-semibold text-gray-800">{group.title}</div>
                                          <span className="text-xs bg-white px-2 py-1 rounded border">Máx: {group.maxPoints} pts</span>
                                      </div>
                                      <CardContent className="p-6 space-y-4">
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                              {group.items.map(item => (
                                                  <div key={item.key}>
                                                      <Label>{item.label}</Label>
                                                      <Input type="number" placeholder="0" disabled />
                                                      <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                                                  </div>
                                              ))}
                                          </div>
                                      </CardContent>
                                  </Card>
                              ))}
                          </div>
                      )}
                  </div>
                  <div className="p-4 border-t bg-white flex justify-end">
                      <Button onClick={() => setPreviewMode('none')}>Fechar Pré-visualização</Button>
                  </div>
              </div>
          </div>
      )}

      {/* ... (Existing Modal editingUser code) ... */}
      
      {/* ... (Existing Print Views) ... */}

      <div className="print:hidden max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
        
        {/* HEADER RESPONSIVO */}
        <div className="bg-white p-4 rounded-xl shadow-sm border mb-6 relative z-30">
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
                        <button onClick={() => {setActiveTab('evaluations'); setIsMobileMenuOpen(false)}} className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'evaluations' ? 'bg-slate-900 text-white' : 'hover:bg-gray-100 text-gray-700'}`}><FileQuestion size={18} /> Modelos de Avaliação</button>
                        {/* ... other items ... */}
                    </div>
                </div>
            )}
        </div>

        {/* ... (Overview, Teachers, Courses, Students Tabs logic unchanged) ... */}
        {activeTab === 'overview' && (
             // ... existing overview code ...
             <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                 {/* ... cards ... */}
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
                <Card className="bg-slate-900 text-white shadow-lg">
                    <CardContent className="p-6 flex flex-col items-center text-center justify-center h-full">
                        <h3 className="text-lg font-bold mb-2">Fecho do Semestre</h3>
                        <Button size="sm" variant="secondary" onClick={handleCalculateScores} disabled={calculating} className="w-full">
                           {calculating ? <RefreshCw className="animate-spin mr-2 h-4 w-4"/> : <Calculator className="mr-2 h-4 w-4"/>} 
                           {calculating ? 'Processando...' : 'Calcular Scores'}
                        </Button>
                    </CardContent>
                </Card>
             </div>
        )}
        
        {/* ... (Stats, Teachers, Courses, Students Tabs ...) */}

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
                                    <p className="font-bold mb-1">Modelo de Auto-Avaliação</p>
                                    <p>Aqui você pode personalizar os textos e descrições da ficha padrão. A estrutura de grupos e pontuação máxima é fixa para garantir integridade do cálculo.</p>
                                </div>
                                <Button onClick={saveSelfEvalChanges} className="bg-blue-700 hover:bg-blue-800 text-white whitespace-nowrap">
                                    <Save className="mr-2 h-4 w-4"/> Salvar Alterações
                                </Button>
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
                                                <div key={item.key} className="p-4 space-y-2 hover:bg-gray-50 transition-colors">
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-gray-400 uppercase">Título do Item</Label>
                                                        <Input 
                                                            value={item.label} 
                                                            onChange={(e) => handleUpdateSelfEvalTemplate(group.id, item.key, 'label', e.target.value)}
                                                            className="h-8 font-medium"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-gray-400 uppercase">Descrição / Critério</Label>
                                                        <Input 
                                                            value={item.description} 
                                                            onChange={(e) => handleUpdateSelfEvalTemplate(group.id, item.key, 'description', e.target.value)}
                                                            className="h-8 text-sm text-gray-600"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* ... (Other Tabs Content) ... */}
        {activeTab === 'teachers' && (/* ... teachers content ... */ <div className="space-y-6"><Card><CardHeader><CardTitle>Docentes</CardTitle></CardHeader><CardContent>{/* teachers list placeholder - full logic in previous steps */}</CardContent></Card></div>)}
        {activeTab === 'courses' && (/* ... courses content ... */ <div className="space-y-6"><Card><CardHeader><CardTitle>Cursos</CardTitle></CardHeader><CardContent>{/* courses list placeholder */}</CardContent></Card></div>)}
        {activeTab === 'students' && (/* ... students content ... */ <div className="space-y-6"><Card><CardHeader><CardTitle>Estudantes</CardTitle></CardHeader><CardContent>{/* students list placeholder */}</CardContent></Card></div>)}
        {activeTab === 'settings' && (/* ... settings content ... */ <Card><CardHeader><CardTitle>Configurações</CardTitle></CardHeader><CardContent><form onSubmit={handleUpdateInstitution} className="space-y-4 max-w-md"><div className="space-y-2"><Label>Nome</Label><Input value={institution?.name||''} onChange={e=>setInstitution(institution?{...institution,name:e.target.value}:null)}/></div><Button type="submit">Salvar</Button></form></CardContent></Card>)}
      </div>
    </div>
  );
};
