/**
 * SIM-HUNTARA - Google Drive Auto-Sync Module
 * Sinkronisasi data aplikasi & foto progres ke Google Drive pengguna masing-masing.
 */
(function() {
  const DEFAULT_CLIENT_ID = '643355374210-fquo8bi36sb6lhiohsv42tfhof6jtk22.apps.googleusercontent.com';
  const STORAGE_KEY_CLIENT_ID = 'huntara_gdrive_client_id';
  const STORAGE_KEY_USER = 'huntara_gdrive_user';
  const DEFAULT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbxDYf__ntwkuMDVQXV2c723CU-jbyXXF_qAxnPpmBnH4EB07bNSoXyNBzrPNnD1qprd/exec';
  const STORAGE_KEY_WEBHOOK = 'huntara_gdrive_webhook_url';
  function getFolderName() {
    try {
      const curComp = window.app && window.app.state && window.app.state.currentUser && window.app.state.currentUser.perusahaan;
      if (curComp) {
        return `SIM-HUNTARA - ${curComp.toUpperCase()}`;
      }
    } catch (_) {}
    return 'SIM-HUNTARA-DATA';
  }
  const DB_FILE_NAME = 'database-huntara.json';
  const PHOTOS_FOLDER_NAME = 'Foto-Dokumentasi';

  let tokenClient = null;
  let accessToken = null;
  let cachedFolderId = null;
  let cachedDbFileId = null;
  let cachedPhotosFolderId = null;
  let isSyncing = false;

  const gdriveSync = {
    getWebhookUrl() {
      return localStorage.getItem(STORAGE_KEY_WEBHOOK) || (window.app && window.app.state && window.app.state.settings && window.app.state.settings.webhookUrl) || DEFAULT_WEBHOOK_URL;
    },

    setWebhookUrl(url) {
      if (!url) {
        localStorage.removeItem(STORAGE_KEY_WEBHOOK);
      } else {
        localStorage.setItem(STORAGE_KEY_WEBHOOK, url.trim());
      }
      this.updateUI();
    },

    async sendPhotoToWebhook(payload) {
      const url = this.getWebhookUrl();
      if (!url || !payload || !payload.dataUrl) return false;
      try {
        console.log('[Webhook] Mengirim foto ke Google Sheets & Drive...', payload.unitId, payload.slotKey);
        await fetch(url, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
        if (window.app && window.app.showToast) {
          window.app.showToast('☁️ Foto terkirim otomatis ke Google Spreadsheet & Drive!', 'success');
        }
        return true;
      } catch (err) {
        console.warn('[Webhook] Gagal kirim ke Google Apps Script:', err);
        return false;
      }
    },

    openWebhookModal() {
      const currentUrl = this.getWebhookUrl();
      const modal = document.getElementById('modalRoot');
      if (!modal) return;
      modal.innerHTML = `
        <div class="modal-backdrop" onclick="window.gdriveSync.closeModal()">
          <div class="modal-card" style="max-width:620px;" onclick="event.stopPropagation()">
            <div class="modal-header">
              <h3>📊 Google Spreadsheet &amp; Drive Auto-Sync</h3>
              <button class="btn-close" onclick="window.gdriveSync.closeModal()">✕</button>
            </div>
            <div class="modal-body" style="padding:20px;font-size:13.5px;line-height:1.6;">
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:14px;border-radius:8px;margin-bottom:16px;">
                <div style="font-weight:700;color:#166534;font-size:14px;margin-bottom:4px;">🟢 Sinkronisasi Otomatis Google Aktif</div>
                <div style="font-size:12.5px;color:#15803d;">
                  Setiap kali petugas lapangan mengambil foto dokumentasi (0%, 50%, 100%) di HP, foto akan <strong>langsung tersimpan di Folder Google Drive PT. EM KA JAYA UTAMA</strong> dan link foto otomatis tercatat di <strong>Google Spreadsheet</strong> tanpa perlu login Google!
                </div>
              </div>
              <div class="form-group" style="margin-bottom:16px;">
                <label style="font-weight:700;display:block;margin-bottom:6px;">URL Webhook Google Apps Script:</label>
                <input type="text" id="inputWebhookUrl" class="form-control" value="${escapeHtml(currentUrl)}" style="font-family:monospace;font-size:12px;" />
              </div>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:12px;border-radius:8px;font-size:12.5px;color:#475569;margin-bottom:16px;">
                <strong>📁 File &amp; Template Terkait:</strong>
                <div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap;">
                  <a href="/DATABASE_SIM_HUNTARA_NTT.csv" download="DATABASE_SIM_HUNTARA_NTT.csv" class="btn btn-outline btn-sm" style="text-decoration:none;">
                    📥 Download Database (CSV)
                  </a>
                  <a href="/GOOGLE_APPS_SCRIPT_WEBHOOK.js" target="_blank" class="btn btn-outline btn-sm" style="text-decoration:none;">
                    📄 Lihat Script Webhook (Code.gs)
                  </a>
                </div>
              </div>
              <div style="display:flex;justify-content:flex-end;gap:10px;">
                <button class="btn btn-outline" onclick="window.gdriveSync.closeModal()">Tutup</button>
                <button class="btn btn-primary" onclick="window.gdriveSync.saveWebhookFromModal()">💾 Simpan Pengaturan</button>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    saveWebhookFromModal() {
      const input = document.getElementById('inputWebhookUrl');
      if (input) {
        this.setWebhookUrl(input.value);
        this.closeModal();
        if (window.app && window.app.showToast) {
          window.app.showToast('✅ Pengaturan Google Spreadsheet & Drive tersimpan!', 'success');
        }
      }
    },
    getClientId() {
      return localStorage.getItem(STORAGE_KEY_CLIENT_ID) || DEFAULT_CLIENT_ID;
    },

    setClientId(id) {
      if (!id || typeof id !== 'string') {
        localStorage.removeItem(STORAGE_KEY_CLIENT_ID);
      } else {
        localStorage.setItem(STORAGE_KEY_CLIENT_ID, id.trim());
      }
      this.init();
    },

    getUser() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_USER);
        return raw ? JSON.parse(raw) : null;
      } catch (_) {
        return null;
      }
    },

    setUser(user) {
      if (user) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY_USER);
      }
      this.updateUI();
    },

    isConnected() {
      return !!(accessToken && this.getUser());
    },

    init() {
      const clientId = this.getClientId();
      if (!clientId) {
        this.updateUI();
        return;
      }

      if (window.google && window.google.accounts && window.google.accounts.oauth2) {
        try {
          tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
            callback: async (tokenResponse) => {
              if (tokenResponse && tokenResponse.access_token) {
                accessToken = tokenResponse.access_token;
                await this.fetchUserInfo();
                await this.initDriveStructure();
                this.updateUI();

                // Cek apakah di Google Drive pengguna sudah ada file database sebelumnya
                if (cachedDbFileId) {
                  const userName = this.getUser()?.name || 'Bapak/Ibu';
                  const pull = confirm(`Halo ${userName}!\n\nDitemukan cadangan data SIM-HUNTARA di Google Drive Anda.\n\nApakah Anda ingin MEMUAT data dari Google Drive sekarang?`);
                  if (pull) {
                    await this.restoreFromDrive();
                  }
                } else {
                  // Jika pengguna baru pertama kali login, langsung cadangkan data awal ke folder Drive mereka
                  if (window.app && window.app.getState) {
                    await this.manualSync();
                  }
                }

                if (window.app && window.app.showToast) {
                  window.app.showToast('✅ Berhasil login & terhubung ke Google Drive Anda!', 'success');
                }
              }
            },
            error_callback: (err) => {
              console.error('Google Auth Error:', err);
              if (window.app && window.app.showToast) {
                window.app.showToast('Gagal login Google: ' + (err.message || 'Periksa koneksi'), 'error');
              }
            }
          });
        } catch (e) {
          console.error('GSI Init Error:', e);
        }
      }
      this.updateUI();
    },

    signIn() {
      const clientId = this.getClientId();
      if (!clientId) {
        this.openSetupModal();
        return;
      }
      if (!tokenClient) {
        this.init();
      }
      if (tokenClient) {
        tokenClient.requestAccessToken({ prompt: '' });
      } else {
        alert('Google Identity Services sedang dimuat. Mohon tunggu beberapa detik lalu coba lagi.');
      }
    },

    signOut() {
      if (accessToken && window.google && window.google.accounts && window.google.accounts.oauth2) {
        try {
          window.google.accounts.oauth2.revoke(accessToken, () => {});
        } catch (_) {}
      }
      accessToken = null;
      cachedFolderId = null;
      cachedDbFileId = null;
      cachedPhotosFolderId = null;
      this.setUser(null);
      this.updateUI();
      if (window.app && window.app.showToast) {
        window.app.showToast('Telah keluar dari akun Google', 'info');
      }
    },

    async fetchUserInfo() {
      if (!accessToken) return null;
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!res.ok) throw new Error('Gagal mengambil info user');
        const user = await res.json();
        this.setUser({
          name: user.name || 'Pengguna Google',
          email: user.email || '',
          picture: user.picture || '',
          connectedAt: new Date().toISOString()
        });
        return user;
      } catch (err) {
        console.error('fetchUserInfo error:', err);
        return null;
      }
    },

    async initDriveStructure() {
      if (!accessToken) return;
      try {
        // 1. Cari atau buat folder khusus perusahaan
        cachedFolderId = await this.getOrCreateFolder(getFolderName());
        // 2. Cari atau buat subfolder Foto-Dokumentasi
        cachedPhotosFolderId = await this.getOrCreateFolder(PHOTOS_FOLDER_NAME, cachedFolderId);
        // 3. Cek file database-huntara.json
        cachedDbFileId = await this.findFile(DB_FILE_NAME, cachedFolderId);
      } catch (err) {
        console.error('Error initDriveStructure:', err);
      }
    },

    async getOrCreateFolder(name, parentId = null) {
      if (!accessToken) return null;
      let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      if (parentId) {
        query += ` and '${parentId}' in parents`;
      }
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }

      // Buat folder baru
      const metadata = {
        name: name,
        mimeType: 'application/vnd.google-apps.folder'
      };
      if (parentId) metadata.parents = [parentId];

      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      });
      const folder = await createRes.json();
      return folder.id;
    },

    async findFile(name, parentId = null) {
      if (!accessToken) return null;
      let query = `name='${name}' and trashed=false`;
      if (parentId) query += ` and '${parentId}' in parents`;
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime)`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      return data.files && data.files.length > 0 ? data.files[0].id : null;
    },

    async syncStateToDrive(payload) {
      if (!accessToken) return false;
      if (isSyncing) return false;
      isSyncing = true;
      this.setSyncStatus('⏳ Sinkronisasi ke Google Drive...');

      try {
        if (!cachedFolderId) {
          await this.initDriveStructure();
        }
        const fileContent = JSON.stringify(payload, null, 2);
        const metadata = {
          name: DB_FILE_NAME,
          mimeType: 'application/json'
        };
        if (!cachedDbFileId) {
          cachedDbFileId = await this.findFile(DB_FILE_NAME, cachedFolderId);
        }

        if (cachedDbFileId) {
          // Update file existing
          await fetch(`https://www.googleapis.com/upload/drive/v3/files/${cachedDbFileId}?uploadType=media`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: fileContent
          });
        } else {
          // Buat file baru via multipart
          metadata.parents = [cachedFolderId];
          const boundary = '-------314159265358979323846';
          const delimiter = "\r\n--" + boundary + "\r\n";
          const close_delim = "\r\n--" + boundary + "--";

          const multipartRequestBody =
            delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            fileContent +
            close_delim;

          const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'multipart/related; boundary=' + boundary
            },
            body: multipartRequestBody
          });
          const created = await res.json();
          cachedDbFileId = created.id;
        }

        const user = this.getUser();
        const email = user ? user.email : '';
        this.setSyncStatus(`✅ Tersimpan di Google Drive (${email})`);
        return true;
      } catch (err) {
        console.error('Error syncing to Drive:', err);
        this.setSyncStatus('⚠️ Gagal sinkron ke Google Drive');
        return false;
      } finally {
        isSyncing = false;
      }
    },

    async pullFromDrive() {
      if (!accessToken) {
        alert('Silakan Login dengan Google terlebih dahulu.');
        return null;
      }
      try {
        if (!cachedFolderId) await this.initDriveStructure();
        if (!cachedDbFileId) cachedDbFileId = await this.findFile(DB_FILE_NAME, cachedFolderId);
        if (!cachedDbFileId) {
          alert('Belum ada file cadangan "database-huntara.json" di Google Drive Anda.');
          return null;
        }

        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${cachedDbFileId}?alt=media`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!res.ok) throw new Error('Gagal mengambil data dari Google Drive');
        const data = await res.json();
        return data;
      } catch (err) {
        console.error('Error pulling from Drive:', err);
        alert('Gagal memuat data dari Google Drive: ' + err.message);
        return null;
      }
    },

    async uploadPhoto(dataUrl, filename = 'foto_huntara.jpg') {
      if (!accessToken) return null;
      try {
        if (!cachedPhotosFolderId) await this.initDriveStructure();
        const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
        if (!match) return null;
        const mime = 'image/' + match[1];
        const base64Data = match[2];

        // Convert base64 to Blob
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mime });

        const metadata = {
          name: filename,
          parents: [cachedPhotosFolderId]
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', blob);

        const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,thumbnailLink', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: form
        });
        const uploaded = await res.json();
        return uploaded;
      } catch (err) {
        console.error('Upload photo to drive error:', err);
        return null;
      }
    },

    setSyncStatus(text) {
      const el = document.getElementById('gdriveStatusText');
      if (el) el.innerHTML = text;
      const sidebarEl = document.getElementById('saveStatusText');
      if (sidebarEl && text.includes('Google Drive')) {
        sidebarEl.innerHTML = `<span class="save-icon">☁️</span> ${text}`;
      }
    },

    updateUI() {
      const user = this.getUser();
      const clientId = this.getClientId();
      const topbarEl = document.getElementById('googleAuthTopbar');
      const cardEl = document.getElementById('googleDriveSyncCard');

      // 1. TOPBAR WIDGET
      if (topbarEl) {
        if (user && accessToken) {
          topbarEl.innerHTML = `
            <div class="gdrive-user-pill" title="Terhubung ke Google Drive (${escapeHtml(user.email)})">
              ${user.picture ? `<img src="${escapeHtml(user.picture)}" alt="Avatar" class="gdrive-avatar" />` : `<span class="gdrive-avatar-placeholder">👤</span>`}
              <div class="gdrive-user-info">
                <span class="gdrive-user-name">${escapeHtml(user.name)}</span>
                <span class="gdrive-user-badge">🟢 Google Drive Sync</span>
              </div>
              <button class="gdrive-btn-mini" onclick="window.gdriveSync.manualSync()" title="Sinkronkan Sekarang">🔄</button>
              <button class="gdrive-btn-mini danger" onclick="window.gdriveSync.signOut()" title="Keluar Akun Google">✕</button>
            </div>
          `;
        } else {
          const webhookUrl = this.getWebhookUrl();
          if (webhookUrl) {
            topbarEl.innerHTML = `
              <div class="gdrive-user-pill" style="background:#f0fdf4;border:1px solid #86efac;cursor:pointer;display:inline-flex;align-items:center;padding:4px 10px;gap:8px;border-radius:20px;" onclick="window.gdriveSync.openWebhookModal()" title="Google Spreadsheet &amp; Drive Terhubung (Klik untuk Pengaturan)">
                <span style="font-size:15px;">📊</span>
                <div class="gdrive-user-info" style="display:flex;flex-direction:column;line-height:1.2;">
                  <span class="gdrive-user-name" style="color:#166534;font-weight:700;font-size:11.5px;">Google Sheets &amp; Drive</span>
                  <span class="gdrive-user-badge" style="color:#15803d;font-size:10px;">🟢 Auto-Sync Aktif</span>
                </div>
              </div>
            `;
          } else {
            topbarEl.innerHTML = `
              <button class="btn btn-gdrive btn-sm" onclick="window.gdriveSync.signIn()">
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                <span>Login Google Drive</span>
              </button>
            `;
          }
        }
      }

      // 2. CARD DALAM TAB KOLABORASI & BACKUP
      if (cardEl) {
        if (user && accessToken) {
          cardEl.innerHTML = `
            <div style="display:flex;align-items:center;gap:14px;background:#f0fdf4;border:1px solid #bbf7d0;padding:16px;border-radius:10px;margin-bottom:14px;">
              ${user.picture ? `<img src="${escapeHtml(user.picture)}" style="width:48px;height:48px;border-radius:50%;border:2px solid #16a34a;" />` : `<div style="width:48px;height:48px;border-radius:50%;background:#16a34a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;">👤</div>`}
              <div style="flex:1;">
                <div style="font-weight:700;font-size:15px;color:#166534;">${escapeHtml(user.name)}</div>
                <div style="font-size:13px;color:#15803d;">✉️ ${escapeHtml(user.email)}</div>
                <div style="font-size:12px;color:#166534;margin-top:3px;" id="gdriveStatusText">🟢 Terhubung ke folder: <strong>Google Drive > ${getFolderName()}/</strong></div>
              </div>
              <button class="btn btn-outline btn-sm" onclick="window.gdriveSync.signOut()" style="color:#dc2626;border-color:#fca5a5;">
                Keluar Akun
              </button>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
              <button class="btn btn-primary" onclick="window.gdriveSync.manualSync()">
                🔄 Sinkronkan (Simpan) Data ke Google Drive Sekarang
              </button>
              <button class="btn btn-outline" onclick="window.gdriveSync.restoreFromDrive()">
                📥 Pulihkan / Tarik Data dari Google Drive
              </button>
              <button class="btn btn-outline btn-sm" onclick="window.gdriveSync.openSetupModal()">
                ⚙️ Pengaturan Client ID
              </button>
            </div>
            <p style="font-size:12.5px;color:var(--text-muted);margin:0;">
              💡 <strong>Otomatis:</strong> Setiap ada perubahan data atau upload foto, aplikasi otomatis menyimpan ke folder <code>${getFolderName()}/</code> di Google Drive akun <code>${escapeHtml(user.email)}</code>.
            </p>
          `;
        } else {
          cardEl.innerHTML = `
            <div style="background:#f8fafc;border:1px dashed #cbd5e1;padding:16px;border-radius:10px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;">
              <div>
                <div style="font-weight:700;font-size:14px;color:#1e293b;margin-bottom:4px;">☁️ Belum Terhubung ke Google Drive</div>
                <div style="font-size:12.5px;color:#64748b;">
                  ${clientId ? 'Client ID Google sudah terpasang. Klik tombol Login di samping untuk menghubungkan akun Gmail Anda.' : 'Silakan pasang Google Client ID untuk mengaktifkan login otomatis Google Drive.'}
                </div>
              </div>
              <div style="display:flex;gap:8px;">
                <button class="btn btn-gdrive" onclick="window.gdriveSync.signIn()">
                  <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                  <span>Login dengan Google</span>
                </button>
                <button class="btn btn-outline btn-sm" onclick="window.gdriveSync.openSetupModal()" title="Konfigurasi Client ID">
                  ⚙️ Setup
                </button>
              </div>
            </div>
            <p style="font-size:12px;color:var(--text-muted);margin:0;">
              🔒 <strong>Privasi Terjamin:</strong> Aplikasi hanya meminta akses ke file yang dibuat oleh aplikasi ini (<code>drive.file</code>), tidak dapat membaca file pribadi Anda lainnya.
            </p>
          `;
        }
      }
    },

    async manualSync() {
      if (!window.app || !window.app.getState) return;
      const state = window.app.getState();
      const payload = {
        settings: state.settings,
        vendors: state.vendors,
        units: state.units,
        batches: state.batches,
        lastSync: new Date().toISOString()
      };
      const ok = await this.syncStateToDrive(payload);
      if (ok && window.app && window.app.showToast) {
        window.app.showToast('✅ Berhasil menyinkronkan seluruh data ke Google Drive!', 'success');
      }
    },

    async restoreFromDrive() {
      if (!confirm('Apakah Anda yakin ingin memulihkan (me-replace) data aplikasi dengan data dari Google Drive?')) {
        return;
      }
      const data = await this.pullFromDrive();
      if (data && window.app && window.app.applyImportedState) {
        window.app.applyImportedState(data);
        if (window.app.showToast) {
          window.app.showToast('✅ Data berhasil dipulihkan dari Google Drive!', 'success');
        }
      }
    },

    openSetupModal() {
      const currentId = this.getClientId();
      const modal = document.getElementById('modalRoot');
      if (!modal) return;
      modal.innerHTML = `
        <div class="modal-backdrop" onclick="window.gdriveSync.closeModal()">
          <div class="modal-card" style="max-width:560px;" onclick="event.stopPropagation()">
            <div class="modal-header">
              <h3>☁️ Konfigurasi Google Client ID (OAuth 2.0)</h3>
              <button class="btn-close" onclick="window.gdriveSync.closeModal()">✕</button>
            </div>
            <div class="modal-body" style="padding:20px;font-size:13.5px;line-height:1.6;">
              <p style="margin-bottom:12px;">
                Untuk mengaktifkan login Google dan penyimpanan ke Google Drive masing-masing pengguna, masukkan <strong>Google OAuth 2.0 Client ID</strong>:
              </p>
              <div class="form-group" style="margin-bottom:16px;">
                <label style="font-weight:700;display:block;margin-bottom:6px;">Google Client ID:</label>
                <input type="text" id="inputGoogleClientId" class="form-control" placeholder="Contoh: 123456789-abcdefghijk.apps.googleusercontent.com" value="${escapeHtml(currentId)}" style="font-family:monospace;font-size:12.5px;" />
              </div>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:12px;border-radius:8px;font-size:12.5px;color:#475569;margin-bottom:16px;">
                <strong>📌 Cara Mendapatkan Client ID Gratis (2 Menit):</strong>
                <ol style="margin:6px 0 0 18px;padding:0;">
                  <li>Buka <strong><a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="color:#2563eb;">Google Cloud Console Credentials</a></strong>.</li>
                  <li>Klik <strong>Create Credentials</strong> ➜ Pilih <strong>OAuth client ID</strong>.</li>
                  <li>Application type: <strong>Web application</strong>.</li>
                  <li>Pada <em>Authorized JavaScript origins</em>, tambahkan link aplikasi Anda:<br/>
                    • <code>http://localhost:4500</code><br/>
                    • <code>${window.location.origin}</code>
                  </li>
                  <li>Klik <strong>Create</strong> lalu salin (copy) <strong>Client ID</strong>-nya ke kotak di atas.</li>
                </ol>
              </div>
              <div style="display:flex;justify-content:flex-end;gap:10px;">
                <button class="btn btn-outline" onclick="window.gdriveSync.closeModal()">Batal</button>
                <button class="btn btn-primary" onclick="window.gdriveSync.saveClientIdFromModal()">💾 Simpan &amp; Aktifkan</button>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    saveClientIdFromModal() {
      const input = document.getElementById('inputGoogleClientId');
      if (input) {
        this.setClientId(input.value);
        this.closeModal();
        if (window.app && window.app.showToast) {
          window.app.showToast('Client ID berhasil disimpan!', 'success');
        }
        if (input.value.trim()) {
          setTimeout(() => this.signIn(), 400);
        }
      }
    },

    closeModal() {
      const modal = document.getElementById('modalRoot');
      if (modal) modal.innerHTML = '';
    }
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  window.gdriveSync = gdriveSync;

  // Auto init saat script dimuat
  window.addEventListener('DOMContentLoaded', () => {
    // Tunggu GSI script
    let checkGsi = setInterval(() => {
      if (window.google && window.google.accounts) {
        clearInterval(checkGsi);
        gdriveSync.init();
      }
    }, 200);
    setTimeout(() => clearInterval(checkGsi), 5000);
  });
})();
