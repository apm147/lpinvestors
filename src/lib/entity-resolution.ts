import { prisma } from "./prisma";

export type ResolvedEntity =
  | { kind: "org"; id: string; canonicalName: string; matchedVia: "canonical_name" | "alias" }
  | { kind: "fund"; id: string; canonicalName: string; matchedVia: "canonical_name" | "alias" };

// Resolves a raw name string against entities already known to the database
// -- an exact canonical_name match first, then the org_alias lookup table --
// so a name already resolved once (by hand, or by a previous research pass)
// doesn't need re-resolving every time it recurs. Returns null if genuinely
// unseen; the caller decides what that means (create a new entity, or flag
// it for the resolution_queue -- this function never guesses).
//
// org_alias.raw_name has no uniqueness constraint, so an ambiguous name
// (pointing to two different targets) is a real data-quality problem, not
// something to silently pick a winner for -- findFirst's result in that case
// is arbitrary and should be treated as a signal to clean up the alias table,
// not as ground truth.
//
// scripts/seed-from-templates.ts implements the same lookup against a raw
// `pg` Client (not Prisma), since it needs to run inside that script's own
// transaction -- keep the two in sync if the matching logic changes here.
export async function resolveEntityName(rawName: string): Promise<ResolvedEntity | null> {
  const name = rawName.trim();
  if (!name) return null;

  const org = await prisma.org.findFirst({ where: { canonical_name: name } });
  if (org) {
    return { kind: "org", id: org.id, canonicalName: org.canonical_name, matchedVia: "canonical_name" };
  }

  const fund = await prisma.fund.findFirst({ where: { canonical_name: name } });
  if (fund) {
    return { kind: "fund", id: fund.id, canonicalName: fund.canonical_name, matchedVia: "canonical_name" };
  }

  const alias = await prisma.org_alias.findFirst({
    where: { raw_name: name },
    include: { org: true, fund: true },
  });
  if (alias?.org) {
    return { kind: "org", id: alias.org.id, canonicalName: alias.org.canonical_name, matchedVia: "alias" };
  }
  if (alias?.fund) {
    return { kind: "fund", id: alias.fund.id, canonicalName: alias.fund.canonical_name, matchedVia: "alias" };
  }

  return null;
}
