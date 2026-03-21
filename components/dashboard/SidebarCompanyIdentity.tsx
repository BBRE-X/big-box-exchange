import Link from "next/link";
import { getActiveCompanyRecord } from "@/lib/app-context";

type SidebarCompanyIdentityProps = {
  userId: string | null;
};

export async function SidebarCompanyIdentity({ userId }: SidebarCompanyIdentityProps) {
  if (!userId) {
    return (
      <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
        <p className="text-[11px] font-medium text-white/50">Not signed in</p>
        <Link
          href="/auth"
          className="mt-0.5 block text-[11px] font-medium text-white/75 underline-offset-2 hover:text-white"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const company = await getActiveCompanyRecord(userId);

  if (!company) {
    return (
      <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10 text-[11px] font-semibold text-white/60"
          aria-hidden
        >
          —
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium text-white/50">No active company</p>
          <Link
            href="/companies"
            className="text-[11px] font-medium text-white/70 underline-offset-2 hover:text-white"
          >
            Choose company
          </Link>
        </div>
      </div>
    );
  }

  const initial = company.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      {company.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote company logo URL from storage
        <img
          src={company.logo_url}
          alt=""
          className="h-8 w-8 shrink-0 rounded-md object-cover"
        />
      ) : (
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/15 text-[11px] font-semibold text-white"
          aria-hidden
        >
          {initial}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium leading-tight text-white">{company.name}</p>
        <Link
          href="/companies"
          className="text-[10px] font-medium text-white/50 hover:text-white/75"
        >
          Switch company
        </Link>
      </div>
    </div>
  );
}
