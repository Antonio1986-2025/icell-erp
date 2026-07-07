import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lojaNome, lojaCnpj, lojaSlug, adminNome, adminEmail, adminSenha } =
      body;

    if (!lojaNome || !lojaSlug || !adminNome || !adminEmail || !adminSenha) {
      return NextResponse.json(
        { error: "Campos obrigatórios não preenchidos" },
        { status: 400 }
      );
    }

    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: lojaSlug },
    });

    if (existingTenant) {
      return NextResponse.json(
        { error: "Já existe uma loja com esse identificador" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: adminEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Já existe um usuário com esse email" },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(adminSenha, 10);

    const tenant = await prisma.tenant.create({
      data: {
        nome: lojaNome,
        slug: lojaSlug,
        cnpj: lojaCnpj || null,
        users: {
          create: {
            nome: adminNome,
            email: adminEmail,
            senha: hashedPassword,
            role: "ADMIN",
          },
        },
        categories: {
          create: [
            { nome: "iPhones", slug: "iphones", hasImei: true, hasBattery: true },
            { nome: "Apple Watch", slug: "apple-watch", hasSerial: true },
            { nome: "AirPods", slug: "airpods", hasSerial: true },
            { nome: "MacBook", slug: "macbook", hasSerial: true },
            { nome: "Acessórios", slug: "acessorios" },
          ],
        },
        paymentMethods: {
          create: [
            { nome: "Dinheiro", tipo: "DINHEIRO" },
            { nome: "PIX", tipo: "PIX" },
            { nome: "Cartão de Crédito", tipo: "CARTAO" },
            { nome: "Cartão de Débito", tipo: "CARTAO" },
            { nome: "Boleto", tipo: "BOLETO" },
          ],
        },
      },
      include: {
        users: true,
        categories: true,
        paymentMethods: true,
      },
    });

    return NextResponse.json({ tenant, message: "Loja criada com sucesso" });
  } catch (error) {
    console.error("Error creating tenant:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
