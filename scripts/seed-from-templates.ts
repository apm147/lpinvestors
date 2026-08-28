// Loads db/templates/*.csv into the database, resolving each row's ref_key
// references to the real server-generated UUIDs as it goes -- see
// db/templates/README.md for the file format and ref_key/crn: convention
// this implements.
//
// Usage:
//   npx tsx scripts/seed-from-templates.ts [--dir db/templates] [--dry-run]
//
// Everything runs in one transaction: --dry-run resolves and inserts
// exactly as a real run would, then rolls back instead of committing, so
// you can validate a batch (including DB-side CHECK/FK/UNIQUE constraints)
// without touching the database.
import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse/sync";
import { Client } from "pg";

type Row = Record<string, string>;
type RefKind = "org" | "fund" | "person" | "programme";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const dirFlagIndex = args.indexOf("--dir");
const dir = dirFlagIndex >= 0 ? args[dirFlagIndex + 1] : "db/templates";

function readCsv(file: string): Row[] {
  const path = join(dir, file);
  if (!existsSync(path)) return [];
  const content = readFileSync(path, "utf-8");
  return parse(content, { columns: true, skip_empty_lines: true, trim: true }) as Row[];
}

function blank(v: string | undefined): string | null {
  return v === undefined || v === "" ? null : v;
}

function int(v: string | undefined): number | null {
  const b = blank(v);
  return b === null ? null : Number.parseInt(b, 10);
}

function bool(v: string | undefined): boolean {
  return (v ?? "").trim().toLowerCase() === "true";
}

class RefResolver {
  private maps: Record<RefKind, Map<string, string>> = {
    org: new Map(),
    fund: new Map(),
    person: new Map(),
    programme: new Map(),
  };

  constructor(private client: Client) {}

  define(kind: RefKind, refKey: string, id: string) {
    if (this.maps[kind].has(refKey)) {
      throw new Error(`duplicate ref_key "${refKey}" in ${kind} template`);
    }
    this.maps[kind].set(refKey, id);
  }

