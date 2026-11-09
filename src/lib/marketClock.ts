/**
 * Modul Utilitas Waktu Operasional Pasar Induk Kramat Jati (WIB / UTC+7) (PSR-4).
 * Menyediakan stempel waktu Waktu Indonesia Barat yang terstandarisasi untuk pencatatan
 * jam kedatangan pasokan subuh, waktu transaksi kasir, dan penanda waktu penerbitan tiket lot.
 */

/**
 * Menghasilkan string waktu aktual dalam zona waktu Waktu Indonesia Barat (WIB / UTC+7) berformat "HH:mm WIB".
 * Menghitung offset waktu UTC+7 secara deterministik tanpa bergantung pada zona waktu mesin klien/server.
 *
 * @returns String waktu terformat, misalnya "14:30 WIB".
 */
export function getRealtimeWIBTimeString(): string {
  const now = new Date();
  const wibHours = (now.getUTCHours() + 7) % 24;
  const wibMinutes = now.getUTCMinutes();
  return `${String(wibHours).padStart(2, "0")}:${String(wibMinutes).padStart(2, "0")} WIB`;
}
