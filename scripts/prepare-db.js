import { execSync } from 'child_process';

console.log("🚀 Iniciando preparação do banco de dados...");

try {
  // 1. Gera o Prisma Client
  console.log("📦 Gerando Prisma Client...");
  execSync("bunx prisma generate", { stdio: 'inherit' });

  // 2. Sincroniza o schema com o banco de dados (Cria coleções e índices no MongoDB)
  console.log("🔄 Sincronizando schema com o banco de dados na nuvem...");
  execSync("bunx prisma db push", { stdio: 'inherit' });

  console.log("✅ Banco de dados preparado com sucesso!");
  console.log("Lembre-se: O arquivo .env precisa conter a URL correta do seu MongoDB Atlas.");
} catch (error) {
  console.error("❌ Erro ao preparar o banco de dados. Verifique sua string de conexão no arquivo .env.");
  process.exit(1);
}
