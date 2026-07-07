import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Populando banco de dados...");

  const hashedPassword = await hash("123456", 10);

  const existingTenant = await prisma.tenant.findUnique({
    where: { slug: "minha-loja" },
  });

  if (existingTenant) {
    // Add COMPRADOR user if not exists
    const existingUser = await prisma.user.findFirst({ where: { email: "comprador@loja.com" } });
    if (!existingUser) {
      await prisma.user.create({
        data: {
          tenantId: existingTenant.id,
          nome: "Comprador",
          email: "comprador@loja.com",
          senha: hashedPassword,
          role: "COMPRADOR",
        },
      });
      console.log("✅ Usuário comprador@loja.com / 123456 (COMPRADOR)");
    } else {
      console.log("⚠️  Usuário COMPRADOR já existe.");
    }
    console.log("⚠️  Tenant já existe, seed concluído.");
    return;
  }

  const tenant = await prisma.tenant.create({
    data: {
      nome: "Minha Loja",
      slug: "minha-loja",
      cnpj: "00.000.000/0000-00",
      telefone: "(67) 99999-0000",
      email: "contato@minhaloja.com",
      endereco: "Av. Principal, 500 - Centro",

      users: {
        createMany: {
          data: [
            { nome: "Admin", email: "admin@loja.com", senha: hashedPassword, role: "ADMIN" },
            { nome: "Comprador", email: "comprador@loja.com", senha: hashedPassword, role: "COMPRADOR" },
          ],
        },
      },

      categories: {
        create: [
          { nome: "iPhones", slug: "iphones", hasImei: true, hasBattery: true },
          { nome: "Apple Watch", slug: "apple-watch", hasSerial: true },
          { nome: "AirPods", slug: "airpods", hasSerial: true },
          { nome: "MacBook", slug: "macbook", hasSerial: true },
          { nome: "Samsung", slug: "samsung", hasImei: true, hasBattery: true },
          { nome: "Acessórios", slug: "acessorios" },
        ],
      },

      paymentMethods: {
        create: [
          { nome: "Dinheiro", tipo: "DINHEIRO" },
          { nome: "PIX", tipo: "PIX" },
          { nome: "Cartão de Crédito", tipo: "CREDITO" },
          { nome: "Cartão de Débito", tipo: "DEBITO" },
          { nome: "Boleto", tipo: "BOLETO" },
        ],
      },
    },
  });

  console.log(`✅ Tenant criado: ${tenant.nome} (${tenant.slug})`);
  console.log("✅ Usuário: admin@loja.com / 123456");
  console.log("✅ Categorias e formas de pagamento criadas");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
