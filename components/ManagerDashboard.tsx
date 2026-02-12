
import React, { useState, useEffect, useMemo } from 'react';
import { BackendService } from '../services/backend';
import { User, UserRole, Subject, Question, Institution, CombinedScore } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, cn } from './ui';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, CartesianGrid } from 'recharts';
import { Users, BookOpen, Trash2, GraduationCap, Settings, Briefcase, FileText, Star, FileDown, Printer, Calculator, Download, CheckCircle, Search, ClipboardList, Save, TrendingUp, Activity, Filter, X, IdCard, Calendar, FileSpreadsheet, Plus } from 'lucide-react';

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

  // FILTROS ACADÉMICOS
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterSemester, setFilterSemester] = useState<string>('all');
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  
  const [qTarget, setQTarget] = useState<'student' | 'teacher'>('student');
  const [editingQuestions, setEditingQuestions] = useState<Question[]>([]);
  const [qTitle, setQTitle] = useState('');

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

  const filteredStudents = useMemo(() => {
      return students.filter(s => {
          const matchCourse = filterCourse === 'all' || s.course === filterCourse;
          const matchLevel = filterYear === 'all' || s.level === filterYear; // No contexto do aluno, o ano lectivo do filtro bate com o nível/ano
          const matchGroup = filterGroup === 'all' || s.classGroups?.includes(filterGroup);
          const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.studentCode?.toLowerCase().includes(searchTerm.toLowerCase());
          return matchCourse && matchLevel && matchGroup && matchSearch;
      });
  }, [students, filterCourse, filterYear, filterGroup, searchTerm]);

  const distributionData = useMemo(() => {
    const bins = [
      { name: '0-10', count: 0, color: '#ef4444' },
      { name: '10-14', count: 0, color: '#f59e0b' },
      { name: '14-17', count: 0, color: '#3b82f6' },
      { name: '17-20', count: 0, color: '#10b981' }
    ];
    filteredTeachersData.displayScores.forEach(s => {
      if (s.finalScore < 10) bins[0].count++;
      else if (s.finalScore < 14) bins[1].count++;
      else if (s.finalScore < 17) bins[2].count++;
      else bins[3].count++;
    });
    return bins;
  }, [filteredTeachersData.displayScores]);

  const participationData = [
    { name: 'Avaliado', value: filteredTeachersData.displayScores.length, color: '#10b981' },
    { name: 'Pendente', value: Math.max(0, filteredTeachersData.displayTeachers.length - filteredTeachersData.displayScores.length), color: '#e2e8f0' }
  ];

  const handleCalculate = async () => {
    setIsCalculating(true);
    await BackendService.calculateScores(institutionId);
    await loadData();
    setIsCalculating(false);
  };

  const exportToExcel = () => {
    const headers = ["Docente", "Email", "Alunos (12%)", "Auto (80%)", "Gestão (8%)", "Média Final", "Status"];
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

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers, ...rows].map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pauta_${institution?.code}_${filterCourse === 'all' ? 'geral' : filterCourse}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const loadCurrentQuestionnaire = async () => {
    const q = await BackendService.getInstitutionQuestionnaire(institutionId, qTarget);
    if (q) { setEditingQuestions(q.questions); setQTitle(q.title); }
    else { setEditingQuestions([]); setQTitle(qTarget === 'student' ? 'Avaliação do Docente pelos Alunos' : 'Auto-Avaliação Docente'); }
  };

  const clearFilters = () => {
    setFilterYear('all');
    setFilterSemester('all');
    setFilterCourse('all');
    setFilterGroup('all');
    setSearchTerm('');
  };

  const finalTeachersList = filteredTeachersData.displayTeachers.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

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
                <option value="all">Instituição Global</option>
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
        <Button size="xs" variant="ghost" onClick={clearFilters} className="h-9 text-gray-400 hover:text-red-500 font-bold">
            <X size={14} className="mr-1"/> Limpar
        </Button>
    </div>
  );

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
        
        {/* RELATÓRIO PDF (Impressão) */}
        <div className="print-only">
            <div className="report-header">
                <h1 className="text-xl font-black uppercase">{institution?.name}</h1>
                <h2 className="text-md font-bold text-gray-700 uppercase">Pauta de Avaliação - {filterCourse !== 'all' ? filterCourse : 'Geral'}</h2>
                <p className="text-[10px] uppercase font-bold text-gray-400">Ano: {filterYear} | Sem: {filterSemester} | Turma: {filterGroup}</p>
            </div>
            <table>
                <thead>
                    <tr><th>Docente</th><th>Alunos (12%)</th><th>Auto (80%)</th><th>Gestão (8%)</th><th>Média Final</th></tr>
                </thead>
                <tbody>
                    {finalTeachersList.map(t => {
                        const s = scores.find(sc => sc.teacherId === t.id);
                        return (
                            <tr key={t.id}>
                                <td className="font-bold">{t.name}</td>
                                <td>{s?.studentScore.toFixed(2) || '0.00'}</td>
                                <td>{s?.selfEvalScore.toFixed(2) || '0.00'}</td>
                                <td>{s?.institutionalScore.toFixed(2) || '0.00'}</td>
                                <td className="font-black text-blue-700">{s?.finalScore.toFixed(2) || '0.00'}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>

        {/* INTERFACE DO GESTOR */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4 no-print">
          <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-black text-white rounded-xl flex items-center justify-center font-black text-sm">
                  {institution?.code.slice(0,2)}
              </div>
              <div>
                  <h1 className="text-sm font-black uppercase tracking-tighter leading-none mb-1">Portal do Gestor</h1>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{institution?.name}</p>
              </div>
          </div>
          <div className="flex bg-gray-100/50 p-1 rounded-xl flex-wrap gap-1 border border-gray-200">
              {[
                  {id: 'overview', label: 'Dashboard', icon: Briefcase},
                  {id: 'teachers', label: 'Docentes', icon: Users},
                  {id: 'students', label: 'Estudantes', icon: GraduationCap},
                  {id: 'subjects', label: 'Cadeiras', icon: BookOpen},
                  {id: 'reports', label: 'Relatórios', icon: FileSpreadsheet},
                  {id: 'questionnaire', label: 'Inquéritos', icon: FileText},
                  {id: 'settings', label: 'Config', icon: Settings},
              ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={cn("px-3 py-1.5 text-[9px] font-black rounded-lg flex items-center gap-2 transition-all uppercase tracking-wider", activeTab === tab.id ? "bg-white shadow-sm text-black border border-gray-200" : "text-gray-400 hover:text-gray-700")}>
                      <tab.icon size={12} /> {tab.label}
                  </button>
              ))}
          </div>
        </header>

        {/* BARRA DE FILTROS ACADÉMICOS */}
        {(activeTab === 'overview' || activeTab === 'reports' || activeTab === 'students') && renderFilterBar()}

        {activeTab === 'overview' && (
            <div className="space-y-6 no-print">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-white border-none shadow-sm p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Users size={20}/></div>
                        <div><Label className="text-[8px] mb-1 block">Corpo Docente</Label><p className="text-xl font-black">{filteredTeachersData.displayTeachers.length}</p></div>
                    </Card>
                    <Card className="bg-white border-none shadow-sm p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><GraduationCap size={20}/></div>
                        <div><Label className="text-[8px] mb-1 block">Estudantes Ativos</Label><p className="text-xl font-black">{filteredStudents.length}</p></div>
                    </Card>
                    <Card className="bg-white border-none shadow-sm p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center"><Activity size={20}/></div>
                        <div><Label className="text-[8px] mb-1 block">Participação</Label><p className="text-xl font-black">{filteredTeachersData.displayScores.length}</p></div>
                    </Card>
                    <Card className="bg-black text-white p-4 flex items-center gap-4 border-none shadow-xl">
                        <div className="h-10 w-10 rounded-lg bg-white/10 text-white flex items-center justify-center"><TrendingUp size={20}/></div>
                        <div><Label className="text-white/40 text-[8px] mb-1 block">Contexto Atual</Label><p className="text-[10px] font-black uppercase truncate">{filterCourse === 'all' ? 'Toda Instituição' : filterCourse}</p></div>
                    </Card>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    <Card className="md:col-span-2 border-none shadow-lg bg-white">
                        <CardHeader className="pb-0 border-b mb-4"><CardTitle className="text-[10px] opacity-50 flex items-center gap-2 uppercase font-black"><TrendingUp size={14}/> Distribuição de Performance no Filtro</CardTitle></CardHeader>
                        <CardContent className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={distributionData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                                    <YAxis hide />
                                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px'}} />
                                    <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={50}>
                                        {distributionData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-lg bg-white">
                        <CardHeader className="pb-0 border-b mb-4"><CardTitle className="text-[10px] opacity-50 flex items-center gap-2 uppercase font-black"><CheckCircle size={14}/> Cobertura da Avaliação</CardTitle></CardHeader>
                        <CardContent className="h-64 flex flex-col items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={participationData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                        {participationData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="text-center -mt-8">
                                <p className="text-2xl font-black">{filteredTeachersData.displayTeachers.length > 0 ? Math.round((filteredTeachersData.displayScores.length / filteredTeachersData.displayTeachers.length) * 100) : 0}%</p>
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Docentes Alcançados</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )}

        {activeTab === 'reports' && (
            <div className="space-y-6 no-print">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border shadow-sm border-gray-100">
                    <div className="flex items-center gap-3 bg-gray-50 border rounded-lg px-3 h-10 w-full md:w-64">
                        <Search size={16} className="text-gray-400" />
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Pesquisar por nome ou curso..." className="bg-transparent border-none outline-none text-xs font-medium w-full" />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <Button size="xs" variant="secondary" onClick={handleCalculate} disabled={isCalculating} className="h-10 px-4">
                           <Calculator size={14} className="mr-1"/> Recalcular Dados
                        </Button>
                        <Button size="xs" variant="outline" onClick={exportToExcel} className="h-10 px-4 text-emerald-600 border-emerald-200 hover:bg-emerald-50 font-black shadow-sm">
                           <FileSpreadsheet size={14} className="mr-2"/> Exportar Excel (.csv)
                        </Button>
                        <Button size="xs" variant="primary" onClick={() => window.print()} className="h-10 px-4 shadow-lg shadow-gray-200">
                           <Printer size={14} className="mr-2"/> Gerar Pauta PDF
                        </Button>
                    </div>
                </div>

                <div className="grid gap-3">
                    {finalTeachersList.length > 0 ? finalTeachersList.map(t => {
                        const s = scores.find(sc => sc.teacherId === t.id);
                        const finalNote = s?.finalScore || 0;
                        return (
                            <Card key={t.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all group border-l-4 border-l-transparent hover:border-l-blue-500">
                                <CardContent className="p-0">
                                    <div className="flex flex-col md:flex-row items-center">
                                        <div className="p-4 flex-1 flex items-center gap-4">
                                            <div className={cn("h-10 w-10 rounded-full flex items-center justify-center font-black text-white text-[10px]", finalNote >= 14 ? 'bg-emerald-500' : finalNote >= 10 ? 'bg-amber-500' : 'bg-red-500')}>
                                                {finalNote.toFixed(0)}
                                            </div>
                                            <div>
                                                <p className="font-black text-xs uppercase tracking-tight">{t.name}</p>
                                                <p className="text-[9px] text-gray-400 font-bold">{t.email}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 border-t md:border-t-0 md:border-l flex-[1.5] bg-gray-50/30">
                                            <div className="p-4 text-center border-r border-gray-100">
                                                <p className="text-[7px] font-black text-gray-400 uppercase">Alunos</p>
                                                <p className="text-xs font-bold">{s?.studentScore.toFixed(2) || '0.00'}</p>
                                            </div>
                                            <div className="p-4 text-center border-r border-gray-100">
                                                <p className="text-[7px] font-black text-gray-400 uppercase">Auto</p>
                                                <p className="text-xs font-bold">{s?.selfEvalScore.toFixed(2) || '0.00'}</p>
                                            </div>
                                            <div className="p-4 text-center border-r border-gray-100">
                                                <p className="text-[7px] font-black text-gray-400 uppercase">Gestão</p>
                                                <p className="text-xs font-bold">{s?.institutionalScore.toFixed(2) || '0.00'}</p>
                                            </div>
                                            <div className="p-4 text-center bg-gray-900 text-white">
                                                <p className="text-[7px] font-black opacity-50 uppercase">Média</p>
                                                <p className="text-xs font-black">{finalNote.toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <div className="p-4 border-t md:border-t-0 md:border-l flex gap-2 border-gray-100">
                                            <Button size="xs" variant="ghost" onClick={() => {
                                                const val = prompt("Atribuir Nota de Gestão (0-20):", String(s?.institutionalScore ? s.institutionalScore / 0.4 : 10));
                                                if (val) BackendService.saveQualitativeEval({ teacherId: t.id, institutionId, score: parseFloat(val) }).then(handleCalculate);
                                            }} title="Avaliar Gestão" className="h-8 text-amber-600 hover:bg-amber-50 rounded-lg">
                                                <Star size={14}/>
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )) : (
                            <div className="py-20 text-center bg-gray-50 rounded-2xl border border-dashed text-gray-400 font-bold uppercase tracking-widest text-xs border-gray-200">
                                Nenhum docente encontrado para os filtros selecionados
                            </div>
                        )}
                </div>
            </div>
        )}

        {/* OUTRAS ABAS */}
        {activeTab === 'teachers' && <TeachersTab teachers={teachers} institutionId={institutionId} onUpdate={loadData} />}
        {activeTab === 'students' && <StudentsTab students={filteredStudents} institutionId={institutionId} onUpdate={loadData} />}
        {activeTab === 'subjects' && <SubjectsTab subjects={subjects} teachers={teachers} institutionId={institutionId} onUpdate={loadData} />}
        {activeTab === 'questionnaire' && <QuestionnaireEditor qTarget={qTarget} setQTarget={setQTarget} qTitle={qTitle} setQTitle={setQTitle} editingQuestions={editingQuestions} setEditingQuestions={setEditingQuestions} institutionId={institutionId} />}
        {activeTab === 'settings' && <SettingsTab institution={institution} institutionId={institutionId} onUpdate={loadData} />}
    </div>
  );
};

const StudentsTab = ({ students, institutionId, onUpdate }: any) => {
    const [f, setF] = useState({ 
        name: '', 
        email: '', 
        studentCode: '', 
        course: '', 
        level: '1', 
        semester: '1',
        group: 'A' 
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
            [f.group]
        ); 
        setF({ name: '', email: '', studentCode: '', course: '', level: '1', semester: '1', group: 'A' }); 
        onUpdate(); 
    };

    return (
        <div className="grid md:grid-cols-3 gap-6 no-print animate-fade-in">
            <Card className="md:col-span-1 shadow-lg border-none bg-white">
                <CardHeader className="bg-gray-50/50 border-b">
                    <CardTitle className="text-xs flex items-center gap-2 uppercase font-black">
                        <Plus size={14} className="text-blue-600"/> Matrícula de Estudante
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <form onSubmit={add} className="space-y-4">
                        <div className="space-y-1">
                            <Label>Nome Completo</Label>
                            <Input placeholder="Nome do Aluno" value={f.name} onChange={e=>setF({...f, name: e.target.value})} required />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Cód. Estudante (ID)</Label>
                                <Input placeholder="100234..." value={f.studentCode} onChange={e=>setF({...f, studentCode: e.target.value})} required />
                            </div>
                            <div className="space-y-1">
                                <Label>Email</Label>
                                <Input type="email" placeholder="aluno@inst.ac.mz" value={f.email} onChange={e=>setF({...f, email: e.target.value})} required />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>Curso / Departamento</Label>
                            <Input placeholder="Ex: Engenharia Civil" value={f.course} onChange={e=>setF({...f, course: e.target.value})} required />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                                <Label>Ano (Nível)</Label>
                                <Select value={f.level} onChange={e=>setF({...f, level: e.target.value})}>
                                    {[1, 2, 3, 4, 5, 6].map(l => <option key={l} value={l}>{l}º Ano</option>)}
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Semestre</Label>
                                <Select value={f.semester} onChange={e=>setF({...f, semester: e.target.value})}>
                                    <option value="1">1º S</option>
                                    <option value="2">2º S</option>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Turma</Label>
                                <Input placeholder="A, B..." value={f.group} onChange={e=>setF({...f, group: e.target.value})} required />
                            </div>
                        </div>
                        <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest shadow-xl shadow-blue-50 mt-2 rounded-xl">
                            Efectuar Matrícula
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div className="md:col-span-2 space-y-3">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Estudantes no Filtro ({students.length})</h3>
                </div>
                <div className="max-h-[700px] overflow-y-auto space-y-2 pr-2">
                  {students.length > 0 ? students.map((s: any) => (
                      <Card key={s.id} className="p-4 flex justify-between items-center bg-white border-none shadow-sm hover:shadow-md transition-all group border-l-4 border-l-blue-400">
                          <div className="flex items-center gap-4">
                              <div className="h-10 w-10 bg-gray-50 rounded-lg flex items-center justify-center border font-black text-[10px] text-gray-400 uppercase">
                                  {s.studentCode?.slice(-4) || '??'}
                              </div>
                              <div>
                                  <p className="font-black text-xs uppercase tracking-tight leading-none mb-1">{s.name}</p>
                                  <div className="flex gap-2 items-center">
                                      <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-black uppercase">{s.course}</span>
                                      <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">{s.level}º Ano • S{s.semester} • Turma {s.classGroups?.[0] || 'N/A'}</span>
                                  </div>
                              </div>
                          </div>
                          <Button size="xs" variant="ghost" onClick={() => BackendService.deleteUser(s.id).then(onUpdate)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                              <Trash2 size={16}/>
                          </Button>
                      </Card>
                  )) : (
                      <div className="py-20 text-center bg-gray-50 rounded-2xl border border-dashed text-gray-400 font-bold uppercase tracking-widest text-xs">
                          Nenhum estudante encontrado com estes critérios
                      </div>
                  )}
                </div>
            </div>
        </div>
    );
};

const TeachersTab = ({ teachers, institutionId, onUpdate }: any) => {
    const [f, setF] = useState({ name: '', email: '', cat: 'assistente' as any });
    const add = async (e: any) => { e.preventDefault(); await BackendService.addTeacher(institutionId, f.name, f.email, '123456', '', f.cat); setF({ name: '', email: '', cat: 'assistente' }); onUpdate(); };
    return (
        <div className="grid md:grid-cols-3 gap-6 no-print">
            <Card className="md:col-span-1 shadow-md"><CardHeader><CardTitle className="text-xs uppercase font-black">Registar Novo Docente</CardTitle></CardHeader><CardContent><form onSubmit={add} className="space-y-4"><Input placeholder="Nome Completo" value={f.name} onChange={e=>setF({...f, name: e.target.value})} required /><Input type="email" placeholder="Email Institucional" value={f.email} onChange={e=>setF({...f, email: e.target.value})} required /><Select value={f.cat} onChange={e=>setF({...f, cat: e.target.value})}><option value="assistente">Assistente</option><option value="assistente_estagiario">Assistente Estagiário</option></Select><Button type="submit" className="w-full rounded-xl h-11">Cadastrar Docente</Button></form></CardContent></Card>
            <div className="md:col-span-2 space-y-2">{teachers.map((t: any) => (<Card key={t.id} className="p-4 flex justify-between items-center bg-white shadow-sm border-l-4 border-l-purple-400"><div><p className="font-bold text-xs uppercase">{t.name}</p><p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{t.email}</p></div><Button size="xs" variant="ghost" onClick={() => BackendService.deleteUser(t.id).then(onUpdate)} className="text-red-300 hover:text-red-600"><Trash2 size={14}/></Button></Card>))}</div>
        </div>
    );
};

const SubjectsTab = ({ subjects, teachers, institutionId, onUpdate }: any) => {
  const [f, setF] = useState({ name: '', tid: '', course: '', group: '', year: '2024', sem: '1' });
  const add = async (e: any) => { e.preventDefault(); await BackendService.assignSubject({...f, institutionId, teacherId: f.tid, classGroup: f.group, academicYear: f.year, semester: f.sem}); setF({name:'',tid:'',course:'',group:'',year:'2024',sem:'1'}); onUpdate(); };
  return (
      <div className="grid md:grid-cols-3 gap-6 no-print">
          <Card className="md:col-span-1 shadow-md"><CardHeader><CardTitle className="text-xs uppercase font-black">Vincular Cadeira / Turma</CardTitle></CardHeader><CardContent><form onSubmit={add} className="space-y-4">
              <Input placeholder="Nome da Disciplina" value={f.name} onChange={e=>setF({...f,name:e.target.value})} />
              <Select value={f.tid} onChange={e=>setF({...f,tid:e.target.value})}><option value="">Responsável (Docente)</option>{teachers.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}</Select>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Curso" value={f.course} onChange={e=>setF({...f,course:e.target.value})} />
                <Input placeholder="Turma (A, B...)" value={f.group} onChange={e=>setF({...f,group:e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Ano Lectivo (2024)" value={f.year} onChange={e=>setF({...f,year:e.target.value})} />
                <Select value={f.sem} onChange={e=>setF({...f,sem:e.target.value})}><option value="1">1º Sem</option><option value="2">2º Sem</option></Select>
              </div>
              <Button type="submit" className="w-full rounded-xl h-11">Vincular Agora</Button>
          </form></CardContent></Card>
          <div className="md:col-span-2 space-y-2">{subjects.map((s:any)=>(<Card key={s.id} className="p-4 flex justify-between items-center bg-white shadow-sm border-l-4 border-l-emerald-400"><div><p className="font-bold text-xs uppercase">{s.name}</p><p className="text-[9px] text-gray-400 font-bold uppercase">{s.course} • Turma {s.classGroup} • {s.academicYear}/{s.semester}º S</p></div><Button size="xs" variant="ghost" onClick={()=>BackendService.deleteSubject(s.id).then(onUpdate)} className="text-red-300 hover:text-red-600"><Trash2 size={14}/></Button></Card>))}</div>
      </div>
  );
};

const QuestionnaireEditor = ({ qTarget, setQTarget, qTitle, setQTitle, editingQuestions, setEditingQuestions, institutionId }: any) => (
    <div className="grid md:grid-cols-3 gap-6 no-print animate-fade-in">
        <Card className="md:col-span-1 shadow-lg h-fit">
            <CardHeader><CardTitle className="text-xs uppercase font-black">Definições Inquérito</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-1"><Label>Público-Alvo</Label><Select value={qTarget} onChange={e => setQTarget(e.target.value as any)}><option value="student">Estudantes</option><option value="teacher">Auto-Avaliação</option></Select></div>
                <div className="space-y-1"><Label>Nome do Formulário</Label><Input value={qTitle} onChange={e => setQTitle(e.target.value)} /></div>
                <Button className="w-full h-11 bg-blue-600 hover:bg-blue-700 font-black shadow-lg rounded-xl" onClick={() => BackendService.saveQuestionnaire({id: 'q_'+qTarget+'_'+institutionId, institutionId, title: qTitle, targetRole: qTarget, questions: editingQuestions, active: true}).then(()=>alert("Inquérito publicado!"))}><Save size={14} className="mr-2"/> Publicar Alterações</Button>
            </CardContent>
        </Card>
        <div className="md:col-span-2 space-y-3">
            {editingQuestions.map((q: any, idx: number) => (
                <div key={q.id} className="bg-white p-4 rounded-xl border shadow-sm flex gap-4 group transition-all hover:border-blue-200">
                    <div className="text-xs font-black text-gray-200 pt-3 group-hover:text-blue-500">{idx + 1}</div>
                    <div className="flex-1 space-y-3">
                        <Input value={q.text} className="border-none bg-gray-50 font-bold text-xs" onChange={e => { const n = [...editingQuestions]; n[idx].text = e.target.value; setEditingQuestions(n); }} />
                        <div className="flex gap-2">
                            <Select className="h-8 text-[10px]" value={q.type} onChange={e => { const n = [...editingQuestions]; n[idx].type = e.target.value as any; setEditingQuestions(n); }}><option value="stars">Escala de Estrelas (1-5)</option><option value="binary">Sim ou Não</option><option value="scale_10">Escala Numérica (1-10)</option></Select>
                            <Button variant="ghost" size="xs" onClick={() => setEditingQuestions(editingQuestions.filter((_: any, i: number) => i !== idx))} className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14}/></Button>
                        </div>
                    </div>
                </div>
            ))}
            <Button onClick={() => setEditingQuestions([...editingQuestions, { id: Date.now().toString(), text: 'Nova pergunta...', type: 'stars', weight: 5 }])} className="w-full h-12 border-dashed border-2 hover:bg-blue-50 hover:border-blue-200 text-blue-600 rounded-xl" variant="outline">+ Adicionar Pergunta ao Inquérito</Button>
        </div>
    </div>
);

const SettingsTab = ({ institution, institutionId, onUpdate }: any) => (
    <Card className="max-w-md mx-auto no-print shadow-xl rounded-3xl overflow-hidden border-none">
        <CardHeader className="bg-gray-50 border-b p-6"><CardTitle className="uppercase font-black text-xs">Acesso e Período Académico</CardTitle></CardHeader>
        <CardContent className="space-y-6 p-8">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Estado do Portal</span>
                <Button size="xs" variant={institution?.isEvaluationOpen ? 'destructive' : 'primary'} onClick={() => BackendService.updateInstitution(institutionId, { isEvaluationOpen: !institution?.isEvaluationOpen }).then(onUpdate)} className="rounded-lg h-10 px-4">
                {institution?.isEvaluationOpen ? 'Fechar Portal' : 'Abrir Portal'}
                </Button>
            </div>
            <div className="space-y-2">
                <Label>Identificador do Semestre Corrente</Label>
                <Input value={institution?.evaluationPeriodName} onBlur={e => BackendService.updateInstitution(institutionId, { evaluationPeriodName: e.target.value }).then(onUpdate)} className="h-11 font-bold rounded-xl" />
            </div>
        </CardContent>
    </Card>
);
