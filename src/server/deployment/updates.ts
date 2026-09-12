import type { Client } from 'pg';
import { readdir } from 'node:fs/promises';

export const BASELINE_MIGRATION = '20260912000000_baseline';
export const databaseUpdates = [
    { id: '20260912000300_product_categories', title: 'Categorias de produtos e filtros do catálogo' },
    { id: '20260912000200_company_catalog', title: 'Slogan e seção Sobre nós no catálogo' },
    { id: '20260912000100_images_base64', title: 'Armazenamento de imagens em base64' },
];

type Database = Pick<Client, 'query'>;

export async function inspectDatabase(client: Database) {
    const { rows: [tables] } = await client.query(`SELECT
        to_regclass('public."user"') IS NOT NULL AS users,
        to_regclass('public.empresas') IS NOT NULL AS companies,
        to_regclass('public._prisma_migrations') IS NOT NULL AS migrations,
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE' AND table_name <> '_prisma_migrations') AS populated_schema`);
    let installed = false;
    if (tables.users) {
        const { rows: [result] } = await client.query('SELECT EXISTS (SELECT 1 FROM public."user") AS populated');
        installed = result.populated;
    }
    if (tables.companies) {
        const { rows: [result] } = await client.query('SELECT EXISTS (SELECT 1 FROM public.empresas) AS populated');
        installed ||= result.populated;
    }
    const applied: string[] = tables.migrations
        ? (await client.query('SELECT migration_name FROM public._prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')).rows.map((row: { migration_name: string }) => row.migration_name)
        : [];
    const migrationFolders = await readdir('prisma/migrations', { withFileTypes: true });
    const pendingUpdates = migrationFolders
        .filter((entry) => entry.isDirectory() && entry.name !== BASELINE_MIGRATION && !applied.includes(entry.name))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((entry) => ({
            id: entry.name,
            title: databaseUpdates.find((update) => update.id === entry.name)?.title ?? 'Atualização do banco de dados',
        }));
    return {
        installed,
        hasTables: Boolean(tables.populated_schema),
        hasMigrationHistory: applied.length > 0,
        pendingUpdates,
    };
}

type RunPrisma = (args: string[], allowedExitCodes?: number[]) => Promise<number>;

// Establish a baseline only after verifying the exact known legacy or base64
// schema. Never mark an arbitrary customer's schema as already migrated.
export async function migrateDatabase(status: Awaited<ReturnType<typeof inspectDatabase>>, runPrisma: RunPrisma) {
    if (status.hasTables && !status.hasMigrationHistory) {
        const diffArgs = ['migrate', 'diff', '--from-schema-datasource', 'prisma/schema.prisma', '--to-schema-datamodel'];
        let compatible = false;
        for (const snapshot of ['prisma/baseline.prisma', 'prisma/baseline-base64.prisma', 'prisma/baseline-slogan.prisma']) {
            if (await runPrisma([...diffArgs, snapshot, '--exit-code'], [0, 2]) === 0) {
                compatible = true;
                break;
            }
        }
        if (!compatible) {
            throw new Error('A estrutura deste banco difere das versões conhecidas. Nenhuma migração foi aplicada; é necessária uma migração de compatibilidade para esta instalação.');
        }
        await runPrisma(['migrate', 'resolve', '--applied', BASELINE_MIGRATION]);
    }
    await runPrisma(['migrate', 'deploy']);
}
