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
    <div className="min-h-screen bg-white text-gray-900">
      <div className="grid min-h-screen grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-r border-gray-200 bg-[#111111] text-white">
          <div className="border-b border-white/10 px-6 py-6">
            <Link href="/home" className="text-lg font-semibold tracking-tight">
              Big Box Exchange
            </Link>
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
          <header className="border-b border-gray-200">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="text-sm text-gray-500">Company dashboard</div>
            </div>
          </header>

          <div className="px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}