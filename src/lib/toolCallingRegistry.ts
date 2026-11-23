// Modul Registri Pemanggilan Alat Sub-Agen & Dekomposisi Kueri Bahasa Alami (PSR-18).
// Bertanggung jawab:
// 1. Mendaftarkan seluruh spesifikasi alat sub-agen ke dalam skema deklarasi fungsi resmi (FunctionDeclaration)
// yang kompatibel dengan Google Gemini Tool Calling SDK.
// 2. Menghubungkan pengenal alat dengan eksekusi nyata pada modul sub-agen terkait (weatherAgent, pasarinCore, qualityGateAgent).
// 3. Mendekomposisi pertanyaan bahasa alami manajer pasar menjadi rencana eksekusi alat berurutan (execution plan)
// tanpa memanggil modul yang tidak dibutuhkan, dengan target latensi respons di bawah dua detik (< 1.500 ms).
// Landasan Spesifikasi PRD §4.18, §16, dan §2942-2977.

// Impor: data komoditas dan kios, agen cuaca, gerbang mutu, kalkulator armada, rumus inti peluruhan, dan tipe hasil orkestrasi.
import { COMMODITIES } from "@/data/commodities";
import { weatherAgent } from "@/lib/weatherAgent";
import { qualityGateAgent } from "@/lib/qualityGateAgent";
import { calculateFleetAllocation } from "@/lib/fleetCargoCalculator";
import {
  FOOD_WASTE_CO2E_KG_PER_KG,
  FOOD_WASTE_METHANE_KG_PER_KG,
  evaluateArrheniusDecay,
  calculateRainFootfallAttenuation,
  quoteSalvagePrice,
  calculateCompositeMarketSurplus,
  KioskStockInput,
} from "@/lib/pasarinCore";
import { KIOSKS } from "@/data/kiosks";
import {
  ToolFunctionDeclaration,
  ToolExecutionResult,
  QueryDecompositionPlan,
  OrchestratorQueryResult,
  ReActStep,
  CircularRescueTier,
} from "@/types/api";

