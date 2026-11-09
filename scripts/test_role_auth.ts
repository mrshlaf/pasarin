import assert from "node:assert/strict";
import type { User } from "@supabase/supabase-js";
import { APP_ROLES, accountProfile, isAppRole, resolveLoginEmail } from "../src/data/accounts";

/** Menghasilkan respons entitas pengguna Supabase dengan metadata peran terisolasi (app_metadata vs user_metadata). */
function account(role?: string): User {
  return {
    id: "account-test", email: "admin@example.test", app_metadata: { pasarin_role: role, pasarin_vendor_id: "vendor_kramat_01" },
    user_metadata: { role: "admin", name: "Test account" }, aud: "authenticated", created_at: "2026-11-08T00:00:00Z",
  };
}

for (const role of APP_ROLES) {
  assert.ok(isAppRole(role));
  assert.equal(accountProfile(account(role))?.role, role);
}
assert.equal(accountProfile(account("vendor"))?.vendorId, "vendor_kramat_01");
assert.equal(accountProfile(account()), null);
assert.equal(accountProfile(account("invented")), null);
assert.equal(resolveLoginEmail(" Admin1 "), "admin1@pasarin.id");
assert.equal(resolveLoginEmail(" Ops@example.test "), "ops@example.test");
console.log("Role mappings, rejection of untrusted roles and both login formats passed.");
