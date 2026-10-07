import { PrismaClient } from "@prisma/client";

const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalParaPrisma.prisma ?? new PrismaClient();

// En desarrollo se reutiliza la instancia para no agotar conexiones con el hot reload.
if (process.env.NODE_ENV !== "production") globalParaPrisma.prisma = db;