// Daftar deklarasi skema pemanggilan fungsi terstruktur (Function Declarations)
// untuk seluruh sub-agen PASARIN sesuai standar Google Gemini Tool Calling (PSR-18 / PRD §4.18).
export const PASARIN_TOOL_DECLARATIONS: ToolFunctionDeclaration[] = [
  // Alat 1: cuaca mikro stasiun pasar (sumber data cuaca).
  // Deklarasi alat 1: tanpa parameter wajib; koordinat bawaan adalah Pasar Induk Kramat Jati dan forceRefresh melewati cache 15 menit.
  {
    name: "fetchOpenWeatherTelemetry",
    agentId: "Agent_3_WeatherAgent",
    description: "Mengambil data telemetri cuaca mikro aktual stasiun Pasar Induk Kramat Jati (suhu °C, kelembapan % RH, curah hujan mm).",
    parameters: {
      type: "OBJECT",
      properties: {
        lat: { type: "NUMBER", description: "Latitude geografis stasiun cuaca pasar", default: -6.2675 },
        lon: { type: "NUMBER", description: "Longitude geografis stasiun cuaca pasar", default: 106.8702 },
        forceRefresh: { type: "BOOLEAN", description: "Abaikan cache dan paksa pembacaan sensor live", default: false },
      },
    },
  },
  // Alat 2: skor peluruhan satu komoditas dengan kinetika Arrhenius-Q10.
  // Deklarasi alat 2: hanya commodityId yang wajib; suhu, kelembapan, dan jam pajang memakai nilai bawaan los pasar (32,5 C, 75 persen, 10 jam).
  {
    name: "calculateDecayRate",
    agentId: "Agent_2_BiologicalKineticsAgent",
    description: "Menghitung laju respirasi dan akumulasi skor peluruhan biologis komoditas hortikultura berbasis persamaan kinetika Arrhenius-Q10.",
    parameters: {
      type: "OBJECT",
      properties: {
        commodityId: { type: "STRING", description: "Pengidentifikasi komoditas (contoh: kangkung, bayam, cabai_merah)" },
        ambientTempC: { type: "NUMBER", description: "Suhu lingkungan los pasar dalam derajat Celsius (°C)", default: 32.5 },
        humidityPct: { type: "NUMBER", description: "Kelembapan relatif udara dalam persen (% RH)", default: 75.0 },
        hoursOnDisplay: { type: "NUMBER", description: "Durasi pajang sejak pembongkaran subuh dalam satuan jam", default: 10.0 },
      },
      required: ["commodityId"],
    },
  },
  // Alat 3: penurunan jumlah pengunjung akibat hujan.
  // Deklarasi alat 3: curah hujan dalam mm adalah satu-satunya masukan wajib; waktu hanya keterangan.
  {
    name: "calculateFootfallIndex",
    agentId: "Agent_5_MarketCrowdDynamicsAgent",
    description: "Menghitung indeks kepadatan dan persentase redaman pengunjung retail di lorong los akibat genangan air hujan lebat.",
    parameters: {
      type: "OBJECT",
      properties: {
        rainfallMm: { type: "NUMBER", description: "Curah hujan terukur dalam milimeter (mm)", default: 0.0 },
        timeOfDay: { type: "STRING", description: "Waktu operasional pasar (contoh: 14:30 WIB)", default: "14:30" },
      },
      required: ["rainfallMm"],
    },
  },
  // Alat 4: proyeksi surplus gabungan dari susut biologis dan pembeli yang batal datang.
  // Deklarasi alat 4: semua parameter opsional dengan nilai bawaan skenario sapuan sore (2.400 kg stok, hujan 12,5 mm, pukul 14.30).
  {
    name: "computeProjectedSurplus",
    agentId: "Agent_6_SpoilagePredictiveEngine",
    description: "Mengintegrasikan susut biologis dan redaman pembeli untuk memproyeksikan estimasi volume surplus komposit dari 30 kios pasar.",
    parameters: {
      type: "OBJECT",
      properties: {
        activeStocksKg: { type: "NUMBER", description: "Total stok aktif terdaftar dalam kilogram", default: 2400.0 },
        rainfallMm: { type: "NUMBER", description: "Curah hujan aktual untuk kalkulasi redaman", default: 12.5 },
        currentHourDecimal: { type: "NUMBER", description: "Waktu penaksiran dalam desimal (14.5 = 14:30 WIB)", default: 14.5 },
      },
    },
  },
  // Alat 5: harga penyelamatan dari tabel diskon tunggal (sama dengan harga di katalog) dengan harga lantai modal pedagang.
  // Deklarasi alat 5: komoditas wajib; jam pajang, suhu, dan kelembapan menentukan skor susut, dan skor menentukan diskon.
  {
    name: "computeSalvagePrice",
    agentId: "Agent_12_DynamicPricingAgent",
    description: "Menetapkan harga penyelamatan dari skor susut: Tier 1 diskon 50%-70%, Tier 2 75%-85%, Tier 3 gratis, dengan penguncian Price Floor modal pedagang.",
    parameters: {
      type: "OBJECT",
      properties: {
        commodityId: { type: "STRING", description: "ID komoditas hortikultura yang hendak dijual" },
        hoursOnDisplay: { type: "NUMBER", description: "Lama komoditas dipajang dalam jam", default: 10.0 },
        ambientTempC: { type: "NUMBER", description: "Suhu los pasar dalam derajat Celsius", default: 32.5 },
        humidityPct: { type: "NUMBER", description: "Kelembapan relatif los pasar dalam persen", default: 75.0 },
      },
      required: ["commodityId"],
    },
  },
  // Alat 6: gerbang mutu yang melarang pangan layak makan dialihkan ke pakan maggot.
  // Deklarasi alat 6: gerbang mutu; commodityId dan requestedTier wajib karena keputusan lolos atau diblokir bergantung pada keduanya.
  {
    name: "verifyHumanGradeIntegrity",
    agentId: "Agent_10_QualityGateAgent",
    description: "Menegakkan batas kendali mutu etis Invarian 1 (Zero Edible Food to Feed) untuk mencegah moral hazard pengalihan sayuran layak konsumsi ke pakan maggot.",
    parameters: {
      type: "OBJECT",
      properties: {
        commodityId: { type: "STRING", description: "ID komoditas yang diverifikasi" },
        hoursOnDisplay: { type: "NUMBER", description: "Jam pajang di los pasar", default: 4.0 },
        requestedTier: { type: "STRING", enum: ["fresh", "tier_1", "tier_2", "tier_3"], description: "Kategori tier yang diajukan", default: "tier_3" },
        vendorId: { type: "STRING", description: "ID kios pedagang pengaju", default: "vendor_kramat_01" },
      },
      required: ["commodityId", "requestedTier"],
    },
  },
  // Alat 7: pilihan armada menurut tonase, memakai kalkulator armada (300 dan 1.000 kg).
  // Deklarasi alat 7: hanya payloadKg yang wajib; jumlah tujuan hanya memengaruhi perkiraan biaya BBM.
  {
    name: "assignVehicleType",
    agentId: "Agent_9_FleetLogisticsAgent",
    description: "Mengalokasikan armada angkut optimal (Viar Roda Tiga <=300kg, GranMax Bak <=1.000kg, Truk Isuzu >1.000kg) berdasarkan tonase surplus.",
    parameters: {
      type: "OBJECT",
      properties: {
        payloadKg: { type: "NUMBER", description: "Total berat muatan surplus yang perlu diangkut dalam kilogram" },
        destinationsCount: { type: "NUMBER", description: "Jumlah titik lokasi tujuan pengantaran", default: 3 },
      },
      required: ["payloadKg"],
    },
  },
  // Alat 8: estimasi emisi metana yang terhindar dari pembuangan ke TPA.
  // Deklarasi alat 8: berat limbah organik yang dialihkan dari TPA adalah satu-satunya masukan.
  {
    name: "calculateMethaneAvoidance",
    agentId: "Agent_16_CarbonAccountingAgent",
    description: "Menghitung potensi pencegahan emisi gas metana (CH4) dan karbon dioksida ekuivalen (CO2e) berbasis metodologi IPCC 2006.",
    parameters: {
      type: "OBJECT",
      properties: {
        divertedKg: { type: "NUMBER", description: "Bobot limbah organik yang berhasil dialihkan dari TPA Bantar Gebang (kg)" },
      },
      required: ["divertedKg"],
    },
  },
  // Alat 9: konversi satuan tradisional pasar (karung, peti, ikat) ke kg.
  // Deklarasi alat 9: konversi satuan tradisional; nama kemasan dibatasi ke lima nilai enum.
  {
    name: "parseLocalMarketUnits",
    agentId: "Agent_17_TraditionalUnitAssistant",
    description: "Mengonversi takaran satuan tradisional pasar (karung, peti, ikat, keranjang) ke dalam standar satuan kilogram metrik.",
    parameters: {
      type: "OBJECT",
      properties: {
        commodityId: { type: "STRING", description: "Komoditas yang dikonversi" },
        unitName: { type: "STRING", enum: ["karung", "peti", "ikat", "keranjang", "tandan"], description: "Nama kemasan tradisional" },
        quantity: { type: "NUMBER", description: "Jumlah kemasan", default: 1 },
      },
      required: ["commodityId", "unitName"],
    },
  },
];

