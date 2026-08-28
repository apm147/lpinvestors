// source_filing / source_url values are sometimes just a URL, sometimes a
// URL followed by a plain-text note (e.g. the Wayve BGP/BBB double-counting
// flag in db/templates/06_investment.csv) -- render the leading URL as a
// link and keep the rest as plain text rather than linkifying the whole
// string.
export function SourceLink({ text }: { text: string | null }) {
  if (!text) return <span>—</span>;

  const spaceIndex = text.indexOf(" ");
  const firstToken = spaceIndex === -1 ? text : text.slice(0, spaceIndex);
  const rest = spaceIndex === -1 ? "" : text.slice(spaceIndex);

  if (!firstToken.startsWith("http")) {
    return <span>{text}</span>;
  }

  return (
    <span>
      <a href={firstToken} target="_blank" rel="noreferrer" className="hover:underline">
        source ↗
      </a>
      {rest && <span className="text-neutral-500">{rest}</span>}
    </span>
  );
}
