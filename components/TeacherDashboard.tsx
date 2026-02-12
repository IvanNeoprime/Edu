
import React, { useState, useEffect } from 'react';
import { User, CombinedScore, SelfEvaluation, TeacherCategory, Questionnaire, UserRole, Question, QualitativeEval, Institution } from '../types';
import { BackendService } from '../services/backend';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Select } from './ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LineChart, Line } from 'recharts';
import { Download, TrendingUp, FileText, BarChart3, Save, FileQuestion, Star, CheckCircle2, Lock, Printer, AlertCircle, Info, Calculator, FileCheck, ClipboardList, Shield, PieChart as PieIcon } from 'lucide-react';

interface Props {
  user: User;
}

export const TeacherDashboard: React.FC<Props> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'self-eval' | 'surveys'>('stats');
  const [stats, setStats] = useState<CombinedScore | undefined>(undefined);
  const [qualEval, setQualEval] = useState<QualitativeEval | undefined>(undefined);
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
    const qEval = await BackendService.getQualitativeEval(user.id);
    setQualEval(qEval);
    const savedEval = await BackendService.getSelfEval(user.id);
    if (savedEval) { setHeader(savedEval.header); setAnswers(savedEval.answers); }
  };

  const effortData = [
    { name: 'Ensino', value: (answers.theoryHours + answers.practicalHours) || 1, color: '#3b82f6' },
    { name: 'Investigação', value: (answers.postGradSubjects * 5) || 1, color: '#8b5cf6' },
    { name: 'Extensão', value: answers.consultationHours || 1, color: '#10b981' },
    { name: 'Supervisão', value: (answers.gradSupervision * 3) || 1, color: '#f59e0b' }
  ];

  const historicalData = [
    { period: '2022/1', score: 14.5 }, { period: '2022/2', score: 15.2 },
    { period: '2023/1', score: 16.8 }, { period: '2023/2', score: stats?.finalScore || 17.5 },
  ];

  const scoreComparison = stats ? [
    { label: 'Sua Nota', value: stats.finalScore, fill: '#3b82f6' },
    { label: 'Alunos', value: stats.studentScore, fill: '#10b981' },
    { label: 'Auto', value: stats.selfEvalScore, fill: '#8b5cf6' },
    { label: 'Média Inst.', value: 16.5, fill: '#cbd5e1' }
  ] : [];

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-6xl mx-auto animate-fade-in">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
          <div>
              <h1 className="text-3xl font-black tracking-tight uppercase">Dashboard Docente</h1>
              <p className="text-gray-500 font-medium">{user.name} • {institution?.name}</p>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-xl">
              <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'stats' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>RESULTADOS</button>
              <button onClick={() => setActiveTab('self-eval')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'self-eval' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>AUTO-AVALIAÇÃO</button>
              <button onClick={() => setActiveTab('surveys')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'surveys' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>INQUÉRITOS</button>
          </div>
        </header>
        
        {activeTab === 'stats' && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="md:col-span-2 lg:col-span-1 bg-black text-white">
                    <CardContent className="pt-10 text-center space-y-4">
                        <p className="text-xs uppercase font-black tracking-widest opacity-60">Score Semestral</p>
                        <p className="text-8xl font-black tracking-tighter">{stats?.finalScore.toFixed(1) || '0.0'}</p>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs">
                            <TrendingUp size={14}/> +12% em relação ao semestre anterior
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader><CardTitle className="text-sm uppercase flex items-center gap-2"><BarChart3 size={16}/> Comparativo de Notas</CardTitle></CardHeader>
                    <CardContent className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={scoreComparison} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip cursor={{fill: '#f8fafc'}} />
                                <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={50}>
                                    {scoreComparison.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="text-sm uppercase flex items-center gap-2"><PieIcon size={16}/> Distribuição de Esforço</CardTitle></CardHeader>
                    <CardContent className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={effortData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                    {effortData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader><CardTitle className="text-sm uppercase flex items-center gap-2"><TrendingUp size={16}/> Evolução Histórica (Score Final)</CardTitle></CardHeader>
                    <CardContent className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={historicalData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="period" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={4} dot={{r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 10}} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        )}

        {/* Mantendo as abas de formulário existentes */}
        {activeTab === 'self-eval' && (
            <Card className="max-w-4xl mx-auto"><CardHeader><CardTitle>Auto-Avaliação</CardTitle></CardHeader><CardContent><p className="text-sm text-gray-500 mb-8 italic">Preencha os indicadores de atividade académica para o semestre atual.</p>
            <div className="space-y-6"><div className="grid grid-cols-2 gap-4"><div><Label>Disciplinas Graduação</Label><Input type="number" value={answers.gradSubjects} onChange={e=>setAnswers({...answers, gradSubjects: parseInt(e.target.value)||0})} /></div><div><Label>Horas Teóricas/Sem</Label><Input type="number" value={answers.theoryHours} onChange={e=>setAnswers({...answers, theoryHours: parseInt(e.target.value)||0})} /></div></div><Button onClick={()=>BackendService.saveSelfEval({teacherId: user.id, institutionId: user.institutionId, header, answers}).then(()=>alert("Salvo!"))} className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700">Submeter Auto-Avaliação</Button></div></CardContent></Card>
        )}
    </div>
  );
};
