import Link from "next/link";

export function NavBar() {
  return (
    <nav className="flex items-center gap-6 border-b border-neutral-800 px-6 py-4">
      <Link href="/" className="font-semibold">
        lpinvestors
      </Link>
    </nav>
  );
}
