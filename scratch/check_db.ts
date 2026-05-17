import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("=== CLIENTES ===");
    const clientes = await prisma.clientes.findMany();
    console.log(JSON.stringify(clientes, null, 2));

    console.log("\n=== ENDERECOS ===");
    const enderecos = await prisma.enderecos.findMany();
    console.log(JSON.stringify(enderecos, null, 2));

    console.log("\n=== AGENDAS ===");
    const agendas = await prisma.agendas.findMany();
    console.log(JSON.stringify(agendas, null, 2));
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
