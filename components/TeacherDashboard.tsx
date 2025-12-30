
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

  // Generate breakdown for charts and table
  const getDetailedBreakdown = () => {
      const items = [
          { name: 'Disciplinas Graduação', qty: answers.gradSubjects || 0, pts: 15, subtotal: (answers.gradSubjects || 0) * 15 },
          { name: 'Disciplinas Pós-Grad.', qty: answers.postGradSubjects || 0, pts: 5, subtotal: (answers.postGradSubjects || 0) * 5 },
          { name: 'Horas Teóricas', qty: answers.theoryHours || 0, pts: 16, subtotal: (answers.theoryHours || 0) * 16 },
          { name: 'Horas Práticas', qty: answers.practicalHours || 0, pts: 14, subtotal: (answers.practicalHours || 0) * 14 },
          { name: 'Horas Consultas', qty: answers.consultationHours || 0, pts: 5, subtotal: (answers.consultationHours || 0) * 5 },
      ];

      if (header.category === 'assistente') {
          items.push({ name: 'Supervisão Graduação', qty: answers.gradSupervision || 0, pts: 6, subtotal: (answers.gradSupervision || 0) * 6 });
          items.push({ name: 'Supervisão Pós-Grad.', qty: answers.postGradSupervision || 0, pts: 6, subtotal: (answers.postGradSupervision || 0) * 6 });
          items.push({ name: 'Regência', qty: answers.regencySubjects || 0, pts: 8, subtotal: (answers.regencySubjects || 0) * 8 });
      } else {
           items.push({ name: 'Supervisão/Regência', qty: 0, pts: 0, subtotal: 0 }); // Placeholder for formatting
      }
      return items;
  };

  const getScoreBreakdown = () => {
      // Simplified for charts
      return getDetailedBreakdown().map(i => ({ name: i.name, value: i.subtotal })).filter(d => d.value > 0);
  };

  const handleSaveSelfEval = async (e: React.FormEvent) => {
      e.preventDefault();
      if (lastSaved) return; // Prevent editing if already saved

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
          answers: cleanAnswers,
          comments: selfComments
      });
      setSaving(false);
      setLastSaved(new Date());
      alert("Auto-avaliação submetida com sucesso! O formulário foi fechado para edição.");
      loadData();
  };

  const handleDownloadPDF = () => {
      window.print();
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

  const isFormLocked = !!lastSaved;

  // --- HELPERS PARA O RELATÓRIO OFICIAL ---
  const getRatingLabel = (score: number) => {
      if (!score) return '-';
      if (score < 50) return 'Mau';
      if (score < 70) return 'Suficiente';
      if (score < 85) return 'Bom';
      return 'Muito Bom'; // ou Excelente
  };

  const formatScore = (val: number | undefined) => {
      if (val === undefined) return '0.0';
      return val.toFixed(1);
  }

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      
      {/* --- RELATÓRIO PDF CORPORATIVO MINIMALISTA --- */}
      <div className="hidden print:block bg-white text-gray-900 max-w-[210mm] mx-auto p-12 h-screen">
          
          {/* HEADER: Minimalist & Clean */}
          <div className="flex justify-between items-start mb-12 border-b border-gray-900 pb-6">
               <div className="flex flex-col justify-between h-full">
                   {institution?.logo && <img src={institution.logo} className="h-16 w-auto object-contain mb-4" alt="Logo" />}
                   <div>
                       <h1 className="text-2xl font-bold uppercase tracking-tight text-gray-900 leading-none">{institution?.name || "Universidade"}</h1>
                       <p className="text-sm text-gray-500 mt-1 uppercase tracking-widest font-medium">Relatório de Desempenho Docente</p>
                   </div>
               </div>
               <div className="text-right">
                   <div className="mb-4">
                       <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Ano Lectivo</p>
                       <p className="text-lg font-medium">{header.academicYear}</p>
                   </div>
                   <div>
                       <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Data de Emissão</p>
                       <p className="text-sm font-medium">{new Date().toLocaleDateString()}</p>
                   </div>
               </div>
          </div>

          {/* TEACHER PROFILE: Grid Layout, No Boxes */}
          <div className="grid grid-cols-2 gap-x-16 gap-y-6 mb-12">
              <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Docente</p>
                  <p className="text-lg font-semibold border-b border-gray-200 pb-1">{user.name}</p>
              </div>
              <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Categoria</p>
                  <p className="text-lg font-medium capitalize border-b border-gray-200 pb-1">{header.category.replace('_', ' ')}</p>
              </div>
              <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Regime Laboral</p>
                  <p className="text-base font-medium border-b border-gray-200 pb-1">{header.contractRegime}</p>
              </div>
              <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Unidade Orgânica</p>
                  <p className="text-base font-medium border-b border-gray-200 pb-1">Divisão Pedagógica</p>
              </div>
          </div>

          {/* EXECUTIVE SUMMARY: Big Numbers, Clean Look */}
          <div className="bg-gray-50 rounded-lg p-8 mb-12 flex justify-between items-center border border-gray-100">
              <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-1">Pontuação Final</p>
                  <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold text-gray-900 tracking-tighter">{formatScore(stats?.finalScore)}</span>
                      <span className="text-sm text-gray-400 font-medium">/ 100 pts</span>
                  </div>
              </div>
              <div className="h-12 w-px bg-gray-300 mx-8"></div>
              <div className="text-right">
                  <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-1">Classificação Qualitativa</p>
                  <span className="text-2xl font-medium text-gray-900">{getRatingLabel(stats?.finalScore || 0)}</span>
              </div>
          </div>

          {/* METRICS TABLE: Minimalist, Horizontal Lines Only */}
          <div className="mb-12">
              <h3 className="text-xs uppercase tracking-widest text-gray-900 font-bold mb-6">Detalhamento da Avaliação</h3>
              <table className="w-full text-left border-collapse">
                  <thead>
                      <tr>
                          <th className="py-3 border-b-2 border-gray-900 text-xs font-bold uppercase tracking-wider text-gray-500 w-1/2">Indicador</th>
                          <th className="py-3 border-b-2 border-gray-900 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Peso</th>
                          <th className="py-3 border-b-2 border-gray-900 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Pontuação Obtida</th>
                      </tr>
                  </thead>
                  <tbody>
                      <tr>
                          <td className="py-4 border-b border-gray-100 font-medium text-gray-900">Auto-Avaliação do Docente</td>
                          <td className="py-4 border-b border-gray-100 text-right text-gray-500 text-sm">80%</td>
                          <td className="py-4 border-b border-gray-100 text-right font-mono font-medium text-gray-900">{formatScore(stats?.selfEvalScore)}</td>
                      </tr>
                      <tr>
                          <td className="py-4 border-b border-gray-100 font-medium text-gray-900">Avaliação pelos Estudantes</td>
                          <td className="py-4 border-b border-gray-100 text-right text-gray-500 text-sm">12%</td>
                          <td className="py-4 border-b border-gray-100 text-right font-mono font-medium text-gray-900">{formatScore(stats?.studentScore)}</td>
                      </tr>
                      <tr>
                          <td className="py-4 border-b border-gray-100 font-medium text-gray-900">Avaliação Institucional (Gestor)</td>
                          <td className="py-4 border-b border-gray-100 text-right text-gray-500 text-sm">8%</td>
                          <td className="py-4 border-b border-gray-100 text-right font-mono font-medium text-gray-900">{formatScore(stats?.institutionalScore)}</td>
                      </tr>
                      <tr className="bg-gray-50">
                          <td className="py-4 pl-4 font-bold text-gray-900">TOTAL GERAL</td>
                          <td className="py-4 text-right text-gray-500 text-sm">100%</td>
                          <td className="py-4 pr-4 text-right font-mono font-bold text-xl text-gray-900">{formatScore(stats?.finalScore)}</td>
                      </tr>
                  </tbody>
              </table>
          </div>

          {/* SIGNATURES: Clean Lines */}
          <div className="mt-auto pt-20">
              <div className="grid grid-cols-2 gap-24">
                  <div>
                      <div className="border-t border-gray-300 pt-4">
                          <p className="text-sm font-bold text-gray-900 uppercase">O Docente</p>
                          <p className="text-xs text-gray-500 mt-1">{user.name}</p>
                      </div>
                  </div>
                  <div>
                      <div className="border-t border-gray-300 pt-4">
                          <p className="text-sm font-bold text-gray-900 uppercase">O Director Pedagógico</p>
                          <p className="text-xs text-gray-500 mt-1">Homologação Institucional</p>
                      </div>
                  </div>
              </div>
          </div>
          
          {/* FOOTER */}
          <div className="fixed bottom-8 left-0 w-full text-center">
               <p className="text-[10px] text-gray-400 uppercase tracking-widest">Documento processado eletronicamente por AvaliaDocente MZ</p>
          </div>

      </div>
      {/* --- FIM DO RELATÓRIO PDF --- */}

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

      {/* --- ABA ESTATÍSTICAS / RELATÓRIOS --- */}
      {activeTab === 'stats' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 print:hidden">
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
                                    Ver Detalhes
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
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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

                <div className="grid gap-6 md:grid-cols-3">
                    <Card className="md:col-span-2">
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

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                Avaliação Qualitativa
                                <span className="ml-auto inline-flex items-center gap-1 text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-500">
                                    <Lock className="h-3 w-3" /> Gestor
                                </span>
                            </CardTitle>
                            <p className="text-xs text-gray-500">Atribuída pelo Gestor Institucional</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {qualEval ? (
                                <>
                                <div className="bg-gray-50 p-3 rounded border">
                                    <div className="text-xs font-semibold text-gray-500 uppercase">Cumprimento de Prazos</div>
                                    <div className="text-xl font-bold text-gray-800">{qualEval.deadlineCompliance || 0} <span className="text-sm font-normal text-gray-400">/ 10</span></div>
                                </div>
                                <div className="bg-gray-50 p-3 rounded border">
                                    <div className="text-xs font-semibold text-gray-500 uppercase">Qualidade do Trabalho</div>
                                    <div className="text-xl font-bold text-gray-800">{qualEval.workQuality || 0} <span className="text-sm font-normal text-gray-400">/ 10</span></div>
                                </div>
                                </>
                            ) : (
                                <p className="text-sm text-gray-400 italic">Ainda não avaliado pelo gestor.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
                </>
            )}

            <div className="flex justify-end gap-4 print:hidden pt-4 border-t">
                <Button className="w-full sm:w-auto" size="lg" onClick={handleDownloadPDF}>
                    <Download className="mr-2 h-4 w-4" /> Baixar Relatório (PDF)
                </Button>
            </div>
        </div>
      )}

      {/* --- ABA AUTO-AVALIAÇÃO --- */}
      {activeTab === 'self-eval' && (
        <div className="grid gap-6 lg:grid-cols-12 animate-in slide-in-from-right-4 fade-in duration-300 print:hidden">
            
            {/* Left Column: Form */}
            <div className="lg:col-span-8">
                {isFormLocked && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4 flex items-start gap-3">
                        <Lock className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-yellow-800 text-sm">Formulário Bloqueado</h4>
                            <p className="text-sm text-yellow-700">
                                Você já submeteu sua auto-avaliação. Para fazer alterações, entre em contato com o Gestor Institucional.
                            </p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSaveSelfEval} className="space-y-6">
                    {/* Header Section */}
                    <Card className="border-blue-100 bg-blue-50/50">
                        <CardHeader>
                            <CardTitle className="text-blue-900">1. Dados do Docente (Cabeçalho)</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Categoria</Label>
                                <Select disabled={isFormLocked} value={header.category} onChange={e => setHeader({...header, category: e.target.value as TeacherCategory})}>
                                    <option value="assistente">Assistente (Pleno)</option>
                                    <option value="assistente_estagiario">Assistente Estagiário</option>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Função</Label>
                                <Input disabled={isFormLocked} value={header.function} onChange={e => setHeader({...header, function: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Regime</Label>
                                <Input disabled={isFormLocked} value={header.contractRegime} onChange={e => setHeader({...header, contractRegime: e.target.value})} placeholder="Tempo Inteiro / Parcial" />
                            </div>
                            <div className="space-y-2">
                                <Label>Período</Label>
                                <Input disabled={isFormLocked} value={header.workPeriod} onChange={e => setHeader({...header, workPeriod: e.target.value})} placeholder="Laboral / PL" />
                            </div>
                            <div className="space-y-2">
                                <Label>Ano Lectivo</Label>
                                <Input disabled={isFormLocked} value={header.academicYear} onChange={e => setHeader({...header, academicYear: e.target.value})} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Questions Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>2. Indicadores Quantitativos</CardTitle>
                            <p className="text-sm text-gray-500">Preencha as quantidades. O sistema calculará os pontos automaticamente.</p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            
                            {/* Common Questions */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-gray-900 border-b pb-2">Disciplinas Leccionadas</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Disciplinas de Graduação (15 pts cada)</Label>
                                        <Input disabled={isFormLocked} type="number" min="0" value={answers.gradSubjects} onChange={e => setAnswers({...answers, gradSubjects: parseInt(e.target.value)||0})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Disciplinas de Pós-Graduação (5 pts cada)</Label>
                                        <Input disabled={isFormLocked} type="number" min="0" value={answers.postGradSubjects} onChange={e => setAnswers({...answers, postGradSubjects: parseInt(e.target.value)||0})} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold text-gray-900 border-b pb-2">Carga Horária Semanal</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <Label>Aulas Teóricas (16 pts)</Label>
                                        <Input disabled={isFormLocked} type="number" min="0" value={answers.theoryHours} onChange={e => setAnswers({...answers, theoryHours: parseInt(e.target.value)||0})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Aulas Práticas (14 pts)</Label>
                                        <Input disabled={isFormLocked} type="number" min="0" value={answers.practicalHours} onChange={e => setAnswers({...answers, practicalHours: parseInt(e.target.value)||0})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Consultas/Atendimento (5 pts)</Label>
                                        <Input disabled={isFormLocked} type="number" min="0" value={answers.consultationHours} onChange={e => setAnswers({...answers, consultationHours: parseInt(e.target.value)||0})} />
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
                                            <Input disabled={isFormLocked} type="number" min="0" value={answers.gradSupervision} onChange={e => setAnswers({...answers, gradSupervision: parseInt(e.target.value)||0})} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Teses Pós-Graduação (6 pts cada)</Label>
                                            <Input disabled={isFormLocked} type="number" min="0" value={answers.postGradSupervision} onChange={e => setAnswers({...answers, postGradSupervision: parseInt(e.target.value)||0})} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Disciplinas em Regência (8 pts cada)</Label>
                                            <Input disabled={isFormLocked} type="number" min="0" value={answers.regencySubjects} onChange={e => setAnswers({...answers, regencySubjects: parseInt(e.target.value)||0})} />
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

                    {/* Qualitative Self Reflection */}
                    <Card>
                        <CardHeader>
                            <CardTitle>3. Auto-Reflexão do Docente</CardTitle>
                            <p className="text-sm text-gray-500">Espaço para considerações, constrangimentos ou conquistas do semestre. (Não confundir com a avaliação do gestor).</p>
                        </CardHeader>
                        <CardContent>
                            <textarea 
                                disabled={isFormLocked}
                                className="w-full min-h-[120px] p-3 rounded-md border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                                placeholder="Descreva aqui sua análise qualitativa..."
                                value={selfComments}
                                onChange={(e) => setSelfComments(e.target.value)}
                            />
                        </CardContent>
                    </Card>
                    
                    <div className="flex flex-col gap-4">
                        <Button 
                            type="submit" 
                            size="lg" 
                            className={`w-full h-12 text-lg shadow-md ${isFormLocked ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`} 
                            disabled={saving || isFormLocked}
                        >
                            {isFormLocked ? (
                                <><Lock className="mr-2 h-5 w-5" /> Submetido e Bloqueado</>
                            ) : (
                                saving ? 'Salvando...' : <><Save className="mr-2 h-5 w-5" /> Salvar Auto-Avaliação Completa</>
                            )}
                        </Button>
                        {!isFormLocked && (
                            <p className="text-center text-xs text-gray-500">
                                Atenção: Após salvar, o formulário será bloqueado para edição.
                            </p>
                        )}
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
                            <p className="text-sm font-medium text-gray-500 mb-1">Pontuação Quantitativa</p>
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
