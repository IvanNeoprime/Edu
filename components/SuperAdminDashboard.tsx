
import React, { useState, useEffect } from 'react';
import { BackendService } from '../services/backend';
import { Institution } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from './ui';
import { Building2, Plus, Mail, Trash2, User as UserIcon, AlertTriangle, Lock, Upload, Image as ImageIcon } from 'lucide-react';

export const SuperAdminDashboard: React.FC = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [newInstName, setNewInstName] = useState('');
  const [newInstCode, setNewInstCode] = useState('');
  const [newInstLogo, setNewInstLogo] = useState(''); // Base64
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await BackendService.getInstitutions();
    setInstitutions(data);
    setLoading(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 500 * 1024) { // 500KB limit for localStorage safety
              alert("Por favor escolha um logo menor que 500KB.");
              return;
          }
          const reader = new FileReader();
          reader.onload = (ev) => setNewInstLogo(ev.target?.result as string);
          reader.readAsDataURL(file);
      }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstName || !newInstCode || !inviteEmail || !inviteName || !invitePassword) {
        alert("Por favor preencha todos os campos, incluindo a senha do Gestor.");
        return;
    }

    try {
        // Create Institution
        const newInst = await BackendService.createInstitution({
          name: newInstName,
          code: newInstCode,
          managerEmails: [inviteEmail],
          logo: newInstLogo
        });
    
        // Create Manager Account with Password
        await BackendService.inviteManager(newInst.id, inviteEmail, inviteName, invitePassword);
    
        setNewInstName('');
        setNewInstCode('');
        setNewInstLogo('');
        setInviteEmail('');
        setInviteName('');
        setInvitePassword('');
        loadData();
        alert(`Instituição criada com sucesso!\n\nGestor criado:\nEmail: ${inviteEmail}\nSenha: ${invitePassword}`);
    } catch (error: any) {
        alert("Erro ao criar instituição: " + error.message);
    }
  };

  const handleDeleteInstitution = async (instId: string, instName: string) => {
      const confirmText = `Tem a certeza que quer eliminar a instituição "${instName}"? Esta ação é IRREVERSÍVEL e irá apagar todos os docentes, alunos, disciplinas e avaliações associadas.`;
      if (window.confirm(confirmText)) {
          try {
              await BackendService.deleteInstitution(instId);
              alert("Instituição eliminada com sucesso.");
              loadData();
          } catch (e: any) {
              alert("Erro ao eliminar instituição: " + e.message);
          }
      }
  };

  const handleReset = async () => {
      const confirm1 = window.confirm("⚠️ PERIGO: Isso apagará TODOS os dados (Instituições, Docentes, Alunos, Notas) do sistema.\n\nApenas a sua conta de Super Admin será mantida.\n\nTem certeza?");
      if (!confirm1) return;
      
      const confirm2 = window.confirm("Última chance: Esta ação é irreversível. Deseja limpar o banco de dados para começar do zero?");
      if (!confirm2) return;

      setResetting(true);
      try {
        await BackendService.resetSystem();
        alert("Sistema resetado com sucesso.");
      } catch (e) {
        alert("Erro ao resetar: " + e);
      } finally {
        setResetting(false);
      }
  };

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-6xl mx-auto animate-fade-in">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Super Admin Dashboard</h1>
          <p className="text-gray-500">Gestão Centralizada do Sistema Universitário de Moçambique</p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="destructive" size="sm" onClick={handleReset} disabled={resetting}>
                <AlertTriangle className="h-4 w-4 mr-2" />
                {resetting ? 'Limpando...' : 'Resetar Sistema Completo'}
            </Button>
            <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                Sistema Online
            </div>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {/* List Institutions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Instituições Cadastradas</h2>
          {loading ? (
            <p>Carregando...</p>
          ) : (
            <div className="grid gap-4">
              {institutions.length === 0 ? (
                  <p className="text-gray-500 italic">Nenhuma instituição cadastrada. Use o formulário ao lado.</p>
              ) : (
                  institutions.map((inst) => (
                    <Card key={inst.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border">
                            {inst.logo ? (
                                <img src={inst.logo} alt={inst.name} className="h-full w-full object-cover" />
                            ) : (
                                <Building2 className="h-6 w-6 text-gray-600" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-medium">{inst.name}</h3>
                            <p className="text-sm text-gray-500">Código: {inst.code}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="text-xs text-right text-gray-500 mr-2">
                                <p>Gestores:</p>
                                {inst.managerEmails.map(e => <div key={e}>{e}</div>)}
                            </div>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteInstitution(inst.id, inst.name)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </div>
          )}
        </div>

        {/* Create New */}
        <div>
          <Card className="border-gray-300 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" /> Adicionar Nova Instituição
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-5">
                
                {/* Institution Info */}
                <div className="space-y-3 p-3 bg-gray-50 rounded-md border">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Dados da Instituição</h4>
                    <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="name">Nome da Universidade</Label>
                            <Input 
                                id="name" 
                                placeholder="Ex: Universidade Lúrio" 
                                value={newInstName}
                                onChange={(e) => setNewInstName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2 w-24">
                            <Label>Logo</Label>
                            <div className="relative h-10 w-full">
                                <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                <div className="h-full w-full border rounded flex items-center justify-center bg-white hover:bg-gray-50">
                                    {newInstLogo ? <img src={newInstLogo} className="h-full w-full object-contain p-1" /> : <ImageIcon className="h-4 w-4 text-gray-400" />}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="code">Sigla / Código</Label>
                        <Input 
                            id="code" 
                            placeholder="Ex: UNILURIO" 
                            value={newInstCode}
                            onChange={(e) => setNewInstCode(e.target.value)}
                        />
                    </div>
                </div>

                {/* Manager Info */}
                <div className="space-y-3 p-3 bg-blue-50 rounded-md border border-blue-100">
                    <h4 className="text-sm font-semibold text-blue-800 uppercase tracking-wider">Gestor Inicial (Obrigatório)</h4>
                    <div className="space-y-2">
                        <Label htmlFor="mgrName">Nome Completo do Gestor</Label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input 
                                id="mgrName" 
                                placeholder="Ex: Dr. António Silva" 
                                className="pl-9"
                                value={inviteName}
                                onChange={(e) => setInviteName(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Institucional</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input 
                                id="email" 
                                type="email" 
                                placeholder="gestor@unilurio.ac.mz" 
                                className="pl-9"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="pwd">Senha Inicial</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input 
                                id="pwd" 
                                type="text" // Visible for admin to copy
                                placeholder="Defina a senha do gestor" 
                                className="pl-9"
                                value={invitePassword}
                                onChange={(e) => setInvitePassword(e.target.value)}
                            />
                        </div>
                    </div>
                    <p className="text-xs text-blue-600 pt-1">
                        * O gestor usará este email e senha para o primeiro acesso.
                    </p>
                </div>

                <Button type="submit" className="w-full h-11 text-base">
                  Criar Instituição e Conta do Gestor
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};