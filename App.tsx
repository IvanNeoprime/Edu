
import React, { useState, useEffect } from 'react';
import { User, UserRole, Institution } from './types';
import { BackendService } from './services/backend';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Select } from './components/ui';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { ManagerDashboard } from './components/ManagerDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { GraduationCap, ShieldCheck, ArrowRight, UserPlus, LogIn, User as UserIcon, Database, HardDrive, Key, BookOpen, AlertCircle } from 'lucide-react';

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
  
  // Auth State
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');

  useEffect(() => {
      const init = async () => {
          try {
            // 1. Lightweight Health Check (Safe to fail)
            const health = await BackendService.checkHealth();
            setSystemMode(health.mode);
          
            // 2. Load Session (from LocalStorage/Cache)
            try {
                const sessionUser = await BackendService.getSession();
                if (sessionUser) {
                    setUser(sessionUser);
                }
            } catch(e) {
                console.warn("Erro ao recuperar sessão", e);
            }

          } catch (e) {
              console.error("Fatal initialization error, ensuring UI renders:", e);
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
        alert('Usuário não encontrado ou senha incorreta.');
      }
    } catch (error: any) {
        alert(error.message || 'Erro de conexão');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
      await BackendService.logout();
      setUser(null);
      setEmail('');
      setPassword('');
  }

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
                      {/* Storage Badge in Navbar */}
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

  if (appLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 animate-pulse">Iniciando Sistema...</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 animate-fade-in relative">
        {/* Storage Indicator */}
        <div className="absolute top-4 right-4 text-xs font-mono text-gray-400 flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border shadow-sm">
            {systemMode === 'supabase' ? (
                <><Database size={12} className="text-green-500" /> Online (DB)</>
            ) : (
                <><HardDrive size={12} className="text-orange-500" /> Modo Local (Offline)</>
            )}
        </div>

        <div className="mb-8 text-center">
            <div className="mx-auto h-16 w-16 bg-black text-white rounded-2xl flex items-center justify-center mb-4 shadow-xl">
                <GraduationCap size={32} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">AvaliaDocente MZ</h1>
            <p className="text-gray-500 mt-2">Sistema Nacional de Avaliação Académica</p>
        </div>

        <Card className="w-full max-w-md shadow-lg border-0 transition-all duration-300">
          <CardHeader className="space-y-1 pb-4 border-b">
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
                    Não tem conta? <br/>
                    O cadastro de novos estudantes e docentes é realizado exclusivamente pela <strong>Secretaria ou Gestão Académica</strong> da sua instituição.
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
