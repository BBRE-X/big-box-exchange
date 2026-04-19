import type { ReactNode } from "react";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { SidebarCompanyIdentity } from "@/components/dashboard/SidebarCompanyIdentity";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b border-gray-800 bg-[#111111] text-white md:border-b-0 md:border-r md:border-gray-200">
          <div className="border-b border-white/10 px-5 py-4">
            <Link href="/home" className="text-base font-semibold tracking-tight text-white">
              Big Box Exchange
            </Link>
            <SidebarCompanyIdentity userId={user?.id ?? null} />
          </div>

          <DashboardNav />
        </aside>

        <main className="min-w-0 bg-white">
          <header className="border-b border-gray-200">
            <div className="flex items-center justify-between px-6 py-3">
              <div className="text-xs font-medium text-gray-500">Company dashboard</div>
            </div>
          </header>

          <div className="px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
