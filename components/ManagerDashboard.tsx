
import React, { useState, useEffect, useMemo } from 'react';
import { BackendService } from '../services/backend';
import { User, UserRole, Subject, Institution, CombinedScore, QualitativeEval } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, cn } from './ui';
import { Users, BookOpen, Trash2, GraduationCap, Settings, Briefcase, FileText, Star, Calculator, Plus, MapPin, Clock, Globe, IdCard, Search, Calendar, FileDown, Printer, FileSpreadsheet, Eye, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface Props {
  institutionId: string;
}

export const ManagerDashboard: React.FC<Props> = ({ institutionId }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'teachers' | 'students' | 'subjects' | 'reports' | 'settings'>('overview');
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [scores, setScores] = useState<CombinedScore[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [selectedTeacherPreview, setSelectedTeacherPreview] = useState<User | null>(null);

  useEffect(() => { loadData(); }, [institutionId]);

  const loadData = async () => {
    try {
        const inst = await BackendService.getInstitution(institutionId);
        if (inst) setInstitution(inst);
        const allUsers = await BackendService.getUsers();
        setTeachers(allUsers.filter(u => u.role === UserRole.TEACHER && u.institutionId === institutionId));
        setStudents(allUsers.filter(u => u.role === UserRole.STUDENT && u.institutionId === institutionId));
        setSubjects(await BackendService.getInstitutionSubjects(institutionId));
        setScores(await BackendService.getAllScores(institutionId));
    } catch (e) { console.error(e); }
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    await BackendService.calculateScores(institutionId);
    await loadData();
    setIsCalculating(false);
  };

  const exportToExcel = () => {
    const headers = ["Docente", "Email", "Nota Alunos (12%)", "Nota Auto-Avaliação (80%)", "Nota Institucional (8%)", "Média Final", "Situação"];
    const rows = teachers.map(t => {
      const s = scores.find(sc => sc.teacherId === t.id);
      const final = s?.finalScore || 0;
      return [
        t.name,
        t.email,
        s?.studentScore.toFixed(2) || '0.00',
        s?.selfEvalScore.toFixed(2) || '0.00',
        s?.institutionalScore.toFixed(2) || '0.00',
        final.toFixed(2) || '0.00',
        final >= 10 ? "APROVADO" : "REPROVADO"
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_docentes_${institution?.code || 'inst'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
        {selectedTeacherPreview && (
            <EvaluationPreviewModal 
                teacher={selectedTeacherPreview} 
                institution={institution}
                score={scores.find(s => s.teacherId === selectedTeacherPreview.id)}
                onClose={() => setSelectedTeacherPreview(null)}
            />
        )}

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
                  {id: 'subjects', label: 'Cadeiras', icon: BookOpen},
                  {id: 'reports', label: 'Relatórios', icon: FileSpreadsheet},
                  {id: 'settings', label: 'Definições', icon: Settings},
              ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={cn("px-3 py-1.5 text-[9px] font-black rounded-lg flex items-center gap-2 transition-all uppercase tracking-wider", activeTab === tab.id ? "bg-white shadow-sm text-black border border-gray-200" : "text-gray-400 hover:text-gray-700")}>
                      <tab.icon size={12} /> {tab.label}
                  </button>
              ))}
          </div>
        </header>

        {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
                <Card className="p-4 flex items-center gap-4 shadow-sm border-none"><div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Users size={20}/></div><div><Label className="text-[8px] mb-1 block">Docentes</Label><p className="text-xl font-black">{teachers.length}</p></div></Card>
                <Card className="p-4 flex items-center gap-4 shadow-sm border-none"><div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><GraduationCap size={20}/></div><div><Label className="text-[8px] mb-1 block">Estudantes</Label><p className="text-xl font-black">{students.length}</p></div></Card>
                <Card className="p-4 flex items-center gap-4 shadow-sm border-none"><div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center"><BookOpen size={20}/></div><div><Label className="text-[8px] mb-1 block">Cadeiras</Label><p className="text-xl font-black">{subjects.length}</p></div></Card>
                <Card className="p-4 flex items-center gap-4 shadow-lg border-none bg-black text-white"><div className="h-10 w-10 rounded-lg bg-white/10 text-white flex items-center justify-center"><Calendar size={20}/></div><div><Label className="text-white/40 text-[8px] mb-1 block">Período</Label><p className="text-[10px] font-black uppercase">{institution?.evaluationPeriodName}</p></div></Card>
            </div>
        )}

        {activeTab === 'reports' && (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tight">Pauta de Resultados</h2>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Consolidação de Scores (Alunos, Auto e Gestão)</p>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={exportToExcel} className="text-emerald-600 border-emerald-200">
                            <FileSpreadsheet size={16} className="mr-2"/> Excel
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => window.print()} className="text-red-600 border-red-200">
                            <Printer size={16} className="mr-2"/> PDF
                        </Button>
                        <Button size="sm" onClick={handleCalculate} disabled={isCalculating} className="bg-black text-white">
                            {isCalculating ? 'Processando...' : 'Processar Scores'}
                        </Button>
                    </div>
                </div>

                <div className="overflow-hidden border border-gray-100 rounded-[2rem] bg-white shadow-xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="p-6 text-[10px] font-black uppercase text-gray-400">Docente</th>
                                <th className="p-6 text-[10px] font-black uppercase text-gray-400 text-center">Alunos (12%)</th>
                                <th className="p-6 text-[10px] font-black uppercase text-gray-400 text-center">Auto (80%)</th>
                                <th className="p-6 text-[10px] font-black uppercase text-gray-400 text-center">Gestão (8%)</th>
                                <th className="p-6 text-[10px] font-black uppercase text-gray-400 text-center">Final (20)</th>
                                <th className="p-6 text-[10px] font-black uppercase text-gray-400 text-right no-print">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {teachers.map(t => {
                                const s = scores.find(sc => sc.teacherId === t.id);
                                return (
                                    <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-6">
                                            <p className="font-black text-sm uppercase leading-tight">{t.name}</p>
                                            <p className="text-[10px] text-gray-400 font-bold lowercase">{t.email}</p>
                                        </td>
                                        <td className="p-6 text-center font-bold text-gray-600">{s?.studentScore.toFixed(2) || '0.00'}</td>
                                        <td className="p-6 text-center font-bold text-gray-600">{s?.selfEvalScore.toFixed(2) || '0.00'}</td>
                                        <td className="p-6 text-center font-bold text-gray-600">{s?.institutionalScore.toFixed(2) || '0.00'}</td>
                                        <td className="p-6 text-center">
                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-xs font-black",
                                                (s?.finalScore || 0) >= 10 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                            )}>
                                                {s?.finalScore.toFixed(2) || '0.00'}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right no-print">
                                            <div className="flex justify-end gap-1">
                                                <Button size="sm" variant="ghost" onClick={() => setSelectedTeacherPreview(t)} className="text-blue-500 hover:bg-blue-50 rounded-xl">
                                                    <Eye size={18}/>
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => {
                                                    const scoreVal = prompt("Atribuir Nota de Gestão (0-20):", "14");
                                                    if (scoreVal) {
                                                        const recs = prompt("Recomendações/Comentários Qualitativos:");
                                                        BackendService.saveQualitativeEval({ 
                                                            teacherId: t.id, 
                                                            institutionId, 
                                                            score: parseFloat(scoreVal),
                                                            recommendations: recs || '',
                                                            strengths: ['Compromisso Institucional']
                                                        }).then(handleCalculate);
                                                    }
                                                }} className="text-amber-500 hover:bg-amber-50 rounded-xl">
                                                    <Star size={18} fill={s?.institutionalScore ? "currentColor" : "none"}/>
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {activeTab === 'students' && <StudentsTab studentsList={students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))} institutionId={institutionId} onUpdate={loadData} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />}
        {activeTab === 'teachers' && <TeachersTab teachers={teachers} institutionId={institutionId} onUpdate={loadData} />}
        {activeTab === 'subjects' && <SubjectsTab subjects={subjects} teachers={teachers} institutionId={institutionId} onUpdate={loadData} />}
        {activeTab === 'settings' && <SettingsTab institution={institution} institutionId={institutionId} onUpdate={loadData} />}
    </div>
  );
};

const EvaluationPreviewModal = ({ teacher, institution, score, onClose }: any) => {
    const [qualData, setQualData] = useState<QualitativeEval | null>(null);

    useEffect(() => {
        BackendService.getQualitativeEval(teacher.id).then(setQualData);
    }, [teacher.id]);

    const chartData = [
        { name: 'Alunos (12%)', value: score?.studentScore || 0, color: '#3b82f6' },
        { name: 'Auto (80%)', value: score?.selfEvalScore || 0, color: '#8b5cf6' },
        { name: 'Gestão (8%)', value: score?.institutionalScore || 0, color: '#f59e0b' },
    ];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] shadow-2xl border-none animate-in zoom-in-95">
                <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center z-10">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-black text-white rounded-2xl flex items-center justify-center font-black text-xs uppercase">
                            {teacher.name.slice(0,1)}
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight">{teacher.name}</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{institution?.name} • {teacher.email}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 transition-all"><X size={20}/></button>
                </div>
                
                <CardContent className="p-8 space-y-8">
                    <div className="grid md:grid-cols-2 gap-8 items-center">
                        <div className="h-64 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <p className="text-xs font-black text-gray-400 uppercase">Média Final</p>
                                <p className="text-4xl font-black">{score?.finalScore.toFixed(2) || '0.00'}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest border-b pb-2">Decomposição do Score</h3>
                            {chartData.map(item => (
                                <div key={item.name} className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: item.color}}></div>
                                        <span className="text-[10px] font-black uppercase text-gray-600">{item.name}</span>
                                    </div>
                                    <span className="font-black text-sm">{item.value.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                                <Star size={14} className="text-amber-500"/> Avaliação Qualitativa (Gestão)
                            </h3>
                            <Card className="bg-amber-50/50 border-amber-100 p-6 rounded-[2rem]">
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-[9px] uppercase font-black text-amber-800 opacity-60">Recomendações Estratégicas</Label>
                                        <p className="text-sm text-amber-950 font-medium leading-relaxed mt-1">
                                            {qualData?.recommendations || 'Nenhuma recomendação registada até ao momento.'}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {qualData?.strengths?.map(s => (
                                            <span key={s} className="px-3 py-1 bg-amber-200/50 text-amber-900 rounded-lg text-[9px] font-black uppercase">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                                <CheckCircle size={14} className="text-emerald-500"/> Avaliação Normal (Estudantes)
                            </h3>
                            <Card className="bg-emerald-50/50 border-emerald-100 p-6 rounded-[2rem]">
                                <div className="space-y-3">
                                    <div className="flex justify-between text-[10px] font-bold uppercase text-emerald-800">
                                        <span>Domínio da Matéria</span>
                                        <span>4.8/5.0</span>
                                    </div>
                                    <div className="w-full bg-emerald-200/30 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-emerald-500 h-full w-[96%]"></div>
                                    </div>

                                    <div className="flex justify-between text-[10px] font-bold uppercase text-emerald-800 mt-4">
                                        <span>Pontualidade</span>
                                        <span>4.2/5.0</span>
                                    </div>
                                    <div className="w-full bg-emerald-200/30 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-emerald-500 h-full w-[84%]"></div>
                                    </div>

                                    <div className="flex justify-between text-[10px] font-bold uppercase text-emerald-800 mt-4">
                                        <span>Relação com Alunos</span>
                                        <span>4.5/5.0</span>
                                    </div>
                                    <div className="w-full bg-emerald-200/30 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-emerald-500 h-full w-[90%]"></div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>

                    <div className="pt-4 border-t flex justify-end gap-3 no-print">
                        <Button variant="outline" onClick={() => window.print()} className="rounded-xl h-11"><Printer size={16} className="mr-2"/> Imprimir Bilhete</Button>
                        <Button onClick={onClose} className="rounded-xl h-11 px-8">Fechar Visualização</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

const StudentsTab = ({ studentsList, institutionId, onUpdate, searchTerm, setSearchTerm }: any) => {
    const [f, setF] = useState({ 
      name: '', email: '', studentCode: '', course: '', 
      level: '1', semester: '1' as '1' | '2', group: 'A',
      shift: 'Diurno' as 'Diurno' | 'Noturno', modality: 'Presencial' as 'Presencial' | 'Online'
    });

    const add = async (e: any) => { 
        e.preventDefault(); 
        await BackendService.addStudent(institutionId, f.name, f.email, '123456', f.course, f.level, f.studentCode, f.semester, [f.group], f.shift, f.modality); 
        setF({ name: '', email: '', studentCode: '', course: '', level: '1', semester: '1', group: 'A', shift: 'Diurno', modality: 'Presencial' }); 
        onUpdate(); 
    };

    return (
        <div className="grid md:grid-cols-3 gap-6 animate-fade-in no-print">
            <Card className="p-6 shadow-xl bg-white border-none rounded-[2rem]">
                <CardHeader className="px-0 pt-0 pb-4 border-b mb-6">
                  <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                    <Plus size={16} className="text-blue-600"/> Matrícula Académica
                  </CardTitle>
                </CardHeader>
                <form onSubmit={add} className="space-y-4">
                  <div className="space-y-1"><Label>Nome Completo</Label><Input placeholder="Nome do Aluno" value={f.name} onChange={e=>setF({...f, name: e.target.value})} required /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label>Cód. Estudante</Label><Input placeholder="ID" value={f.studentCode} onChange={e=>setF({...f, studentCode: e.target.value})} required /></div>
                    <div className="space-y-1"><Label>Email</Label><Input type="email" placeholder="Email" value={f.email} onChange={e=>setF({...f, email: e.target.value})} required /></div>
                  </div>
                  <div className="space-y-1"><Label>Curso / Licenciatura</Label><Input placeholder="Ex: Medicina" value={f.course} onChange={e=>setF({...f, course: e.target.value})} required /></div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1"><Label>Ano Freq.</Label><Select value={f.level} onChange={e=>setF({...f, level: e.target.value})}>{[1,2,3,4,5,6].map(l=><option key={l} value={String(l)}>{l}º Ano</option>)}</Select></div>
                    <div className="space-y-1"><Label>Semestre</Label><Select value={f.semester} onChange={e=>setF({...f, semester: e.target.value as any})}><option value="1">1º S.</option><option value="2">2º S.</option></Select></div>
                    <div className="space-y-1"><Label>Turma</Label><Input placeholder="A" value={f.group} onChange={e=>setF({...f, group: e.target.value})} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label>Turno</Label><Select value={f.shift} onChange={e=>setF({...f, shift: e.target.value as any})}><option value="Diurno">Diurno</option><option value="Noturno">Noturno</option></Select></div>
                    <div className="space-y-1"><Label>Modalidade</Label><Select value={f.modality} onChange={e=>setF({...f, modality: e.target.value as any})}><option value="Presencial">Presencial</option><option value="Online / EAD">Online / EAD</option></Select></div>
                  </div>
                  <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black mt-2">Matricular Agora</Button>
                </form>
            </Card>
            <div className="md:col-span-2 space-y-4">
              <div className="relative"><Search className="absolute left-3 top-3 text-gray-400" size={16}/><Input placeholder="Pesquisar por nome ou código..." className="pl-10" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} /></div>
              <div className="max-h-[600px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {studentsList.map((s: any) => (
                    <Card key={s.id} className="p-4 flex justify-between items-center bg-white border-none shadow-sm hover:shadow-md transition-all rounded-2xl border-l-4 border-l-blue-500">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 font-black text-xs">{s.name.slice(0,1)}</div>
                          <div>
                              <p className="font-black text-xs uppercase leading-none mb-1">{s.name}</p>
                              <div className="flex flex-wrap gap-2 items-center">
                                <span className="text-[8px] text-gray-400 font-black flex items-center gap-1"><IdCard size={10}/> {s.studentCode}</span>
                                <span className="text-[8px] text-gray-400 font-black flex items-center gap-1"><BookOpen size={10}/> {s.course}</span>
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[7px] font-black">{s.level}º ANO • S{s.semester} • {s.classGroups?.[0]}</span>
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[7px] font-black flex items-center gap-1"><Clock size={8}/> {s.shifts?.[0] || 'Diurno'}</span>
                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[7px] font-black flex items-center gap-1"><Globe size={8}/> {s.modality || 'Presencial'}</span>
                              </div>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => BackendService.deleteUser(s.id).then(onUpdate)} className="text-gray-200 hover:text-red-500 rounded-xl p-2 h-10 w-10"><Trash2 size={18}/></Button>
                    </Card>
                ))}
              </div>
            </div>
        </div>
    );
};

const TeachersTab = ({ teachers, institutionId, onUpdate }: any) => {
    const [f, setF] = useState({ name: '', email: '' });
    const add = async (e: any) => { e.preventDefault(); await BackendService.addTeacher(institutionId, f.name, f.email, '123456'); setF({ name: '', email: '' }); onUpdate(); };
    return (
        <div className="grid md:grid-cols-3 gap-6 no-print">
            <Card className="p-6 bg-white border-none shadow-xl rounded-[2rem] h-fit">
                <CardHeader className="px-0 pt-0 pb-4 border-b mb-6"><CardTitle className="text-xs font-black uppercase flex items-center gap-2"><Plus size={16} className="text-purple-600"/> Registar Docente</CardTitle></CardHeader>
                <form onSubmit={add} className="space-y-4"><Input placeholder="Nome" value={f.name} onChange={e=>setF({...f, name: e.target.value})} required /><Input placeholder="Email" value={f.email} onChange={e=>setF({...f, email: e.target.value})} required /><Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12 rounded-2xl">Cadastrar</Button></form>
            </Card>
            <div className="md:col-span-2 space-y-2">{teachers.map((t: any) => (<Card key={t.id} className="p-4 flex justify-between items-center bg-white border-none shadow-sm rounded-2xl border-l-4 border-l-purple-500"><div><p className="font-bold text-xs uppercase">{t.name}</p></div><Button size="sm" variant="ghost" onClick={() => BackendService.deleteUser(t.id).then(onUpdate)} className="text-gray-200 hover:text-red-500"><Trash2 size={18}/></Button></Card>))}</div>
        </div>
    );
};

const SubjectsTab = ({ subjects, teachers, institutionId, onUpdate }: any) => {
    const [f, setF] = useState({ name: '', tid: '', course: '', group: 'A', year: '2024', sem: '1' as '1' | '2', shift: 'Diurno' as any, modality: 'Presencial' as any });
    const add = async (e: any) => { e.preventDefault(); await BackendService.assignSubject({...f, institutionId, teacherId: f.tid, classGroup: f.group, academicYear: f.year, semester: f.sem}); setF({name:'',tid:'',course:'',group:'A',year:'2024',sem:'1',shift:'Diurno',modality:'Presencial'}); onUpdate(); };
    return (
        <div className="grid md:grid-cols-3 gap-6 no-print">
            <Card className="p-6 bg-white border-none shadow-xl rounded-[2rem]">
                <CardHeader className="px-0 pt-0 pb-4 border-b mb-6"><CardTitle className="text-xs font-black uppercase flex items-center gap-2"><Plus size={16} className="text-emerald-600"/> Criar Cadeira</CardTitle></CardHeader>
                <form onSubmit={add} className="space-y-4">
                  <Input placeholder="Disciplina" value={f.name} onChange={e=>setF({...f, name: e.target.value})} required />
                  <Select value={f.tid} onChange={e=>setF({...f, tid: e.target.value})} required><option value="">Docente</option>{teachers.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}</Select>
                  <Input placeholder="Curso" value={f.course} onChange={e=>setF({...f, course: e.target.value})} required />
                  <div className="grid grid-cols-2 gap-2"><Select value={f.shift} onChange={e=>setF({...f, shift: e.target.value as any})}><option value="Diurno">Diurno</option><option value="Noturno">Noturno</option></Select><Select value={f.modality} onChange={e=>setF({...f, modality: e.target.value as any})}><option value="Presencial">Presencial</option><option value="Online">Online</option></Select></div>
                  <Button type="submit" className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl">Vincular</Button>
                </form>
            </Card>
            <div className="md:col-span-2 space-y-2">{subjects.map((s: any) => (<Card key={s.id} className="p-4 flex justify-between items-center bg-white border-none shadow-sm rounded-2xl border-l-4 border-l-emerald-500"><div><p className="font-bold text-xs uppercase">{s.name}</p><div className="flex gap-2 mt-1"><span className="text-[8px] text-gray-400 font-bold uppercase">{s.course}</span><span className="text-[8px] bg-gray-100 px-1.5 py-0.5 rounded font-black">{s.modality || 'Presencial'}</span></div></div></Card>))}</div>
        </div>
    );
};

const SettingsTab = ({ institution, institutionId, onUpdate }: any) => (
    <Card className="p-10 max-w-md mx-auto bg-white border-none shadow-2xl rounded-[2.5rem] space-y-6 text-center no-print">
        <h2 className="text-xs font-black uppercase text-gray-400 tracking-widest">Estado do Sistema</h2>
        <div className="flex justify-between items-center p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Avaliação</span>
            <Button size="sm" variant={institution?.isEvaluationOpen ? 'destructive' : 'primary'} onClick={() => BackendService.updateInstitution(institutionId, { isEvaluationOpen: !institution?.isEvaluationOpen }).then(onUpdate)} className="h-10 px-6 rounded-xl">
                {institution?.isEvaluationOpen ? 'Encerrar' : 'Reabrir'}
            </Button>
        </div>
        <div className="space-y-2"><Label>Semestre de Referência</Label><Input value={institution?.evaluationPeriodName} onBlur={e => BackendService.updateInstitution(institutionId, { evaluationPeriodName: e.target.value }).then(onUpdate)} className="h-12 rounded-xl text-center font-bold" /></div>
    </Card>
);
