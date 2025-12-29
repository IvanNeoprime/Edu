
import React, { useState, useEffect } from 'react';
import { User, CombinedScore, SelfEvaluation, TeacherCategory, Questionnaire, UserRole, Question } from '../types';
import { BackendService } from '../services/backend';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Select } from './ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Download, TrendingUp, FileText, BarChart3, Save, FileQuestion, Star, CheckCircle2, Lock, Printer, AlertCircle, Info, Calculator, FileCheck } from 'lucide-react';

interface Props {
  user: User;
}

export const TeacherDashboard: React.FC<Props> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'self-eval' | 'surveys'>('stats');
  const [stats, setStats] = useState<CombinedScore | undefined>(undefined);
  
  // Surveys State
  const [availableSurvey, setAvailableSurvey] = useState<{questionnaire: Questionnaire} | null>(null);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, string | number>>({});
  const [surveySubmitting, setSurveySubmitting] = useState(false);
  const [surveySuccess, setSurveySuccess] = useState(false);

  // New Complex State for Self Eval
  const [header, setHeader] = useState<SelfEvaluation['header']>({
      category: 'assistente',
      function: 'Docente',
      contractRegime: 'Tempo Inteiro',
      workPeriod: 'Laboral',
      academicYear: new Date().getFullYear().toString()
  });
  
  const [answers, setAnswers] = useState<SelfEvaluation['answers']>({
      gradSubjects: 0,
      postGradSubjects: 0,
      theoryHours: 0,
      practicalHours: 0,
      consultationHours: 0,
      gradSupervision: 0,
      postGradSupervision: 0,
      regencySubjects: 0
  });

  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    loadData();
    loadSurveys();
  }, [user.id]);

  // Effect to reset restricted fields if category changes to intern
  useEffect(() => {
      if (header.category === 'assistente_estagiario') {
          setAnswers(prev => ({
              ...prev,
              gradSupervision: 0,
              postGradSupervision: 0,
              regencySubjects: 0
          }));
      }
  }, [header.category]);

  const loadData = async () => {
    const data = await BackendService.getTeacherStats(user.id);
    setStats(data);
    
    const savedEval = await BackendService.getSelfEval(user.id);
    if (savedEval) {
        setHeader(savedEval.header);
        setAnswers(savedEval.answers);
        // If data exists, assume it was saved previously
        setLastSaved(new Date()); 
    }
  };

  const loadSurveys = async () => {
      if (user.institutionId) {
          const res = await BackendService.getAvailableSurveys(user.institutionId, UserRole.TEACHER);
          if (res) {
              setAvailableSurvey({ questionnaire: res.questionnaire });
          } else {
              setAvailableSurvey(null);
          }
      }
  };

  const calculateLiveScore = () => {
    let score = 0;
    score += (answers.gradSubjects || 0) * 15;
    score += (answers.postGradSubjects || 0) * 5;
    score += (answers.theoryHours || 0) * 16;
    score += (answers.practicalHours || 0) * 14;
    score += (answers.consultationHours || 0) * 5;

    if (header.category === 'assistente') {
        score += (answers.gradSupervision || 0) * 6;
        score += (answers.postGradSupervision || 0) * 6;
        score += (answers.regencySubjects || 0) * 8;
    }
    return score;
  };

  // Generate breakdown for charts
  const getScoreBreakdown = () => {
      const data = [
          { name: 'Graduação', value: (answers.gradSubjects || 0) * 15 },
          { name: 'Pós-Grad', value: (answers.postGradSubjects || 0) * 5 },
          { name: 'Teóricas', value: (answers.theoryHours || 0) * 16 },
          { name: 'Práticas', value: (answers.practicalHours || 0) * 14 },
          { name: 'Consultas', value: (answers.consultationHours || 0) * 5 },
      ];
      if (header.category === 'assistente') {
          data.push({ name: 'Supervisão', value: ((answers.gradSupervision || 0) * 6) + ((answers.postGradSupervision || 0) * 6) });
          data.push({ name: 'Regência', value: (answers.regencySubjects || 0) * 8 });
      }
      return data.filter(d => d.value > 0);
  };

  const handleSaveSelfEval = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      
      // Ensure data integrity before saving
      const cleanAnswers = { ...answers };
      if (header.category === 'assistente_estagiario') {
          cleanAnswers.gradSupervision = 0;
          cleanAnswers.postGradSupervision = 0;
          cleanAnswers.regencySubjects = 0;
      }

      await BackendService.saveSelfEval({
          teacherId: user.id,
          header,
          answers: cleanAnswers
      });
      setSaving(false);
      setLastSaved(new Date());
      alert("Auto-avaliação salva com sucesso! Você pode baixar o comprovativo agora.");
      loadData();
  };

  const handleDownloadReceipt = () => {
      const score = calculateLiveScore();
      const date = new Date().toLocaleString();
      const content = `
COMPROVATIVO DE AUTO-AVALIAÇÃO - AVALIADOCENTE MZ
------------------------------------------------
Docente: ${user.name}
Email: ${user.email}
Data de Submissão: ${date}
Instituição ID: ${user.institutionId}
------------------------------------------------
RESUMO DOS DADOS DECLARADOS:

Categoria: ${header.category}
Regime: ${header.contractRegime}

INDICADORES QUANTITATIVOS:
- Disciplinas Graduação: ${answers.gradSubjects}
- Disciplinas Pós-Graduação: ${answers.postGradSubjects}
- Horas Teóricas: ${answers.theoryHours}
- Horas Práticas: ${answers.practicalHours}
- Horas Consultas: ${answers.consultationHours}
${header.category === 'assistente' ? `
- Supervisão Graduação: ${answers.gradSupervision}
- Supervisão Pós-Grad: ${answers.postGradSupervision}
- Regências: ${answers.regencySubjects}
` : ''}
------------------------------------------------
TOTAL DE PONTOS AUTO-AVALIAÇÃO: ${score}
------------------------------------------------
Este documento serve como prova de que os dados foram
inseridos no sistema local. Aguarde a validação do gestor.
`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprovativo_avalia_${user.name.split(' ')[0]}_${new Date().toISOString().slice(0,10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  const handleSubmitSurvey = async () => {
    if (!availableSurvey) return;
    setSurveySubmitting(true);
    try {
        await BackendService.submitAnonymousResponse(user.id, {
            questionnaireId: availableSurvey.questionnaire.id,
            subjectId: 'general', // General Institutional Survey
            teacherId: user.id, // Target is self or general
            answers: Object.entries(surveyAnswers).map(([k, v]) => ({ questionId: k, value: v }))
        });
        setSurveySuccess(true);
        setTimeout(() => setSurveySuccess(false), 3000);
    } catch (e: any) {
        alert(e.message);
    } finally {
        setSurveySubmitting(false);
    }
  };

  const handleExportCSV = () => {
      // Create CSV even if stats are null (using current self eval)
      const currentSelfScore = stats?.selfEvalScore || calculateLiveScore();
      const currentFinal = stats?.finalScore || currentSelfScore; // Approximation

      const csvContent = `data:text/csv;charset=utf-8,` 
          + `Docente,${user.name}\n`
          + `Instituição,${user.institutionId}\n`
          + `Data do Relatório,${new Date().toLocaleDateString()}\n\n`
          + `Componente,Pontos\n`
          + `Auto-Avaliação,${currentSelfScore}\n` 
          + `Avaliação dos Alunos,${stats?.studentScore || 'Pendente'}\n`
          + `Avaliação Qualitativa,${stats?.institutionalScore || 'Pendente'}\n`
          + `SCORE FINAL (Provisório),${currentFinal}\n`;

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `relatorio_${user.name.replace(/\s+/g, '_').toLowerCase()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
      window.print();
  };

  // --- Dynamic Question Renderer ---
  const renderQuestionInput = (q: Question) => {
      const val = surveyAnswers[q.id];
      const setAns = (v: any) => setSurveyAnswers(prev => ({ ...prev, [q.id]: v }));

      switch (q.type) {
          case 'stars':
              return (
                  <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                          <button key={star} onClick={() => setAns(star)} className="focus:outline-none">
                              <Star className={`h-8 w-8 ${(val as number) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                          </button>
                      ))}
                  </div>
              );
          case 'binary':
              return (
                  <div className="flex gap-4">
                      <button onClick={() => setAns(0)} className={`flex-1 py-2 px-4 rounded-md border ${val === 0 ? 'bg-red-100 border-red-300' : 'bg-white'}`}>Não</button>
                      <button onClick={() => setAns(1)} className={`flex-1 py-2 px-4 rounded-md border ${val === 1 ? 'bg-green-100 border-green-300' : 'bg-white'}`}>Sim</button>
                  </div>
              );
          case 'text':
              return <textarea className="w-full p-2 border rounded" value={val as string || ''} onChange={(e) => setAns(e.target.value)} />;
          default:
              return <Input value={val as string || ''} onChange={(e) => setAns(e.target.value)} />;
      }
  };

  // Pie Chart Data
  const pieData = stats ? [
      { name: 'Auto-Avaliação', value: stats.selfEvalScore, fill: '#8b5cf6' },
      { name: 'Aval. Estudante', value: stats.studentScore, fill: '#3b82f6' },
      { name: 'Aval. Qualitativa', value: stats.institutionalScore, fill: '#10b981' }
  ] : [
      { name: 'Auto-Avaliação (Estimada)', value: calculateLiveScore(), fill: '#8b5cf6' },
      { name: 'Outros (Pendente)', value: 10, fill: '#e5e7eb' }
  ];

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-6xl mx-auto animate-in fade-in duration-500 print:p-0 print:max-w-none">
      <header className="border-b pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Painel do Docente</h1>
            <p className="text-gray-500">Acompanhamento de Desempenho e Auto-Avaliação</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'stats' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>Relatórios</button>
            <button onClick={() => setActiveTab('self-eval')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'self-eval' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>Auto-Avaliação</button>
            <button onClick={() => setActiveTab('surveys')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'surveys' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>Inquéritos</button>
        </div>
      </header>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-6">
          <h2 className="text-2xl font-bold">Relatório Individual de Desempenho</h2>
          <p className="text-gray-600">Docente: {user.name}</p>
          <p className="text-gray-500 text-sm">Gerado em: {new Date().toLocaleDateString()}</p>
      </div>

      {/* --- ABA ESTATÍSTICAS / RELATÓRIOS --- */}
      {activeTab === 'stats' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
            {!stats ? (
                 // VIEW: NO OFFICIAL STATS YET (PRELIMINARY VIEW)
                 <div className="space-y-6">
                     <div className="p-6 border rounded-lg bg-blue-50 flex items-start gap-4">
                        <Info className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
                        <div>
                            <h3 className="font-semibold text-blue-900">Resultados Preliminares</h3>
                            <p className="text-sm text-blue-700 mt-1">
                                O Gestor Institucional ainda não fechou o cálculo final do semestre. 
                                Abaixo apresentamos uma <strong>projeção</strong> baseada apenas na sua Auto-Avaliação atual.
                            </p>
                        </div>
                     </div>
                     
                     <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium">Auto-Avaliação (Projetada)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold text-purple-600">{calculateLiveScore()} pts</div>
                                <p className="text-xs text-gray-500 mt-2">Baseado nos dados que você preencheu.</p>
                                <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => setActiveTab('self-eval')}>
                                    Editar Auto-Avaliação
                                </Button>
                            </CardContent>
                        </Card>
                        <Card>
                             <CardHeader><CardTitle>Composição Estimada</CardTitle></CardHeader>
                             <CardContent className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={getScoreBreakdown()} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={100} fontSize={10} />
                                        <Tooltip cursor={{fill: 'transparent'}} />
                                        <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                             </CardContent>
                        </Card>
                     </div>
                 </div>
            ) : (
                // VIEW: OFFICIAL STATS AVAILABLE
                <>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pontuação Final</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                        <div className="text-2xl font-bold">{stats.finalScore}</div>
                        <p className="text-xs text-gray-500">Acumulado do Semestre</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Aval. Estudante</CardTitle>
                        <div className="h-4 w-4 text-blue-600">🎓</div>
                        </CardHeader>
                        <CardContent>
                        <div className="text-2xl font-bold">{stats.studentScore}</div>
                        <p className="text-xs text-gray-500">Ponderada (12%)</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Auto-Avaliação</CardTitle>
                        <FileText className="h-4 w-4 text-purple-600" />
                        </CardHeader>
                        <CardContent>
                        <div className="text-2xl font-bold">{stats.selfEvalScore}</div>
                        <p className="text-xs text-gray-500">Pontos Absolutos (80%)</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Aval. Qualitativa</CardTitle>
                        <div className="h-4 w-4 text-green-600">🏛️</div>
                        </CardHeader>
                        <CardContent>
                        <div className="text-2xl font-bold">{stats.institutionalScore}</div>
                        <p className="text-xs text-gray-500">Ponderada (8%)</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2 print:block print:space-y-6">
                    <Card className="print:shadow-none print:border-none">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5"/> Composição da Nota</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[
                                    { name: 'Estudante', value: stats.studentScore },
                                    { name: 'Auto-Aval.', value: stats.selfEvalScore },
                                    { name: 'Qualitativa', value: stats.institutionalScore },
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip cursor={{fill: 'transparent'}} />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        <Cell fill="#3b82f6" />
                                        <Cell fill="#8b5cf6" />
                                        <Cell fill="#10b981" />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="print:shadow-none print:border-none">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">Distribuição de Peso</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        label
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
                </>
            )}

            <div className="flex justify-end gap-4 print:hidden pt-4 border-t">
                <Button variant="outline" onClick={handlePrintPDF}>
                    <Printer className="mr-2 h-4 w-4" /> Imprimir Relatório
                </Button>
                <Button onClick={handleExportCSV}>
                    <Download className="mr-2 h-4 w-4" /> Baixar Relatório (CSV)
                </Button>
            </div>
        </div>
      )}

      {/* --- ABA AUTO-AVALIAÇÃO --- */}
      {activeTab === 'self-eval' && (
        <div className="grid gap-6 lg:grid-cols-12 animate-in slide-in-from-right-4 fade-in duration-300 print:hidden">
            
            {/* Left Column: Form */}
            <div className="lg:col-span-8">
                <form onSubmit={handleSaveSelfEval} className="space-y-6">
                    {/* Header Section */}
                    <Card className="border-blue-100 bg-blue-50/50">
                        <CardHeader>
                            <CardTitle className="text-blue-900">1. Dados do Docente (Cabeçalho)</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Categoria</Label>
                                <Select value={header.category} onChange={e => setHeader({...header, category: e.target.value as TeacherCategory})}>
                                    <option value="assistente">Assistente (Pleno)</option>
                                    <option value="assistente_estagiario">Assistente Estagiário</option>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Função</Label>
                                <Input value={header.function} onChange={e => setHeader({...header, function: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Regime</Label>
                                <Input value={header.contractRegime} onChange={e => setHeader({...header, contractRegime: e.target.value})} placeholder="Tempo Inteiro / Parcial" />
                            </div>
                            <div className="space-y-2">
                                <Label>Período</Label>
                                <Input value={header.workPeriod} onChange={e => setHeader({...header, workPeriod: e.target.value})} placeholder="Laboral / PL" />
                            </div>
                            <div className="space-y-2">
                                <Label>Ano Lectivo</Label>
                                <Input value={header.academicYear} onChange={e => setHeader({...header, academicYear: e.target.value})} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Questions Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>2. Indicadores de Desempenho</CardTitle>
                            <p className="text-sm text-gray-500">Preencha as quantidades. O sistema calculará os pontos automaticamente.</p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            
                            {/* Common Questions */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-gray-900 border-b pb-2">Disciplinas Leccionadas</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Disciplinas de Graduação (15 pts cada)</Label>
                                        <Input type="number" min="0" value={answers.gradSubjects} onChange={e => setAnswers({...answers, gradSubjects: parseInt(e.target.value)||0})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Disciplinas de Pós-Graduação (5 pts cada)</Label>
                                        <Input type="number" min="0" value={answers.postGradSubjects} onChange={e => setAnswers({...answers, postGradSubjects: parseInt(e.target.value)||0})} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold text-gray-900 border-b pb-2">Carga Horária Semanal</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <Label>Aulas Teóricas (16 pts)</Label>
                                        <Input type="number" min="0" value={answers.theoryHours} onChange={e => setAnswers({...answers, theoryHours: parseInt(e.target.value)||0})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Aulas Práticas (14 pts)</Label>
                                        <Input type="number" min="0" value={answers.practicalHours} onChange={e => setAnswers({...answers, practicalHours: parseInt(e.target.value)||0})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Consultas/Atendimento (5 pts)</Label>
                                        <Input type="number" min="0" value={answers.consultationHours} onChange={e => setAnswers({...answers, consultationHours: parseInt(e.target.value)||0})} />
                                    </div>
                                </div>
                            </div>

                            {/* Assistente Only Questions vs Intern Notice */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-gray-900 border-b pb-2">Supervisão e Regência</h3>
                                
                                {header.category === 'assistente' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in">
                                        <div className="space-y-2">
                                            <Label>Dissertações Graduação (6 pts cada)</Label>
                                            <Input type="number" min="0" value={answers.gradSupervision} onChange={e => setAnswers({...answers, gradSupervision: parseInt(e.target.value)||0})} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Teses Pós-Graduação (6 pts cada)</Label>
                                            <Input type="number" min="0" value={answers.postGradSupervision} onChange={e => setAnswers({...answers, postGradSupervision: parseInt(e.target.value)||0})} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Disciplinas em Regência (8 pts cada)</Label>
                                            <Input type="number" min="0" value={answers.regencySubjects} onChange={e => setAnswers({...answers, regencySubjects: parseInt(e.target.value)||0})} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 flex items-start gap-3 text-yellow-800">
                                        <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <h4 className="font-semibold text-sm">Campos Restritos para Assistente Estagiário</h4>
                                            <p className="text-xs mt-1">
                                                Como <strong>Assistente Estagiário</strong>, os campos de Supervisão de Teses e Regência de Disciplinas não são aplicáveis à sua avaliação e pontuação.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                        </CardContent>
                    </Card>
                    
                    <div className="flex flex-col gap-4">
                        <Button type="submit" size="lg" className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg shadow-md" disabled={saving}>
                            {saving ? 'Salvando...' : <><Save className="mr-2 h-5 w-5" /> Salvar e Enviar Auto-Avaliação</>}
                        </Button>
                        <p className="text-center text-xs text-gray-500">
                            Ao clicar em salvar, os dados são registrados no sistema local e estarão disponíveis para o gestor.
                        </p>
                    </div>
                </form>
            </div>

            {/* Right Column: Live Feedback */}
            <div className="lg:col-span-4 space-y-6">
                <Card className="sticky top-6 border-indigo-200 shadow-md">
                    <CardHeader className="bg-gradient-to-br from-indigo-50 to-white border-b border-indigo-100">
                        <CardTitle className="text-indigo-900 flex items-center gap-2">
                            <Calculator className="h-5 w-5" /> Resumo em Tempo Real
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="text-center">
                            <p className="text-sm font-medium text-gray-500 mb-1">Pontuação Estimada</p>
                            <div className="text-5xl font-extrabold text-indigo-600 tracking-tight">
                                {calculateLiveScore()}
                            </div>
                            <p className="text-xs text-gray-400 mt-2">pontos acumulados</p>
                        </div>

                        <div className="h-[200px] w-full">
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={getScoreBreakdown()} layout="vertical" margin={{top:0, left:0, right:30, bottom:0}}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10}} />
                                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{fontSize: '12px'}} />
                                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20}>
                                        <Cell fill="#8b5cf6" />
                                    </Bar>
                                </BarChart>
                             </ResponsiveContainer>
                        </div>

                        {lastSaved && (
                            <div className="pt-4 border-t border-indigo-100 animate-in fade-in">
                                <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg text-sm mb-3">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span>Salvo em: {lastSaved.toLocaleTimeString()}</span>
                                </div>
                                <Button variant="outline" className="w-full border-dashed border-gray-400 hover:border-gray-900" onClick={handleDownloadReceipt}>
                                    <FileCheck className="mr-2 h-4 w-4" /> Baixar Comprovativo
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

        </div>
      )}

      {/* --- ABA INQUÉRITOS (Survey) --- */}
      {activeTab === 'surveys' && (
          <div className="max-w-2xl mx-auto print:hidden">
              {!availableSurvey ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                      <FileQuestion className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500">Nenhum inquérito institucional disponível para resposta no momento.</p>
                  </div>
              ) : surveySuccess ? (
                <Card className="bg-green-50 border-green-200 animate-in zoom-in duration-300">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-green-800">
                        <CheckCircle2 className="h-16 w-16 mb-4" />
                        <h2 className="text-xl font-bold">Obrigado!</h2>
                        <p>Sua resposta foi registrada com sucesso.</p>
                    </CardContent>
                </Card>
              ) : (
                  <Card>
                      <CardHeader>
                          <CardTitle>{availableSurvey.questionnaire.title}</CardTitle>
                          <div className="mt-2 inline-flex items-center gap-2 text-xs text-blue-800 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                                <Lock className="h-3 w-3" /> Anónimo e Confidencial
                          </div>
                      </CardHeader>
                      <CardContent className="space-y-6">

                           {availableSurvey.questionnaire.questions.map((q, idx) => (
                               <div key={q.id} className="space-y-2">
                                   <Label className="text-base">{idx + 1}. {q.text}</Label>
                                   <div className="pt-2">{renderQuestionInput(q)}</div>
                               </div>
                           ))}

                           <Button className="w-full mt-4" onClick={handleSubmitSurvey} disabled={surveySubmitting}>
                               {surveySubmitting ? 'Enviando...' : 'Submeter Respostas'}
                           </Button>
                      </CardContent>
                  </Card>
              )}
          </div>
      )}
    </div>
  );
};

function UsersIcon(props: any) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
}
