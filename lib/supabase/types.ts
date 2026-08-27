export type TableName =
    | "wilayah"
    | "petugas"
    | "sampah_masuk"
    | "pemilahan_sampah"
    | "pengumpulan"
    | "bank_sampah"
    | "tps3r"
    | "residu"
    | "anggota"
    | "jenis_sampah"
    | "pemilahan"
    | "tps3r_ringkasan_bulanan";

export type DatabaseRow = Record<
    string,
    string | number | boolean | null | undefined
>;
