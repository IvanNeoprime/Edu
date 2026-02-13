
import React, { useState, useEffect } from 'react';
import { User, CombinedScore, SelfEvaluation, Questionnaire, UserRole, Question, QualitativeEval, Institution, SelfEvalTemplate } from '../types';
import { BackendService, DEFAULT_SELF_EVAL_TEMPLATE } from '../services/backend';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Select } from './ui';
import { TrendingUp, Save, FileCheck, ClipboardList, User as UserIcon, GraduationCap, School, Award, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Star, Printer, Menu, X, Users } from 'lucide-react';

interface Props {
  user: User;
}

export const TeacherDashboard: React.FC<Props> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'self-eval' | 'surveys'>('stats');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState<CombinedScore | undefined>(undefined);
  const [qualEval, setQualEval] = useState<QualitativeEval | undefined>(undefined);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [selfEvalTemplate, setSelfEvalTemplate] = useState<SelfEvalTemplate>(DEFAULT_SELF_EVAL_TEMPLATE);
  
  // Surveys State
  const [availableSurvey, setAvailableSurvey] = useState<{questionnaire: Questionnaire} | null>(null);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, string | number>>({});
  const [surveySubmitting, setSurveySubmitting] = useState(false);
  const [surveySuccess, setSurveySuccess] = useState(false);
  
  // Peer Evaluation State
  const [peerTeachers, setPeerTeachers] = useState<User[]>([]);
  const [evaluationTarget, setEvaluationTarget] = useState<string>('institution'); // 'institution' or teacherId

  // New Complex State for Self Eval
  const [header, setHeader] = useState<SelfEvaluation['header']>({
      category: 'assistente',
      function: 'Docente',
      contractRegime: 'Tempo Inteiro',
      workPeriod: 'Laboral',
      academicYear: new Date().getFullYear().toString()
  });
  
  // Respostas agora são um dicionário dinâmico { key: value }
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const [selfComments, setSelfComments] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Accordion state for groups
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8']);

  const toggleGroup = (group: string) => {
      setExpandedGroups(prev => prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]);
  };

  useEffect(() => {
    loadData();
    loadSurveys();
  }, [user.id]);

  useEffect(() => {
      if (user.category) {
          setHeader(prev => ({...prev, category: user.category!}));
      }
  }, [user.category]);

  const loadData = async () => {
    const data = await BackendService.getTeacherStats(user.id);
    setStats(data);

    if (user.institutionId) {
        const inst = await BackendService.getInstitution(user.institutionId);
        if (inst) setInstitution(inst);
        
        // Load custom template if available
        const template = await BackendService.getInstitutionSelfEvalTemplate(user.institutionId);
        setSelfEvalTemplate(template);
        
        // Load peers for evaluation
        const users = await BackendService.getUsers();
        const peers = users.filter(u => 
            u.role === UserRole.TEACHER && 
            u.institutionId === user.institutionId && 
            u.id !== user.id
        );
        setPeerTeachers(peers);
    }

    const qEval = await BackendService.getQualitativeEval(user.id);
    setQualEval(qEval);
    
    const savedEval = await BackendService.getSelfEval(user.id);
    if (savedEval) {
        setHeader(savedEval.header);
        setAnswers(savedEval.answers || {});
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
  
  // CÁLCULO DINÂMICO DA PONTUAÇÃO
  const calculateLiveScore = () => {
    let score = 0;
    
    selfEvalTemplate.groups.forEach(group => {
        // Check group exclusion based on template settings
        if (group.exclusiveTo && group.exclusiveTo.length > 0 && !group.exclusiveTo.includes(header.category)) return;

        let groupScore = 0;
        group.items.forEach(item => {
            // Check item exclusion
            if (item.exclusiveTo && item.exclusiveTo.length > 0 && !item.exclusiveTo.includes(header.category)) return;

            const val = answers[item.key] || 0;
            const points = val * (item.scoreValue || 0);
            groupScore += points;
        });
        
        // Cap group score if maxPoints is defined
        if (group.maxPoints > 0) {
            groupScore = Math.min(groupScore, group.maxPoints);
        }
        
        score += groupScore;
    });

    const maxScore = header.category === 'assistente_estagiario' ? 125 : 175;
    return Math.min(score, maxScore);
  };

  const handleSaveSelfEval = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user.institutionId) return;

      setSaving(true);
      
      const cleanAnswers = { ...answers };
      // Limpeza opcional: remover respostas de campos que não se aplicam mais
      // (Não estritamente necessário pois o cálculo ignora, mas bom para dados limpos)
      
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
        alert("Auto-avaliação submetida com sucesso!");
        loadData();
      } catch (error: any) {
        alert("Erro ao salvar: " + error.message);
        setSaving(false);
      }
  };

  const handleDownloadPDF = () => { window.print(); };

  // ... (Surveys submit logic unchanged) ...
  const handleSubmitSurvey = async () => { if (!availableSurvey || !user.institutionId) return; if (Object.keys(surveyAnswers).length < availableSurvey.questionnaire.questions.length) { alert("Por favor responda todas as perguntas."); return; } setSurveySubmitting(true); try { await BackendService.submitAnonymousResponse(user.id, { institutionId: user.institutionId, questionnaireId: availableSurvey.questionnaire.id, subjectId: 'general', teacherId: evaluationTarget === 'institution' ? user.id : evaluationTarget, answers: Object.entries(surveyAnswers).map(([k, v]) => ({ questionId: k, value: v })) }); setSurveySuccess(true); setSurveyAnswers({}); setTimeout(() => setSurveySuccess(false), 3000); } catch (e: any) { alert(e.message); } finally { setSurveySubmitting(false); } };
  const renderQuestionInput = (q: Question) => { const val = surveyAnswers[q.id]; const setAns = (v: any) => setSurveyAnswers(prev => ({ ...prev, [q.id]: v })); switch (q.type) { case 'stars': return <div className="flex gap-2">{[1, 2, 3, 4, 5].map((star) => (<button key={star} onClick={() => setAns(star)} className="focus:outline-none"><Star className={`h-8 w-8 ${(val as number) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} /></button>))}</div>; case 'binary': return <div className="flex gap-4"><button onClick={() => setAns(0)} className={`flex-1 py-2 px-4 rounded-md border ${val === 0 ? 'bg-red-100 border-red-300' : 'bg-white'}`}>Não</button><button onClick={() => setAns(1)} className={`flex-1 py-2 px-4 rounded-md border ${val === 1 ? 'bg-green-100 border-green-300' : 'bg-white'}`}>Sim</button></div>; case 'text': return <textarea className="w-full p-2 border rounded" value={val as string || ''} onChange={(e) => setAns(e.target.value)} />; default: return <Input value={val as string || ''} onChange={(e) => setAns(e.target.value)} />; } };

  const isEvaluationOpen = institution?.isEvaluationOpen ?? true;
  
  // Helper Components
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

  const GroupHeader = ({ id, title, max }: { id: string, title: string, max: number }) => (
      <div 
        className="flex items-center justify-between p-4 bg-gray-50 border-b cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => toggleGroup(id)}
      >
          <div className="flex items-center gap-2 font-semibold text-gray-800">
              {expandedGroups.includes(id) ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
              {title}
          </div>
          <span className="text-xs font-medium bg-white px-2 py-1 rounded border text-gray-500">Máx: {max} pts</span>
      </div>
  );

  return (
    <>
      {/* ... (Print View - Needs to be dynamic too) ... */}
      <div className="hidden print:block font-serif p-8">
          <div className="text-center mb-8 border-b pb-4">
              {institution?.logo && <img src={institution.logo} className="h-20 mx-auto mb-2" alt="Logo"/>}
              <h1 className="text-xl font-bold uppercase">{institution?.name || 'Universidade'}</h1>
              <p>Ficha de Auto-Avaliação de Desempenho Docente</p>
              <p className="text-sm">Ano Académico: {header.academicYear}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-sm border p-4 bg-gray-50">
              <p><strong>Nome:</strong> {user.name}</p>
              <p><strong>Categoria:</strong> {header.category}</p>
              <p><strong>Regime:</strong> {header.contractRegime}</p>
              <p><strong>Função:</strong> {header.function}</p>
          </div>

          <div className="space-y-6">
              {selfEvalTemplate.groups.map(group => {
                  if (group.exclusiveTo && group.exclusiveTo.length > 0 && !group.exclusiveTo.includes(header.category)) return null;
                  return (
                      <div key={group.id} className="break-inside-avoid border border-black">
                          <div className="bg-gray-100 p-2 font-bold border-b border-black flex justify-between">
                              <span>{group.title}</span>
                              <span>Máx: {group.maxPoints} pts</span>
                          </div>
                          <div className="p-2 grid grid-cols-2 gap-4 text-sm">
                              {group.items.map(item => {
                                  if (item.exclusiveTo && item.exclusiveTo.length > 0 && !item.exclusiveTo.includes(header.category)) return null;
                                  return (
                                      <div key={item.key} className="flex justify-between border-b border-dotted pb-1">
                                          <span>{item.label} (x{item.scoreValue}):</span>
                                          <span className="font-bold">{answers[item.key] || 0}</span>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  );
              })}
          </div>
          {/* ... footer ... */}
      </div>

      <div className="print:hidden bg-gray-50/50 min-h-screen pb-12">
        {/* ... (Header unchanged) ... */}
        <div className="bg-white border-b sticky top-0 z-30">
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-4">
                <div className="flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-lg md:text-xl shrink-0">
                            {user.name.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">Olá, {user.name.split(' ')[0]}</h1>
                            <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                                <School size={12} /> {institution?.name || 'Universidade'}
                            </p>
                        </div>
                    </div>
                     <button className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>{isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}</button>
                    <nav className="hidden md:flex p-1 bg-gray-100 rounded-lg overflow-x-auto no-scrollbar">
                        <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'stats' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><TrendingUp size={16}/> Resultados</button>
                        <button onClick={() => setActiveTab('self-eval')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'self-eval' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><UserIcon size={16}/> Auto-Avaliação</button>
                        <button onClick={() => setActiveTab('surveys')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'surveys' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><FileCheck size={16}/> Inquéritos</button>
                    </nav>
                </div>
                {/* Mobile Menu */}
                {isMobileMenuOpen && (<div className="md:hidden absolute top-full left-0 w-full bg-white shadow-xl border-b z-50 rounded-b-xl animate-in slide-in-from-top-2 p-2"><div className="grid gap-1"><button onClick={() => { setActiveTab('stats'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'stats' ? 'bg-slate-900 text-white' : 'hover:bg-gray-100 text-gray-700'}`}><TrendingUp size={18}/> Resultados</button><button onClick={() => { setActiveTab('self-eval'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'self-eval' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 text-gray-700'}`}><UserIcon size={18}/> Auto-Avaliação</button><button onClick={() => { setActiveTab('surveys'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'surveys' ? 'bg-emerald-600 text-white' : 'hover:bg-gray-100 text-gray-700'}`}><FileCheck size={18}/> Inquéritos e Pares</button></div></div>)}
            </div>
        </div>

        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
        
        {activeTab === 'stats' && (
            // ... (Stats content unchanged) ...
            <div className="space-y-6">
                {!stats ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-xl border border-dashed">
                        <AlertCircle className="h-10 w-10 mb-3 opacity-20"/>
                        <p>Os resultados finais ainda não foram calculados pela gestão.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-10"><Award size={150} /></div>
                                <div className="relative z-10 flex flex-col justify-between h-full">
                                    <div><p className="text-slate-300 text-sm font-medium uppercase tracking-widest mb-1">Classificação Final</p><h2 className="text-5xl font-black tracking-tighter">{stats.finalScore.toFixed(1)} <span className="text-xl font-normal text-slate-400">/ {header.category === 'assistente_estagiario' ? '125' : '175'}</span></h2></div>
                                    <div className="mt-6 flex flex-wrap gap-3"><Button onClick={handleDownloadPDF} size="sm" className="bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-sm"><Printer className="mr-2 h-4 w-4" /> Versão Impressa</Button><div className="px-3 py-1.5 bg-green-500/20 text-green-300 rounded text-xs flex items-center gap-1 border border-green-500/30"><CheckCircle2 size={12}/> Processado em {new Date(stats.lastCalculated).toLocaleDateString()}</div></div>
                                </div>
                            </div>
                            <StatCard title="Avaliação Pedagógica" value={stats.studentScore} max={20} color="blue" icon={GraduationCap} />
                            <StatCard title="Auto-Avaliação" value={stats.selfEvalScore} max={header.category === 'assistente_estagiario' ? 125 : 175} color="indigo" icon={UserIcon} />
                            <StatCard title="Avaliação Institucional" value={stats.institutionalScore} max={10} color="emerald" icon={School} />
                        </div>
                         {qualEval?.comments && (<div className="bg-amber-50 border border-amber-100 rounded-xl p-6 relative"><div className="absolute top-0 left-0 w-1 h-full bg-amber-400 rounded-l-xl"></div><h4 className="font-bold text-amber-900 flex items-center gap-2 mb-3"><ClipboardList size={18} className="text-amber-600" /> Feedback da Gestão</h4><blockquote className="text-amber-900/80 italic text-sm leading-relaxed pl-4 border-l-2 border-amber-200">"{qualEval.comments}"</blockquote></div>)}
                    </>
                )}
            </div>
        )}

        {activeTab === 'self-eval' && (
          <div className="grid gap-6 lg:grid-cols-12 animate-in slide-in-from-right-4 fade-in duration-300 items-start">
              
              <div className="lg:col-span-4 order-1 lg:order-2 space-y-6 lg:sticky lg:top-24">
                  <Card className="border-0 shadow-xl ring-1 ring-black/5 overflow-hidden">
                      <div className="bg-slate-900 p-6 text-white text-center">
                          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Pontuação Provisória</p>
                          <div className="flex items-center justify-center gap-1">
                              <span className="text-5xl font-black tracking-tighter">{calculateLiveScore().toFixed(1)}</span>
                              <span className="text-xl font-normal text-slate-500 mt-3">/ {header.category === 'assistente_estagiario' ? 125 : 175}</span>
                          </div>
                      </div>
                      <div className="p-4 bg-gray-50 border-t flex flex-col gap-3">
                          <Button onClick={handleSaveSelfEval} className="w-full bg-blue-600 hover:bg-blue-700" disabled={saving || !isEvaluationOpen}>{saving ? 'Salvando...' : 'Salvar Avaliação'}</Button>
                          <Button variant="outline" onClick={handleDownloadPDF} className="w-full"><Printer className="mr-2 h-4 w-4"/> Imprimir Ficha</Button>
                          {lastSaved && <p className="text-xs text-center text-gray-500">Última alteração: {lastSaved.toLocaleString()}</p>}
                      </div>
                  </Card>
                  
                  <Card>
                      <CardHeader className="py-4"><CardTitle className="text-sm">Configuração de Perfil</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                          <div className="space-y-1"><Label className="text-xs">Categoria Docente</Label><Select value={header.category} onChange={e => setHeader({...header, category: e.target.value as any})}><option value="assistente">Assistente</option><option value="assistente_estagiario">Assistente Estagiário</option></Select></div>
                          <div className="space-y-1"><Label className="text-xs">Regime</Label><Select value={header.contractRegime} onChange={e => setHeader({...header, contractRegime: e.target.value})}><option value="Tempo Inteiro">Tempo Inteiro</option><option value="Tempo Parcial">Tempo Parcial</option></Select></div>
                      </CardContent>
                  </Card>
              </div>

              {/* Coluna Esquerda: Formulário Dinâmico BASEADO NO TEMPLATE */}
              <div className="lg:col-span-8 order-2 lg:order-1 space-y-4">
                  
                  {selfEvalTemplate.groups.map(group => {
                      // Skip if group is exclusive to another category
                      if (group.exclusiveTo && group.exclusiveTo.length > 0 && !group.exclusiveTo.includes(header.category)) return null;

                      return (
                          <Card key={group.id}>
                              <GroupHeader id={group.id} title={group.title} max={group.maxPoints} />
                              {expandedGroups.includes(group.id) && (
                                  <CardContent className="p-6 space-y-4 animate-in slide-in-from-top-2">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {group.items.map(item => {
                                              // Skip if item is exclusive to another category
                                              if (item.exclusiveTo && item.exclusiveTo.length > 0 && !item.exclusiveTo.includes(header.category)) return null;

                                              return (
                                                  <div key={item.key}>
                                                      <Label className="flex justify-between">
                                                          <span>{item.label}</span>
                                                          <span className="text-xs text-gray-400 font-normal bg-gray-50 px-1 rounded border">
                                                              x{item.scoreValue} pts
                                                          </span>
                                                      </Label>
                                                      <Input 
                                                          type="number" 
                                                          min="0" 
                                                          value={answers[item.key] || ''} // Handle empty string for better UX
                                                          onChange={e => setAnswers({...answers, [item.key]: parseFloat(e.target.value) || 0})} 
                                                      />
                                                      <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                                                  </div>
                                              )
                                          })}
                                      </div>
                                  </CardContent>
                              )}
                          </Card>
                      );
                  })}

                  <Card>
                      <CardHeader><CardTitle>Observações Adicionais</CardTitle></CardHeader>
                      <CardContent>
                          <textarea 
                              className="w-full p-3 border rounded-md" 
                              rows={4}
                              placeholder="Descreva outras atividades relevantes não contempladas acima..."
                              value={selfComments}
                              onChange={e => setSelfComments(e.target.value)}
                          />
                      </CardContent>
                  </Card>

              </div>
          </div>
        )}

        {/* ... (Surveys Tab unchanged) ... */}
        {activeTab === 'surveys' && (
            <div className="max-w-2xl mx-auto space-y-6">
                {/* ... existing surveys code ... */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users size={20} className="text-gray-500"/> Alvo da Avaliação
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <Label>Quem você deseja avaliar?</Label>
                            <Select 
                                value={evaluationTarget} 
                                onChange={e => {
                                    setEvaluationTarget(e.target.value);
                                    setSurveyAnswers({}); // Reseta respostas ao trocar alvo
                                }}
                            >
                                <option value="institution">Instituição (Avaliação Geral)</option>
                                <optgroup label="Avaliação de Pares (Colegas)">
                                    {peerTeachers.map(peer => (
                                        <option key={peer.id} value={peer.id}>{peer.name}</option>
                                    ))}
                                </optgroup>
                            </Select>
                            <p className="text-xs text-gray-500">
                                {evaluationTarget === 'institution' 
                                    ? "Você está avaliando as condições gerais e infraestrutura da instituição." 
                                    : `Você está avaliando o desempenho do colega selecionado.`}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {availableSurvey ? (
                     <Card>
                        <CardHeader>
                            <CardTitle>
                                {evaluationTarget === 'institution' ? 'Inquérito Institucional' : 'Avaliação de Pares'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {surveySuccess ? (
                                <div className="p-4 bg-green-50 text-green-700 rounded-md flex items-center gap-2">
                                    <CheckCircle2 size={20}/> Resposta enviada com sucesso!
                                </div>
                            ) : (
                                <>
                                    {availableSurvey.questionnaire.questions.map((q, idx) => (
                                        <div key={q.id} className="space-y-2">
                                            <Label className="text-base">{idx+1}. {q.text}</Label>
                                            {renderQuestionInput(q)}
                                        </div>
                                    ))}
                                    <Button onClick={handleSubmitSurvey} disabled={surveySubmitting} className="w-full">
                                        {surveySubmitting ? 'Enviando...' : 'Submeter Respostas'}
                                    </Button>
                                </>
                            )}
                        </CardContent>
                     </Card>
                ) : (
                    <div className="text-center py-10 text-gray-500">
                        <FileCheck size={48} className="mx-auto mb-4 opacity-20"/>
                        <p>Nenhum inquérito disponível no momento.</p>
                    </div>
                )}
            </div>
        )}
        </div>
      </div>
    </>
  );
};
