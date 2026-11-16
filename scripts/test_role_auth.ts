/**
 * Skrip Pengujian Unit Mandiri: PSR-40 (Supabase Role Authentication & Role Isolation).
 * Memverifikasi:
 * 1. Seluruh 7 peran resmi terdaftar dan tervalidasi oleh guard isAppRole.
 * 2. Pemetaan profil akun mengambil peran dari app_metadata (bukan user_metadata yang rentan dimanipulasi).
 * 3. Identifikasi vendorId otomatis terekstraksi untuk peran vendor.
 * 4. Penolakan peran fiktif / akun tanpa metadata peran resmi.
 * 5. Resolusi format email login: username pendek (@pasarin.id) vs email lengkap kustom.
 */

import assert from "node:assert/strict";
import type { User } from "@supabase/supabase-js";
import { APP_ROLES, accountProfile, isAppRole, resolveLoginEmail } from "../src/data/accounts";

/**
 * Menghasilkan entitas objek User tiruan Supabase Auth dengan metadata peran terisolasi.
 * Memisahkan app_metadata (aman, hanya diatur server) dengan user_metadata (dapat diubah pengguna).
 *
 * @param role - Nama peran pengguna yang disimulasikan.
 * @returns Objek User Supabase lengkap dengan token dan metadata.
 */
function account(role?: string): User {
  return {
    id: "account-test",
    email: "admin@example.test",
    app_metadata: { pasarin_role: role, pasarin_vendor_id: "vendor_kramat_01" },
    user_metadata: { role: "admin", name: "Test account" },
    aud: "authenticated",
    created_at: "2026-11-08T00:00:00Z",
  };
}

// 1. Verifikasi kelayakan seluruh 7 peran aplikasi resmi (vendor, warteg, social_kitchen, maggot, logistics, manager, admin)
for (const role of APP_ROLES) {
  // Memvalidasi bahwa setiap peran terdaftar sah dalam type guard isAppRole
  assert.ok(isAppRole(role), `Peran '${role}' wajib tervalidasi sebagai peran aplikasi resmi`);

  // Memvalidasi bahwa accountProfile membaca peran secara tepat dari app_metadata
  assert.equal(accountProfile(account(role))?.role, role, `Profil akun wajib memetakan peran '${role}'`);
}

// 2. Memvalidasi bahwa akun vendor secara otomatis memperoleh atribut vendorId (vendor_kramat_01)
assert.equal(
  accountProfile(account("vendor"))?.vendorId,
  "vendor_kramat_01",
  "Akun dengan peran vendor wajib memiliki vendorId yang valid"
);

// 3. Memvalidasi penolakan akun yang tidak memiliki metadata peran (app_metadata kosong -> null)
assert.equal(
  accountProfile(account()),
  null,
  "Akun tanpa metadata peran resmi wajib ditolak dan mengembalikan null"
);

// 4. Memvalidasi penolakan peran fiktif yang tidak dikenal (misal 'invented' -> null)
assert.equal(
  accountProfile(account("invented")),
  null,
  "Peran asing/fiktif wajib ditolak untuk mencegah eskalasi hak akses"
);

// 5. Memvalidasi resolusi username sederhana (" Admin1 ") otomatis dipetakan ke domain resmi "admin1@pasarin.id"
assert.equal(
  resolveLoginEmail(" Admin1 "),
  "admin1@pasarin.id",
  "Resolusi username sederhana wajib ditambahkan domain @pasarin.id secara lowercase dan trim"
);

// 6. Memvalidasi alamat email kustom pihak ketiga (" Ops@example.test ") tetap dipertahankan format emailnya
assert.equal(
  resolveLoginEmail(" Ops@example.test "),
  "ops@example.test",
  "Alamat email eksternal kustom wajib dipertahankan setelah proses pembersihan spasi dan lowercase"
);

console.log("Role mappings, rejection of untrusted roles and both login formats passed.");
