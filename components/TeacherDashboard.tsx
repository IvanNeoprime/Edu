
import React, { useState, useEffect } from 'react';
import { User, CombinedScore, SelfEvaluation, TeacherCategory, Questionnaire, UserRole, Question, QualitativeEval, Institution } from '../types';
import { BackendService } from '../services/backend';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Select } from './ui';
import { Download, TrendingUp, FileText, BarChart3, Save, FileQuestion, Star, CheckCircle2, Lock, Printer, AlertCircle, Info, Calculator, FileCheck, ClipboardList, Shield, Table2 } from 'lucide-react';

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
      if (!user.institutionId) return;

      setSaving(true);
      
      const cleanAnswers = { ...answers };
      if (header.category === 'assistente_estagiario') {
          cleanAnswers.gradSupervision = 0;
          cleanAnswers.postGradSupervision = 0;
          cleanAnswers.regencySubjects = 0;
      }
      try {
        await BackendService.saveSelfEval({
            teacherId: user.id,
            institutionId: user.institutionId,
            header,
            answers: cleanAnswers,
            comments: selfComments
        });
        setSaving(false);
        setLastSaved(new Date());
        alert("Auto-avaliação submetida com sucesso! O formulário foi fechado para edição.");
        loadData();
      } catch (error: any) {
        alert("Erro ao salvar: " + error.message);
        setSaving(false);
      }
  };

  const handleDownloadPDF = () => { window.print(); };

  const handleSubmitSurvey = async () => {
    if (!availableSurvey || !user.institutionId) return;
    setSurveySubmitting(true);
    try {
        await BackendService.submitAnonymousResponse(user.id, {
            institutionId: user.institutionId,
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

  const isEvaluationOpen = institution?.isEvaluationOpen ?? true;
  const isFormLocked = !!lastSaved || !isEvaluationOpen;
  const isIntern = header.category === 'assistente_estagiario';
  
  return (
    <>
      {/* --- INÍCIO DO CONTEÚDO PARA IMPRESSÃO --- */}
      <div className="hidden print:block font-serif">
        <div className="p-4">
          <header className="flex justify-between items-center border-b pb-4 mb-6">
            <div className="flex items-center gap-4">
              {institution?.logo && <img src={institution.logo} className="h-16 w-16 object-contain" alt="Logo"/>}
              <div>
                <h1 className="text-2xl font-bold">{institution?.name}</h1>
                <p className="text-gray-600">Boletim de Desempenho Docente</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold">{user.name}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </header>
          
          {stats ? (
            <div className="space-y-8">
              <section className="border border-gray-300 rounded p-4">
                 <h2 className="text-sm font-bold uppercase mb-4 border-b pb-2">Resultados Consolidados</h2>
                 <table className="w-full text-sm border-collapse">
                    <tbody>
                        <tr className="border-b border-gray-200">
                            <td className="py-2 font-medium">Avaliação Pedagógica (Alunos)</td>
                            <td className="py-2 text-right font-bold">{stats.studentScore.toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-gray-200">
                            <td className="py-2 font-medium">Auto-Avaliação de Desempenho</td>
                            <td className="py-2 text-right font-bold">{stats.selfEvalScore.toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-gray-200">
                            <td className="py-2 font-medium">Avaliação Institucional (Gestão)</td>
                            <td className="py-2 text-right font-bold">{stats.institutionalScore.toFixed(2)}</td>
                        </tr>
                        <tr className="bg-gray-50">
                            <td className="py-3 font-bold uppercase">Nota Final do Semestre</td>
                            <td className="py-3 text-right font-black text-lg">{stats.finalScore.toFixed(2)}</td>
                        </tr>
                    </tbody>
                 </table>
              </section>
              
              {qualEval?.comments && (
                <section className="border border-gray-300 rounded p-4">
                  <h2 className="text-sm font-bold uppercase mb-2">Observações da Gestão</h2>
                  <p className="text-sm italic text-gray-700 leading-relaxed">{qualEval.comments}</p>
                </section>
              )}

            </div>
          ) : (
            <p className="text-center text-gray-600 py-10">Dados de avaliação ainda não disponíveis.</p>
          )}

          <footer className="mt-12 pt-4 border-t text-center text-xs text-gray-400">
            <p>Relatório gerado por AvaliaDocente MZ em {new Date().toLocaleString()}</p>
          </footer>
        </div>
      </div>
      {/* --- FIM DO CONTEÚDO PARA IMPRESSÃO --- */}

      <div className="print:hidden space-y-8 p-4 md:p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
        <header className="border-b pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
                    <CardHeader className="flex flex-row justify-between items-center border-b pb-4">
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-indigo-600" /> Relatório de Desempenho
                        </CardTitle>
                        <Button variant="outline" onClick={handleDownloadPDF}><Printer className="mr-2 h-4 w-4" /> Imprimir Boletim</Button>
                    </CardHeader>
                    <CardContent className="space-y-8 pt-6">
                        {!stats ? (
                            <div className="text-center py-12 text-gray-500"><AlertCircle className="mx-auto h-8 w-8 mb-2"/>Aguardando cálculo de notas pelo gestor.</div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Coluna 1: Cartões de KPI */}
                                <div className="lg:col-span-1 space-y-4">
                                    <Card className="bg-slate-900 text-white text-center shadow-xl border-none">
                                        <CardContent className="pt-8 pb-8">
                                            <p className="text-sm font-medium text-slate-300 uppercase tracking-widest mb-2">Classificação Final</p>
                                            <p className="text-6xl font-black tracking-tighter text-white drop-shadow-sm">{stats.finalScore.toFixed(1)}</p>
                                            <div className="mt-4 inline-block px-3 py-1 bg-white/10 rounded-full text-xs text-slate-200">
                                                {new Date(stats.lastCalculated).toLocaleDateString()}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Coluna 2 e 3: Tabela de Detalhes */}
                                <div className="lg:col-span-2">
                                    <Card className="border-none shadow-none bg-gray-50">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm uppercase tracking-wider text-gray-500 font-bold flex items-center gap-2"><Table2 size={16}/> Composição da Nota</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <table className="w-full text-left">
                                                <thead className="bg-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wider border-y border-gray-200">
                                                    <tr>
                                                        <th className="px-6 py-3">Componente</th>
                                                        <th className="px-6 py-3 text-center">Peso</th>
                                                        <th className="px-6 py-3 text-right">Pontuação</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 bg-white text-sm">
                                                    <tr>
                                                        <td className="px-6 py-4 font-medium text-gray-900">Avaliação Pedagógica (Alunos)</td>
                                                        <td className="px-6 py-4 text-center text-gray-500">~12%</td>
                                                        <td className="px-6 py-4 text-right font-bold text-blue-600">{stats.studentScore.toFixed(2)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="px-6 py-4 font-medium text-gray-900">Auto-Avaliação de Desempenho</td>
                                                        <td className="px-6 py-4 text-center text-gray-500">~80%</td>
                                                        <td className="px-6 py-4 text-right font-bold text-violet-600">{stats.selfEvalScore.toFixed(2)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="px-6 py-4 font-medium text-gray-900">Avaliação Institucional (Gestão)</td>
                                                        <td className="px-6 py-4 text-center text-gray-500">~8%</td>
                                                        <td className="px-6 py-4 text-right font-bold text-emerald-600">{stats.institutionalScore.toFixed(2)}</td>
                                                    </tr>
                                                    <tr className="bg-gray-50">
                                                        <td className="px-6 py-4 font-bold uppercase text-gray-900">Total</td>
                                                        <td className="px-6 py-4 text-center text-gray-500">100%</td>
                                                        <td className="px-6 py-4 text-right font-black text-gray-900 text-lg">{stats.finalScore.toFixed(2)}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </CardContent>
                                    </Card>
                                </div>
                                
                                {qualEval?.comments && (
                                    <div className="lg:col-span-3 mt-4">
                                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-6">
                                            <h4 className="font-bold text-amber-800 flex items-center gap-2 mb-2">
                                                <AlertCircle size={16} /> Feedback Qualitativo do Gestor
                                            </h4>
                                            <p className="text-sm text-amber-900 italic leading-relaxed">"{qualEval.comments}"</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        )}

        {activeTab === 'self-eval' && (
          <div className="grid gap-6 lg:grid-cols-12 animate-in slide-in-from-right-4 fade-in duration-300">
              <div className="lg:col-span-8">
                  {isFormLocked && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4 flex items-start gap-3"><Lock className="h-5 w-5 text-yellow-600 mt-0.5" /><div><h4 className="font-bold text-yellow-800 text-sm">Formulário Bloqueado</h4><p className="text-sm text-yellow-700">{!isEvaluationOpen ? `O período de avaliação ("${institution?.evaluationPeriodName || 'Atual'}") está fechado.` : 'Você já submeteu sua auto-avaliação. Para fazer alterações, entre em contato com o Gestor Institucional.'}</p></div></div>
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
                          {!isFormLocked && isEvaluationOpen && (<p className="text-center text-xs text-gray-500">Atenção: Após salvar, o formulário será bloqueado para edição.</p>)}
                      </div>
                  </form>
              </div>

              <div className="lg:col-span-4 space-y-6">
                  <Card className="sticky top-6 border-indigo-200 shadow-md">
                      <CardHeader className="bg-gradient-to-br from-indigo-50 to-white"><CardTitle className="text-indigo-900 flex items-center gap-2"><Calculator className="h-5 w-5" /> Resumo em Tempo Real</CardTitle></CardHeader>
                      <CardContent className="pt-6 space-y-6">
                          <div className="text-center"><p className="text-sm font-medium text-gray-500 mb-1">Pontuação Quantitativa</p><div className="text-5xl font-extrabold text-indigo-600 tracking-tight">{calculateLiveScore()}</div><p className="text-xs text-gray-400 mt-2">pontos acumulados</p></div>
                          <div className="bg-gray-50 rounded-lg p-2 border overflow-hidden">
                             <table className="w-full text-xs">
                                 <tbody>
                                     {getDetailedBreakdown().map((item, i) => (
                                         <tr key={i} className="border-b border-gray-100 last:border-0">
                                             <td className="py-2 pl-2 text-gray-600">{item.name}</td>
                                             <td className="py-2 pr-2 text-right font-bold text-indigo-600">{item.subtotal} pts</td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                          </div>
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
                        ) : !isEvaluationOpen ? (
                           <div className="text-center py-8 text-yellow-800">
                               <Lock className="mx-auto h-8 w-8 mb-2" />
                               <p>O período para submissão de inquéritos está fechado.</p>
                           </div>
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
    </>
  );
};
