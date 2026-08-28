import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { getAliases } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AliasesPage() {
  const aliases = await getAliases();

  return (
    <div className="flex flex-1 flex-col">
      <NavBar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold">Entity resolution lookup</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-400">
          Raw name variants already resolved to a canonical org or fund. Both{" "}
          <code>scripts/seed-from-templates.ts</code> and any future CSV batch check this table
          (via exact <code>canonical_name</code> match, then this alias lookup) before treating a
          name as new — see <code>src/lib/entity-resolution.ts</code>. {aliases.length} resolved so
          far.
        </p>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800 text-left text-neutral-400">
              <th className="py-2 pr-4 font-medium">Raw name seen</th>
              <th className="py-2 pr-4 font-medium">Resolves to</th>
              <th className="py-2 pr-4 font-medium">How</th>
              <th className="py-2 pr-4 font-medium">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-900">
            {aliases.map((a) => {
              const target = a.org ?? a.fund;
              const href = a.org ? `/investors/org/${a.org.id}` : a.fund ? `/investors/fund/${a.fund.id}` : null;
              return (
                <tr key={a.id}>
                  <td className="py-2 pr-4 text-neutral-300">{a.raw_name}</td>
                  <td className="py-2 pr-4">
                    {href && target ? (
                      <Link href={href} className="hover:underline">
                        {target.canonical_name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 pr-4 text-neutral-400">{a.resolved_by}</td>
                  <td className="py-2 pr-4 text-neutral-500">{a.source ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </main>
    </div>
  );
}
