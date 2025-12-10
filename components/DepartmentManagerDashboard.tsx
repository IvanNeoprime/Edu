
import React, { useState, useEffect } from 'react';
import { BackendService } from '../services/backend';
import { User, UserRole } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from './ui';
import { Users, UserPlus, Key, GraduationCap, Crown, UserCheck, Shuffle, ArrowRight } from 'lucide-react';

interface Props {
  user: User;
}

export const DepartmentManagerDashboard: React.FC<Props> = ({ user }) => {
  const [students, setStudents] = useState<User[]>([]);
  const [classHeads, setClassHeads] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'students' | 'class_heads'>('students');

  // New Head Mode (Create New vs Promote Existing)
  const [addHeadMode, setAddHeadMode] = useState<'create' | 'promote'>('promote');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // Form State Students
  const [newStdName, setNewStdName] = useState('');
  const [newStdEmail, setNewStdEmail] = useState('');
  const [newStdPwd, setNewStdPwd] = useState('');

  // Form State Class Heads
  const [headName, setHeadName] = useState('');
  const [headEmail, setHeadEmail] = useState('');
  const [headPwd, setHeadPwd] = useState('');
  const [headTurma, setHeadTurma] = useState('');
  const [headClasse, setHeadClasse] = useState('');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const allUsers = await BackendService.getUsers();
    
    const myStudents = allUsers.filter(u => 
        u.role === UserRole.STUDENT && 
        u.institutionId === user.institutionId &&
        u.department === user.department
    );
    
    const myHeads = allUsers.filter(u => 
        u.role === UserRole.CLASS_HEAD && 
        u.institutionId === user.institutionId &&
        u.department === user.department
    );

    setStudents(myStudents);
    setClassHeads(myHeads);
    setLoading(false);
  };

  const generatePassword = () => {
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
      let pass = "";
      for(let i=0; i<6; i++) pass += chars[Math.floor(Math.random() * chars.length)];
      setHeadPwd(pass);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStdName || !newStdEmail || !newStdPwd) {
        alert("Preencha todos os campos.");
        return;
    }

    try {
        await BackendService.addStudent(
            user.institutionId!,
            user.department || 'Geral',
            newStdName,
            newStdEmail,
            newStdPwd
        );
        alert(`Estudante ${newStdName} cadastrado com sucesso!`);
        setNewStdName(''); setNewStdEmail(''); setNewStdPwd('');
        loadData();
    } catch (error: any) {
        alert("Erro ao cadastrar estudante: " + error.message);
    }
  };

  const handleAddClassHead = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          await BackendService.addClassHead(
              user.institutionId!,
              user.department || 'Geral',
              headName,
              headEmail,
              headTurma,
              headClasse,
              headPwd
          );
          alert(`Chefe de Turma ${headName} cadastrado!`);
          setHeadName(''); setHeadEmail(''); setHeadTurma(''); setHeadClasse(''); setHeadPwd('');
          loadData();
      } catch (e: any) {
          alert("Erro: " + e.message);
      }
  };

  const handlePromoteStudent = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedStudentId) {
          alert("Selecione um estudante.");
          return;
      }
      try {
          await BackendService.promoteToClassHead(selectedStudentId, headTurma, headClasse);
          alert("Estudante promovido a Chefe de Turma com sucesso!");
          setSelectedStudentId(''); setHeadTurma(''); setHeadClasse('');
          loadData();
      } catch (e: any) {
          alert("Erro: " + e.message);
      }
  };

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <header className="border-b pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestão de Departamento</h1>
            <p className="text-gray-500">Departamento: <span className="font-semibold text-gray-900">{user.department}</span></p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setActiveTab('students')} className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'students' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>Estudantes</button>
            <button onClick={() => setActiveTab('class_heads')} className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'class_heads' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>Chefes de Turma</button>
        </div>
      </header>

      {activeTab === 'students' ? (
        <div className="grid gap-8 lg:grid-cols-2">
            {/* Add Student Form */}
            <Card>
                <CardHeader className="bg-blue-50 border-b border-blue-100">
                    <CardTitle className="flex items-center gap-2 text-blue-900">
                        <UserPlus className="h-5 w-5" /> Cadastrar Novo Estudante
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <form onSubmit={handleAddStudent} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nome Completo do Estudante</Label>
                            <Input value={newStdName} onChange={e => setNewStdName(e.target.value)} placeholder="Ex: Ana Maria" required />
                        </div>
                        <div className="space-y-2">
                            <Label>Email Institucional</Label>
                            <Input type="email" value={newStdEmail} onChange={e => setNewStdEmail(e.target.value)} placeholder="aluno@uni.ac.mz" required />
                        </div>
                        <div className="space-y-2">
                            <Label>Senha Inicial</Label>
                            <div className="relative">
                                <Key className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <Input value={newStdPwd} onChange={e => setNewStdPwd(e.target.value)} placeholder="Defina a senha inicial" className="pl-9" required />
                            </div>
                        </div>
                        <Button type="submit" className="w-full">Adicionar Estudante</Button>
                    </form>
                </CardContent>
            </Card>

            {/* List Students */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <GraduationCap className="h-5 w-5" /> Estudantes Cadastrados ({students.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                        {students.length === 0 ? <p className="text-gray-500 italic text-center py-4">Nenhum estudante.</p> : 
                            students.map(std => (
                                <div key={std.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600"><Users className="h-4 w-4" /></div>
                                        <div><p className="text-sm font-medium">{std.name}</p><p className="text-xs text-gray-500">{std.email}</p></div>
                                    </div>
                                    <div className="text-xs text-blue-600 font-medium">Ativo</div>
                                </div>
                            ))
                        }
                    </div>
                </CardContent>
            </Card>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
            {/* Add Class Head Form */}
            <Card>
                <CardHeader className="bg-amber-50 border-b border-amber-100 pb-2">
                    <CardTitle className="flex items-center gap-2 text-amber-900 mb-2">
                        <Crown className="h-5 w-5" /> Gerir Chefes de Turma
                    </CardTitle>
                    <div className="flex bg-amber-100/50 p-1 rounded-md">
                        <button 
                            type="button"
                            onClick={() => setAddHeadMode('promote')}
                            className={`flex-1 text-xs font-medium py-1.5 rounded ${addHeadMode === 'promote' ? 'bg-white text-amber-900 shadow-sm' : 'text-amber-700 hover:bg-amber-100'}`}
                        >
                            Promover Estudante
                        </button>
                        <button 
                            type="button"
                            onClick={() => setAddHeadMode('create')}
                            className={`flex-1 text-xs font-medium py-1.5 rounded ${addHeadMode === 'create' ? 'bg-white text-amber-900 shadow-sm' : 'text-amber-700 hover:bg-amber-100'}`}
                        >
                            Novo Cadastro
                        </button>
                    </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    {addHeadMode === 'promote' ? (
                        <form onSubmit={handlePromoteStudent} className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="space-y-2">
                                <Label>Selecione o Estudante</Label>
                                <Select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} required>
                                    <option value="">Escolha da lista...</option>
                                    {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Turma</Label>
                                    <Input value={headTurma} onChange={e => setHeadTurma(e.target.value)} placeholder="Ex: LEI-1" required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Classe / Nível</Label>
                                    <Select value={headClasse} onChange={e => setHeadClasse(e.target.value)} required>
                                        <option value="">Selecione...</option>
                                        <option value="1º Ano">1º Ano</option>
                                        <option value="2º Ano">2º Ano</option>
                                        <option value="3º Ano">3º Ano</option>
                                        <option value="4º Ano">4º Ano</option>
                                        <option value="5º Ano">5º Ano</option>
                                    </Select>
                                </div>
                            </div>
                            <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                                <UserCheck className="mr-2 h-4 w-4" /> Promover a Chefe
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleAddClassHead} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <Label>Nome do Responsável</Label>
                                <Input value={headName} onChange={e => setHeadName(e.target.value)} placeholder="Ex: João Chefe" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Turma</Label>
                                    <Input value={headTurma} onChange={e => setHeadTurma(e.target.value)} placeholder="Ex: LEI-1" required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Classe / Nível</Label>
                                    <Select value={headClasse} onChange={e => setHeadClasse(e.target.value)}>
                                        <option value="">Selecione...</option>
                                        <option value="1º Ano">1º Ano</option>
                                        <option value="2º Ano">2º Ano</option>
                                        <option value="3º Ano">3º Ano</option>
                                        <option value="4º Ano">4º Ano</option>
                                        <option value="5º Ano">5º Ano</option>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input type="email" value={headEmail} onChange={e => setHeadEmail(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Senha</Label>
                                <div className="flex gap-2">
                                    <Input value={headPwd} onChange={e => setHeadPwd(e.target.value)} required placeholder="Mín 6 caracteres" />
                                    <Button type="button" variant="outline" onClick={generatePassword} title="Gerar Senha">
                                        <Shuffle className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                                <Crown className="mr-2 h-4 w-4" /> Cadastrar Novo Chefe
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>

            {/* List Class Heads */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Crown className="h-5 w-5" /> Chefes Ativos ({classHeads.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                     <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                        {classHeads.length === 0 ? <p className="text-gray-500 italic text-center py-4">Nenhum chefe cadastrado.</p> : 
                            classHeads.map(h => (
                                <div key={h.id} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-amber-200 flex items-center justify-center text-amber-700"><Crown className="h-4 w-4" /></div>
                                        <div>
                                            <p className="text-sm font-medium">{h.name}</p>
                                            <p className="text-xs text-gray-500">{h.turma} - {h.classe}</p>
                                        </div>
                                    </div>
                                    <div className="text-xs text-amber-700 font-bold bg-white px-2 py-1 rounded border border-amber-200">Chefe</div>
                                </div>
                            ))
                        }
                    </div>
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
};
