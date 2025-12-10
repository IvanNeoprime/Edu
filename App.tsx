
import React, { useState, useEffect } from 'react';
import { User, UserRole, Institution } from './types';
import { BackendService } from './services/backend';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Select } from './components/ui';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { ManagerDashboard } from './components/ManagerDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { DepartmentManagerDashboard } from './components/DepartmentManagerDashboard';
import { GraduationCap, ShieldCheck, ArrowRight, UserPlus, LogIn } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [appLoading, setAppLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Auth State
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  
  // State for institutions list
  const [institutions, setInstitutions] = useState<Institution[]>([]);

  const refreshInstitutions = async () => {
    try {
      const data = await BackendService.getInstitutions();
      setInstitutions(data);
    } catch (e) {
      console.warn("Não foi possível carregar instituições. Verifique a conexão.", e);
      setInstitutions([]);
    }
  };

  useEffect(() => {
      const init = async () => {
          try {
            await BackendService.checkHealth();
            try {
                const sessionUser = await BackendService.getSession();
                if (sessionUser) {
                    setUser(sessionUser);
                }
            } catch(e) {
                console.warn("Erro ao recuperar sessão", e);
            }
            await refreshInstitutions();
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
      refreshInstitutions();
  }

  // --- Router Logic ---
  const renderDashboard = () => {
    if (!user) return null;
    switch (user.role) {
      case UserRole.SUPER_ADMIN: return <SuperAdminDashboard />;
      case UserRole.INSTITUTION_MANAGER: return user.institutionId ? <ManagerDashboard institutionId={user.institutionId} /> : <div>Erro: Sem instituição.</div>;
      case UserRole.DEPARTMENT_MANAGER: return <DepartmentManagerDashboard user={user} />;
      case UserRole.TEACHER: return <TeacherDashboard user={user} />;
      case UserRole.STUDENT: return <StudentDashboard user={user} />;
      case UserRole.CLASS_HEAD: return <StudentDashboard user={user} />;
      default: return <div>Role desconhecido.</div>;
    }
  };

  if (appLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 animate-pulse">Iniciando Sistema...</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 animate-fade-in">
        <div className="mb-8 text-center">
            <div className="mx-auto h-16 w-16 bg-black text-white rounded-2xl flex items-center justify-center mb-4 shadow-xl">
                <GraduationCap size={32} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">AvaliaDocente MZ</h1>
            <p className="text-gray-500 mt-2">Sistema Nacional de Avaliação Académica</p>
        </div>

        <Card className="w-full max-w-md shadow-lg border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
                Acesso ao Sistema
            </CardTitle>
            <p className="text-center text-xs text-gray-500">
                Alunos e Docentes devem solicitar suas credenciais ao departamento.
            </p>
          </CardHeader>
          <CardContent>
                <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                    <Label htmlFor="email">Email Institucional</Label>
                    <Input 
                    id="email" 
                    type="email" 
                    placeholder="Ex: usuario@universidade.ac.mz" 
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
