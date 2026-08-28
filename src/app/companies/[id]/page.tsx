import Link from "next/link";
import { notFound } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { getCompany } from "@/lib/data";
import { companiesHouseUrl, formatDate } from "@/lib/format";
import { SourceLink } from "@/components/SourceLink";

export const dynamic = "force-dynamic";

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await getCompany(id);
  if (!company) notFound();

  const investments = company.investment_investment_portfolio_org_idToorg;

  return (
    <div className="flex flex-1 flex-col">
      <NavBar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <Link href="/companies" className="text-sm text-neutral-400 hover:underline">
          ← Companies
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{company.canonical_name}</h1>
        {company.crn && (
          <a
            href={companiesHouseUrl(company.crn)}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-sm text-neutral-400 hover:underline"
          >
            CRN {company.crn} — view on Companies House ↗
          </a>
        )}

        <h2 className="mt-8 text-lg font-semibold">Investors ({investments.length})</h2>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800 text-left text-neutral-400">
              <th className="py-2 pr-4 font-medium">Investor</th>
              <th className="py-2 pr-4 font-medium">Round date</th>
              <th className="py-2 pr-4 font-medium">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-900">
            {investments.map((inv) => {
              const investorOrg = inv.org_investment_investor_org_idToorg;
              const investorFund = inv.fund;
              return (
                <tr key={inv.id}>
                  <td className="py-2 pr-4">
                    {investorOrg && (
                      <Link href={`/investors/org/${investorOrg.id}`} className="hover:underline">
                        {investorOrg.canonical_name}
                      </Link>
                    )}
                    {investorFund && (
                      <Link href={`/investors/fund/${investorFund.id}`} className="hover:underline">
                        {investorFund.canonical_name}
                      </Link>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-neutral-400">{formatDate(inv.round_date)}</td>
                  <td className="py-2 pr-4 text-neutral-400">
                    <SourceLink text={inv.source_filing} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {company.psc_control.length > 0 && (
          <>
            <h2 className="mt-10 text-lg font-semibold">
              Persons with significant control ({company.psc_control.length})
            </h2>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800 text-left text-neutral-400">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Nature of control</th>
                  <th className="py-2 pr-4 font-medium">Notified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {company.psc_control.map((psc) => (
                  <tr key={`${psc.person_id}-${psc.control_nature}`}>
                    <td className="py-2 pr-4">{psc.person.full_name}</td>
                    <td className="py-2 pr-4 text-neutral-400">{psc.control_nature}</td>
                    <td className="py-2 pr-4 text-neutral-400">{formatDate(psc.notified_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </main>
    </div>
  );
}
