/**
 * ==============================================================================
 * SISTEM INFORMASI MANAJEMEN HUNTARA BNPB - PROV. NTT
 * SCRIPT JEMBATAN WEBHOOK (GOOGLE APPS SCRIPT)
 * PT. EM KA JAYA UTAMA & KONTRAKTOR REKANAN (CV. MBAY INDAH, DLL)
 * ==============================================================================
 * 
 * FUNGSI UTAMA SCRIPT INI:
 * 1. Menerima kiriman foto & data dari HP Petugas Lapangan secara otomatis tanpa login Google.
 * 2. Menyimpan file foto langsung ke Folder Google Drive PT. EM KA JAYA UTAMA.
 * 3. Memperbarui baris data penerima di Google Spreadsheet (Progres %, Tanggal, Link Foto).
 * 4. Menampilkan rumus =IMAGE() agar foto dokumentasi langsung terlihat di dalam sel Spreadsheet.
 * 
 * CARA PASANG:
 * 1. Buka Google Spreadsheet "DATABASE_SIM_HUNTARA_NTT".
 * 2. Klik menu "Ekstensi" (Extensions) > "Apps Script".
 * 3. Hapus kode bawaan (myFunction), lalu Paste semua kode di bawah ini.
 * 4. Klik tombol Simpan (ikon Disket).
 * 5. Klik tombol biru "Terapkan" (Deploy) > "Penerapan Baru" (New deployment).
 * 6. Pilih Jenis: "Aplikasi Web" (Web app).
 * 7. Atur:
 *    - Jalankan sebagai (Execute as): "Saya" (email pemilik/EM KA).
 *    - Yang memiliki akses (Who has access): "Siapa saja" (Anyone).
 * 8. Klik "Terapkan" (Deploy) dan salin URL Aplikasi Web yang muncul.
 * ==============================================================================
 */

// Nama Folder Utama di Google Drive Anda
const MAIN_FOLDER_NAME = "DOKUMENTASI_SIM_HUNTARA_BNPB_NTT";

// Nama Sheet tempat data penerima berada
const SHEET_NAME = "DATABASE_SIM_HUNTARA_NTT";

/**
 * Handle GET request: Untuk membaca data dari Spreadsheet ke aplikasi jika diperlukan
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = [];

    const formulas = sheet.getDataRange().getFormulas();
    for (let i = 1; i < data.length; i++) {
      const row = {};
      for (let j = 0; j < headers.length; j++) {
        let val = data[i][j];
        const form = formulas[i] ? formulas[i][j] : '';
        if (form && typeof form === 'string' && form.startsWith('=')) {
          const matchLink = form.match(/(https?:\/\/[^"';\s)]+)/i);
          if (matchLink && matchLink[1]) {
            val = matchLink[1];
          }
        }
        row[headers[j]] = val;
      }
      rows.push(row);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      total: rows.length,
      data: rows
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle POST request: Menerima foto & progres dari web SIM-HUNTARA
 */
function doPost(e) {
  try {
    let payload;
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else {
      payload = e.parameter;
    }

    const action = payload.action || "upload_photo";

    if (action === "upload_photo") {
      return handlePhotoUpload(payload);
    } else if (action === "sync_unit") {
      return handleUnitSync(payload);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Action tidak dikenal"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Memproses penyimpanan foto ke Google Drive dan link ke Spreadsheet
 */
function handlePhotoUpload(payload) {
  const { unitId, slotKey, dataUrl, recipientName, desa, kecamatan, progressPercent } = payload;

  if (!dataUrl) {
    throw new Error("Data foto (dataUrl) kosong");
  }

  // 1. Dapatkan atau buat Folder Utama di Google Drive
  const mainFolder = getOrCreateFolder(DriveApp.getRootFolder(), MAIN_FOLDER_NAME);

  // 2. Buat subfolder berdasarkan Desa dan Nama Penerima agar rapi
  const folderDesa = getOrCreateFolder(mainFolder, desa || "Umum");
  const folderUnit = getOrCreateFolder(folderDesa, `${unitId}_${(recipientName || 'Unit').replace(/[^a-zA-Z0-9 ]/g, '')}`);

  // 3. Konversi base64 image ke file Drive
  const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Format gambar Base64 tidak valid");
  }

  const ext = match[1] === "jpeg" ? "jpg" : match[1];
  const base64Data = match[2];
  const decodedBlob = Utilities.newBlob(Utilities.base64Decode(base64Data), "image/" + ext);
  
  const labelSlot = getSlotLabel(slotKey);
  const fileName = `${unitId}_${labelSlot}_${Utilities.formatDate(new Date(), "GMT+8", "yyyyMMdd_HHmmss")}.${ext}`;
  decodedBlob.setName(fileName);

  // Simpan file ke Drive
  const file = folderUnit.createFile(decodedBlob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const fileUrl = file.getUrl();
  const fileId = file.getId();
  // Direct view link untuk thumbnail di Spreadsheet:
  const directThumbnailUrl = `https://lh3.googleusercontent.com/d/${fileId}`;

  // 4. Update data di Google Spreadsheet
  updateSpreadsheetWithPhoto(unitId, slotKey, fileUrl, directThumbnailUrl, progressPercent, folderUnit.getUrl());

  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    message: "Foto berhasil disimpan ke Google Drive dan Spreadsheet!",
    fileUrl: fileUrl,
    directThumbnailUrl: directThumbnailUrl,
    folderUrl: folderUnit.getUrl(),
    unitId: unitId,
    slotKey: slotKey
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Mencari baris unit di Spreadsheet dan mengisi kolom foto
 */
function updateSpreadsheetWithPhoto(unitId, slotKey, fileUrl, directThumbnailUrl, progressPercent, folderUrl) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // Cari index kolom
  const idColIdx = headers.indexOf("ID_UNIT");
  const progressColIdx = headers.indexOf("PROGRES_PERSEN");
  const dateColIdx = headers.indexOf("TANGGAL_UPDATE");
  const folderColIdx = headers.indexOf("FOLDER_GOOGLE_DRIVE");

  // Cari nama kolom foto di header spreadsheet berdasarkan slotKey
  const targetColName = mapSlotToHeaderName(slotKey);
  const photoColIdx = headers.indexOf(targetColName);

  if (idColIdx === -1) return;

  // Cari baris yang sesuai dengan ID_UNIT
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idColIdx]).trim().toLowerCase() === String(unitId).trim().toLowerCase()) {
      const rowNum = i + 1; // 1-based index

      // Update kolom foto: simpan thumbnail URL langsung agar bisa dibaca sistem
      if (photoColIdx !== -1) {
        const imgUrl = directThumbnailUrl || fileUrl;
        sheet.getRange(rowNum, photoColIdx + 1).setValue(imgUrl);
      }

      // Update progres persen jika ada
      if (progressColIdx !== -1 && progressPercent !== undefined && progressPercent !== null) {
        sheet.getRange(rowNum, progressColIdx + 1).setValue(progressPercent + "%");
      }

      // Update tanggal update
      if (dateColIdx !== -1) {
        const nowStr = Utilities.formatDate(new Date(), "GMT+8", "yyyy-MM-dd HH:mm:ss");
        sheet.getRange(rowNum, dateColIdx + 1).setValue(nowStr);
      }

      // Update folder Drive: simpan URL mentah agar bisa dibaca sistem
      if (folderColIdx !== -1 && folderUrl) {
        sheet.getRange(rowNum, folderColIdx + 1).setValue(folderUrl);
      }

      break;
    }
  }
}

