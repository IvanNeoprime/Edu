
import React, { useState, useEffect, useMemo } from 'react';
import { BackendService, PDF_STANDARD_QUESTIONS, DEFAULT_SELF_EVAL_TEMPLATE, GroupedComments } from '../services/backend';
import { User, UserRole, Subject, Questionnaire, QuestionType, TeacherCategory, CombinedScore, Question, Institution, SelfEvaluation, Course, SelfEvalTemplate, AuditLog, AcademicPeriod } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, cn } from './ui';
import { Users, BookOpen, Calculator, Plus, Trash2, FileQuestion, ChevronDown, ChevronUp, Star, BarChartHorizontal, GraduationCap, Download, Printer, Image as ImageIcon, RefreshCw, Settings, Save, X, Edit, Scale, Award, FileSpreadsheet, ListChecks, FileText, Layers, AlertTriangle, Menu, Eye, MessageSquare, RotateCcw, LayoutList, ShieldCheck, History, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  institutionId: string;
}

interface NewSubjectItem {
    name: string;
    code: string;
    course: string;
    courseId?: string;
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
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'teachers' | 'students' | 'evaluations' | 'stats' | 'settings' | 'audit'>('overview');
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [allScores, setAllScores] = useState<CombinedScore[]>([]);
  const [allSelfEvals, setAllSelfEvals] = useState<Record<string, SelfEvaluation>>({});
  
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [academicPeriods, setAcademicPeriods] = useState<AcademicPeriod[]>([]);
  const [newPeriodName, setNewPeriodName] = useState('');
  const [newPeriodStart, setNewPeriodStart] = useState('');
  const [newPeriodEnd, setNewPeriodEnd] = useState('');
  
  const [qualEvals, setQualEvals] = useState<Record<string, { deadlines: number, quality: number, comments: string }>>({});
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState<string | null>(null);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [subjectSearch, setSubjectSearch] = useState('');

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
  const [newStandaloneSubject, setNewStandaloneSubject] = useState({ name: '', course: '', classGroup: '', shift: 'Diurno', teacherId: '' });
  const newStandaloneSubjectCourseObj = useMemo(() => courses.find(c => c.name === newStandaloneSubject.course), [courses, newStandaloneSubject.course]);
  
  // Estado para Cálculo de Scores
  const [calcTarget, setCalcTarget] = useState<string>('all');

  // Edit User State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editJobTitle, setEditJobTitle] = useState('');
  // New fields for Student Editing
  const [editCourse, setEditCourse] = useState('');
  const [editLevel, setEditLevel] = useState('');
  const [editClassGroups, setEditClassGroups] = useState('');
  const [editShifts, setEditShifts] = useState<string[]>([]);

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
  const [newStudentClassGroups, setNewStudentClassGroups] = useState<string[]>([]);
  const [newStudentClassGroupsInput, setNewStudentClassGroupsInput] = useState(''); // Fallback manual
  
  // Novos Estados para Aluno (Semestre e Modalidade)
  const [newStudentSemester, setNewStudentSemester] = useState('1');
  const [newStudentModality, setNewStudentModality] = useState<'Presencial' | 'Online' | 'Híbrido'>('Presencial');

  // State for Assigning Subjects to Existing Teacher
  const [assigningSubjectTeacher, setAssigningSubjectTeacher] = useState<User | null>(null);
  const [existingTeacherSubject, setExistingTeacherSubject] = useState<NewSubjectItem>({ name: '', code: '', course: '', level: '', classGroup: '', shift: 'Diurno'});

  useEffect(() => {
    loadData();
    loadQuestionnaire();
    loadSelfEvalTemplate();
  }, [institutionId]);

  useEffect(() => {
    if (activeTab === 'stats' || activeTab === 'overview') {
        BackendService.getAllScores(institutionId).then(setAllScores);
    }
    if (activeTab === 'audit') {
        BackendService.getAuditLogs(institutionId).then(setAuditLogs);
        BackendService.getAcademicPeriods(institutionId).then(setAcademicPeriods);
    }
  }, [activeTab, institutionId]);

  // Reset student class groups when course changes
  useEffect(() => {
      setNewStudentClassGroups([]);
      setNewStudentClassGroupsInput('');
  }, [newStudentCourse]);

