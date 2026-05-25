"use client";
import { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

export default function AuthCallback() {
  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        window.location.href = "/me";
      }
    });
  }, []);

  return <p style={{padding: 40, color: "white"}}>Signing you in...</p>;
}
