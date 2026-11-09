/**
 * Modul Kalkulator Optimasi Armada Logistik & Ambang Batas Muatan (PSR-27).
 * Mengimplementasikan:
 * 1. Aturan Penugasan Muatan (Weight Dispatch Rule):
 *    - Muatan ringan <= 300 kg: Motor Viar Roda Tiga (kelincahan lorong sempit).
 *    - Muatan menengah 301 - 1.000 kg: Mobil GranMax Pikap (multi-stop warteg & panti).
 *    - Muatan massal > 1.000 kg: Truk Isuzu Elf (reject organik massal ke TPS 3R / Maggot).
 * 2. Generator Manifes Perjalanan (Delivery Manifest) dengan rute penjemputan terurut (Blok A -> B -> C).
 * 3. Estimasi konsumsi bahan bakar (BBM), jarak tempuh, dan durasi pengantaran.
 */

/**
 * Klasifikasi armada logistik penyelamatan pangan pasar (PSR-27).
 * - viar_trike: Motor roda tiga kapasitas muatan ringan <= 300 kg.
 * - granmax_pickup: Mobil pikap bak kapasitas muatan menengah 301 - 1.000 kg.
 * - isuzu_truck: Truk engkel kapasitas muatan massal > 1.000 kg.
 */
export type VehicleClass = "viar_trike" | "granmax_pickup" | "isuzu_truck";

/**
 * Spesifikasi teknis dan operasional armada pengangkut logistik (PSR-27).
 */
export interface VehicleSpec {
  type: VehicleClass;
  displayName: string;
  maxCapacityKg: number;
  fuelEfficiencyKmPerLiter: number;
  fuelType: string;
  fuelPricePerLiterIdr: number;
  suitability: string;
  defaultDriver: string;
  licensePlate: string;
}

/**
 * Parameter spesifikasi baku armada logistik resmi Pasar Induk Kramat Jati (PSR-27).
 */
export const VEHICLE_SPECIFICATIONS: Record<VehicleClass, VehicleSpec> = {
  viar_trike: {
    type: "viar_trike",
    displayName: "Motor Viar Roda Tiga",
    maxCapacityKg: 300,
    fuelEfficiencyKmPerLiter: 16.0,
    fuelType: "Pertalite",
    fuelPricePerLiterIdr: 10000,
    suitability: "Muatan ringan (<= 300 kg), lincah di lorong sempit pasar dan gang perumahan warteg.",
    defaultDriver: "Pak Joko Santoso",
    licensePlate: "B 4521 TXX",
  },
  granmax_pickup: {
    type: "granmax_pickup",
    displayName: "Daihatsu GranMax Pikap Bak",
    maxCapacityKg: 1000,
    fuelEfficiencyKmPerLiter: 10.5,
    fuelType: "Pertamax",
    fuelPricePerLiterIdr: 12100,
    suitability: "Muatan menengah (301 - 1.000 kg), kapasitas besar untuk distribusi multi-stop Warteg & Dapur Sosial.",
    defaultDriver: "Pak Hendra Wijaya",
    licensePlate: "B 9812 SAA",
  },
  isuzu_truck: {
    type: "isuzu_truck",
    displayName: "Truk Engkel Isuzu Elf",
    maxCapacityKg: 4000,
    fuelEfficiencyKmPerLiter: 6.5,
    fuelType: "Bio Solar",
    fuelPricePerLiterIdr: 6800,
    suitability: "Muatan massal (> 1.000 kg), pengangkutan limbah reject organik massal langsung ke biokonversi maggot & TPS 3R.",
    defaultDriver: "Bpk. Rahmat Hidayat",
    licensePlate: "B 7710 KDA",
  },
};

/**
 * Hasil perhitungan penugasan muatan dan optimasi armada logistik (PSR-27).
 */
export interface FleetAllocationResult {
  vehicleType: VehicleClass;
  vehicleSpec: VehicleSpec;
  unitsRequired: number;
  totalPayloadKg: number;
  capacityUtilizationPct: number;
  targetCategory: "warteg" | "social_kitchen" | "maggot" | "mixed";
  recommendedDriver: string;
  dispatchDescription: string;
}

/**
 * Titik henti penjemputan komoditas di los kios pasar (PSR-27).
 */
export interface CargoStop {
  kioskStall: string;
  kioskName: string;
  block: "A" | "B" | "C";
  commodityName: string;
  weightKg: number;
  orderId?: string;
}

/**
 * Manifes perjalanan pengiriman barang terstruktur ke mitra sirkular (PSR-27).
 */
export interface DeliveryManifest {
  manifestId: string;
  allocatedVehicle: VehicleSpec;
  unitsCount: number;
  driverName: string;
  licensePlate: string;
  totalWeightKg: number;
  capacityUtilizationPct: number;
  destinationName: string;
  destinationRole: "warteg" | "social_kitchen" | "maggot";
  estimatedDistanceKm: number;
  estimatedDurationMinutes: number;
  fuelConsumptionLiters: number;
  estimatedFuelCostIdr: number;
  orderedPickUpStops: CargoStop[];
  createdAt: string;
}

/**
 * Menentukan alokasi armada angkut optimal berdasarkan bobot muatan total (Weight Dispatch Rule).
 *
 * @param totalWeightKg - Total bobot komoditas yang harus diangkut (kilogram).
 * @param targetCategory - Kategori peruntukan penerima (warteg, panti sosial, maggot, atau campuran).
 * @returns Objek alokasi armada beserta spesifikasi kendaraan dan pemanfaatan kapasitas.
 */
