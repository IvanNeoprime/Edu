
import React, { useState, useEffect, useMemo } from 'react';
import { BackendService } from '../services/backend';
import { Institution, User, UserRole } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from './ui';
import { Building2, Plus, Mail, Trash2, User as UserIcon, AlertTriangle, Lock, Upload, Image as ImageIcon, BarChart3, PieChart as PieIcon, TrendingUp, Info } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid, AreaChart, Area } from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-100 shadow-2xl rounded-xl ring-1 ring-black/5">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{label || payload[0].name}</p>
        <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{backgroundColor: payload[0].color || payload[0].fill}} />
            <p className="text-sm font-bold text-gray-900">{payload[0].value} <span className="font-medium text-gray-500">{payload[0].unit || 'Unidades'}</span></p>
        </div>
      </div>
    );
  }
  return null;
};

export const SuperAdminDashboard: React.FC = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list');
  
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
        <div className="flex bg-gray-100 p-1.5 rounded-2xl shadow-inner">
            <button onClick={() => setActiveTab('list')} className={`px-6 py-2.5 text-xs font-black rounded-xl transition-all ${activeTab === 'list' ? 'bg-white shadow-xl text-black scale-105' : 'text-gray-400 hover:text-gray-600'}`}>LISTAGEM</button>
            <button onClick={() => setActiveTab('stats')} className={`px-6 py-2.5 text-xs font-black rounded-xl transition-all ${activeTab === 'stats' ? 'bg-white shadow-xl text-black scale-105' : 'text-gray-400 hover:text-gray-600'}`}>ESTATÍSTICAS</button>
        </div>
      </header>

      {activeTab === 'list' ? (
        <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-4">
                <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                    <Building2 className="text-blue-600" size={24}/> Instituições Ativas
                </h2>
                <div className="grid gap-4">
                    {institutions.map((inst) => (
                        <Card key={inst.id} className="group hover:border-blue-400 hover:shadow-xl transition-all rounded-2xl">
                            <CardContent className="p-5 flex items-center justify-between">
                                <div className="flex items-center gap-5">
                                    <div className="h-14 w-14 rounded-2xl bg-gray-50 flex items-center justify-center border-2 border-transparent group-hover:border-blue-100 font-black text-blue-600 uppercase transition-all">{inst.code.slice(0,2)}</div>
                                    <div>
                                        <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight leading-none mb-1">{inst.name}</h3>
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{inst.managerEmails[0]}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => BackendService.deleteInstitution(inst.id).then(loadData)} className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl"><Trash2 size={20}/></Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
            <Card className="shadow-2xl border-none ring-1 ring-black/5 rounded-[2rem]">
                <CardHeader className="bg-gray-50/50 rounded-t-[2rem] border-b p-8"><CardTitle className="uppercase tracking-widest text-xs font-black opacity-50">Registo de Universidade</CardTitle></CardHeader>
                <CardContent className="p-8">
                    <form onSubmit={handleCreate} className="space-y-6">
                        <div className="space-y-2"><Label className="uppercase text-[10px] font-black opacity-50 ml-1">Nome Oficial</Label><Input placeholder="Ex: Universidade Eduardo Mondlane" value={newInstName} onChange={e=>setNewInstName(e.target.value)} /></div>
                        <div className="space-y-2"><Label className="uppercase text-[10px] font-black opacity-50 ml-1">Sigla / Código</Label><Input placeholder="Ex: UEM" value={newInstCode} onChange={e=>setNewInstCode(e.target.value)} /></div>
                        <div className="p-6 bg-blue-50/50 rounded-[2rem] border-2 border-blue-100 border-dashed space-y-4">
                            <div className="flex items-center gap-2 mb-2"><Info size={14} className="text-blue-600" /><Label className="text-blue-800 font-black text-[10px] uppercase">Credenciais do Gestor Primário</Label></div>
                            <Input className="bg-white border-blue-100" placeholder="Email institucional" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} />
                            <Input className="bg-white border-blue-100" placeholder="Nome completo" value={inviteName} onChange={e=>setInviteName(e.target.value)} />
                            <Input className="bg-white border-blue-100" type="password" placeholder="Senha provisória" value={invitePassword} onChange={e=>setInvitePassword(e.target.value)} />
                        </div>
                        <Button type="submit" className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">Criar Sistema Académico</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-4">
            <Card className="rounded-[2.5rem] border-none shadow-xl">
                <CardHeader className="p-8 pb-0"><CardTitle className="text-xs uppercase font-black text-gray-400 tracking-widest flex items-center gap-2"><PieIcon size={16} className="text-violet-500"/> Utilizadores Globais</CardTitle></CardHeader>
                <CardContent className="h-[300px] p-8">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie 
                                data={roleData} 
                                cx="50%" cy="50%" 
                                innerRadius={75} outerRadius={95} 
                                paddingAngle={8} 
                                dataKey="value"
                                stroke="none"
                                animationBegin={0}
                                animationDuration={1500}
                                cornerRadius={10}
                            >
                                {/* Fix: Removed invalid cornerRadius prop from Cell */}
                                {roleData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase'}} />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="lg:col-span-2 rounded-[2.5rem] border-none shadow-xl">
                <CardHeader className="p-8 pb-0"><CardTitle className="text-xs uppercase font-black text-gray-400 tracking-widest flex items-center gap-2"><BarChart3 size={16} className="text-blue-500"/> Volume por Instituição</CardTitle></CardHeader>
                <CardContent className="h-[300px] p-8">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={institutionVolumeData} barGap={12}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '20px'}} />
                            <Bar dataKey="alunos" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={24} />
                            <Bar dataKey="docentes" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={24} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="lg:col-span-3 rounded-[2.5rem] border-none shadow-xl overflow-hidden">
                <CardHeader className="p-8 pb-0"><CardTitle className="text-xs uppercase font-black text-gray-400 tracking-widest flex items-center gap-2"><TrendingUp size={16} className="text-emerald-500"/> Crescimento de Instituições</CardTitle></CardHeader>
                <CardContent className="h-[320px] p-0 pt-8">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={growthTrend}>
                            <defs>
                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} padding={{left: 20, right: 20}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} hide />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={5} fillOpacity={1} fill="url(#colorCount)" dot={{r: 6, fill: '#10b981', strokeWidth: 3, stroke: '#fff'}} activeDot={{r: 8, strokeWidth: 0}} />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
};
