
import React, { useState, useEffect, useMemo } from 'react';
import { BackendService, PDF_STANDARD_QUESTIONS, DEFAULT_SELF_EVAL_TEMPLATE, GroupedComments } from '../services/backend';
import { User, UserRole, Subject, Questionnaire, QuestionType, TeacherCategory, CombinedScore, Question, Institution, SelfEvaluation, Course, SelfEvalTemplate } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Switch, cn } from './ui';
import { useToast } from './ToastContext';
import { Users, BookOpen, Calculator, Plus, Trash2, FileQuestion, ChevronDown, ChevronUp, Star, BarChartHorizontal, GraduationCap, Download, Printer, Image as ImageIcon, RefreshCw, Settings, Save, X, Edit, Scale, Award, FileSpreadsheet, ListChecks, FileText, Layers, AlertTriangle, Menu, Eye, MessageSquare, RotateCcw, LayoutList, Quote, Lock, CheckCircle2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  institutionId: string;
}

interface NewSubjectItem {
    id?: string;
    name: string;
    code: string;
    course: string;
    courseId?: string;
    level: string;
    classGroup: string;
    shift: 'Diurno' | 'Noturno';
    modality: 'Presencial' | 'Online';
}

interface CurricularSubject {
    name: string;
    level: string;
    semester: string;
}

