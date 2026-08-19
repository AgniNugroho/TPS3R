import { google } from "googleapis";
import { getGoogleAuth } from "./auth";
import type { GoogleRow, SheetModule } from "./types";

function getSpreadsheetId() {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SPREADSHEET_ID belum dikonfigurasi.");
  return spreadsheetId;
}

function rowToValues(row: GoogleRow) {
  return Object.values(row).map((value) => value ?? "");
}

export async function readSheet(module: SheetModule, range = "A:Z") {
  const sheets = google.sheets({ version: "v4", auth: getGoogleAuth() });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: `${module}!${range}`,
  });
  return response.data.values ?? [];
}

export async function appendSheetRow(module: SheetModule, row: GoogleRow) {
  const sheets = google.sheets({ version: "v4", auth: getGoogleAuth() });
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: `${module}!A:Z`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [rowToValues(row)] },
  });
  return response.data.updates;
}
