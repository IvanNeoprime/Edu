import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = '';
const supabaseKey = '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedAdmin() {
    console.log("Gerando hash da senha...");
    const hashedAdminPwd = await bcrypt.hash('123', 10);
    
    console.log("A tentar inserir o utilizador no Supabase...");
    const { data, error } = await supabase.from('users').upsert([{
        id: 'admin_optimus',
        email: 'Admin',
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
