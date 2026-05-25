"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      window.location.href = "/dashboard";
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{padding: 40}}>
      <h1>Merchant login</h1>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" /><br/><br/>
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" /><br/><br/>
      <button type="submit">Sign in</button>
      {error && <p style={{color: "red"}}>{error}</p>}
    </form>
  );
}
