import { NavBar } from "@/components/NavBar";

// Placeholder home page: the schema (db/migrations/*.sql) hasn't been
// applied to a live database yet, so prisma/schema.prisma has no models to
// query. Once `npm run db:migrate` has run against a real DATABASE_URL,
// swap this for a dashboard like dtfunding's -- stats via
// `prisma.org.count()` etc., with `export const dynamic = "force-dynamic"`
// so counts aren't baked in at build time.
const PHASES = [
  { phase: 0, label: "Design + schema + data-source catalog", status: "done" },
  { phase: 1, label: "Entity resolution core: CRN matching + alias table", status: "next" },
  { phase: 2, label: "Seed govt LP list from high-confidence sources", status: "pending" },
  { phase: 3, label: "Cap-table integration (reuse dtfunding SH01/CS01 + PSC)", status: "pending" },
  { phase: 4, label: "Govt-backed cascade join + crowd-in/out output", status: "pending" },
  { phase: 5, label: "Expand govt LP sources (SNIB, NWF, ECF, NPIF II/MEIF II)", status: "pending" },
  { phase: 6, label: "Policy tracker cross-reference", status: "pending" },
  { phase: 7, label: "Manual-review UI for entity resolution", status: "pending" },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <NavBar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold">Investor Tracker</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Public sector LP intelligence -- schema applied, no data loaded yet. See{" "}
          <code>docs/DESIGN.md</code> for the full design.
        </p>

        <h2 className="mt-10 text-lg font-semibold">Build phases</h2>
        <div className="mt-4 divide-y divide-neutral-800 rounded-lg border border-neutral-800">
          {PHASES.map((p) => (
            <div key={p.phase} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-neutral-300">
                Phase {p.phase} -- {p.label}
              </span>
              <span
                className={
                  p.status === "done"
                    ? "font-medium text-emerald-400"
                    : p.status === "next"
                      ? "font-medium text-amber-400"
                      : "font-medium text-neutral-500"
                }
              >
                {p.status}
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
