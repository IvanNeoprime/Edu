
import React, { useState, useEffect } from 'react';
import { BackendService } from '../services/backend';
import { User, UserRole } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from './ui';
import { Users, UserPlus, Key, GraduationCap } from 'lucide-react';

interface Props {
  user: User;
}

export const DepartmentManagerDashboard: React.FC<Props> = ({ user }) => {
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [newStdName, setNewStdName] = useState('');
  const [newStdEmail, setNewStdEmail] = useState('');
  const [newStdPwd, setNewStdPwd] = useState('');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const allUsers = await BackendService.getUsers();
    // Filtrar apenas alunos desta instituição e deste departamento
    const myStudents = allUsers.filter(u => 
        u.role === UserRole.STUDENT && 
        u.institutionId === user.institutionId &&
        u.department === user.department
    );
    setStudents(myStudents);
    setLoading(false);
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
        setNewStdName('');
        setNewStdEmail('');
        setNewStdPwd('');
        loadData();
    } catch (error: any) {
        alert("Erro ao cadastrar estudante: " + error.message);
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <header className="border-b pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestão de Departamento</h1>
            <p className="text-gray-500">Departamento: <span className="font-semibold text-gray-900">{user.department}</span></p>
        </div>
      </header>

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
                        <Input 
                            value={newStdName} 
                            onChange={e => setNewStdName(e.target.value)} 
                            placeholder="Ex: Ana Maria"
                            required 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Email Institucional</Label>
                        <Input 
                            type="email"
                            value={newStdEmail} 
                            onChange={e => setNewStdEmail(e.target.value)} 
                            placeholder="aluno@uni.ac.mz"
                            required 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Senha Inicial</Label>
                        <div className="relative">
                            <Key className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <Input 
                                value={newStdPwd} 
                                onChange={e => setNewStdPwd(e.target.value)} 
                                placeholder="Defina a senha inicial"
                                className="pl-9"
                                required 
                            />
                        </div>
                    </div>
                    <Button type="submit" className="w-full">
                        Adicionar Estudante
                    </Button>
                    <p className="text-xs text-gray-500 text-center">
                        O estudante usará este email e senha para fazer login.
                    </p>
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
                    {students.length === 0 ? (
                        <p className="text-gray-500 italic text-center py-4">Nenhum estudante neste departamento.</p>
                    ) : (
                        students.map(std => (
                            <div key={std.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                                        <Users className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{std.name}</p>
                                        <p className="text-xs text-gray-500">{std.email}</p>
                                    </div>
                                </div>
                                <div className="text-xs text-blue-600 font-medium">
                                    Ativo
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
};
