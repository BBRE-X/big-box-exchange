import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export default async function NewCompanyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorMsg = params?.error
    ? decodeURIComponent(params.error)
    : "";

  async function createCompany(formData: FormData) {
    "use server";

    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;

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

    // Ensure profile exists
    await supabase.from("profiles").upsert(
      { id: user.id, email: user.email },
      { onConflict: "id" }
    );

    // Create company
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({ name, created_by: user.id })
      .select("id")
      .single();

    if (companyError) {
      redirect(`/company/new?error=${encodeURIComponent(companyError.message)}`);
    }

    // Create membership
    const { error: memberError } = await supabase
      .from("company_memberships")
      .insert({
        company_id: company.id,
        user_id: user.id,
        role: "owner",
      });

    if (memberError) {
      redirect(`/company/new?error=${encodeURIComponent(memberError.message)}`);
    }

    redirect("/company");
  }

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1 style={{ marginBottom: 6 }}>Create your company</h1>
      <p style={{ marginTop: 0, marginBottom: 16 }}>
        Set up the company profile you’ll use across Big Box Exchange.
      </p>

      {errorMsg ? (
        <p style={{ color: "crimson", marginBottom: 16 }}>{errorMsg}</p>
      ) : null}

      <form action={createCompany}>
        <label style={{ display: "block", marginBottom: 6 }}>
          Company name
        </label>

        <input
          name="name"
          type="text"
          placeholder="e.g. Sibream"
          required
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ccc",
            marginBottom: 12,
          }}
        />

        <button
          type="submit"
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #111",
            background: "#111",
            color: "white",
            cursor: "pointer",
          }}
        >
          Create company
        </button>
      </form>
    </main>
  );
}