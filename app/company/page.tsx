import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export default async function CompanyPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Server Components can be read-only in Next; ignore if blocked
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {}
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { data: memberships, error } = await supabase
    .from("company_memberships")
    .select("role, companies ( id, name )")
    .eq("user_id", user.id);

  const companies =
    (memberships ?? [])
      .map((m: any) => ({
        id: m.companies?.id,
        name: m.companies?.name,
        role: m.role,
      }))
      .filter((c: any) => c.id) ?? [];

  return (
    <main style={{ padding: 24 }}>
      <h1>Company</h1>
      <p>Signed in as: {user.email}</p>

      <div style={{ marginTop: 12, display: "flex", gap: 16 }}>
        <Link href="/company/new">+ Create a company</Link>

        <form action="/auth/signout" method="post">
          <button
            type="submit"
            style={{
              border: "1px solid #111",
              background: "white",
              borderRadius: 10,
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </form>
      </div>

      <h2 style={{ marginTop: 24 }}>Your companies</h2>

      {error ? (
        <p style={{ color: "crimson" }}>Error: {error.message}</p>
      ) : companies.length === 0 ? (
        <p>No company yet. Create one.</p>
      ) : (
        <ul>
          {companies.map((c: any) => (
            <li key={c.id}>
              {c.name} — <em>{c.role}</em>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}