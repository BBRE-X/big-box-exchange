"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TestPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("healthcheck")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setError(null);
        setRows(data ?? []);
      }

      setLoading(false);
    };

    run();
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Supabase Connection Test</h1>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p style={{ color: "red" }}>Error: {error}</p>
      ) : (
        <pre>{JSON.stringify(rows, null, 2)}</pre>
      )}
    </main>
  );
}
