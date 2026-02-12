
import React, { useState, useEffect, useMemo } from 'react';
import { BackendService } from '../services/backend';
import { User, UserRole, Subject, Question, Institution, CombinedScore } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, cn } from './ui';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, CartesianGrid } from 'recharts';
import { Users, BookOpen, Trash2, GraduationCap, Settings, Briefcase, FileText, Star, FileDown, Printer, Calculator, Download, CheckCircle, Search, ClipboardList, Save, TrendingUp, Activity, Filter, X, IdCard, Calendar, FileSpreadsheet, Plus, MapPin, Clock, Globe } from 'lucide-react';

interface Props {
  institutionId: string;
}

export const ManagerDashboard: React.FC<Props> = ({ institutionId }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'teachers' | 'students' | 'subjects' | 'questionnaire' | 'reports' | 'settings'>('overview');
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [scores, setScores] = useState<CombinedScore[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterSemester, setFilterSemester] = useState<string>('all');
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  
  const [qTarget, setQTarget] = useState<'student' | 'teacher'>('student');
  const [editingQuestions, setEditingQuestions] = useState<Question[]>([]);
  const [qTitle, setQTitle] = useState('');

  useEffect(() => { loadData(); }, [institutionId]);

  const loadData = async () => {
    try {
        const inst = await BackendService.getInstitution(institutionId);
        if (inst) setInstitution(inst);
        const allUsers = await BackendService.getUsers();
        setTeachers(allUsers.filter(u => u.role === UserRole.TEACHER && u.institutionId === institutionId));
        setStudents(allUsers.filter(u => u.role === UserRole.STUDENT && u.institutionId === institutionId));
        setSubjects(await BackendService.getInstitutionSubjects(institutionId));
        const resScores = await BackendService.getAllScores(institutionId);
        setScores(resScores);
    } catch (e) { console.error(e); }
  };

  const filterOptions = useMemo(() => {
    const years = Array.from(new Set(subjects.map(s => s.academicYear).filter(Boolean)));
    const courses = Array.from(new Set(subjects.map(s => s.course).filter(Boolean)));
    const groups = Array.from(new Set(subjects.map(s => s.classGroup).filter(Boolean)));
    return { years: years.sort(), courses: courses.sort(), groups: groups.sort() };
  }, [subjects]);

  const filteredTeachersData = useMemo(() => {
    let filteredSubjects = [...subjects];
    if (filterYear !== 'all') filteredSubjects = filteredSubjects.filter(s => s.academicYear === filterYear);
    if (filterSemester !== 'all') filteredSubjects = filteredSubjects.filter(s => s.semester === filterSemester);
    if (filterCourse !== 'all') filteredSubjects = filteredSubjects.filter(s => s.course === filterCourse);
    if (filterGroup !== 'all') filteredSubjects = filteredSubjects.filter(s => s.classGroup === filterGroup);

    const relevantTeacherIds = new Set(filteredSubjects.map(s => s.teacherId));
    const isAnyFilterActive = filterYear !== 'all' || filterSemester !== 'all' || filterCourse !== 'all' || filterGroup !== 'all';
    
    const displayTeachers = isAnyFilterActive 
        ? teachers.filter(t => relevantTeacherIds.has(t.id))
        : teachers;

    const displayScores = scores.filter(s => displayTeachers.some(t => t.id === s.teacherId));

    return { displayTeachers, displayScores };
  }, [teachers, subjects, scores, filterYear, filterSemester, filterCourse, filterGroup]);

  const filteredStudentsList = useMemo(() => {
      return students.filter(s => {
          const matchCourse = filterCourse === 'all' || s.course === filterCourse;
          const matchLevel = filterYear === 'all' || s.level === filterYear; 
          const matchGroup = filterGroup === 'all' || (s.classGroups && s.classGroups.includes(filterGroup));
          const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (s.studentCode && s.studentCode.toLowerCase().includes(searchTerm.toLowerCase()));
          return matchCourse && matchLevel && matchGroup && matchSearch;
      });
  }, [students, filterCourse, filterYear, filterGroup, searchTerm]);

  const handleCalculate = async () => {
    setIsCalculating(true);
    await BackendService.calculateScores(institutionId);
    await loadData();
    setIsCalculating(false);
  };

  const exportToExcel = () => {
    const headers = ["Docente", "Email", "Nota Alunos (12%)", "Nota Auto (80%)", "Nota Gestão (8%)", "Média Final (20)", "Resultado"];
    const rows = filteredTeachersData.displayTeachers.map(t => {
      const s = scores.find(sc => sc.teacherId === t.id);
      return [
        t.name,
        t.email,
        s?.studentScore.toFixed(2) || '0.00',
        s?.selfEvalScore.toFixed(2) || '0.00',
        s?.institutionalScore.toFixed(2) || '0.00',
        s?.finalScore.toFixed(2) || '0.00',
        (s?.finalScore || 0) >= 10 ? "APROVADO" : "REPROVADO"
      ];
    });

    const delimiter = ";";
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(delimiter)).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `pauta_avaliaca_docentes.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderFilterBar = () => (
    <div className="bg-white border rounded-2xl shadow-sm p-4 flex flex-wrap gap-4 items-end no-print animate-fade-in border-gray-100">
        <div className="space-y-1 flex-1 min-w-[140px]">
            <Label className="flex items-center gap-1.5"><Calendar size={10}/> Ano Lectivo</Label>
            <Select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="h-9 text-xs">
                <option value="all">Todos os Anos</option>
                {filterOptions.years.map(y => <option key={y} value={y}>{y}</option>)}
            </Select>
        </div>
        <div className="space-y-1 flex-1 min-w-[110px]">
            <Label>Semestre</Label>
            <Select value={filterSemester} onChange={e => setFilterSemester(e.target.value)} className="h-9 text-xs">
                <option value="all">Todos</option>
                <option value="1">1º Semestre</option>
                <option value="2">2º Semestre</option>
            </Select>
        </div>
        <div className="space-y-1 flex-[2] min-w-[180px]">
            <Label>Curso / Departamento</Label>
            <Select value={filterCourse} onChange={e => setFilterCourse(e.target.value)} className="h-9 text-xs">
                <option value="all">Toda Instituição</option>
                {filterOptions.courses.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
        </div>
        <div className="space-y-1 flex-1 min-w-[110px]">
            <Label>Turma</Label>
            <Select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} className="h-9 text-xs">
                <option value="all">Todas</option>
                {filterOptions.groups.map(g => <option key={g} value={g}>Turma {g}</option>)}
            </Select>
        </div>
        <Button size="xs" variant="ghost" onClick={() => { setFilterYear('all'); setFilterSemester('all'); setFilterCourse('all'); setFilterGroup('all'); }} className="h-9 text-gray-400 hover:text-red-500 font-bold">
            <X size={14} className="mr-1"/> Limpar
        </Button>
    </div>
  );

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4 no-print">
          <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-black text-white rounded-xl flex items-center justify-center font-black text-sm">
                  {institution?.code.slice(0,2) || 'AD'}
              </div>
              <div>
                  <h1 className="text-sm font-black uppercase tracking-tighter leading-none mb-1">Painel do Gestor</h1>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{institution?.name || 'Carregando...'}</p>
              </div>
          </div>
          <div className="flex bg-gray-100/50 p-1 rounded-xl flex-wrap gap-1 border border-gray-200">
              {[
                  {id: 'overview', label: 'Dashboard', icon: Briefcase},
                  {id: 'teachers', label: 'Docentes', icon: Users},
                  {id: 'students', label: 'Estudantes', icon: GraduationCap},
                  {id: 'subjects', label: 'Disciplinas', icon: BookOpen},
                  {id: 'reports', label: 'Relatórios', icon: FileSpreadsheet},
                  {id: 'questionnaire', label: 'Inquéritos', icon: FileText},
                  {id: 'settings', label: 'Configurações', icon: Settings},
              ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={cn("px-3 py-1.5 text-[9px] font-black rounded-lg flex items-center gap-2 transition-all uppercase tracking-wider", activeTab === tab.id ? "bg-white shadow-sm text-black border border-gray-200" : "text-gray-400 hover:text-gray-700")}>
                      <tab.icon size={12} /> {tab.label}
                  </button>
              ))}
          </div>
        </header>

        {(activeTab === 'overview' || activeTab === 'reports' || activeTab === 'students') && renderFilterBar()}

        {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-white p-4 flex items-center gap-4 border-none shadow-sm">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Users size={20}/></div>
                    <div><Label className="text-[8px] mb-1 block">Docentes</Label><p className="text-xl font-black">{filteredTeachersData.displayTeachers.length}</p></div>
                </Card>
                <Card className="bg-white p-4 flex items-center gap-4 border-none shadow-sm">
                    <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><GraduationCap size={20}/></div>
                    <div><Label className="text-[8px] mb-1 block">Estudantes</Label><p className="text-xl font-black">{filteredStudentsList.length}</p></div>
                </Card>
                <Card className="bg-white p-4 flex items-center gap-4 border-none shadow-sm">
                    <div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center"><Activity size={20}/></div>
                    <div><Label className="text-[8px] mb-1 block">Avaliações</Label><p className="text-xl font-black">{filteredTeachersData.displayScores.length}</p></div>
                </Card>
                <Card className="bg-black text-white p-4 flex items-center gap-4 border-none shadow-lg">
                    <div className="h-10 w-10 rounded-lg bg-white/10 text-white flex items-center justify-center"><TrendingUp size={20}/></div>
                    <div><Label className="text-white/40 text-[8px] mb-1 block">Status</Label><p className="text-[10px] font-black uppercase">Activo</p></div>
                </Card>
            </div>
        )}

        {activeTab === 'reports' && (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xs font-black uppercase text-gray-400">Pauta de Resultados</h2>
                    <div className="flex gap-2">
                        <Button size="xs" variant="secondary" onClick={handleCalculate} disabled={isCalculating}><Calculator size={14} className="mr-1"/> Recalcular</Button>
                        <Button size="xs" variant="outline" onClick={exportToExcel} className="text-emerald-600 border-emerald-200"><FileSpreadsheet size={14} className="mr-1"/> Exportar Excel</Button>
                    </div>
                </div>
                <div className="grid gap-2">
                    {filteredTeachersData.displayTeachers.map(t => {
                        const s = scores.find(sc => sc.teacherId === t.id);
                        return (
                            <Card key={t.id} className="p-4 flex justify-between items-center bg-white border-none shadow-sm">
                                <div><p className="font-bold text-xs">{t.name}</p><p className="text-[8px] text-gray-400 font-bold">{t.email}</p></div>
                                <div className="flex gap-4 text-center">
                                    <div className="px-3 border-r"><p className="text-[7px] text-gray-400 font-bold uppercase">Média Final</p><p className="text-xs font-black">{s?.finalScore.toFixed(2) || '0.00'}</p></div>
                                    <Button size="xs" variant="ghost" onClick={() => {
                                        const val = prompt("Atribuir Nota de Gestão (0-20):", "14");
                                        if (val) BackendService.saveQualitativeEval({ teacherId: t.id, institutionId, score: parseFloat(val) }).then(handleCalculate);
                                    }} className="text-amber-500"><Star size={16}/></Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </div>
        )}

        {activeTab === 'students' && <StudentsTab studentsList={filteredStudentsList} institutionId={institutionId} onUpdate={loadData} />}
        {activeTab === 'teachers' && <TeachersTab teachers={teachers} institutionId={institutionId} onUpdate={loadData} />}
        {activeTab === 'subjects' && <SubjectsTab subjects={subjects} teachers={teachers} institutionId={institutionId} onUpdate={loadData} />}
        {activeTab === 'settings' && <SettingsTab institution={institution} institutionId={institutionId} onUpdate={loadData} />}
    </div>
  );
};

const StudentsTab = ({ studentsList, institutionId, onUpdate }: any) => {
    const [f, setF] = useState({ 
      name: '', 
      email: '', 
      studentCode: '', 
      course: '', 
      level: '1', 
      semester: '1' as '1' | '2', 
      group: 'A',
      shift: 'Diurno' as 'Diurno' | 'Noturno',
      modality: 'Presencial' as 'Presencial' | 'Online'
    });

    const add = async (e: any) => { 
        e.preventDefault(); 
        await BackendService.addStudent(
          institutionId, 
          f.name, 
          f.email, 
          '123456', 
          f.course, 
          f.level, 
          f.studentCode, 
          f.semester, 
          [f.group],
          f.shift,
          f.modality
        ); 
        setF({ 
          name: '', email: '', studentCode: '', course: '', level: '1', semester: '1', group: 'A',
          shift: 'Diurno', modality: 'Presencial'
        }); 
        onUpdate(); 
    };

    return (
        <div className="grid md:grid-cols-3 gap-6 animate-fade-in">
            <Card className="md:col-span-1 p-6 shadow-xl bg-white border-none rounded-[2rem]">
                <CardHeader className="px-0 pt-0 pb-4 border-b mb-6">
                  <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                    <Plus size={16} className="text-blue-600"/> Matrícula de Estudante
                  </CardTitle>
                </CardHeader>
                <form onSubmit={add} className="space-y-4">
                  <div className="space-y-1">
                    <Label>Nome Completo</Label>
                    <Input placeholder="Nome do Aluno" value={f.name} onChange={e=>setF({...f, name: e.target.value})} required className="h-11 rounded-xl" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Cód. Estudante</Label>
                      <Input placeholder="Ex: 2024001" value={f.studentCode} onChange={e=>setF({...f, studentCode: e.target.value})} required className="h-11 rounded-xl" />
                    </div>
                    <div className="space-y-1">
                      <Label>Email</Label>
                      <Input type="email" placeholder="Email" value={f.email} onChange={e=>setF({...f, email: e.target.value})} required className="h-11 rounded-xl" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Curso / Licenciatura</Label>
                    <Input placeholder="Ex: Engenharia Civil" value={f.course} onChange={e=>setF({...f, course: e.target.value})} required className="h-11 rounded-xl" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label>Ano Frequência</Label>
                      <Select value={f.level} onChange={e=>setF({...f, level: e.target.value})} className="h-11 rounded-xl">
                        {[1,2,3,4,5,6].map(l=><option key={l} value={l}>{l}º Ano</option>)}
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Semestre</Label>
                      <Select value={f.semester} onChange={e=>setF({...f, semester: e.target.value as any})} className="h-11 rounded-xl">
                        <option value="1">1º Sem.</option>
                        <option value="2">2º Sem.</option>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Turma</Label>
                      <Input placeholder="A" value={f.group} onChange={e=>setF({...f, group: e.target.value})} className="h-11 rounded-xl" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Horário / Turno</Label>
                      <Select value={f.shift} onChange={e=>setF({...f, shift: e.target.value as any})} className="h-11 rounded-xl">
                        <option value="Diurno">Diurno</option>
                        <option value="Noturno">Noturno</option>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Modalidade</Label>
                      <Select value={f.modality} onChange={e=>setF({...f, modality: e.target.value as any})} className="h-11 rounded-xl">
                        <option value="Presencial">Presencial</option>
                        <option value="Online">Online / EAD</option>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-100 rounded-2xl font-black mt-2">
                    Efectuar Matrícula
                  </Button>
                </form>
            </Card>
            <div className="md:col-span-2 space-y-4">
              <div className="flex justify-between items-center px-2">
                <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                  Base de Dados de Estudantes ({studentsList.length})
                </h3>
              </div>
              <div className="max-h-[600px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {studentsList.map((s: any) => (
                    <Card key={s.id} className="p-5 flex justify-between items-center bg-white border-none shadow-sm hover:shadow-md transition-all group rounded-2xl border-l-4 border-l-blue-500">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 font-black text-xs">
                            {s.name.slice(0,1)}
                          </div>
                          <div>
                              <p className="font-black text-xs uppercase leading-none mb-2">{s.name}</p>
                              <div className="flex flex-wrap gap-x-4 gap-y-1.5 items-center">
                                <span className="text-[9px] text-gray-400 font-black uppercase flex items-center gap-1">
                                  <IdCard size={12} className="opacity-50"/> {s.studentCode}
                                </span>
                                <span className="text-[9px] text-gray-400 font-black uppercase flex items-center gap-1">
                                  <BookOpen size={12} className="opacity-50"/> {s.course}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[8px] font-black uppercase">
                                    {s.level}º ANO • S{s.semester} • {s.classGroups?.[0]}
                                  </span>
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[8px] font-black uppercase flex items-center gap-1">
                                    <Clock size={8}/> {s.shifts?.[0]}
                                  </span>
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[8px] font-black uppercase flex items-center gap-1">
                                    <Globe size={8}/> {s.modality || 'Presencial'}
                                  </span>
                                </div>
                              </div>
                          </div>
                        </div>
                        <Button size="xs" variant="ghost" onClick={() => BackendService.deleteUser(s.id).then(onUpdate)} className="text-gray-200 hover:text-red-500 hover:bg-red-50 transition-all rounded-xl p-2 h-10 w-10">
                            <Trash2 size={20}/>
                        </Button>
                    </Card>
                ))}
              </div>
            </div>
        </div>
    );
};

const TeachersTab = ({ teachers, institutionId, onUpdate }: any) => {
    const [f, setF] = useState({ name: '', email: '', cat: 'assistente' });
    const add = async (e: any) => { e.preventDefault(); await BackendService.addTeacher(institutionId, f.name, f.email, '123456', '', f.cat as any); setF({ name: '', email: '', cat: 'assistente' }); onUpdate(); };
    return (
        <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 bg-white border-none shadow-xl rounded-[2rem]">
                <CardHeader className="px-0 pt-0 pb-4 border-b mb-6">
                  <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                    <Plus size={16} className="text-purple-600"/> Registar Docente
                  </CardTitle>
                </CardHeader>
                <form onSubmit={add} className="space-y-4">
                  <Input placeholder="Nome do Professor" value={f.name} onChange={e=>setF({...f, name: e.target.value})} required className="h-11 rounded-xl" />
                  <Input type="email" placeholder="Email Institucional" value={f.email} onChange={e=>setF({...f, email: e.target.value})} required className="h-11 rounded-xl" />
                  <Button type="submit" className="w-full h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black shadow-lg shadow-purple-100">
                    Cadastrar Docente
                  </Button>
                </form>
            </Card>
            <div className="md:col-span-2 space-y-2">{teachers.map((t: any) => (<Card key={t.id} className="p-4 flex justify-between items-center bg-white border-none shadow-sm rounded-2xl border-l-4 border-l-purple-500"><div><p className="font-bold text-xs uppercase">{t.name}</p><p className="text-[9px] text-gray-400 font-bold uppercase">{t.email}</p></div><Button size="xs" variant="ghost" onClick={() => BackendService.deleteUser(t.id).then(onUpdate)} className="text-gray-200 hover:text-red-500 rounded-xl"><Trash2 size={16}/></Button></Card>))}</div>
        </div>
    );
};

const SubjectsTab = ({ subjects, teachers, institutionId, onUpdate }: any) => {
    const [f, setF] = useState({ 
      name: '', 
      tid: '', 
      course: '', 
      group: 'A', 
      year: '2024', 
      sem: '1' as '1' | '2',
      shift: 'Diurno' as 'Diurno' | 'Noturno',
      modality: 'Presencial' as 'Presencial' | 'Online'
    });

    const add = async (e: any) => { 
      e.preventDefault(); 
      await BackendService.assignSubject({
        ...f, 
        institutionId, 
        teacherId: f.tid, 
        classGroup: f.group, 
        academicYear: f.year, 
        semester: f.sem,
        shift: f.shift,
        modality: f.modality
      }); 
      setF({name:'',tid:'',course:'',group:'A',year:'2024',sem:'1',shift:'Diurno',modality:'Presencial'}); 
      onUpdate(); 
    };

    return (
        <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 bg-white border-none shadow-xl rounded-[2rem]">
                <CardHeader className="px-0 pt-0 pb-4 border-b mb-6">
                  <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                    <Plus size={16} className="text-emerald-600"/> Criar Cadeira
                  </CardTitle>
                </CardHeader>
                <form onSubmit={add} className="space-y-4">
                  <div className="space-y-1">
                    <Label>Nome da Cadeira</Label>
                    <Input placeholder="Ex: Cálculo I" value={f.name} onChange={e=>setF({...f, name: e.target.value})} required className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <Label>Responsável</Label>
                    <Select value={f.tid} onChange={e=>setF({...f, tid: e.target.value})} required className="h-11 rounded-xl">
                      <option value="">Selecione o Docente</option>
                      {teachers.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Curso</Label>
                    <Input placeholder="Curso" value={f.course} onChange={e=>setF({...f, course: e.target.value})} required className="h-11 rounded-xl" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={f.year} onChange={e=>setF({...f, year: e.target.value})} className="h-11 rounded-xl">
                      {['2023','2024','2025'].map(y=><option key={y} value={y}>{y}</option>)}
                    </Select>
                    <Select value={f.sem} onChange={e=>setF({...f, sem: e.target.value as any})} className="h-11 rounded-xl">
                      <option value="1">1º Sem.</option>
                      <option value="2">2º Sem.</option>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={f.shift} onChange={e=>setF({...f, shift: e.target.value as any})} className="h-11 rounded-xl">
                      <option value="Diurno">Diurno</option>
                      <option value="Noturno">Noturno</option>
                    </Select>
                    <Select value={f.modality} onChange={e=>setF({...f, modality: e.target.value as any})} className="h-11 rounded-xl">
                      <option value="Presencial">Presencial</option>
                      <option value="Online">Online</option>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black shadow-lg shadow-emerald-100">
                    Vincular Cadeira
                  </Button>
                </form>
            </Card>
            <div className="md:col-span-2 space-y-2">
               <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-2 mb-2">Disciplinas em Curso</h3>
               {subjects.map((s: any) => (
                  <Card key={s.id} className="p-4 flex justify-between items-center bg-white border-none shadow-sm rounded-2xl border-l-4 border-l-emerald-500">
                    <div>
                      <p className="font-bold text-xs uppercase">{s.name}</p>
                      <div className="flex gap-2 items-center mt-1">
                        <span className="text-[8px] text-gray-400 font-bold uppercase">{s.course}</span>
                        <span className="text-[8px] bg-gray-100 px-1.5 py-0.5 rounded font-black">{s.modality || 'Presencial'}</span>
                        <span className="text-[8px] bg-gray-100 px-1.5 py-0.5 rounded font-black uppercase">{s.shift}</span>
                      </div>
                    </div>
                  </Card>
               ))}
            </div>
        </div>
    );
};

const SettingsTab = ({ institution, institutionId, onUpdate }: any) => (
    <Card className="p-10 max-w-md mx-auto bg-white border-none shadow-2xl rounded-[2.5rem] space-y-6">
        <h2 className="text-xs font-black uppercase text-gray-400 tracking-widest text-center">Gestão de Semestre</h2>
        <div className="flex justify-between items-center p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Estado da Avaliação</span>
            <Button size="sm" variant={institution?.isEvaluationOpen ? 'destructive' : 'primary'} onClick={() => BackendService.updateInstitution(institutionId, { isEvaluationOpen: !institution?.isEvaluationOpen }).then(onUpdate)} className="h-10 px-6 rounded-xl">
                {institution?.isEvaluationOpen ? 'Encerrar' : 'Reabrir'}
            </Button>
        </div>
        <div className="space-y-2">
            <Label>Identificação do Período</Label>
            <Input value={institution?.evaluationPeriodName} onBlur={e => BackendService.updateInstitution(institutionId, { evaluationPeriodName: e.target.value }).then(onUpdate)} className="h-12 rounded-xl font-bold" />
        </div>
    </Card>
);
