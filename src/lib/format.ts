export function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toISOString().slice(0, 10);
}

export function formatGBP(amount: unknown): string {
  if (amount === null || amount === undefined) return "undisclosed";
  const n = Number(amount);
  if (Number.isNaN(n)) return "undisclosed";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function companiesHouseUrl(crn: string): string {
  return `https://find-and-update.company-information.service.gov.uk/company/${crn}`;
}
