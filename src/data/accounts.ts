import type { User } from "@supabase/supabase-js";

export const APP_ROLES = ["vendor", "warteg", "social_kitchen", "maggot", "logistics", "manager", "admin"] as const;
export type AppRole = typeof APP_ROLES[number];

export interface AuthUser {
  id: string;
  email: string;
  role: AppRole;
  name: string;
  organization: string;
  vendorId?: string;
}

/** Resolves Pasarin usernames to their Supabase account email. */
export function resolveLoginEmail(identifier: string) {
  const login = identifier.trim().toLowerCase();
  return login.includes("@") ? login : `${login}@pasarin.id`;
}

/** Accepts only the roles understood by both web and Telegram. */
export function isAppRole(value: unknown): value is AppRole {
  return APP_ROLES.some((role) => role === value);
}

/** Maps a verified account to an application identity using server-managed authorization metadata. */
export function accountProfile(user: User): AuthUser | null {
  const role: unknown = user.app_metadata.pasarin_role;
  if (!isAppRole(role)) return null;
  return {
    id: user.id,
    email: user.email ?? "",
    name: typeof user.user_metadata.name === "string" ? user.user_metadata.name : user.email ?? user.id,
    organization: typeof user.user_metadata.organization === "string" ? user.user_metadata.organization : "",
    role,
    vendorId: typeof user.app_metadata.pasarin_vendor_id === "string" ? user.app_metadata.pasarin_vendor_id : undefined,
  };
}
