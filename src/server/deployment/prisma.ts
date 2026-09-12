import { spawn } from 'node:child_process';

export async function runPrisma(databaseUrl: string, args: string[], allowedExitCodes = [0]) {
    const processResult = spawn(
        process.execPath,
        ['node_modules/prisma/build/index.js', ...args],
        {
            cwd: process.cwd(),
            timeout: 120_000,
            env: { ...process.env, DATABASE_URL: databaseUrl },
        },
    );

    let standardOutput = '';
    let errorOutput = '';
    processResult.stdout.on('data', (chunk) => { standardOutput += String(chunk); });
    processResult.stderr.on('data', (chunk) => { errorOutput += String(chunk); });
    const exitCode = await new Promise<number>((resolve, reject) => {
        processResult.once('error', reject);
        processResult.once('close', (code) => resolve(code ?? 1));
    });

    if (!allowedExitCodes.includes(exitCode)) {
        throw new Error(errorOutput.trim() || standardOutput.trim() || 'Falha ao aplicar o schema do banco.');
    }
    return exitCode;
}

