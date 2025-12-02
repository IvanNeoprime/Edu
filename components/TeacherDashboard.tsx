
import React, { useState, useEffect } from 'react';
import { User, CombinedScore, SelfEvaluation, TeacherCategory } from '../types';
import { BackendService } from '../services/backend';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Select } from './ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Download, TrendingUp, FileText, BarChart3, Save, Printer } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  user: User;
}

export const TeacherDashboard: React.FC<Props> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'self-eval'>('stats');
  const [stats, setStats] = useState<CombinedScore | undefined>(undefined);
  
  // New Complex State for Self Eval Header
  const [header, setHeader] = useState<SelfEvaluation['header']>({
      department: '',
      category: 'assistente',
      function: 'Docente',
      contractRegime: 'Tempo Inteiro',
      workPeriod: 'Laboral',
      academicYear: new Date().getFullYear().toString()
  });
  
  // New Complex State for Answers (Quantities)
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

  const handleExportCSV = () => {
      if (!stats) return;
      
      const csvContent = `data:text/csv;charset=utf-8,` 
          + `Docente,${user.name}\n`
          + `Instituição,${user.institutionId}\n`
          + `Data do Relatório,${new Date().toLocaleDateString()}\n\n`
          + `Componente,Pontos Acumulados\n`
          + `Auto-Avaliação (Soma de pontos),${stats.selfEvalScore}\n` 
          + `Avaliação dos Alunos (Média * Multiplicador),${stats.studentScore}\n`
          + `Avaliação Qualitativa (Gestor),${stats.institutionalScore}\n`
          + `SCORE FINAL TOTAL,${stats.finalScore}\n`;

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `relatorio_${user.name.replace(/\s+/g, '_').toLowerCase()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleExportPDF = () => {
      const doc = new jsPDF();
      
      // -- Title Section --
      doc.setFontSize(14);
      doc.text("FICHA DE AUTO-AVALIAÇÃO DO DESEMPENHO", 105, 15, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`(${header.category === 'assistente_estagiario' ? 'Assistente Estagiário' : 'Assistente e Pleno'})`, 105, 20, { align: 'center' });
      
      // -- Header Details --
      const startY = 30;
      doc.setFontSize(10);
      
      doc.text(`Departamento: ${header.department}`, 14, startY);
      doc.text(`Nome: ${user.name}`, 14, startY + 6);
      doc.text(`Categoria: ${header.category.toUpperCase().replace('_', ' ')}`, 14, startY + 12);
      doc.text(`Função: ${header.function}`, 14, startY + 18);
      doc.text(`Regime: ${header.contractRegime}  |  Período: ${header.workPeriod}`, 14, startY + 24);
      doc.text(`Ano Lectivo: ${header.academicYear}`, 14, startY + 30);

      // -- Calculating Points for Table --
      const ptsGrad = (answers.gradSubjects || 0) * 15;
      const ptsPostGrad = (answers.postGradSubjects || 0) * 5;
      const ptsSuperGrad = (answers.gradSupervision || 0) * 6;
      const ptsSuperPost = (answers.postGradSupervision || 0) * 6;
      const ptsRegency = (answers.regencySubjects || 0) * 8;
      const ptsTheory = (answers.theoryHours || 0) * 16;
      const ptsPractical = (answers.practicalHours || 0) * 14;
      const ptsConsult = (answers.consultationHours || 0) * 5;

      const totalSelf = ptsGrad + ptsPostGrad + ptsSuperGrad + ptsSuperPost + ptsRegency + ptsTheory + ptsPractical + ptsConsult;

      // -- Table Body --
      const rows = [
          [{ content: 'N° de disciplinas por ano', rowSpan: 2 }, 'Graduação (15 pts)', answers.gradSubjects || 0, ptsGrad],
          ['Pós-graduação (5 pts)', answers.postGradSubjects || 0, ptsPostGrad],
          
          [{ content: 'Supervisão e coordenação', rowSpan: 3 }, 'Dissertações Graduação (6 pts)', answers.gradSupervision || 0, ptsSuperGrad],
          ['Teses Pós-graduação (6 pts)', answers.postGradSupervision || 0, ptsSuperPost],
          ['Regência (8 pts)', answers.regencySubjects || 0, ptsRegency],

          [{ content: 'Horas de docência por semana', rowSpan: 3 }, 'Aulas Teóricas (16 pts)', answers.theoryHours || 0, ptsTheory],
          ['Aulas Práticas (14 pts)', answers.practicalHours || 0, ptsPractical],
          ['Consultas (5 pts)', answers.consultationHours || 0, ptsConsult],

          [{ content: 'TOTAL PONTOS AUTO-AVALIAÇÃO', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, { content: totalSelf, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]
      ];

      autoTable(doc, {
          startY: startY + 35,
          head: [['Indicador', 'Parâmetro', 'Quant.', 'Pontos Obtidos']],
          body: rows,
          theme: 'grid',
          styles: { fontSize: 9, cellPadding: 2 },
          headStyles: { fillColor: [44, 62, 80] },
      });

      // -- Signatures --
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.text("_______________________________", 40, finalY);
      doc.text("Assinatura do Docente", 45, finalY + 5);

      doc.text("_______________________________", 140, finalY);
      doc.text("O Director do Curso", 145, finalY + 5);

      doc.save(`Ficha_Avaliacao_${user.name.replace(/\s+/g, '_')}.pdf`);
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
              <p className="text-xs text-gray-500">Média × Coeficiente ({header.category === 'assistente_estagiario' ? '0.46' : '0.88'})</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Auto-Avaliação</CardTitle>
              <FileText className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.selfEvalScore || 0}</div>
              <p className="text-xs text-gray-500">Soma dos Pontos Obtidos</p>
            </CardContent>
          </Card>
          <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Relatório</CardTitle>
                <Download className="h-4 w-4 text-gray-600" />
             </CardHeader>
             <CardContent>
                <Button variant="outline" size="sm" className="w-full" onClick={handleExportCSV} disabled={!stats}>
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
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-blue-900">1. Cabeçalho (Dados do Docente)</CardTitle>
                            <p className="text-xs text-blue-700">Preencha os dados abaixo antes de responder às perguntas.</p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={handleExportPDF} className="bg-white border-blue-200 text-blue-800 hover:bg-blue-50">
                            <Printer className="mr-2 h-4 w-4" /> Baixar Ficha (PDF)
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <Label>Departamento</Label>
                        <Input value={header.department} onChange={e => setHeader({...header, department: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <Label>Categoria</Label>
                        <Select value={header.category} onChange={e => setHeader({...header, category: e.target.value as TeacherCategory})}>
                            <option value="assistente">Assistente</option>
                            <option value="assistente_estagiario">Assistente Estagiário</option>
                            <option value="pleno">Pleno</option>
                        </Select>
                        <p className="text-[10px] text-gray-500">Influencia a pontuação final.</p>
                    </div>
                    <div className="space-y-2">
                        <Label>Função</Label>
                        <Input value={header.function} onChange={e => setHeader({...header, function: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <Label>Regime de Contratação</Label>
                        <Input value={header.contractRegime} onChange={e => setHeader({...header, contractRegime: e.target.value})} placeholder="Tempo Inteiro / Parcial" />
                    </div>
                    <div className="space-y-2">
                        <Label>Período de Trabalho</Label>
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
                    <CardTitle>2. Indicadores de Desempenho (Pontos Obtidos)</CardTitle>
                    <p className="text-sm text-gray-500">Preencha as <strong>quantidades</strong>. O sistema calculará os PONTOS OBTIDOS automaticamente.</p>
                </CardHeader>
                <CardContent className="space-y-6">
                    
                    {/* Common Questions */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900 border-b pb-2 bg-gray-50 p-2 rounded">Nº de disciplinas que leccionou por ano (TOTAL 20)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
                            <div className="space-y-2">
                                <Label>Quantas Disciplinas de Graduação Leccionou? (15 pts)</Label>
                                <Input type="number" min="0" value={answers.gradSubjects} onChange={e => setAnswers({...answers, gradSubjects: parseInt(e.target.value)||0})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Quantas Disciplinas de Pós-Graduação Leccionou? (5 pts)</Label>
                                <Input type="number" min="0" value={answers.postGradSubjects} onChange={e => setAnswers({...answers, postGradSubjects: parseInt(e.target.value)||0})} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900 border-b pb-2 bg-gray-50 p-2 rounded">Nº de horas de docência por semana (TOTAL 35)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-2">
                            <div className="space-y-2">
                                <Label>Nº de Aulas teóricas leccionadas por semana? (16 pts)</Label>
                                <Input type="number" min="0" value={answers.theoryHours} onChange={e => setAnswers({...answers, theoryHours: parseInt(e.target.value)||0})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Nº de Aulas praticas leccionadas por semana? (14 pts)</Label>
                                <Input type="number" min="0" value={answers.practicalHours} onChange={e => setAnswers({...answers, practicalHours: parseInt(e.target.value)||0})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Nº de Consultas para estudantes? (5 pts)</Label>
                                <Input type="number" min="0" value={answers.consultationHours} onChange={e => setAnswers({...answers, consultationHours: parseInt(e.target.value)||0})} />
                            </div>
                        </div>
                    </div>

                    {/* Assistente Only Questions */}
                    {(header.category === 'assistente' || header.category === 'pleno') && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                            <h3 className="font-semibold text-gray-900 border-b pb-2 bg-gray-50 p-2 rounded">Supervisão e coordenação académica por ano (TOTAL 20)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-2">
                                <div className="space-y-2">
                                    <Label>Nº de dissertações orientadas de graduação? (6 pts)</Label>
                                    <Input type="number" min="0" value={answers.gradSupervision} onChange={e => setAnswers({...answers, gradSupervision: parseInt(e.target.value)||0})} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nº de teses orientadas de pós-graduação? (6 pts)</Label>
                                    <Input type="number" min="0" value={answers.postGradSupervision} onChange={e => setAnswers({...answers, postGradSupervision: parseInt(e.target.value)||0})} />
                                </div>
                                <div className="space-y-2">
                                    <Label>N° de disciplinas de regência? (8 pts)</Label>
                                    <Input type="number" min="0" value={answers.regencySubjects} onChange={e => setAnswers({...answers, regencySubjects: parseInt(e.target.value)||0})} />
                                </div>
                            </div>
                        </div>
                    )}
                     
                    {header.category === 'assistente_estagiario' && (
                        <div className="p-4 bg-yellow-50 text-yellow-800 text-sm rounded-md">
                            <p><strong>Nota:</strong> Assistentes Estagiários não preenchem o campo de Supervisão e Coordenação.</p>
                        </div>
                    )}

                    <div className="pt-6 border-t space-y-2">
                        <Label>Observações / Comentários</Label>
                        <Input placeholder="Espaço para observações opcionais..." />
                        <Button type="submit" size="lg" className="w-full md:w-auto min-w-[200px] mt-4" disabled={saving}>
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
