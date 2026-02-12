
import React, { useState, useEffect } from 'react';
import { BackendService } from '../services/backend';
import { User, UserRole, Subject, Question, Institution, CombinedScore } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, cn } from './ui';
// Added 'Save' to the lucide-react imports
import { Users, BookOpen, Trash2, GraduationCap, Settings, Briefcase, FileText, Star, FileDown, Printer, Calculator, Download, CheckCircle, Search, ClipboardList, Save } from 'lucide-react';

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

  const loadCurrentQuestionnaire = async () => {
    const q = await BackendService.getInstitutionQuestionnaire(institutionId, qTarget);
    if (q) { setEditingQuestions(q.questions); setQTitle(q.title); }
    else { setEditingQuestions([]); setQTitle(qTarget === 'student' ? 'Avaliação do Docente pelos Alunos' : 'Auto-Avaliação Docente'); }
  };

  const downloadTeacherInquiries = async (teacher: User) => {
    const resps = await BackendService.getDetailedTeacherResponses(teacher.id);
    if (resps.length === 0) return alert("Nenhum inquérito respondido para este docente.");

    const csvRows = [
        ["INQUÉRITOS DETALHADOS - " + teacher.name],
        ["Data da Extração", new Date().toLocaleString()],
        [],
        ["Timestamp", "Cadeira ID", "Pergunta ID", "Resposta"]
    ];

    resps.forEach((r: any) => {
        r.answers.forEach((a: any) => {
            csvRows.push([r.timestamp, r.subjectId || "N/A", a.questionId, a.value]);
        });
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `inqueritos_${teacher.name.replace(/\s/g, '_')}.csv`);
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
                  {institution?.code.slice(0,2)}
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
                  {id: 'reports', label: 'Relatórios', icon: ClipboardList},
                  {id: 'questionnaire', label: 'Inquéritos', icon: FileText},
                  {id: 'settings', label: 'Config', icon: Settings},
              ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={cn("px-3 py-1.5 text-[9px] font-black rounded-lg flex items-center gap-2 transition-all uppercase tracking-wider", activeTab === tab.id ? "bg-white shadow-sm text-black border border-gray-200" : "text-gray-400 hover:text-gray-700")}>
                      <tab.icon size={12} /> {tab.label}
                  </button>
              ))}
          </div>
        </header>

        {activeTab === 'reports' && (
            <div className="space-y-6 no-print">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
                    <div className="flex items-center gap-3 bg-gray-50 border rounded-lg px-3 h-10 w-full md:w-64">
                        <Search size={16} className="text-gray-400" />
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Pesquisar docente..." className="bg-transparent border-none outline-none text-xs font-medium w-full" />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <Button size="xs" variant="secondary" onClick={handleCalculate} disabled={isCalculating} className="h-10 flex-1">
                           <Calculator size={14} className="mr-1"/> {isCalculating ? 'Processando...' : 'Recalcular Pauta'}
                        </Button>
                        <Button size="xs" variant="primary" onClick={() => window.print()} className="h-10 flex-1">
                           <Printer size={14} className="mr-1"/> Gerar PDF Geral
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4">
                    {filteredTeachers.map(t => {
                        const s = scores.find(sc => sc.teacherId === t.id);
                        return (
                            <Card key={t.id} className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all group">
                                <CardContent className="p-0">
                                    <div className="flex flex-col md:flex-row items-center">
                                        <div className="p-4 flex-1 flex items-center gap-4">
                                            <div className="h-10 w-10 bg-gray-50 rounded-lg flex items-center justify-center font-black text-blue-600 border uppercase">{t.name[0]}</div>
                                            <div>
                                                <p className="font-black text-xs uppercase tracking-tight">{t.name}</p>
                                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{t.category || 'Docente'}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 border-t md:border-t-0 md:border-l flex-[1.5] bg-gray-50/50">
                                            <div className="p-4 text-center border-r">
                                                <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Alunos</p>
                                                <p className="text-xs font-black text-emerald-600">{s?.studentScore.toFixed(2) || '0.00'}</p>
                                            </div>
                                            <div className="p-4 text-center border-r">
                                                <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Auto</p>
                                                <p className="text-xs font-black text-purple-600">{s?.selfEvalScore.toFixed(2) || '0.00'}</p>
                                            </div>
                                            <div className="p-4 text-center border-r">
                                                <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Gestão</p>
                                                <p className="text-xs font-black text-blue-600">{s?.institutionalScore.toFixed(2) || '0.00'}</p>
                                            </div>
                                            <div className="p-4 text-center bg-black text-white">
                                                <p className="text-[8px] font-black opacity-50 uppercase mb-1">Média</p>
                                                <p className="text-xs font-black">{s?.finalScore.toFixed(2) || '0.00'}</p>
                                            </div>
                                        </div>
                                        <div className="p-4 border-t md:border-t-0 md:border-l flex gap-2">
                                            <Button size="xs" variant="outline" onClick={() => {
                                                const val = prompt("Atribuir Nota de Gestão (0-20):", String(s?.institutionalScore ? s.institutionalScore / 0.4 : 10));
                                                if (val) BackendService.saveQualitativeEval({ teacherId: t.id, institutionId, score: parseFloat(val) }).then(handleCalculate);
                                            }} className="h-8 shadow-sm">
                                                <Star size={12} className="mr-1 text-yellow-500 fill-yellow-500" /> Nota
                                            </Button>
                                            <Button size="xs" variant="secondary" onClick={() => downloadTeacherInquiries(t)} className="h-8 shadow-sm">
                                                <Download size={12} className="mr-1" /> Inquéritos
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

        {/* Abas de Gestão */}
        {activeTab === 'teachers' && <TeachersTab teachers={teachers} institutionId={institutionId} onUpdate={loadData} />}
        {activeTab === 'students' && <StudentsTab students={students} institutionId={institutionId} onUpdate={loadData} />}
        {activeTab === 'subjects' && <SubjectsTab subjects={subjects} teachers={teachers} institutionId={institutionId} onUpdate={loadData} />}
        
        {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 no-print">
                <Card className="bg-white border-none shadow-sm p-6"><Label className="text-[9px] mb-2 block">Total de Docentes</Label><p className="text-4xl font-black">{teachers.length}</p></Card>
                <Card className="bg-white border-none shadow-sm p-6"><Label className="text-[9px] mb-2 block">Alunos Ativos</Label><p className="text-4xl font-black">{students.length}</p></Card>
                <Card className="bg-white border-none shadow-sm p-6"><Label className="text-[9px] mb-2 block">Cadeiras Ativas</Label><p className="text-4xl font-black">{subjects.length}</p></Card>
                <Card className="bg-black text-white p-6 rounded-2xl shadow-xl flex flex-col justify-between">
                    <Label className="text-white/40 text-[9px] block">Portal {institution?.isEvaluationOpen ? 'Aberto' : 'Fechado'}</Label>
                    <div className="mt-4 flex items-center gap-2">
                        <CheckCircle size={14} className="text-emerald-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Calculadora Pronta</span>
                    </div>
                </Card>
            </div>
        )}

        {activeTab === 'questionnaire' && (
             <div className="grid md:grid-cols-3 gap-6 no-print animate-fade-in">
                <Card className="md:col-span-1 shadow-lg h-fit">
                    <CardHeader><CardTitle className="text-xs">Estrutura do Inquérito</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1"><Label>Público-Alvo</Label><Select value={qTarget} onChange={e => setQTarget(e.target.value as any)}><option value="student">Estudantes</option><option value="teacher">Auto-Avaliação</option></Select></div>
                        <div className="space-y-1"><Label>Nome do Formulário</Label><Input value={qTitle} onChange={e => setQTitle(e.target.value)} /></div>
                        {/* Fix: Use 'Save' which is now imported from 'lucide-react' */}
                        <Button className="w-full h-11 bg-blue-600 hover:bg-blue-700 font-black shadow-lg" onClick={() => BackendService.saveQuestionnaire({id: 'q_'+qTarget+'_'+institutionId, institutionId, title: qTitle, targetRole: qTarget, questions: editingQuestions, active: true}).then(()=>alert("Inquérito publicado!"))}><Save size={14} className="mr-2"/> Publicar Alterações</Button>
                    </CardContent>
                </Card>
                <div className="md:col-span-2 space-y-3">
                    {editingQuestions.map((q, idx) => (
                        <div key={q.id} className="bg-white p-4 rounded-xl border shadow-sm flex gap-4 group transition-all hover:border-blue-200">
                            <div className="text-xs font-black text-gray-200 pt-3 group-hover:text-blue-500">{idx + 1}</div>
                            <div className="flex-1 space-y-3">
                                <Input value={q.text} className="border-none bg-gray-50 font-bold" onChange={e => { const n = [...editingQuestions]; n[idx].text = e.target.value; setEditingQuestions(n); }} />
                                <div className="flex gap-2">
                                    <Select className="h-8 text-[10px]" value={q.type} onChange={e => { const n = [...editingQuestions]; n[idx].type = e.target.value as any; setEditingQuestions(n); }}><option value="stars">Escala de Estrelas (1-5)</option><option value="binary">Sim ou Não</option><option value="scale_10">Escala Numérica (1-10)</option></Select>
                                    <Button variant="ghost" size="xs" onClick={() => setEditingQuestions(editingQuestions.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14}/></Button>
                                </div>
                            </div>
                        </div>
                    ))}
                    <Button onClick={() => setEditingQuestions([...editingQuestions, { id: Date.now().toString(), text: 'Nova pergunta do inquérito...', type: 'stars', weight: 5 }])} className="w-full h-12 border-dashed border-2 hover:bg-blue-50 hover:border-blue-200 text-blue-600" variant="outline">+ Adicionar Nova Pergunta</Button>
                </div>
             </div>
        )}
    </div>
  );
};

// Componentes auxiliares simplificados para clareza
const TeachersTab = ({ teachers, institutionId, onUpdate }: any) => {
    const [f, setF] = useState({ name: '', email: '', cat: 'assistente' as any });
    const add = async (e: any) => { e.preventDefault(); await BackendService.addTeacher(institutionId, f.name, f.email, '123456', '', f.cat); setF({ name: '', email: '', cat: 'assistente' }); onUpdate(); };
    return (
        <div className="grid md:grid-cols-3 gap-6 no-print">
            <Card className="md:col-span-1 shadow-md"><CardHeader><CardTitle className="text-xs">Registar Novo Docente</CardTitle></CardHeader><CardContent><form onSubmit={add} className="space-y-4"><Input placeholder="Nome Completo" value={f.name} onChange={e=>setF({...f, name: e.target.value})} required /><Input type="email" placeholder="Email Institucional" value={f.email} onChange={e=>setF({...f, email: e.target.value})} required /><Select value={f.cat} onChange={e=>setF({...f, cat: e.target.value})}><option value="assistente">Assistente</option><option value="assistente_estagiario">Assistente Estagiário</option></Select><Button type="submit" className="w-full">Cadastrar Docente</Button></form></CardContent></Card>
            <div className="md:col-span-2 space-y-2">{teachers.map((t: any) => (<Card key={t.id} className="p-4 flex justify-between items-center bg-white shadow-sm"><div><p className="font-bold text-xs">{t.name}</p><p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{t.email}</p></div><Button size="xs" variant="ghost" onClick={() => BackendService.deleteUser(t.id).then(onUpdate)} className="text-red-300 hover:text-red-600"><Trash2 size={14}/></Button></Card>))}</div>
        </div>
    );
};

const StudentsTab = ({ students, institutionId, onUpdate }: any) => {
    const [f, setF] = useState({ name: '', email: '', course: '' });
    const add = async (e: any) => { e.preventDefault(); await BackendService.addStudent(institutionId, f.name, f.email, '123456', f.course, '1'); setF({ name: '', email: '', course: '' }); onUpdate(); };
    return (
        <div className="grid md:grid-cols-3 gap-6 no-print">
            <Card className="md:col-span-1 shadow-md"><CardHeader><CardTitle className="text-xs">Matricular Estudante</CardTitle></CardHeader><CardContent><form onSubmit={add} className="space-y-4"><Input placeholder="Nome do Estudante" value={f.name} onChange={e=>setF({...f, name: e.target.value})} /><Input placeholder="Email" value={f.email} onChange={e=>setF({...f, email: e.target.value})} /><Input placeholder="Curso" value={f.course} onChange={e=>setF({...f, course: e.target.value})} /><Button type="submit" className="w-full">Efectuar Matrícula</Button></form></CardContent></Card>
            <div className="md:col-span-2 space-y-2">{students.map((s:any)=>(<Card key={s.id} className="p-4 flex justify-between items-center bg-white shadow-sm"><div><p className="font-bold text-xs">{s.name}</p><p className="text-[9px] text-gray-400 font-bold uppercase">{s.course}</p></div><Button size="xs" variant="ghost" onClick={()=>BackendService.deleteUser(s.id).then(onUpdate)} className="text-red-300 hover:text-red-600"><Trash2 size={14}/></Button></Card>))}</div>
        </div>
    );
};

const SubjectsTab = ({ subjects, teachers, institutionId, onUpdate }: any) => {
  const [f, setF] = useState({ name: '', tid: '', course: '', group: 'A' });
  const add = async (e: any) => { e.preventDefault(); await BackendService.assignSubject({...f, institutionId, teacherId: f.tid, classGroup: f.group}); setF({name:'',tid:'',course:'',group:'A'}); onUpdate(); };
  return (
      <div className="grid md:grid-cols-3 gap-6 no-print">
          <Card className="md:col-span-1 shadow-md"><CardHeader><CardTitle className="text-xs">Criar Cadeira/Turma</CardTitle></CardHeader><CardContent><form onSubmit={add} className="space-y-4"><Input placeholder="Nome da Disciplina" value={f.name} onChange={e=>setF({...f,name:e.target.value})} /><Select value={f.tid} onChange={e=>setF({...f,tid:e.target.value})}><option value="">Responsável (Docente)</option>{teachers.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}</Select><Input placeholder="Curso" value={f.course} onChange={e=>setF({...f,course:e.target.value})} /><Button type="submit" className="w-full">Vincular Cadeira</Button></form></CardContent></Card>
          <div className="md:col-span-2 space-y-2">{subjects.map((s:any)=>(<Card key={s.id} className="p-4 flex justify-between items-center bg-white shadow-sm"><div><p className="font-bold text-xs">{s.name}</p><p className="text-[9px] text-gray-400 font-bold uppercase">{s.course} • Turma {s.classGroup}</p></div><Button size="xs" variant="ghost" onClick={()=>BackendService.deleteSubject(s.id).then(onUpdate)} className="text-red-300 hover:text-red-600"><Trash2 size={14}/></Button></Card>))}</div>
      </div>
  );
};
