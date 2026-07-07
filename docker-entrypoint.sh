#!/bin/sh
set -e

echo "🚀 iCell ERP - Entrypoint"

# Rodar migrations no banco PostgreSQL
echo "⏳ Rodando migrations..."
npx prisma db push --accept-data-loss --skip-generate
echo "✅ Migrations aplicadas!"

# Rodar seed (só se banco estiver vazio)
echo "⏳ Verificando seed..."
node prisma/seed.js || echo "⚠️ Seed já foi executado ou falhou (ignorando)"

# Gerar dados de teste (só se não existirem produtos)
echo "⏳ Verificando dados de teste..."
node prisma/seed-teste.js || echo "⚠️ Seed de teste ignorado"
echo "✅ Setup concluído!"

# Iniciar o app
echo "🎯 Iniciando Next.js..."
exec "$@"
