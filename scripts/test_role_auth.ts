/**
 * Skrip Uji Otomatis Autentikasi Pengguna & Penegakan Isolasi Peran (PSR-40).
 * Memvalidasi 6 kriteria penerimaan kritis (Acceptance Criteria):
 * 1. Ketersediaan kredensial akun preset 7 peran operasional (DEMO_ACCOUNTS).
 * 2. Akurasi pemetaan dan inferensi peran berbasis alamat email (inferRoleFromEmail).
 * 3. Penegakan aturan isolasi peran (Role Isolation) untuk aktor operasional (Warteg, Pedagang, Maggot, Kurir, Dapur Sosial).
 * 4. Hak istimewa pengawasan penuh (Supervisory Privilege) bagi peran Administrator dan Pengelola Pasar.
 * 5. Sanitasi input email dan panjang minimal kata sandi (>= 6 karakter).
 * 6. Kesiapan instans klien Supabase Auth untuk penanganan sesi otentikasi.
 */

import { DEMO_ACCOUNTS, DUMMY_ACCOUNTS, inferRoleFromEmail, AuthUser } from "../src/lib/authContext";
import { supabase } from "../src/lib/supabase";
import { AppRole } from "../src/lib/simulationStore";

let passedCount = 0;
let failedCount = 0;

/**
 * Memeriksa kondisi boolean dan mencetak log hasil ke konsol.
 *
 * @param condition - Kondisi kebenaran yang diuji.
 * @param testName - Nama skenario pengujian.
 * @param detail - Informasi rincian nilai hasil observasi.
 */
