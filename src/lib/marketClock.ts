/** Formats timestamps displayed on market arrivals and receipts in WIB. */
export function getRealtimeWIBTimeString(): string {
  const now = new Date();
  const wibHours = (now.getUTCHours() + 7) % 24;
  const wibMinutes = now.getUTCMinutes();
  return `${String(wibHours).padStart(2, "0")}:${String(wibMinutes).padStart(2, "0")} WIB`;
}
