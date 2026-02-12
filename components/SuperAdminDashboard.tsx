import React, { useState, useEffect, useMemo } from 'react';
import { BackendService } from '../services/backend';
import { Institution, User, UserRole, Question } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from './ui';
import { Building2, Plus, Mail, Trash2, User as UserIcon, AlertTriangle, Lock, Upload, Image as ImageIcon, BarChart3, PieChart as PieIcon, TrendingUp, Info, FileText, Star } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid } from 'recharts';

export const SuperAdminDashboard: React.FC = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'stats' | 'template'>('list');
  
  const [newInstName, setNewInstName] = useState('');
  const [newInstCode, setNewInstCode] = useState('');
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
        const newInst = await BackendService.createInstitution({ name: newInstName, code: newInstCode, managerEmails: [inviteEmail] });
        await BackendService.inviteManager(newInst.id, inviteEmail, inviteName, invitePassword);
        setNewInstName(''); setNewInstCode(''); setInviteEmail(''); setInviteName(''); setInvitePassword('');
        loadData();
    } catch (error: any) { alert(error.message); }
  };

  const roleData = useMemo(() => [
    { name: 'Alunos', value: users.filter(u => u.role === UserRole.STUDENT).length, color: '#3b82f6' },
    { name: 'Docentes', value: users.filter(u => u.role === UserRole.TEACHER).length, color: '#8b5cf6' },
    { name: 'Gestores', value: users.filter(u => u.role === UserRole.INSTITUTION_MANAGER).length, color: '#10b981' },
  ], [users]);

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 uppercase">Super Admin Portal</h1>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest opacity-60">Consola Nacional • Moçambique</p>
        </div>
        <div className="flex bg-gray-100/50 p-1 rounded-xl border border-gray-200">
            <button onClick={() => setActiveTab('list')} className={`px-4 py-2 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest ${activeTab === 'list' ? 'bg-white shadow-sm text-black border border-gray-200' : 'text-gray-400'}`}>Universidades</button>
            <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest ${activeTab === 'stats' ? 'bg-white shadow-sm text-black border border-gray-200' : 'text-gray-400'}`}>Métricas</button>
            <button onClick={() => setActiveTab('template')} className={`px-4 py-2 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest ${activeTab === 'template' ? 'bg-white shadow-sm text-black border border-gray-200' : 'text-gray-400'}`}>Template Inquérito</button>
        </div>
      </header>

      {activeTab === 'list' ? (
        <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-4">
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Instituições Ativas ({institutions.length})</h2>
                <div className="grid gap-4">
                    {institutions.map((inst) => (
                        <Card key={inst.id} className="hover:shadow-lg transition-all rounded-2xl border-none shadow-sm">
                            <CardContent className="p-5 flex items-center justify-between">
                                <div className="flex items-center gap-5">
                                    <div className="h-14 w-14 rounded-2xl bg-gray-50 flex items-center justify-center border font-black text-blue-600 uppercase text-xl">{inst.code.slice(0,2)}</div>
                                    <div>
                                        <h3 className="font-black text-gray-900 uppercase tracking-tight leading-none mb-1">{inst.name}</h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{inst.managerEmails[0]}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => BackendService.deleteInstitution(inst.id).then(loadData)} className="text-gray-300 hover:text-red-500 rounded-xl"><Trash2 size={18}/></Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
            <Card className="shadow-2xl border-none rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-gray-50 border-b p-8"><CardTitle className="uppercase tracking-widest text-[10px] font-black opacity-40">Nova Universidade</CardTitle></CardHeader>
                <CardContent className="p-8">
                    <form onSubmit={handleCreate} className="space-y-4">
                        <Input placeholder="Nome Completo da Instituição" value={newInstName} onChange={e=>setNewInstName(e.target.value)} className="h-11 font-bold" />
                        <Input placeholder="Código / Sigla (UEM, UP...)" value={newInstCode} onChange={e=>setNewInstCode(e.target.value)} className="h-11 font-bold" />
                        <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-4">
                            <Label className="text-blue-800 font-black text-[10px] uppercase tracking-widest">Credenciais do Gestor Primário</Label>
                            <Input placeholder="Email do Gestor" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} className="bg-white" />
                            <Input placeholder="Nome Completo" value={inviteName} onChange={e=>setInviteName(e.target.value)} className="bg-white" />
                            <Input placeholder="Palavra-passe Inicial" value={invitePassword} onChange={e=>setInvitePassword(e.target.value)} className="bg-white" />
                        </div>
                        <Button type="submit" className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100">Instanciar Sistema Académico</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
      ) : activeTab === 'stats' ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="rounded-[2rem] border-none shadow-xl">
                <CardHeader><CardTitle className="text-xs uppercase font-black text-gray-400 tracking-widest flex items-center gap-2"><PieIcon size={16}/> Distribuição Global</CardTitle></CardHeader>
                <CardContent className="h-64 p-8">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            {/* FIX: Move cornerRadius from Cell to Pie component as it is not a valid prop for Cell */}
                            <Pie data={roleData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value" stroke="none" cornerRadius={8}>
                                {roleData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <Tooltip />
                            <Legend wrapperStyle={{fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase'}} />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            {/* Outros gráficos poderiam ir aqui */}
        </div>
      ) : (
        <Card className="rounded-[2.5rem] border-none shadow-2xl p-10 max-w-4xl mx-auto">
            <header className="flex justify-between items-center mb-8 border-b pb-6">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter">Template Padrão Nacional</h2>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Inquérito Base para Novas Instituições</p>
                </div>
                <Button className="h-11 px-8 rounded-xl font-black uppercase text-xs tracking-widest">Salvar Template</Button>
            </header>
            <div className="space-y-4">
                <div className="p-6 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center gap-4 text-center">
                    <FileText size={40} className="text-gray-200" />
                    <p className="text-xs text-gray-400 font-medium">Este questionário é injetado automaticamente em todas as universidades recém-criadas. O Gestor Local poderá customizá-lo posteriormente.</p>
                </div>
                {/* Aqui viria uma versão simplificada do editor do ManagerDashboard */}
            </div>
        </Card>
      )}
    </div>
  );
};