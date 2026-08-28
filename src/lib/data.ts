import { prisma } from "./prisma";

export async function getDashboardStats() {
  const [companiesRaw, investments, aliases, investorsRaw] = await Promise.all([
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*) FROM org o
      WHERE EXISTS (SELECT 1 FROM investment i WHERE i.portfolio_org_id = o.id)
    `,
    prisma.investment.count(),
    prisma.org_alias.count(),
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*) FROM (
        SELECT investor_org_id AS id FROM investment WHERE investor_org_id IS NOT NULL
        UNION
        SELECT investor_fund_id AS id FROM investment WHERE investor_fund_id IS NOT NULL
        UNION
        SELECT funder_org_id AS id FROM commitment
      ) t
    `,
  ]);

  return {
    companies: Number(companiesRaw[0].count),
    investments,
    aliases,
    investors: Number(investorsRaw[0].count),
  };
}

export type CompanyListRow = {
  id: string;
  canonical_name: string;
  crn: string | null;
  investment_count: number;
  investor_count: number;
};

export async function getCompanies(): Promise<CompanyListRow[]> {
  return prisma.$queryRaw<CompanyListRow[]>`
    SELECT
      o.id,
      o.canonical_name,
      o.crn,
      (SELECT count(*) FROM investment i WHERE i.portfolio_org_id = o.id)::int AS investment_count,
      (SELECT count(DISTINCT coalesce(i.investor_org_id, i.investor_fund_id))
         FROM investment i WHERE i.portfolio_org_id = o.id)::int AS investor_count
    FROM org o
    WHERE EXISTS (SELECT 1 FROM investment i WHERE i.portfolio_org_id = o.id)
    ORDER BY investor_count DESC, o.canonical_name ASC
  `;
}

export async function getCompany(id: string) {
  return prisma.org.findUnique({
    where: { id },
    include: {
      investment_investment_portfolio_org_idToorg: {
        include: { org_investment_investor_org_idToorg: true, fund: true },
        orderBy: { round_date: "asc" },
      },
      psc_control: { include: { person: true } },
    },
  });
}

export type InvestorListRow = {
  kind: "org" | "fund";
  id: string;
  canonical_name: string;
  org_kind: string | null;
  portfolio_count: number;
  commitment_count: number;
  alias_count: number;
};

export async function getInvestors(): Promise<InvestorListRow[]> {
  return prisma.$queryRaw<InvestorListRow[]>`
    SELECT * FROM (
      SELECT
        'org' AS kind,
        o.id,
        o.canonical_name,
        o.org_kind::text AS org_kind,
        (SELECT count(*) FROM investment i WHERE i.investor_org_id = o.id)::int AS portfolio_count,
        (SELECT count(*) FROM commitment c WHERE c.funder_org_id = o.id)::int AS commitment_count,
        (SELECT count(*) FROM org_alias oa WHERE oa.org_id = o.id)::int AS alias_count
      FROM org o
      WHERE EXISTS (SELECT 1 FROM investment i WHERE i.investor_org_id = o.id)
         OR EXISTS (SELECT 1 FROM commitment c WHERE c.funder_org_id = o.id)

      UNION ALL

      SELECT
        'fund' AS kind,
        f.id,
        f.canonical_name,
        NULL AS org_kind,
        (SELECT count(*) FROM investment i WHERE i.investor_fund_id = f.id)::int AS portfolio_count,
        0 AS commitment_count,
        (SELECT count(*) FROM org_alias oa WHERE oa.fund_id = f.id)::int AS alias_count
      FROM fund f
      WHERE EXISTS (SELECT 1 FROM investment i WHERE i.investor_fund_id = f.id)
    ) t
    ORDER BY (portfolio_count + commitment_count) DESC, canonical_name ASC
  `;
}

export async function getInvestorOrg(id: string) {
  return prisma.org.findUnique({
    where: { id },
    include: {
      investment_investment_investor_org_idToorg: {
        include: { org_investment_portfolio_org_idToorg: true },
        orderBy: { round_date: "asc" },
      },
      commitment: { include: { fund: true, programme: true }, orderBy: { commit_date: "asc" } },
      org_alias: true,
    },
  });
}

export async function getInvestorFund(id: string) {
  return prisma.fund.findUnique({
    where: { id },
    include: {
      investment: {
        include: { org_investment_portfolio_org_idToorg: true },
        orderBy: { round_date: "asc" },
      },
      org_alias: true,
      org: true,
    },
  });
}

export async function getAliases() {
  return prisma.org_alias.findMany({
    include: { org: true, fund: true },
    orderBy: { raw_name: "asc" },
  });
}
