export type GoogleRow = Record<string, string | number | boolean | null>;

export type SheetModule =
  | "01_WILAYAH"
  | "02_PETUGAS"
  | "03_NASABAH"
  | "04_JENIS_SAMPAH"
  | "05_SUMBER_SAMPAH"
  | "06_PENGUMPULAN"
  | "07_BANK_SAMPAH"
  | "08_TPS3R"
  | "09_PENGANGKUTAN"
  | "10_PENGOLAHAN"
  | "11_RESIDU"
  | "12_KEUANGAN"
  | "13_SARANA"
  | "14_PENGADUAN"
  | "15_KPI"
  | "16_DASHBOARD_DATA";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
