
import React, { useState, useEffect } from 'react';
import { User, CombinedScore, SelfEvaluation, Institution, Subject } from '../types';
import { BackendService } from '../services/backend';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, cn } from './ui';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { TrendingUp, BarChart3, Printer, FileCheck, FileDown, User as UserIcon, BookOpen, Calculator, Award, FileSpreadsheet } from 'lucide-react';

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

  const exportIndividualExcel = () => {
    if (!stats) return;
    const delimiter = ";";
    const csvContent = "\uFEFF" + [
      ["RELATÓRIO DE DESEMPENHO DOCENTE"],
      ["Docente", user.name],
      ["Instituição", institution?.name || "N/A"],
      ["Data de Exportação", new Date().toLocaleString()],
      [],
      ["MÉTRICA", "RESULTADO (PESO)"],
      ["Avaliação dos Estudantes", `${stats.studentScore.toFixed(2)} / 12.00`],
      ["Auto-Avaliação (Produção)", `${stats.selfEvalScore.toFixed(2)} / 80.00`],
      ["Avaliação Institucional", `${stats.institutionalScore.toFixed(2)} / 8.00`],
      ["NOTA FINAL", `${stats.finalScore.toFixed(2)} / 20.00`]
    ].map(e => e.join(delimiter)).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `meu_desempenho_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const effortData = [
    { name: 'Aulas', value: (answers.gradSubjects || 0) + (answers.postGradSubjects || 0), color: '#3b82f6' },
    { name: 'Horas T/P', value: (answers.theoryHours || 0) + (answers.practicalHours || 0), color: '#8b5cf6' },
    { name: 'Supervisão', value: (answers.gradSupervision || 0) + (answers.postGradSupervision || 0), color: '#10b981' },
    { name: 'Regência', value: (answers.regencySubjects || 0), color: '#f59e0b' }
  ];

  const barData = stats ? [
    { name: 'Minha Nota', score: stats.finalScore, fill: '#000' },
    { name: 'Média Instituição', score: 14.5, fill: '#e2e8f0' }
  ] : [];

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
        
        {/* INTERFACE DO DASHBOARD */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4 no-print">
          <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-black text-white rounded-lg flex items-center justify-center font-black text-sm no-print">
                  {user.name[0]}
              </div>
              <div>
                  <h1 className="text-sm font-black uppercase tracking-tighter leading-none mb-1">Painel do Docente</h1>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{user.name} • {institution?.name}</p>
              </div>
          </div>
          <div className="flex bg-gray-100/50 p-1 rounded-xl border border-gray-200">
              <button onClick={() => setActiveTab('stats')} className={cn("px-4 py-1.5 text-[9px] font-black rounded-lg transition-all uppercase tracking-widest", activeTab === 'stats' ? "bg-white shadow-sm text-black border border-gray-200" : "text-gray-400")}>Estatísticas</button>
              <button onClick={() => setActiveTab('self-eval')} className={cn("px-4 py-1.5 text-[9px] font-black rounded-lg transition-all uppercase tracking-widest", activeTab === 'self-eval' ? "bg-white shadow-sm text-black border border-gray-200" : "text-gray-400")}>Auto-Avaliação</button>
          </div>
        </header>
        
        {activeTab === 'stats' && (
            <div className="space-y-6 no-print">
                <div className="flex justify-end gap-2">
                   <Button size="xs" variant="outline" onClick={exportIndividualExcel} className="font-black h-8 text-emerald-600 border-emerald-100 hover:bg-emerald-50"><FileSpreadsheet size={14} className="mr-2"/> Exportar Excel</Button>
                   <Button size="xs" variant="primary" onClick={() => window.print()} className="font-black h-8 shadow-lg"><Printer size={14} className="mr-1"/> Gerar PDF Oficial</Button>
                </div>

                <div className="grid md:grid-cols-4 gap-6">
                    <Card className="md:col-span-1 bg-black text-white p-8 flex flex-col items-center justify-center border-none shadow-2xl overflow-hidden relative group rounded-3xl">
                        <Award className="absolute -top-4 -left-4 text-white/10 w-24 h-24 rotate-12" />
                        <Label className="text-white/40 mb-2 uppercase tracking-widest text-[10px]">Nota Final</Label>
                        <p className="text-6xl font-black">{(stats?.finalScore || 0).toFixed(1)}</p>
                        <div className="mt-4 px-3 py-1 bg-white/10 rounded-full text-[8px] font-black uppercase tracking-widest">Semestre {institution?.evaluationPeriodName?.split('-')[1] || '1'}</div>
                    </Card>

                    <Card className="md:col-span-2 bg-white border-none shadow-lg rounded-3xl">
                        <CardHeader className="pb-0"><CardTitle className="text-[9px] opacity-40 flex items-center gap-2 uppercase font-black"><BarChart3 size={12}/> Comparativo de Performance</CardTitle></CardHeader>
                        <CardContent className="h-48 pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={barData} margin={{left: 0, right: 30}}>
                                    <XAxis type="number" domain={[0, 20]} hide />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#64748b'}} width={100} />
                                    <Tooltip cursor={{fill: 'transparent'}} />
                                    <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={24}>
                                        {barData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="md:col-span-1 bg-white border-none shadow-lg flex flex-col items-center justify-center p-4 rounded-3xl">
                        <CardTitle className="text-[9px] opacity-40 mb-4 uppercase font-black">Fontes de Dados</CardTitle>
                        <div className="space-y-3 w-full">
                            {[
                                {label: 'Alunos', val: stats?.studentScore || 0, max: 12, color: 'bg-emerald-500'},
                                {label: 'Auto', val: stats?.selfEvalScore || 0, max: 80, color: 'bg-purple-500'},
                                {label: 'Gestão', val: stats?.institutionalScore || 0, max: 8, color: 'bg-blue-500'}
                            ].map((item, i) => (
                                <div key={i} className="space-y-1">
                                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
                                        <span>{item.label}</span>
                                        <span className="opacity-50">{item.val.toFixed(1)} / {item.max}</span>
                                    </div>
                                    <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div className={cn("h-full transition-all duration-1000", item.color)} style={{width: `${(item.val/(item.max||1))*100}%`}} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <Card className="border-none shadow-lg bg-white rounded-3xl">
                        <CardHeader><CardTitle className="text-[9px] opacity-40 uppercase font-black">Actividades Académicas</CardTitle></CardHeader>
                        <CardContent className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={effortData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                                        {effortData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', fontSize: '10px'}} />
                                    <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase'}} />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-lg bg-white rounded-3xl">
                        <CardHeader><CardTitle className="text-[9px] opacity-40 uppercase font-black">Disciplinas Activas ({subjects.length})</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {subjects.map(s => (
                                <div key={s.id} className="p-3 bg-gray-50 rounded-xl flex items-center gap-3 border border-gray-100 hover:border-blue-200 transition-colors cursor-pointer">
                                    <div className="h-8 w-8 bg-white rounded-lg border flex items-center justify-center text-blue-600 shadow-sm"><BookOpen size={14}/></div>
                                    <div className="flex-1">
                                        <p className="text-xs font-bold leading-none mb-1">{s.name}</p>
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{s.course} • {s.level}º Ano</p>
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
                <Card className="max-w-2xl mx-auto shadow-2xl rounded-[2.5rem] border-none overflow-hidden">
                    <CardHeader className="text-center border-b p-8 bg-gray-50/50">
                        <div className="h-14 w-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm">
                            <FileCheck className="text-blue-600" size={28}/>
                        </div>
                        <CardTitle className="text-xl font-black uppercase tracking-tight">Formulário de Auto-Avaliação</CardTitle>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-widest">Estes dados compõem 80% do seu resultado final.</p>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="grid grid-cols-2 gap-8">
                            {[
                                {label: 'Cadeiras (Graduação)', key: 'gradSubjects'},
                                {label: 'Horas Teóricas (Semana)', key: 'theoryHours'},
                                {label: 'Horas Práticas (Semana)', key: 'practicalHours'},
                                {label: 'Supervisão de Teses', key: 'gradSupervision'}
                            ].map((field, i) => (
                                <div key={i} className="space-y-2">
                                    <Label className="text-gray-900">{field.label}</Label>
                                    <Input type="number" min="0" value={(answers as any)[field.key]} onChange={e=>setAnswers({...answers, [field.key]: parseInt(e.target.value)||0})} className="h-12 font-black text-sm bg-gray-50/50 border-gray-200 rounded-xl focus:ring-blue-500" />
                                </div>
                            ))}
                        </div>
                        <Button onClick={()=>BackendService.saveSelfEval({teacherId: user.id, institutionId: user.institutionId, header: { category: user.category || 'assistente', function: 'Docente', contractRegime: 'Tempo Inteiro', workPeriod: 'Laboral', academicYear: '2024' }, answers}).then(()=>alert("Dados de produção actualizados!"))} className="w-full h-14 bg-blue-600 hover:bg-blue-700 font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-50 rounded-2xl mt-4">
                            SALVAR DADOS DE PRODUÇÃO
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )}
    </div>
  );
};
