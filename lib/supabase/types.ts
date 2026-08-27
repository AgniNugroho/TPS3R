export type TableName =
    | "desa"
    | "wilayah"
    | "petugas"
    | "sampah_masuk"
    | "pemilahan_sampah"
    | "pengumpulan"
    | "bank_sampah"
    | "tps3r"
    | "residu";

/** Column each table uses to scope rows to a desa. "desa" itself is scoped by its own id. */
export const DESA_SCOPE_COLUMN: Record<TableName, string> = {
    desa: "id",
    wilayah: "desa_id",
    petugas: "desa_id",
    sampah_masuk: "desa_id",
    pemilahan_sampah: "desa_id",
    pengumpulan: "desa_id",
    bank_sampah: "desa_id",
    tps3r: "desa_id",
    residu: "desa_id",
};

export type DatabaseRow = Record<
    string,
    string | number | boolean | null | undefined
>;
