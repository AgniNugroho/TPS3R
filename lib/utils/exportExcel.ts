import * as XLSX from "xlsx";

export type ExportColumn<T> = {
    header: string;
    accessor: (row: T) => string | number | null | undefined;
};

export type ExportSheet<T = unknown> = {
    sheetName: string;
    rows: T[];
    columns: ExportColumn<T>[];
};

function toSheetData<T>(rows: T[], columns: ExportColumn<T>[]) {
    return rows.map((row) => {
        const record: Record<string, string | number> = {};
        for (const column of columns) {
            record[column.header] = column.accessor(row) ?? "";
        }
        return record;
    });
}

/** Excel sheet names can't exceed 31 chars or contain : \ / ? * [ ]. */
function sanitizeSheetName(name: string) {
    return name.replace(/[:\\/?*[\]]/g, " ").slice(0, 31);
}

/** Builds a multi-sheet .xlsx workbook and triggers a browser download. Client-side only. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each sheet has its own row type, erased here on purpose
export function exportWorkbook(sheets: ExportSheet<any>[], fileName: string) {
    const workbook = XLSX.utils.book_new();
    for (const sheet of sheets) {
        const worksheet = XLSX.utils.json_to_sheet(
            toSheetData(sheet.rows, sheet.columns),
        );
        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            sanitizeSheetName(sheet.sheetName),
        );
    }
    XLSX.writeFile(workbook, fileName);
}

/** Builds a single-sheet .xlsx file from `rows` using `columns` and triggers a browser download. */
export function exportToExcel<T>(
    rows: T[],
    columns: ExportColumn<T>[],
    options: { fileName: string; sheetName?: string },
) {
    exportWorkbook(
        [{ sheetName: options.sheetName ?? "Data", rows, columns }],
        options.fileName,
    );
}