  async resolve(kind: RefKind, ref: string | undefined, context: string): Promise<string | null> {
    const r = blank(ref);
    if (r === null) return null;

    if (r.startsWith("crn:")) {
      if (kind !== "org" && kind !== "fund") {
        throw new Error(`${context}: "crn:" lookup isn't supported for ${kind} refs`);
      }
      const crn = r.slice("crn:".length);
      const table = kind; // 'org' | 'fund' -- both tables are named after their kind
      const { rows } = await this.client.query(`SELECT id FROM ${table} WHERE crn = $1`, [crn]);
      if (rows.length === 0) {
        throw new Error(`${context}: no existing ${kind} found with crn "${crn}"`);
      }
      return rows[0].id as string;
    }

    const id = this.maps[kind].get(r);
    if (id === undefined) {
      throw new Error(
        `${context}: ref_key "${r}" not found among this batch's ${kind} rows (and isn't a "crn:" lookup)`
      );
    }
    return id;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const refs = new RefResolver(client);
  const counts: Record<string, number> = {};

  try {
    await client.query("BEGIN");

    for (const row of readCsv("01_org.csv")) {
      const { rows } = await client.query(
        `INSERT INTO org (canonical_name, crn, org_kind, is_quilt_tagged) VALUES ($1, $2, $3, $4) RETURNING id`,
        [row.canonical_name, blank(row.crn), row.org_kind, bool(row.is_quilt_tagged)]
      );
      refs.define("org", row.ref_key, rows[0].id);
      counts.org = (counts.org ?? 0) + 1;
    }

    for (const row of readCsv("02_programme.csv")) {
      const parentOrgId = await refs.resolve("org", row.parent_org_ref, `programme "${row.name}"`);
      const { rows } = await client.query(
        `INSERT INTO programme (name, parent_org_id, disclosure_url, confidence, notes) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [row.name, parentOrgId, blank(row.disclosure_url), blank(row.confidence), blank(row.notes)]
      );
      refs.define("programme", row.ref_key, rows[0].id);
      counts.programme = (counts.programme ?? 0) + 1;
    }

    for (const row of readCsv("03_fund.csv")) {
      const gpOrgId = await refs.resolve("org", row.gp_org_ref, `fund "${row.canonical_name}"`);
      const { rows } = await client.query(
        `INSERT INTO fund (canonical_name, crn, gp_org_id) VALUES ($1, $2, $3) RETURNING id`,
        [row.canonical_name, blank(row.crn), gpOrgId]
      );
      refs.define("fund", row.ref_key, rows[0].id);
      counts.fund = (counts.fund ?? 0) + 1;
    }

    for (const row of readCsv("04_person.csv")) {
      const { rows } = await client.query(
        `INSERT INTO person (full_name, dob_month, dob_year, nationality) VALUES ($1, $2, $3, $4) RETURNING id`,
        [row.full_name, int(row.dob_month), int(row.dob_year), blank(row.nationality)]
      );
      refs.define("person", row.ref_key, rows[0].id);
      counts.person = (counts.person ?? 0) + 1;
    }

    for (const [i, row] of readCsv("05_commitment.csv").entries()) {
      const ctx = `commitment row ${i + 1}`;
      const funderOrgId = await refs.resolve("org", row.funder_org_ref, ctx);
      const programmeId = await refs.resolve("programme", row.programme_ref, ctx);
      const fundId = await refs.resolve("fund", row.fund_ref, ctx);
      await client.query(
        `INSERT INTO commitment (funder_org_id, programme_id, fund_id, amount_gbp, commit_date, source_url, confidence)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [funderOrgId, programmeId, fundId, blank(row.amount_gbp), blank(row.commit_date), row.source_url, row.confidence]
      );
      counts.commitment = (counts.commitment ?? 0) + 1;
    }

    for (const [i, row] of readCsv("06_investment.csv").entries()) {
      const ctx = `investment row ${i + 1}`;
      const investorOrgId = await refs.resolve("org", row.investor_org_ref, ctx);
      const investorFundId = await refs.resolve("fund", row.investor_fund_ref, ctx);
      const portfolioOrgId = await refs.resolve("org", row.portfolio_org_ref, ctx);
      await client.query(
        `INSERT INTO investment (investor_org_id, investor_fund_id, portfolio_org_id, round_date, source_filing)
         VALUES ($1, $2, $3, $4, $5)`,
        [investorOrgId, investorFundId, portfolioOrgId, blank(row.round_date), blank(row.source_filing)]
      );
      counts.investment = (counts.investment ?? 0) + 1;
    }

    for (const [i, row] of readCsv("07_psc_control.csv").entries()) {
      const ctx = `psc_control row ${i + 1}`;
      const personId = await refs.resolve("person", row.person_ref, ctx);
      const orgId = await refs.resolve("org", row.org_ref, ctx);
      await client.query(
        `INSERT INTO psc_control (person_id, org_id, control_nature, notified_date) VALUES ($1, $2, $3, $4)`,
        [personId, orgId, row.control_nature, blank(row.notified_date)]
      );
      counts.psc_control = (counts.psc_control ?? 0) + 1;
    }

    for (const [i, row] of readCsv("08_person_role.csv").entries()) {
      const ctx = `person_role row ${i + 1}`;
      const personId = await refs.resolve("person", row.person_ref, ctx);
      const fundId = await refs.resolve("fund", row.fund_ref, ctx);
      const orgId = await refs.resolve("org", row.org_ref, ctx);
      await client.query(
        `INSERT INTO person_role (person_id, fund_id, org_id, role) VALUES ($1, $2, $3, $4)`,
        [personId, fundId, orgId, row.role]
      );
      counts.person_role = (counts.person_role ?? 0) + 1;
    }

    for (const [i, row] of readCsv("09_org_alias.csv").entries()) {
      const ctx = `org_alias row ${i + 1} ("${row.raw_name}")`;
      const orgId = await refs.resolve("org", row.org_ref, ctx);
      const fundId = await refs.resolve("fund", row.fund_ref, ctx);
      await client.query(
        `INSERT INTO org_alias (raw_name, org_id, fund_id, source, resolved_by) VALUES ($1, $2, $3, $4, $5)`,
        [row.raw_name, orgId, fundId, blank(row.source), row.resolved_by]
      );
      counts.org_alias = (counts.org_alias ?? 0) + 1;
    }

    if (dryRun) {
      await client.query("ROLLBACK");
      console.log("--dry-run: validated OK, rolled back. Nothing was written.");
    } else {
      await client.query("COMMIT");
      console.log("Committed.");
    }
    console.log(counts);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
