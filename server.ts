import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ==================================================================================
// 🚀 CONFIGURAÇÃO DO SUPABASE (BACKEND)
// ==================================================================================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ ERRO CRÍTICO: Variáveis de ambiente SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórias.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DB_KEYS = {
  USERS: 'users',
  INSTITUTIONS: 'institutions',
  SUBJECTS: 'subjects',
  QUESTIONNAIRES: 'questionnaires',
  COURSES: 'courses', 
  RESPONSES: 'responses',
  INST_EVALS: 'inst_evals', 
  SELF_EVALS: 'self_evals',
  SCORES: 'scores',
  QUAL_EVALS: 'qualitative_evals', 
  VOTES_TRACKER: 'votes_tracker',
  AUDIT_LOGS: 'audit_logs',
  ACADEMIC_PERIODS: 'academic_periods',
};

// ==================================================================================
// 🛡️ MIDDLEWARE DE AUTENTICAÇÃO
// ==================================================================================

const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.status(403).json({ error: 'Token inválido ou expirado.' });
        req.user = user;
        next();
    });
};

// ==================================================================================
// 🚀 ROTAS DA API
// ==================================================================================

app.get("/api/health", async (req, res) => {
    try {
        const { error } = await supabase.from(DB_KEYS.INSTITUTIONS).select('id').limit(1);
        if (error) {
            return res.status(500).json({ ok: false, mode: 'local', error: error.message });
        }
        res.json({ ok: true, mode: 'supabase' });
    } catch (e: any) {
        res.status(500).json({ ok: false, mode: 'local', error: e.message });
    }
});