export const ManagerDashboard: React.FC<Props> = ({ institutionId }) => {
  const { addToast } = useToast();
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
  const [newCourseClassGroups, setNewCourseClassGroups] = useState(''); // Novo estado para Turmas (Criação de curso)
  
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
  const [previewingReportFor, setPreviewingReportFor] = useState<User | null>(null);
  const [previewCategory, setPreviewCategory] = useState<TeacherCategory>('assistente');

  // Form Builder State
  const [newQText, setNewQText] = useState('');
  const [newQType, setNewQType] = useState<QuestionType>('binary'); 
  const [newQWeight, setNewQWeight] = useState(1);
  const [newQOptions, setNewQOptions] = useState(''); // Comma separated
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

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
  const [tempSubject, setTempSubject] = useState<NewSubjectItem>({ name: '', code: '', course: '', courseId: '', level: '', classGroup: '', shift: 'Diurno', modality: 'Presencial'});

  // Form State for New Student
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentPwd, setNewStudentPwd] = useState('');
  const [newStudentCourse, setNewStudentCourse] = useState('');
  const [newStudentLevel, setNewStudentLevel] = useState('');
  const [newStudentAvatar, setNewStudentAvatar] = useState('');
  // Multi-selection states
  const [newStudentShifts, setNewStudentShifts] = useState<string[]>([]);
  const [newStudentClassGroups, setNewStudentClassGroups] = useState<string[]>([]);
  const [newStudentClassGroupsInput, setNewStudentClassGroupsInput] = useState(''); // Fallback manual
  
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

  // Reset student class groups when course changes
  useEffect(() => {
      setNewStudentClassGroups([]);
      setNewStudentClassGroupsInput('');
  }, [newStudentCourse]);

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
          addToast("Dados atualizados com sucesso!", 'success');
          setEditingUser(null);
          loadData();
      } catch (e: any) {
          addToast("Erro ao atualizar: " + e.message, 'error');
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
        addToast(msg, 'success');
    } catch (e: any) {
        addToast("Erro ao calcular: " + e, 'error');
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
      addToast("Modelo de Auto-Avaliação atualizado com sucesso!", 'success');
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
          if (file.size > 500 * 1024) return addToast("Foto muito grande. Máx 500KB.", 'error');
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
      if (!newCourseName || !newCourseCode) { addToast("Preencha Nome e Código do curso.", 'error'); return; }
      try {
          const classGroupsList = newCourseClassGroups
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0);
            
          await BackendService.addCourse(
              institutionId, 
              newCourseName, 
              newCourseCode, 
              parseInt(newCourseDuration), 
              newCourseSemester, 
              newCourseModality, 
              classGroupsList,
              courseSubjects
          );
          
          setNewCourseName(''); setNewCourseCode(''); setNewCourseDuration('4'); setNewCourseSemester('1'); setNewCourseModality('Presencial'); setNewCourseClassGroups(''); setCourseSubjects([]);
          await loadData(); 
          addToast(`Curso "${newCourseName}" criado com sucesso!`, 'success');
      } catch (error: any) { addToast("Erro ao adicionar curso: " + error.message, 'error'); }
  };

  const handleDeleteCourse = async (id: string) => {
      if(confirm("Tem certeza?")) {
          try { await BackendService.deleteCourse(id); setCourses(prev => prev.filter(c => c.id !== id)); } catch(e: any) { addToast("Erro ao remover curso: " + e.message, 'error'); }
      }
  };

  const handleDeleteTeacher = async (id: string) => {
      if(confirm("Tem certeza que deseja remover este docente?")) {
          try { 
              await BackendService.deleteUser(id); 
              setTeachers(prev => prev.filter(t => t.id !== id)); 
              addToast("Docente removido com sucesso.", 'success');
          } catch(e: any) { 
              addToast("Erro ao remover docente: " + e.message, 'error'); 
          }
      }
  };

  const handleDeleteStudent = async (id: string) => {
      if(confirm("Tem certeza que deseja remover este estudante?")) {
          try { 
              await BackendService.deleteUser(id); 
              setStudents(prev => prev.filter(s => s.id !== id)); 
              addToast("Estudante removido com sucesso.", 'success');
          } catch(e: any) { 
              addToast("Erro ao remover estudante: " + e.message, 'error'); 
          }
      }
  };

  const handleAddTempSubject = () => {
      if (!tempSubject.name.trim() || !tempSubject.course.trim()) { 
          addToast("Preencha pelo menos o Nome e o Curso da disciplina.", 'error'); 
          return; 
      }
      
      // Check for duplicates in the list being built
      const isDuplicate = newTeacherSubjects.some(s => 
          s.name === tempSubject.name && 
          (s.courseId === tempSubject.courseId || s.course === tempSubject.course) && 
          s.classGroup === tempSubject.classGroup &&
          s.shift === tempSubject.shift
      );

      if (isDuplicate) {
          addToast("Esta disciplina já foi adicionada à lista.", 'error');
          return;
      }

      // Check if subject is already assigned to another teacher (if it has an ID)
      if (tempSubject.id) {
          const originalSubject = subjects.find(s => s.id === tempSubject.id);
          if (originalSubject && originalSubject.teacherId && originalSubject.teacherId !== (editingUser?.id || '')) {
             // Optional: Allow re-assignment but warn? Or just let it happen (backend handles it).
             // For now, let's just add it. The UI will show it's assigned.
          }
      }

      setNewTeacherSubjects([...newTeacherSubjects, tempSubject]);
      // Reset form but keep course/classGroup for faster entry of multiple subjects in same class
      setTempSubject({ 
          ...tempSubject, 
          name: '', 
          id: undefined, 
          code: '' 
          // Keep course, classGroup, shift
      });
  };
  
  const handleRemoveTempSubject = (index: number) => { setNewTeacherSubjects(newTeacherSubjects.filter((_, i) => i !== index)); };
  const handleAddTeacherCourse = () => { if (selectedCourseToAdd && !newTeacherCourses.includes(selectedCourseToAdd)) { setNewTeacherCourses([...newTeacherCourses, selectedCourseToAdd]); setSelectedCourseToAdd(''); } };
  const handleRemoveTeacherCourse = (course: string) => { setNewTeacherCourses(newTeacherCourses.filter(c => c !== course)); };

  const handleAddTeacher = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTeacherName.trim() || !newTeacherEmail.trim() || !newTeacherPwd.trim()) { addToast("Por favor, preencha Nome, Email e Senha do docente.", 'error'); return; }
      try {
          const newUser = await BackendService.addTeacher(institutionId, newTeacherName, newTeacherEmail, newTeacherPwd, newTeacherAvatar, newTeacherCategory, newTeacherCourses);
          if (newTeacherSubjects.length > 0) {
              for (const sub of newTeacherSubjects) {
                  if (sub.name) {
                      // Pass full sub object which might include ID
                      await BackendService.assignSubject({ 
                          ...sub, 
                          teacherId: newUser.id, 
                          institutionId: institutionId, 
                          academicYear: new Date().getFullYear().toString(), 
                          modality: 'Presencial', 
                          teacherCategory: newTeacherCategory 
                      });
                  }
              }
          }
          setNewTeacherName(''); setNewTeacherEmail(''); setNewTeacherPwd(''); setNewTeacherAvatar(''); setNewTeacherCategory('assistente'); setNewTeacherSubjects([]); setNewTeacherCourses([]);
          await loadData(); addToast(`Docente e ${newTeacherSubjects.length} disciplinas cadastrados com sucesso!`, 'success');
      } catch (error: any) { addToast("Erro ao cadastrar docente: " + error.message, 'error'); }
  };

  const handleToggleShift = (shift: string) => {
      if (newStudentShifts.includes(shift)) { setNewStudentShifts(newStudentShifts.filter(s => s !== shift)); } else { setNewStudentShifts([...newStudentShifts, shift]); }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newStudentName.trim() || !newStudentEmail.trim() || !newStudentPwd.trim()) { addToast("Por favor, preencha Nome, Email e Senha.", 'error'); return; }
      if (!newStudentCourse) { addToast("Por favor, selecione um Curso para o estudante.", 'error'); return; }
      if (newStudentShifts.length === 0) { addToast("Selecione pelo menos um turno.", 'error'); return; }
      
      // Determine class groups: Either selected from buttons OR manual input
      let finalClassGroups = newStudentClassGroups;
      if (finalClassGroups.length === 0 && newStudentClassGroupsInput.trim()) {
          finalClassGroups = newStudentClassGroupsInput.split(',').map(s => s.trim()).filter(s => s.length > 0);
      }

      try {
          await BackendService.addStudent(institutionId, newStudentName, newStudentEmail, newStudentPwd, newStudentCourse, newStudentLevel, newStudentAvatar, newStudentShifts, finalClassGroups, newStudentSemester, newStudentModality);
          setNewStudentName(''); setNewStudentEmail(''); setNewStudentPwd(''); setNewStudentCourse(''); setNewStudentLevel(''); setNewStudentAvatar(''); setNewStudentClassGroups([]); setNewStudentClassGroupsInput(''); setNewStudentShifts([]); setNewStudentSemester('1'); setNewStudentModality('Presencial');
          await loadData(); addToast(`Estudante cadastrado com sucesso!`, 'success');
      } catch (error: any) { addToast("Erro ao cadastrar estudante: " + error.message, 'error'); }
  };

  const handleEvalChange = (teacherId: string, field: 'deadlines' | 'quality' | 'comments', value: string) => {
    const isNumber = field !== 'comments';
    const finalValue = isNumber ? parseFloat(value) || 0 : value;
    setQualEvals(prev => ({ ...prev, [teacherId]: { ...prev[teacherId], [field]: finalValue as any } }));
  };

  const handleSaveQualitative = async (teacherId: string) => {
    const evalData = qualEvals[teacherId];
    if (!evalData) return;
    
    try {
        await BackendService.saveQualitativeEval({ 
            teacherId, 
            institutionId, 
            deadlineCompliance: evalData.deadlines, 
            workQuality: evalData.quality, 
            comments: evalData.comments, 
            evaluatedAt: new Date().toISOString() 
        });
        
        // Recalcular scores para este docente para refletir a nova avaliação institucional
        await BackendService.calculateScores(institutionId, teacherId);
        const updatedScores = await BackendService.getAllScores(institutionId);
        setAllScores(updatedScores);
        
        setExpandedTeacher(null); 
        addToast("Avaliação qualitativa salva e score atualizado com sucesso.", 'success');
    } catch (error: any) {
        addToast("Erro ao salvar avaliação: " + error.message, 'error');
    }
  };

  const handleAddQuestion = async () => {
      if (!newQText) return;

      if (editingQuestionId) {
          // Update existing question
          const updatedQuestions = questionnaire?.questions.map(q => {
              if (q.id === editingQuestionId) {
                  return {
                      ...q,
                      text: newQText,
                      type: newQType,
                      weight: newQType === 'text' ? 0 : newQWeight,
                      options: newQType === 'choice' ? newQOptions.split(',').map(o => o.trim()) : undefined
                  };
              }
              return q;
          }) || [];
          
          const updatedQ: Questionnaire = questionnaire ? { ...questionnaire, questions: updatedQuestions } : { ...questionnaire!, questions: updatedQuestions };
          setQuestionnaire(updatedQ);
          await BackendService.saveQuestionnaire(updatedQ);
          
          setEditingQuestionId(null);
          setNewQText(''); setNewQOptions(''); setNewQWeight(1);
          addToast("Pergunta atualizada com sucesso!", 'success');
      } else {
          const newQuestion: Question = { id: `q_${Date.now()}`, text: newQText, type: newQType, weight: newQType === 'text' ? 0 : newQWeight, options: newQType === 'choice' ? newQOptions.split(',').map(o => o.trim()) : undefined };
          const currentQuestions = questionnaire?.questions || [];
          const updatedQuestions = [...currentQuestions, newQuestion];
          const updatedQ: Questionnaire = questionnaire ? { ...questionnaire, questions: updatedQuestions } : { id: `q_${institutionId}_student`, institutionId, title: 'Avaliação de Desempenho Docente (Estudantes)', active: true, questions: updatedQuestions, targetRole: 'student' };
          setQuestionnaire(updatedQ);
          await BackendService.saveQuestionnaire(updatedQ);
          setNewQText(''); setNewQOptions(''); setNewQWeight(1);
          addToast("Pergunta adicionada com sucesso!", 'success');
      }
  };

  const handleEditQuestion = (q: Question) => {
      setEditingQuestionId(q.id);
      setNewQText(q.text);
      setNewQType(q.type);
      setNewQWeight(q.weight || 1);
      setNewQOptions(q.options ? q.options.join(', ') : '');
  };

  const handleCancelEdit = () => {
      setEditingQuestionId(null);
      setNewQText('');
      setNewQOptions('');
      setNewQWeight(1);
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
    try { 
        await BackendService.updateInstitution(institution.id, { 
            name: institution.name, 
            logo: institution.logo,
            isEvaluationOpen: institution.isEvaluationOpen,
            evaluationStartDate: institution.evaluationStartDate,
            evaluationEndDate: institution.evaluationEndDate
        }); 
        addToast("Dados da instituição atualizados com sucesso!", 'success'); 
    } catch (e: any) { addToast("Erro ao atualizar: " + e.message, 'error'); }
  };

  const handleInstLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && institution) {
          if (file.size > 500 * 1024) return addToast("Logotipo muito grande. O limite é 500KB.", 'error');
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
        const maxSelf = teacher.category === 'assistente_estagiario' ? 125 : 175;
        return { teacherId: teacher.id, teacherName: teacher.name, teacherEmail: teacher.email, teacherCategory: teacher.category || 'N/A', teacherJob: teacher.jobTitle || 'Docente', hasScore, selfEvalScore: score?.selfEvalScore || maxSelf, studentScore: score?.studentScore || 0, institutionalScore: score?.institutionalScore || 0, finalScore: score?.finalScore || 0, subjectDetails: score?.subjectDetails || [], val20, classification: hasScore ? getAppreciation(val20) : 'Pendente' };
    }).sort((a, b) => b.finalScore - a.finalScore);
  }, [allScores, teachers]);

  const handlePrintReport = (teacher: User) => {
      const score = allScores.find(s => s.teacherId === teacher.id); const selfEval = allSelfEvals[teacher.id];
      if (!score) { addToast("Este docente ainda não tem uma pontuação final calculada.", 'error'); return; }
      setPrintingTeacher(teacher); setPrintingScore(score); setPrintingSelfEval(selfEval || null); setTimeout(() => { window.print(); }, 100);
  };
  const handlePrintStats = () => { window.print(); };

  const handleExportCSV = () => {
    if (fullReportData.length === 0) {
        addToast("Não há dados para exportar.", 'error');
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

  // Helper para obter o objeto do curso selecionado
  const selectedCourseObj = useMemo(() => {
      return courses.find(c => c.name === newStudentCourse);
  }, [newStudentCourse, courses]);

  // Helper para o Subject Builder do Professor
  const tempSubjectCourseObj = useMemo(() => {
      // Prefer ID match, fallback to name match
      if (tempSubject.courseId) {
          return courses.find(c => c.id === tempSubject.courseId);
      }
      return courses.find(c => c.name === tempSubject.course);
  }, [tempSubject.course, tempSubject.courseId, courses]);

  const availableSubjectsForTeacher = useMemo(() => {
      if (!tempSubject.course && !tempSubject.courseId) return [];
      
      let filtered = subjects.filter(s => {
          if (tempSubject.courseId && s.courseId) {
              return s.courseId === tempSubject.courseId;
          }
          // Fallback to name match if IDs missing
          return s.course === tempSubject.course;
      });

      if (tempSubject.classGroup) {
          // Allow subjects with matching classGroup OR subjects with no classGroup (generic)
          filtered = filtered.filter(s => !s.classGroup || s.classGroup === tempSubject.classGroup);
      }
      return filtered;
  }, [subjects, tempSubject.course, tempSubject.courseId, tempSubject.classGroup]);

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* ... (Previous code remains unchanged) ... */}
      
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
                        <Button onClick={() => window.print()} className="bg-blue-600 text-white hover:bg-blue-700"><Printer className="mr-2 h-4 w-4"/> Imprimir Respostas</Button>
                        <Button variant="outline" onClick={() => setViewingCommentsFor(null)}><X className="mr-2 h-4 w-4"/> Fechar</Button>
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
                    <div className="text-center py-12 text-gray-400 italic border-2 border-dashed rounded-lg">Nenhum comentário textual foi registrado para este docente ainda.</div>
                ) : (
                    <div className="space-y-8">
                        {teacherComments.map((group, idx) => (
                            <div key={idx} className="break-inside-avoid">
                                <div className="bg-gray-100 p-3 rounded-t-lg border border-gray-300 font-bold text-gray-800 flex justify-between items-center">
                                    <span>{group.subjectName}</span>
                                    <span className="text-xs font-normal bg-white px-2 py-1 rounded border">Turma {group.classGroup} • {group.shift}</span>
                                </div>
                                <div className="border border-t-0 border-gray-300 rounded-b-lg p-4 bg-white">
                                    <ul className="list-disc pl-5 space-y-2">
                                        {group.comments.map((comment, cIdx) => (
                                            <li key={cIdx} className="text-sm text-gray-800 leading-relaxed pl-1">{comment}</li>
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

      {/* --- EDIT USER MODAL --- */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader>
                    <CardTitle>Editar Usuário</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSaveEditUser} className="space-y-4">
                        <div className="space-y-2"><Label>Nome Completo</Label><Input value={editName} onChange={e => setEditName(e.target.value)} /></div>
                        <div className="space-y-2"><Label>Email Institucional</Label><Input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} /></div>
                        <div className="space-y-2"><Label>Função/Cargo (Job Title)</Label><Input value={editJobTitle} onChange={e => setEditJobTitle(e.target.value)} placeholder="Ex: Diretor, Regente, Docente..." /></div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="ghost" onClick={() => setEditingUser(null)}>Cancelar</Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Salvar Alterações</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
      )}
      
      {/* --- REPORT PREVIEW MODAL --- */}
      {previewingReportFor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                <CardHeader className="bg-slate-900 text-white flex flex-row items-center justify-between border-b-0">
                    <div>
                        <CardTitle className="text-xl">Relatório de Desempenho Docente</CardTitle>
                        <p className="text-xs text-slate-400">Visualização prévia do documento final</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setPreviewingReportFor(null)} className="text-white hover:bg-white/10">
                        <X size={20} />
                    </Button>
                </CardHeader>
                <CardContent className="p-0 overflow-y-auto bg-gray-100">
                    <div className="p-8 md:p-12 max-w-[210mm] mx-auto bg-white shadow-lg my-8 min-h-[297mm] font-serif text-slate-900 border border-gray-200 relative">
                        {/* Marca d'água de Pré-visualização */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-45deg] select-none">
                            <span className="text-9xl font-black uppercase">Rascunho</span>
                        </div>

                        {/* Header do Relatório */}
                        <div className="flex justify-between items-start mb-10 relative z-10">
                            <div className="text-center flex-1 pr-8">
                                {institution?.logo && <img src={institution.logo} className="h-24 w-24 object-contain mx-auto mb-3" alt="Logo"/>}
                                <h1 className="font-bold text-xl uppercase tracking-widest leading-tight">{institution?.name}</h1>
                                <div className="h-1 w-20 bg-slate-900 mx-auto my-2"></div>
                                <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Direção Geral • Divisão Pedagógica</p>
                            </div>
                            <div className="border-2 border-slate-900 p-4 w-72 text-center bg-slate-50">
                                <p className="font-bold text-[11px] uppercase mb-6 border-b border-slate-900 pb-1">Despacho de Homologação</p>
                                <div className="h-12 border-b border-dashed border-slate-400 mb-2"></div>
                                <p className="text-[10px] font-bold">O Director Geral</p>
                                <div className="mt-6 text-left">
                                    <p className="text-[10px]">Data: ____ / ____ / {new Date().getFullYear()}</p>
                                </div>
                            </div>
                        </div>

                        <div className="text-center mb-12 relative z-10">
                            <h2 className="text-2xl font-black border-y-2 border-slate-900 py-3 uppercase tracking-[0.2em] bg-slate-50">Folha de Classificação Anual</h2>
                            <p className="text-sm font-bold mt-3 text-slate-600">Exercício Académico: {new Date().getFullYear()}</p>
                        </div>

                        {/* Dados do Docente */}
                        <div className="grid grid-cols-2 gap-8 mb-10 text-sm relative z-10 bg-slate-50 p-6 rounded-lg border border-slate-200">
                            <div className="space-y-3">
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Nome Completo</span>
                                    <span className="font-bold text-base">{previewingReportFor.name}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Categoria Académica</span>
                                    <span className="font-medium">{previewingReportFor.category === 'assistente' ? 'Assistente' : 'Assistente Estagiário'}</span>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Função / Cargo</span>
                                    <span className="font-medium">{previewingReportFor.jobTitle || 'Docente'}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Contacto Institucional</span>
                                    <span className="font-medium">{previewingReportFor.email}</span>
                                </div>
                            </div>
                        </div>

                        {/* Tabela de Pontuação */}
                        <div className="mb-12 relative z-10">
                            <h3 className="text-xs font-black uppercase mb-3 flex items-center gap-2">
                                <div className="w-1.5 h-4 bg-slate-900"></div>
                                Discriminação da Pontuação Ponderada
                            </h3>
                            <table className="w-full border-collapse border-2 border-slate-900 shadow-sm">
                                <thead>
                                    <tr className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
                                        <th className="border border-slate-700 p-4 text-left">Componente de Avaliação</th>
                                        <th className="border border-slate-700 p-4 text-center w-28">Peso</th>
                                        <th className="border border-slate-700 p-4 text-center w-32">Pontos Brutos</th>
                                        <th className="border border-slate-700 p-4 text-center w-32">Pontuação Final</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {(() => {
                                        const score = allScores.find(s => s.teacherId === previewingReportFor.id);
                                        const qual = qualEvals[previewingReportFor.id] || { deadlines: 0, quality: 0 };
                                        const instScore = (qual.deadlines + qual.quality) / 2;
                                        
                                        const maxSelf = previewingReportFor.category === 'assistente_estagiario' ? 125 : 175;
                                        const displaySelf = score?.selfEvalScore || maxSelf;
                                        const displayStudent = score?.studentScore || 0;
                                        const displayInst = instScore || 0;
                                        
                                        const selfPoints = (displaySelf / maxSelf) * 80;
                                        const studentPoints = (displayStudent / 20) * 12;
                                        const instPoints = (displayInst / 10) * 8;
                                        const final = selfPoints + studentPoints + instPoints;

                                        return (
                                            <>
                                                <tr className="hover:bg-slate-50">
                                                    <td className="border border-slate-900 p-4 font-medium">Auto-avaliação Docente</td>
                                                    <td className="border border-slate-900 p-4 text-center font-bold">80%</td>
                                                    <td className="border border-slate-900 p-4 text-center text-slate-500">{displaySelf.toFixed(1)} / {maxSelf}</td>
                                                    <td className="border border-slate-900 p-4 text-center font-black text-slate-900">{selfPoints.toFixed(1)}</td>
                                                </tr>
                                                <tr className="hover:bg-slate-50">
                                                    <td className="border border-slate-900 p-4 font-medium">Avaliação pelo Corpo Discente</td>
                                                    <td className="border border-slate-900 p-4 text-center font-bold">12%</td>
                                                    <td className="border border-slate-900 p-4 text-center text-slate-500">{displayStudent.toFixed(1)} / 20</td>
                                                    <td className="border border-slate-900 p-4 text-center font-black text-slate-900">{studentPoints.toFixed(1)}</td>
                                                </tr>
                                                <tr className="hover:bg-slate-50">
                                                    <td className="border border-slate-900 p-4 font-medium">Avaliação Institucional (Gestão)</td>
                                                    <td className="border border-slate-900 p-4 text-center font-bold">8%</td>
                                                    <td className="border border-slate-900 p-4 text-center text-slate-500">{displayInst.toFixed(1)} / 10</td>
                                                    <td className="border border-slate-900 p-4 text-center font-black text-slate-900">{instPoints.toFixed(1)}</td>
                                                </tr>
                                                <tr className="bg-slate-900 text-white font-black text-xl">
                                                    <td className="border border-slate-900 p-5 uppercase tracking-widest" colSpan={3}>Classificação Final (0-100)</td>
                                                    <td className="border border-slate-900 p-5 text-center bg-blue-600">{final.toFixed(1)}</td>
                                                </tr>
                                            </>
                                        );
                                    })()}
                                </tbody>
                            </table>
                            <div className="mt-4 flex justify-between items-center px-2">
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Excelente (≥90)</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-green-600"></div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Bom (70-89)</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-amber-600"></div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Suficiente (50-69)</span>
                                    </div>
                                </div>
                                <p className="text-[10px] italic text-slate-400">* Cálculo baseado no Regulamento de Avaliação de Desempenho.</p>
                            </div>
                        </div>

                        {/* Observações */}
                        <div className="mb-12 relative z-10">
                            <h3 className="text-xs font-black uppercase mb-3 flex items-center gap-2">
                                <div className="w-1.5 h-4 bg-slate-900"></div>
                                Parecer Qualitativo da Direção
                            </h3>
                            <div className="min-h-[180px] p-6 border-2 border-slate-200 rounded-lg italic text-sm text-slate-700 leading-relaxed bg-slate-50 relative">
                                <Quote className="absolute top-4 left-4 text-slate-200" size={40} />
                                <div className="relative z-10 pl-8">
                                    {qualEvals[previewingReportFor.id]?.comments || "Nenhuma observação ou feedback qualitativo foi registrado para este docente até o momento."}
                                </div>
                            </div>
                        </div>

                        {/* Assinaturas */}
                        <div className="mt-24 grid grid-cols-2 gap-24 text-center text-[11px] font-bold uppercase relative z-10">
                            <div className="space-y-1">
                                <div className="border-t-2 border-slate-900 pt-3">
                                    <p>O Docente Avaliado</p>
                                </div>
                                <p className="font-normal italic text-[10px] text-slate-500 lowercase">Assinatura e Data</p>
                            </div>
                            <div className="space-y-1">
                                <div className="border-t-2 border-slate-900 pt-3">
                                    <p>O Chefe de Departamento / Direção</p>
                                </div>
                                <p className="font-normal italic text-[10px] text-slate-500 lowercase">Carimbo e Assinatura</p>
                            </div>
                        </div>
                        
                        <div className="mt-20 text-center text-[9px] text-slate-400 border-t border-slate-100 pt-4">
                            Documento gerado eletronicamente pelo Sistema de Gestão de Avaliação Docente • {institution?.name} • {new Date().toLocaleDateString()}
                        </div>
                    </div>
                </CardContent>
                <CardHeader className="bg-white border-t flex flex-row items-center justify-end gap-3 p-6">
                    <Button variant="ghost" onClick={() => setPreviewingReportFor(null)} className="text-slate-500">Cancelar</Button>
                    <Button className="bg-slate-900 hover:bg-slate-800 text-white gap-2 px-8 shadow-lg" onClick={() => handlePrintReport(previewingReportFor)}>
                        <Printer size={18} /> Gerar PDF / Imprimir
                    </Button>
                </CardHeader>
            </Card>
        </div>
      )}
      <div className="hidden print:block font-serif text-slate-900 bg-white">
        {printingTeacher && printingScore ? (
            <div className="p-12 min-h-screen flex flex-col">
                <header className="flex justify-between items-start mb-12">
                    <div className="text-center flex-1 pr-8">
                        {institution?.logo && <img src={institution.logo} className="h-24 w-24 object-contain mx-auto mb-3" alt="Logo"/>}
                        <h1 className="font-bold text-xl uppercase tracking-widest leading-tight">{institution?.name}</h1>
                        <div className="h-1 w-20 bg-slate-900 mx-auto my-2"></div>
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Direção Geral • Divisão Pedagógica</p>
                    </div>
                    <div className="border-2 border-slate-900 p-4 w-72 text-center bg-slate-50">
                        <p className="font-bold text-[11px] uppercase mb-6 border-b border-slate-900 pb-1">Despacho de Homologação</p>
                        <div className="h-12 border-b border-dashed border-slate-400 mb-2"></div>
                        <p className="text-[10px] font-bold">O Director Geral</p>
                        <div className="mt-6 text-left">
                            <p className="text-[10px]">Data: ____ / ____ / {new Date().getFullYear()}</p>
                        </div>
                    </div>
                </header>

                <div className="text-center mb-12">
                    <h2 className="text-2xl font-black border-y-2 border-slate-900 py-3 uppercase tracking-[0.2em] bg-slate-50">Folha de Classificação Anual</h2>
                    <p className="text-sm font-bold mt-3 text-slate-600">Exercício Académico: {new Date().getFullYear()}</p>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-10 text-sm bg-slate-50 p-6 rounded-lg border border-slate-200">
                    <div className="space-y-3">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Nome Completo</span>
                            <span className="font-bold text-base">{printingTeacher.name}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Categoria Académica</span>
                            <span className="font-medium">{printingTeacher.category === 'assistente' ? 'Assistente' : 'Assistente Estagiário'}</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Função / Cargo</span>
                            <span className="font-medium">{printingTeacher.jobTitle || 'Docente'}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Contacto Institucional</span>
                            <span className="font-medium">{printingTeacher.email}</span>
                        </div>
                    </div>
                </div>

                <div className="mb-12">
                    <h3 className="text-xs font-black uppercase mb-3 flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-slate-900"></div>
                        Discriminação da Pontuação Ponderada
                    </h3>
                    <table className="w-full border-collapse border-2 border-slate-900">
                        <thead>
                            <tr className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
                                <th className="border border-slate-700 p-4 text-left">Componente de Avaliação</th>
                                <th className="border border-slate-700 p-4 text-center w-28">Peso</th>
                                <th className="border border-slate-700 p-4 text-center w-32">Pontos Brutos</th>
                                <th className="border border-slate-700 p-4 text-center w-32">Pontuação Final</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {(() => {
                                const maxSelf = printingTeacher.category === 'assistente_estagiario' ? 125 : 175;
                                const selfPoints = ((printingScore.selfEvalScore || maxSelf) / maxSelf) * 80;
                                const studentPoints = (printingScore.studentScore / 20) * 12;
                                const instPoints = (printingScore.institutionalScore / 10) * 8;

                                return (
                                    <>
                                        <tr>
                                            <td className="border border-slate-900 p-4 font-medium">Auto-avaliação Docente</td>
                                            <td className="border border-slate-900 p-4 text-center font-bold">80%</td>
                                            <td className="border border-slate-900 p-4 text-center text-slate-500">{(printingScore.selfEvalScore || maxSelf).toFixed(1)} / {maxSelf}</td>
                                            <td className="border border-slate-900 p-4 text-center font-black">{selfPoints.toFixed(1)}</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-900 p-4 font-medium">Avaliação pelo Corpo Discente</td>
                                            <td className="border border-slate-900 p-4 text-center font-bold">12%</td>
                                            <td className="border border-slate-900 p-4 text-center text-slate-500">{printingScore.studentScore.toFixed(1)} / 20</td>
                                            <td className="border border-slate-900 p-4 text-center font-black">{studentPoints.toFixed(1)}</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-900 p-4 font-medium">Avaliação Institucional (Gestão)</td>
                                            <td className="border border-slate-900 p-4 text-center font-bold">8%</td>
                                            <td className="border border-slate-900 p-4 text-center text-slate-500">{printingScore.institutionalScore.toFixed(1)} / 10</td>
                                            <td className="border border-slate-900 p-4 text-center font-black">{instPoints.toFixed(1)}</td>
                                        </tr>
                                        <tr className="bg-slate-900 text-white font-black text-xl">
                                            <td className="border border-slate-900 p-5 uppercase tracking-widest" colSpan={3}>Classificação Final (0-100)</td>
                                            <td className="border border-slate-900 p-5 text-center">{printingScore.finalScore.toFixed(1)}</td>
                                        </tr>
                                    </>
                                );
                            })()}
                        </tbody>
                    </table>
                </div>

                <div className="mb-12">
                    <h3 className="text-xs font-black uppercase mb-3 flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-slate-900"></div>
                        Parecer Qualitativo da Direção
                    </h3>
                    <div className="min-h-[180px] p-6 border-2 border-slate-200 rounded-lg italic text-sm text-slate-700 leading-relaxed bg-slate-50">
                        {qualEvals[printingTeacher.id]?.comments || "Nenhuma observação ou feedback qualitativo foi registrado para este docente até o momento."}
                    </div>
                </div>

                <div className="mt-auto grid grid-cols-2 gap-24 text-center text-[11px] font-bold uppercase">
                    <div className="space-y-1">
                        <div className="border-t-2 border-slate-900 pt-3">
                            <p>O Docente Avaliado</p>
                        </div>
                        <p className="font-normal italic text-[10px] text-slate-500 lowercase">Assinatura e Data</p>
                    </div>
                    <div className="space-y-1">
                        <div className="border-t-2 border-slate-900 pt-3">
                            <p>O Chefe de Departamento / Direção</p>
                        </div>
                        <p className="font-normal italic text-[10px] text-slate-500 lowercase">Carimbo e Assinatura</p>
                    </div>
                </div>
                
                <div className="mt-12 text-center text-[9px] text-slate-400 border-t border-slate-100 pt-4">
                    Documento gerado eletronicamente pelo Sistema de Gestão de Avaliação Docente • {institution?.name} • {new Date().toLocaleDateString()}
                </div>
            </div>
        ) : null}
      </div>

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
                        <Button variant={activeTab === 'qualitative' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('qualitative')} className="gap-2"><Award size={16} /> Avaliação Qualitativa</Button>
                        <Button variant={activeTab === 'stats' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('stats')} className="gap-2"><ListChecks size={16} /> Relatórios</Button>
                        <Button variant={activeTab === 'courses' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('courses')} className="gap-2"><BookOpen size={16} /> Cursos</Button>
                        <Button variant={activeTab === 'teachers' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('teachers')} className="gap-2"><Users size={16} /> Docentes</Button>
                        <Button variant={activeTab === 'students' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('students')} className="gap-2"><GraduationCap size={16} /> Estudantes</Button>
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
                        <button onClick={() => {setActiveTab('qualitative'); setIsMobileMenuOpen(false)}} className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'qualitative' ? 'bg-slate-900 text-white' : 'hover:bg-gray-100 text-gray-700'}`}><Award size={18} /> Avaliação Qualitativa</button>
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

        {activeTab === 'qualitative' && (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="text-blue-600" />
                            Avaliação Qualitativa dos Docentes
                        </CardTitle>
                        <p className="text-sm text-gray-500">Atribua notas de desempenho institucional e comentários para cada docente.</p>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {teachers.map(t => {
                                const evalData = qualEvals[t.id] || { deadlines: 0, quality: 0, comments: '' };
                                const isExpanded = expandedTeacher === t.id;
                                const hasEvaluation = evalData.deadlines > 0 || evalData.quality > 0 || evalData.comments.length > 0;

                                return (
                                    <div key={t.id} className="border rounded-xl overflow-hidden bg-white shadow-sm transition-all hover:shadow-md">
                                        <div 
                                            className={cn(
                                                "p-4 flex items-center justify-between cursor-pointer select-none",
                                                isExpanded ? "bg-slate-50 border-b" : "hover:bg-gray-50"
                                            )}
                                            onClick={() => setExpandedTeacher(isExpanded ? null : t.id)}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 border-2 border-white shadow-sm">
                                                    {t.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800">{t.name}</h4>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-slate-500">{t.jobTitle || 'Docente'}</span>
                                                        <span className={cn(
                                                            "text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider",
                                                            hasEvaluation ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                                                        )}>
                                                            {hasEvaluation ? 'Avaliado' : 'Pendente'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {hasEvaluation && (
                                                    <div className="hidden sm:flex flex-col items-end mr-4">
                                                        <span className="text-[10px] text-slate-400 uppercase font-bold">Média Inst.</span>
                                                        <span className="text-lg font-black text-blue-600 leading-none">
                                                            {((evalData.deadlines + evalData.quality) / 2).toFixed(1)}
                                                        </span>
                                                    </div>
                                                )}
                                                {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="p-6 bg-white space-y-6 animate-in slide-in-from-top-2 duration-300">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-end">
                                                            <Label className="text-slate-700 font-bold flex items-center gap-2">
                                                                <RotateCcw size={14} className="text-blue-500" />
                                                                Cumprimento de Prazos (0-10)
                                                            </Label>
                                                            <span className="text-2xl font-black text-blue-600">{evalData.deadlines}</span>
                                                        </div>
                                                        <input 
                                                            type="range" min="0" max="10" step="1"
                                                            value={evalData.deadlines}
                                                            onChange={e => setQualEvals({...qualEvals, [t.id]: {...evalData, deadlines: parseInt(e.target.value)}})}
                                                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                        />
                                                        <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                                                            <span>Insuficiente</span>
                                                            <span>Excelente</span>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-end">
                                                            <Label className="text-slate-700 font-bold flex items-center gap-2">
                                                                <Award size={14} className="text-purple-500" />
                                                                Qualidade Pedagógica (0-10)
                                                            </Label>
                                                            <span className="text-2xl font-black text-purple-600">{evalData.quality}</span>
                                                        </div>
                                                        <input 
                                                            type="range" min="0" max="10" step="1"
                                                            value={evalData.quality}
                                                            onChange={e => setQualEvals({...qualEvals, [t.id]: {...evalData, quality: parseInt(e.target.value)}})}
                                                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                                        />
                                                        <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                                                            <span>Insuficiente</span>
                                                            <span>Excelente</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-slate-700 font-bold flex items-center gap-2">
                                                        <MessageSquare size={14} className="text-slate-500" />
                                                        Observações e Feedback da Gestão
                                                    </Label>
                                                    <textarea 
                                                        className="w-full min-h-[120px] p-4 border rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm leading-relaxed"
                                                        placeholder="Descreva o desempenho do docente, pontos fortes e áreas de melhoria..."
                                                        value={evalData.comments}
                                                        onChange={e => setQualEvals({...qualEvals, [t.id]: {...evalData, comments: e.target.value}})}
                                                    />
                                                </div>

                                                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
                                                    <Button 
                                                        variant="outline" 
                                                        className="gap-2"
                                                        onClick={() => setPreviewingReportFor(t)}
                                                    >
                                                        <Eye size={16} /> Pré-visualizar Relatório
                                                    </Button>
                                                    <Button 
                                                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-md"
                                                        onClick={() => handleSaveQualitative(t.id)}
                                                    >
                                                        <Save size={16} /> Salvar Avaliação
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}
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
                        <div className={`p-3 rounded-full mb-3 ${institution?.isEvaluationOpen ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {institution?.isEvaluationOpen ? <CheckCircle2 size={24} /> : <Lock size={24} />}
                        </div>
                        <h3 className="text-xl font-bold">{institution?.isEvaluationOpen ? 'Aberto' : 'Fechado'}</h3>
                        <p className="text-sm text-gray-500 mb-2">Período de Avaliação</p>
                        <div className="flex items-center gap-2 mt-2">
                            <Switch 
                                checked={institution?.isEvaluationOpen || false}
                                onCheckedChange={async (checked) => {
                                    if(!institution) return;
                                    const updated = {...institution, isEvaluationOpen: checked};
                                    setInstitution(updated);
                                    try {
                                        await BackendService.updateInstitution(institution.id, { isEvaluationOpen: checked });
                                        addToast(checked ? "Período de avaliação aberto!" : "Período de avaliação fechado.", 'success');
                                    } catch(e: any) {
                                        addToast("Erro ao atualizar status: " + e.message, 'error');
                                        setInstitution({...institution, isEvaluationOpen: !checked});
                                    }
                                }}
                            />
                            <span className="text-xs font-medium text-gray-600">{institution?.isEvaluationOpen ? 'Fechar' : 'Abrir'}</span>
                        </div>
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
                                            <Button size="sm" onClick={() => handleSaveQualitative(t.id)} className="w-full">
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
        
        {/* ... (Stats, Evaluations, Courses content unchanged) ... */}
        {activeTab === 'stats' && (
             <div className="space-y-6">
                 {/* ... Stats Content ... */}
                 <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-4 rounded-lg shadow-sm border">
                    <div>
                        <h2 className="text-lg font-bold">Relatórios e Resultados Finais</h2>
                        <p className="text-sm text-gray-500">Consulte a pauta, exporte para Excel ou imprima relatórios oficiais.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={handleExportCSV} className="text-green-700 hover:text-green-800 hover:bg-green-50 border-green-200"><FileSpreadsheet className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Exportar Excel</span></Button>
                        <Button onClick={handleDownloadDetailedPDF} className="bg-red-600 hover:bg-red-700 text-white"><FileText className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Baixar PDF</span></Button>
                        <Button variant="ghost" onClick={handlePrintStats} className="text-gray-600"><Printer className="h-4 w-4" /></Button>
                    </div>
                 </div>
                 
                 <Card className="hidden md:block">
                    <CardHeader><CardTitle>Pauta Geral (Todos os Docentes)</CardTitle></CardHeader>
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
                                    <tr><td colSpan={8} className="p-8 text-center text-gray-500 italic">Nenhum docente cadastrado na instituição.</td></tr>
                                ) : fullReportData.map(score => {
                                    const isExpanded = expandedDetails === score.teacherId;
                                    return (
                                        <React.Fragment key={score.teacherId}>
                                            <tr className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4"><div className="font-medium text-gray-900">{score.teacherName}</div><div className="text-xs text-gray-500">{score.teacherEmail}</div></td>
                                                <td className="p-4 text-gray-600 capitalize">{score.teacherCategory.replace('_', ' ')}</td>
                                                {score.hasScore ? (
                                                    <>
                                                        <td className="p-4 text-center">{score.selfEvalScore.toFixed(1)}</td>
                                                        <td className="p-4 text-center">{score.studentScore.toFixed(1)}</td>
                                                        <td className="p-4 text-center">{score.institutionalScore.toFixed(1)}</td>
                                                        <td className="p-4 text-center font-bold text-base">{score.finalScore.toFixed(1)}</td>
                                                        <td className="p-4 text-center">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${score.val20 >= 14 ? 'bg-green-100 text-green-800' : score.val20 >= 10 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{score.classification}</span>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <td colSpan={5} className="p-4 text-center text-gray-400 italic bg-gray-50/50">Aguardando cálculo...</td>
                                                )}
                                                
                                                <td className="p-4 text-center flex items-center justify-center gap-2">
                                                    {score.hasScore && (
                                                        <>
                                                            <Button variant="ghost" size="sm" title="Ver Detalhes" onClick={() => setExpandedDetails(isExpanded ? null : score.teacherId)}>{isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</Button>
                                                            <Button variant="ghost" size="sm" title="Imprimir Relatório" onClick={() => { const user = teachers.find(t => t.id === score.teacherId); if (user) handlePrintReport(user); }}><Printer className="h-4 w-4 text-gray-400 hover:text-black"/></Button>
                                                            <Button variant="ghost" size="sm" title="Ver Respostas dos Alunos" onClick={() => { const user = teachers.find(t => t.id === score.teacherId); if (user) handleViewComments(user); }}><MessageSquare className="h-4 w-4 text-blue-500 hover:text-blue-700"/></Button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                            {isExpanded && score.subjectDetails && score.subjectDetails.length > 0 && (
                                                <tr className="bg-blue-50/50 animate-in fade-in">
                                                    <td colSpan={8} className="p-4">
                                                        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                                                            <div className="bg-blue-50 px-4 py-2 text-xs font-bold text-blue-800 uppercase tracking-wide border-b border-blue-100">Detalhamento por Disciplina</div>
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
                                                                            <td className="p-2 text-center">{det.shift === 'Diurno' ? 'Laboral' : 'Pós-Laboral'}</td>
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

        {activeTab === 'evaluations' && (
             // ... Evaluations Content ...
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div className="flex bg-white p-1 rounded-lg border shadow-sm">
                        <button onClick={() => setEvalTabMode('student')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${evalTabMode === 'student' ? 'bg-slate-900 text-white shadow' : 'text-gray-500 hover:text-gray-900'}`}>Inquérito ao Estudante</button>
                        <button onClick={() => setEvalTabMode('teacher')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${evalTabMode === 'teacher' ? 'bg-slate-900 text-white shadow' : 'text-gray-500 hover:text-gray-900'}`}>Ficha de Auto-Avaliação</button>
                    </div>
                    <Button onClick={() => setPreviewMode(evalTabMode)} className="bg-white text-slate-900 border hover:bg-gray-50"><Eye className="mr-2 h-4 w-4"/> Pré-visualizar Modelo</Button>
                </div>

                {evalTabMode === 'student' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-4">
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
                                            <div className="absolute top-2 right-2 flex gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => handleEditQuestion(q)} className="text-gray-400 hover:text-blue-500"><Edit size={16}/></Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleRemoveQuestion(q.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></Button>
                                            </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t">
                                            <div className="opacity-60 pointer-events-none scale-95 origin-left">{renderPreviewInput(q)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <Card className="sticky top-24">
                                <CardHeader><CardTitle>{editingQuestionId ? 'Editar Pergunta' : 'Adicionar Pergunta'}</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2"><Label>Texto da Pergunta</Label><Input value={newQText} onChange={e => setNewQText(e.target.value)} placeholder="Ex: O docente foi pontual?" /></div>
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
                                        <div className="space-y-2"><Label>Opções (separadas por vírgula)</Label><Input value={newQOptions} onChange={e => setNewQOptions(e.target.value)} placeholder="Opção A, Opção B, Opção C"/></div>
                                    )}
                                    <div className="flex gap-2">
                                        {editingQuestionId && <Button variant="outline" onClick={handleCancelEdit} className="w-full">Cancelar</Button>}
                                        <Button onClick={handleAddQuestion} className="w-full">{editingQuestionId ? 'Atualizar Pergunta' : 'Adicionar ao Inquérito'}</Button>
                                    </div>
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
                                    <Button variant="outline" size="sm" onClick={handleResetSelfEvalDefaults} className="border-blue-300 text-blue-800 hover:bg-blue-100"><RotateCcw className="mr-2 h-4 w-4"/> Restaurar Padrão</Button>
                                    <Button onClick={saveSelfEvalChanges} className="bg-blue-700 hover:bg-blue-800 text-white whitespace-nowrap"><Save className="mr-2 h-4 w-4"/> Salvar Alterações</Button>
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
                                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteItemFromGroup(group.id, item.key)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></Button>
                                                    <div className="space-y-1"><Label className="text-xs text-gray-400 uppercase">Título do Item</Label><Input value={item.label} onChange={(e) => handleUpdateSelfEvalTemplate(group.id, item.key, 'label', e.target.value)} className="h-8 font-medium" /></div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="space-y-1"><Label className="text-xs text-gray-400 uppercase">Descrição</Label><Input value={item.description} onChange={(e) => handleUpdateSelfEvalTemplate(group.id, item.key, 'description', e.target.value)} className="h-8 text-sm text-gray-600" /></div>
                                                        <div className="space-y-1"><Label className="text-xs text-gray-400 uppercase">Valor (Pontos)</Label><Input type="number" value={item.scoreValue} onChange={(e) => handleUpdateSelfEvalTemplate(group.id, item.key, 'scoreValue', parseFloat(e.target.value))} className="h-8 text-sm text-gray-600" /></div>
                                                    </div>
                                                    <div className="space-y-1 pt-1 border-t border-dashed mt-2">
                                                        <Label className="text-xs text-gray-400 uppercase">Disponível Para</Label>
                                                        <Select value={item.exclusiveTo && item.exclusiveTo.length > 0 ? item.exclusiveTo[0] : 'todos'} onChange={(e) => { const val = e.target.value; const newVal = val === 'todos' ? [] : [val]; handleUpdateSelfEvalTemplate(group.id, item.key, 'exclusiveTo', newVal); }} className="h-8 text-xs bg-gray-50 border-gray-200">
                                                            <option value="todos">Todos os Docentes</option>
                                                            <option value="assistente">Apenas Assistente</option>
                                                            <option value="assistente_estagiario">Apenas Assistente Estagiário</option>
                                                        </Select>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="p-3 bg-gray-50 text-center">
                                                <Button variant="ghost" size="sm" onClick={() => handleAddItemToGroup(group.id)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 w-full border border-dashed border-blue-200"><Plus size={14} className="mr-1"/> Adicionar Critério</Button>
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

        {activeTab === 'courses' && (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
                <div className="md:col-span-2 space-y-4 order-2 md:order-1">
                    <Card>
                        <CardHeader><CardTitle>Cursos da Instituição</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {courses.length === 0 ? (
                                    <p className="text-gray-500 italic">Nenhum curso cadastrado.</p>
                                ) : (
                                    courses.map(c => (
                                        <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg bg-white shadow-sm">
                                            <div>
                                                <h4 className="font-semibold">{c.name} ({c.code})</h4>
                                                <p className="text-xs text-gray-500">{c.duration} Anos • {c.semester}º Semestre • {c.modality}</p>
                                                {c.classGroups && c.classGroups.length > 0 && (
                                                    <div className="flex gap-1 mt-1 flex-wrap">
                                                        {c.classGroups.map(g => (
                                                            <span key={g} className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                                Turma {g}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDeleteCourse(c.id)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="order-1 md:order-2">
                    <Card>
                        <CardHeader><CardTitle>Adicionar Curso</CardTitle></CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddCourse} className="space-y-4">
                                <div className="space-y-2"><Label>Nome do Curso</Label><Input value={newCourseName} onChange={e => setNewCourseName(e.target.value)} placeholder="Ex: Engenharia Informática" /></div>
                                <div className="space-y-2"><Label>Código (Sigla)</Label><Input value={newCourseCode} onChange={e => setNewCourseCode(e.target.value)} placeholder="Ex: LEI" /></div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-2"><Label>Duração (Anos)</Label><Select value={newCourseDuration} onChange={e => setNewCourseDuration(e.target.value)}>{[1, 2, 3, 4, 5, 6].map(year => (<option key={year} value={year.toString()}>{year} Anos</option>))}</Select></div>
                                    <div className="space-y-2"><Label>Semestre Atual</Label><Select value={newCourseSemester} onChange={e => setNewCourseSemester(e.target.value)}><option value="1">1º Semestre</option><option value="2">2º Semestre</option><option value="Anual">Anual</option></Select></div>
                                </div>
                                <div className="space-y-2"><Label>Modalidade</Label><Select value={newCourseModality} onChange={e => setNewCourseModality(e.target.value as any)}><option value="Presencial">Presencial</option><option value="Online">Online</option></Select></div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <LayoutList size={14}/> Turmas Disponíveis (Gera o Dropdown)
                                    </Label>
                                    <Input value={newCourseClassGroups} onChange={e => setNewCourseClassGroups(e.target.value)} placeholder="Separe por vírgula: A, B, C, Única" />
                                    <p className="text-xs text-gray-500">Defina aqui as turmas que aparecerão nos menus suspensos para Docentes e Alunos.</p>
                                </div>
                                <div className="space-y-3 pt-4 border-t">
                                    <div className="flex items-center justify-between"><Label className="text-gray-700 font-semibold flex items-center gap-2"><Layers size={14} /> Estrutura Curricular (Disciplinas)</Label><span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{courseSubjects.length} adicionadas</span></div>
                                    <div className="bg-gray-50 p-3 rounded-md border space-y-3">
                                        <div className="space-y-2"><Input value={tempCourseSubjectName} onChange={e => setTempCourseSubjectName(e.target.value)} placeholder="Nome da Cadeira (ex: Matemática I)" className="bg-white" /></div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Select value={tempCourseSubjectLevel} onChange={e => setTempCourseSubjectLevel(e.target.value)}>{[...Array(parseInt(newCourseDuration))].map((_, i) => (<option key={i+1} value={(i+1).toString()}>{i+1}º Ano</option>))}</Select>
                                            <Select value={tempCourseSubjectSemester} onChange={e => setTempCourseSubjectSemester(e.target.value)}><option value="1">1º Sem.</option><option value="2">2º Sem.</option></Select>
                                        </div>
                                        <Button type="button" size="sm" onClick={handleAddCourseSubject} className="w-full bg-slate-800 text-white hover:bg-slate-700"><Plus size={14} className="mr-1"/> Adicionar Cadeira</Button>
                                    </div>
                                    {courseSubjects.length > 0 && (
                                        <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                                            {courseSubjects.map((sub, idx) => (
                                                <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border text-xs shadow-sm">
                                                    <div><span className="font-medium">{sub.name}</span><span className="text-gray-500 ml-2">({sub.level}º Ano, {sub.semester}º Sem)</span></div>
                                                    <button type="button" onClick={() => handleRemoveCourseSubject(idx)} className="text-red-500 hover:text-red-700"><X size={14}/></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <Button type="submit" className="w-full">{courseSubjects.length > 0 ? `Criar Curso e Disciplinas` : 'Criar Curso'}</Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )}

        {/* --- ABA TEACHERS (ATUALIZADA) --- */}
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

                            {/* Subject Builder (ATUALIZADO) */}
                            <div className="bg-gray-50 p-4 rounded-md border">
                                <h4 className="text-sm font-semibold mb-2">Atribuir Disciplinas</h4>
                                <p className="text-xs text-gray-500 mb-3">Selecione o Curso e a Turma para adicionar disciplinas que o docente leciona.</p>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2 mb-2">
                                    
                                    {/* 1. Seleção de Curso */}
                                    <div className="md:col-span-2">
                                        <Select 
                                            value={tempSubject.courseId || ''} 
                                            onChange={e => {
                                                const selectedCourseId = e.target.value;
                                                const selectedCourse = courses.find(c => c.id === selectedCourseId);
                                                setTempSubject({
                                                    ...tempSubject, 
                                                    courseId: selectedCourseId,
                                                    course: selectedCourse ? selectedCourse.name : '', // Keep name for display
                                                    modality: selectedCourse?.modality === 'Online' ? 'Online' : 'Presencial', // Auto-set modality
                                                    classGroup: '',
                                                    name: '',
                                                    id: undefined,
                                                    code: ''
                                                });
                                            }}
                                        >
                                            <option value="">Selecione o Curso...</option>
                                            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </Select>
                                    </div>

                                    {/* 2. Seleção de Turma (Baseada no Curso) */}
                                    <div className="md:col-span-1">
                                        {tempSubjectCourseObj && tempSubjectCourseObj.classGroups && tempSubjectCourseObj.classGroups.length > 0 ? (
                                            <Select 
                                                value={tempSubject.classGroup} 
                                                onChange={e => setTempSubject({
                                                    ...tempSubject, 
                                                    classGroup: e.target.value,
                                                    name: '',
                                                    id: undefined,
                                                    code: ''
                                                })}
                                                disabled={!tempSubject.courseId}
                                            >
                                                <option value="">Turma...</option>
                                                {tempSubjectCourseObj.classGroups.map(g => (
                                                    <option key={g} value={g}>{g}</option>
                                                ))}
                                            </Select>
                                        ) : (
                                            <Input 
                                                placeholder="Turma (ex: A)" 
                                                value={tempSubject.classGroup} 
                                                onChange={e => setTempSubject({
                                                    ...tempSubject, 
                                                    classGroup: e.target.value,
                                                    name: '',
                                                    id: undefined,
                                                    code: ''
                                                })} 
                                                disabled={!tempSubject.courseId}
                                                title={tempSubject.courseId ? "Digite a turma manualmente se não configurada no curso" : "Selecione um curso primeiro"}
                                            />
                                        )}
                                    </div>

                                    {/* 3. Nome da Disciplina */}
                                    <div className="md:col-span-2">
                                        {availableSubjectsForTeacher.length > 0 && !tempSubject.name.startsWith('new_custom_') ? (
                                            <div className="flex gap-1">
                                                <Select 
                                                    value={tempSubject.id || ''} 
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        if (val === 'new_custom') {
                                                            setTempSubject({...tempSubject, name: 'new_custom_', id: undefined});
                                                            return;
                                                        }
                                                        const s = availableSubjectsForTeacher.find(sub => sub.id === val);
                                                        if (s) {
                                                            setTempSubject({
                                                                ...tempSubject,
                                                                id: s.id,
                                                                name: s.name,
                                                                code: s.code || '',
                                                                classGroup: s.classGroup || tempSubject.classGroup,
                                                                shift: s.shift || tempSubject.shift
                                                            });
                                                        }
                                                    }}
                                                    disabled={!tempSubject.classGroup}
                                                >
                                                    <option value="">{tempSubject.classGroup ? "Selecione a Disciplina..." : "Selecione a Turma primeiro..."}</option>
                                                    {availableSubjectsForTeacher.map(s => {
                                                        const assignedTeacher = s.teacherId ? teachers.find(t => t.id === s.teacherId) : null;
                                                        const isAssigned = !!assignedTeacher;
                                                        return (
                                                            <option key={s.id} value={s.id} className={isAssigned ? 'text-red-500' : ''}>
                                                                {s.name} {isAssigned ? `(Atribuída a ${assignedTeacher?.name})` : ''}
                                                            </option>
                                                        );
                                                    })}
                                                    <option value="new_custom" className="font-bold text-blue-600">+ Nova Disciplina Manual</option>
                                                </Select>
                                            </div>
                                        ) : (
                                            <div className="flex gap-1">
                                                <Input 
                                                    placeholder="Nome da Disciplina" 
                                                    value={tempSubject.name === 'new_custom_' ? '' : tempSubject.name} 
                                                    onChange={e => setTempSubject({...tempSubject, name: e.target.value, id: undefined})} 
                                                    autoFocus={tempSubject.name === 'new_custom_'}
                                                />
                                                {availableSubjectsForTeacher.length > 0 && (
                                                    <Button 
                                                        type="button" 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={() => setTempSubject({...tempSubject, name: '', id: undefined})}
                                                        title="Voltar para lista"
                                                    >
                                                        <X className="h-4 w-4"/>
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* 4. Turno, Modalidade e Botão */}
                                    <div className="md:col-span-2 flex gap-2">
                                        <Select 
                                            value={tempSubject.shift} 
                                            onChange={e => setTempSubject({...tempSubject, shift: e.target.value as any})}
                                            disabled={!tempSubject.name}
                                            title="Turno"
                                        >
                                            <option value="Diurno">Laboral (Diurno)</option>
                                            <option value="Noturno">Pós-Laboral (Noturno)</option>
                                        </Select>
                                        
                                        <Select 
                                            value={tempSubject.modality} 
                                            onChange={e => setTempSubject({...tempSubject, modality: e.target.value as any})}
                                            disabled={!tempSubject.name}
                                            title="Modalidade"
                                        >
                                            <option value="Presencial">Presencial</option>
                                            <option value="Online">Online</option>
                                        </Select>

                                        <Button type="button" onClick={handleAddTempSubject} className="w-full sm:w-auto" disabled={!tempSubject.name || !tempSubject.courseId || !tempSubject.classGroup}>
                                            <Plus className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-1 mt-3">
                                    {newTeacherSubjects.map((s, i) => (
                                        <div key={i} className="flex flex-col sm:flex-row sm:justify-between text-xs bg-white p-2 border rounded shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-800">{s.name}</span>
                                                <span className="text-gray-500">• {s.course}</span>
                                                <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">Turma {s.classGroup}</span>
                                                <span className="text-gray-400">({s.shift === 'Diurno' ? 'Laboral' : 'Pós-Laboral'})</span>
                                                <span className={`px-1.5 py-0.5 rounded border ${s.modality === 'Online' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-green-50 text-green-700 border-green-100'}`}>{s.modality}</span>
                                            </div>
                                            <X className="h-3 w-3 cursor-pointer text-red-500 mt-1 sm:mt-0" onClick={() => handleRemoveTempSubject(i)}/>
                                        </div>
                                    ))}
                                    {newTeacherSubjects.length === 0 && <p className="text-xs text-gray-400 italic text-center py-2">Nenhuma disciplina adicionada ainda.</p>}
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
                                        <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteTeacher(t.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}

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
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => startEditUser(s)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteStudent(s.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle>Registrar Estudante</CardTitle>
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
                                <Label>Regime / Turno</Label>
                                <div className="flex gap-2">
                                    {['Diurno', 'Noturno'].map(shift => (
                                        <div 
                                            key={shift}
                                            onClick={() => handleToggleShift(shift)}
                                            className={`px-3 py-1 rounded border cursor-pointer text-sm ${newStudentShifts.includes(shift) ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white hover:bg-gray-50'}`}
                                        >
                                            {shift === 'Diurno' ? 'Laboral' : 'Pós-Laboral'}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Turma do Estudante</Label>
                                {selectedCourseObj && selectedCourseObj.classGroups && selectedCourseObj.classGroups.length > 0 ? (
                                    <Select 
                                        value={newStudentClassGroups[0] || ''} 
                                        onChange={(e) => setNewStudentClassGroups(e.target.value ? [e.target.value] : [])}
                                    >
                                        <option value="">Selecione a Turma...</option>
                                        {selectedCourseObj.classGroups.map(group => (
                                            <option key={group} value={group}>{group}</option>
                                        ))}
                                    </Select>
                                ) : (
                                    <Input 
                                        value={newStudentClassGroupsInput} 
                                        onChange={e => setNewStudentClassGroupsInput(e.target.value)} 
                                        placeholder={selectedCourseObj ? "Curso sem turmas definidas. Digite manualmente (ex: A, B)" : "Selecione um curso primeiro"} 
                                        disabled={!newStudentCourse}
                                    />
                                )}
                            </div>

                            <Button type="submit" className="w-full">Registrar</Button>
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
                    <form onSubmit={handleUpdateInstitution} className="space-y-6 max-w-md">
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

                        <div className="space-y-4 pt-4 border-t">
                            <h3 className="text-lg font-semibold">Período de Avaliação</h3>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="evaluation-open"
                                    checked={institution?.isEvaluationOpen || false}
                                    onCheckedChange={(checked) => institution && setInstitution({...institution, isEvaluationOpen: checked})}
                                />
                                <Label htmlFor="evaluation-open">Período de Avaliação Aberto</Label>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Data de Início</Label>
                                    <Input
                                        type="date"
                                        value={institution?.evaluationStartDate || ''}
                                        onChange={(e) => institution && setInstitution({...institution, evaluationStartDate: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Data de Fim</Label>
                                    <Input
                                        type="date"
                                        value={institution?.evaluationEndDate || ''}
                                        onChange={(e) => institution && setInstitution({...institution, evaluationEndDate: e.target.value})}
                                    />
                                </div>
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
