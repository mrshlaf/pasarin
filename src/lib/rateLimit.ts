/**
 * Pembatas jumlah permintaan sederhana di memori.
 * Dipakai untuk asisten publik dan pertanyaan Telegram agar kuota model tidak habis.
 * Hitungan disimpan per instans server, jadi batasnya perkiraan, bukan batas global yang presisi.
 */

const buckets = new Map<string, number[]>();

/**
 * Mencatat satu permintaan dan mengembalikan false bila kunci ini sudah melewati batas dalam jendela waktu.
 *
 * @param key - Identitas pemanggil, misalnya alamat IP atau ID chat Telegram.
 * @param max - Jumlah permintaan maksimal dalam satu jendela.
 * @param windowMs - Panjang jendela waktu dalam milidetik.
 */
export function allowRequest(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const times = (buckets.get(key) ?? []).filter((time) => now - time < windowMs);
  if (times.length >= max) {
    buckets.set(key, times);
    return false;
  }
  times.push(now);
  buckets.set(key, times);
  // Bersihkan kunci yang sudah tidak aktif agar memori tidak terus bertambah.
  if (buckets.size > 5000) {
    for (const [bucket, values] of buckets) if (values.every((time) => now - time >= windowMs)) buckets.delete(bucket);
  }
  return true;
}
