import { Workbook } from "exceljs";

export type ExportColumn<T> = {
    header: string;
    accessor: (row: T) => string | number | null | undefined;
};

export type ExportSheet<T = unknown> = {
    sheetName: string;
    rows: T[];
    columns: ExportColumn<T>[];
};

/** Excel sheet names can't exceed 31 chars or contain : \ / ? * [ ]. */
function sanitizeSheetName(name: string) {
    return name.replace(/[:\\/?*[\]]/g, " ").slice(0, 31);
}

/** Triggers a browser download of the generated Excel file buffer. Client-side only. */
async function downloadExcelBuffer(buffer: unknown, fileName: string) {
    const blob = new Blob([buffer as BlobPart], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
}

/** Builds a multi-sheet .xlsx workbook and triggers a browser download. Client-side only. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each sheet has its own row type, erased here on purpose
export async function exportWorkbook(
    sheets: ExportSheet<any>[],
    fileName: string,
) {
    const workbook = new Workbook();

    for (const sheet of sheets) {
        const worksheet = workbook.addWorksheet(
            sanitizeSheetName(sheet.sheetName),
        );

        // Add header row
        const columnHeaders = sheet.columns.map((col) => col.header);
        worksheet.addRow(columnHeaders);

        // Add data rows
        for (const row of sheet.rows) {
            const rowData = sheet.columns.map((col) => col.accessor(row) ?? "");
            worksheet.addRow(rowData);
        }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    await downloadExcelBuffer(buffer, fileName);
}

/** Builds a single-sheet .xlsx file from `rows` using `columns` and triggers a browser download. */
export async function exportToExcel<T>(
    rows: T[],
    columns: ExportColumn<T>[],
    options: { fileName: string; sheetName?: string },
) {
    await exportWorkbook(
        [{ sheetName: options.sheetName ?? "Data", rows, columns }],
        options.fileName,
    );
}
