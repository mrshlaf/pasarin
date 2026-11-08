import { supabase } from "@/lib/supabase";

export async function apiFetch(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const { data: { session } } = await supabase.auth.getSession();
  if (session) headers.set("Authorization", `Bearer ${session.access_token}`);
  return fetch(path, { ...init, headers });
}
