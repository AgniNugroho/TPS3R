import { google } from "googleapis";
import { Readable } from "node:stream";
import { getGoogleAuth } from "./auth";

function getFolderId() {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) throw new Error("GOOGLE_DRIVE_FOLDER_ID belum dikonfigurasi.");
  return folderId;
}

export async function uploadToDrive(file: { name: string; mimeType: string; data: Buffer }) {
  const drive = google.drive({ version: "v3", auth: getGoogleAuth() });
  const response = await drive.files.create({
    requestBody: { name: file.name, parents: [getFolderId()] },
    media: { mimeType: file.mimeType, body: Readable.from(file.data) },
    fields: "id,name,mimeType,webViewLink",
  });
  return response.data;
}
