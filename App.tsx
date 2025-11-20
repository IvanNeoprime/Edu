
import React, { useState, useEffect } from 'react';
import { User, UserRole, Institution } from './types';
import { BackendService } from './services/backend';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Select } from './components/ui';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { ManagerDashboard } from './components/ManagerDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { GraduationCap, ShieldCheck, ArrowRight, UserPlus, LogIn } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [appLoading, setAppLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Auth State
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('ivandromaoze138@gmai.com');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Registration State
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState<UserRole>(UserRole.STUDENT);
  const [regInstId, setRegInstId] = useState('');
  const [institutions, setInstitutions] = useState<Institution[]>([]);

  const refreshInstitutions = async () => {
    try {
      const data = await BackendService.getInstitutions();
      setInstitutions(data);
    } catch (e) {
      console.warn("Não foi possível carregar instituições.");
    }
  };

  useEffect(() => {
      const init = async () => {
          // 1. Lightweight Health Check
          await BackendService.checkHealth();
          
          // 2. Load Session (from LocalStorage/Cache)
          try {
            const sessionUser = await BackendService.getSession();
            if (sessionUser) {
                setUser(sessionUser);
            }
          } catch(e) {
            console.warn("Erro ao recuperar sessão", e);
          }

          // 3. Load Institutions
          refreshInstitutions();
          
          setAppLoading(false);
      };
      init();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await BackendService.login(email, password);
      if (result) {
        setUser(result.user);
      } else {
        alert('Usuário não encontrado ou senha incorreta.');
      }
    } catch (error: any) {
        alert(error.message || 'Erro de conexão');
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      if (password !== confirmPassword) {
          alert("As senhas não coincidem.");
          return;
      }
      if (!regInstId) {
          alert("Por favor selecione uma instituição.");
          return;
      }
      
      setLoading(true);
      try {
          const newUser = await BackendService.register({
              name: regName,
              email: email,
              role: regRole,
              institutionId: regInstId,
              password: password,
          });
          
          if (regRole === UserRole.TEACHER) {
            alert('Cadastro realizado! Aguarde a aprovação do gestor institucional.');
            setIsLogin(true);
          } else {
            alert('Cadastro realizado com sucesso!');
            setUser(newUser);
          }
      } catch (error: any) {
          alert(error.message || "Erro ao criar conta");
      }
      setLoading(false);
  };

  const handleLogout = async () => {
      await BackendService.logout();
      setUser(null);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setIsLogin(true);
      refreshInstitutions();
  }

  const switchToRegister = () => {
      setIsLogin(false);
      setPassword('');
      setConfirmPassword('');
      refreshInstitutions();
  };

  // --- Router Logic ---
  const renderDashboard = () => {
    if (!user) return null;
    switch (user.role) {
      case UserRole.SUPER_ADMIN: return <SuperAdminDashboard />;
      case UserRole.INSTITUTION_MANAGER: return user.institutionId ? <ManagerDashboard institutionId={user.institutionId} /> : <div>Erro: Sem instituição.</div>;
      case UserRole.TEACHER: return <TeacherDashboard user={user} />;
      case UserRole.STUDENT: return <StudentDashboard user={user} />;
      default: return <div>Role desconhecido.</div>;
    }
  };

  if (appLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Iniciando Sistema Local...</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 animate-fade-in">
        <div className="mb-8 text-center">
            <div className="mx-auto h-16 w-16 bg-black text-white rounded-2xl flex items-center justify-center mb-4 shadow-xl">
                <GraduationCap size={32} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">AvaliaDocente MZ</h1>
            <p className="text-gray-500 mt-2">Sistema Nacional de Avaliação Académica (Modo Local)</p>
        </div>

        <Card className="w-full max-w-md shadow-lg border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
                {isLogin ? 'Acesso ao Sistema' : 'Criar Nova Conta'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLogin ? (
                <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                    <Label htmlFor="email">Email Institucional</Label>
                    <Input 
                    id="email" 
                    type="email" 
                    placeholder="nome@universidade.ac.mz" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input 
                        id="password" 
                        type="password" 
                        placeholder="••••••••" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading ? 'Verificando...' : 'Entrar'} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                </form>
            ) : (
                <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                    <div className="space-y-2">
                        <Label>Nome Completo</Label>
                        <Input 
                            placeholder="Ex: João Tique" 
                            value={regName}
                            onChange={e => setRegName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Email Institucional</Label>
                        <Input 
                            type="email" 
                            placeholder="nome@universidade.ac.mz" 
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Senha</Label>
                            <Input 
                                type="password" 
                                value={password}
                                onChange={e => setPassword(e.target.value)} 
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Confirmar Senha</Label>
                            <Input 
                                type="password" 
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)} 
                                required
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                            <Label>Tipo de Conta</Label>
                            <Select 
                                value={regRole} 
                                onChange={e => setRegRole(e.target.value as UserRole)}
                            >
                                <option value={UserRole.STUDENT}>Estudante</option>
                                <option value={UserRole.TEACHER}>Docente</option>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Instituição de Ensino</Label>
                        <Select 
                            value={regInstId} 
                            onChange={e => setRegInstId(e.target.value)}
                            required
                            onFocus={refreshInstitutions}
                        >
                            <option value="">Selecione sua universidade...</option>
                            {institutions.map(inst => (
                                <option key={inst.id} value={inst.id}>{inst.name}</option>
                            ))}
                        </Select>
                    </div>

                    <Button type="submit" className="w-full h-11" disabled={loading}>
                        {loading ? 'Criando Conta...' : 'Confirmar Cadastro'}
                    </Button>
                </form>
            )}
            
            <div className="mt-6 pt-4 border-t flex justify-center">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { 
                        if(isLogin) switchToRegister(); 
                        else setIsLogin(true); 
                    }}
                    className="text-gray-500 hover:text-black"
                >
                    {isLogin ? (
                        <><UserPlus className="mr-2 h-4 w-4" /> Não tem conta? Cadastre-se</>
                    ) : (
                        <><LogIn className="mr-2 h-4 w-4" /> Já tem conta? Entrar</>
                    )}
                </Button>
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-8 flex items-center gap-2 text-gray-400 text-xs">
            <ShieldCheck size={14} />
            <span>Segurança e Anonimato Garantidos</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b sticky top-0 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                  <div className="flex items-center gap-2">
                      <div className="bg-black text-white p-1.5 rounded-lg">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <span className="font-bold text-lg hidden sm:block tracking-tight">AvaliaDocente MZ</span>
                  </div>
                  <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block leading-tight">
                          <div className="text-sm font-medium">{user.name}</div>
                          <div className="text-xs text-gray-500 capitalize flex items-center justify-end gap-1">
                              {user.role === UserRole.TEACHER && !user.approved && (
                                  <span className="w-2 h-2 bg-yellow-400 rounded-full" title="Pendente"></span>
                              )}
                              {user.role.replace('_', ' ')}
                          </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleLogout}>Sair</Button>
                  </div>
              </div>
          </div>
      </nav>
      <main>
        {renderDashboard()}
      </main>
    </div>
  );
}
