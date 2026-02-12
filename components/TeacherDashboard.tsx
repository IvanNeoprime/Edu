
import React, { useState, useEffect } from 'react';
import { User, CombinedScore, SelfEvaluation, TeacherCategory, Questionnaire, UserRole, Question, QualitativeEval, Institution } from '../types';
import { BackendService } from '../services/backend';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Select } from './ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LineChart, Line, AreaChart, Area } from 'recharts';
import { Download, TrendingUp, FileText, BarChart3, Save, FileQuestion, Star, CheckCircle2, Lock, Printer, AlertCircle, Info, Calculator, FileCheck, ClipboardList, Shield, PieChart as PieIcon } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border-none shadow-2xl rounded-2xl ring-1 ring-black/5">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">{label || payload[0].name}</p>
        <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full" style={{backgroundColor: payload[0].color || payload[0].fill}} />
            <p className="text-lg font-black text-gray-900">{payload[0].value.toFixed(1)} <span className="text-[10px] font-medium text-gray-400">/ 20</span></p>
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
    { name: 'Aula Graduação', value: (answers.gradSubjects * 10) || 5, color: '#3b82f6' },
    { name: 'Pós-Graduação', value: (answers.postGradSubjects * 15) || 5, color: '#8b5cf6' },
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

  return (
    <div className="space-y-12 p-4 md:p-8 max-w-7xl mx-auto animate-fade-in transition-colors">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b pb-8">
          <div className="flex items-center gap-6">
              <div className="h-16 w-16 bg-black text-white rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-xl">{user.name[0]}</div>
              <div>
                  <h1 className="text-4xl font-black tracking-tighter uppercase text-gray-900 leading-none mb-1">Portal do Docente</h1>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{user.name} • {institution?.name}</p>
              </div>
          </div>
          <div className="flex bg-gray-100 p-1.5 rounded-2xl shadow-inner ring-1 ring-black/5">
              {[
                  {id: 'stats', label: 'Desempenho', icon: BarChart3},
                  {id: 'self-eval', label: 'Auto-Avaliação', icon: FileCheck},
                  {id: 'surveys', label: 'Relatórios', icon: Printer},
              ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-6 py-2.5 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest flex items-center gap-2 ${activeTab === tab.id ? 'bg-white shadow-xl text-black scale-105' : 'text-gray-400 hover:text-gray-600'}`}>
                    <tab.icon size={12} /> {tab.label}
                  </button>
              ))}
          </div>
        </header>
        
        {activeTab === 'stats' && (
            <div className="space-y-12 animate-in fade-in duration-700">
                <div className="grid gap-8 md:grid-cols-3">
                    <Card className="bg-black text-white rounded-[2.5rem] p-10 flex flex-col items-center justify-center relative overflow-hidden group shadow-2xl">
                        <div className="relative z-10 text-center">
                            <p className="text-[10px] uppercase font-black tracking-[0.3em] text-white/40 mb-6">Score Global Semestral</p>
                            <p className="text-[10rem] leading-none font-black tracking-tighter group-hover:scale-105 transition-transform duration-1000">{stats?.finalScore.toFixed(0) || '0'}<span className="text-4xl opacity-30 text-white/50 tracking-normal">.{(stats?.finalScore % 1 * 10).toFixed(0)}</span></p>
                            <div className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                                <TrendingUp size={14} className="text-emerald-400"/> Evolução de +8.4%
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 p-8 opacity-20"><Info size={24}/></div>
                    </Card>

                    <Card className="md:col-span-2 rounded-[2.5rem] border-none shadow-xl p-10 flex flex-col">
                        <h3 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-10 flex items-center gap-2"><PieIcon size={14}/> Comparativo de Performance</h3>
                        <div className="flex-1 min-h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={scoreComparison} margin={{top: 0, right: 0, left: 0, bottom: 0}}>
                                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                                    <YAxis hide domain={[0, 20]} />
                                    <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                                    <Bar dataKey="value" radius={[14, 14, 14, 14]} barSize={50} animationBegin={200} animationDuration={1500}>
                                        {scoreComparison.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-10 grid grid-cols-4 gap-4 pt-8 border-t">
                            {scoreComparison.map((s, i) => (
                                <div key={i} className="text-center">
                                    <p className="text-xs font-black text-gray-900 mb-1">{s.value.toFixed(1)}</p>
                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{s.unit}</p>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                <div className="grid md:grid-cols-2 gap-10">
                    <Card className="rounded-[2.5rem] border-none shadow-xl p-10">
                        <h3 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-10 flex items-center gap-2"><Shield size={14}/> Focos de Atividade</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={effortData} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={8} dataKey="value" stroke="none" cornerRadius={10}>
                                        {/* Fix: Removed invalid cornerRadius prop from Cell */}
                                        {effortData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase', paddingLeft: '20px'}} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card className="rounded-[2.5rem] border-none shadow-xl p-10 bg-gradient-to-br from-gray-50 to-white overflow-hidden relative">
                        <h3 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-10 flex items-center gap-2"><TrendingUp size={14}/> Evolução Histórica</h3>
                        <div className="h-64 p-0 pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={historicalData}>
                                    <defs>
                                        <linearGradient id="colorHist" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={6} fillOpacity={1} fill="url(#colorHist)" dot={{r: 7, fill: '#3b82f6', strokeWidth: 4, stroke: '#fff'}} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="absolute right-10 bottom-10 opacity-5"><BarChart3 size={120}/></div>
                    </Card>
                </div>
            </div>
        )}

        {activeTab === 'self-eval' && (
            <Card className="max-w-4xl mx-auto rounded-[3rem] border-none shadow-2xl p-12">
                <CardHeader className="p-0 mb-10"><CardTitle className="text-3xl font-black tracking-tight uppercase">Registo de Atividades</CardTitle><p className="text-sm text-gray-400 font-medium">Preencha os indicadores para o cálculo automático do score de 80%.</p></CardHeader>
                <CardContent className="p-0 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2"><Label className="uppercase text-[10px] font-black opacity-50 ml-1">Disciplinas na Graduação</Label><Input type="number" value={answers.gradSubjects} onChange={e=>setAnswers({...answers, gradSubjects: parseInt(e.target.value)||0})} className="h-14 rounded-2xl font-bold" /></div>
                        <div className="space-y-2"><Label className="uppercase text-[10px] font-black opacity-50 ml-1">Horas Teóricas Semanais</Label><Input type="number" value={answers.theoryHours} onChange={e=>setAnswers({...answers, theoryHours: parseInt(e.target.value)||0})} className="h-14 rounded-2xl font-bold" /></div>
                    </div>
                    <Button onClick={()=>BackendService.saveSelfEval({teacherId: user.id, institutionId: user.institutionId, header, answers}).then(()=>alert("Dados guardados!"))} className="w-full h-16 rounded-[1.5rem] bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-lg shadow-xl shadow-blue-100">Guardar Auto-Avaliação</Button>
                </CardContent>
            </Card>
        )}
    </div>
  );
};