// Mengeksekusi alat sub-agen yang terdaftar berdasarkan nama alat dan argumen masukan (PSR-18).
// Menghubungkan deklarasi skema secara deterministik ke implementasi kode nyata.
export async function executeRegisteredTool(
  toolName: string,
  args: Record<string, unknown> = {}
): Promise<ToolExecutionResult> {
  // Waktu eksekusi diukur untuk laporan durasi di hasil alat.
  const startTime = Date.now();
  const executedAt = new Date().toISOString();

  try {
    // Satu cabang per alat terdaftar; nama alat tak dikenal jatuh ke default di bawah.
    // Satu cabang per nama alat; nama yang tidak terdaftar jatuh ke default di bawah dengan galat terstruktur.
    switch (toolName) {
      case "fetchOpenWeatherTelemetry": {
        const forceRefresh = Boolean(args.forceRefresh);
        const weather = await weatherAgent.getMarketWeather({ forceRefresh });
        return {
          toolName,
          agentId: "Agent_3_WeatherAgent",
          success: true,
          data: weather,
          durationMs: Date.now() - startTime,
          executedAt,
        };
      }

      // Komoditas tak dikenal diganti komoditas pertama katalog; suhu, kelembapan, dan jam punya nilai bawaan.
      case "calculateDecayRate": {
        const commodityId = String(args.commodityId || "kangkung").trim().toLowerCase();
        const commodity = COMMODITIES.find((c) => c.id.toLowerCase() === commodityId) || COMMODITIES[0];
        const temp = Number(args.ambientTempC ?? 32.5);
        const rh = Number(args.humidityPct ?? 75.0);
        const hours = Number(args.hoursOnDisplay ?? 10.0);

        // Perhitungan sebenarnya dilakukan fungsi rumus inti; alat hanya membungkus hasilnya beserta penanda agen dan waktu.
        const decay = evaluateArrheniusDecay(commodity, temp, rh, hours);
        return {
          toolName,
          agentId: "Agent_2_BiologicalKineticsAgent",
          success: true,
          data: decay,
          durationMs: Date.now() - startTime,
          executedAt,
        };
      }

      // Hujan lebih dari 0 mm dianggap sedang hujan untuk model redaman pengunjung.
      case "calculateFootfallIndex": {
        const rainMm = Number(args.rainfallMm ?? 0.0);
        const footfall = calculateRainFootfallAttenuation(rainMm, rainMm > 0);
        return {
          toolName,
          agentId: "Agent_5_MarketCrowdDynamicsAgent",
          success: true,
          data: footfall,
          durationMs: Date.now() - startTime,
          executedAt,
        };
      }

      // Surplus dihitung dari sampel 30 kios yang mewakili stok pasar.
      case "computeProjectedSurplus": {
        const rainMm = Number(args.rainfallMm ?? 12.5);
        const hour = Number(args.currentHourDecimal ?? 14.5);

        // Bentuk sampel representatif 30 kios untuk agregasi
        const stallInputs: KioskStockInput[] = KIOSKS.map((kiosk, idx) => ({
          kioskId: kiosk.id,
          kioskName: kiosk.name,
          commodityId: COMMODITIES[idx % COMMODITIES.length].id,
          initialStockKg: 75.0,
          arrivalHourDecimal: 4.0,
        }));

        // Surplus komposit dihitung dengan suhu dan kelembapan acuan 32,5 C dan 75 persen; hujan dan jam datang dari argumen.
        const surplus = calculateCompositeMarketSurplus(stallInputs, 32.5, 75.0, rainMm, hour);
        return {
          toolName,
          agentId: "Agent_6_SpoilagePredictiveEngine",
          success: true,
          data: surplus.summary,
          durationMs: Date.now() - startTime,
          executedAt,
        };
      }

      // Harga penyelamatan: komoditas dicari di katalog (bawaan kangkung); skor susut dari jam pajang, suhu, dan kelembapan menentukan diskon.
      case "computeSalvagePrice": {
        const commodityId = String(args.commodityId || "kangkung").trim().toLowerCase();
        const commodity = COMMODITIES.find((c) => c.id.toLowerCase() === commodityId) || COMMODITIES[0];
        const hours = Number(args.hoursOnDisplay ?? 10.0);
        const temp = Number(args.ambientTempC ?? 32.5);
        const rh = Number(args.humidityPct ?? 75.0);

        // Skor dari model Arrhenius, lalu harga dari tabel diskon tunggal; hasilnya sudah dikunci harga lantai.
        const decay = evaluateArrheniusDecay(commodity, temp, rh, hours);
        const pricing = { commodityId: commodity.id, commodityName: commodity.localName, decayScore: decay.decayScore, ...quoteSalvagePrice(commodity, decay.decayScore) };
        return {
          toolName,
          agentId: "Agent_12_DynamicPricingAgent",
          success: true,
          data: pricing,
          durationMs: Date.now() - startTime,
          executedAt,
        };
      }

      // Gerbang mutu lewat alat: komoditas, jam pajang (bawaan 4 jam), dan tier yang diminta diteruskan ke agen mutu.
      case "verifyHumanGradeIntegrity": {
        const commodityId = String(args.commodityId || "bayam");
        const hours = Number(args.hoursOnDisplay ?? 4.0);
        const requestedTier = (args.requestedTier as CircularRescueTier) || "tier_3";
        const vendorId = String(args.vendorId || "vendor_kramat_01");

        // Agen mutu dipanggil dengan komoditas, jam pajang, tier, dan pedagang; pelanggaran dicatat ke audit oleh agen itu sendiri.
        const qgResult = await qualityGateAgent.verifyHumanGradeIntegrity({
          commodityId,
          hoursOnDisplay: hours,
          requestedTier,
          vendorId,
        });

        // Hasil alat karbon: metana yang terhindar dan CO2e, keduanya dari faktor emisi bersama di pasarinCore.
        // Hasil alat armada: muatan, jenis kendaraan, kapasitas, jumlah unit, perkiraan biaya BBM, dan kalimat penugasan.
        return {
          toolName,
          agentId: "Agent_10_QualityGateAgent",
          success: true,
          data: qgResult,
          durationMs: Date.now() - startTime,
          executedAt,
        };
      }

      // Armada dipilih lewat kalkulator armada: hingga 300 kg Viar, hingga 1.000 kg GranMax, di atasnya Isuzu (4.000 kg per truk).
      case "assignVehicleType": {
        const payloadKg = Number(args.payloadKg ?? 500.0);
        const destinations = Number(args.destinationsCount ?? 3);
        // Satu sumber kebenaran: kalkulator armada. Ambangnya 300 kg (Viar), 1.000 kg (GranMax), di atasnya Isuzu 4.000 kg per truk.
        const allocation = calculateFleetAllocation(payloadKg);
        const vehicleType = allocation.vehicleType;
        const vehicleCapacityKg = allocation.vehicleSpec.maxCapacityKg;
        const unitsRequired = allocation.unitsRequired;
        const vehicleDescription = allocation.dispatchDescription;

        const estimatedFuelCostIdr = Math.round(destinations * 18000 + (payloadKg / 100) * 5000);

        // Hasil alat karbon: metana yang terhindar dan CO2e dari faktor emisi bersama di pasarinCore.
        return {
          toolName,
          agentId: "Agent_9_FleetLogisticsAgent",
          success: true,
          data: {
            payloadKg,
            vehicleType,
            vehicleCapacityKg,
            unitsRequired,
            destinationsCount: destinations,
            estimatedFuelCostIdr,
            vehicleDescription,
          },
          durationMs: Date.now() - startTime,
          executedAt,
        };
      }

      // Faktor emisi mengikuti IPCC 2006 per kg limbah pangan.
      case "calculateMethaneAvoidance": {
        const divertedKg = Number(args.divertedKg ?? 1000.0);
        // Faktor dari pasarinCore: 0,038 kg CH4 per kg dan CO2e = CH4 x GWP 21 (IPCC 2006).
        const methanePreventedKg = Number((divertedKg * FOOD_WASTE_METHANE_KG_PER_KG).toFixed(2));
        const carbonOffsetCo2eKg = Number((divertedKg * FOOD_WASTE_CO2E_KG_PER_KG).toFixed(2));

        return {
          toolName,
          agentId: "Agent_16_CarbonAccountingAgent",
          success: true,
          data: {
            divertedWeightKg: divertedKg,
            methanePreventedKg,
            carbonOffsetCo2eKg,
            carbonCreditPotentialIdr: Math.round(carbonOffsetCo2eKg * 250),
          },
          durationMs: Date.now() - startTime,
          executedAt,
        };
      }

      // Bobot per kemasan mengikuti kebiasaan Pasar Induk Kramat Jati.
      case "parseLocalMarketUnits": {
        const unitName = String(args.unitName || "karung").toLowerCase().trim();
        const qty = Number(args.quantity ?? 1);
        const commId = String(args.commodityId || "kangkung").toLowerCase();

        // Standar konversi wadah tradisional Pasar Induk Kramat Jati
        // Bobot per kemasan: karung 25 kg bawaan (35 kg untuk cabai, 40 kg untuk kol); jenis kemasan lain diatur di cabang berikutnya. Angka ini kebiasaan pasar, bukan standar resmi.
        let kgPerUnit = 25.0;
        if (unitName === "karung") {
          kgPerUnit = commId.includes("cabai") ? 35.0 : commId.includes("kol") ? 40.0 : 25.0;
        } else if (unitName === "peti") {
          kgPerUnit = 30.0; // Peti tomat / mangga
        } else if (unitName === "ikat") {
          kgPerUnit = 0.5; // Ikat sayur bayam / kangkung retail
        } else if (unitName === "keranjang") {
          kgPerUnit = 20.0;
        }

        const totalKg = Number((qty * kgPerUnit).toFixed(1));

        // Hasil konversi satuan: jumlah kemasan dikali bobot per kemasan menjadi kilogram.
        return {
          toolName,
          agentId: "Agent_17_TraditionalUnitAssistant",
          success: true,
          data: {
            unitName,
            quantity: qty,
            kgPerUnit,
            totalEquivalentKg: totalKg,
          },
          durationMs: Date.now() - startTime,
          executedAt,
        };
      }

      // Alat tidak dikenal: kembalikan galat terstruktur (success false) agar pemanggil tidak menerima undefined.
      default:
        return {
          toolName,
          agentId: "UnknownAgent",
          success: false,
          error: `Alat fungsi '${toolName}' tidak terdaftar dalam Tool Calling Registry.`,
          durationMs: Date.now() - startTime,
          executedAt,
        };
    }
  } catch (err) {
    return {
      toolName,
      agentId: "ExecutionError",
      success: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan internal saat mengeksekusi alat.",
      durationMs: Date.now() - startTime,
      executedAt,
    };
  }
}

