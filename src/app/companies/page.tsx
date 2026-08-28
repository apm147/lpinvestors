import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { getCompanies } from "@/lib/data";
import { companiesHouseUrl } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const companies = await getCompanies();

  return (
    <div className="flex flex-1 flex-col">
      <NavBar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold">Companies</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Portfolio companies with at least one recorded investor. {companies.length} tracked.
        </p>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800 text-left text-neutral-400">
              <th className="py-2 pr-4 font-medium">Company</th>
              <th className="py-2 pr-4 font-medium">CRN</th>
              <th className="py-2 pr-4 font-medium text-right">Investors</th>
              <th className="py-2 pr-4 font-medium text-right">Investment rows</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-900">
            {companies.map((c) => (
              <tr key={c.id}>
                <td className="py-2 pr-4">
                  <Link href={`/companies/${c.id}`} className="hover:underline">
                    {c.canonical_name}
                  </Link>
                </td>
                <td className="py-2 pr-4 text-neutral-400">
                  {c.crn ? (
                    <a
                      href={companiesHouseUrl(c.crn)}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      {c.crn}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-2 pr-4 text-right">{c.investor_count}</td>
                <td className="py-2 pr-4 text-right text-neutral-400">{c.investment_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}