  const handleAddAcademicPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPeriodName || !newPeriodStart || !newPeriodEnd) return;
    try {
        await BackendService.addAcademicPeriod(institutionId, newPeriodName, newPeriodStart, newPeriodEnd);
        const periods = await BackendService.getAcademicPeriods(institutionId);
        setAcademicPeriods(periods);
        setNewPeriodName('');
        setNewPeriodStart('');
        setNewPeriodEnd('');
        alert("Período acadêmico adicionado com sucesso!");
    } catch (e: any) {
        alert(e.message);
    }
  };

  const handleSetCurrentPeriod = async (id: string) => {
    try {
        await BackendService.setCurrentAcademicPeriod(institutionId, id);
        const periods = await BackendService.getAcademicPeriods(institutionId);
        setAcademicPeriods(periods);
        alert("Período atual atualizado!");
    } catch (e: any) {
        alert(e.message);
    }
  };

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
    
    if (user.role === 'student') {
        let courseName = user.course || '';
        if (!courseName && user.courseId) {
            const foundCourse = courses.find(c => c.id === user.courseId);
            if (foundCourse) courseName = foundCourse.name;
        }
        setEditCourse(courseName);
        setEditLevel(user.level || '');
        setEditClassGroups(user.classGroups ? user.classGroups.join(', ') : '');
        setEditShifts(user.shifts || []);
    }
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser) return;
      
      try {
          const updates: Partial<User> = {
              name: editName,
              email: editEmail,
              jobTitle: editJobTitle
          };

          if (editingUser.role === 'student') {
              updates.course = editCourse;
              updates.courseId = courses.find(c => c.name === editCourse)?.id;
              updates.level = editLevel;
              updates.classGroups = editClassGroups.split(',').map(s => s.trim()).filter(Boolean);
              updates.shifts = editShifts as ("Diurno" | "Noturno")[];
          }

          await BackendService.updateUser(editingUser.id, updates);
          alert("Dados atualizados com sucesso!");
          setEditingUser(null);
          loadData();
      } catch (e: any) {
          alert("Erro ao atualizar: " + e.message);
      }
  };

  const handleDeleteSubject = async (subjectId: string) => {
      if (!confirm("Tem certeza que deseja remover esta disciplina?")) return;
      try {
          await BackendService.deleteSubject(subjectId);
          loadData(); 
      } catch (e: any) {
          alert("Erro ao remover disciplina: " + e.message);
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
          // Parse as turmas (se houver)
          const classGroupsList = newCourseClassGroups
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0);
            
          const result = await BackendService.addCourse(institutionId, newCourseName, newCourseCode, parseInt(newCourseDuration), newCourseSemester, newCourseModality, classGroupsList);
          
          if (result) {
            setCourses(prev => [...prev, result]);
            
            // Se houver disciplinas adicionadas
            if (courseSubjects.length > 0) {
                const year = new Date().getFullYear().toString();
                // Definir turmas padrão se o usuário não inseriu nenhuma
                const finalClassGroups = classGroupsList.length > 0 ? classGroupsList : ['A'];

                for (const sub of courseSubjects) {
                    // Para cada disciplina, criamos uma entrada para cada turma definida no curso
                    for (const group of finalClassGroups) {
                        await BackendService.assignSubject({
                            name: sub.name, 
                            code: `${newCourseCode}-${sub.level}${sub.semester}`, 
                            teacherId: undefined, 
                            institutionId: institutionId, 
                            academicYear: year, 
                            level: sub.level, 
                            semester: sub.semester, 
                            course: newCourseName, 
                            courseId: result.id, // Link to Course ID
                            classGroup: group, // Atribui a turma específica
                            shift: 'Diurno', 
                            modality: newCourseModality as any
                        });
                    }
                }
                await loadData();
            }
          }
          setNewCourseName(''); setNewCourseCode(''); setNewCourseDuration('4'); setNewCourseSemester('1'); setNewCourseModality('Presencial'); setNewCourseClassGroups(''); setCourseSubjects([]);
          alert(`Curso "${newCourseName}" criado com sucesso!`);
      } catch(e: any) { alert("Erro ao adicionar curso: " + e.message); }
  };

  const handleAddStandaloneSubject = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newStandaloneSubject.name.trim()) return;
      try {
          const year = new Date().getFullYear().toString();
          const result = await BackendService.assignSubject({
              name: newStandaloneSubject.name,
              code: `${newStandaloneSubject.name.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
              teacherId: newStandaloneSubject.teacherId || undefined,
              institutionId: institutionId,
              academicYear: year,
              course: newStandaloneSubject.course,
              courseId: newStandaloneSubjectCourseObj?.id, // Link to Course ID
              classGroup: newStandaloneSubject.classGroup,
              shift: newStandaloneSubject.shift,
              level: '1',
              semester: '1',
              modality: 'Presencial'
          });
          if (result) {
              setSubjects(prev => {
                  const idx = prev.findIndex(s => s.id === result.id);
                  if (idx >= 0) {
                      const newSubs = [...prev];
                      newSubs[idx] = result;
                      return newSubs;
                  }
                  return [...prev, result];
              });
              setNewStandaloneSubject({ name: '', course: '', classGroup: '', shift: 'Diurno', teacherId: '' });
              alert(`Disciplina "${result.name}" ${result.teacherId ? 'atualizada' : 'adicionada'} com sucesso!`);
          }
      } catch (e: any) {
          alert("Erro ao adicionar disciplina: " + e.message);
      }
  };

  const handleDeleteCourse = async (id: string) => {
      if(confirm("Tem certeza?")) {
          try { await BackendService.deleteCourse(id); setCourses(prev => prev.filter(c => c.id !== id)); } catch(e: any) { alert("Erro ao remover curso: " + e.message); }
      }
  };

  const handleAddTempSubject = () => {
      if (!tempSubject.name.trim()) { alert("Preencha o Nome da disciplina."); return; }
      setNewTeacherSubjects([...newTeacherSubjects, tempSubject]);
      setTempSubject({ name: '', code: '', course: '', level: '', classGroup: '', shift: 'Diurno'});
  };
  
  const handleRemoveTempSubject = (index: number) => { setNewTeacherSubjects(newTeacherSubjects.filter((_, i) => i !== index)); };
  
  const handleAddTeacher = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTeacherName.trim() || !newTeacherEmail.trim() || !newTeacherPwd.trim()) { alert("Por favor, preencha Nome, Email e Senha do docente."); return; }
      try {
          const newUser = await BackendService.addTeacher(institutionId, newTeacherName, newTeacherEmail, newTeacherPwd, newTeacherAvatar, newTeacherCategory);
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
                          courseId: sub.courseId, // Link to Course ID
                          classGroup: sub.classGroup, 
                          shift: sub.shift, 
                          modality: 'Presencial', 
                          teacherCategory: newTeacherCategory 
                      });
                  }
              }
          }
          setNewTeacherName(''); setNewTeacherEmail(''); setNewTeacherPwd(''); setNewTeacherAvatar(''); setNewTeacherCategory('assistente'); setNewTeacherSubjects([]);
          await loadData(); alert(`Docente e ${newTeacherSubjects.length} disciplinas cadastrados com sucesso!`);
      } catch (error: any) { alert("Erro ao cadastrar docente: " + error.message); }
  };

  const handleToggleShift = (shift: string) => {
      if (newStudentShifts.includes(shift)) { setNewStudentShifts(newStudentShifts.filter(s => s !== shift)); } else { setNewStudentShifts([...newStudentShifts, shift]); }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newStudentName.trim() || !newStudentEmail.trim() || !newStudentPwd.trim()) { alert("Por favor, preencha Nome, Email e Senha."); return; }
      // Course is now optional
      if (newStudentShifts.length === 0) { alert("Selecione pelo menos um turno."); return; }
      
      // Determine class groups: Either selected from buttons OR manual input
      let finalClassGroups = newStudentClassGroups;
      if (finalClassGroups.length === 0 && newStudentClassGroupsInput.trim()) {
          finalClassGroups = newStudentClassGroupsInput.split(',').map(s => s.trim()).filter(s => s.length > 0);
      }

      try {
          await BackendService.addStudent(
              institutionId, 
              newStudentName, 
              newStudentEmail, 
              newStudentPwd, 
              newStudentCourse, 
              selectedCourseObj?.id, // Pass courseId
              newStudentLevel, 
              newStudentAvatar, 
              newStudentShifts, 
              finalClassGroups, 
              newStudentSemester, 
              newStudentModality
          );
          setNewStudentName(''); setNewStudentEmail(''); setNewStudentPwd(''); setNewStudentCourse(''); setNewStudentLevel(''); setNewStudentAvatar(''); setNewStudentClassGroups([]); setNewStudentClassGroupsInput(''); setNewStudentShifts([]); setNewStudentSemester('1'); setNewStudentModality('Presencial');
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
  
  const getAppreciation = (classification20: number) => { if (classification20 >= 18) return 'Excelente'; if (classification20 >= 14) return 'Bom'; if (classification20 >= 10) return 'Suficiente'; return 'Insuficiente'; };
  const fullReportData = useMemo(() => {
    return teachers.map(teacher => {
        const score = allScores.find(s => s.teacherId === teacher.id);
        const hasScore = !!score;
        const val20 = score?.finalScore || 0;
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

  // Helper para obter o objeto do curso selecionado
  const selectedCourseObj = useMemo(() => {
      return courses.find(c => c.name === newStudentCourse);
  }, [newStudentCourse, courses]);

  // Helper para o Subject Builder do Professor
  const tempSubjectCourseObj = useMemo(() => {
      return courses.find(c => c.name === tempSubject.course);
  }, [tempSubject.course, courses]);

  // Helper for Existing Teacher Subject Builder
  const existingTeacherSubjectCourseObj = useMemo(() => {
      return courses.find(c => c.name === existingTeacherSubject.course);
  }, [existingTeacherSubject.course, courses]);

  // Helper for Existing Teacher Subject Builder - Suggestions
  const existingTeacherSubjectSuggestions = useMemo(() => {
      if (!existingTeacherSubject.course) return [];
      // Get all subjects that match the course
      const courseSubjects = subjects.filter(s => s.course === existingTeacherSubject.course);
      // Return unique names
      return Array.from(new Set(courseSubjects.map(s => s.name)));
  }, [existingTeacherSubject.course, subjects]);

  const handleAssignSubject = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!assigningSubjectTeacher) return;
      if (!existingTeacherSubject.name) {
          alert("Preencha o Nome da disciplina.");
          return;
      }

      try {
          await BackendService.assignSubject({
              name: existingTeacherSubject.name,
              code: existingTeacherSubject.code, 
              teacherId: assigningSubjectTeacher.id,
              institutionId: institutionId,
              academicYear: new Date().getFullYear().toString(),
              level: existingTeacherSubject.level || '1',
              semester: '1', 
              course: existingTeacherSubject.course,
              courseId: existingTeacherSubjectCourseObj?.id,
              classGroup: existingTeacherSubject.classGroup,
              shift: existingTeacherSubject.shift,
              modality: 'Presencial', 
              teacherCategory: assigningSubjectTeacher.category
          });
          
          alert("Disciplina atribuída com sucesso!");
          setExistingTeacherSubject({ name: '', code: '', course: '', level: '', classGroup: '', shift: 'Diurno'});
          loadData();
      } catch (e: any) {
          alert("Erro ao atribuir disciplina: " + e.message);
      }
  };

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

      {/* --- ASSIGN SUBJECT MODAL --- */}
      {assigningSubjectTeacher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
            <Card className="w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader>
                    <CardTitle>Gerir Disciplinas de {assigningSubjectTeacher.name}</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* List Current Subjects */}
                    <div className="mb-6 bg-gray-50 p-4 rounded-lg border">
                        <h4 className="text-sm font-semibold mb-3 text-gray-700 flex items-center gap-2">
                            <BookOpen className="h-4 w-4"/> Disciplinas Atuais
                        </h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                            {subjects.filter(s => s.teacherId === assigningSubjectTeacher.id).length === 0 && (
                                <p className="text-xs text-gray-500 italic">Nenhuma disciplina atribuída.</p>
                            )}
                            {subjects.filter(s => s.teacherId === assigningSubjectTeacher.id).map(s => (
                                <div key={s.id} className="flex justify-between items-center bg-white p-2 rounded border text-sm shadow-sm">
                                    <div>
                                        <span className="font-medium block">{s.name}</span>
                                        <span className="text-xs text-gray-500">{s.course} • Turma {s.classGroup} • {s.shift}</span>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteSubject(s.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0">
                                        <X className="h-4 w-4"/>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold mb-3 text-gray-700">Adicionar Nova Disciplina</h4>
                        <form onSubmit={handleAssignSubject} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <Label>Curso (Opcional)</Label>
                                    <Select 
                                        value={existingTeacherSubject.course} 
                                        onChange={e => setExistingTeacherSubject({...existingTeacherSubject, course: e.target.value, classGroup: ''})}
                                    >
                                        <option value="">Selecione o Curso...</option>
                                        {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </Select>
                                </div>
                                
                                <div>
                                    <Label>Turma</Label>
                                    {existingTeacherSubjectCourseObj && existingTeacherSubjectCourseObj.classGroups && existingTeacherSubjectCourseObj.classGroups.length > 0 ? (
                                        <Select 
                                            value={existingTeacherSubject.classGroup} 
                                            onChange={e => setExistingTeacherSubject({...existingTeacherSubject, classGroup: e.target.value})}
                                        >
                                            <option value="">Turma...</option>
                                            {existingTeacherSubjectCourseObj.classGroups.map(g => (
                                                <option key={g} value={g}>{g}</option>
                                            ))}
                                        </Select>
                                    ) : (
                                        <Input 
                                            placeholder="Turma (ex: A)" 
                                            value={existingTeacherSubject.classGroup} 
                                            onChange={e => setExistingTeacherSubject({...existingTeacherSubject, classGroup: e.target.value})} 
                                        />
                                    )}
                                </div>

                                <div>
                                    <Label>Turno</Label>
                                    <Select value={existingTeacherSubject.shift} onChange={e => setExistingTeacherSubject({...existingTeacherSubject, shift: e.target.value as any})}>
                                        <option value="Diurno">Laboral</option>
                                        <option value="Noturno">Pós-Laboral</option>
                                    </Select>
                                </div>

                                <div className="md:col-span-2">
                                    <Label>Nome da Disciplina</Label>
                                    <Input 
                                        value={existingTeacherSubject.name} 
                                        onChange={e => setExistingTeacherSubject({...existingTeacherSubject, name: e.target.value})} 
                                        placeholder="Ex: Matemática Discreta"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="ghost" onClick={() => setAssigningSubjectTeacher(null)}>Fechar</Button>
                                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Adicionar</Button>
                            </div>
                        </form>
                    </div>
                </CardContent>
            </Card>
        </div>
      )}

      {/* --- EDIT USER MODAL --- */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
            <Card className="w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader>
                    <CardTitle>Editar Usuário</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSaveEditUser} className="space-y-4">
                        <div className="space-y-2"><Label>Nome Completo</Label><Input value={editName} onChange={e => setEditName(e.target.value)} /></div>
                        <div className="space-y-2"><Label>Email Institucional</Label><Input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} /></div>
                        
                        {editingUser.role === 'teacher' && (
                            <div className="space-y-2"><Label>Função/Cargo (Job Title)</Label><Input value={editJobTitle} onChange={e => setEditJobTitle(e.target.value)} placeholder="Ex: Diretor, Regente, Docente..." /></div>
                        )}

                        {editingUser.role === 'student' && (
                            <>
                                <div className="space-y-2">
                                    <Label>Curso (Opcional)</Label>
                                    <Select value={editCourse} onChange={e => setEditCourse(e.target.value)}>
                                        <option value="">Selecione...</option>
                                        {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-2">
                                        <Label>Ano/Nível</Label>
                                        <Select value={editLevel} onChange={e => setEditLevel(e.target.value)}>
                                            <option value="1">1º Ano</option>
                                            <option value="2">2º Ano</option>
                                            <option value="3">3º Ano</option>
                                            <option value="4">4º Ano</option>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Turmas (CSV)</Label>
                                        <Input value={editClassGroups} onChange={e => setEditClassGroups(e.target.value)} placeholder="Ex: A, B" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Turnos</Label>
                                    <div className="flex gap-2">
                                        <label className="flex items-center gap-1 text-sm">
                                            <input 
                                                type="checkbox" 
                                                checked={editShifts.includes('Diurno')} 
                                                onChange={e => {
                                                    if(e.target.checked) setEditShifts([...editShifts, 'Diurno']);
                                                    else setEditShifts(editShifts.filter(s => s !== 'Diurno'));
                                                }}
                                            /> Laboral
                                        </label>
                                        <label className="flex items-center gap-1 text-sm">
                                            <input 
                                                type="checkbox" 
                                                checked={editShifts.includes('Noturno')} 
                                                onChange={e => {
                                                    if(e.target.checked) setEditShifts([...editShifts, 'Noturno']);
                                                    else setEditShifts(editShifts.filter(s => s !== 'Noturno'));
                                                }}
                                            /> Pós-Laboral
                                        </label>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="ghost" onClick={() => setEditingUser(null)}>Cancelar</Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Salvar Alterações</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
      )}
      
      {/* --- PRINT LAYOUT --- */}
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
                                                <td className="border border-black p-1 text-center">{det.shift === 'Diurno' ? 'Laboral' : 'Pós-Laboral'}</td>
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
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-xl md:text-3xl font-bold tracking-tight text-gray-900 truncate max-w-[200px] md:max-w-none">{institution?.name || 'Painel de Gestão'}</h1>
                    <p className="text-xs md:text-sm text-gray-500">Gestão Académica • {new Date().getFullYear()}</p>
                </div>
                
                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('audit')} className="gap-2"><ShieldCheck size={16}/> Auditoria</Button>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('settings')} className="gap-2"><Settings size={16}/> Configurações</Button>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <Button variant={activeTab === 'overview' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('overview')} className="gap-2"><BarChartHorizontal size={16} /> Visão Geral</Button>
                        <Button variant={activeTab === 'stats' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('stats')} className="gap-2"><ListChecks size={16} /> Relatórios</Button>
                        <Button variant={activeTab === 'courses' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('courses')} className="gap-2"><BookOpen size={16} /> Cursos</Button>
                        <Button variant={activeTab === 'teachers' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('teachers')} className="gap-2"><Users size={16} /> Docentes</Button>
                        <Button variant={activeTab === 'students' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('students')} className="gap-2"><GraduationCap size={16} /> Estudantes</Button>
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
                        <button onClick={() => {setActiveTab('courses'); setIsMobileMenuOpen(false)}} className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'courses' ? 'bg-slate-900 text-white' : 'hover:bg-gray-100 text-gray-700'}`}><BookOpen size={18} /> Cursos e Disciplinas</button>
                        <button onClick={() => {setActiveTab('teachers'); setIsMobileMenuOpen(false)}} className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'teachers' ? 'bg-slate-900 text-white' : 'hover:bg-gray-100 text-gray-700'}`}><Users size={18} /> Docentes</button>
                        <button onClick={() => {setActiveTab('students'); setIsMobileMenuOpen(false)}} className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'students' ? 'bg-slate-900 text-white' : 'hover:bg-gray-100 text-gray-700'}`}><GraduationCap size={18} /> Estudantes</button>
                        <button onClick={() => {setActiveTab('evaluations'); setIsMobileMenuOpen(false)}} className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'evaluations' ? 'bg-slate-900 text-white' : 'hover:bg-gray-100 text-gray-700'}`}><FileQuestion size={18} /> Modelos de Avaliação</button>
                        <button onClick={() => {setActiveTab('audit'); setIsMobileMenuOpen(false)}} className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'audit' ? 'bg-slate-900 text-white' : 'hover:bg-gray-100 text-gray-700'}`}><ShieldCheck size={18} /> Auditoria</button>
                        <button onClick={() => {setActiveTab('settings'); setIsMobileMenuOpen(false)}} className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'settings' ? 'bg-slate-900 text-white' : 'hover:bg-gray-100 text-gray-700'}`}><Settings size={18} /> Configurações</button>
                    </div>
                </div>
            )}
        </div>

        {/* ... (Overview, Stats, Evaluations content unchanged) ... */}
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

                 {/* Mobile View for Report */}
                 <div className="md:hidden space-y-4">
                    {fullReportData.length === 0 ? (
                        <p className="p-8 text-center text-gray-500 italic bg-white rounded-lg border">Nenhum docente cadastrado.</p>
                    ) : fullReportData.map(score => (
                        <Card key={score.teacherId} className="overflow-hidden">
                            <CardHeader className="bg-slate-50 py-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-base">{score.teacherName}</CardTitle>
                                        <p className="text-xs text-gray-500 capitalize">{score.teacherCategory.replace('_', ' ')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-black text-slate-900">{score.finalScore.toFixed(1)}</p>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${score.val20 >= 14 ? 'bg-green-100 text-green-800' : score.val20 >= 10 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{score.classification}</span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="grid grid-cols-3 gap-2 text-center mb-4">
                                    <div className="p-2 bg-gray-50 rounded">
                                        <p className="text-[10px] text-gray-500 uppercase">Auto</p>
                                        <p className="font-bold">{score.selfEvalScore.toFixed(1)}</p>
                                    </div>
                                    <div className="p-2 bg-gray-50 rounded">
                                        <p className="text-[10px] text-gray-500 uppercase">Estud.</p>
                                        <p className="font-bold">{score.studentScore.toFixed(1)}</p>
                                    </div>
                                    <div className="p-2 bg-gray-50 rounded">
                                        <p className="text-[10px] text-gray-500 uppercase">Inst.</p>
                                        <p className="font-bold">{score.institutionalScore.toFixed(1)}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { const user = teachers.find(t => t.id === score.teacherId); if (user) handlePrintReport(user); }}><Printer className="h-4 w-4 mr-2"/> Relatório</Button>
                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { const user = teachers.find(t => t.id === score.teacherId); if (user) handleViewComments(user); }}><MessageSquare className="h-4 w-4 mr-2"/> Alunos</Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                 </div>
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
                                            <Button variant="ghost" size="sm" onClick={() => handleRemoveQuestion(q.id)} className="text-gray-400 hover:text-red-500 absolute top-2 right-2"><Trash2 size={16}/></Button>
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
                                <CardHeader><CardTitle>Adicionar Pergunta</CardTitle></CardHeader>
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
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Cursos da Instituição</CardTitle>
                            <div className="relative w-full max-w-xs">
                                <Input 
                                    placeholder="Pesquisar disciplina..." 
                                    value={subjectSearch} 
                                    onChange={e => setSubjectSearch(e.target.value)}
                                    className="pl-8"
                                />
                                <BookOpen className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {courses.length === 0 ? (
                                    <p className="text-gray-500 italic">Nenhum curso cadastrado.</p>
                                ) : (
                                    courses.filter(c => {
                                        const matchesCourse = c.name.toLowerCase().includes(subjectSearch.toLowerCase());
                                        const matchesSubject = subjects.some(s => s.course === c.name && s.name.toLowerCase().includes(subjectSearch.toLowerCase()));
                                        return subjectSearch === '' || matchesCourse || matchesSubject;
                                    }).map(c => (
                                        <div key={c.id} className="border rounded-lg bg-white shadow-sm overflow-hidden">
                                            <div 
                                                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                                                onClick={() => setExpandedCourseId(expandedCourseId === c.id ? null : c.id)}
                                            >
                                                <div>
                                                    <h4 className="font-semibold flex items-center gap-2">
                                                        {expandedCourseId === c.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                                                        {c.name} ({c.code})
                                                    </h4>
                                                    <p className="text-xs text-gray-500 pl-6">{c.duration} Anos • {c.semester}º Semestre • {c.modality}</p>
                                                    {c.classGroups && c.classGroups.length > 0 && (
                                                        <div className="flex gap-1 mt-1 flex-wrap pl-6">
                                                            {c.classGroups.map(g => (
                                                                <span key={g} className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                                    Turma {g}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <Button variant="ghost" size="sm" className="text-red-500" onClick={(e) => { e.stopPropagation(); handleDeleteCourse(c.id); }}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                            {expandedCourseId === c.id && (
                                                <div className="bg-gray-50 p-4 border-t text-sm">
                                                    <h5 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><BookOpen size={16}/> Disciplinas Alocadas</h5>
                                                    <div className="space-y-2">
                                                        {subjects.filter(s => s.course === c.name && (subjectSearch === '' || s.name.toLowerCase().includes(subjectSearch.toLowerCase()))).length === 0 ? (
                                                            <p className="text-xs text-gray-500 italic">Nenhuma disciplina encontrada para este filtro.</p>
                                                        ) : (
                                                            subjects.filter(s => s.course === c.name && (subjectSearch === '' || s.name.toLowerCase().includes(subjectSearch.toLowerCase()))).map(s => {
                                                                const teacher = teachers.find(t => t.id === s.teacherId);
                                                                const enrolledStudents = students.filter(student => {
                                                                    const shiftMatch = s.shift && student.shifts ? student.shifts.includes(s.shift) : true;
                                                                    const classMatch = s.classGroup && student.classGroups ? student.classGroups.includes(s.classGroup) : true;
                                                                    const courseMatch = student.course && s.course ? student.course.toLowerCase() === s.course.toLowerCase() : true;
                                                                    return shiftMatch && classMatch && courseMatch;
                                                                }).length;
                                                                return (
                                                                    <div key={s.id} className="flex justify-between items-center bg-white p-2 rounded border">
                                                                        <div>
                                                                            <span className="font-medium text-gray-800 block">{s.name}</span>
                                                                            <span className="text-xs text-gray-500 block">Turma {s.classGroup} • {s.shift}</span>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full block mb-1">
                                                                                {teacher?.name || 'Sem Docente'}
                                                                            </span>
                                                                            <span className="text-xs text-gray-500 flex items-center justify-end gap-1">
                                                                                <Users size={12}/> {enrolledStudents} alunos
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                                {subjects.filter(s => !s.course && (subjectSearch === '' || s.name.toLowerCase().includes(subjectSearch.toLowerCase()))).length > 0 && (
                                    <div className="border rounded-lg bg-white shadow-sm overflow-hidden mt-4">
                                        <div className="bg-gray-50 p-3 border-b font-semibold flex items-center justify-between">
                                            <span>Disciplinas Gerais (Sem Curso)</span>
                                            <span className="text-xs font-normal text-gray-500">{subjects.filter(s => !s.course && (subjectSearch === '' || s.name.toLowerCase().includes(subjectSearch.toLowerCase()))).length} disciplinas</span>
                                        </div>
                                        <div className="p-3 space-y-2">
                                            {subjects.filter(s => !s.course && (subjectSearch === '' || s.name.toLowerCase().includes(subjectSearch.toLowerCase()))).map(s => {
                                                const teacher = teachers.find(t => t.id === s.teacherId);
                                                return (
                                                    <div key={s.id} className="flex justify-between items-center bg-gray-50 p-2 rounded border text-sm">
                                                        <div>
                                                            <span className="font-medium block">{s.name}</span>
                                                            <span className="text-xs text-gray-500">Turma {s.classGroup} • {s.shift}</span>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                                                                {teacher?.name || 'Sem Docente'}
                                                            </span>
                                                            <Button variant="ghost" size="sm" onClick={() => handleDeleteSubject(s.id)} className="text-red-500 hover:text-red-700 h-8 w-8 p-0">
                                                                <Trash2 className="h-4 w-4"/>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="order-1 md:order-2 space-y-6">
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

                    <Card>
                        <CardHeader><CardTitle>Adicionar Disciplina Avulsa</CardTitle></CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddStandaloneSubject} className="space-y-4">
                                <div>
                                    <Label>Curso (Opcional)</Label>
                                    <Select 
                                        value={newStandaloneSubject.course} 
                                        onChange={e => setNewStandaloneSubject({...newStandaloneSubject, course: e.target.value, classGroup: ''})}
                                    >
                                        <option value="">Selecione o Curso...</option>
                                        {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </Select>
                                </div>
                                <div>
                                    <Label>Turma</Label>
                                    {newStandaloneSubjectCourseObj && newStandaloneSubjectCourseObj.classGroups && newStandaloneSubjectCourseObj.classGroups.length > 0 ? (
                                        <Select 
                                            value={newStandaloneSubject.classGroup} 
                                            onChange={e => setNewStandaloneSubject({...newStandaloneSubject, classGroup: e.target.value})}
                                        >
                                            <option value="">Turma...</option>
                                            {newStandaloneSubjectCourseObj.classGroups.map(g => (
                                                <option key={g} value={g}>{g}</option>
                                            ))}
                                        </Select>
                                    ) : (
                                        <Input 
                                            placeholder="Turma (ex: A)" 
                                            value={newStandaloneSubject.classGroup} 
                                            onChange={e => setNewStandaloneSubject({...newStandaloneSubject, classGroup: e.target.value})} 
                                        />
                                    )}
                                </div>
                                <div>
                                    <Label>Turno</Label>
                                    <Select value={newStandaloneSubject.shift} onChange={e => setNewStandaloneSubject({...newStandaloneSubject, shift: e.target.value as any})}>
                                        <option value="Diurno">Laboral</option>
                                        <option value="Noturno">Pós-Laboral</option>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Nome da Disciplina</Label>
                                    <Input 
                                        value={newStandaloneSubject.name} 
                                        onChange={e => setNewStandaloneSubject({...newStandaloneSubject, name: e.target.value})} 
                                        placeholder="Ex: Matemática Discreta"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label>Atribuir Docente (Opcional)</Label>
                                    <Select 
                                        value={newStandaloneSubject.teacherId} 
                                        onChange={e => setNewStandaloneSubject({...newStandaloneSubject, teacherId: e.target.value})}
                                    >
                                        <option value="">Sem Docente</option>
                                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </Select>
                                </div>
                                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={!newStandaloneSubject.name.trim()}>
                                    Adicionar Disciplina
                                </Button>
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
                            
                            {/* Subject Builder (ATUALIZADO) */}
                            <div className="bg-gray-50 p-4 rounded-md border">
                                <h4 className="text-sm font-semibold mb-2">Atribuir Disciplinas</h4>
                                <p className="text-xs text-gray-500 mb-3">Selecione o Curso e a Turma para adicionar disciplinas que o docente leciona.</p>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2 mb-2">
                                    
                                    {/* 1. Seleção de Curso */}
                                    <div className="md:col-span-2">
                                        <Select 
                                            value={tempSubject.course} 
                                            onChange={e => {
                                                const selectedCourse = courses.find(c => c.name === e.target.value);
                                                setTempSubject({...tempSubject, course: e.target.value, courseId: selectedCourse?.id, classGroup: ''});
                                            }}
                                        >
                                            <option value="">Selecione o Curso...</option>
                                            {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </Select>
                                    </div>

                                    {/* 2. Seleção de Turma (Baseada no Curso) */}
                                    <div className="md:col-span-1">
                                        {tempSubjectCourseObj && tempSubjectCourseObj.classGroups && tempSubjectCourseObj.classGroups.length > 0 ? (
                                            <Select 
                                                value={tempSubject.classGroup} 
                                                onChange={e => setTempSubject({...tempSubject, classGroup: e.target.value})}
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
                                                onChange={e => setTempSubject({...tempSubject, classGroup: e.target.value})} 
                                                title="Digite a turma manualmente"
                                            />
                                        )}
                                    </div>

                                    {/* 3. Nome da Disciplina */}
                                    <div className="md:col-span-2">
                                        <Input 
                                            list="available-subjects-list"
                                            placeholder="Nome da Disciplina" 
                                            value={tempSubject.name} 
                                            onChange={e => setTempSubject({...tempSubject, name: e.target.value})} 
                                        />
                                        <datalist id="available-subjects-list">
                                            {subjects
                                                .filter(s => s.course === tempSubject.course && (!tempSubject.classGroup || s.classGroup === tempSubject.classGroup))
                                                // Unique names to avoid duplicates in list if multiple shifts exist
                                                .filter((s, index, self) => index === self.findIndex((t) => t.name === s.name))
                                                .map(s => <option key={s.id} value={s.name} />)
                                            }
                                        </datalist>
                                    </div>

                                    {/* 4. Turno e Botão */}
                                    <div className="flex gap-2">
                                        <Select value={tempSubject.shift} onChange={e => setTempSubject({...tempSubject, shift: e.target.value as any})}>
                                            <option value="Diurno">Laboral (Diurno)</option>
                                            <option value="Noturno">Pós-Laboral (Noturno)</option>
                                        </Select>
                                        <Button type="button" onClick={handleAddTempSubject} className="w-full sm:w-auto"><Plus className="h-4 w-4"/></Button>
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
                        <div className="relative w-full max-w-xs">
                            <Input 
                                placeholder="Pesquisar docente..." 
                                value={teacherSearch} 
                                onChange={e => setTeacherSearch(e.target.value)}
                                className="pl-8"
                            />
                            <Users className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {teachers.filter(t => t.name.toLowerCase().includes(teacherSearch.toLowerCase()) || t.email.toLowerCase().includes(teacherSearch.toLowerCase())).map(t => (
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
                                        <Button variant="outline" size="sm" onClick={() => setAssigningSubjectTeacher(t)} title="Atribuir Disciplinas">
                                            <BookOpen className="h-4 w-4" />
                                        </Button>
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

        {activeTab === 'students' && (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Estudantes</CardTitle>
                        <div className="relative w-full max-w-xs">
                            <Input 
                                placeholder="Pesquisar estudante..." 
                                value={studentSearch} 
                                onChange={e => setStudentSearch(e.target.value)}
                                className="pl-8"
                            />
                            <Users className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {students.length === 0 && <p className="text-gray-500 italic">Nenhum estudante cadastrado.</p>}
                            {students.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.email.toLowerCase().includes(studentSearch.toLowerCase())).map(s => (
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

        {/* --- ABA AUDITORIA (NOVA) --- */}
        {activeTab === 'audit' && (
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2"><History size={20}/> Log de Auditoria</CardTitle>
                            <Button variant="ghost" size="sm" onClick={() => BackendService.getAuditLogs(institutionId).then(setAuditLogs)}><RefreshCw size={14} className="mr-2"/> Atualizar</Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                                {auditLogs.length === 0 && <p className="text-center py-8 text-gray-500 italic">Nenhum log de auditoria encontrado.</p>}
                                {auditLogs.map(log => (
                                    <div key={log.id} className="p-4 border rounded-lg bg-gray-50 hover:bg-white transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                    log.action.includes('DELETE') ? 'bg-red-100 text-red-700' : 
                                                    log.action.includes('UPDATE') ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {log.action.replace('_', ' ')}
                                                </span>
                                                <span className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleString()}</span>
                                            </div>
                                            <span className="text-[10px] font-mono text-gray-400">ID: {log.targetId}</span>
                                        </div>
                                        <p className="text-sm text-gray-800">
                                            <strong>{log.userName}</strong> ({log.userRole}) realizou a ação no objeto <strong>{log.targetType}</strong>.
                                        </p>
                                        {log.oldValues && (
                                            <div className="mt-2 p-2 bg-white border rounded text-[11px] text-gray-600">
                                                <p className="font-bold mb-1">Dados Anteriores:</p>
                                                <pre className="whitespace-pre-wrap">{JSON.stringify(log.oldValues, null, 2)}</pre>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Calendar size={20}/> Períodos Académicos</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                {academicPeriods.length === 0 && <p className="text-sm text-gray-500 italic">Nenhum período cadastrado.</p>}
                                {academicPeriods.map(p => (
                                    <div key={p.id} className={`p-3 border rounded-lg flex items-center justify-between ${p.isCurrent ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
                                        <div>
                                            <h4 className="font-bold text-sm">{p.name}</h4>
                                            <p className="text-[10px] text-gray-500">{new Date(p.startDate).toLocaleDateString()} - {new Date(p.endDate).toLocaleDateString()}</p>
                                        </div>
                                        {p.isCurrent ? (
                                            <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">ATUAL</span>
                                        ) : (
                                            <Button variant="ghost" size="sm" onClick={() => handleSetCurrentPeriod(p.id)} className="text-[10px] h-7">Ativar</Button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4 border-t space-y-3">
                                <h4 className="text-xs font-bold uppercase text-gray-500">Novo Período</h4>
                                <div className="space-y-2">
                                    <Label className="text-xs">Nome (ex: 2024 - 1º Semestre)</Label>
                                    <Input value={newPeriodName} onChange={e => setNewPeriodName(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Início</Label>
                                        <Input type="date" value={newPeriodStart} onChange={e => setNewPeriodStart(e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Fim</Label>
                                        <Input type="date" value={newPeriodEnd} onChange={e => setNewPeriodEnd(e.target.value)} />
                                    </div>
                                </div>
                                <Button className="w-full" size="sm" onClick={handleAddAcademicPeriod}>Adicionar Período</Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-amber-50 border-amber-200">
                        <CardHeader>
                            <CardTitle className="text-amber-800 flex items-center gap-2 text-sm"><AlertTriangle size={16}/> Zona de Perigo</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-amber-700 mb-4">A limpeza do sistema removerá todos os dados locais permanentemente.</p>
                            <Button variant="outline" className="w-full border-amber-300 text-amber-700 hover:bg-amber-100" onClick={() => BackendService.resetSystem()}>
                                <RotateCcw size={14} className="mr-2"/> Limpar Dados Locais
                            </Button>
                        </CardContent>
                    </Card>
                </div>
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

                        <div className="pt-4 border-t">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                                <div>
                                    <h4 className="font-bold text-slate-900">Período de Avaliação</h4>
                                    <p className="text-sm text-slate-500">Ative ou desative o acesso dos estudantes e docentes aos formulários.</p>
                                </div>
                                <div 
                                    onClick={() => institution && setInstitution({...institution, isEvaluationOpen: !institution.isEvaluationOpen})}
                                    className={`w-14 h-7 rounded-full p-1 cursor-pointer transition-colors duration-200 ${institution?.isEvaluationOpen ? 'bg-green-500' : 'bg-gray-300'}`}
                                >
                                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${institution?.isEvaluationOpen ? 'translate-x-7' : 'translate-x-0'}`} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <h4 className="font-bold text-slate-900">Datas de Avaliação Automática</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs">Data de Início</Label>
                                    <Input type="date" value={institution?.evaluationStartDate || ''} onChange={e => institution && setInstitution({...institution, evaluationStartDate: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Data de Fim</Label>
                                    <Input type="date" value={institution?.evaluationEndDate || ''} onChange={e => institution && setInstitution({...institution, evaluationEndDate: e.target.value})} />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">Se as datas forem definidas, o sistema abrirá/fechará automaticamente nestes dias.</p>
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <h4 className="font-bold text-slate-900">Pontuação Máxima por Categoria</h4>
                            <div className="space-y-2">
                                {['assistente', 'assistente_estagiario'].map(cat => {
                                    const weight = institution?.categoryWeights?.find(w => w.category === cat)?.maxPoints || (cat === 'assistente' ? 175 : 125);
                                    return (
                                        <div key={cat} className="flex items-center justify-between gap-4">
                                            <Label className="capitalize">{cat.replace('_', ' ')}</Label>
                                            <Input 
                                                type="number" 
                                                className="w-24"
                                                value={weight} 
                                                onChange={e => {
                                                    if (!institution) return;
                                                    const weights = institution.categoryWeights || [];
                                                    const idx = weights.findIndex(w => w.category === (cat as any));
                                                    const newWeights = [...weights];
                                                    if (idx >= 0) newWeights[idx] = { category: cat as any, maxPoints: parseInt(e.target.value) || 0 };
                                                    else newWeights.push({ category: cat as any, maxPoints: parseInt(e.target.value) || 0 });
                                                    setInstitution({...institution, categoryWeights: newWeights});
                                                }} 
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <Button type="submit" className="w-full md:w-auto">Salvar Alterações</Button>
                    </form>
                </CardContent>
            </Card>
        )}

      </div>
    </div>
  );
};
