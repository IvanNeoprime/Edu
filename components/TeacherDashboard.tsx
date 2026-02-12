
import React, { useState, useEffect } from 'react';
import { User, CombinedScore, SelfEvaluation, Institution } from '../types';
import { BackendService } from '../services/backend';
// Fix: Added 'cn' to the imports from './ui'
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, cn } from './ui';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, AreaChart, Area } from 'recharts';
import { TrendingUp, BarChart3, Printer, FileCheck, FileDown, Shield, PieChart as PieIcon } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border border-gray-100 shadow-xl rounded-lg">
        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">{label || payload[0].name}</p>
        <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{backgroundColor: payload[0].color || payload[0].fill}} />
            <p className="text-xs font-black text-gray-900">{payload[0].value.toFixed(1)} <span className="text-[9px] font-medium text-gray-400">/ 20</span></p>
        </div>
      </div>
    );
  }
  return null;
};

interface Props {
  user: User;
}

export const TeacherDashboard: React.FC<Props> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'self-eval'>('stats');
  const [stats, setStats] = useState<CombinedScore | undefined>(undefined);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [answers, setAnswers] = useState<SelfEvaluation['answers']>({ gradSubjects: 0, postGradSubjects: 0, theoryHours: 0, practicalHours: 0, consultationHours: 0, gradSupervision: 0, postGradSupervision: 0, regencySubjects: 0 });

  useEffect(() => { loadData(); }, [user.id]);

  const loadData = async () => {
    const data = await BackendService.getTeacherStats(user.id);
    setStats(data);
    if (user.institutionId) {
        const inst = await BackendService.getInstitution(user.institutionId);
        if (inst) setInstitution(inst);
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

  const exportExcel = () => {
    if (!stats) return;
    const headers = ["Indicador", "Nota obtida", "Máximo"];
    const rows = [
        ["Avaliação pelos Alunos", stats.studentScore, 20],
        ["Auto-Avaliação", stats.selfEvalScore, 20],
        ["Avaliação Institucional", stats.institutionalScore, 20],
        ["Média Final", stats.finalScore, 20]
    ];
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers, ...rows].map(e => e.join(",")).join("\n");
    
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `meu_desempenho_${user.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
          <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-black text-white rounded-lg flex items-center justify-center font-black text-sm no-print">{user.name[0]}</div>
              <div>
                  <h1 className="text-sm font-black uppercase tracking-tighter leading-none mb-1">Docente Portal</h1>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{user.name} • {institution?.name}</p>
              </div>
          </div>
          <div className="flex bg-gray-100/50 p-1 rounded-xl border border-gray-200 no-print">
              {[
                  {id: 'stats', label: 'Desempenho', icon: BarChart3},
                  {id: 'self-eval', label: 'Auto-Avaliação', icon: FileCheck},
              ].map(tab => (
                  // Fix: using imported 'cn' utility
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={cn("px-4 py-1.5 text-[9px] font-black rounded-lg transition-all uppercase tracking-widest", activeTab === tab.id ? "bg-white shadow-sm text-black border border-gray-200" : "text-gray-400")}>
                    {tab.label}
                  </button>
              ))}
          </div>
        </header>
        
        {activeTab === 'stats' && (
            <div className="space-y-6">
                <div className="flex justify-end gap-2 no-print">
                   <Button size="xs" variant="outline" onClick={exportExcel}><FileDown size={14} className="mr-1"/> Exportar Excel</Button>
                   <Button size="xs" variant="outline" onClick={() => window.print()}><Printer size={14} className="mr-1"/> Gerar PDF</Button>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    <Card className="bg-black text-white p-6 flex flex-col items-center justify-center card">
                        <Label className="text-white/40 mb-2">Score Semestral</Label>
                        <p className="text-5xl font-black">{(stats?.finalScore || 0).toFixed(1)}</p>
                        <div className="mt-4 px-3 py-1 bg-white/10 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                            <TrendingUp size={10} className="text-emerald-400"/> Em Evolução
                        </div>
                    </Card>

                    <Card className="md:col-span-2 card">
                        <CardHeader><CardTitle className="text-[9px] flex items-center gap-2"><PieIcon size={12}/> Comparativo por Categoria</CardTitle></CardHeader>
                        <CardContent className="h-40">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={scoreComparison}>
                                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 800}} />
                                    <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                                    <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={30}>
                                        {scoreComparison.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                <Card className="card">
                    <CardHeader><CardTitle className="text-[9px]">Distribuição de Esforço Académico</CardTitle></CardHeader>
                    <CardContent className="h-48 flex justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={effortData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                                    {effortData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase'}} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        )}

        {activeTab === 'self-eval' && (
            <Card className="max-w-2xl mx-auto card">
                <CardHeader>
                    <CardTitle>Registo de Atividades</CardTitle>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Os dados abaixo compõem a maior parte do score final.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><Label>Disciplinas Graduação</Label><Input type="number" value={answers.gradSubjects} onChange={e=>setAnswers({...answers, gradSubjects: parseInt(e.target.value)||0})} /></div>
                        <div className="space-y-1"><Label>Horas Teóricas</Label><Input type="number" value={answers.theoryHours} onChange={e=>setAnswers({...answers, theoryHours: parseInt(e.target.value)||0})} /></div>
                    </div>
                    <Button onClick={()=>BackendService.saveSelfEval({teacherId: user.id, institutionId: user.institutionId, header: { category: user.category || 'assistente', function: 'Docente', contractRegime: 'Tempo Inteiro', workPeriod: 'Laboral', academicYear: '2024' }, answers}).then(()=>alert("Dados guardados!"))} className="w-full no-print">Guardar Auto-Avaliação</Button>
                </CardContent>
            </Card>
        )}
    </div>
  );
};
