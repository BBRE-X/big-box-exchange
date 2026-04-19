import { getActiveCompanyRecord } from "@/lib/app-context";
import { supabaseServer } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await supabaseServer();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return <div>Not logged in</div>;
  }

  const company = await getActiveCompanyRecord(user.id);

  return (
    <main className="p-8">
      <h1 className="mb-2 text-2xl font-semibold">Home</h1>
      <p className="mb-4">Logged in. Active company context is set.</p>

      <div className="rounded border p-4">
        <h2 className="mb-1 font-semibold">Company</h2>
        <p>{company?.name ?? "No company found"}</p>
      </div>
    </main>
  );
}