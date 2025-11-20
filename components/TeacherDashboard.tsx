import React, { useState, useEffect } from 'react';
import { User, CombinedScore, SelfEvaluation } from '../types';
import { BackendService } from '../services/backend';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from './ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Download, TrendingUp, FileText, BarChart3, Save } from 'lucide-react';

interface Props {
  user: User;
}

export const TeacherDashboard: React.FC<Props> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'self-eval'>('stats');
  const [stats, setStats] = useState<CombinedScore | undefined>(undefined);
  const [selfEval, setSelfEval] = useState<SelfEvaluation['indicators']>({
      teachingLoad: 0,
      supervision: 0,
      research: 0,
      extension: 0,
      management: 0
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
        setSelfEval(savedEval.indicators);
    }
  };

  const handleSaveSelfEval = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      await BackendService.saveSelfEval({
          teacherId: user.id,
          indicators: selfEval
      });
      setSaving(false);
      alert("Auto-avaliação salva com sucesso! O score será atualizado após o fecho do semestre pelo gestor.");
      loadData();
  };

  const handleExport = () => {
      if (!stats) return;
      
      const csvContent = `data:text/csv;charset=utf-8,` 
          + `Docente,${user.name}\n`
          + `Instituição,${user.institutionId}\n`
          + `Data do Relatório,${new Date().toLocaleDateString()}\n\n`
          + `Métrica,Valor (0-100),Peso,Pontos Ponderados\n`
          + `Auto-Avaliação (Apêndice 2/3),${((stats.finalScore - (stats.studentScore * 0.12) - (stats.institutionalScore * 0.08)) / 0.8).toFixed(1)},80%,${(stats.finalScore - (stats.studentScore * 0.12) - (stats.institutionalScore * 0.08)).toFixed(2)}\n` 
          + `Avaliação dos Alunos,${stats.studentScore},12%,${(stats.studentScore * 0.12).toFixed(2)}\n`
          + `Avaliação Qualitativa (Gestor),${stats.institutionalScore},8%,${(stats.institutionalScore * 0.08).toFixed(2)}\n`
          + `SCORE FINAL,${stats.finalScore},100%,${stats.finalScore}\n`;

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `relatorio_desempenho_${user.name.replace(/\s+/g, '_').toLowerCase()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  if (!user.approved) {
      return (
          <div className="flex h-screen items-center justify-center p-4 text-center">
              <div className="max-w-md space-y-4">
                  <h1 className="text-2xl font-bold">Conta em Análise</h1>
                  <p className="text-gray-500">O gestor da sua instituição ainda não aprovou o seu cadastro. Por favor, aguarde.</p>
              </div>
          </div>
      )
  }

  const chartData = stats ? [
    // Reverse calculating rough raw score for display based on weight
    { name: 'Auto-Avaliação (80%)', value: stats.finalScore > 0 ? parseFloat(((stats.finalScore - (stats.studentScore * 0.12) - (stats.institutionalScore * 0.08)) / 0.8).toFixed(1)) : 0, full: 100 },
    { name: 'Alunos (12%)', value: stats.studentScore, full: 100 },
    { name: 'Gestor (8%)', value: stats.institutionalScore, full: 100 },
    { name: 'Final', value: stats.finalScore, full: 100 },
  ] : [];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b">
            <div>
                <h1 className="text-3xl font-bold">Olá, {user.name}</h1>
                <p className="text-gray-500">Painel de Desempenho Docente</p>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                    onClick={() => setActiveTab('stats')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'stats' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    <BarChart3 className="h-4 w-4" /> Resultados
                </button>
                <button 
                    onClick={() => setActiveTab('self-eval')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'self-eval' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    <FileText className="h-4 w-4" /> Auto-Avaliação
                </button>
            </div>
        </header>

        {activeTab === 'self-eval' ? (
            <div className="max-w-3xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>Ficha de Auto-Avaliação (Apêndices 2/3)</CardTitle>
                        <p className="text-sm text-gray-500">Preencha sua pontuação conforme os indicadores do regulamento. Esta ficha representa <strong>80%</strong> da sua nota final.</p>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSaveSelfEval} className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>1. Volume de Docência (Máx 35 pts)</Label>
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            type="number" min="0" max="35" 
                                            value={selfEval.teachingLoad || ''}
                                            onChange={e => setSelfEval({...selfEval, teachingLoad: Number(e.target.value)})}
                                            placeholder="0"
                                        />
                                        <span className="text-xs text-gray-400">pts</span>
                                    </div>
                                    <p className="text-xs text-gray-500">Aulas teóricas, práticas e consultas.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>2. Supervisão Académica (Máx 30 pts)</Label>
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            type="number" min="0" max="30" 
                                            value={selfEval.supervision || ''}
                                            onChange={e => setSelfEval({...selfEval, supervision: Number(e.target.value)})}
                                            placeholder="0"
                                        />
                                        <span className="text-xs text-gray-400">pts</span>
                                    </div>
                                    <p className="text-xs text-gray-500">Teses, júris e orientações.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>3. Investigação (Máx 30 pts)</Label>
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            type="number" min="0" max="30" 
                                            value={selfEval.research || ''}
                                            onChange={e => setSelfEval({...selfEval, research: Number(e.target.value)})}
                                            placeholder="0"
                                        />
                                        <span className="text-xs text-gray-400">pts</span>
                                    </div>
                                    <p className="text-xs text-gray-500">Publicações, projetos e eventos.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>4. Extensão (Máx 10 pts)</Label>
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            type="number" min="0" max="10" 
                                            value={selfEval.extension || ''}
                                            onChange={e => setSelfEval({...selfEval, extension: Number(e.target.value)})}
                                            placeholder="0"
                                        />
                                        <span className="text-xs text-gray-400">pts</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>5. Gestão Universitária (Máx 10 pts)</Label>
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            type="number" min="0" max="10" 
                                            value={selfEval.management || ''}
                                            onChange={e => setSelfEval({...selfEval, management: Number(e.target.value)})}
                                            placeholder="0"
                                        />
                                        <span className="text-xs text-gray-400">pts</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-md border border-blue-100 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-blue-900">Total de Pontos</p>
                                    <p className="text-xs text-blue-600">Soma dos indicadores preenchidos</p>
                                </div>
                                <div className="text-2xl font-bold text-blue-900">
                                    {(selfEval.teachingLoad || 0) + (selfEval.supervision || 0) + (selfEval.research || 0) + (selfEval.extension || 0) + (selfEval.management || 0)}
                                </div>
                            </div>

                            <Button type="submit" className="w-full" disabled={saving}>
                                {saving ? 'Salvando...' : <><Save className="mr-2 h-4 w-4" /> Salvar Auto-Avaliação</>}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        ) : (
            <>
            {!stats ? (
                <Card className="bg-gray-50 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-gray-500">
                        <TrendingUp className="h-12 w-12 mb-4 opacity-20" />
                        <p>Os scores finais serão calculados pelo gestor ao fim do semestre.</p>
                        <p className="text-sm mt-2">Certifique-se de preencher a aba "Auto-Avaliação".</p>
                    </CardContent>
                </Card>
            ) : (
                <>
                {/* KPI Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="bg-slate-900 text-white border-slate-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-slate-400">Score Final Consolidado</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-5xl font-bold">{stats.finalScore}</div>
                            <p className="text-xs text-slate-400 mt-1">de 100 pontos possíveis</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Média dos Alunos (12%)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold">{stats.studentScore}</div>
                            <p className="text-xs text-gray-500 mt-1">pontos normalizados</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Qualidade/Gestão (8%)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold">{stats.institutionalScore}</div>
                            <p className="text-xs text-gray-500 mt-1">pontos normalizados</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Chart */}
                <Card className="h-[450px]">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Composição da Nota Final</CardTitle>
                        <Button variant="outline" size="sm" onClick={handleExport}>
                            <Download className="mr-2 h-4 w-4" /> Exportar CSV
                        </Button>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" domain={[0, 100]} hide />
                                <YAxis dataKey="name" type="category" width={140} tick={{fontSize: 12}} />
                                <Tooltip 
                                    cursor={{fill: 'transparent'}}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 3 ? '#111827' : '#6b7280'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                </>
            )}
            </>
        )}
    </div>
  );
};