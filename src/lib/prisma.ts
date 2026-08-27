import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var __prisma: PrismaClient | undefined;
}

function makeClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

// Reuse the client across hot reloads in dev so we don't exhaust connections.
export const prisma = global.__prisma ?? makeClient();
if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