export function calculateFleetAllocation(
  totalWeightKg: number,
  targetCategory: "warteg" | "social_kitchen" | "maggot" | "mixed" = "mixed"
): FleetAllocationResult {
  const normalizedWeight = Math.max(1, totalWeightKg);

  let vehicleType: VehicleClass;
  let unitsRequired = 1;

  if (normalizedWeight <= 300) {
    // 1. Muatan ringan (<= 300 kg) -> Viar Roda 3
    vehicleType = "viar_trike";
    unitsRequired = Math.ceil(normalizedWeight / 300);
  } else if (normalizedWeight <= 1000) {
    // 2. Muatan menengah (301 - 1.000 kg) -> GranMax Pikap
    vehicleType = "granmax_pickup";
    unitsRequired = Math.ceil(normalizedWeight / 1000);
  } else {
    // 3. Muatan massal (> 1.000 kg) -> Truk Isuzu Elf
    vehicleType = "isuzu_truck";
    unitsRequired = Math.ceil(normalizedWeight / 4000);
  }

  const spec = VEHICLE_SPECIFICATIONS[vehicleType];
  const totalCapacity = spec.maxCapacityKg * unitsRequired;
  const capacityUtilizationPct = Number(((normalizedWeight / totalCapacity) * 100).toFixed(1));

  let dispatchDescription = "";
  if (vehicleType === "viar_trike") {
    dispatchDescription = `${unitsRequired} unit Motor Viar Roda Tiga dialokasikan untuk muatan ringan ${normalizedWeight} kg. Ideal bermanuver di lorong sempit.`;
  } else if (vehicleType === "granmax_pickup") {
    dispatchDescription = `${unitsRequired} unit Daihatsu GranMax Pikap ditugaskan untuk muatan ${normalizedWeight} kg menuju mitra komersial & dapur sosial.`;
  } else {
    dispatchDescription = `${unitsRequired} unit Truk Isuzu Elf ditugaskan untuk pengangkutan limbah organik massal ${normalizedWeight} kg menuju fasilitas biokonversi maggot TPS 3R.`;
  }

  return {
    vehicleType,
    vehicleSpec: spec,
    unitsRequired,
    totalPayloadKg: normalizedWeight,
    capacityUtilizationPct,
    targetCategory,
    recommendedDriver: spec.defaultDriver,
    dispatchDescription,
  };
}

/**
 * Menyusun manifes perjalanan pengiriman dengan rute penjemputan los yang terurut (Blok A -> B -> C).
 *
 * @param stops - Daftar kios penjemputan komoditas.
 * @param destination - Tujuan pengantaran (Warteg, Dapur Sosial, atau Maggot).
 * @returns Manifes perjalanan lengkap beserta rute terurut, konsumsi BBM, dan durasi.
 */
export function generateDeliveryManifest(
  stops: CargoStop[],
  destination: {
    name: string;
    role: "warteg" | "social_kitchen" | "maggot";
    distanceKm: number;
  }
): DeliveryManifest {
  const totalWeightKg = stops.reduce((acc, s) => acc + s.weightKg, 0);
  const allocation = calculateFleetAllocation(totalWeightKg, destination.role);
  const spec = allocation.vehicleSpec;

  // Urutkan rute penjemputan secara logis: Blok A (Basah) -> Blok B (Bumbu) -> Blok C (Kering)
  const blockPriority = { A: 1, B: 2, C: 3 };
  const orderedPickUpStops = [...stops].sort((a, b) => {
    const pA = blockPriority[a.block] || 4;
    const pB = blockPriority[b.block] || 4;
    if (pA !== pB) return pA - pB;
    return a.kioskStall.localeCompare(b.kioskStall);
  });

  // Estimasi jarak total: jarak penjemputan antar kios di pasar (~0.3 km per kios) + jarak ke tujuan
  const internalMarketKm = Math.max(0.5, stops.length * 0.25);
  const totalDistanceKm = Number((internalMarketKm + destination.distanceKm).toFixed(1));

  // Estimasi konsumsi BBM (liter) dan biaya (IDR)
  const fuelConsumptionLiters = Number((totalDistanceKm / spec.fuelEfficiencyKmPerLiter).toFixed(2));
  const estimatedFuelCostIdr = Math.round(fuelConsumptionLiters * spec.fuelPricePerLiterIdr);

  // Estimasi durasi (menit): 5 menit per kios penjemputan + waktu perjalanan (kecepatan rata-rata 25 km/jam di Jakarta Timur)
  const loadingTimeMinutes = stops.length * 5;
  const transitTimeMinutes = Math.round((totalDistanceKm / 25) * 60);
  const estimatedDurationMinutes = loadingTimeMinutes + transitTimeMinutes;

  return {
    manifestId: `MNF-${Date.now().toString().slice(-6)}`,
    allocatedVehicle: spec,
    unitsCount: allocation.unitsRequired,
    driverName: spec.defaultDriver,
    licensePlate: spec.licensePlate,
    totalWeightKg,
    capacityUtilizationPct: allocation.capacityUtilizationPct,
    destinationName: destination.name,
    destinationRole: destination.role,
    estimatedDistanceKm: totalDistanceKm,
    estimatedDurationMinutes,
    fuelConsumptionLiters,
    estimatedFuelCostIdr,
    orderedPickUpStops,
    createdAt: new Date().toISOString(),
  };
}
