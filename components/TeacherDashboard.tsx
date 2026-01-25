
import React, { useState, useEffect } from 'react';
import { User, CombinedScore, SelfEvaluation, TeacherCategory, Questionnaire, UserRole, Question, QualitativeEval, Institution } from '../types';
import { BackendService } from '../services/backend';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Select } from './ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Download, TrendingUp, FileText, BarChart3, Save, FileQuestion, Star, CheckCircle2, Lock, Printer, AlertCircle, Info, Calculator, FileCheck, ClipboardList, Shield } from 'lucide-react';

interface Props {
  user: User;
}

export const TeacherDashboard: React.FC<Props> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'self-eval' | 'surveys'>('stats');
  const [stats, setStats] = useState<CombinedScore | undefined>(undefined);
  const [qualEval, setQualEval] = useState<QualitativeEval | undefined>(undefined);
  const [institution, setInstitution] = useState<Institution | null>(null);
  
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

  const [selfComments, setSelfComments] = useState('');

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

    if (user.institutionId) {
        const inst = await BackendService.getInstitution(user.institutionId);
        if (inst) setInstitution(inst);
    }

    // Load Manager's Qualitative Eval
    const qEval = await BackendService.getQualitativeEval(user.id);
    setQualEval(qEval);
    
    const savedEval = await BackendService.getSelfEval(user.id);
    if (savedEval) {
        setHeader(savedEval.header);
        setAnswers(savedEval.answers);
        setSelfComments(savedEval.comments || '');
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
    const a = answers;
    let score = 0;
    
    // As pontuações são calculadas com base em multiplicadores implícitos que resultam no máximo especificado
    score += Math.min((a.gradSubjects || 0) * 15, 15); // Ex: 1 disciplina = 15 pontos
    score += Math.min((a.postGradSubjects || 0) * 5, 5); // Ex: 1 disciplina = 5 pontos

    if (header.category === 'assistente') {
      score += Math.min((a.gradSupervision || 0) * 6, 6); // Ex: 1 dissertação = 6 pontos
      score += Math.min((a.postGradSupervision || 0) * 6, 6); // Ex: 1 tese = 6 pontos
      score += Math.min((a.regencySubjects || 0) * 8, 8); // Ex: 1 regência = 8 pontos
    }
    
    score += Math.min((a.theoryHours || 0) * 1, 16); // 1 ponto por hora
    score += Math.min((a.practicalHours || 0) * 1, 14); // 1 ponto por hora
    score += Math.min((a.consultationHours || 0) * 1, 5); // 1 ponto por hora

    return score;
  };

  const getDetailedBreakdown = () => {
      const a = answers;
      const items = [
          { name: '1.1 Graduação', qty: a.gradSubjects || 0, subtotal: Math.min((a.gradSubjects || 0) * 15, 15) },
          { name: '1.2 Pós-Grad.', qty: a.postGradSubjects || 0, subtotal: Math.min((a.postGradSubjects || 0) * 5, 5) },
          { name: '3.1 Teóricas', qty: a.theoryHours || 0, subtotal: Math.min((a.theoryHours || 0), 16) },
          { name: '3.2 Práticas', qty: a.practicalHours || 0, subtotal: Math.min((a.practicalHours || 0), 14) },
          { name: '3.3 Consultas', qty: a.consultationHours || 0, subtotal: Math.min((a.consultationHours || 0), 5) },
      ];

      if (header.category === 'assistente') {
          items.push({ name: '2.1 Sup. Graduação', qty: a.gradSupervision || 0, subtotal: Math.min((a.gradSupervision || 0) * 6, 6) });
          items.push({ name: '2.2 Sup. Pós-Grad.', qty: a.postGradSupervision || 0, subtotal: Math.min((a.postGradSupervision || 0) * 6, 6) });
          items.push({ name: '2.3 Regência', qty: a.regencySubjects || 0, subtotal: Math.min((a.regencySubjects || 0) * 8, 8) });
      }
      return items.filter(i => i.subtotal > 0);
  };

  const handleSaveSelfEval = async (e: React.FormEvent) => {
      e.preventDefault();
      if (lastSaved) return;

      setSaving(true);
      
      const cleanAnswers = { ...answers };
      if (header.category === 'assistente_estagiario') {
          cleanAnswers.gradSupervision = 0;
          cleanAnswers.postGradSupervision = 0;
          cleanAnswers.regencySubjects = 0;
      }

      await BackendService.saveSelfEval({
          teacherId: user.id,
          header,
          answers: cleanAnswers,
          comments: selfComments
      });
      setSaving(false);
      setLastSaved(new Date());
      alert("Auto-avaliação submetida com sucesso! O formulário foi fechado para edição.");
      loadData();
  };

  const handleDownloadPDF = () => { window.print(); };

  const handleSubmitSurvey = async () => {
    if (!availableSurvey) return;
    setSurveySubmitting(true);
    try {
        await BackendService.submitAnonymousResponse(user.id, {
            questionnaireId: availableSurvey.questionnaire.id,
            subjectId: 'general',
            teacherId: user.id,
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

  const renderQuestionInput = (q: Question) => {
      const val = surveyAnswers[q.id];
      const setAns = (v: any) => setSurveyAnswers(prev => ({ ...prev, [q.id]: v }));
      switch (q.type) {
          case 'stars': return <div className="flex gap-2">{[1, 2, 3, 4, 5].map((star) => (<button key={star} onClick={() => setAns(star)} className="focus:outline-none"><Star className={`h-8 w-8 ${(val as number) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} /></button>))}</div>;
          case 'binary': return <div className="flex gap-4"><button onClick={() => setAns(0)} className={`flex-1 py-2 px-4 rounded-md border ${val === 0 ? 'bg-red-100 border-red-300' : 'bg-white'}`}>Não</button><button onClick={() => setAns(1)} className={`flex-1 py-2 px-4 rounded-md border ${val === 1 ? 'bg-green-100 border-green-300' : 'bg-white'}`}>Sim</button></div>;
          case 'text': return <textarea className="w-full p-2 border rounded" value={val as string || ''} onChange={(e) => setAns(e.target.value)} />;
          default: return <Input value={val as string || ''} onChange={(e) => setAns(e.target.value)} />;
      }
  };

  const isFormLocked = !!lastSaved;
  const isIntern = header.category === 'assistente_estagiario';
  
  const scoreChartData = stats ? [
      { name: 'Avaliação dos Alunos', value: stats.studentScore, fill: '#3b82f6' },
      { name: 'Auto-Avaliação', value: stats.selfEvalScore, fill: '#8b5cf6' },
      { name: 'Avaliação Institucional', value: stats.institutionalScore, fill: '#16a34a' },
  ] : [];

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="hidden print:block">{/* PDF CONTENT */}</div>

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
      
      {activeTab === 'stats' && (
          <div className="space-y-6 animate-in fade-in">
              <Card>
                  <CardHeader className="flex flex-row justify-between items-center">
                      <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" /> Relatório de Desempenho
                      </CardTitle>
                      <Button variant="outline" onClick={handleDownloadPDF}><Printer className="mr-2 h-4 w-4" /> Imprimir Relatório</Button>
                  </CardHeader>
                  <CardContent className="space-y-6">
                      {!stats ? (
                          <div className="text-center py-12 text-gray-500"><AlertCircle className="mx-auto h-8 w-8 mb-2"/>Aguardando cálculo de notas pelo gestor.</div>
                      ) : (
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              <div className="lg:col-span-1 space-y-4">
                                  <Card className="bg-slate-800 text-white text-center">
                                      <CardContent className="pt-6">
                                          <p className="text-sm text-slate-300">Classificação Final</p>
                                          <p className="text-6xl font-extrabold tracking-tighter">{stats.finalScore.toFixed(2)}</p>
                                          <p className="text-xs text-slate-400">Calculado em: {new Date(stats.lastCalculated).toLocaleDateString()}</p>
                                      </CardContent>
                                  </Card>
                                  <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Avaliação (Alunos)</p><p className="text-2xl font-bold">{stats.studentScore.toFixed(2)}</p></CardContent></Card>
                                  <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Auto-Avaliação</p><p className="text-2xl font-bold">{stats.selfEvalScore.toFixed(2)}</p></CardContent></Card>
                                  <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Avaliação (Institucional)</p><p className="text-2xl font-bold">{stats.institutionalScore.toFixed(2)}</p></CardContent></Card>
                              </div>
                              <div className="lg:col-span-2">
                                  <Card className="h-full">
                                      <CardHeader><CardTitle className="text-base">Composição da Nota</CardTitle></CardHeader>
                                      <CardContent>
                                          <div className="h-[250px] w-full">
                                              <ResponsiveContainer width="100%" height="100%">
                                                  <PieChart>
                                                      <Pie data={scoreChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                                          {scoreChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                                      </Pie>
                                                      <Tooltip />
                                                      <Legend />
                                                  </PieChart>
                                              </ResponsiveContainer>
                                          </div>
                                          {qualEval?.comments && (
                                              <div className="mt-6 border-t pt-4">
                                                  <h4 className="font-semibold">Comentários do Gestor</h4>
                                                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md mt-2 italic">"{qualEval.comments}"</p>
                                              </div>
                                          )}
                                      </CardContent>
                                  </Card>
                              </div>
                          </div>
                      )}
                  </CardContent>
              </Card>
          </div>
      )}

      {activeTab === 'self-eval' && (
        <div className="grid gap-6 lg:grid-cols-12 animate-in slide-in-from-right-4 fade-in duration-300 print:hidden">
            <div className="lg:col-span-8">
                {isFormLocked && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4 flex items-start gap-3"><Lock className="h-5 w-5 text-yellow-600 mt-0.5" /><div><h4 className="font-bold text-yellow-800 text-sm">Formulário Bloqueado</h4><p className="text-sm text-yellow-700">Você já submeteu sua auto-avaliação. Para fazer alterações, entre em contato com o Gestor Institucional.</p></div></div>
                )}

                <form onSubmit={handleSaveSelfEval} className="space-y-6">
                    <Card><CardHeader><CardTitle>Dados do Docente</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><Label>Categoria</Label><Select disabled={isFormLocked} value={header.category} onChange={e => setHeader({...header, category: e.target.value as TeacherCategory})}><option value="assistente">Assistente (Pleno)</option><option value="assistente_estagiario">Assistente Estagiário</option></Select></div><div className="space-y-2"><Label>Função</Label><Input disabled={isFormLocked} value={header.function} onChange={e => setHeader({...header, function: e.target.value})} /></div></CardContent></Card>
                    
                    <Card>
                        <CardHeader><CardTitle>Ficha de Indicadores de Actividade (Auto-Avaliação)</CardTitle></CardHeader>
                        <CardContent className="space-y-6 pt-4">
                            
                            {/* Grupo 1 */}
                            <div className="space-y-4 border-t pt-4">
                                <h3 className="font-semibold flex justify-between items-center">
                                    <span>1. N° de disciplina que lecionou por anos <span className="font-normal text-gray-500">(Máx 20 pts)</span></span>
                                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-medium">A / AE</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pl-4 border-l-2 border-gray-100">
                                    <div className="space-y-2">
                                        <Label>1.1 De graduação (Máx 15 pts)</Label>
                                        <Input disabled={isFormLocked} type="number" min="0" value={answers.gradSubjects} onChange={e => setAnswers({...answers, gradSubjects: parseInt(e.target.value)||0})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>1.2 De pós-graduação (Máx 5 pts)</Label>
                                        <Input disabled={isFormLocked} type="number" min="0" value={answers.postGradSubjects} onChange={e => setAnswers({...answers, postGradSubjects: parseInt(e.target.value)||0})} />
                                    </div>
                                </div>
                            </div>

                            {/* Grupo 2 */}
                            <div className="space-y-4 border-t pt-4">
                                <h3 className="font-semibold flex justify-between items-center">
                                    <span>2. Supervisão e coordenação académica por ano <span className="font-normal text-gray-500">(Máx 20 pts)</span></span>
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">A</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 pl-4 border-l-2 border-blue-100">
                                    <div className="space-y-2">
                                        <Label>2.1 N° de dissertações de graduação (Máx 6 pts)</Label>
                                        <Input disabled={isFormLocked || isIntern} type="number" min="0" value={answers.gradSupervision} onChange={e => setAnswers({...answers, gradSupervision: parseInt(e.target.value)||0})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>2.2 N° de teses de pós-graduação (Máx 6 pts)</Label>
                                        <Input disabled={isFormLocked || isIntern} type="number" min="0" value={answers.postGradSupervision} onChange={e => setAnswers({...answers, postGradSupervision: parseInt(e.target.value)||0})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>2.3 N° de disciplinas de regência (Máx 8 pts)</Label>
                                        <Input disabled={isFormLocked || isIntern} type="number" min="0" value={answers.regencySubjects} onChange={e => setAnswers({...answers, regencySubjects: parseInt(e.target.value)||0})} />
                                    </div>
                                </div>
                                {isIntern && <p className="text-xs text-yellow-700 pl-4 mt-2">Campos desativados para a categoria de Assistente Estagiário.</p>}
                            </div>

                            {/* Grupo 3 */}
                            <div className="space-y-4 border-t pt-4">
                                <h3 className="font-semibold flex justify-between items-center">
                                    <span>3. N° de horas de docência por semana <span className="font-normal text-gray-500">(Máx 35 pts)</span></span>
                                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-medium">A / AE</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 pl-4 border-l-2 border-gray-100">
                                    <div className="space-y-2">
                                        <Label>3.1 Aulas teóricas (Máx 16 pts)</Label>
                                        <Input disabled={isFormLocked} type="number" min="0" value={answers.theoryHours} onChange={e => setAnswers({...answers, theoryHours: parseInt(e.target.value)||0})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>3.2 Aulas práticas (Máx 14 pts)</Label>
                                        <Input disabled={isFormLocked} type="number" min="0" value={answers.practicalHours} onChange={e => setAnswers({...answers, practicalHours: parseInt(e.target.value)||0})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>3.3 Consultas para estudantes (Máx 5 pts)</Label>
                                        <Input disabled={isFormLocked} type="number" min="0" value={answers.consultationHours} onChange={e => setAnswers({...answers, consultationHours: parseInt(e.target.value)||0})} />
                                    </div>
                                </div>
                            </div>

                        </CardContent>
                    </Card>

                    <Card><CardHeader><CardTitle>Auto-Reflexão do Docente</CardTitle><p className="text-sm text-gray-500">Espaço para considerações, constrangimentos ou conquistas do semestre.</p></CardHeader><CardContent><textarea disabled={isFormLocked} className="w-full min-h-[120px] p-3 rounded-md border" placeholder="Descreva aqui sua análise qualitativa..." value={selfComments} onChange={(e) => setSelfComments(e.target.value)}/></CardContent></Card>
                    
                    <div className="flex flex-col gap-4">
                        <Button type="submit" size="lg" className={`w-full h-12 text-lg shadow-md ${isFormLocked ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`} disabled={saving || isFormLocked}>
                            {isFormLocked ? <><Lock className="mr-2 h-5 w-5" /> Submetido e Bloqueado</> : (saving ? 'Salvando...' : <><Save className="mr-2 h-5 w-5" /> Salvar Auto-Avaliação Completa</>)}
                        </Button>
                        {!isFormLocked && (<p className="text-center text-xs text-gray-500">Atenção: Após salvar, o formulário será bloqueado para edição.</p>)}
                    </div>
                </form>
            </div>

            <div className="lg:col-span-4 space-y-6">
                <Card className="sticky top-6 border-indigo-200 shadow-md">
                    <CardHeader className="bg-gradient-to-br from-indigo-50 to-white"><CardTitle className="text-indigo-900 flex items-center gap-2"><Calculator className="h-5 w-5" /> Resumo em Tempo Real</CardTitle></CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="text-center"><p className="text-sm font-medium text-gray-500 mb-1">Pontuação Quantitativa</p><div className="text-5xl font-extrabold text-indigo-600 tracking-tight">{calculateLiveScore()}</div><p className="text-xs text-gray-400 mt-2">pontos acumulados</p></div>
                        <div className="h-[200px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={getDetailedBreakdown()} layout="vertical" margin={{top:0, left:0, right:30, bottom:0}}><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10}} /><Tooltip cursor={{fill: 'transparent'}} contentStyle={{fontSize: '12px'}} /><Bar dataKey="subtotal" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20}><Cell fill="#8b5cf6" /></Bar></BarChart></ResponsiveContainer></div>
                        {lastSaved && (<div className="pt-4 border-t"><div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg text-sm mb-3"><CheckCircle2 className="h-4 w-4" /><span>Salvo em: {lastSaved.toLocaleTimeString()}</span></div></div>)}
                    </CardContent>
                </Card>
            </div>
        </div>
      )}

      {activeTab === 'surveys' && (
          <div className="animate-in fade-in">
              <Card>
                  <CardHeader>
                      <CardTitle>Inquéritos Institucionais</CardTitle>
                      <p className="text-sm text-gray-500">Responda aos questionários sobre as condições e funcionamento da instituição.</p>
                  </CardHeader>
                  <CardContent>
                      {!availableSurvey ? (
                          <p className="text-center text-gray-500 py-8">Nenhum inquérito ativo no momento.</p>
                      ) : (
                          <div className="space-y-6">
                              <h3 className="text-lg font-semibold text-center">{availableSurvey.questionnaire.title}</h3>
                              {availableSurvey.questionnaire.questions.map((q, idx) => (
                                  <div key={q.id} className="border-t pt-4">
                                      <p className="font-medium mb-2">#{idx+1}. {q.text}</p>
                                      {renderQuestionInput(q)}
                                  </div>
                              ))}
                              <Button onClick={handleSubmitSurvey} disabled={surveySubmitting} className="w-full">
                                  {surveySubmitting ? 'Enviando...' : 'Enviar Respostas'}
                              </Button>
                              {surveySuccess && <p className="text-green-600 text-center">Inquérito enviado com sucesso!</p>}
                          </div>
                      )}
                  </CardContent>
              </Card>
          </div>
      )}
    </div>
  );
};
