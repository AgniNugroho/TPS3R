export type TableName =
  | "wilayah"
  | "petugas"
  | "sampah_masuk"
  | "pemilahan_sampah"
  | "pengumpulan"
  | "bank_sampah"
  | "tps3r"
  | "residu";

export type DatabaseRow = Record<string, string | number | boolean | null | undefined>;
