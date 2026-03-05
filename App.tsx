
import React, { useState, useEffect } from 'react';
import { User, UserRole, Institution } from './types';
import { BackendService } from './services/backend';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Select } from './components/ui';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { ManagerDashboard } from './components/ManagerDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { useToast } from './components/ToastContext';
import { GraduationCap, ShieldCheck, ArrowRight, UserPlus, LogIn, User as UserIcon, Database, HardDrive, Key, BookOpen, AlertCircle, Menu, X, LogOut, ChevronDown } from 'lucide-react';

function ChangePasswordModal({ user, onPasswordChanged }: { user: User, onPasswordChanged: () => void }) {
  const { addToast } = useToast();
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
      addToast('Palavra-passe alterada com sucesso!', 'success');
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
  const { addToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [appLoading, setAppLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [systemMode, setSystemMode] = useState<string>('local');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  
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

      // PWA Install Logic
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setIsInstallable(true);
      });

      window.addEventListener('appinstalled', () => {
        setIsInstallable(false);
        setDeferredPrompt(null);
      });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await BackendService.login(email, password);
      if (result) {
        setUser(result.user);
      } else {
        addToast('Usuário não encontrado ou senha incorreta.', 'error');
      }
    } catch (error: any) {
        addToast(error.message || 'Erro de conexão', 'error');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
      await BackendService.logout();
      setUser(null);
      setEmail('');
      setPassword('');
      setMobileMenuOpen(false);
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
      <nav className="bg-white border-b sticky top-0 z-50 shadow-sm print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                  {/* Logo Area */}
                  <div className="flex items-center gap-2">
                      <div className="bg-[#0F172A] text-white p-1.5 rounded-xl shrink-0 shadow-md border border-white/10">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <span className="font-bold text-lg hidden sm:block tracking-tight truncate text-gray-900">AvaliaDocente MZ</span>
                      <span className="font-bold text-lg sm:hidden tracking-tight text-gray-900">ADMZ</span>
                  </div>

                  {/* Desktop Actions */}
                  <div className="hidden md:flex items-center gap-2 md:gap-4">
                      {/* Storage Badge */}
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-500 border">
                          {systemMode === 'supabase' ? (
                              <><Database size={12} className="text-green-600" /> Conectado</>
                          ) : (
                              <><HardDrive size={12} className="text-orange-500" /> Local</>
                          )}
                      </div>

                      <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gray-200 overflow-hidden border border-gray-300 shrink-0">
                              {user?.avatar ? <img src={user.avatar} className="h-full w-full object-cover" /> : <UserIcon className="h-5 w-5 m-2 text-gray-500" />}
                          </div>
                          <div className="text-right leading-tight">
                              <div className="text-sm font-medium truncate max-w-[150px]">{user?.name}</div>
                              <div className="text-xs text-gray-500 capitalize flex items-center justify-end gap-1">
                                  {user?.role === UserRole.TEACHER && !user?.approved && (
                                      <span className="w-2 h-2 bg-yellow-400 rounded-full" title="Pendente"></span>
                                  )}
                                  {user?.role.replace('_', ' ')}
                              </div>
                          </div>
                      </div>
                      <div className="h-6 w-px bg-gray-200 mx-1"></div>
                      <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-600 hover:text-red-700 hover:bg-red-50">Sair</Button>
                  </div>

                  {/* Mobile Profile Trigger (Replaces Hamburger) */}
                  <div className="md:hidden flex items-center">
                    <button 
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="flex items-center gap-2 focus:outline-none bg-gray-50 p-1 pr-2 rounded-full border"
                    >
                        <div className="h-8 w-8 rounded-full bg-gray-200 overflow-hidden border border-gray-300 shrink-0">
                            {user?.avatar ? <img src={user.avatar} className="h-full w-full object-cover" /> : <UserIcon className="h-5 w-5 m-1.5 text-gray-500" />}
                        </div>
                        <ChevronDown size={14} className={`text-gray-500 transition-transform duration-200 ${mobileMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
              </div>
          </div>

          {/* Mobile User Menu Dropdown (Triggered by Avatar) */}
          {mobileMenuOpen && (
              <div className="md:hidden absolute top-16 right-0 w-full sm:w-80 bg-white border-b sm:border-l sm:border-b shadow-xl z-50 animate-in slide-in-from-top-2">
                  <div className="p-4 space-y-4">
                      {/* User Info Card */}
                      <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border">
                          <div className="h-12 w-12 rounded-full bg-white border-2 border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                              {user?.avatar ? <img src={user.avatar} className="h-full w-full object-cover" /> : <UserIcon className="h-6 w-6 text-gray-400" />}
                          </div>
                          <div className="overflow-hidden">
                              <p className="font-bold text-gray-900 truncate">{user?.name}</p>
                              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                              <p className="text-xs text-blue-600 font-medium capitalize mt-1 px-2 py-0.5 bg-blue-50 rounded-full inline-block">
                                  {user?.role.replace('_', ' ')}
                              </p>
                          </div>
                      </div>

                      {/* System Status */}
                      <div className="flex items-center justify-between px-2 text-sm text-gray-600">
                          <span>Status do Sistema:</span>
                          <span className="flex items-center gap-1.5 font-medium">
                              {systemMode === 'supabase' ? (
                                  <><Database size={14} className="text-green-600" /> Online</>
                              ) : (
                                  <><HardDrive size={14} className="text-orange-500" /> Modo Local</>
                              )}
                          </span>
                      </div>

                      <div className="border-t pt-2">
                          <Button 
                            variant="destructive" 
                            className="w-full flex items-center gap-2 justify-center" 
                            onClick={handleLogout}
                          >
                              <LogOut size={16} /> Sair do Sistema
                          </Button>
                      </div>
                  </div>
              </div>
          )}
      </nav>
      <main className="pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );

  if (appLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 animate-pulse">Iniciando Sistema...</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0F172A] p-4 animate-fade-in relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />

        {/* Storage Indicator */}
        <div className="absolute top-4 right-4 text-[10px] font-mono text-gray-400 flex items-center gap-1.5 bg-white/5 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 shadow-xl">
            {systemMode === 'supabase' ? (
                <><Database size={10} className="text-emerald-400" /> Online (DB)</>
            ) : (
                <><HardDrive size={10} className="text-orange-400" /> Modo Local</>
            )}
        </div>

        <div className="mb-8 text-center px-4 relative z-10">
            <div className="mx-auto h-20 w-20 bg-white/5 backdrop-blur-xl rounded-[24px] flex items-center justify-center mb-6 shadow-2xl border border-blue-500/20 relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-[24px]" />
                <div className="absolute -inset-0.5 bg-blue-500/10 blur-xl rounded-[24px] group-hover:bg-blue-500/20 transition-all duration-500" />
                <GraduationCap size={40} className="text-white relative z-10" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">AvaliaDocente MZ</h1>
            <p className="text-gray-400 mt-2 text-sm md:text-base font-light">Sistema Nacional de Avaliação Académica</p>
            
            {isInstallable && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleInstallClick}
                className="mt-6 bg-white/5 border-white/10 text-white hover:bg-white/10 backdrop-blur-md animate-pulse rounded-full px-6"
              >
                <Database size={14} className="mr-2" /> Instalar no Ecrã Principal
              </Button>
            )}
        </div>

        <Card className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl relative z-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          <CardHeader className="space-y-1 pb-4 border-b border-white/5 relative z-10">
            <CardTitle className="text-2xl font-bold text-center text-white">
                Acesso ao Sistema
            </CardTitle>
            <p className="text-center text-xs text-gray-400 font-light">
                Insira suas credenciais institucionais para continuar.
            </p>
          </CardHeader>
          <CardContent className="pt-8 relative z-10">
            <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-300 text-xs uppercase tracking-wider font-semibold">Email Institucional</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="nome@universidade.ac.mz" 
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:ring-blue-500/50 h-12"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password" title="Senha" className="text-gray-300 text-xs uppercase tracking-wider font-semibold">Palavra-Passe</Label>
                    <Input 
                        id="password" 
                        type="password" 
                        placeholder="••••••••" 
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:ring-blue-500/50 h-12"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg shadow-blue-900/20 transition-all duration-300 font-semibold" disabled={loading}>
                    {loading ? 'Verificando...' : 'Entrar no Sistema'} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-white/5 text-center">
                <p className="text-[10px] text-gray-500 leading-relaxed max-w-[280px] mx-auto">
                    O cadastro de novos estudantes e docentes é realizado pela <strong>Secretaria Académica</strong> da sua instituição.
                </p>
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-10 flex items-center gap-2 text-gray-500 text-[10px] font-medium tracking-widest uppercase">
            <ShieldCheck size={12} className="text-emerald-500/50"/>
            <span>Segurança e Anonimato MZ</span>
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
