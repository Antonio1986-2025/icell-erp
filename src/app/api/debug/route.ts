import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const p = prisma as any;
    const keys = Object.getOwnPropertyNames(Object.getPrototypeOf(p));
    const ownKeys = Object.getOwnPropertyNames(p);
    const symbols = Object.getOwnPropertySymbols(p).map((s: any) => s.toString());
    const hasTenant = "tenant" in p;
    const tenantProp = p.tenant;

    return NextResponse.json({
      hasTenant,
      tenantType: typeof tenantProp,
      tenantValue: tenantProp ? Object.keys(tenantProp) : null,
      ownKeys,
      symbols,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack?.split("\n")?.slice(0, 5) }, { status: 500 });
  }
}