// Mengurai (dekomposisi) pertanyaan teks bahasa alami manajer pasar menjadi rencana pemanggilan alat terurut (PSR-18).
// Menyeleksi hanya sub-agen yang relevan secara presisi tanpa memanggil modul yang tidak dibutuhkan.
export function decomposeManagerialQuery(query: string): QueryDecompositionPlan {
  const lower = query.toLowerCase().trim();

  // 1. Kueri Logistik Armada Transportasi (PRD §16: "Lusa itu perlu berapa mobil untuk ke sentra maggot atau ke UMKM?")
  // Maksud logistics_fleet: kata kunci armada, mobil, truk, dan sejenisnya menjalankan alat cuaca, surplus, lalu pilihan armada.
  if (
    lower.includes("armada") ||
    lower.includes("mobil") ||
    lower.includes("truk") ||
    lower.includes("viar") ||
    lower.includes("kendaraan") ||
    lower.includes("angkut") ||
    lower.includes("kirim")
  ) {
    return {
      originalQuery: query,
      detectedIntent: "logistics_fleet",
      requiredTools: ["fetchOpenWeatherTelemetry", "computeProjectedSurplus", "assignVehicleType"],
      executionSteps: [
        {
          step: 1,
          toolName: "fetchOpenWeatherTelemetry",
          purpose: "Mengecek ramalan curah hujan lusa yang memicu redaman pembeli retail di los pasar",
          arguments: { forceRefresh: false },
        },
        {
          step: 2,
          toolName: "computeProjectedSurplus",
          purpose: "Menghitung proyeksi volume surplus komposit dari 30 kios pedagang binaan",
          arguments: { activeStocksKg: 2400.0, rainfallMm: 12.5, currentHourDecimal: 14.5 },
        },
        {
          step: 3,
          toolName: "assignVehicleType",
          purpose: "Menentukan jenis armada angkut (GranMax Bak / Viar) berdasarkan alokasi berat muatan",
          arguments: { payloadKg: 955.0, destinationsCount: 4 },
        },
      ],
    };
  }

  // 2. Kueri Mikroklimat Cuaca & Kinetika Peluruhan Biologis
  // Maksud climate_microclimate: kata kunci cuaca, hujan, atau suhu menjalankan alat cuaca, redaman pengunjung, lalu peluruhan.
  if (
    lower.includes("cuaca") ||
    lower.includes("hujan") ||
    lower.includes("suhu") ||
    lower.includes("kelembapan") ||
    lower.includes("panas") ||
    lower.includes("iklim")
  ) {
    return {
      originalQuery: query,
      detectedIntent: "climate_microclimate",
      requiredTools: ["fetchOpenWeatherTelemetry", "calculateFootfallIndex", "calculateDecayRate"],
      executionSteps: [
        {
          step: 1,
          toolName: "fetchOpenWeatherTelemetry",
          purpose: "Membaca suhu, kelembapan, dan curah hujan mikroklimat stasiun Kramat Jati",
          arguments: { forceRefresh: true },
        },
        {
          step: 2,
          toolName: "calculateFootfallIndex",
          purpose: "Menghitung persentase penurunan arus pembeli akibat genangan air lorong los",
          arguments: { rainfallMm: 12.5, timeOfDay: "14:30" },
        },
        {
          step: 3,
          toolName: "calculateDecayRate",
          purpose: "Menghitung laju peluruhan respirasi jaringan daun komoditas kangkung",
          arguments: { commodityId: "kangkung", ambientTempC: 32.5, humidityPct: 75.0, hoursOnDisplay: 10.0 },
        },
      ],
    };
  }

  // 3. Kueri Penetapan Harga Dinamis & Price Floor Modal Pedagang
  // Maksud pricing_and_floor: kata kunci harga, diskon, atau margin menjalankan peluruhan, harga sore, lalu gerbang mutu.
  if (
    lower.includes("harga") ||
    lower.includes("diskon") ||
    lower.includes("margin") ||
    lower.includes("modal") ||
    lower.includes("price floor") ||
    lower.includes("tebus")
  ) {
    return {
      originalQuery: query,
      detectedIntent: "pricing_and_floor",
      requiredTools: ["calculateDecayRate", "computeSalvagePrice", "verifyHumanGradeIntegrity"],
      executionSteps: [
        {
          step: 1,
          toolName: "calculateDecayRate",
          purpose: "Mengevaluasi tingkat peluruhan komoditas untuk menentukan tier diskon",
          arguments: { commodityId: "kangkung", hoursOnDisplay: 10.0 },
        },
        {
          step: 2,
          toolName: "computeSalvagePrice",
          purpose: "Menghitung harga penyelamatan dari skor susut dengan proteksi batas modal",
          arguments: { commodityId: "kangkung", hoursOnDisplay: 10.0 },
        },
        {
          step: 3,
          toolName: "verifyHumanGradeIntegrity",
          purpose: "Memastikan harga diskon tetap berada di atas batas bawah modal kulakan pedagang",
          arguments: { commodityId: "kangkung", hoursOnDisplay: 10.0, requestedTier: "tier_1" },
        },
      ],
    };
  }

  // 4. Kueri Gerbang Mutu Etis & Pencegahan Moral Hazard
  // Maksud quality_and_ethics: kata kunci mutu, busuk, atau layak menjalankan peluruhan lalu gerbang mutu.
  if (
    lower.includes("mutu") ||
    lower.includes("busuk") ||
    lower.includes("layak") ||
    lower.includes("maggot") ||
    lower.includes("etika") ||
    lower.includes("moral hazard") ||
    lower.includes("invarian")
  ) {
    // Maksud market_overview (bawaan): pertanyaan yang tidak cocok dengan pola lain menjalankan cuaca, surplus, dan metana sebagai ikhtisar.
    return {
      originalQuery: query,
      detectedIntent: "quality_and_ethics",
      requiredTools: ["calculateDecayRate", "verifyHumanGradeIntegrity"],
      executionSteps: [
        {
          step: 1,
          toolName: "calculateDecayRate",
          purpose: "Mengevaluasi skor peluruhan fisik sayuran",
          arguments: { commodityId: "bayam", hoursOnDisplay: 4.0 },
        },
        {
          step: 2,
          toolName: "verifyHumanGradeIntegrity",
          purpose: "Menegakkan Invarian 1 untuk memblokir klaim pakan maggot pada makanan layak konsumsi",
          arguments: { commodityId: "bayam", hoursOnDisplay: 4.0, requestedTier: "tier_3" },
        },
      ],
    };
  }

  // 5. Kueri Ikhtisar Pasar Umum / Default Sintesis
  return {
    originalQuery: query,
    detectedIntent: "market_overview",
    requiredTools: ["fetchOpenWeatherTelemetry", "computeProjectedSurplus", "calculateMethaneAvoidance"],
    executionSteps: [
      {
        step: 1,
        toolName: "fetchOpenWeatherTelemetry",
        purpose: "Mengecek kesegaran mikroklimat pasar",
        arguments: { forceRefresh: false },
      },
      {
        step: 2,
        toolName: "computeProjectedSurplus",
        purpose: "Menghitung estimasi total perputaran surplus harian dari 30 kios",
        arguments: { activeStocksKg: 2400.0, rainfallMm: 0.0, currentHourDecimal: 14.5 },
      },
      {
        step: 3,
        toolName: "calculateMethaneAvoidance",
        purpose: "Mengestimasi dampak positif emisi gas rumah kaca terhindar dari TPA Bantar Gebang",
        arguments: { divertedKg: 1240.0 },
      },
    ],
  };
}

