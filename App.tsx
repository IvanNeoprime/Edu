
import React, { useState, useEffect } from 'react';
import { User, UserRole, Institution } from './types';
import { BackendService } from './services/backend';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Select } from './components/ui';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { ManagerDashboard } from './components/ManagerDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { GraduationCap, ShieldCheck, ArrowRight, UserPlus, LogIn, User as UserIcon, Database, HardDrive, Key, BookOpen, AlertCircle, ShieldAlert, Wrench, Terminal } from 'lucide-react';

function ChangePasswordModal({ user, onPasswordChanged }: { user: User, onPasswordChanged: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await BackendService.changePassword(user.id, newPassword);
      alert('Palavra-passe alterada com sucesso!');
      onPasswordChanged();
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao alterar a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
        <CardHeader>
          <CardTitle className="text-xl">Alterar Palavra-Passe</CardTitle>
          <p className="text-sm text-gray-500">Para sua segurança, é necessário definir uma nova palavra-passe para o primeiro acesso.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Palavra-Passe</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Palavra-Passe</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-500 flex items-center gap-2"><AlertCircle size={14}/> {error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Nova Palavra-Passe'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [appLoading, setAppLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [systemMode, setSystemMode] = useState<string>('local');
  const [isSystemEmpty, setIsSystemEmpty] = useState(false);
  const [tableError, setTableError] = useState(false);
  
  // Auth State
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');

  // Setup State
  const [setupEmail, setSetupEmail] = useState('admin@avaliadocente.ac.mz');
  const [setupPassword, setSetupPassword] = useState('admin');
  const [setupName, setSetupName] = useState('AAdmin');

  useEffect(() => {
      const init = async () => {
          try {
            const health = await BackendService.checkHealth();
            setSystemMode(health.mode);
          
            const userCount = await BackendService.getUserCount();
            
            if (userCount === -1) {
                setTableError(true);
            } else if (userCount === 0) {
                setIsSystemEmpty(true);
            } else {
                const sessionUser = await BackendService.getSession();
                if (sessionUser) {
                    setUser(sessionUser);
                }
            }

          } catch (e) {
              console.error("Fatal initialization error:", e);
          } finally {
             setAppLoading(false);
          }
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
        alert('Usuário não encontrado ou senha incorreta. Se você acabou de criar o banco, use a tela de Setup.');
      }
    } catch (error: any) {
        alert(error.message || 'Erro de conexão');
    }
    setLoading(false);
  };

  const handleInitialSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        await BackendService.createInitialAdmin(setupEmail, setupPassword, setupName);
        alert("Administrador configurado com sucesso! Agora você pode fazer login.");
        setIsSystemEmpty(false);
        setEmail(setupEmail);
        setPassword(setupPassword);
    } catch (e: any) {
        alert("Erro na configuração: " + e.message + "\n\nCertifique-se de que executou o script SQL no Supabase e desativou o RLS na tabela 'users'.");
    } finally {
        setLoading(false);
    }
  };

  const handleLogout = async () => {
      await BackendService.logout();
      setUser(null);
      setEmail('');
      setPassword('');
  }

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

  const renderAppLayout = (children: React.ReactNode) => (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b sticky top-0 z-10 shadow-sm print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                  <div className="flex items-center gap-2">
                      <div className="bg-black text-white p-1.5 rounded-lg">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <span className="font-bold text-lg hidden sm:block tracking-tight">AvaliaDocente MZ</span>
                  </div>
                  <div className="flex items-center gap-4">
                      <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-500 border">
                          {systemMode === 'supabase' ? (
                              <><Database size={12} className="text-green-600" /> Conectado</>
                          ) : (
                              <><HardDrive size={12} className="text-orange-500" /> Armazenamento Local</>
                          )}
                      </div>

                      <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gray-200 overflow-hidden border border-gray-300">
                              {user?.avatar ? <img src={user.avatar} className="h-full w-full object-cover" /> : <UserIcon className="h-5 w-5 m-2 text-gray-500" />}
                          </div>
                          <div className="text-right hidden sm:block leading-tight">
                              <div className="text-sm font-medium">{user?.name}</div>
                              <div className="text-xs text-gray-500 capitalize flex items-center justify-end gap-1">
                                  {user?.role === UserRole.TEACHER && !user?.approved && (
                                      <span className="w-2 h-2 bg-yellow-400 rounded-full" title="Pendente"></span>
                                  )}
                                  {user?.role.replace('_', ' ')}
                              </div>
                          </div>
                      </div>
                      <div className="h-6 w-px bg-gray-200 mx-2"></div>
                      <Button variant="ghost" size="sm" onClick={handleLogout}>Sair</Button>
                  </div>
              </div>
          </div>
      </nav>
      <main>
        {children}
      </main>
    </div>
  );

  if (appLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 animate-pulse text-lg font-medium">Iniciando Sistema de Avaliação...</div>;

  // Erro Estrutural: Tabelas não existem
  if (tableError) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
              <Card className="w-full max-w-xl shadow-2xl border-red-100 ring-2 ring-red-50">
                  <CardHeader className="bg-red-50 border-b">
                      <CardTitle className="flex items-center gap-2 text-red-900">
                          <Terminal className="h-6 w-6" /> Erro Estrutural no Supabase
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                      <div className="bg-white border p-4 rounded-lg flex gap-4">
                          <AlertCircle className="text-red-500 shrink-0" size={32} />
                          <div>
                              <p className="font-bold text-gray-900">As tabelas necessárias não foram encontradas no seu projeto.</p>
                              <p className="text-sm text-gray-600 mt-2">Siga estes passos no seu painel do Supabase:</p>
                              <ol className="text-sm text-gray-600 list-decimal ml-4 mt-2 space-y-1">
                                  <li>Vá em <strong>SQL Editor</strong>.</li>
                                  <li>Copie o script contido em <code>DOCUMENTACAO_SUPABASE.md</code> neste app.</li>
                                  <li>Cole no editor e clique em <strong>Run</strong>.</li>
                                  <li>Vá em <strong>Table Editor</strong> e clique nos <code>...</code> das tabelas para <strong>Disable RLS</strong>.</li>
                              </ol>
                          </div>
                      </div>
                      <Button onClick={() => window.location.reload()} className="w-full bg-red-600 hover:bg-red-700">
                          Tentei os passos, recarregar sistema
                      </Button>
                  </CardContent>
              </Card>
          </div>
      )
  }

  // Render Setup Wizard if system is virgin
  if (isSystemEmpty) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 animate-in fade-in duration-700">
            <div className="mb-8 text-center">
                <div className="mx-auto h-20 w-20 bg-indigo-600 text-white rounded-3xl flex items-center justify-center mb-6 shadow-2xl rotate-3">
                    <Wrench size={40} />
                </div>
                <h1 className="text-4xl font-black tracking-tight text-gray-900 mb-2">Setup Inicial</h1>
                <p className="text-gray-500 max-w-sm">Detectamos que seu banco de dados está vazio. Configure o primeiro Super Administrador.</p>
            </div>

            <Card className="w-full max-w-md shadow-2xl border-0 ring-1 ring-gray-200">
                <CardHeader className="bg-indigo-50/50 border-b">
                    <CardTitle className="flex items-center gap-2 text-indigo-900">
                        <ShieldAlert className="h-5 w-5" /> Configurar Super Admin
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <form onSubmit={handleInitialSetup} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nome do Administrador</Label>
                            <Input value={setupName} onChange={e => setSetupName(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Email Institucional Principal</Label>
                            <Input type="email" value={setupEmail} onChange={e => setSetupEmail(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Senha do Sistema</Label>
                            <Input type="text" value={setupPassword} onChange={e => setSetupPassword(e.target.value)} required />
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-xs flex gap-2">
                            <AlertCircle size={20} className="shrink-0" />
                            <p>Anote estas credenciais. Elas serão necessárias para gerenciar todas as instituições do sistema.</p>
                        </div>
                        <Button type="submit" className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-lg shadow-lg shadow-indigo-200" disabled={loading}>
                            {loading ? 'Configurando...' : 'Finalizar Setup e Criar Admin'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 animate-fade-in relative overflow-hidden">
        {/* Decorative Background Element */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>
        
        <div className="absolute top-4 right-4 text-xs font-mono text-gray-400 flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border shadow-sm">
            {systemMode === 'supabase' ? (
                <><Database size={12} className="text-green-500" /> Online (DB)</>
            ) : (
                <><HardDrive size={12} className="text-orange-500" /> Modo Local (Offline)</>
            )}
        </div>

        <div className="mb-8 text-center animate-in slide-in-from-top-4 duration-1000">
            <div className="mx-auto h-16 w-16 bg-black text-white rounded-2xl flex items-center justify-center mb-4 shadow-xl">
                <GraduationCap size={32} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">AvaliaDocente MZ</h1>
            <p className="text-gray-500 mt-2">Sistema Nacional de Avaliação Académica</p>
        </div>

        <Card className="w-full max-w-md shadow-2xl border-0 transition-all duration-300">
          <CardHeader className="space-y-1 pb-4 border-b bg-gray-50/50">
            <CardTitle className="text-2xl font-bold text-center">
                Acesso ao Sistema
            </CardTitle>
            <p className="text-center text-xs text-gray-500">
                Insira suas credenciais institucionais para continuar.
            </p>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in">
                <div className="space-y-2">
                    <Label htmlFor="email">Email Institucional</Label>
                    <Input 
                    id="email" 
                    type="email" 
                    placeholder="Ex: nome@universidade.ac.mz" 
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

            <div className="mt-6 pt-4 border-t text-center">
                <p className="text-xs text-gray-400">
                    O cadastro de novos usuários é realizado exclusivamente pela <strong>Secretaria ou Gestão Académica</strong>.
                </p>
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

  if (user.mustChangePassword) {
    return (
        <>
            <div className="filter blur-sm pointer-events-none">
                {renderAppLayout(renderDashboard())}
            </div>
            <ChangePasswordModal 
                user={user}
                onPasswordChanged={() => setUser({ ...user, mustChangePassword: false })}
            />
        </>
    );
  }

  return renderAppLayout(renderDashboard());
}