app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data: user, error } = await supabase.from(DB_KEYS.USERS).select('*').eq('email', email).single();
        
        if (error || !user) {
            return res.status(401).json({ error: 'Usuário não encontrado.' });
        }

        // ⚠️ Em produção, use bcrypt.compare(password, user.password)
        // Por compatibilidade com dados legados (texto puro), verificamos ambos
        let passwordMatch = false;
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
             passwordMatch = await bcrypt.compare(password, user.password);
        } else {
             passwordMatch = user.password === password;
        }

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Senha incorreta.' });
        }

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role, institutionId: user.institutionId }, JWT_SECRET, { expiresIn: '24h' });
        
        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;
        
        res.json({ user: userWithoutPassword, token });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/auth/change-password", authenticateToken, async (req, res) => {
    const { userId, newPassword } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const { error } = await supabase.from(DB_KEYS.USERS).update({ password: hashedPassword, mustChangePassword: false }).eq('id', userId);
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- Users ---
app.get("/api/users", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from(DB_KEYS.USERS).select('*').or('deleted.is.null,deleted.eq.false');
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/users/teachers/:institutionId", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from(DB_KEYS.USERS).select('*').eq('institutionId', req.params.institutionId).eq('role', 'TEACHER').eq('approved', true).or('deleted.is.null,deleted.eq.false');
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/users/students/:institutionId", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from(DB_KEYS.USERS).select('*').eq('institutionId', req.params.institutionId).eq('role', 'STUDENT').or('deleted.is.null,deleted.eq.false');
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/users", authenticateToken, async (req, res) => {
    try {
        // Hash password if provided
        const userData = { ...req.body };
        if (userData.password) {
            userData.password = await bcrypt.hash(userData.password, 10);
        }
        
        const { data, error } = await supabase.from(DB_KEYS.USERS).insert([userData]).select().single();
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.put("/api/users/:id", authenticateToken, async (req, res) => {
    try {
        const userData = { ...req.body };
        if (userData.password) {
             userData.password = await bcrypt.hash(userData.password, 10);
        }

        const { data, error } = await supabase.from(DB_KEYS.USERS).update(userData).eq('id', req.params.id).select().single();
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.delete("/api/users/:id", authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase.from(DB_KEYS.USERS).update({ deleted: true }).eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});


// --- Institutions ---
app.get("/api/institutions", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from(DB_KEYS.INSTITUTIONS).select('*');
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/institutions/:id", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from(DB_KEYS.INSTITUTIONS).select('*').eq('id', req.params.id).single();
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/institutions", authenticateToken, async (req, res) => {
    try {
        const newItem = { ...req.body, id: `inst_${Date.now()}`, createdAt: new Date().toISOString() };
        const { data, error } = await supabase.from(DB_KEYS.INSTITUTIONS).insert([newItem]).select().single();
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.put("/api/institutions/:id", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from(DB_KEYS.INSTITUTIONS).update(req.body).eq('id', req.params.id).select().single();
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.delete("/api/institutions/:id", authenticateToken, async (req, res) => {
    try {
        await supabase.from(DB_KEYS.USERS).delete().eq('institutionId', req.params.id);
        await supabase.from(DB_KEYS.SUBJECTS).delete().eq('institutionId', req.params.id);
        await supabase.from(DB_KEYS.COURSES).delete().eq('institutionId', req.params.id);
        await supabase.from(DB_KEYS.QUESTIONNAIRES).delete().eq('institutionId', req.params.id);
        const { error } = await supabase.from(DB_KEYS.INSTITUTIONS).delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- Courses ---
app.get("/api/courses/:institutionId", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from(DB_KEYS.COURSES).select('*').eq('institutionId', req.params.institutionId).or('deleted.is.null,deleted.eq.false');
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/courses", authenticateToken, async (req, res) => {
    try {
        const newCourse = { ...req.body, id: `c_${Date.now()}` };
        const { data, error } = await supabase.from(DB_KEYS.COURSES).insert([newCourse]).select().single();
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.put("/api/courses/:id", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from(DB_KEYS.COURSES).update(req.body).eq('id', req.params.id).select().single();
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.delete("/api/courses/:id", authenticateToken, async (req, res) => {
    try {
        await supabase.from(DB_KEYS.SUBJECTS).update({ deleted: true }).eq('courseId', req.params.id);
        const { error } = await supabase.from(DB_KEYS.COURSES).update({ deleted: true }).eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- Subjects ---
app.get("/api/subjects/:institutionId", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from(DB_KEYS.SUBJECTS).select('*').eq('institutionId', req.params.institutionId).or('deleted.is.null,deleted.eq.false');
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/subjects", authenticateToken, async (req, res) => {
    try {
        let query = supabase.from(DB_KEYS.SUBJECTS)
            .select('*')
            .eq('institutionId', req.body.institutionId)
            .eq('name', req.body.name)
            .eq('classGroup', req.body.classGroup)
            .eq('shift', req.body.shift);
        
        if (req.body.courseId) {
            query = query.eq('courseId', req.body.courseId);
        } else {
            query = query.is('courseId', null);
        }

        const { data: existing } = await query.maybeSingle();

        if (existing) {
            const { data, error } = await supabase.from(DB_KEYS.SUBJECTS).update(req.body).eq('id', existing.id).select().single();
            if (error) throw error;
            res.json(data);
        } else {
            const newItem = { ...req.body, id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
            const { data, error } = await supabase.from(DB_KEYS.SUBJECTS).insert([newItem]).select().single();
            if (error) throw error;
            res.json(data);
        }
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.put("/api/subjects/:id", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from(DB_KEYS.SUBJECTS).update(req.body).eq('id', req.params.id).select().single();
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.delete("/api/subjects/:id", authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase.from(DB_KEYS.SUBJECTS).update({ deleted: true }).eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- Questionnaires ---
app.get("/api/questionnaires/:institutionId/:role", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from(DB_KEYS.QUESTIONNAIRES).select('*').eq('institutionId', req.params.institutionId).eq('targetRole', req.params.role).maybeSingle();
        if (data) {
            res.json(data);
        } else {
            // Return default
            res.json({
                id: `def_${req.params.role}_${req.params.institutionId}`,
                institutionId: req.params.institutionId,
                title: req.params.role === 'student' ? 'Avaliação de Desempenho Docente' : 'Inquérito Institucional',
                questions: [], // We'll handle defaults in frontend for now
                active: true,
                targetRole: req.params.role
            });
        }
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/questionnaires", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from(DB_KEYS.QUESTIONNAIRES).upsert(req.body).select().single();
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- Evaluations & Scores ---
app.get("/api/scores/:institutionId", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from(DB_KEYS.SCORES).select('*');
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/scores/teacher/:teacherId", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from(DB_KEYS.SCORES).select('*').eq('teacherId', req.params.teacherId).maybeSingle();
        if (error) throw error;
        res.json(data || null);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/evaluations/qualitative", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from(DB_KEYS.QUAL_EVALS).upsert(req.body).select().single();
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/evaluations/qualitative/:teacherId", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from(DB_KEYS.QUAL_EVALS).select('*').eq('teacherId', req.params.teacherId).maybeSingle();
        if (error) throw error;
        res.json(data || null);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/evaluations/self", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from(DB_KEYS.SELF_EVALS).upsert(req.body).select().single();
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/evaluations/self/:teacherId", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from(DB_KEYS.SELF_EVALS).select('*').eq('teacherId', req.params.teacherId).maybeSingle();
        if (error) throw error;
        res.json(data || null);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/responses", authenticateToken, async (req, res) => {
    try {
        const { userId, response } = req.body;
        
        await supabase.from(DB_KEYS.VOTES_TRACKER).upsert([{ 
            userId, 
            subjectId: response.subjectId, 
            institutionId: response.institutionId 
        }], { onConflict: 'userId,subjectId' });

        const { data, error } = await supabase.from(DB_KEYS.RESPONSES).insert([response]).select().single();
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/comments/:institutionId/:teacherId", authenticateToken, async (req, res) => {
    try {
        const { data: responses, error: rError } = await supabase.from(DB_KEYS.RESPONSES).select('*').eq('teacherId', req.params.teacherId).eq('institutionId', req.params.institutionId);
        if (rError) throw rError;
        
        const { data: subjects, error: sError } = await supabase.from(DB_KEYS.SUBJECTS).select('*').eq('institutionId', req.params.institutionId);
        if (sError) throw sError;

        const subjectGroups: Record<string, string[]> = {};
        
        (responses || []).forEach(resp => {
            const sId = resp.subjectId || 'unknown';
            if (!subjectGroups[sId]) subjectGroups[sId] = [];
            
            const answers = resp.answers || [];
            answers.forEach((ans: any) => {
                if (typeof ans.value === 'string' && ans.value.length > 3 && isNaN(Number(ans.value))) {
                    subjectGroups[sId].push(ans.value);
                }
            });
        });

        const groupedComments = Object.keys(subjectGroups).map(sId => {
            const subject = (subjects || []).find(s => s.id === sId);
            return {
                subjectName: subject?.name || (sId === 'general' ? 'Geral' : 'Disciplina Desconhecida'),
                classGroup: subject?.classGroup || 'N/A',
                shift: subject?.shift || 'N/A',
                comments: subjectGroups[sId]
            };
        }).filter(group => group.comments.length > 0);

        res.json(groupedComments);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- Audit Logs ---
app.post("/api/audit", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from(DB_KEYS.AUDIT_LOGS).insert([{...req.body, timestamp: new Date().toISOString()}]).select().single();
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/audit/:institutionId", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from(DB_KEYS.AUDIT_LOGS).select('*').eq('institutionId', req.params.institutionId).order('timestamp', { ascending: false }).limit(100);
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- Academic Periods ---
app.get("/api/academic-periods/:institutionId", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from(DB_KEYS.ACADEMIC_PERIODS).select('*').eq('institutionId', req.params.institutionId);
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/academic-periods", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from(DB_KEYS.ACADEMIC_PERIODS).insert([req.body]).select().single();
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.put("/api/academic-periods/current", authenticateToken, async (req, res) => {
    try {
        const { institutionId, periodId } = req.body;
        await supabase.from(DB_KEYS.ACADEMIC_PERIODS).update({ isCurrent: false }).eq('institutionId', institutionId);
        const { data, error } = await supabase.from(DB_KEYS.ACADEMIC_PERIODS).update({ isCurrent: true }).eq('id', periodId).select().single();
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- Progress ---
app.get("/api/progress/:studentId", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from(DB_KEYS.VOTES_TRACKER).select('subjectId').eq('userId', req.params.studentId);
        if (error) throw error;
        const evaluatedSubjectIds = (data || []).map(d => d.subjectId);
        res.json({
            completed: evaluatedSubjectIds.length,
            pending: 0,
            history: [],
            evaluatedSubjectIds
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- Unapproved Teachers ---
app.get("/api/users/unapproved/:institutionId", authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from(DB_KEYS.USERS).select('*').eq('institutionId', req.params.institutionId).eq('role', 'TEACHER').eq('approved', false);
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- Calculate Scores (OPTIMIZED BULK FETCH) ---
app.post("/api/scores/calculate", authenticateToken, async (req, res) => {
    try {
        const { institutionId, teacherId } = req.body;
        
        // 1. BULK FETCH: Carregar todos os dados necessários de uma vez
        const [
            { data: subjects },
            { data: allResponses },
            { data: teachers },
            { data: qStudent },
            { data: inst },
            { data: allSelfEvals },
            { data: allQualEvals }
        ] = await Promise.all([
            supabase.from(DB_KEYS.SUBJECTS).select('*').eq('institutionId', institutionId),
            supabase.from(DB_KEYS.RESPONSES).select('*').eq('institutionId', institutionId),
            supabase.from(DB_KEYS.USERS).select('*').eq('role', 'TEACHER').eq('institutionId', institutionId).eq('approved', true),
            supabase.from(DB_KEYS.QUESTIONNAIRES).select('*').eq('institutionId', institutionId).eq('targetRole', 'student').maybeSingle(),
            supabase.from(DB_KEYS.INSTITUTIONS).select('*').eq('id', institutionId).single(),
            supabase.from(DB_KEYS.SELF_EVALS).select('*'), // Idealmente filtrar por teacherIds se possível, mas ok para escala média
            supabase.from(DB_KEYS.QUAL_EVALS).select('*')
        ]);

        const questions = qStudent?.questions || [];
        const questionMap = new Map(questions.map((q: any) => [q.id, q]));
        const template = inst?.selfEvalTemplate || { groups: [] };

        // Filtrar teachers se um ID específico foi passado
        const targetTeachers = teacherId 
            ? (teachers || []).filter((t: any) => t.id === teacherId)
            : (teachers || []);

        const calculateAverage = (resps: any[]) => {
            if (resps.length === 0) return 0;
            let totalWeightedScore = 0;
            let totalMaxPossible = 0;

            resps.forEach(resp => {
                const answers = resp.answers || [];
                let respScore = 0;
                let respMax = 0;

                answers.forEach((a: any) => {
                    const q = questionMap.get(a.questionId);
                    if (!q || q.type === 'text') return;

                    const weight = q.weight || 1;
                    const val = Number(a.value) || 0;

                    if (q.type === 'binary') {
                        respScore += val * weight;
                        respMax += 1 * weight;
                    } else if (q.type === 'stars') {
                        respScore += val * weight;
                        respMax += 5 * weight;
                    } else if (q.type === 'scale_10') {
                        respScore += val * weight;
                        respMax += 10 * weight;
                    }
                });

                if (respMax > 0) {
                    totalWeightedScore += (respScore / respMax) * 20;
                    totalMaxPossible += 20;
                }
            });

            if (totalMaxPossible === 0) return 0;
            return (totalWeightedScore / totalMaxPossible) * 20;
        };

        const newScores: any[] = [];

        // 2. PROCESSAMENTO EM MEMÓRIA (Sem chamadas ao DB dentro do loop)
        for (const teacher of targetTeachers) {
            const selfEval = (allSelfEvals || []).find((e: any) => e.teacherId === teacher.id);
            
            let selfScore = 0;
            if (selfEval && selfEval.answers) {
                template.groups.forEach((group: any) => {
                    if (group.exclusiveTo && group.exclusiveTo.length > 0 && teacher.category && !group.exclusiveTo.includes(teacher.category)) return;

                    group.items.forEach((item: any) => {
                        if (item.exclusiveTo && item.exclusiveTo.length > 0 && teacher.category && !item.exclusiveTo.includes(teacher.category)) return;

                        const answerValue = selfEval.answers[item.key] || 0;
                        const scoreValue = item.scoreValue || 0;
                        
                        let itemPoints = answerValue * scoreValue;
                        if (item.key === 'g4_passRate') {
                            itemPoints = (answerValue) * scoreValue; 
                        }
                        selfScore += itemPoints;
                    });
                });
                const maxSelfScore = inst?.categoryWeights?.find((w: any) => w.category === teacher.category)?.maxPoints || (teacher.category === 'assistente_estagiario' ? 125 : 175);
                selfScore = Math.min(selfScore, maxSelfScore);
            }

            const qualEval = (allQualEvals || []).find((e: any) => e.teacherId === teacher.id);
            const instScore = qualEval ? ((qualEval.deadlineCompliance || 0) + (qualEval.workQuality || 0)) / 2 : 0;

            const teacherResponses = (allResponses || []).filter((r: any) => r.teacherId === teacher.id);
            
            const subjectGroups: Record<string, any[]> = {};
            teacherResponses.forEach((r: any) => {
                const sId = r.subjectId || 'unknown';
                if (!subjectGroups[sId]) subjectGroups[sId] = [];
                subjectGroups[sId].push(r);
            });

            const subjectDetails = Object.keys(subjectGroups).map(sId => {
                const subResps = subjectGroups[sId];
                const subjectInfo = (subjects || []).find((s: any) => s.id === sId);
                return {
                    subjectName: subjectInfo?.name || 'Disciplina Desconhecida',
                    classGroup: subjectInfo?.classGroup || 'N/A',
                    shift: subjectInfo?.shift || 'N/A',
                    course: subjectInfo?.course || 'Geral',
                    score: calculateAverage(subResps),
                    responseCount: subResps.length
                };
            });

            const studentAvg = calculateAverage(teacherResponses);
            
            const maxSelfScore = inst?.categoryWeights?.find((w: any) => w.category === teacher.category)?.maxPoints || (teacher.category === 'assistente_estagiario' ? 125 : 175);
            const selfScore20 = maxSelfScore > 0 ? (selfScore / maxSelfScore) * 20 : 0;
            const instScore20 = (instScore / 10) * 20;
            const studentScore20 = studentAvg;

            const finalScore = (selfScore20 * 0.80) + (studentScore20 * 0.12) + (instScore20 * 0.08);

            newScores.push({
                teacherId: teacher.id,
                studentScore: studentScore20,
                institutionalScore: instScore20,
                selfEvalScore: selfScore20,
                finalScore: finalScore,
                lastCalculated: new Date().toISOString(),
                subjectDetails: subjectDetails
            });
        }

        // 3. BULK UPSERT: Salvar todos os scores de uma vez
        if (newScores.length > 0) {
            const { error } = await supabase.from(DB_KEYS.SCORES).upsert(newScores, { onConflict: 'teacherId' });
            if (error) throw error;
        }

        res.json({ success: true, processed: newScores.length });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// ==================================================================================
// 🚀 INICIALIZAÇÃO DO SERVIDOR (VITE MIDDLEWARE)
// ==================================================================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
      // In production, serve static files from dist
      app.use(express.static('dist'));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
