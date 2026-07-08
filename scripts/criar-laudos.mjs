import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error('No tenant found');

  // Laudo 1 - iPhone 14
  const l1 = await prisma.inspectionReport.create({
    data: {
      tenantId: tenant.id,
      aparelhoNome: 'iPhone 14 128GB Estelar',
      marca: 'Apple',
      modelo: 'iPhone 14',
      imei: '358247111222444',
      serialNumber: 'F2LXYZ1234',
      cor: 'Estelar',
      capacidade: '128GB',
      nivelBateria: 85,
      condicao: 'COMO_NOVO',
      valorEstimado: 4500.00,
      status: 'PENDENTE',
      acessoriosInclusos: ['Carregador', 'Caixa', 'Documentos'],
    },
  });
  console.log('Laudo 1 criado:', l1.id, l1.aparelhoNome, l1.status);

  // Laudo 2 - Galaxy S23
  const l2 = await prisma.inspectionReport.create({
    data: {
      tenantId: tenant.id,
      aparelhoNome: 'Galaxy S23 256GB Verde',
      marca: 'Samsung',
      modelo: 'Galaxy S23',
      imei: '358924333555777',
      serialNumber: 'R5KABC5678',
      cor: 'Verde',
      capacidade: '256GB',
      nivelBateria: 92,
      condicao: 'BOM',
      valorEstimado: 2800.00,
      status: 'CONCLUIDO',
      acessoriosInclusos: ['Carregador', 'Cabo USB'],
    },
  });
  console.log('Laudo 2 criado:', l2.id, l2.aparelhoNome, l2.status);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
