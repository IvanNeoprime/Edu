
import React, { useState, useEffect, useMemo } from 'react';
import { BackendService } from '../services/backend';
import { User, UserRole, Subject, Questionnaire, QuestionType, TeacherCategory, Question, Institution } from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from './ui';
// Added Lock and Unlock to resolve missing icons and JSX type mismatch with global types
import { Users, BookOpen, Plus, Trash2, GraduationCap, Settings, Briefcase, CalendarClock, Eye, FileText, X, Lock, Unlock } from 'lucide-react';

interface Props {
  institutionId: string;
}

export const ManagerDashboard: React.FC<Props> = ({ institutionId }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'teachers' | 'students' | 'subjects' | 'questionnaire' | 'settings'>('overview');
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Preview States
  const [previewModal, setPreviewModal] = useState<{ open: boolean; type: 'standard' | 'custom'; data?: Questionnaire | null }>({ open: false, type: 'standard' });

  // New Teacher Form
  const [tName, setTName] = useState('');
  const [tEmail, setTEmail] = useState('');
  const [tPwd, setTPwd] = useState('');
  const [tCat, setTCat] = useState<TeacherCategory>('assistente');

  // New Student Form
  const [sName, setSName] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sPwd, setSPwd] = useState('');
  const [sCourse, setSCourse] = useState('');
  const [sLevel, setSLevel] = useState('1');
  const [sShifts, setSShifts] = useState<string[]>(['Diurno']);
  const [sGroups, setSGroups] = useState('');

  // New Subject Form
  const [subName, setSubName] = useState('');
  const [subCode, setSubCode] = useState('');
  const [subTeacherId, setSubTeacherId] = useState('');
  const [subCourse, setSubCourse] = useState('');
  const [subLevel, setSubLevel] = useState('1');
  const [subShift, setSubShift] = useState<'Diurno' | 'Noturno'>('Diurno');
  const [subGroup, setSubGroup] = useState('A');
  const [subSemester, setSubSemester] = useState('1');

  useEffect(() => { loadData(); }, [institutionId]);

  const loadData = async () => {
    setLoading(true);
    try {
        const inst = await BackendService.getInstitution(institutionId);
        if (inst) setInstitution(inst);
        const allUsers = await BackendService.getUsers();
        setTeachers(allUsers.filter(u => u.role === UserRole.TEACHER && u.institutionId === institutionId));
        setStudents(allUsers.filter(u => u.role === UserRole.STUDENT && u.institutionId === institutionId));
        setSubjects(await BackendService.getInstitutionSubjects(institutionId));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handlePreview = async (type: 'standard' | 'custom') => {
      let data: any = null;
      if (type === 'custom') {
          data = await BackendService.getInstitutionQuestionnaire(institutionId, 'student');
      }
      setPreviewModal({ open: true, type, data });
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tName || !tEmail || !tPwd) return alert("Preencha todos os campos");
    await BackendService.addTeacher(institutionId, tName, tEmail, tPwd, '', tCat);
    setTName(''); setTEmail(''); setTPwd('');
    loadData();
    alert("Docente cadastrado!");
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sName || !sEmail || !sPwd || !sCourse) return alert("Preencha todos os campos obrigatórios");
    await BackendService.addStudent(institutionId, sName, sEmail, sPwd, sCourse, sLevel, '', sShifts, sGroups.split(',').map(g=>g.trim()));
    setSName(''); setSEmail(''); setSPwd(''); setSCourse('');
    loadData();
    alert("Estudante cadastrado!");
  };

  const handleAddSubject = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!subName || !subTeacherId || !subCourse) return alert("Preencha os campos obrigatórios");
      await BackendService.assignSubject({
          name: subName,
          code: subCode,
          institutionId,
          teacherId: subTeacherId,
          course: subCourse,
          level: subLevel,
          shift: subShift,
          classGroup: subGroup,
          semester: subSemester,
          academicYear: new Date().getFullYear().toString()
      });
      setSubName(''); setSubCode('');
      loadData();
      alert("Disciplina criada e vinculada!");
  };

  const handleDeleteUser = async (id: string, name: string) => {
      if (window.confirm(`Eliminar ${name}?`)) {
          await BackendService.deleteUser(id);
          loadData();
      }
  };

  const handleDeleteSubject = async (id: string) => {
      if (window.confirm("Eliminar disciplina?")) {
          await BackendService.deleteSubject(id);
          loadData();
      }
  };

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto animate-fade-in relative">
        {/* Preview Modal */}
        {previewModal.open && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200">
                    <button onClick={() => setPreviewModal({ ...previewModal, open: false })} className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-full">
                        <X size={20} />
                    </button>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Eye className="text-blue-600" />
                            {previewModal.type === 'standard' ? 'Pré-visualização: Questionário Padrão' : 'Pré-visualização: Questionário Atual'}
                        </CardTitle>
                        <p className="text-sm text-gray-500">Esta é a visualização que os estudantes terão no portal.</p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {(previewModal.type === 'standard' || !previewModal.data) ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-blue-50 border-l-4 border-blue-500 text-sm text-blue-700">
                                    Exibindo questões baseadas no formulário padrão do Ministério.
                                </div>
                                {[
                                    "O docente apresentou o programa temático ou analítico da disciplina?",
                                    "O docente apresentou os objetivos da disciplina?",
                                    "O docente foi acessível aos estudantes?",
                                    "O docente avaliou os estudantes dentro dos prazos?"
                                ].map((q, i) => (
                                    <div key={i} className="p-4 border rounded-lg bg-gray-50">
                                        <p className="font-medium text-sm">{i+1}. {q}</p>
                                        <div className="mt-2 flex gap-2">
                                            <div className="h-8 w-20 bg-white border rounded"></div>
                                            <div className="h-8 w-20 bg-white border rounded"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {previewModal.data.questions.map((q, i) => (
                                    <div key={i} className="p-4 border rounded-lg bg-gray-50">
                                        <p className="font-medium text-sm">{i+1}. {q.text}</p>
                                        <p className="text-xs text-gray-400 mt-1 uppercase">Tipo: {q.type}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        <Button onClick={() => setPreviewModal({ ...previewModal, open: false })} className="w-full">Fechar Visualização</Button>
                    </CardContent>
                </Card>
            </div>
        )}

        <header className="border-b pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
              {institution?.logo && <img src={institution.logo} className="h-16 w-16 object-contain" alt="Logo" />}
              <div>
                  <h1 className="text-3xl font-bold tracking-tight">{institution?.name || 'Gestão'}</h1>
                  <p className="text-gray-500">Gestão Académica e de Avaliação</p>
              </div>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-lg flex-wrap gap-1">
              {[
                  {id: 'overview', label: 'Início', icon: Briefcase},
                  {id: 'teachers', label: 'Docentes', icon: Users},
                  {id: 'students', label: 'Estudantes', icon: GraduationCap},
                  {id: 'subjects', label: 'Disciplinas', icon: BookOpen},
                  {id: 'questionnaire', label: 'Inquérito', icon: FileText},
                  {id: 'settings', label: 'Definições', icon: Settings},
              ].map(tab => (
                  <button 
                    key={tab.id} 
                    onClick={() => setActiveTab(tab.id as any)} 
                    className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                      <tab.icon size={16} /> {tab.label}
                  </button>
              ))}
          </div>
        </header>

        {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card><CardContent className="pt-6"><p className="text-xs text-gray-500 uppercase font-bold">Docentes</p><p className="text-3xl font-bold">{teachers.length}</p></CardContent></Card>
                <Card><CardContent className="pt-6"><p className="text-xs text-gray-500 uppercase font-bold">Estudantes</p><p className="text-3xl font-bold">{students.length}</p></CardContent></Card>
                <Card><CardContent className="pt-6"><p className="text-xs text-gray-500 uppercase font-bold">Disciplinas</p><p className="text-3xl font-bold">{subjects.length}</p></CardContent></Card>
                <Card className={institution?.isEvaluationOpen ? 'bg-green-50' : 'bg-red-50'}><CardContent className="pt-6"><p className="text-xs text-gray-500 uppercase font-bold">Estado</p><p className="text-xl font-bold flex items-center gap-2">{institution?.isEvaluationOpen ? <Unlock className="text-green-600" size={20}/> : <Lock className="text-red-600" size={20}/>} {institution?.isEvaluationOpen ? 'Aberto' : 'Fechado'}</p></CardContent></Card>
            </div>
        )}

        {activeTab === 'teachers' && (
            <div className="grid gap-8 lg:grid-cols-12">
                <div className="lg:col-span-5">
                    <Card>
                        <CardHeader><CardTitle>Novo Docente</CardTitle></CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddTeacher} className="space-y-4">
                                <div><Label>Nome Completo</Label><Input value={tName} onChange={e=>setTName(e.target.value)} placeholder="Ex: Dr. Pedro Macuácua" /></div>
                                <div><Label>Email Institucional</Label><Input type="email" value={tEmail} onChange={e=>setTEmail(e.target.value)} placeholder="docente@uni.ac.mz" /></div>
                                <div><Label>Senha Temporária</Label><Input type="password" value={tPwd} onChange={e=>setTPwd(e.target.value)} placeholder="Senha para 1º acesso" /></div>
                                <div>
                                    <Label>Categoria Académica</Label>
                                    <Select value={tCat} onChange={e=>setTCat(e.target.value as any)}>
                                        <option value="assistente">Assistente (Pleno)</option>
                                        <option value="assistente_estagiario">Assistente Estagiário</option>
                                    </Select>
                                </div>
                                <Button type="submit" className="w-full">Cadastrar Docente</Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-7">
                    <Card>
                        <CardHeader><CardTitle>Corpo Docente ({teachers.length})</CardTitle></CardHeader>
                        <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
                            {teachers.map(t => (
                                <div key={t.id} className="p-4 border rounded-lg flex justify-between items-center bg-white hover:bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600">{t.name[0]}</div>
                                        <div>
                                            <p className="font-semibold text-sm">{t.name}</p>
                                            <p className="text-xs text-gray-500">{t.email} • {t.category?.replace('_', ' ')}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={()=>handleDeleteUser(t.id, t.name)} className="text-red-500"><Trash2 size={16}/></Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        )}

        {activeTab === 'students' && (
            <div className="grid gap-8 lg:grid-cols-12">
                <div className="lg:col-span-5">
                    <Card>
                        <CardHeader><CardTitle>Novo Estudante</CardTitle></CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddStudent} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2"><Label>Nome Completo</Label><Input value={sName} onChange={e=>setSName(e.target.value)} /></div>
                                    <div className="col-span-2"><Label>Email</Label><Input type="email" value={sEmail} onChange={e=>setSEmail(e.target.value)} /></div>
                                    <div className="col-span-2"><Label>Senha Inicial</Label><Input type="password" value={sPwd} onChange={e=>setSPwd(e.target.value)} /></div>
                                    <div><Label>Curso</Label><Input value={sCourse} onChange={e=>setSCourse(e.target.value)} placeholder="Ex: Informática" /></div>
                                    <div><Label>Ano de Frequência</Label><Select value={sLevel} onChange={e=>setSLevel(e.target.value)}><option value="1">1º Ano</option><option value="2">2º Ano</option><option value="3">3º Ano</option><option value="4">4º Ano</option><option value="5">5º Ano</option><option value="6">6º Ano</option></Select></div>
                                    <div><Label>Turno</Label><Select value={sShifts[0]} onChange={e=>setSShifts([e.target.value])}><option value="Diurno">Diurno</option><option value="Noturno">Noturno</option></Select></div>
                                    <div><Label>Turmas (Ex: A, B)</Label><Input value={sGroups} onChange={e=>setSGroups(e.target.value)} placeholder="Separar por vírgula" /></div>
                                </div>
                                <Button type="submit" className="w-full">Cadastrar Estudante</Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-7">
                    <Card>
                        <CardHeader><CardTitle>Lista de Estudantes ({students.length})</CardTitle></CardHeader>
                        <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
                            {students.map(s => (
                                <div key={s.id} className="p-4 border rounded-lg flex justify-between items-center bg-white">
                                    <div>
                                        <p className="font-semibold text-sm">{s.name}</p>
                                        <p className="text-xs text-gray-500">{s.course} • {s.level}º Ano • {s.shifts?.join(', ')} • Turma {s.classGroups?.join('/')}</p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={()=>handleDeleteUser(s.id, s.name)} className="text-red-500"><Trash2 size={16}/></Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        )}

        {activeTab === 'subjects' && (
            <div className="grid gap-8 lg:grid-cols-12">
                <div className="lg:col-span-5">
                    <Card>
                        <CardHeader><CardTitle>Registo de Disciplina</CardTitle></CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddSubject} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2"><Label>Nome da Disciplina</Label><Input value={subName} onChange={e=>setSubName(e.target.value)} placeholder="Ex: Algoritmos e Est. Dados" /></div>
                                    <div><Label>Código</Label><Input value={subCode} onChange={e=>setSubCode(e.target.value)} placeholder="Ex: INF101" /></div>
                                    <div>
                                        <Label>Docente Responsável</Label>
                                        <Select value={subTeacherId} onChange={e=>setSubTeacherId(e.target.value)}>
                                            <option value="">Selecionar...</option>
                                            {teachers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                                        </Select>
                                    </div>
                                    <div><Label>Curso Destino</Label><Input value={subCourse} onChange={e=>setSubCourse(e.target.value)} placeholder="Ex: Informática" /></div>
                                    <div><Label>Ano Curricular</Label><Select value={subLevel} onChange={e=>setSubLevel(e.target.value)}><option value="1">1º Ano</option><option value="2">2º Ano</option><option value="3">3º Ano</option><option value="4">4º Ano</option><option value="5">5º Ano</option><option value="6">6º Ano</option></Select></div>
                                    <div><Label>Turno</Label><Select value={subShift} onChange={e=>setSubShift(e.target.value as any)}><option value="Diurno">Diurno</option><option value="Noturno">Noturno</option></Select></div>
                                    <div><Label>Turma</Label><Input value={subGroup} onChange={e=>setSubGroup(e.target.value)} placeholder="Ex: A" /></div>
                                    <div><Label>Semestre</Label><Select value={subSemester} onChange={e=>setSubSemester(e.target.value)}><option value="1">1º Semestre</option><option value="2">2º Semestre</option></Select></div>
                                </div>
                                <Button type="submit" className="w-full">Criar Disciplina e Vincular</Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-7">
                    <Card>
                        <CardHeader><CardTitle>Disciplinas Ativas ({subjects.length})</CardTitle></CardHeader>
                        <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
                            {subjects.map(s => {
                                const teacher = teachers.find(t=>t.id === s.teacherId);
                                return (
                                    <div key={s.id} className="p-4 border rounded-lg flex justify-between items-center bg-white shadow-sm border-l-4 border-l-blue-600">
                                        <div>
                                            <p className="font-bold text-sm">{s.name} <span className="text-gray-400 font-normal">({s.code})</span></p>
                                            <p className="text-xs text-blue-700 font-medium">Docente: {teacher?.name || 'Não vinculado'}</p>
                                            <p className="text-xs text-gray-500 mt-1">{s.course} • {s.level}º Ano • Semestre {s.semester} • Turma {s.classGroup}</p>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={()=>handleDeleteSubject(s.id)} className="text-red-500"><Trash2 size={16}/></Button>
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>
                </div>
            </div>
        )}

        {activeTab === 'questionnaire' && (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Configuração de Questionários</CardTitle>
                        <p className="text-sm text-gray-500">Visualize os inquéritos antes de liberar para os estudantes.</p>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2">
                        <div className="p-6 border rounded-xl bg-slate-50 flex flex-col items-center text-center space-y-4">
                            <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                                <FileText size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg">Modelo Padrão (MECES)</h4>
                                <p className="text-sm text-gray-500">Questionário oficial pré-definido pelo Ministério.</p>
                            </div>
                            <Button variant="outline" className="w-full" onClick={() => handlePreview('standard')}>
                                <Eye className="mr-2 h-4 w-4" /> Pré-visualizar Padrão
                            </Button>
                        </div>

                        <div className="p-6 border rounded-xl bg-indigo-50 flex flex-col items-center text-center space-y-4">
                            <div className="h-12 w-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                                <Settings size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg">Modelo Personalizado</h4>
                                <p className="text-sm text-gray-500">Inquérito customizado pela sua instituição.</p>
                            </div>
                            <Button variant="outline" className="w-full" onClick={() => handlePreview('custom')}>
                                <Eye className="mr-2 h-4 w-4" /> Pré-visualizar Atual
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}

        {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-6">
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="text-blue-600"/> Controlo de Período</CardTitle></CardHeader>
                    <CardContent className="space-y-6 pt-4">
                        <div className="flex items-center justify-between p-4 border rounded-xl bg-gray-50">
                            <div>
                                <h4 className="font-bold">Avaliação Académica</h4>
                                <p className="text-sm text-gray-500">Permite que alunos e docentes submetam inquéritos.</p>
                            </div>
                            <Button 
                                variant={institution?.isEvaluationOpen ? 'destructive' : 'primary'} 
                                onClick={async () => {
                                    const newState = !institution?.isEvaluationOpen;
                                    await BackendService.updateInstitution(institutionId, { isEvaluationOpen: newState });
                                    setInstitution(prev => prev ? {...prev, isEvaluationOpen: newState} : null);
                                    alert(`Período ${newState ? 'Aberto' : 'Fechado'}`);
                                }}
                            >
                                {institution?.isEvaluationOpen ? 'Fechar Período' : 'Abrir Período'}
                            </Button>
                        </div>
                        <div className="space-y-2">
                            <Label>Nome do Período Atual</Label>
                            <Input value={institution?.evaluationPeriodName || ''} onChange={async e => {
                                const val = e.target.value;
                                setInstitution(prev => prev ? {...prev, evaluationPeriodName: val} : null);
                                await BackendService.updateInstitution(institutionId, { evaluationPeriodName: val });
                            }} />
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}
    </div>
  );
};
