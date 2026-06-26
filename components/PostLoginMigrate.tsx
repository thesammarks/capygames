"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { migrateGuestProgress } from "@/lib/guestProgress";

export default function PostLoginMigrate() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (!params.get("post_login")) return;
    const today = new Date().toISOString().slice(0, 10);
    migrateGuestProgress(today).finally(() => {
      router.replace("/", { scroll: false });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
