import assert from 'node:assert/strict';
import test from 'node:test';
import { BASELINE_MIGRATION, migrateDatabase } from './updates.js';

const status = {
    installed: true,
    hasTables: true,
    hasMigrationHistory: false,
    pendingUpdates: [],
};
const historicalMigrations = [
    BASELINE_MIGRATION,
    '20260912000100_images_base64',
    '20260912000200_company_catalog',
    '20260912000300_product_categories',
];

for (const [index, snapshot] of ['baseline', 'baseline-base64', 'baseline-slogan', 'baseline-categories'].entries()) {
    test(`recognizes ${snapshot} and records only migrations already present`, async () => {
        const calls: string[][] = [];
        await migrateDatabase(status, async (args) => {
            calls.push(args);
            if (args[1] === 'diff') return args.includes(`prisma/${snapshot}.prisma`) ? 0 : 2;
            return 0;
        });
        const resolved = calls.filter((args) => args[1] === 'resolve').map((args) => args[3]);
        assert.deepEqual(resolved, historicalMigrations.slice(0, index + 1));
        assert.deepEqual(calls[calls.length - 1], ['migrate', 'deploy']);
    });
}

test('rejects unknown schemas without applying or recording migrations', async () => {
    const calls: string[][] = [];
    await assert.rejects(migrateDatabase(status, async (args) => {
        calls.push(args);
        return 2;
    }), /difere das versões conhecidas/);
    assert.ok(calls.every((args) => args[1] === 'diff'));
});

for (const scenario of [
    { ...status, hasMigrationHistory: true },
    { ...status, installed: false, hasTables: false },
]) {
    test(`deploys directly with tables=${scenario.hasTables}, history=${scenario.hasMigrationHistory}`, async () => {
        const calls: string[][] = [];
        await migrateDatabase(scenario, async (args) => {
            calls.push(args);
            return 0;
        });
        assert.deepEqual(calls, [['migrate', 'deploy']]);
    });
}
