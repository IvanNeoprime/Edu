import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = 'https://hpdyncnatkukovtflzwv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwZHluY25hdGt1a292dGZsend2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MTQ3NjYsImV4cCI6MjA4ODI5MDc2Nn0.ToSUVFnWxV0mTSr6wTDw38ajBloaUJJCedWmIMH3-8U';
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedAdmin() {
    console.log("Gerando hash da senha...");
    const hashedAdminPwd = await bcrypt.hash('prime', 10);
    
    console.log("A tentar inserir o utilizador no Supabase...");
    const { data, error } = await supabase.from('users').upsert([{
        id: 'admin_optimus',
        email: 'optimusprime@gmail.com',
        name: 'Optimus Prime',
        role: 'super_admin',
        password: hashedAdminPwd,
        approved: true,
        mustChangePassword: false
    }], { onConflict: 'email' }).select();
    
    if (error) {
        console.error('Erro ao criar admin:', error.message);
    } else {
        console.log('Super Admin criado com sucesso no Supabase!');
    }
}
seedAdmin();
