
import React, { useState, useEffect, useMemo } from 'react';
import { BackendService } from '../services/backend';
import { Institution, User, UserRole } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from './ui';
import { Building2, Plus, Mail, Trash2, User as UserIcon, AlertTriangle, Lock, Upload, Image as ImageIcon, BarChart3, PieChart as PieIcon, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid } from 'recharts';

export const SuperAdminDashboard: React.FC = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list');
  
  // Form States
  const [newInstName, setNewInstName] = useState('');
  const [newInstCode, setNewInstCode] = useState('');
  const [newInstLogo, setNewInstLogo] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitePassword, setInvitePassword] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const insts = await BackendService.getInstitutions();
    const allUsers = await BackendService.getUsers();
    setInstitutions(insts);
    setUsers(allUsers);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const newInst = await BackendService.createInstitution({
          name: newInstName,
          code: newInstCode,
          managerEmails: [inviteEmail],
          logo: newInstLogo
        });
        await BackendService.inviteManager(newInst.id, inviteEmail, inviteName, invitePassword);
        setNewInstName(''); setNewInstCode(''); setInviteEmail(''); setInviteName(''); setInvitePassword('');
        loadData();
        alert(`Instituição e Gestor criados com sucesso!`);
    } catch (error: any) { alert("Erro: " + error.message); }
  };

  // Data for Charts
  const roleData = useMemo(() => [
    { name: 'Alunos', value: users.filter(u => u.role === UserRole.STUDENT).length, color: '#3b82f6' },
    { name: 'Docentes', value: users.filter(u => u.role === UserRole.TEACHER).length, color: '#8b5cf6' },
    { name: 'Gestores', value: users.filter(u => u.role === UserRole.INSTITUTION_MANAGER).length, color: '#10b981' },
  ], [users]);

  const institutionVolumeData = useMemo(() => institutions.map(inst => ({
    name: inst.code,
    docentes: users.filter(u => u.institutionId === inst.id && u.role === UserRole.TEACHER).length,
    alunos: users.filter(u => u.institutionId === inst.id && u.role === UserRole.STUDENT).length
  })), [institutions, users]);

  const growthTrend = [
    { month: 'Jan', count: 2 }, { month: 'Fev', count: 5 }, { month: 'Mar', count: 8 },
    { month: 'Abr', count: 12 }, { month: 'Mai', count: 15 }, { month: 'Jun', count: institutions.length }
  ];

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 uppercase">Super Admin Portal</h1>
          <p className="text-gray-500 font-medium">Consola de Gestão Nacional • Moçambique</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl">
            <button onClick={() => setActiveTab('list')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'list' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>LISTAGEM</button>
            <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'stats' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>ESTATÍSTICAS</button>
        </div>
      </header>

      {activeTab === 'list' ? (
        <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-4">
                <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Instituições Ativas</h2>
                <div className="grid gap-4">
                    {institutions.map((inst) => (
                        <Card key={inst.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-gray-50 flex items-center justify-center border font-black text-blue-600 uppercase">{inst.code.slice(0,2)}</div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{inst.name}</h3>
                                        <p className="text-xs text-gray-500 font-medium">{inst.managerEmails[0]}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => BackendService.deleteInstitution(inst.id).then(loadData)} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
            <Card className="shadow-xl border-2 border-black/5">
                <CardHeader><CardTitle className="uppercase tracking-tighter">Registar Nova Universidade</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <Input placeholder="Nome da Instituição" value={newInstName} onChange={e=>setNewInstName(e.target.value)} />
                        <Input placeholder="Sigla (Ex: UEM)" value={newInstCode} onChange={e=>setNewInstCode(e.target.value)} />
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-3">
                            <Label className="text-blue-800 font-black text-[10px] uppercase">Acesso do Gestor</Label>
                            <Input placeholder="Email do Gestor" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} />
                            <Input placeholder="Nome do Gestor" value={inviteName} onChange={e=>setInviteName(e.target.value)} />
                            <Input placeholder="Senha Provisória" value={invitePassword} onChange={e=>setInvitePassword(e.target.value)} />
                        </div>
                        <Button type="submit" className="w-full h-12 rounded-xl font-black uppercase tracking-widest">Criar Sistema</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="lg:col-span-1">
                <CardHeader><CardTitle className="text-sm uppercase flex items-center gap-2"><PieIcon size={16}/> Distribuição de Utilizadores</CardTitle></CardHeader>
                <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={roleData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                {roleData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-sm uppercase flex items-center gap-2"><BarChart3 size={16}/> Alunos vs Docentes por Inst.</CardTitle></CardHeader>
                <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={institutionVolumeData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip cursor={{fill: '#f8fafc'}} />
                            <Legend />
                            <Bar dataKey="alunos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="docentes" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="lg:col-span-3">
                <CardHeader><CardTitle className="text-sm uppercase flex items-center gap-2"><TrendingUp size={16}/> Expansão do Sistema (Instituições)</CardTitle></CardHeader>
                <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={growthTrend}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip />
                            <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={4} dot={{r: 6}} activeDot={{r: 8}} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
};
