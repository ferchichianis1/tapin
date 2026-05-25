"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        window.location.href = "/me";
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return <p style={{ padding: 40, color: "white" }}>Signing you in...</p>;
}
