/**
 * Script para inserir empresas no banco.
 *
 * Edite o array `EMPRESAS` abaixo com os dados desejados e execute:
 *   bun run scripts/seed-empresas.ts
 *
 * Comportamento:
 *   - Se a empresa já existe (mesmo CNPJ), atualiza os dados.
 *   - Se não existe, cria uma nova.
 *   - Empresas sem CNPJ são sempre criadas (sem checagem de duplicidade).
 */

import 'dotenv/config';
import { prisma } from '../src/server/db';

type EmpresaInput = {
    nome: string;
    logoUrl?: string;
    cnpj?: string;
    telefone?: string;
};

const EMPRESAS: EmpresaInput[] = [
    {
        nome: 'Mundo dos Brinquedos',
        cnpj: '26677986000122',
        telefone: '(41) 99650-3417',
        logoUrl: 'https://imgur.com/gallery/logo-mini-3g58T5L',
    },
    // Adicione mais empresas aqui...
];

async function upsertEmpresa(empresa: EmpresaInput) {
    if (empresa.cnpj) {
        const existente = await prisma.empresas.findFirst({
            where: { cnpj: empresa.cnpj },
        });

        if (existente) {
            const atualizada = await prisma.empresas.update({
                where: { id: existente.id },
                data: empresa,
            });
            console.log(`🔄  Atualizada: ${atualizada.nome} (${atualizada.cnpj})`);
            return atualizada;
        }
    }

    const criada = await prisma.empresas.create({ data: empresa });
    console.log(`✅  Criada:    ${criada.nome}${criada.cnpj ? ` (${criada.cnpj})` : ''}`);
    return criada;
}

async function main() {
    if (EMPRESAS.length === 0) {
        console.log('⚠️  Nenhuma empresa configurada no array EMPRESAS. Edite o arquivo.');
        process.exit(0);
    }

    console.log(`🏢  Processando ${EMPRESAS.length} empresa(s)...\n`);

    let sucesso = 0;
    let falhas = 0;

    for (const empresa of EMPRESAS) {
        try {
            await upsertEmpresa(empresa);
            sucesso++;
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`❌  Erro em "${empresa.nome}": ${msg}`);
            falhas++;
        }
    }

    console.log('\n─────────────────────────────────────');
    console.log(`  Sucesso : ${sucesso}`);
    console.log(`  Falhas  : ${falhas}`);
    console.log('─────────────────────────────────────\n');

    await prisma.$disconnect();
    process.exit(falhas > 0 ? 1 : 0);
}

main().catch(async (err) => {
    console.error('❌  Erro fatal:', err);
    await prisma.$disconnect();
    process.exit(1);
});