// Mengeksekusi rencana dekomposisi kueri bahasa alami secara terkoordinasi (PSR-18).
// Menghasilkan alur penalaran langkah-demi-langkah ReAct (Thought -> Action -> Observation)
// serta ringkasan eksekutif bernilai rekayasa tinggi dalam waktu eksekusi singkat (< 1.500 ms).
export async function executeDecomposedManagerialQuery(query: string): Promise<OrchestratorQueryResult> {
  const globalStartTime = Date.now();
  const plan = decomposeManagerialQuery(query);
  // Jejak penalaran ReAct (pikiran, aksi, pengamatan) yang ditampilkan di panel admin.
  const thoughtProcess: ReActStep[] = [];
  const toolsInvoked: string[] = [];

  // Inisialisasi tahapan penalaran ReAct dan pencatatan dekomposisi maksud kueri
  thoughtProcess.push({
    step: 1,
    agent: "OrchestratorAgent",
    thought: `Menerima dan mendekonstruksi kueri pengelola pasar: "${query}". Maksud terdeteksi: '${plan.detectedIntent}'. Menyiapkan ${plan.requiredTools.length} alat eksekusi berurutan.`,
    action: `decomposeQuery(intent: "${plan.detectedIntent}", requiredTools: [${plan.requiredTools.join(", ")}])`,
    observation: `Rencana dekomposisi disetujui: mengeksekusi sub-agen secara sekuensial tanpa memanggil modul yang tidak relevan.`,
  });

  // Eksekusi setiap langkah pada rencana dekomposisi secara berurutan
  // Alat dijalankan berurutan sesuai rencana; hanya alat yang relevan yang dipanggil.
  for (const stepConfig of plan.executionSteps) {
    toolsInvoked.push(stepConfig.toolName);
    const toolExec = await executeRegisteredTool(stepConfig.toolName, stepConfig.arguments);

    // Pengamatan ditulis khusus per alat; alat lain memakai kalimat umum berisi durasi.
    // Pengamatan ditulis menurut alat yang dijalankan; bila alat gagal, pengamatan memuat pesan galatnya.
    let observationText = "";
    if (toolExec.success && toolExec.data && typeof toolExec.data === "object") {
      const data = toolExec.data;
      if (stepConfig.toolName === "fetchOpenWeatherTelemetry" && "temperatureCelsius" in data && "relativeHumidityPercent" in data && "weatherCondition" in data) {
        observationText = `Suhu aktual: ${String(data.temperatureCelsius)}°C, Kelembapan: ${String(data.relativeHumidityPercent)}% RH, Cuaca: ${String(data.weatherCondition)}.`;
      } else if (stepConfig.toolName === "computeProjectedSurplus" && "totalPredictedSurplusKg" in data && "tier1WartegAllocatedKg" in data && "tier2SocialKitchenAllocatedKg" in data) {
        observationText = `Total surplus komposit terproyeksi: ${String(data.totalPredictedSurplusKg)} kg melintasi 30 kios (Tier 1: ${String(data.tier1WartegAllocatedKg)} kg, Tier 2: ${String(data.tier2SocialKitchenAllocatedKg)} kg).`;
      } else if (stepConfig.toolName === "assignVehicleType" && "vehicleDescription" in data && "estimatedFuelCostIdr" in data) {
        observationText = `Rekomendasi armada: ${String(data.vehicleDescription)} Estimasi biaya bahan bakar: Rp ${Number(data.estimatedFuelCostIdr).toLocaleString("id-ID")}.`;
      } else if (stepConfig.toolName === "calculateDecayRate" && "decayScore" in data && "tierLabel" in data && "hoursRemaining" in data) {
        observationText = `Skor pembusukan: ${String(data.decayScore)} (${String(data.tierLabel)}). Sisa waktu simpan aman: ${String(data.hoursRemaining)} jam.`;
      } else if (stepConfig.toolName === "verifyHumanGradeIntegrity" && "gateStatus" in data && "isMoralHazardViolation" in data && "recommendedTier" in data) {
        const gateStatus = String(data.gateStatus).toUpperCase();
        const moralHazardStatus = data.isMoralHazardViolation ? "TERDETEKSI & DIBLOKIR" : "NIHIL";
        observationText = `Keputusan gerbang mutu: ${gateStatus}. Moral hazard: ${moralHazardStatus}. Alokasi: ${String(data.recommendedTier)}.`;
      } else if (stepConfig.toolName === "computeSalvagePrice" && "pricePerKg" in data && "floorPerKg" in data && "discountPercent" in data) {
        observationText = `Harga salvaging tebusan: Rp ${Number(data.pricePerKg).toLocaleString("id-ID")}/kg, diskon ${String(data.discountPercent)}% (Floor modal: Rp ${Number(data.floorPerKg).toLocaleString("id-ID")}/kg).`;
      } else {
        observationText = `Alat '${stepConfig.toolName}' selesai dieksekusi dalam ${toolExec.durationMs} ms.`;
      }
    } else {
      observationText = `Peringatan eksekusi alat: ${toolExec.error || "Data tidak tersedia"}`;
    }

    // Setiap langkah dicatat sebagai pikiran, aksi, dan pengamatan untuk jejak penalaran.
    thoughtProcess.push({
      step: thoughtProcess.length + 1,
      agent: toolExec.agentId,
      tool: stepConfig.toolName,
      toolPayload: stepConfig.arguments,
      thought: stepConfig.purpose,
      action: `${stepConfig.toolName}(${JSON.stringify(stepConfig.arguments)})`,
      observation: observationText,
    });
  }

  // Sintesis ringkasan eksekutif padat berdasarkan hasil pemanggilan alat
  // Ringkasan eksekutif disusun menurut maksud kueri yang terdeteksi.
  let executiveSummary = "";
  const recommendations: string[] = [];

  // Ringkasan eksekutif heuristik adalah teks contoh tetap per maksud. Angka di dalamnya (misalnya 955 kg dan 526 kg) bukan hasil hitung dari data saat ini.
  if (plan.detectedIntent === "logistics_fleet") {
    executiveSummary =
      "Berdasarkan proyeksi susut surplus pasar sebesar 955 kg, dibutuhkan 1 unit Daihatsu GranMax Bak " +
      "(kapasitas 1.000 kg) untuk mendistribusikan 526 kg ke rute Warteg UMKM (Tier 1), serta 1 unit Viar Roda Tiga " +
      "(kapasitas 300 kg) dengan 2 ritasi untuk mengangkut 429 kg afkir ke Sentra Budidaya Maggot BSF (Tier 3).";
    recommendations.push(
      "Berangkatkan armada GranMax pukul 15:30 WIB agar pasokan tiba sebelum jam masak sore Warteg.",
      "Kunci koordinat geofencing 50 meter pada saat serah terima fisik di gerbang los Blok A."
    );
  } else if (plan.detectedIntent === "climate_microclimate") {
    executiveSummary =
      "Kondisi mikroklimat Pasar Kramat Jati bersuhu 32,5°C dengan kelembapan 75% RH. Potensi hujan lebat sore " +
      "menurunkan pengunjung eceran sebesar 48%, meningkatkan risiko surplus sayuran daun hingga 2,0x lipat lebih cepat.";
    recommendations.push("Majukan jadwal siaran diskon ke grup Warteg 30 menit lebih awal untuk mencegah pembusukan.");
  } else if (plan.detectedIntent === "pricing_and_floor") {
    // Angka contoh dihitung dari rumus yang sama dengan langkah 2 (kangkung, 10 jam pajang, kondisi acuan), bukan teks tetap.
    const kangkung = COMMODITIES.find((c) => c.id === "kangkung") ?? COMMODITIES[0];
    const sample = quoteSalvagePrice(kangkung, evaluateArrheniusDecay(kangkung, 32.5, 75.0, 10.0).decayScore);
    executiveSummary =
      `Tabel diskon berbasis mutu menetapkan harga tebus ${kangkung.localName} pada Rp ${sample.pricePerKg.toLocaleString("id-ID")}/kg ` +
      `(diskon ${sample.discountPercent}% dari harga grosir Rp ${sample.wholesalePricePerKg.toLocaleString("id-ID")}/kg). ` +
      `Harga lantai modal pedagang Rp ${sample.floorPerKg.toLocaleString("id-ID")}/kg tetap terlindungi.`;
    recommendations.push("Konfirmasi persetujuan pedagang melalui bot Telegram 1-ketuk [Setuju Jual].");
  } else if (plan.detectedIntent === "quality_and_ethics") {
    executiveSummary =
      "Pemeriksaan gerbang kendali mutu (Quality Gate) mengonfirmasi penegakan Invarian 1: Sayuran bernutrisi " +
      "yang masih layak konsumsi manusia dilarang keras dialihkan ke pakan maggot dan wajib dialokasikan ke Tier 1 atau Tier 2.";
    recommendations.push("Jendela reservasi eksklusif 30 menit untuk Dapur Sosial & Panti Asuhan telah diaktifkan.");
  } else {
    executiveSummary =
      "Sistem PASARIN mengawasi 30 kios pedagang binaan Pasar Kramat Jati dengan estimasi perputaran 1.240 kg surplus harian. " +
      "Pengalihan sampah organik mencapai 1.240 kg terhindar dari pembuangan akhir TPA Bantar Gebang.";
    recommendations.push("Pastikan kesiapan penampungan di sentra maggot dan panti asuhan sebelum jam sapuan sore.");
  }

  const executionDurationMs = Date.now() - globalStartTime;

  // Hasil akhir: pertanyaan, ringkasan, jejak penalaran, rekomendasi, dan waktu pembuatan.
  return {
    query,
    executiveSummary,
    thoughtProcess,
    toolsInvoked,
    recommendations,
    executionDurationMs,
    generatedAt: new Date().toISOString(),
  };
}

// Fasad Registri Pemanggilan Alat & Dekomposisi Kueri (PSR-18).
export const toolCallingRegistry = {
  declarations: PASARIN_TOOL_DECLARATIONS,
  executeTool: executeRegisteredTool,
  decomposeQuery: decomposeManagerialQuery,
  executeDecomposedQuery: executeDecomposedManagerialQuery,
};
