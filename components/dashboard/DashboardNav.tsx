"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/home", label: "Home", prefixMatch: false },
  { href: "/assets", label: "Assets", prefixMatch: true },
  { href: "/mandates", label: "Mandates", prefixMatch: true },
  { href: "/deal-rooms", label: "Deal Rooms", prefixMatch: true },
  { href: "/portfolio", label: "Portfolio", prefixMatch: true },
] as const;

function isActive(pathname: string, href: string, prefixMatch: boolean) {
  if (href === "/home") {
    return pathname === "/home";
  }
  if (prefixMatch) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  return pathname === href;
}

export function DashboardNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="px-4 py-4">
      <ul className="space-y-1">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href, item.prefixMatch);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-white/15 text-white"
                    : "text-white/85 hover:bg-white/10 hover:text-white"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}