/**
 * Seed de usuário padrão de desenvolvimento.
 *
 * Cria um usuário admin para uso durante o desenvolvimento caso
 * ele ainda não exista no banco.
 *
 * Uso:
 *   bun run scripts/seed-admin.ts
 *
 * Credenciais criadas:
 *   E-mail:  admin@locasystem.dev
 *   Senha:   admin123
 */

import 'dotenv/config';
import { auth } from '../src/server/auth';

const ADMIN_EMAIL = 'admin@locasystem.dev';
const ADMIN_PASSWORD = 'admin@1234';
const ADMIN_NAME = 'Administrador';

async function main() {
    console.log('🔑  Criando usuário padrão de desenvolvimento...\n');

    // Tenta criar via better-auth (já faz hash da senha internamente)
    const result = await auth.api.signUpEmail({
        body: {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            name: ADMIN_NAME,
        },
    });

    if (result && 'user' in result && result.user) {
        console.log('✅  Usuário criado com sucesso!');
    } else {
        console.log('⚠️  Resposta inesperada:', result);
    }

    console.log('\n─────────────────────────────────────');
    console.log('  E-mail :  ' + ADMIN_EMAIL);
    console.log('  Senha  :  ' + ADMIN_PASSWORD);
    console.log('─────────────────────────────────────\n');
    process.exit(0);
}

main().catch((err) => {
    // better-auth lança erro se o e-mail já existe
    const msg: string = err?.message ?? String(err);
    if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exist') || msg.toLowerCase().includes('unique')) {
        console.log('ℹ️  Usuário já existe no banco. Nenhuma ação necessária.\n');
        console.log('─────────────────────────────────────');
        console.log('  E-mail :  ' + ADMIN_EMAIL);
        console.log('  Senha  :  ' + ADMIN_PASSWORD);
        console.log('─────────────────────────────────────\n');
    } else {
        console.error('❌  Erro ao criar usuário:', msg);
    }
    process.exit(0);
});
