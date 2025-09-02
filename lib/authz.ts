// lib/authz.ts
import "server-only";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function getUserAndRole() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  if (!userId) return { userId: null, role: null as "USER"|"HOST"|"ADMIN"|null };
  const row = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return { userId, role: (row?.role ?? null) as "USER"|"HOST"|"ADMIN"|null };
}

export async function requireRole(allowed: Array<"HOST"|"ADMIN">) {
  const { userId, role } = await getUserAndRole();
  return { userId, role, ok: !!userId && !!role && allowed.includes(role as "HOST"|"ADMIN") };
}
