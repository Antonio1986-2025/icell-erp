-- Inserir laudo 1
INSERT INTO "InspectionReport" (id, "tenantId", "aparelhoNome", marca, modelo, imei, "serialNumber", cor, capacidade, "nivelBateria", condicao, "valorEstimado", status, "acessoriosInclusos", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid()::text,
  t.id,
  'iPhone 14 128GB Estelar',
  'Apple',
  'iPhone 14',
  '358247111222444',
  'F2LXYZ1234',
  'Estelar',
  '128GB',
  85,
  'COMO_NOVO',
  4500.00,
  'PENDENTE',
  '["Carregador","Caixa","Documentos"]',
  NOW(),
  NOW()
FROM "Tenant" t LIMIT 1;

-- Inserir laudo 2
INSERT INTO "InspectionReport" (id, "tenantId", "aparelhoNome", marca, modelo, imei, "serialNumber", cor, capacidade, "nivelBateria", condicao, "valorEstimado", status, "acessoriosInclusos", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid()::text,
  t.id,
  'Galaxy S23 256GB Verde',
  'Samsung',
  'Galaxy S23',
  '358924333555777',
  'R5KABC5678',
  'Verde',
  '256GB',
  92,
  'BOM',
  2800.00,
  'CONCLUIDO',
  '["Carregador","Cabo USB"]',
  NOW(),
  NOW()
FROM "Tenant" t LIMIT 1;
