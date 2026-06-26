"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "./UserMenu.module.css";

interface Props {
  username: string | null;
  isAuthenticated: boolean;
}

export default function UserMenu({ username, isAuthenticated }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!isAuthenticated) {
    return <Link href="/login" className={styles.signIn}>Sign in</Link>;
  }

  if (!username) {
    return <Link href="/signup/complete" className={styles.signIn}>Complete setup →</Link>;
  }

  async function handleSignOut() {
    setOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        className={styles.avatar}
        onClick={() => setOpen((o) => !o)}
        aria-label="User menu"
        aria-expanded={open}
      >
        {username[0].toUpperCase()}
      </button>
      {open && (
        <div className={styles.dropdown} role="menu">
          <span className={styles.dropUsername}>{username}</span>
          <button onClick={handleSignOut} className={styles.signOut} role="menuitem">
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
