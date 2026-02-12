import React, { useState, useEffect } from 'react';
import { User, CombinedScore, SelfEvaluation, Institution, Subject } from '../types';
import { BackendService } from '../services/backend';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, cn } from './ui';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { TrendingUp, BarChart3, Printer, FileCheck, FileDown, User as UserIcon, BookOpen, Calculator } from 'lucide-react';

interface Props {
  user: User;
}

export const TeacherDashboard: React.FC<Props> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'self-eval'>('stats');
  const [stats, setStats] = useState<CombinedScore | undefined>(undefined);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [answers, setAnswers] = useState<SelfEvaluation['answers']>({ 
    gradSubjects: 0, postGradSubjects: 0, theoryHours: 0, practicalHours: 0, consultationHours: 0, gradSupervision: 0, postGradSupervision: 0, regencySubjects: 0 
  });

  useEffect(() => { loadData(); }, [user.id]);

  const loadData = async () => {
    const data = await BackendService.getTeacherStats(user.id);
    setStats(data);
    if (user.institutionId) {
        const inst = await BackendService.getInstitution(user.institutionId);
        if (inst) setInstitution(inst);
        const allSubs = await BackendService.getInstitutionSubjects(user.institutionId);
        setSubjects(allSubs.filter(s => s.teacherId === user.id));
    }
    const savedEval = await BackendService.getSelfEval(user.id);
    if (savedEval) setAnswers(savedEval.answers);
  };

  const effortData = [
    { name: 'Graduação', value: (answers.gradSubjects || 0) * 10 || 5, color: '#3b82f6' },
    { name: 'Pós-Graduação', value: (answers.postGradSubjects || 0) * 15 || 5, color: '#8b5cf6' },
    { name: 'Investigação', value: 30, color: '#10b981' },
    { name: 'Extensão', value: 20, color: '#f59e0b' }
  ];

  const scoreComparison = stats ? [
    { label: 'Nota Final', value: stats.finalScore, fill: '#000' },
    { label: 'Alunos (12%)', value: stats.studentScore, fill: '#10b981' },
    { label: 'Auto (80%)', value: stats.selfEvalScore, fill: '#8b5cf6' },
    { label: 'Gestão (8%)', value: stats.institutionalScore, fill: '#3b82f6' }
  ] : [];

  const exportDetailedExcel = () => {
    if (!stats) return;
    const csvRows = [
      ["RELATÓRIO DE DESEMPENHO DOCENTE - " + institution?.name],
      ["Data de Exportação", new Date().toLocaleDateString('pt-MZ')],
      ["Período Académico", institution?.evaluationPeriodName || 'N/A'],
      [],
      ["1. DADOS IDENTIFICATIVOS"],
      ["Nome do Docente", user.name],
      ["Email", user.email],
      ["Categoria", user.category || "Assistente"],
      [],
      ["2. PONTUAÇÃO DETALHADA"],
      ["Componente", "Peso (%)", "Nota Obtida (/20)"],
      ["Avaliação de Alunos", "12%", stats.studentScore.toFixed(2)],
      ["Auto-Avaliação", "80%", stats.selfEvalScore.toFixed(2)],
      ["Avaliação Institucional", "8%", stats.institutionalScore.toFixed(2)],
      ["RESULTADO FINAL GLOBAL", "100%", stats.finalScore.toFixed(2)],
      [],
      ["3. DISCIPLINAS E TURMAS"],
      ["Código", "Cadeira", "Curso", "Nível", "Turma"],
      ...subjects.map(s => [s.code || "N/A", s.name, s.course, s.level + "º Ano", s.classGroup])
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + csvRows.map(e => e.join(",")).join("\n");
    
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `relatorio_docente_${user.name.replace(/\s/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
        
        {/* RELATÓRIO PDF OFICIAL (Apenas para Impressão) */}
        <div className="print-only">
            <div className="report-header">
                <h1 className="text-xl font-black uppercase tracking-tight">{institution?.name}</h1>
                <h2 className="text-md font-bold text-gray-700 uppercase">Boletim Individual de Desempenho Docente</h2>
                <p className="text-xs font-medium">Período: {institution?.evaluationPeriodName}</p>
            </div>

            <div className="card-print">
                <h3 className="text-sm font-black uppercase mb-3 border-b pb-1">I. Identificação do Docente</h3>
                <table>
                    <tbody>
                        <tr><th className="w-1/4">Nome</th><td>{user.name}</td></tr>
                        <tr><th>Email</th><td>{user.email}</td></tr>
                        <tr><th>Categoria</th><td className="capitalize">{user.category || 'Assistente'}</td></tr>
                    </tbody>
                </table>
            </div>

            <div className="card-print">
                <h3 className="text-sm font-black uppercase mb-3 border-b pb-1">II. Cadeiras e Regência</h3>
                <table>
                    <thead>
                        <tr><th className="w-20">Código</th><th>Disciplina</th><th>Curso</th><th className="w-20">Nível</th><th className="w-20">Turma</th></tr>
                    </thead>
                    <tbody>
                        {subjects.length > 0 ? subjects.map(s => (
                            <tr key={s.id}>
                                <td>{s.code || 'N/A'}</td>
                                <td>{s.name}</td>
                                <td>{s.course}</td>
                                <td>{s.level}º Ano</td>
                                <td>{s.classGroup}</td>
                            </tr>
                        )) : <tr><td colSpan={5} className="text-center italic">Sem cadeiras vinculadas este semestre.</td></tr>}
                    </tbody>
                </table>
            </div>

            <div className="card-print">
                <h3 className="text-sm font-black uppercase mb-3 border-b pb-1">III. Avaliação Quantitativa (12/80/8)</h3>
                <table>
                    <thead>
                        <tr><th>Componente</th><th>Peso Relativo</th><th>Nota Obtida (/20.0)</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>Avaliação pelos Alunos (Média de Inquéritos)</td><td>12%</td><td>{stats?.studentScore.toFixed(2)}</td></tr>
                        <tr><td>Auto-Avaliação (Volume de Actividades Académicas)</td><td>80%</td><td>{stats?.selfEvalScore.toFixed(2)}</td></tr>
                        <tr><td>Avaliação Institucional (Desempenho Administrativo)</td><td>8%</td><td>{stats?.institutionalScore.toFixed(2)}</td></tr>
                        <tr className="font-bold bg-gray-50">
                            <td>CLASSIFICAÇÃO FINAL</td>
                            <td>100%</td>
                            <td>{stats?.finalScore.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="mt-20 flex justify-between px-10 text-center gap-10">
                <div className="flex-1 border-t border-black pt-2">
                    <p className="text-[10px] font-bold uppercase">Assinatura do Docente</p>
                </div>
                <div className="flex-1 border-t border-black pt-2">
                    <p className="text-[10px] font-bold uppercase">Assinatura da Direcção Académica</p>
                </div>
            </div>
            <p className="text-[8px] mt-10 text-center text-gray-400">Gerado pelo sistema AvaliaDocente MZ em {new Date().toLocaleString('pt-MZ')}</p>
        </div>

        {/* INTERFACE DO DASHBOARD (Oculta na Impressão) */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4 no-print">
          <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-black text-white rounded-lg flex items-center justify-center font-black text-sm no-print">
                  {user.name[0]}
              </div>
              <div>
                  <h1 className="text-sm font-black uppercase tracking-tighter leading-none mb-1">Meu Desempenho</h1>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{user.name} • {institution?.name}</p>
              </div>
          </div>
          <div className="flex bg-gray-100/50 p-1 rounded-xl border border-gray-200">
              {[
                  {id: 'stats', label: 'Estatísticas', icon: BarChart3},
                  {id: 'self-eval', label: 'Auto-Avaliação', icon: FileCheck},
              ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={cn("px-4 py-1.5 text-[9px] font-black rounded-lg transition-all uppercase tracking-widest", activeTab === tab.id ? "bg-white shadow-sm text-black border border-gray-200" : "text-gray-400 hover:text-gray-600")}>
                    {tab.label}
                  </button>
              ))}
          </div>
        </header>
        
        {activeTab === 'stats' && (
            <div className="space-y-6 no-print">
                <div className="flex justify-end gap-2">
                   <Button size="xs" variant="outline" onClick={exportDetailedExcel} className="font-black h-8">
                       <FileDown size={14} className="mr-1"/> Exportar Excel
                   </Button>
                   <Button size="xs" variant="primary" onClick={() => window.print()} className="font-black h-8 shadow-lg">
                       <Printer size={14} className="mr-1"/> Gerar PDF Oficial
                   </Button>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    <Card className="bg-black text-white p-6 flex flex-col items-center justify-center border-none shadow-2xl relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12 transition-transform group-hover:scale-110">
                            <Calculator size={100} />
                        </div>
                        <Label className="text-white/40 mb-2 uppercase tracking-widest text-[10px]">Score Semestral</Label>
                        <p className="text-6xl font-black">{(stats?.finalScore || 0).toFixed(1)}</p>
                        <div className="mt-4 px-3 py-1 bg-white/10 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                            <TrendingUp size={10} className="text-emerald-400"/> Nota Final Processada
                        </div>
                    </Card>

                    <Card className="md:col-span-2">
                        <CardHeader className="pb-2"><CardTitle className="text-[9px] flex items-center gap-2 opacity-40"><BarChart3 size={12}/> Decomposição das Métricas</CardTitle></CardHeader>
                        <CardContent className="h-44">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={scoreComparison}>
                                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 800}} />
                                    <Tooltip cursor={{fill: '#f8fafc'}} />
                                    <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={40}>
                                        {scoreComparison.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader><CardTitle className="text-[9px] opacity-40">Perfil de Actividade Académica</CardTitle></CardHeader>
                        <CardContent className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={effortData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                                        {effortData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase'}} />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className="text-[9px] opacity-40">Disciplinas Activas ({subjects.length})</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {subjects.map(s => (
                                <div key={s.id} className="p-3 bg-gray-50 rounded-lg flex items-center gap-3 border border-gray-100">
                                    <div className="h-8 w-8 bg-white rounded border flex items-center justify-center"><BookOpen size={14} className="text-blue-600"/></div>
                                    <div className="flex-1">
                                        <p className="text-xs font-bold leading-none mb-1">{s.name}</p>
                                        <p className="text-[9px] text-gray-400 font-bold uppercase">{s.course} • {s.level}º Ano</p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        )}

        {activeTab === 'self-eval' && (
            <div className="no-print animate-fade-in">
                <Card className="max-w-2xl mx-auto shadow-2xl rounded-2xl border-none">
                    <CardHeader className="text-center border-b p-6">
                        <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
                            <FileCheck className="text-blue-600" size={24}/>
                        </div>
                        <CardTitle className="text-lg font-black uppercase tracking-tight">Registo de Produção Académica</CardTitle>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Preencha com rigor: este formulário representa 80% do seu score final.</p>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <Label>Cadeiras na Graduação</Label>
                                <Input type="number" min="0" value={answers.gradSubjects} onChange={e=>setAnswers({...answers, gradSubjects: parseInt(e.target.value)||0})} className="h-11 font-bold text-sm" />
                            </div>
                            <div className="space-y-1">
                                <Label>Horas Semanais Teóricas</Label>
                                <Input type="number" min="0" value={answers.theoryHours} onChange={e=>setAnswers({...answers, theoryHours: parseInt(e.target.value)||0})} className="h-11 font-bold text-sm" />
                            </div>
                            <div className="space-y-1">
                                <Label>Horas Semanais Práticas</Label>
                                <Input type="number" min="0" value={answers.practicalHours} onChange={e=>setAnswers({...answers, practicalHours: parseInt(e.target.value)||0})} className="h-11 font-bold text-sm" />
                            </div>
                            <div className="space-y-1">
                                <Label>Supervisão de Teses</Label>
                                <Input type="number" min="0" value={answers.gradSupervision} onChange={e=>setAnswers({...answers, gradSupervision: parseInt(e.target.value)||0})} className="h-11 font-bold text-sm" />
                            </div>
                        </div>
                        <Button onClick={()=>BackendService.saveSelfEval({teacherId: user.id, institutionId: user.institutionId, header: { category: user.category || 'assistente', function: 'Docente', contractRegime: 'Tempo Inteiro', workPeriod: 'Laboral', academicYear: '2024' }, answers}).then(()=>alert("Actividade guardada com sucesso!"))} className="w-full h-12 bg-blue-600 hover:bg-blue-700 font-black text-xs uppercase tracking-widest shadow-xl">
                            ACTUALIZAR DADOS DE PRODUÇÃO
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )}
    </div>
  );
};