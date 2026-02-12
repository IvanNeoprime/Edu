
import React, { useState, useEffect } from 'react';
import { User, CombinedScore, SelfEvaluation, TeacherCategory, Questionnaire, UserRole, Question, QualitativeEval, Institution } from '../types';
import { BackendService } from '../services/backend';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Select } from './ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LineChart, Line, AreaChart, Area } from 'recharts';
import { Download, TrendingUp, FileText, BarChart3, Save, FileQuestion, Star, CheckCircle2, Lock, Printer, AlertCircle, Info, Calculator, FileCheck, ClipboardList, Shield, PieChart as PieIcon, FileDown } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border-none shadow-2xl rounded-xl ring-1 ring-black/5">
        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">{label || payload[0].name}</p>
        <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{backgroundColor: payload[0].color || payload[0].fill}} />
            <p className="text-sm font-black text-gray-900">{payload[0].value.toFixed(1)} <span className="text-[9px] font-medium text-gray-400">/ 20</span></p>
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
  const [activeTab, setActiveTab] = useState<'stats' | 'self-eval' | 'surveys'>('stats');
  const [stats, setStats] = useState<CombinedScore | undefined>(undefined);
  const [institution, setInstitution] = useState<Institution | null>(null);
  
  const [header, setHeader] = useState<SelfEvaluation['header']>({ category: 'assistente', function: 'Docente', contractRegime: 'Tempo Inteiro', workPeriod: 'Laboral', academicYear: '2024' });
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
    if (savedEval) { setHeader(savedEval.header); setAnswers(savedEval.answers); }
  };

  const effortData = [
    { name: 'Graduação', value: (answers.gradSubjects || 0) * 10 || 5, color: '#3b82f6' },
    { name: 'Pós-Graduação', value: (answers.postGradSubjects || 0) * 15 || 5, color: '#8b5cf6' },
    { name: 'Investigação', value: 30, color: '#10b981' },
    { name: 'Extensão', value: 20, color: '#f59e0b' }
  ];

  const historicalData = [
    { period: '22/1', score: 13.5 }, { period: '22/2', score: 14.8 },
    { period: '23/1', score: 15.2 }, { period: '23/2', score: stats?.finalScore || 16.5 },
  ];

  const scoreComparison = stats ? [
    { label: 'O Seu Score', value: stats.finalScore, fill: '#3b82f6', unit: 'Final' },
    { label: 'Alunos', value: stats.studentScore, fill: '#10b981', unit: 'Inquérito' },
    { label: 'Auto', value: stats.selfEvalScore, fill: '#8b5cf6', unit: 'Auto' },
    { label: 'Média Inst.', value: 14.2, fill: '#f1f5f9', unit: 'Média' }
  ] : [];

  const exportExcel = () => {
    if (!stats) return;
    const headers = ["Indicador", "Nota obtida", "Escala Max"];
    const rows = [
        ["Avaliacao de Alunos", stats.studentScore, 12],
        ["Auto-Avaliacao Docente", stats.selfEvalScore, 80],
        ["Avaliacao Institucional", stats.institutionalScore, 8],
        ["Score Final Global", stats.finalScore, 100]
    ];
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers, ...rows].map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `meu_desempenho_${user.name.replace(/\s/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto animate-fade-in transition-colors">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
          <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-black text-white rounded-xl flex items-center justify-center font-black text-lg shadow-lg no-print">{user.name[0]}</div>
              <div>
                  <h1 className="text-xl font-black tracking-tight uppercase text-gray-900 leading-none mb-1">Portal do Docente</h1>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{user.name} • {institution?.name}</p>
              </div>
          </div>
          <div className="flex bg-gray-100/50 p-1 rounded-xl shadow-inner border border-gray-200 no-print">
              {[
                  {id: 'stats', label: 'Desempenho', icon: BarChart3},
                  {id: 'self-eval', label: 'Auto-Avaliação', icon: FileCheck},
                  {id: 'surveys', label: 'Relatórios', icon: Printer},
              ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-4 py-2 text-[9px] font-black rounded-lg transition-all uppercase tracking-widest flex items-center gap-2 ${activeTab === tab.id ? 'bg-white shadow-sm text-black border border-gray-200' : 'text-gray-400 hover:text-gray-600'}`}>
                    <tab.icon size={11} /> {tab.label}
                  </button>
              ))}
          </div>
        </header>
        
        {activeTab === 'stats' && (
            <div className="space-y-8 animate-in fade-in duration-700">
                <div className="flex justify-end gap-2 no-print">
                   <Button variant="outline" size="sm" onClick={exportExcel} className="h-8 text-[9px] font-black uppercase tracking-widest border-gray-200">
                       <FileDown size={14} className="mr-2"/> Excel (CSV)
                   </Button>
                   <Button variant="outline" size="sm" onClick={exportPDF} className="h-8 text-[9px] font-black uppercase tracking-widest border-gray-200">
                       <Printer size={14} className="mr-2"/> Guardar PDF
                   </Button>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    <Card className="bg-black text-white rounded-[2rem] p-8 flex flex-col items-center justify-center relative overflow-hidden group shadow-xl card">
                        <div className="relative z-10 text-center">
                            <p className="text-[8px] uppercase font-black tracking-widest text-white/40 mb-4">Score Global Semestral</p>
                            <p className="text-7xl leading-none font-black tracking-tighter">{(stats?.finalScore || 0).toFixed(0)}<span className="text-xl opacity-30 text-white/50 tracking-normal">.{((stats?.finalScore || 0) % 1 * 10).toFixed(0)}</span></p>
                            <div className="mt-6 inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[8px] font-black uppercase tracking-widest backdrop-blur-md">
                                <TrendingUp size={12} className="text-emerald-400"/> +8.4% Evolução
                            </div>
                        </div>
                    </Card>

                    <Card className="md:col-span-2 rounded-[2rem] border-none shadow-sm p-8 flex flex-col card">
                        <h3 className="text-[9px] uppercase font-black text-gray-400 tracking-widest mb-6 flex items-center gap-2"><PieIcon size={12}/> Métricas por Componente</h3>
                        <div className="flex-1 min-h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={scoreComparison}>
                                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 800}} />
                                    <YAxis hide domain={[0, 20]} />
                                    <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                                    <Bar dataKey="value" radius={[8, 8, 8, 8]} barSize={40}>
                                        {scoreComparison.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    <Card className="rounded-[2rem] border-none shadow-sm p-8 card">
                        <h3 className="text-[9px] uppercase font-black text-gray-400 tracking-widest mb-6 flex items-center gap-2"><Shield size={12}/> Perfil de Esforço</h3>
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={effortData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value" stroke="none">
                                        {effortData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', paddingLeft: '15px'}} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card className="rounded-[2rem] border-none shadow-sm p-8 card">
                        <h3 className="text-[9px] uppercase font-black text-gray-400 tracking-widest mb-6 flex items-center gap-2"><TrendingUp size={12}/> Progressão Histórica</h3>
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={historicalData}>
                                    <defs>
                                        <linearGradient id="colorHist" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 800}} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorHist)" dot={{r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff'}} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            </div>
        )}

        {activeTab === 'self-eval' && (
            <Card className="max-w-4xl mx-auto rounded-[2.5rem] border-none shadow-xl p-10 card">
                <CardHeader className="p-0 mb-8">
                    <CardTitle className="text-2xl font-black tracking-tight uppercase">Registo de Atividades</CardTitle>
                    <p className="text-[11px] text-gray-400 font-medium">Os dados abaixo compõem os 80% do score final.</p>
                </CardHeader>
                <CardContent className="p-0 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1"><Label className="uppercase text-[9px] font-black opacity-50 ml-1">Cadeiras Graduação</Label><Input type="number" value={answers.gradSubjects} onChange={e=>setAnswers({...answers, gradSubjects: parseInt(e.target.value)||0})} className="h-11 rounded-xl font-bold text-sm" /></div>
                        <div className="space-y-1"><Label className="uppercase text-[9px] font-black opacity-50 ml-1">Horas Teóricas</Label><Input type="number" value={answers.theoryHours} onChange={e=>setAnswers({...answers, theoryHours: parseInt(e.target.value)||0})} className="h-11 rounded-xl font-bold text-sm" /></div>
                    </div>
                    <Button onClick={()=>BackendService.saveSelfEval({teacherId: user.id, institutionId: user.institutionId, header, answers}).then(()=>alert("Dados guardados!"))} className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[11px] shadow-lg shadow-blue-100 no-print">Guardar Auto-Avaliação</Button>
                </CardContent>
            </Card>
        )}
    </div>
  );
};
