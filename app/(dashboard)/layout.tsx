import type { ReactNode } from "react";
import Link from "next/link";

type DashboardLayoutProps = {
  children: ReactNode;
};

const navItems = [
  { href: "/home", label: "Home" },
  { href: "/assets", label: "Assets" },
  { href: "/mandates", label: "Mandates" },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-red-50">
      <div className="grid min-h-screen grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-r border-red-200 bg-black text-white">
          <div className="border-b border-white/10 px-6 py-6">
            <Link href="/home" className="text-lg font-semibold tracking-tight">
              Big Box Exchange
            </Link>
            <p className="mt-2 text-xs text-white/70">Dashboard shell loaded</p>
          </div>

          <nav className="px-4 py-6">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-xl px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/10 hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="min-w-0 bg-white">
          <header className="border-b border-red-200 px-6 py-4">
            <div className="text-sm font-medium text-red-600">
              Dashboard layout active
            </div>
          </header>

          <div className="px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}