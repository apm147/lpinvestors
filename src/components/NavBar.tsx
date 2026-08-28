import Link from "next/link";

const LINKS = [
  { href: "/companies", label: "Companies" },
  { href: "/investors", label: "Investors" },
  { href: "/aliases", label: "Aliases" },
];

export function NavBar() {
  return (
    <nav className="flex items-center gap-6 border-b border-neutral-800 px-6 py-4">
      <Link href="/" className="font-semibold">
        lpinvestors
      </Link>
      <div className="flex gap-4 text-sm text-neutral-400">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-neutral-100">
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