/**
 * Sinkronisasi data unit lengkap (misal saat ada perubahan data penerima / status)
 */
function handleUnitSync(payload) {
  const { unitId, progressPercent, statusTagihan, perubahanDenah, keteranganDenah } = payload;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const idColIdx = headers.indexOf("ID_UNIT");
  const progressColIdx = headers.indexOf("PROGRES_PERSEN");
  const statusColIdx = headers.indexOf("STATUS_TAGIHAN");
  const denahColIdx = headers.indexOf("PERUBAHAN_DENAH");
  const ketDenahColIdx = headers.indexOf("KETERANGAN_DENAH");
  const dateColIdx = headers.indexOf("TANGGAL_UPDATE");

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idColIdx]).trim().toLowerCase() === String(unitId).trim().toLowerCase()) {
      const rowNum = i + 1;
      if (progressColIdx !== -1 && progressPercent !== undefined) sheet.getRange(rowNum, progressColIdx + 1).setValue(progressPercent + "%");
      if (statusColIdx !== -1 && statusTagihan) sheet.getRange(rowNum, statusColIdx + 1).setValue(statusTagihan);
      if (denahColIdx !== -1 && perubahanDenah !== undefined) sheet.getRange(rowNum, denahColIdx + 1).setValue(perubahanDenah ? "YA" : "TIDAK");
      if (ketDenahColIdx !== -1 && keteranganDenah) sheet.getRange(rowNum, ketDenahColIdx + 1).setValue(keteranganDenah);
      if (dateColIdx !== -1) {
        const nowStr = Utilities.formatDate(new Date(), "GMT+8", "yyyy-MM-dd HH:mm:ss");
        sheet.getRange(rowNum, dateColIdx + 1).setValue(nowStr);
      }
      break;
    }
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    message: "Data unit berhasil disinkronkan ke Spreadsheet!"
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Helper: Ambil atau buat folder Drive
 */
function getOrCreateFolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(folderName);
}

/**
 * Mapping nama slot ke label file
 */
function getSlotLabel(slotKey) {
  const map = {
    foto0: "0_Depan",
    foto0_samping: "0_Samping",
    foto0_dalam: "0_Dalam",
    foto0_mck: "0_MCK",
    foto50: "50_Depan",
    foto50_samping: "50_Samping",
    foto50_dalam: "50_Dalam",
    foto50_mck: "50_MCK",
    foto100_1: "100_Depan",
    foto100_samping: "100_Samping",
    foto100_2: "100_Dalam",
    foto100_3: "100_MCK"
  };
  return map[slotKey] || slotKey;
}

/**
 * Mapping nama slot ke kolom header di Spreadsheet
 */
function mapSlotToHeaderName(slotKey) {
  const map = {
    foto0: "FOTO_0_DEPAN",
    foto0_samping: "FOTO_0_SAMPING",
    foto0_dalam: "FOTO_0_DALAM",
    foto0_mck: "FOTO_0_MCK",
    foto50: "FOTO_50_DEPAN",
    foto50_samping: "FOTO_50_SAMPING",
    foto50_dalam: "FOTO_50_DALAM",
    foto50_mck: "FOTO_50_MCK",
    foto100_1: "FOTO_100_DEPAN",
    foto100_samping: "FOTO_100_SAMPING",
    foto100_2: "FOTO_100_DALAM",
    foto100_3: "FOTO_100_MCK"
  };
  return map[slotKey] || slotKey.toUpperCase();
}
