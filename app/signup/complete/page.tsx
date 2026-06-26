"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { migrateGuestProgress } from "@/lib/guestProgress";
import styles from "../../auth.module.css";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export default function CompleteSignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "ok" | "bad">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const today = useRef(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace("/login"); return; }
      supabase.from("profiles").select("id").eq("id", user.id).maybeSingle().then(({ data }) => {
        if (data) router.replace("/");
      });
    });
  }, [router]);

  function handleUsernameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const u = e.target.value;
    setUsername(u);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (u.length === 0) { setUsernameStatus("idle"); return; }
    if (!USERNAME_RE.test(u)) { setUsernameStatus("bad"); return; }
    setUsernameStatus("checking");
    debounceRef.current = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase.from("profiles").select("id").eq("username", u).maybeSingle();
      setUsernameStatus(data ? "bad" : "ok");
    }, 500);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!USERNAME_RE.test(username)) {
      setError("Username: 3–20 chars, letters / numbers / underscore only.");
      return;
    }
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }

    const { error: profileError } = await supabase
      .from("profiles")
      .insert({ id: user.id, username });
    if (profileError) {
      setError("Username taken — try another.");
      setLoading(false);
      return;
    }

    await migrateGuestProgress(today.current);
    router.push("/");
    router.refresh();
  }

  const usernameHint =
    usernameStatus === "ok" ? "Available" :
    usernameStatus === "bad" ? "Taken or invalid" :
    usernameStatus === "checking" ? "Checking…" :
    "3–20 chars, letters / numbers / underscore";

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.svg" alt="" className={styles.logo} />
          <span className={styles.wordmark}>
            Capy<span>games</span>
          </span>
        </div>
        <h1 className={styles.heading}>Choose a username</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Username
            <input
              type="text"
              value={username}
              onChange={handleUsernameChange}
              className={styles.input}
              required
              autoComplete="username"
              maxLength={20}
              autoFocus
            />
          </label>
          {username.length > 0 && (
            <p className={`${styles.hint}${usernameStatus === "ok" ? ` ${styles.hintOk}` : usernameStatus === "bad" ? ` ${styles.hintBad}` : ""}`}>
              {usernameHint}
            </p>
          )}
          {error && <p className={styles.error}>{error}</p>}
          <button
            type="submit"
            className={styles.btn}
            disabled={loading || usernameStatus === "checking" || usernameStatus === "bad"}
          >
            {loading ? "Saving…" : "Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}
