import React, { useState, useEffect } from 'react';
import { User, CombinedScore, SelfEvaluation, Institution, Subject } from '../types';
import { BackendService } from '../services/backend';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, cn } from './ui';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { TrendingUp, BarChart3, Printer, FileCheck, FileDown, Shield, PieChart as PieIcon, GraduationCap } from 'lucide-react';

interface Props {
  user: User;
}

export const TeacherDashboard: React.FC<Props> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'self-eval'>('stats');
  const [stats, setStats] = useState<CombinedScore | undefined>(undefined);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [answers, setAnswers] = useState<SelfEvaluation['answers']>({ gradSubjects: 0, postGradSubjects: 0, theoryHours: 0, practicalHours: 0, consultationHours: 0, gradSupervision: 0, postGradSupervision: 0, regencySubjects: 0 });

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
    { label: 'Alunos', value: stats.studentScore, fill: '#10b981' },
    { label: 'Auto-Avaliação', value: stats.selfEvalScore, fill: '#8b5cf6' },
    { label: 'Institucional', value: stats.institutionalScore, fill: '#3b82f6' }
  ] : [];

  const exportDetailedExcel = () => {
    if (!stats) return;
    const csvRows = [
      ["RELATORIO DE DESEMPENHO DOCENTE - EXCEL"],
      ["Instituicao", institution?.name],
      ["Periodo", institution?.evaluationPeriodName],
      [],
      ["DADOS DO DOCENTE"],
      ["Nome", user.name],
      ["Email", user.email],
      ["Categoria", user.category || "N/A"],
      [],
      ["PONTUACAO"],
      ["Componente", "Nota", "Peso (Scale)"],
      ["Avaliacao de Alunos", stats.studentScore.toFixed(2), "12%"],
      ["Auto-Avaliacao", stats.selfEvalScore.toFixed(2), "80%"],
      ["Avaliacao Gestao", stats.institutionalScore.toFixed(2), "8%"],
      ["TOTAL FINAL", stats.finalScore.toFixed(2), "100%"],
      [],
      ["DISCIPLINAS LECCIONADAS"],
      ["Codigo", "Nome", "Curso", "Nivel", "Turma"],
      ...subjects.map(s => [s.code || "N/A", s.name, s.course, s.level, s.classGroup])
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
        
        {/* RELATÓRIO PDF (Visível apenas na Impressão) */}
        <div className="print-only">
            <div className="text-center border-b-2 border-black pb-4 mb-8">
                <h1 className="text-2xl font-black uppercase tracking-tighter">{institution?.name}</h1>
                <h2 className="text-lg font-bold text-gray-600 uppercase">Relatório Individual de Desempenho Docente</h2>
                <p className="text-sm font-medium">Período Académico: {institution?.evaluationPeriodName}</p>
            </div>

            <h3 className="text-sm font-black uppercase mb-2 bg-gray-100 p-2">1. Dados do Docente</h3>
            <table className="mb-6">
                <tbody>
                    <tr><th className="w-1/3">Nome Completo</th><td>{user.name}</td></tr>
                    <tr><th>Email Institucional</th><td>{user.email}</td></tr>
                    <tr><th>Categoria Académica</th><td className="capitalize">{user.category || 'Assistente'}</td></tr>
                </tbody>
            </table>

            <h3 className="text-sm font-black uppercase mb-2 bg-gray-100 p-2">2. Carga Horária e Disciplinas</h3>
            <table>
                <thead>
                    <tr><th>Código</th><th>Disciplina</th><th>Curso</th><th>Nível</th><th>Turma</th></tr>
                </thead>
                <tbody>
                    {subjects.length > 0 ? subjects.map(s => (
                        <tr key={s.id}>
                            <td>{s.code || '---'}</td>
                            <td>{s.name}</td>
                            <td>{s.course}</td>
                            <td>{s.level}º Ano</td>
                            <td>{s.classGroup}</td>
                        </tr>
                    )) : <tr><td colSpan={5} className="text-center italic">Nenhuma disciplina vinculada</td></tr>}
                </tbody>
            </table>

            <h3 className="text-sm font-black uppercase mb-2 bg-gray-100 p-2">3. Resultados da Avaliação</h3>
            <table>
                <thead>
                    <tr><th>Componente de Avaliação</th><th>Peso</th><th>Nota Obtida</th></tr>
                </thead>
                <tbody>
                    <tr><td>Avaliação pelos Alunos (Inquéritos)</td><td>12%</td><td>{stats?.studentScore.toFixed(2)}</td></tr>
                    <tr><td>Auto-Avaliação (Actividade Académica)</td><td>80%</td><td>{stats?.selfEvalScore.toFixed(2)}</td></tr>
                    <tr><td>Avaliação Institucional (Gestão)</td><td>8%</td><td>{stats?.institutionalScore.toFixed(2)}</td></tr>
                    <tr className="font-bold"><td>MÉDIA FINAL GLOBAL</td><td>100%</td><td>{stats?.finalScore.toFixed(2)} / 20.0</td></tr>
                </tbody>
            </table>

            <div className="mt-16 grid grid-cols-2 gap-20 text-center">
                <div className="border-t border-black pt-2">
                    <p className="text-xs font-bold uppercase">O Docente</p>
                    <p className="text-[10px] text-gray-400 mt-8">Data: ___/___/2024</p>
                </div>
                <div className="border-t border-black pt-2">
                    <p className="text-xs font-bold uppercase">Direcção Académica (Carimbo)</p>
                    <p className="text-[10px] text-gray-400 mt-8">Data: ___/___/2024</p>
                </div>
            </div>
        </div>

        {/* INTERFACE DO DASHBOARD (Escondida na Impressão) */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4 no-print">
          <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-black text-white rounded-lg flex items-center justify-center font-black text-sm">{user.name[0]}</div>
              <div>
                  <h1 className="text-sm font-black uppercase tracking-tighter leading-none mb-1">Portal do Docente</h1>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{user.name} • {institution?.name}</p>
              </div>
          </div>
          <div className="flex bg-gray-100/50 p-1 rounded-xl border border-gray-200">
              {[
                  {id: 'stats', label: 'Desempenho', icon: BarChart3},
                  {id: 'self-eval', label: 'Actividade', icon: FileCheck},
              ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={cn("px-4 py-1.5 text-[9px] font-black rounded-lg transition-all uppercase tracking-widest", activeTab === tab.id ? "bg-white shadow-sm text-black border border-gray-200" : "text-gray-400")}>
                    {tab.label}
                  </button>
              ))}
          </div>
        </header>
        
        {activeTab === 'stats' && (
            <div className="space-y-6 no-print">
                <div className="flex justify-end gap-2">
                   <Button size="xs" variant="outline" onClick={exportDetailedExcel} className="font-black"><FileDown size={14} className="mr-1"/> Excel Detalhado</Button>
                   <Button size="xs" variant="primary" onClick={handlePrint} className="font-black"><Printer size={14} className="mr-1"/> Gerar PDF Oficial</Button>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    <Card className="bg-black text-white p-6 flex flex-col items-center justify-center border-none shadow-xl">
                        <Label className="text-white/40 mb-2">Score Final</Label>
                        <p className="text-6xl font-black">{(stats?.finalScore || 0).toFixed(1)}</p>
                        <div className="mt-4 px-3 py-1 bg-white/10 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                            <TrendingUp size={10} className="text-emerald-400"/> Status: Processado
                        </div>
                    </Card>

                    <Card className="md:col-span-2">
                        <CardHeader><CardTitle className="text-[9px] flex items-center gap-2 tracking-[0.2em] opacity-50"><PieIcon size={12}/> Métricas por Eixo</CardTitle></CardHeader>
                        <CardContent className="h-44">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={scoreComparison}>
                                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 800}} />
                                    <Tooltip cursor={{fill: '#f8fafc'}} />
                                    <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={35}>
                                        {scoreComparison.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )}

        {activeTab === 'self-eval' && (
            <div className="no-print animate-fade-in">
                <Card className="max-w-2xl mx-auto shadow-2xl rounded-2xl">
                    <CardHeader className="text-center border-b">
                        <CardTitle className="text-lg">Registo de Actividade Académica</CardTitle>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Dados fundamentais para o cálculo de 80% da nota</p>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <Label>Cadeiras na Graduação</Label>
                                <Input type="number" value={answers.gradSubjects} onChange={e=>setAnswers({...answers, gradSubjects: parseInt(e.target.value)||0})} />
                            </div>
                            <div className="space-y-1">
                                <Label>Horas de Aulas Teóricas</Label>
                                <Input type="number" value={answers.theoryHours} onChange={e=>setAnswers({...answers, theoryHours: parseInt(e.target.value)||0})} />
                            </div>
                        </div>
                        <Button onClick={()=>BackendService.saveSelfEval({teacherId: user.id, institutionId: user.institutionId, header: { category: user.category || 'assistente', function: 'Docente', contractRegime: 'Tempo Inteiro', workPeriod: 'Laboral', academicYear: '2024' }, answers}).then(()=>alert("Actividade guardada com sucesso!"))} className="w-full h-11 bg-blue-600 hover:bg-blue-700 font-black">ACTUALIZAR DADOS</Button>
                    </CardContent>
                </Card>
            </div>
        )}
    </div>
  );
};