
import React, { useState, useEffect } from 'react';
import { User, CombinedScore, SelfEvaluation, TeacherCategory, Questionnaire, UserRole, Question, QualitativeEval, Institution } from '../types';
import { BackendService } from '../services/backend';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Select } from './ui';
import { Download, TrendingUp, FileText, BarChart3, Save, FileQuestion, Star, CheckCircle2, Lock, Printer, AlertCircle, Info, Calculator, FileCheck, ClipboardList, Shield, Table2, User as UserIcon, BookOpen, GraduationCap, School, FlaskConical, Users, Briefcase } from 'lucide-react';

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
      // G1
      g1_gradSubjects: 0,
      g1_postGradSubjects: 0,
      // G2
      g2_gradSupervision: 0,
      g2_postGradSupervision: 0,
      g2_regencySubjects: 0,
      // G3
      g3_theoryHours: 0,
      g3_practicalHours: 0,
      g3_consultationHours: 0,
      // G4
      g4_gradStudents: 0,
      g4_postGradStudents: 0,
      g4_passRate: 0,
      // G5
      g5_manuals: 0,
      g5_supportTexts: 0,
      // G6
      g6_individualProjects: 0,
      g6_collectiveProjects: 0,
      g6_publishedArticles: 0,
      g6_eventsComms: 0,
      // G7
      g7_collaboration: 0,
      g7_institutionalTeams: 0,
      // G8
      g8_adminHours: 0
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
              g2_gradSupervision: 0,
              g2_postGradSupervision: 0,
              g2_regencySubjects: 0
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
  
  // --- LÓGICA DE CÁLCULO BASEADA NO PDF ---
  const calculateLiveScore = () => {
    const a = answers;
    let score = 0;
    
    // Grupo 1: Actividade Docente (Máx 20 pts)
    // 101: 15 pts | 102: Assumindo 5 pts para completar o grupo logicamente
    // Assumimos que o input é quantidade e multiplicamos por um peso base (ex: 5 por disciplina)
    // Mas o PDF diz "De graduação (15)". Se for apenas binário, seria 15. Se for qtd, 15 por item.
    // Vamos assumir que se > 0, ganha os pontos, limitado pelo teto do item.
    const g1 = Math.min(
        (a.g1_gradSubjects && a.g1_gradSubjects > 0 ? 15 : 0) + 
        (a.g1_postGradSubjects && a.g1_postGradSubjects > 0 ? 5 : 0), 
    20);
    score += g1;

    // Grupo 2: Supervisão (Máx 20 pts) - Apenas 'A'
    if (header.category === 'assistente') {
        const g2 = Math.min(
            ((a.g2_gradSupervision || 0) * 6) + // 6 pts por dissertação
            ((a.g2_postGradSupervision || 0) * 6) + // 6 pts por tese
            ((a.g2_regencySubjects || 0) * 8), // 8 pts por regência
        20);
        score += g2;
    }

    // Grupo 3: Carga Horária (Máx 35 pts)
    // Inputs são horas semanais.
    // PDF: Teóricas (16), Práticas (14), Consultas (5).
    // Assumindo que se a carga >= X horas, ganha os pontos. 
    // Simplificação: 1 pt por hora até o limite do item.
    const g3 = Math.min(
        Math.min((a.g3_theoryHours || 0), 16) + 
        Math.min((a.g3_practicalHours || 0), 14) + 
        Math.min((a.g3_consultationHours || 0), 5),
    35);
    score += g3;

    // Grupo 4: Rendimento Pedagógico (Máx 35 pts)
    // Grad (18), Pós (12), Aprovados (5)
    // Lógica: Pontos proporcionais ao nº alunos (ex: 0.1 pt/aluno) ou fixo se tiver alunos.
    // Vamos usar: Se tem alunos > 0, ganha uma base + bônus volume, limitado ao teto.
    // Simplificação: Se > 0 alunos, ganha os pontos máximos (assumindo que lecionou).
    // Percentagem aprovados: (aprovados / 100) * 5.
    const g4 = Math.min(
        (a.g4_gradStudents && a.g4_gradStudents > 0 ? 18 : 0) +
        (a.g4_postGradStudents && a.g4_postGradStudents > 0 ? 12 : 0) +
        (((a.g4_passRate || 0) / 100) * 5),
    35);
    score += g4;

    // Grupo 5: Material Didático (Máx 30 pts)
    // Manuais (15), Textos (10). Soma itens = 25. Teto grupo = 30.
    const g5 = Math.min(
        ((a.g5_manuals || 0) * 15) + 
        ((a.g5_supportTexts || 0) * 5), // 5 pts por texto de apoio (estimativa p/ chegar a 10 com 2 textos)
    30);
    score += g5;

    // Grupo 6: Investigação (Máx 35 pts)
    // Proj Indiv (4), Proj Col (4), Artigos (7), Eventos (3)
    const g6 = Math.min(
        ((a.g6_individualProjects || 0) * 4) +
        ((a.g6_collectiveProjects || 0) * 4) +
        ((a.g6_publishedArticles || 0) * 7) +
        ((a.g6_eventsComms || 0) * 3),
    35);
    score += g6;

    // Grupo 7: Extensão (Máx 40 pts)
    // Colab (5), Equipas (5). Teto 40 parece alto para os itens listados no OCR.
    // Vamos somar conforme itens.
    const g7 = Math.min(
        ((a.g7_collaboration || 0) * 5) +
        ((a.g7_institutionalTeams || 0) * 5),
    40);
    score += g7;

    // Grupo 8: Administração (Máx 45 pts)
    // Horas (10). O teto 45 sugere que horas valem muito ou há mais itens.
    // PDF: "Nº de horas... (10)". Talvez seja 10 pts por cargo?
    // Vamos usar input direto de horas * 1 até max 10, mas o grupo permite até 45.
    // Ajuste: Talvez (10) seja o peso por hora? Não, muito alto.
    // Vamos assumir: Horas dedicadas * 2, limitado a 45.
    const g8 = Math.min((a.g8_adminHours || 0) * 2, 45); 
    score += g8;

    // Teto Global conforme PDF
    const maxScore = header.category === 'assistente_estagiario' ? 125 : 175;
    
    return Math.min(score, maxScore);
  };

  const getDetailedBreakdown = () => {
      // Retorna itens para o resumo visual
      return [
          { name: 'G1. Docência', subtotal: Math.min((answers.g1_gradSubjects?15:0) + (answers.g1_postGradSubjects?5:0), 20) },
          { name: 'G2. Supervisão', subtotal: header.category === 'assistente' ? Math.min(((answers.g2_gradSupervision||0)*6) + ((answers.g2_postGradSupervision||0)*6) + ((answers.g2_regencySubjects||0)*8), 20) : 0 },
          { name: 'G3. Carga Horária', subtotal: Math.min(Math.min((answers.g3_theoryHours||0),16) + Math.min((answers.g3_practicalHours||0),14) + Math.min((answers.g3_consultationHours||0),5), 35) },
          { name: 'G4. Rendimento', subtotal: Math.min((answers.g4_gradStudents?18:0) + (answers.g4_postGradStudents?12:0) + (((answers.g4_passRate||0)/100)*5), 35) },
          { name: 'G5. Mat. Didático', subtotal: Math.min(((answers.g5_manuals||0)*15) + ((answers.g5_supportTexts||0)*5), 30) },
          { name: 'G6. Investigação', subtotal: Math.min(((answers.g6_individualProjects||0)*4) + ((answers.g6_collectiveProjects||0)*4) + ((answers.g6_publishedArticles||0)*7) + ((answers.g6_eventsComms||0)*3), 35) },
          { name: 'G7. Extensão', subtotal: Math.min(((answers.g7_collaboration||0)*5) + ((answers.g7_institutionalTeams||0)*5), 40) },
          { name: 'G8. Gestão', subtotal: Math.min((answers.g8_adminHours||0)*2, 45) }
      ].filter(i => i.subtotal > 0);
  };

  const handleSaveSelfEval = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user.institutionId) return;

      setSaving(true);
      
      const cleanAnswers = { ...answers };
      if (header.category === 'assistente_estagiario') {
          cleanAnswers.g2_gradSupervision = 0;
          cleanAnswers.g2_postGradSupervision = 0;
          cleanAnswers.g2_regencySubjects = 0;
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
  
  // Helper para componentes de status
  const StatCard = ({ title, value, max, color, icon: Icon }: any) => (
      <div className={`bg-white rounded-xl border p-5 shadow-sm relative overflow-hidden`}>
          <div className={`absolute top-0 right-0 p-4 opacity-10 text-${color}-600`}>
              <Icon size={48} />
          </div>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">{title}</p>
          <div className="flex items-end gap-2">
              <span className={`text-3xl font-bold text-${color}-600`}>{value?.toFixed(1) || '0.0'}</span>
              <span className="text-gray-400 text-sm mb-1">/ {max} pts</span>
          </div>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3">
              <div 
                className={`h-1.5 rounded-full bg-${color}-500 transition-all duration-1000`} 
                style={{ width: `${Math.min(((value || 0) / max) * 100, 100)}%` }}
              />
          </div>
      </div>
  );

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

      <div className="print:hidden bg-gray-50/50 min-h-screen">
        
        {/* Header Principal */}
        <div className="bg-white border-b sticky top-0 z-30">
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xl">
                            {user.name.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 leading-tight">Olá, {user.name.split(' ')[0]}</h1>
                            <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                                <School size={12} /> {institution?.name || 'Universidade'}
                            </p>
                        </div>
                    </div>
                    
                    <nav className="flex p-1 bg-gray-100 rounded-lg">
                        <button 
                            onClick={() => setActiveTab('stats')} 
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'stats' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <TrendingUp size={16}/> Resultados
                        </button>
                        <button 
                            onClick={() => setActiveTab('self-eval')} 
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'self-eval' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <UserIcon size={16}/> Auto-Avaliação
                        </button>
                        <button 
                            onClick={() => setActiveTab('surveys')} 
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'surveys' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <FileCheck size={16}/> Inquéritos
                        </button>
                    </nav>
                </div>
            </div>
        </div>

        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
        
        {activeTab === 'stats' && (
            <div className="space-y-6">
                {!stats ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-xl border border-dashed">
                        <AlertCircle className="h-10 w-10 mb-3 opacity-20"/>
                        <p>Os resultados finais ainda não foram calculados pela gestão.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Score Principal */}
                            <div className="md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-10">
                                    <AwardIcon size={150} />
                                </div>
                                <div className="relative z-10 flex flex-col justify-between h-full">
                                    <div>
                                        <p className="text-slate-300 text-sm font-medium uppercase tracking-widest mb-1">Classificação Final</p>
                                        <h2 className="text-5xl font-black tracking-tighter">{stats.finalScore.toFixed(1)} <span className="text-xl font-normal text-slate-400">/ {header.category === 'assistente_estagiario' ? '125' : '175'}</span></h2>
                                    </div>
                                    <div className="mt-6 flex gap-3">
                                        <Button onClick={handleDownloadPDF} size="sm" className="bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-sm">
                                            <Printer className="mr-2 h-4 w-4" /> Versão Impressa
                                        </Button>
                                        <div className="px-3 py-1.5 bg-green-500/20 text-green-300 rounded text-xs flex items-center gap-1 border border-green-500/30">
                                            <CheckCircle2 size={12}/> Processado em {new Date(stats.lastCalculated).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Componentes */}
                            <StatCard title="Avaliação Pedagógica (Alunos)" value={stats.studentScore} max={20} color="blue" icon={GraduationCap} />
                            <StatCard title="Auto-Avaliação" value={stats.selfEvalScore} max={header.category === 'assistente_estagiario' ? 125 : 175} color="indigo" icon={UserIcon} />
                            <StatCard title="Avaliação Institucional" value={stats.institutionalScore} max={10} color="emerald" icon={School} />
                        </div>

                        {/* Feedback Box */}
                        {qualEval?.comments && (
                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-6 relative">
                                <div className="absolute top-0 left-0 w-1 h-full bg-amber-400 rounded-l-xl"></div>
                                <h4 className="font-bold text-amber-900 flex items-center gap-2 mb-3">
                                    <ClipboardList size={18} className="text-amber-600" /> Feedback da Gestão
                                </h4>
                                <blockquote className="text-amber-900/80 italic text-sm leading-relaxed pl-4 border-l-2 border-amber-200">
                                    "{qualEval.comments}"
                                </blockquote>
                            </div>
                        )}
                    </>
                )}
            </div>
        )}

        {activeTab === 'self-eval' && (
          <div className="grid gap-6 lg:grid-cols-12 animate-in slide-in-from-right-4 fade-in duration-300 items-start">
              
              {/* Coluna Esquerda: Formulário */}
              <div className="lg:col-span-8 space-y-6">
                  {isFormLocked && (
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
                          <Lock className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                          <div>
                              <h4 className="font-bold text-blue-900 text-sm">Formulário em Modo Leitura</h4>
                              <p className="text-xs text-blue-700 mt-1">
                                  {!isEvaluationOpen ? `O período de avaliação ("${institution?.evaluationPeriodName || 'Atual'}") está fechado.` : 'Você já submeteu sua auto-avaliação. Para fazer alterações, contacte o Gestor.'}
                              </p>
                          </div>
                      </div>
                  )}

                  <form onSubmit={handleSaveSelfEval} className="space-y-6">
                      {/* Section: Dados Profissionais */}
                      <Card className="overflow-hidden border-t-4 border-t-slate-500">
                          <CardHeader className="bg-slate-50 border-b pb-3">
                              <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                                  <UserIcon size={16}/> Dados Profissionais
                              </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <Label>Categoria Docente</Label>
                                  <Select disabled={isFormLocked} value={header.category} onChange={e => setHeader({...header, category: e.target.value as TeacherCategory})}>
                                      <option value="assistente">Assistente (Pleno)</option>
                                      <option value="assistente_estagiario">Assistente Estagiário</option>
                                  </Select>
                              </div>
                              <div className="space-y-2">
                                  <Label>Função/Cargo</Label>
                                  <Input disabled={isFormLocked} value={header.function} onChange={e => setHeader({...header, function: e.target.value})} />
                              </div>
                          </CardContent>
                      </Card>
                      
                      {/* Grupo 1: Docência */}
                      <Card className="overflow-hidden border-t-4 border-t-indigo-500">
                          <CardHeader className="bg-indigo-50/50 border-b pb-3">
                              <div className="flex justify-between items-center">
                                  <CardTitle className="text-sm font-bold text-indigo-800 uppercase tracking-wide flex items-center gap-2">
                                      <BookOpen size={16}/> 1. Actividade Docente (A-AE)
                                  </CardTitle>
                                  <span className="text-xs font-mono bg-white border px-2 py-1 rounded text-gray-500">Máx 20 pts</span>
                              </div>
                          </CardHeader>
                          <CardContent className="pt-6 space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                      <Label className="text-gray-600">101. Disciplinas Graduação <span className="text-xs text-gray-400 font-normal ml-1">(15 pts máx)</span></Label>
                                      <Input disabled={isFormLocked} type="number" min="0" placeholder="Qtd" value={answers.g1_gradSubjects} onChange={e => setAnswers({...answers, g1_gradSubjects: parseInt(e.target.value)||0})} />
                                  </div>
                                  <div className="space-y-2">
                                      <Label className="text-gray-600">102. Disciplinas Pós-Grad. <span className="text-xs text-gray-400 font-normal ml-1">(5 pts máx)</span></Label>
                                      <Input disabled={isFormLocked} type="number" min="0" placeholder="Qtd" value={answers.g1_postGradSubjects} onChange={e => setAnswers({...answers, g1_postGradSubjects: parseInt(e.target.value)||0})} />
                                  </div>
                              </div>
                          </CardContent>
                      </Card>

                      {/* Grupo 2: Supervisão */}
                      <Card className={`overflow-hidden border-t-4 border-t-blue-500 transition-opacity ${isIntern ? 'opacity-60' : 'opacity-100'}`}>
                          <CardHeader className="bg-blue-50/50 border-b pb-3">
                              <div className="flex justify-between items-center">
                                  <CardTitle className="text-sm font-bold text-blue-800 uppercase tracking-wide flex items-center gap-2">
                                      <UserIcon size={16}/> 2. Supervisão (Apenas Assistente)
                                  </CardTitle>
                                  <span className="text-xs font-mono bg-white border px-2 py-1 rounded text-gray-500">Máx 20 pts</span>
                              </div>
                          </CardHeader>
                          <CardContent className="pt-6">
                              {isIntern && (
                                  <div className="mb-4 bg-yellow-50 text-yellow-800 text-xs p-2 rounded border border-yellow-100 flex items-center gap-2">
                                      <Info size={12} /> Seção não aplicável para Assistentes Estagiários.
                                  </div>
                              )}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="space-y-2">
                                      <Label className="text-xs text-gray-600">151. Dissert. Graduação</Label>
                                      <Input disabled={isFormLocked || isIntern} type="number" min="0" value={answers.g2_gradSupervision} onChange={e => setAnswers({...answers, g2_gradSupervision: parseInt(e.target.value)||0})} />
                                  </div>
                                  <div className="space-y-2">
                                      <Label className="text-xs text-gray-600">152. Teses Pós-Grad.</Label>
                                      <Input disabled={isFormLocked || isIntern} type="number" min="0" value={answers.g2_postGradSupervision} onChange={e => setAnswers({...answers, g2_postGradSupervision: parseInt(e.target.value)||0})} />
                                  </div>
                                  <div className="space-y-2">
                                      <Label className="text-xs text-gray-600">156. Regência</Label>
                                      <Input disabled={isFormLocked || isIntern} type="number" min="0" value={answers.g2_regencySubjects} onChange={e => setAnswers({...answers, g2_regencySubjects: parseInt(e.target.value)||0})} />
                                  </div>
                              </div>
                          </CardContent>
                      </Card>

                      {/* Grupo 3: Carga Horária */}
                      <Card className="overflow-hidden border-t-4 border-t-emerald-500">
                          <CardHeader className="bg-emerald-50/50 border-b pb-3">
                              <div className="flex justify-between items-center">
                                  <CardTitle className="text-sm font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                                      <TrendingUp size={16}/> 3. Carga Horária Semanal (A-AE)
                                  </CardTitle>
                                  <span className="text-xs font-mono bg-white border px-2 py-1 rounded text-gray-500">Máx 35 pts</span>
                              </div>
                          </CardHeader>
                          <CardContent className="pt-6">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="space-y-2">
                                      <Label className="text-xs text-gray-600">201. Aulas Teóricas (H)</Label>
                                      <Input disabled={isFormLocked} type="number" min="0" value={answers.g3_theoryHours} onChange={e => setAnswers({...answers, g3_theoryHours: parseInt(e.target.value)||0})} />
                                  </div>
                                  <div className="space-y-2">
                                      <Label className="text-xs text-gray-600">202. Aulas Práticas (H)</Label>
                                      <Input disabled={isFormLocked} type="number" min="0" value={answers.g3_practicalHours} onChange={e => setAnswers({...answers, g3_practicalHours: parseInt(e.target.value)||0})} />
                                  </div>
                                  <div className="space-y-2">
                                      <Label className="text-xs text-gray-600">203. Consultas (H)</Label>
                                      <Input disabled={isFormLocked} type="number" min="0" value={answers.g3_consultationHours} onChange={e => setAnswers({...answers, g3_consultationHours: parseInt(e.target.value)||0})} />
                                  </div>
                              </div>
                          </CardContent>
                      </Card>

                      {/* Grupo 4: Rendimento Pedagógico */}
                      <Card className="overflow-hidden border-t-4 border-t-cyan-500">
                          <CardHeader className="bg-cyan-50/50 border-b pb-3">
                              <div className="flex justify-between items-center">
                                  <CardTitle className="text-sm font-bold text-cyan-800 uppercase tracking-wide flex items-center gap-2">
                                      <GraduationCap size={16}/> 4. Rendimento Pedagógico (A-AE)
                                  </CardTitle>
                                  <span className="text-xs font-mono bg-white border px-2 py-1 rounded text-gray-500">Máx 35 pts</span>
                              </div>
                          </CardHeader>
                          <CardContent className="pt-6">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="space-y-2">
                                      <Label className="text-xs text-gray-600">252. Estudantes Graduação</Label>
                                      <Input disabled={isFormLocked} type="number" min="0" placeholder="Qtd" value={answers.g4_gradStudents} onChange={e => setAnswers({...answers, g4_gradStudents: parseInt(e.target.value)||0})} />
                                  </div>
                                  <div className="space-y-2">
                                      <Label className="text-xs text-gray-600">Estudantes Pós-Grad.</Label>
                                      <Input disabled={isFormLocked} type="number" min="0" placeholder="Qtd" value={answers.g4_postGradStudents} onChange={e => setAnswers({...answers, g4_postGradStudents: parseInt(e.target.value)||0})} />
                                  </div>
                                  <div className="space-y-2">
                                      <Label className="text-xs text-gray-600">253. % Aprovados (0-100)</Label>
                                      <Input disabled={isFormLocked} type="number" min="0" max="100" value={answers.g4_passRate} onChange={e => setAnswers({...answers, g4_passRate: parseInt(e.target.value)||0})} />
                                  </div>
                              </div>
                          </CardContent>
                      </Card>

                      {/* Grupo 5: Material Didático */}
                      <Card className="overflow-hidden border-t-4 border-t-purple-500">
                          <CardHeader className="bg-purple-50/50 border-b pb-3">
                              <div className="flex justify-between items-center">
                                  <CardTitle className="text-sm font-bold text-purple-800 uppercase tracking-wide flex items-center gap-2">
                                      <BookOpen size={16}/> 5. Material Didático (A-AE)
                                  </CardTitle>
                                  <span className="text-xs font-mono bg-white border px-2 py-1 rounded text-gray-500">Máx 30 pts</span>
                              </div>
                          </CardHeader>
                          <CardContent className="pt-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                      <Label className="text-xs text-gray-600">301. Manuais Produzidos</Label>
                                      <Input disabled={isFormLocked} type="number" min="0" value={answers.g5_manuals} onChange={e => setAnswers({...answers, g5_manuals: parseInt(e.target.value)||0})} />
                                  </div>
                                  <div className="space-y-2">
                                      <Label className="text-xs text-gray-600">302. Textos de Apoio</Label>
                                      <Input disabled={isFormLocked} type="number" min="0" value={answers.g5_supportTexts} onChange={e => setAnswers({...answers, g5_supportTexts: parseInt(e.target.value)||0})} />
                                  </div>
                              </div>
                          </CardContent>
                      </Card>

                      {/* Grupo 6: Investigação */}
                      <Card className="overflow-hidden border-t-4 border-t-orange-500">
                          <CardHeader className="bg-orange-50/50 border-b pb-3">
                              <div className="flex justify-between items-center">
                                  <CardTitle className="text-sm font-bold text-orange-800 uppercase tracking-wide flex items-center gap-2">
                                      <FlaskConical size={16}/> 6. Investigação (A)
                                  </CardTitle>
                                  <span className="text-xs font-mono bg-white border px-2 py-1 rounded text-gray-500">Máx 35 pts</span>
                              </div>
                          </CardHeader>
                          <CardContent className="pt-6">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="space-y-2">
                                      <Label className="text-xs text-gray-600">351. Proj. Individuais</Label>
                                      <Input disabled={isFormLocked} type="number" min="0" value={answers.g6_individualProjects} onChange={e => setAnswers({...answers, g6_individualProjects: parseInt(e.target.value)||0})} />
                                  </div>
                                  <div className="space-y-2">
                                      <Label className="text-xs text-gray-600">352. Proj. Coletivos</Label>
                                      <Input disabled={isFormLocked} type="number" min="0" value={answers.g6_collectiveProjects} onChange={e => setAnswers({...answers, g6_collectiveProjects: parseInt(e.target.value)||0})} />
                                  </div>
                                  <div className="space-y-2">
                                      <Label className="text-xs text-gray-600">353. Artigos Publicados</Label>
                                      <Input disabled={isFormLocked} type="number" min="0" value={answers.g6_publishedArticles} onChange={e => setAnswers({...answers, g6_publishedArticles: parseInt(e.target.value)||0})} />
                                  </div>
                                  <div className="space-y-2">
                                      <Label className="text-xs text-gray-600">354. Comunicações</Label>
                                      <Input disabled={isFormLocked} type="number" min="0" value={answers.g6_eventsComms} onChange={e => setAnswers({...answers, g6_eventsComms: parseInt(e.target.value)||0})} />
                                  </div>
                              </div>
                          </CardContent>
                      </Card>

                      {/* Grupo 7: Extensão */}
                      <Card className="overflow-hidden border-t-4 border-t-teal-500">
                          <CardHeader className="bg-teal-50/50 border-b pb-3">
                              <div className="flex justify-between items-center">
                                  <CardTitle className="text-sm font-bold text-teal-800 uppercase tracking-wide flex items-center gap-2">
                                      <Users size={16}/> 7. Extensão (A)
                                  </CardTitle>
                                  <span className="text-xs font-mono bg-white border px-2 py-1 rounded text-gray-500">Máx 40 pts</span>
                              </div>
                          </CardHeader>
                          <CardContent className="pt-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                      <Label className="text-xs text-gray-600">401. Atividades Colaboração</Label>
                                      <Input disabled={isFormLocked} type="number" min="0" value={answers.g7_collaboration} onChange={e => setAnswers({...answers, g7_collaboration: parseInt(e.target.value)||0})} />
                                  </div>
                                  <div className="space-y-2">
                                      <Label className="text-xs text-gray-600">402. Equipas Institucionais</Label>
                                      <Input disabled={isFormLocked} type="number" min="0" value={answers.g7_institutionalTeams} onChange={e => setAnswers({...answers, g7_institutionalTeams: parseInt(e.target.value)||0})} />
                                  </div>
                              </div>
                          </CardContent>
                      </Card>

                      {/* Grupo 8: Administração */}
                      <Card className="overflow-hidden border-t-4 border-t-slate-700">
                          <CardHeader className="bg-slate-100 border-b pb-3">
                              <div className="flex justify-between items-center">
                                  <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                                      <Briefcase size={16}/> 8. Administração e Gestão (AE)
                                  </CardTitle>
                                  <span className="text-xs font-mono bg-white border px-2 py-1 rounded text-gray-500">Máx 45 pts</span>
                              </div>
                          </CardHeader>
                          <CardContent className="pt-6">
                              <div className="space-y-2">
                                  <Label className="text-xs text-gray-600">Horas Semanais em Gestão</Label>
                                  <Input disabled={isFormLocked} type="number" min="0" value={answers.g8_adminHours} onChange={e => setAnswers({...answers, g8_adminHours: parseInt(e.target.value)||0})} />
                              </div>
                          </CardContent>
                      </Card>

                      {/* Section: Reflexão */}
                      <Card>
                          <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-bold text-gray-700">Observações do Avaliado</CardTitle>
                          </CardHeader>
                          <CardContent>
                              <textarea 
                                disabled={isFormLocked} 
                                className="w-full min-h-[100px] p-3 rounded-md border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm leading-relaxed" 
                                placeholder="Comentários finais sobre o desempenho..." 
                                value={selfComments} 
                                onChange={(e) => setSelfComments(e.target.value)}
                              />
                          </CardContent>
                      </Card>
                  </form>
              </div>

              {/* Coluna Direita: Calculadora Fixa */}
              <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
                  <Card className="border-0 shadow-xl ring-1 ring-black/5 overflow-hidden">
                      <div className="bg-slate-900 p-6 text-white text-center">
                          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Pontuação Provisória</p>
                          <div className="flex items-center justify-center gap-1">
                              <span className="text-5xl font-black tracking-tighter">{calculateLiveScore()}</span>
                              <span className="text-xl font-normal text-slate-500 mt-3">/ {header.category === 'assistente_estagiario' ? '125' : '175'}</span>
                          </div>
                      </div>
                      
                      <div className="bg-gray-50/50 p-0 max-h-[400px] overflow-y-auto">
                         <table className="w-full text-xs">
                             <thead className="bg-gray-100 text-gray-500 font-medium border-b">
                                 <tr>
                                     <th className="py-2 pl-4 text-left">Item</th>
                                     <th className="py-2 pr-4 text-right">Pts (Max)</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-100">
                                 {getDetailedBreakdown().length === 0 ? (
                                     <tr><td colSpan={2} className="py-8 text-center text-gray-400 italic">Preencha o formulário para ver o detalhe.</td></tr>
                                 ) : getDetailedBreakdown().map((item, i) => (
                                     <tr key={i} className="hover:bg-white transition-colors">
                                         <td className="py-2 pl-4 text-gray-600 font-medium">{item.name}</td>
                                         <td className="py-2 pr-4 text-right font-bold text-indigo-600">{item.subtotal.toFixed(1)}</td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                      </div>

                      <div className="p-4 bg-white border-t">
                          <Button 
                            onClick={(e) => handleSaveSelfEval(e as any)}
                            size="lg" 
                            className={`w-full font-semibold shadow-md transition-all ${isFormLocked ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200 text-white'}`} 
                            disabled={saving || isFormLocked}
                          >
                              {isFormLocked ? <><Lock className="mr-2 h-4 w-4" /> Bloqueado</> : (saving ? 'Processando...' : <><Save className="mr-2 h-4 w-4" /> Finalizar & Enviar</>)}
                          </Button>
                          {lastSaved && (
                              <p className="text-[10px] text-center text-gray-400 mt-2 flex items-center justify-center gap-1">
                                  <CheckCircle2 size={10} /> Última sincronização: {lastSaved.toLocaleTimeString()}
                              </p>
                          )}
                      </div>
                  </Card>
              </div>
          </div>
        )}

        {activeTab === 'surveys' && (
            <div className="animate-in fade-in max-w-2xl mx-auto">
                <Card className="border-l-4 border-l-emerald-500 shadow-md">
                    <CardHeader className="bg-emerald-50/30">
                        <CardTitle className="text-emerald-900 flex items-center gap-2">
                            <FileCheck className="h-5 w-5"/> Inquéritos Institucionais
                        </CardTitle>
                        <p className="text-sm text-gray-500">A sua opinião ajuda a melhorar as condições da instituição.</p>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {!availableSurvey ? (
                            <div className="text-center py-12">
                                <div className="bg-gray-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileQuestion className="h-8 w-8 text-gray-400" />
                                </div>
                                <h3 className="text-gray-900 font-medium">Tudo em dia!</h3>
                                <p className="text-gray-500 text-sm mt-1">Não há inquéritos pendentes para você no momento.</p>
                            </div>
                        ) : !isEvaluationOpen ? (
                           <div className="text-center py-8 bg-yellow-50 rounded-lg border border-yellow-100">
                               <Lock className="mx-auto h-8 w-8 mb-2 text-yellow-600" />
                               <p className="text-yellow-800 font-medium">O período de inquéritos está encerrado.</p>
                           </div>
                        ) : (
                            <div className="space-y-8">
                                <h3 className="text-lg font-bold text-center border-b pb-2">{availableSurvey.questionnaire.title}</h3>
                                {availableSurvey.questionnaire.questions.map((q, idx) => (
                                    <div key={q.id} className="space-y-3">
                                        <p className="font-medium text-gray-800 text-sm"><span className="text-emerald-600 font-bold mr-1">{idx+1}.</span> {q.text}</p>
                                        <div className="pl-4">
                                            {renderQuestionInput(q)}
                                        </div>
                                    </div>
                                ))}
                                <div className="pt-4 border-t">
                                    <Button onClick={handleSubmitSurvey} disabled={surveySubmitting} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200">
                                        {surveySubmitting ? 'Enviando Respostas...' : 'Submeter Inquérito'}
                                    </Button>
                                </div>
                                {surveySuccess && (
                                    <div className="flex items-center justify-center gap-2 text-emerald-700 bg-emerald-50 p-3 rounded-lg animate-in zoom-in">
                                        <CheckCircle2 size={18}/> Inquérito enviado com sucesso!
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        )}
      </div>
      </div>
    </>
  );
};

// Helper Icon for decoration
const AwardIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
);
