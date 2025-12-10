
import React, { useState, useEffect } from 'react';
import { User, CombinedScore, SelfEvaluation, TeacherCategory, Questionnaire, Question } from '../types';
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
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  
  // Header Metadata (Still Fixed)
  const [header, setHeader] = useState<SelfEvaluation['header']>({
      department: '',
      category: 'assistente',
      function: 'Docente',
      contractRegime: 'Tempo Inteiro',
      workPeriod: 'Laboral',
      academicYear: new Date().getFullYear().toString()
  });
  
  // Dynamic Answers
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [user.id]);

  const loadData = async () => {
    const data = await BackendService.getTeacherStats(user.id);
    setStats(data);
    
    // Load Self Eval Questionnaire
    if (user.institutionId) {
        const q = await BackendService.getQuestionnaire(user.institutionId, 'teacher_self');
        setQuestionnaire(q);
        
        // Load Existing Answers
        const savedEval = await BackendService.getSelfEval(user.id);
        if (savedEval) {
            setHeader(savedEval.header);
            // Ensure answers map correctly to current questions
            setAnswers(savedEval.answers || {});
        }
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
          + `Auto-Avaliação,${stats.selfEvalScore}\n` 
          + `Avaliação dos Alunos (Ponderada),${stats.studentScore}\n`
          + `Avaliação Qualitativa,${stats.institutionalScore}\n`
          + `SCORE FINAL TOTAL,${stats.finalScore}\n`;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `relatorio_${user.name}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleExportPDF = () => {
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text("FICHA DE AUTO-AVALIAÇÃO", 105, 15, { align: 'center' });
      doc.setFontSize(10);
      
      const startY = 30;
      doc.text(`Docente: ${user.name}`, 14, startY);
      doc.text(`Categoria: ${header.category}`, 14, startY + 6);
      doc.text(`Ano: ${header.academicYear}`, 14, startY + 12);

      let totalSelf = 0;
      const rows = questionnaire?.questions.map(q => {
          const val = answers[q.id] || 0;
          const points = val * (q.weight || 0);
          totalSelf += points;
          return [q.category || '', q.text, val, points];
      }) || [];

      rows.push(['TOTAL', '', '', totalSelf]);

      autoTable(doc, {
          startY: startY + 20,
          head: [['Categoria', 'Indicador', 'Qtd', 'Pontos']],
          body: rows,
          theme: 'grid',
      });
      doc.save(`Ficha_${user.name}.pdf`);
  };

  // Group questions by category
  const groupedQuestions = React.useMemo<Record<string, Question[]>>(() => {
      if (!questionnaire) return {};
      const groups: Record<string, Question[]> = {};
      questionnaire.questions.forEach(q => {
          const cat = q.category || 'Geral';
          if (!groups[cat]) groups[cat] = [];
          groups[cat].push(q);
      });
      return groups;
  }, [questionnaire]);

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <header className="border-b pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Painel do Docente</h1>
            <p className="text-gray-500">Acompanhamento de Desempenho e Auto-Avaliação</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'stats' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>Resultados</button>
            <button onClick={() => setActiveTab('self-eval')} className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'self-eval' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>Auto-Avaliação</button>
        </div>
      </header>

      {activeTab === 'stats' ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Pontuação Final</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats?.finalScore || 0}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Alunos (12%)</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats?.studentScore || 0}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Auto-Avaliação (80%)</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats?.selfEvalScore || 0}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Institucional (8%)</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats?.institutionalScore || 0}</div></CardContent></Card>
          
          <Card className="col-span-full mt-4">
             <CardContent className="pt-6">
                <Button variant="outline" className="w-full" onClick={handleExportCSV} disabled={!stats}><Download className="mr-2 h-4 w-4" /> Exportar Relatório</Button>
             </CardContent>
          </Card>
        </div>
      ) : (
        <form onSubmit={handleSaveSelfEval} className="space-y-6">
            {/* Header */}
            <Card className="bg-blue-50 border-blue-100">
                <CardHeader><CardTitle className="text-blue-900">1. Dados do Docente</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1"><Label>Departamento</Label><Input value={header.department} onChange={e => setHeader({...header, department: e.target.value})} /></div>
                    <div className="space-y-1"><Label>Categoria</Label><Select value={header.category} onChange={e => setHeader({...header, category: e.target.value as TeacherCategory})}><option value="assistente">Assistente</option><option value="assistente_estagiario">Assistente Estagiário</option><option value="pleno">Pleno</option></Select></div>
                    <div className="space-y-1"><Label>Ano Lectivo</Label><Input value={header.academicYear} onChange={e => setHeader({...header, academicYear: e.target.value})} /></div>
                </CardContent>
            </Card>

            {/* Questions */}
            <Card>
                <CardHeader>
                    <CardTitle>2. Indicadores de Desempenho</CardTitle>
                    <p className="text-sm text-gray-500">Preencha as quantidades. Os pontos são calculados automaticamente com base no peso de cada item.</p>
                </CardHeader>
                <CardContent className="space-y-6">
                    {!questionnaire ? <p>Carregando formulário...</p> : 
                      Object.entries(groupedQuestions).map(([cat, questions]) => (
                        <div key={cat} className="space-y-4">
                            <h3 className="font-semibold text-gray-900 border-b pb-2 bg-gray-50 p-2 rounded">{cat}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-2">
                                {(questions as Question[]).map(q => (
                                    <div key={q.id} className="space-y-2">
                                        <Label className="text-sm">{q.text} (x{q.weight} pts)</Label>
                                        <Input 
                                            type="number" min="0" 
                                            value={answers[q.id] || 0} 
                                            onChange={e => setAnswers({...answers, [q.id]: parseInt(e.target.value)||0})} 
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                      ))
                    }

                    <div className="pt-6 border-t">
                        <Button type="submit" size="lg" className="w-full md:w-auto" disabled={saving}>
                            {saving ? 'Salvando...' : <><Save className="mr-2 h-4 w-4" /> Salvar Auto-Avaliação</>}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </form>
      )}
    </div>
  );
};
