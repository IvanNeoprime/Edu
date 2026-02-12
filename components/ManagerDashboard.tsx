
import React, { useState, useEffect, useMemo } from 'react';
import { BackendService } from '../services/backend';
import { User, UserRole, Subject, Question, Institution, CombinedScore } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, cn } from './ui';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, CartesianGrid } from 'recharts';
import { Users, BookOpen, Trash2, GraduationCap, Settings, Briefcase, FileText, Star, FileDown, Printer, Calculator, Download, CheckCircle, Search, ClipboardList, Save, TrendingUp, Activity, FileSpreadsheet } from 'lucide-react';

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

  const handleCalculate = async () => {
    setIsCalculating(true);
    await BackendService.calculateScores(institutionId);
    await loadData();
    setIsCalculating(false);
  };

  const exportPautaExcel = () => {
    const delimiter = ";";
    const headers = ["Docente", "Email", "Nota Alunos (12%)", "Auto-Avaliação (80%)", "Avaliação Gestão (8%)", "Média Final (0-20)"];
    
    const rows = filteredTeachers.map(t => {
      const s = scores.find(sc => sc.teacherId === t.id);
      return [
        t.name,
        t.email,
        s?.studentScore.toFixed(2) || "0.00",
        s?.selfEvalScore.toFixed(2) || "0.00",
        s?.institutionalScore.toFixed(2) || "0.00",
        s?.finalScore.toFixed(2) || "0.00"
      ];
    });

    // Inclusão do BOM (\uFEFF) para garantir que o Excel reconheça como UTF-8
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(delimiter)).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `pauta_docentes_${institution?.code || 'instituicao'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const distributionData = useMemo(() => {
    const bins = [
      { name: '0-10', count: 0, color: '#ef4444' },
      { name: '10-14', count: 0, color: '#f59e0b' },
      { name: '14-17', count: 0, color: '#3b82f6' },
      { name: '17-20', count: 0, color: '#10b981' }
    ];
    scores.forEach(s => {
      if (s.finalScore < 10) bins[0].count++;
      else if (s.finalScore < 14) bins[1].count++;
      else if (s.finalScore < 17) bins[2].count++;
      else bins[3].count++;
    });
    return bins;
  }, [scores]);

  const participationData = [
    { name: 'Concluído', value: scores.length, color: '#10b981' },
    { name: 'Pendente', value: Math.max(0, teachers.length - scores.length), color: '#e2e8f0' }
  ];

  const loadCurrentQuestionnaire = async () => {
    const q = await BackendService.getInstitutionQuestionnaire(institutionId, qTarget);
    if (q) { setEditingQuestions(q.questions); setQTitle(q.title); }
    else { setEditingQuestions([]); setQTitle(qTarget === 'student' ? 'Avaliação do Docente pelos Alunos' : 'Auto-Avaliação Docente'); }
  };

  const downloadTeacherInquiries = async (teacher: User) => {
    const resps = await BackendService.getDetailedTeacherResponses(teacher.id);
    if (resps.length === 0) return alert("Nenhum inquérito respondido para este docente.");
    const delimiter = ";";
    const csvRows = [["\uFEFFINQUÉRITOS DETALHADOS - " + teacher.name], ["Data", new Date().toLocaleString()], [], ["Timestamp", "Cadeira", "Pergunta", "Resposta"]];
    resps.forEach((r: any) => r.answers.forEach((a: any) => csvRows.push([r.timestamp, r.subjectId || "N/A", a.questionId, a.value])));
    const csvContent = csvRows.map(e => e.join(delimiter)).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `detalhes_${teacher.name.replace(/\s/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTeachers = teachers.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
        
        {/* RELATÓRIO PDF (Impressão) */}
        <div className="print-only">
            <div className="report-header">
                <h1 className="text-xl font-black uppercase">{institution?.name}</h1>
                <h2 className="text-md font-bold text-gray-700 uppercase">Pauta Consolidada de Avaliação</h2>
                <p className="text-xs">Gerado em: {new Date().toLocaleDateString()}</p>
            </div>
            <table>
                <thead>
                    <tr><th>Docente</th><th>Alunos (12%)</th><th>Auto (80%)</th><th>Gestão (8%)</th><th>Média Final</th></tr>
                </thead>
                <tbody>
                    {teachers.map(t => {
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
                  {institution?.code.slice(0,2) || 'AD'}
              </div>
              <div>
                  <h1 className="text-sm font-black uppercase tracking-tighter leading-none mb-1">Painel do Gestor</h1>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{institution?.name}</p>
              </div>
          </div>
          <div className="flex bg-gray-100/50 p-1 rounded-xl flex-wrap gap-1 border border-gray-200">
              {[
                  {id: 'overview', label: 'Início', icon: Briefcase},
                  {id: 'teachers', label: 'Docentes', icon: Users},
                  {id: 'students', label: 'Alunos', icon: GraduationCap},
                  {id: 'subjects', label: 'Cadeiras', icon: BookOpen},
                  {id: 'reports', label: 'Pautas', icon: ClipboardList},
                  {id: 'questionnaire', label: 'Inquéritos', icon: FileText},
                  {id: 'settings', label: 'Config', icon: Settings},
              ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={cn("px-3 py-1.5 text-[9px] font-black rounded-lg flex items-center gap-2 transition-all uppercase tracking-wider", activeTab === tab.id ? "bg-white shadow-sm text-black border border-gray-200" : "text-gray-400 hover:text-gray-700")}>
                      <tab.icon size={12} /> {tab.label}
                  </button>
              ))}
          </div>
        </header>

        {activeTab === 'overview' && (
            <div className="space-y-6 no-print">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-white border-none shadow-sm p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Users size={20}/></div>
                        <div><Label className="text-[8px] mb-1 block">Docentes</Label><p className="text-xl font-black">{teachers.length}</p></div>
                    </Card>
                    <Card className="bg-white border-none shadow-sm p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><GraduationCap size={20}/></div>
                        <div><Label className="text-[8px] mb-1 block">Estudantes</Label><p className="text-xl font-black">{students.length}</p></div>
                    </Card>
                    <Card className="bg-white border-none shadow-sm p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center"><Activity size={20}/></div>
                        <div><Label className="text-[8px] mb-1 block">Inquéritos</Label><p className="text-xl font-black">{scores.length}</p></div>
                    </Card>
                    <Card className="bg-black text-white p-4 flex items-center gap-4 border-none shadow-xl">
                        <div className="h-10 w-10 rounded-lg bg-white/10 text-white flex items-center justify-center"><TrendingUp size={20}/></div>
                        <div><Label className="text-white/40 text-[8px] mb-1 block">Status</Label><p className="text-[10px] font-black uppercase">{institution?.isEvaluationOpen ? 'Em Aberto' : 'Finalizado'}</p></div>
                    </Card>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    <Card className="md:col-span-2 border-none shadow-lg bg-white">
                        <CardHeader className="pb-0"><CardTitle className="text-[10px] opacity-50 flex items-center gap-2"><TrendingUp size={14}/> Distribuição de Notas (Docentes)</CardTitle></CardHeader>
                        <CardContent className="h-64 pt-6">
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
                        <CardHeader className="pb-0"><CardTitle className="text-[10px] opacity-50 flex items-center gap-2"><CheckCircle size={14}/> Progresso de Avaliação</CardTitle></CardHeader>
                        <CardContent className="h-64 flex flex-col items-center justify-center pt-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={participationData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                        {participationData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="text-center -mt-8">
                                <p className="text-2xl font-black">{Math.round((scores.length / (teachers.length || 1)) * 100)}%</p>
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Docentes Avaliados</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )}

        {activeTab === 'reports' && (
            <div className="space-y-6 no-print">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
                    <div className="flex items-center gap-3 bg-gray-50 border rounded-lg px-3 h-10 w-full md:w-64">
                        <Search size={16} className="text-gray-400" />
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Filtrar por nome..." className="bg-transparent border-none outline-none text-xs font-medium w-full" />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <Button size="xs" variant="secondary" onClick={handleCalculate} disabled={isCalculating} className="h-10 flex-1">
                           <Calculator size={14} className="mr-1"/> Recalcular Pauta
                        </Button>
                        <Button size="xs" variant="outline" onClick={exportPautaExcel} className="h-10 flex-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                           <FileSpreadsheet size={14} className="mr-2"/> Exportar Excel
                        </Button>
                        <Button size="xs" variant="primary" onClick={() => window.print()} className="h-10 flex-1">
                           <Printer size={14} className="mr-1"/> Exportar PDF
                        </Button>
                    </div>
                </div>

                <div className="grid gap-3">
                    {filteredTeachers.map(t => {
                        const s = scores.find(sc => sc.teacherId === t.id);
                        const finalNote = s?.finalScore || 0;
                        return (
                            <Card key={t.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all">
                                <CardContent className="p-0">
                                    <div className="flex flex-col md:flex-row items-center">
                                        <div className="p-4 flex-1 flex items-center gap-3">
                                            <div className={cn("h-1.5 w-1.5 rounded-full", finalNote >= 14 ? 'bg-emerald-500' : finalNote >= 10 ? 'bg-amber-500' : 'bg-red-500')} />
                                            <div>
                                                <p className="font-black text-xs uppercase">{t.name}</p>
                                                <p className="text-[9px] text-gray-400 font-bold">{t.email}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 border-t md:border-t-0 md:border-l flex-[1.5] bg-gray-50/30">
                                            <div className="p-4 text-center border-r">
                                                <p className="text-[7px] font-black text-gray-400 uppercase">Alunos</p>
                                                <p className="text-xs font-bold">{s?.studentScore.toFixed(2) || '0.00'}</p>
                                            </div>
                                            <div className="p-4 text-center border-r">
                                                <p className="text-[7px] font-black text-gray-400 uppercase">Auto</p>
                                                <p className="text-xs font-bold">{s?.selfEvalScore.toFixed(2) || '0.00'}</p>
                                            </div>
                                            <div className="p-4 text-center border-r">
                                                <p className="text-[7px] font-black text-gray-400 uppercase">Gestão</p>
                                                <p className="text-xs font-bold">{s?.institutionalScore.toFixed(2) || '0.00'}</p>
                                            </div>
                                            <div className="p-4 text-center bg-gray-900 text-white">
                                                <p className="text-[7px] font-black opacity-50 uppercase">Final</p>
                                                <p className="text-xs font-black">{finalNote.toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <div className="p-4 border-t md:border-t-0 md:border-l flex gap-2">
                                            <Button size="xs" variant="ghost" title="Download Inquéritos Detalhados" onClick={() => downloadTeacherInquiries(t)} className="h-8 text-blue-600 hover:bg-blue-50">
                                                <Download size={14}/>
                                            </Button>
                                            <Button size="xs" variant="ghost" title="Lançar Avaliação Qualitativa" onClick={() => {
                                                const val = prompt("Atribuir Nota de Gestão (0-20):", String(s?.institutionalScore ? s.institutionalScore / 0.4 : 10));
                                                if (val) BackendService.saveQualitativeEval({ teacherId: t.id, institutionId, score: parseFloat(val) }).then(handleCalculate);
                                            }} className="h-8 text-amber-600 hover:bg-amber-50">
                                                <Star size={14}/>
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        )}

        {activeTab === 'teachers' && <TeachersTab teachers={teachers} institutionId={institutionId} onUpdate={loadData} />}
        {activeTab === 'students' && <StudentsTab students={students} institutionId={institutionId} onUpdate={loadData} />}
        {activeTab === 'subjects' && <SubjectsTab subjects={subjects} teachers={teachers} institutionId={institutionId} onUpdate={loadData} />}
        {activeTab === 'questionnaire' && <QuestionnaireEditor qTarget={qTarget} setQTarget={setQTarget} qTitle={qTitle} setQTitle={setQTitle} editingQuestions={editingQuestions} setEditingQuestions={setEditingQuestions} institutionId={institutionId} />}
        {activeTab === 'settings' && <SettingsTab institution={institution} institutionId={institutionId} onUpdate={loadData} />}
    </div>
  );
};

// Componentes auxiliares (manteve-se o padrão da UI com pequenos ajustes de labels)
const QuestionnaireEditor = ({ qTarget, setQTarget, qTitle, setQTitle, editingQuestions, setEditingQuestions, institutionId }: any) => (
    <div className="grid md:grid-cols-3 gap-6 no-print animate-fade-in">
        <Card className="md:col-span-1 shadow-lg h-fit">
            <CardHeader><CardTitle className="text-xs uppercase font-black">Configuração do Inquérito</CardTitle></CardHeader>
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
                        <Input value={q.text} className="border-none bg-gray-50 font-bold" onChange={e => { const n = [...editingQuestions]; n[idx].text = e.target.value; setEditingQuestions(n); }} />
                        <div className="flex gap-2">
                            <Select className="h-8 text-[10px]" value={q.type} onChange={e => { const n = [...editingQuestions]; n[idx].type = e.target.value as any; setEditingQuestions(n); }}><option value="stars">Escala de Estrelas (1-5)</option><option value="binary">Sim ou Não</option><option value="scale_10">Escala Numérica (1-10)</option></Select>
                            <Button variant="ghost" size="xs" onClick={() => setEditingQuestions(editingQuestions.filter((_: any, i: number) => i !== idx))} className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14}/></Button>
                        </div>
                    </div>
                </div>
            ))}
            <Button onClick={() => setEditingQuestions([...editingQuestions, { id: Date.now().toString(), text: 'Nova pergunta do inquérito...', type: 'stars', weight: 5 }])} className="w-full h-12 border-dashed border-2 hover:bg-blue-50 hover:border-blue-200 text-blue-600 rounded-xl" variant="outline">+ Adicionar Nova Pergunta</Button>
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
                <Label>Identificador do Semestre</Label>
                <Input value={institution?.evaluationPeriodName} onBlur={e => BackendService.updateInstitution(institutionId, { evaluationPeriodName: e.target.value }).then(onUpdate)} className="h-11 font-bold rounded-xl" />
            </div>
        </CardContent>
    </Card>
);

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

const StudentsTab = ({ students, institutionId, onUpdate }: any) => {
    const [f, setF] = useState({ name: '', email: '', course: '' });
    const add = async (e: any) => { e.preventDefault(); await BackendService.addStudent(institutionId, f.name, f.email, '123456', f.course, '1'); setF({ name: '', email: '', course: '' }); onUpdate(); };
    return (
        <div className="grid md:grid-cols-3 gap-6 no-print">
            <Card className="md:col-span-1 shadow-md"><CardHeader><CardTitle className="text-xs uppercase font-black">Matricular Estudante</CardTitle></CardHeader><CardContent><form onSubmit={add} className="space-y-4"><Input placeholder="Nome do Estudante" value={f.name} onChange={e=>setF({...f, name: e.target.value})} /><Input placeholder="Email" value={f.email} onChange={e=>setF({...f, email: e.target.value})} /><Input placeholder="Curso" value={f.course} onChange={e=>setF({...f, course: e.target.value})} /><Button type="submit" className="w-full rounded-xl h-11">Efectuar Matrícula</Button></form></CardContent></Card>
            <div className="md:col-span-2 space-y-2">{students.map((s:any)=>(<Card key={s.id} className="p-4 flex justify-between items-center bg-white shadow-sm border-l-4 border-l-blue-400"><div><p className="font-bold text-xs uppercase">{s.name}</p><p className="text-[9px] text-gray-400 font-bold uppercase">{s.course}</p></div><Button size="xs" variant="ghost" onClick={()=>BackendService.deleteUser(s.id).then(onUpdate)} className="text-red-300 hover:text-red-600"><Trash2 size={14}/></Button></Card>))}</div>
        </div>
    );
};

const SubjectsTab = ({ subjects, teachers, institutionId, onUpdate }: any) => {
  const [f, setF] = useState({ name: '', tid: '', course: '', group: 'A' });
  const add = async (e: any) => { e.preventDefault(); await BackendService.assignSubject({...f, institutionId, teacherId: f.tid, classGroup: f.group}); setF({name:'',tid:'',course:'',group:'A'}); onUpdate(); };
  return (
      <div className="grid md:grid-cols-3 gap-6 no-print">
          <Card className="md:col-span-1 shadow-md"><CardHeader><CardTitle className="text-xs uppercase font-black">Criar Cadeira/Turma</CardTitle></CardHeader><CardContent><form onSubmit={add} className="space-y-4"><Input placeholder="Nome da Disciplina" value={f.name} onChange={e=>setF({...f,name:e.target.value})} /><Select value={f.tid} onChange={e=>setF({...f,tid:e.target.value})}><option value="">Responsável (Docente)</option>{teachers.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}</Select><Input placeholder="Curso" value={f.course} onChange={e=>setF({...f,course:e.target.value})} /><Button type="submit" className="w-full rounded-xl h-11">Vincular Cadeira</Button></form></CardContent></Card>
          <div className="md:col-span-2 space-y-2">{subjects.map((s:any)=>(<Card key={s.id} className="p-4 flex justify-between items-center bg-white shadow-sm border-l-4 border-l-emerald-400"><div><p className="font-bold text-xs uppercase">{s.name}</p><p className="text-[9px] text-gray-400 font-bold uppercase">{s.course} • Turma {s.classGroup}</p></div><Button size="xs" variant="ghost" onClick={()=>BackendService.deleteSubject(s.id).then(onUpdate)} className="text-red-300 hover:text-red-600"><Trash2 size={14}/></Button></Card>))}</div>
      </div>
  );
};
