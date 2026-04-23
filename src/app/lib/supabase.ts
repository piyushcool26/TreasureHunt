import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

// Singleton instance - created only once
let supabaseInstance: SupabaseClient | null = null;

function initSupabase(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  supabaseInstance = createClient(
    `https://${projectId}.supabase.co`,
    publicAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: window.localStorage,
        storageKey: `sb-${projectId}-auth-token`,
      },
    }
  );

  return supabaseInstance;
}

// Export the singleton instance
export const supabase = initSupabase();

export const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-0b818758`;

export async function apiFetch(path: string, opts: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "apikey": publicAnonKey, // Required by Supabase infrastructure
    "Authorization": `Bearer ${publicAnonKey}`, // Always use anon key here (Supabase requirement)
    "x-user-token": token || "", // User token in custom header
    ...(opts.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const text = await res.text();

  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text };
  }

  if (!res.ok) {
    console.error(`API ${path} failed (${res.status}):`, data);
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }

  return data;
}
