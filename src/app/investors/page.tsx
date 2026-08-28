import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { getInvestors } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function InvestorsPage() {
  const investors = await getInvestors();

  return (
    <div className="flex flex-1 flex-col">
      <NavBar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold">Investors</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Orgs and funds that appear as an investor or LP commitment funder. {investors.length} total.
        </p>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800 text-left text-neutral-400">
              <th className="py-2 pr-4 font-medium">Investor</th>
              <th className="py-2 pr-4 font-medium">Kind</th>
              <th className="py-2 pr-4 font-medium text-right">Portfolio cos.</th>
              <th className="py-2 pr-4 font-medium text-right">LP commitments</th>
              <th className="py-2 pr-4 font-medium text-right">Aliases</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-900">
            {investors.map((inv) => (
              <tr key={`${inv.kind}-${inv.id}`}>
                <td className="py-2 pr-4">
                  <Link href={`/investors/${inv.kind}/${inv.id}`} className="hover:underline">
                    {inv.canonical_name}
                  </Link>
                </td>
                <td className="py-2 pr-4 text-neutral-400">
                  {inv.kind === "fund" ? "fund" : inv.org_kind}
                </td>
                <td className="py-2 pr-4 text-right">{inv.portfolio_count}</td>
                <td className="py-2 pr-4 text-right text-neutral-400">{inv.commitment_count}</td>
                <td className="py-2 pr-4 text-right text-neutral-400">{inv.alias_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}
