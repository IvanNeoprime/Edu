
import React, { useState, useEffect } from 'react';
import { User, CombinedScore, SelfEvaluation, TeacherCategory } from '../types';
import { BackendService } from '../services/backend';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Select } from './ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Download, TrendingUp, FileText, BarChart3, Save } from 'lucide-react';

interface Props {
  user: User;
}

export const TeacherDashboard: React.FC<Props> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'self-eval'>('stats');
  const [stats, setStats] = useState<CombinedScore | undefined>(undefined);
  
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

  useEffect(() => {
    loadData();
  }, [user.id]);

  const loadData = async () => {
    const data = await BackendService.getTeacherStats(user.id);
    setStats(data);
    
    const savedEval = await BackendService.getSelfEval(user.id);
    if (savedEval) {
        setHeader(savedEval.header);
        setAnswers(savedEval.answers);
    }
  };

  const handleSaveSelfEval = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      await BackendService.saveSelfEval({
          teacherId: user.id,
          header,
          answers
      });
      setSaving(false);
      alert("Auto-avaliação salva com sucesso!");
      loadData();
  };

  const handleExport = () => {
      if (!stats) return;
      
      const csvContent = `data:text/csv;charset=utf-8,` 
          + `Docente,${user.name}\n`
          + `Instituição,${user.institutionId}\n`
          + `Data do Relatório,${new Date().toLocaleDateString()}\n\n`
          + `Componente,Pontos Acumulados\n`
          + `Auto-Avaliação,${stats.selfEvalScore}\n` 
          + `Avaliação dos Alunos (Ponderada),${stats.studentScore}\n`
          + `Avaliação Qualitativa (Gestor),${stats.institutionalScore}\n`
          + `SCORE FINAL TOTAL,${stats.finalScore}\n`;

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `relatorio_${user.name.replace(/\s+/g, '_').toLowerCase()}.csv`);
      document.body.appendChild(link);
  };

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <header className="border-b pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Painel do Docente</h1>
            <p className="text-gray-500">Acompanhamento de Desempenho e Auto-Avaliação</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'stats' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>Resultados</button>
            <button onClick={() => setActiveTab('self-eval')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'self-eval' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}>Auto-Avaliação</button>
        </div>
      </header>

      {activeTab === 'stats' ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pontuação Final</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.finalScore || 0}</div>
              <p className="text-xs text-gray-500">Acumulado do Semestre</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alunos (Ponderada)</CardTitle>
              <UsersIcon className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.studentScore || 0}</div>
              <p className="text-xs text-gray-500">Baseado em questionários</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Auto-Avaliação</CardTitle>
              <FileText className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.selfEvalScore || 0}</div>
              <p className="text-xs text-gray-500">Baseado na Ficha Preenchida</p>
            </CardContent>
          </Card>
          <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Relatório</CardTitle>
                <Download className="h-4 w-4 text-gray-600" />
             </CardHeader>
             <CardContent>
                <Button variant="outline" size="sm" className="w-full" onClick={handleExport} disabled={!stats}>
                    Exportar CSV
                </Button>
             </CardContent>
          </Card>

          {stats && (
            <Card className="col-span-full md:col-span-2 lg:col-span-4 mt-4">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5"/> Distribuição da Pontuação</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                            { name: 'Alunos', value: stats.studentScore },
                            { name: 'Auto-Aval.', value: stats.selfEvalScore },
                            { name: 'Institucional', value: stats.institutionalScore },
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
          )}
        </div>
      ) : (
        <form onSubmit={handleSaveSelfEval} className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
            {/* Header Section */}
            <Card className="border-blue-100 bg-blue-50/50">
                <CardHeader>
                    <CardTitle className="text-blue-900">1. Dados do Docente (Cabeçalho)</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Campo de Departamento removido conforme solicitado */}
                    <div className="space-y-2">
                        <Label>Categoria</Label>
                        <Select value={header.category} onChange={e => setHeader({...header, category: e.target.value as TeacherCategory})}>
                            <option value="assistente">Assistente</option>
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

                    {/* Assistente Only Questions */}
                    {header.category === 'assistente' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                            <h3 className="font-semibold text-gray-900 border-b pb-2">Supervisão e Regência (Apenas Assistentes)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                        </div>
                    )}

                    <div className="pt-6 border-t">
                        <Button type="submit" size="lg" className="w-full md:w-auto min-w-[200px]" disabled={saving}>
                            {saving ? 'Salvando...' : <><Save className="mr-2 h-4 w-4" /> Salvar Ficha de Auto-Avaliação</>}
                        </Button>
                    </div>

                </CardContent>
            </Card>
        </form>
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
