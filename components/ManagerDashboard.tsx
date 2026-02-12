import React, { useState, useEffect, useMemo } from 'react';
import { BackendService } from '../services/backend';
import { User, UserRole, Subject, Questionnaire, QuestionType, TeacherCategory, Question, Institution } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, cn } from './ui';
import { Users, BookOpen, Plus, Trash2, GraduationCap, Settings, Briefcase, FileText, Star, FileDown, Printer, Download, Save, Eye, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface Props {
  institutionId: string;
}

export const ManagerDashboard: React.FC<Props> = ({ institutionId }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'teachers' | 'students' | 'subjects' | 'questionnaire' | 'settings'>('overview');
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  const [qTarget, setQTarget] = useState<'student' | 'teacher'>('student');
  const [editingQuestions, setEditingQuestions] = useState<Question[]>([]);
  const [qTitle, setQTitle] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  useEffect(() => { loadData(); }, [institutionId]);
  useEffect(() => { loadCurrentQuestionnaire(); }, [qTarget, institutionId]);

  const loadData = async () => {
    try {
        const inst = await BackendService.getInstitution(institutionId);
        if (inst) setInstitution(inst);
        const allUsers = await BackendService.getUsers();
        setTeachers(allUsers.filter(u => u.role === UserRole.TEACHER && u.institutionId === institutionId));
        setStudents(allUsers.filter(u => u.role === UserRole.STUDENT && u.institutionId === institutionId));
        setSubjects(await BackendService.getInstitutionSubjects(institutionId));
    } catch (e) { console.error(e); }
  };

  const loadCurrentQuestionnaire = async () => {
    const q = await BackendService.getInstitutionQuestionnaire(institutionId, qTarget);
    if (q) { setEditingQuestions(q.questions); setQTitle(q.title); }
    else { setEditingQuestions([]); setQTitle(qTarget === 'student' ? 'Avaliação do Docente pelos Alunos' : 'Auto-Avaliação Docente'); }
  };

  const exportToExcel = (type: 'teachers' | 'students') => {
    const data = type === 'teachers' ? teachers : students;
    const headers = type === 'teachers' 
      ? ["ID", "Nome", "Email", "Categoria", "Cadeiras"] 
      : ["ID", "Nome", "Email", "Curso", "Nivel", "Turma"];
    
    const rows = data.map(u => {
      if (type === 'teachers') return [u.id, u.name, u.email, u.category, ''];
      return [u.id, u.name, u.email, u.course, u.level, u.classGroups?.[0]];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers, ...rows].map(e => e.join(",")).join("\n");
    
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `${type}_${institution?.code}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveQuestionnaire = async () => {
    await BackendService.saveQuestionnaire({
      id: 'q_' + qTarget + '_' + institutionId,
      institutionId, title: qTitle, targetRole: qTarget, questions: editingQuestions, active: true
    });
    alert("Inquérito publicado!");
  };

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
          <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-black text-white rounded-lg flex items-center justify-center font-black text-sm">
                  {institution?.code.slice(0,2)}
              </div>
              <div>
                  <h1 className="text-sm font-black uppercase tracking-tighter leading-none mb-1">Painel do Gestor</h1>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{institution?.name}</p>
              </div>
          </div>
          <div className="flex bg-gray-100/50 p-1 rounded-xl flex-wrap gap-1 border border-gray-200 no-print">
              {[
                  {id: 'overview', label: 'Início', icon: Briefcase},
                  {id: 'teachers', label: 'Docentes', icon: Users},
                  {id: 'students', label: 'Estudantes', icon: GraduationCap},
                  {id: 'subjects', label: 'Cadeiras', icon: BookOpen},
                  {id: 'questionnaire', label: 'Inquéritos', icon: FileText},
                  {id: 'settings', label: 'Definições', icon: Settings},
              ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={cn("px-3 py-1.5 text-[9px] font-black rounded-lg flex items-center gap-2 transition-all uppercase tracking-wider", activeTab === tab.id ? "bg-white shadow-sm text-black border border-gray-200" : "text-gray-400 hover:text-gray-700")}>
                      <tab.icon size={12} /> {tab.label}
                  </button>
              ))}
          </div>
        </header>

        {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-blue-50/50 border-none"><CardContent className="pt-4"><Label>Docentes</Label><p className="text-2xl font-black">{teachers.length}</p></CardContent></Card>
                <Card className="bg-indigo-50/50 border-none"><CardContent className="pt-4"><Label>Estudantes</Label><p className="text-2xl font-black">{students.length}</p></CardContent></Card>
                <Card className="bg-purple-50/50 border-none"><CardContent className="pt-4"><Label>Disciplinas</Label><p className="text-2xl font-black">{subjects.length}</p></CardContent></Card>
                <Card className="bg-amber-50/50 border-none"><CardContent className="pt-4"><Label>Estado</Label><p className="text-[10px] font-black uppercase">{institution?.isEvaluationOpen ? 'Aberto' : 'Encerrado'}</p></CardContent></Card>
            </div>
        )}

        {activeTab === 'teachers' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center no-print">
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Gestão de Corpo Docente</h2>
              <div className="flex gap-2">
                <Button size="xs" variant="outline" onClick={() => exportToExcel('teachers')}><FileDown size={14} className="mr-1"/> Excel</Button>
                <Button size="xs" variant="outline" onClick={() => window.print()}><Printer size={14} className="mr-1"/> PDF</Button>
              </div>
            </div>
            <TeachersTab teachers={teachers} institutionId={institutionId} onUpdate={loadData} />
          </div>
        )}

        {activeTab === 'students' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center no-print">
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Gestão de Estudantes</h2>
              <Button size="xs" variant="outline" onClick={() => exportToExcel('students')}><FileDown size={14} className="mr-1"/> Exportar Excel</Button>
            </div>
            <StudentsTab students={students} institutionId={institutionId} onUpdate={loadData} />
          </div>
        )}

        {activeTab === 'subjects' && (
          <SubjectsTab subjects={subjects} teachers={teachers} institutionId={institutionId} onUpdate={loadData} />
        )}

        {activeTab === 'questionnaire' && (
            <div className="grid md:grid-cols-3 gap-6">
                <Card className="md:col-span-1 no-print">
                    <CardHeader><CardTitle>Editor</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <Label>Alvo</Label>
                            <Select value={qTarget} onChange={e => setQTarget(e.target.value as any)}>
                                <option value="student">Estudantes avaliando Docentes</option>
                                <option value="teacher">Docentes (Auto-Avaliação)</option>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Título</Label>
                            <Input value={qTitle} onChange={e => setQTitle(e.target.value)} />
                        </div>
                        <Button className="w-full" onClick={handleSaveQuestionnaire}><Save size={14} className="mr-1"/> Publicar</Button>
                    </CardContent>
                </Card>
                <div className="md:col-span-2 space-y-4">
                    <div className="flex justify-between items-center no-print">
                        <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Questões do Inquérito</h2>
                        <Button size="xs" onClick={() => setEditingQuestions([...editingQuestions, { id: Date.now().toString(), text: 'Nova pergunta...', type: 'stars', weight: 5 }])}>+ Pergunta</Button>
                    </div>
                    {editingQuestions.map((q, idx) => (
                        <Card key={q.id} className="card">
                            <CardContent className="p-4 flex gap-4">
                                <div className="text-xs font-black text-gray-300 pt-2">{idx + 1}</div>
                                <div className="flex-1 space-y-2">
                                    <Input value={q.text} onChange={e => {
                                        const newQ = [...editingQuestions];
                                        newQ[idx].text = e.target.value;
                                        setEditingQuestions(newQ);
                                    }} />
                                    <div className="flex gap-2">
                                        <Select className="flex-1" value={q.type} onChange={e => {
                                            const newQ = [...editingQuestions];
                                            newQ[idx].type = e.target.value as any;
                                            setEditingQuestions(newQ);
                                        }}>
                                            <option value="stars">Estrelas (1-5)</option>
                                            <option value="binary">Sim/Não</option>
                                            <option value="scale_10">Escala (1-10)</option>
                                            <option value="text">Texto Livre</option>
                                        </Select>
                                        <Input type="number" className="w-20" placeholder="Peso" value={q.weight} onChange={e => {
                                            const newQ = [...editingQuestions];
                                            newQ[idx].weight = parseInt(e.target.value);
                                            setEditingQuestions(newQ);
                                        }} />
                                        <Button variant="ghost" size="xs" onClick={() => setEditingQuestions(editingQuestions.filter((_, i) => i !== idx))} className="text-red-500"><Trash2 size={14}/></Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'settings' && (
          <Card className="max-w-md mx-auto">
            <CardHeader><CardTitle>Acesso e Período</CardTitle></CardHeader>
            <CardContent className="space-y-4">
               <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-xs font-bold uppercase">Estado do Portal</span>
                  <Button size="xs" variant={institution?.isEvaluationOpen ? 'destructive' : 'primary'} onClick={() => BackendService.updateInstitution(institutionId, { isEvaluationOpen: !institution?.isEvaluationOpen }).then(loadData)}>
                    {institution?.isEvaluationOpen ? 'Fechar' : 'Abrir'}
                  </Button>
               </div>
               <div className="space-y-1">
                  <Label>Identificador do Semestre</Label>
                  <Input value={institution?.evaluationPeriodName} onBlur={e => BackendService.updateInstitution(institutionId, { evaluationPeriodName: e.target.value }).then(loadData)} />
               </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
};

const TeachersTab = ({ teachers, institutionId, onUpdate }: any) => {
    const [f, setF] = useState({ name: '', email: '', pwd: '', cat: 'assistente' as any });
    const add = async (e: any) => { 
        e.preventDefault(); 
        await BackendService.addTeacher(institutionId, f.name, f.email, f.pwd, '', f.cat); 
        setF({ name: '', email: '', pwd: '', cat: 'assistente' }); 
        onUpdate(); 
    };
    return (
        <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-1 no-print">
                <CardHeader><CardTitle>Registar Docente</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={add} className="space-y-3">
                        <div className="space-y-1"><Label>Nome Completo</Label><Input value={f.name} onChange={e=>setF({...f, name: e.target.value})} required /></div>
                        <div className="space-y-1"><Label>Email Institucional</Label><Input type="email" value={f.email} onChange={e=>setF({...f, email: e.target.value})} required /></div>
                        <div className="space-y-1"><Label>Categoria</Label>
                            <Select value={f.cat} onChange={e=>setF({...f, cat: e.target.value as any})}>
                                <option value="assistente">Assistente</option>
                                <option value="auxiliar">Auxiliar</option>
                                <option value="associado">Associado</option>
                                <option value="catedratico">Catedrático</option>
                            </Select>
                        </div>
                        <Button type="submit" className="w-full">Adicionar</Button>
                    </form>
                </CardContent>
            </Card>
            <div className="md:col-span-2 space-y-2">
                {teachers.map((t: any) => (
                    <Card key={t.id} className="card">
                        <CardContent className="p-3 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 bg-blue-100 rounded text-blue-700 flex items-center justify-center font-black text-xs">{t.name[0]}</div>
                                <div><p className="font-bold text-xs">{t.name}</p><p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{t.category} • {t.email}</p></div>
                            </div>
                            <Button size="xs" variant="ghost" onClick={() => BackendService.deleteUser(t.id).then(onUpdate)} className="text-red-300 hover:text-red-500 no-print"><Trash2 size={14}/></Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};

const StudentsTab = ({ students, institutionId, onUpdate }: any) => {
    const [f, setF] = useState({ name: '', email: '', course: '', level: '1', group: 'A' });
    const add = async (e: any) => {
        e.preventDefault();
        await BackendService.addStudent(institutionId, f.name, f.email, '123456', f.course, f.level, '', ['Diurno'], [f.group]);
        setF({ name: '', email: '', course: '', level: '1', group: 'A' });
        onUpdate();
    };
    return (
        <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-1 no-print">
                <CardHeader><CardTitle>Matricular Aluno</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={add} className="space-y-3">
                        <div className="space-y-1"><Label>Nome</Label><Input value={f.name} onChange={e=>setF({...f, name: e.target.value})} required /></div>
                        <div className="space-y-1"><Label>Email</Label><Input type="email" value={f.email} onChange={e=>setF({...f, email: e.target.value})} required /></div>
                        <div className="space-y-1"><Label>Curso</Label><Input value={f.course} onChange={e=>setF({...f, course: e.target.value})} required /></div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1"><Label>Ano</Label>
                                <Select value={f.level} onChange={e=>setF({...f, level: e.target.value})}>
                                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}º Ano</option>)}
                                </Select>
                            </div>
                            <div className="space-y-1"><Label>Turma</Label><Input value={f.group} onChange={e=>setF({...f, group: e.target.value.toUpperCase()})} maxLength={2} /></div>
                        </div>
                        <Button type="submit" className="w-full">Registar</Button>
                    </form>
                </CardContent>
            </Card>
            <div className="md:col-span-2 space-y-2">
                {students.map((s: any) => (
                    <Card key={s.id}>
                        <CardContent className="p-3 flex justify-between items-center">
                            <div><p className="font-bold text-xs">{s.name}</p><p className="text-[9px] text-gray-400 uppercase font-black tracking-widest">{s.course} • {s.level}º Ano • Turma {s.classGroups?.[0]}</p></div>
                            <Button size="xs" variant="ghost" onClick={() => BackendService.deleteUser(s.id).then(onUpdate)} className="text-red-300 no-print"><Trash2 size={14}/></Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};

const SubjectsTab = ({ subjects, teachers, institutionId, onUpdate }: any) => {
  const [f, setF] = useState({ name: '', code: '', tid: '', course: '', level: '1', group: 'A', shift: 'Diurno' });
  const add = async (e: any) => {
      e.preventDefault();
      await BackendService.assignSubject({ ...f, institutionId, teacherId: f.tid, classGroup: f.group, semester: '1', academicYear: '2024' });
      setF({ name: '', code: '', tid: '', course: '', level: '1', group: 'A', shift: 'Diurno' });
      onUpdate();
  };
  return (
      <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
              <CardHeader><CardTitle>Nova Cadeira</CardTitle></CardHeader>
              <CardContent>
                  <form onSubmit={add} className="space-y-3">
                      <div className="space-y-1"><Label>Nome da Cadeira</Label><Input value={f.name} onChange={e=>setF({...f, name: e.target.value})} required /></div>
                      <div className="space-y-1"><Label>Curso</Label><Input value={f.course} onChange={e=>setF({...f, course: e.target.value})} required /></div>
                      <div className="space-y-1"><Label>Docente Responsável</Label>
                          <Select value={f.tid} onChange={e=>setF({...f, tid: e.target.value})} required>
                              <option value="">-- Selecionar --</option>
                              {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1"><Label>Ano</Label>
                            <Select value={f.level} onChange={e=>setF({...f, level: e.target.value})}>
                                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}º Ano</option>)}
                            </Select>
                          </div>
                          <div className="space-y-1"><Label>Turma</Label><Input value={f.group} onChange={e=>setF({...f, group: e.target.value.toUpperCase()})} /></div>
                      </div>
                      <Button type="submit" className="w-full">Vincular</Button>
                  </form>
              </CardContent>
          </Card>
          <div className="md:col-span-2 space-y-2">
              {subjects.map((s: any) => (
                  <Card key={s.id}>
                      <CardContent className="p-3 flex justify-between items-center">
                          <div>
                              <p className="font-bold text-xs">{s.name}</p>
                              <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest">
                                {s.course} • {s.level}º Ano • Turma {s.classGroup} • Responsável: {teachers.find((t:any)=>t.id===s.teacherId)?.name || 'N/A'}
                              </p>
                          </div>
                          <Button size="xs" variant="ghost" onClick={() => BackendService.deleteSubject(s.id).then(onUpdate)} className="text-red-300 no-print"><Trash2 size={14}/></Button>
                      </CardContent>
                  </Card>
              ))}
          </div>
      </div>
  );
};