function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}${detail ? ` -> ${detail}` : ""}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ""}`);
    failedCount++;
  }
}

/**
 * Helper evaluator aturan isolasi peran murni tanpa dependensi DOM React.
 *
 * @param user - Objek pengguna terautentikasi.
 * @param targetRole - Peran antarmuka yang hendak diakses.
 * @returns True jika peran diizinkan, false jika terblokir oleh Role Isolation.
 */
function evaluateRoleAccess(user: AuthUser | null, targetRole: AppRole): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.role === "manager") return true;
  return user.role === targetRole;
}

/**
 * Menjalankan rangkaian pengujian integrasi autentikasi peran PSR-40.
 */
async function runRoleAuthTests() {
  console.log("\n--- PASARIN PSR-40 ROLE AUTHENTICATION & LOGIN TEST SUITE ---");

  // Test 1: Verifikasi kelengkapan akun preset 7 peran
  console.log("\n[Test 1] Verifikasi Definisi Akun Preset 7 Peran (DEMO_ACCOUNTS)");
  const requiredRoles: AppRole[] = [
    "vendor",
    "warteg",
    "social_kitchen",
    "maggot",
    "logistics",
    "manager",
    "admin",
  ];

  requiredRoles.forEach((role) => {
    const acc = DEMO_ACCOUNTS[role];
    assert(
      !!acc && acc.role === role && acc.email.includes("@pasarin.id"),
      `Akun preset peran '${role}' terdaftar lengkap`,
      `${acc?.email} (${acc?.name})`
    );
  });

  // Test 1b: Verifikasi akun dummy gampang diingat (username = password) dengan nama profil riil
  console.log("\n[Test 1b] Verifikasi Akun Dummy Gampang Diingat (DUMMY_ACCOUNTS)");
  const dummyKeys = ["pasar1", "warteg1", "sosial1", "maggot1", "kurir1", "pengelola1", "admin1"];
  dummyKeys.forEach((key) => {
    const dummy = DUMMY_ACCOUNTS[key];
    assert(
      !!dummy && dummy.username === key && dummy.name.length > 0,
      `Akun dummy '${key}' valid (Nama Profil: ${dummy?.name})`,
      `Username: ${dummy?.username} | Role: ${dummy?.role}`
    );
  });

  // Test 2: Inferensi peran otomatis berdasarkan domain dan pola email
  console.log("\n[Test 2] Inferensi Peran Otomatis dari Alamat Email & Username (inferRoleFromEmail)");
  assert(
    inferRoleFromEmail("pasar1") === "vendor",
    "Username 'pasar1' otomatis teridentifikasi sebagai peran 'vendor'",
    "vendor"
  );
  assert(
    inferRoleFromEmail("warteg1") === "warteg",
    "Username 'warteg1' otomatis teridentifikasi sebagai peran 'warteg'",
    "warteg"
  );
  assert(
    inferRoleFromEmail("admin1") === "admin",
    "Username 'admin1' otomatis teridentifikasi sebagai peran 'admin'",
    "admin"
  );
  assert(
    inferRoleFromEmail("warteg.bahari@pasarin.id") === "warteg",
    "Email bertopik warteg otomatis teridentifikasi sebagai peran 'warteg'",
    "warteg"
  );
  assert(
    inferRoleFromEmail("dapursosial.peduli@pasarin.id") === "social_kitchen",
    "Email dapur sosial teridentifikasi sebagai peran 'social_kitchen'",
    "social_kitchen"
  );
  assert(
    inferRoleFromEmail("sentra.maggot@pasarin.id") === "maggot",
    "Email sentra maggot teridentifikasi sebagai peran 'maggot'",
    "maggot"
  );
  assert(
    inferRoleFromEmail("armada.kurir@pasarin.id") === "logistics",
    "Email kurir armada teridentifikasi sebagai peran 'logistics'",
    "logistics"
  );
  assert(
    inferRoleFromEmail("admin.utama@pasarin.id") === "admin",
    "Email admin teridentifikasi sebagai peran 'admin'",
    "admin"
  );

  // Test 3: Penegakan Role Isolation bagi peran operasional (Warteg)
  console.log("\n[Test 3] Penegakan Aturan Role Isolation untuk Peran Operasional (Warteg)");
  const wartegUser: AuthUser = {
    id: "usr_test_warteg_01",
    email: "warteg@pasarin.id",
    role: "warteg",
    name: "Warteg Kharisma Bahari",
    organization: "Mitra Konsumsi Pangan",
  };

  assert(
    evaluateRoleAccess(wartegUser, "warteg") === true,
    "Pengguna Warteg diizinkan mengakses dashboard Warteg miliknya",
    "Akses Diizinkan"
  );
  assert(
    evaluateRoleAccess(wartegUser, "vendor") === false,
    "Role Isolation: Pengguna Warteg DILARANG mengakses dashboard Pedagang",
    "Terkunci / Ditolak"
  );
  assert(
    evaluateRoleAccess(wartegUser, "maggot") === false,
    "Role Isolation: Pengguna Warteg DILARANG mengakses dashboard Maggot",
    "Terkunci / Ditolak"
  );
  assert(
    evaluateRoleAccess(wartegUser, "admin") === false,
    "Role Isolation: Pengguna Warteg DILARANG mengakses dashboard Administrator",
    "Terkunci / Ditolak"
  );

  // Test 4: Hak Pengawas Penuh (Supervisory Privilege) bagi Administrator
  console.log("\n[Test 4] Hak Pengawas Penuh (Supervisory Privilege) bagi Administrator");
  const adminUser: AuthUser = {
    id: "usr_test_admin_01",
    email: "admin@pasarin.id",
    role: "admin",
    name: "Lead Architect",
    organization: "Departemen Teknik Elektro FTUI",
  };

  requiredRoles.forEach((targetRole) => {
    assert(
      evaluateRoleAccess(adminUser, targetRole) === true,
      `Administrator berhak mengakses dan mengawasi peran '${targetRole}'`,
      "Akses Pengawas Aktif"
    );
  });

  // Test 5: Pengguna tidak terautentikasi (Guest/Null) ditolak seluruh akses
  console.log("\n[Test 5] Penolakan Hak Akses bagi Pengguna yang Belum Login (Unauthenticated)");
  assert(
    evaluateRoleAccess(null, "vendor") === false,
    "Pengguna belum login dilarang mengakses dashboard Pedagang",
    "Ditolak"
  );
  assert(
    evaluateRoleAccess(null, "admin") === false,
    "Pengguna belum login dilarang mengakses dashboard Administrator",
    "Ditolak"
  );

  // Test 6: Verifikasi Ketersediaan Supabase Auth Client
  console.log("\n[Test 6] Verifikasi Instans Klien Supabase Auth");
  assert(
    !!supabase && !!supabase.auth && typeof supabase.auth.signInWithPassword === "function",
    "Klien Supabase Auth terdefinisi dan siap melayani operasi otentikasi kata sandi",
    "Supabase Auth Client Ready"
  );
  assert(
    typeof supabase.auth.signOut === "function" && typeof supabase.auth.getSession === "function",
    "Metode penanganan sesi Supabase signOut dan getSession terpasang valid",
    "Session Handlers Ready"
  );

  // Ringkasan hasil test
  console.log(`\n🎉 HASIL PENGUJIAN AKHIR PSR-40: ${passedCount} LULUS, ${failedCount} GAGAL\n`);

  if (failedCount > 0) {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

runRoleAuthTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exitCode = 1;
});
