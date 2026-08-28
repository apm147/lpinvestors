import Link from "next/link";
import { notFound } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { getInvestorFund, getInvestorOrg } from "@/lib/data";
import { formatDate, formatGBP } from "@/lib/format";
import { SourceLink } from "@/components/SourceLink";

export const dynamic = "force-dynamic";

export default async function InvestorPage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const { kind, id } = await params;
  if (kind !== "org" && kind !== "fund") notFound();

  if (kind === "fund") return <FundView id={id} />;
  return <OrgView id={id} />;
}

async function OrgView({ id }: { id: string }) {
  const org = await getInvestorOrg(id);
  if (!org) notFound();

  const investments = org.investment_investment_investor_org_idToorg;

  return (
    <Shell name={org.canonical_name} subtitle={org.org_kind} aliases={org.org_alias}>
      <InvestmentsTable
        investments={investments.map((i) => ({
          id: i.id,
          portfolioName: i.org_investment_portfolio_org_idToorg.canonical_name,
          portfolioId: i.org_investment_portfolio_org_idToorg.id,
          round_date: i.round_date,
          source_filing: i.source_filing,
        }))}
      />
      {org.commitment.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-semibold">LP commitments ({org.commitment.length})</h2>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-neutral-400">
                <th className="py-2 pr-4 font-medium">Fund</th>
                <th className="py-2 pr-4 font-medium">Programme</th>
                <th className="py-2 pr-4 font-medium">Amount</th>
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {org.commitment.map((c) => (
                <tr key={c.id}>
                  <td className="py-2 pr-4">{c.fund.canonical_name}</td>
                  <td className="py-2 pr-4 text-neutral-400">{c.programme?.name ?? "—"}</td>
                  <td className="py-2 pr-4 text-neutral-400">{formatGBP(c.amount_gbp)}</td>
                  <td className="py-2 pr-4 text-neutral-400">{formatDate(c.commit_date)}</td>
                  <td className="py-2 pr-4 text-neutral-400">
                    <SourceLink text={c.source_url} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Shell>
  );
}

async function FundView({ id }: { id: string }) {
  const fund = await getInvestorFund(id);
  if (!fund) notFound();

  return (
    <Shell
      name={fund.canonical_name}
      subtitle={fund.org ? `fund, managed by ${fund.org.canonical_name}` : "fund"}
      aliases={fund.org_alias}
    >
      <InvestmentsTable
        investments={fund.investment.map((i) => ({
          id: i.id,
          portfolioName: i.org_investment_portfolio_org_idToorg.canonical_name,
          portfolioId: i.org_investment_portfolio_org_idToorg.id,
          round_date: i.round_date,
          source_filing: i.source_filing,
        }))}
      />
    </Shell>
  );
}

function Shell({
  name,
  subtitle,
  aliases,
  children,
}: {
  name: string;
  subtitle: string;
  aliases: { id: string; raw_name: string; source: string | null; resolved_by: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <NavBar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <Link href="/investors" className="text-sm text-neutral-400 hover:underline">
          ← Investors
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{name}</h1>
        <p className="mt-1 text-sm text-neutral-400">{subtitle}</p>

        {aliases.length > 0 && (
          <p className="mt-3 text-sm text-neutral-500">
            Also known as: {aliases.map((a) => a.raw_name).join(", ")}
          </p>
        )}

        {children}
      </main>
    </div>
  );
}

function InvestmentsTable({
  investments,
}: {
  investments: {
    id: string;
    portfolioName: string;
    portfolioId: string;
    round_date: Date | null;
    source_filing: string | null;
  }[];
}) {
  return (
    <>
      <h2 className="mt-8 text-lg font-semibold">Portfolio companies ({investments.length})</h2>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-800 text-left text-neutral-400">
            <th className="py-2 pr-4 font-medium">Company</th>
            <th className="py-2 pr-4 font-medium">Round date</th>
            <th className="py-2 pr-4 font-medium">Source</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-900">
          {investments.map((inv) => (
            <tr key={inv.id}>
              <td className="py-2 pr-4">
                <Link href={`/companies/${inv.portfolioId}`} className="hover:underline">
                  {inv.portfolioName}
                </Link>
              </td>
              <td className="py-2 pr-4 text-neutral-400">{formatDate(inv.round_date)}</td>
              <td className="py-2 pr-4 text-neutral-400">
                <SourceLink text={inv.source_filing} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
