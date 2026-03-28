"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Status = "idle" | "sending" | "sent" | "error";

export default function AuthPage() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");

  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // If already logged in, go straight to /company
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        // Not fatal; just show for debugging
        console.warn("getSession error:", error.message);
        return;
      }
      if (data.session) window.location.assign("/home");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) window.location.assign("/home");
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  async function sendMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setStatus("error");
      setMessage("Please enter your email.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setStatus("error");
      setMessage("That email doesn’t look valid. Please check it.");
      return;
    }

    setStatus("sending");
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
    setMessage("✅ Magic link sent. Check your email and click the link.");
  }

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1 style={{ marginBottom: 8 }}>Sign in</h1>
      <p style={{ marginTop: 0, marginBottom: 16 }}>
        We’ll email you a secure magic link.
      </p>

      <form onSubmit={sendMagicLink} style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            required
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 10,
              border: "1px solid #ccc",
            }}
          />
        </label>

        <button
          type="submit"
          disabled={status === "sending" || !emailLooksValid}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #111",
            background: "#111",
            color: "white",
            cursor:
              status === "sending" || !emailLooksValid
                ? "not-allowed"
                : "pointer",
            opacity: status === "sending" || !emailLooksValid ? 0.6 : 1,
          }}
        >
          {status === "sending" ? "Sending..." : "Send magic link"}
        </button>
      </form>

      {message ? (
        <p
          style={{
            marginTop: 16,
            color: status === "error" ? "crimson" : "inherit",
          }}
        >
          {message}
        </p>
      ) : null}

      {status === "sent" ? (
        <p style={{ marginTop: 8, fontSize: 14, opacity: 0.8 }}>
          Tip: if you don’t see it, check Spam/Junk.
        </p>
      ) : null}
    </main>
  );
}