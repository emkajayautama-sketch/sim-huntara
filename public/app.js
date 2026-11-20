/* ==========================================================================
   SIM-HUNTARA BNPB — FRONTEND LOGIC (MULTI-VENDOR, PROGRES DESA, GELONDONGAN)
   ========================================================================== */

(function () {
  const state = {
    activeTab: 'dashboard',
    selectedVendorId: 'vendor-emka-utama', // 'ALL' or vendorId
    settings: {},
    vendors: [],
    units: [],
    batches: [],
    serverInfo: {
      localUrl: window.location.origin,
      lanUrls: []
    },
    // Filters for Units tab
    unitFilter: {
      kecamatan: 'ALL',
      desa: 'ALL',
      progres: 'ALL',
      statusTagihan: 'ALL',
      search: ''
    },
    // State for creating a new Batch (Pencairan Gelondongan)
    batchForm: {
      vendorId: 'vendor-emka-utama',
      filterKecamatan: 'ALL',
      filterDesa: 'ALL',
      searchQuery: '',
      customPickCount: 12,
      randomNumbersText: '',
      selectedUnitIds: [],
      allowUnderMin: false,
      namaBatch: 'Pencairan Gelondongan Tahap 1',
      noInvoice: 'EMKA00011126',
      tglInvoice: getTodayIndonesian(),
      noSpp: '001/EMKA/XI/2026',
      tglSpp: getTodayIndonesian(),
      noSps: '01/EMKA/SPS/XI/2026',
      tglSps: getTodayIndonesian(),
      tglCoverDokumentasi: getTodayIndonesian(),
      catatan: ''
    },
    // State for Print Center
    printConfig: {
      mode: 'BATCH', // 'BATCH' | 'DESA' | 'VENDOR'
      batchId: '',
      vendorId: 'vendor-emka-utama',
      kecamatan: 'ALL',
      desa: 'ALL',
      docType: 'DOKUMENTASI', // 'DOKUMENTASI' | 'ALL_LETTERS' | 'INVOICE' | 'SPP' | 'SPS' | 'BNBA_LIST' | 'FULL_PACKAGE'
      singleUnitId: null,
      customQty: 20,
      showInvoiceTaxNumbers: true,
      taxMode: 'DPP', // 'DPP' (100/111) | 'DIRECT' (Langsung dari Sub Total)
      overrideTanggal: '',
      overrideNoInvoice: '',
      overrideNoSpp: '',
      overrideNoSps: '',
      overrideDeskripsiLokasi: ''
    }
  };

  function getTodayIndonesian() {
    const bulan = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const d = new Date();
    return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
  }

  function generateAutoKuitansiNo(vendor, seqNum = 1) {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    const code = (vendor?.kodeSurat || 'EMKA').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const seq = String(seqNum).padStart(4, '0');
    return `${code}${seq}${mm}${yy}`;
  }

  /* ========================================================================
     HELPER: FORMAT RUPIAH & TERBILANG BAHASA INDONESIA
     ======================================================================== */
  function formatNumber(num) {
    const n = Math.round(Number(num) || 0);
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function formatNumberDot(num) {
    const n = Math.round(Number(num) || 0);
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function toTitleCase(str) {
    if (!str) return '';
    const romanNumerals = new Set(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']);
    const keepUpper = new Set(['RT', 'RW', 'KK', 'NIK', 'BNPB', 'SPK', 'SPP', 'SPS', 'BNBA', 'DSP', 'DTH', 'PPN', 'PPH']);
    return String(str).replace(/[A-Za-zÀ-ÿ0-9]+/g, (match) => {
      const upper = match.toUpperCase();
      if (romanNumerals.has(upper)) return upper;
      if (keepUpper.has(upper)) return upper;
      return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
    });
  }

  function terbilangDasar(n) {
    n = Math.floor(Math.abs(n));
    const angka = [
      '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima',
      'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
    ];
    if (n < 12) return angka[n];
    if (n < 20) return terbilangDasar(n - 10) + ' Belas';
    if (n < 100) {
      return terbilangDasar(Math.floor(n / 10)) + ' Puluh' + (n % 10 !== 0 ? ' ' + terbilangDasar(n % 10) : '');
    }
    if (n < 200) {
      return 'Seratus' + (n - 100 !== 0 ? ' ' + terbilangDasar(n - 100) : '');
    }
    if (n < 1000) {
      return terbilangDasar(Math.floor(n / 100)) + ' Ratus' + (n % 100 !== 0 ? ' ' + terbilangDasar(n % 100) : '');
    }
    if (n < 2000) {
      return 'Seribu' + (n - 1000 !== 0 ? ' ' + terbilangDasar(n - 1000) : '');
    }
    if (n < 1000000) {
      return terbilangDasar(Math.floor(n / 1000)) + ' Ribu' + (n % 1000 !== 0 ? ' ' + terbilangDasar(n % 1000) : '');
    }
    if (n < 1000000000) {
      return terbilangDasar(Math.floor(n / 1000000)) + ' Juta' + (n % 1000000 !== 0 ? ' ' + terbilangDasar(n % 1000000) : '');
    }
    if (n < 1000000000000) {
      return terbilangDasar(Math.floor(n / 1000000000)) + ' Miliar' + (n % 1000000000 !== 0 ? ' ' + terbilangDasar(n % 1000000000) : '');
    }
    return terbilangDasar(Math.floor(n / 1000000000000)) + ' Triliun' + (n % 1000000000000 !== 0 ? ' ' + terbilangDasar(n % 1000000000000) : '');
  }

  function terbilangAngka(n) {
    if (!n || Number(n) === 0) return 'Nol';
    return terbilangDasar(n).replace(/\s+/g, ' ').trim();
  }

  function terbilangRupiah(n) {
    return terbilangAngka(n) + ' Rupiah';
  }

  /* ========================================================================
     HELPER: HITUNG KEUANGAN & PAJAK (OTOMATIS KURANGI PPN & PPH)
     ======================================================================== */
  function hitungKeuangan(jumlahUnit, vendor) {
    const qty = Number(jumlahUnit) || 0;
    const hargaSatuan = Number(vendor?.hargaSatuan) || 34500000;
    const ppnPersen = Number(vendor?.ppnPersen ?? 11);
    const pphPersen = Number(vendor?.pphPersen ?? 1.5);

    const totalBruto = qty * hargaSatuan;
    const taxMode = state.printConfig?.taxMode || 'DPP';
    const dpp = taxMode === 'DIRECT'
      ? totalBruto
      : totalBruto * (100 / (100 + ppnPersen));

    const ppnExact = dpp * (ppnPersen / 100);
    const pphExact = dpp * (pphPersen / 100);

    const ppn = Math.round(ppnExact);
    const pph = Math.round(pphExact);
    // Total Tagihan Bersih = Sub Total dikurangi potongan PPN dan PPh
    const netto = Math.round(totalBruto - ppnExact - pphExact);

    return {
      qty,
      hargaSatuan,
      ppnPersen,
      pphPersen,
      totalBruto,
      dpp,
      ppn,
      pph,
      totalPotongan: ppn + pph,
      netto,
      dibulatkan: netto,
      terbilangBruto: terbilangRupiah(totalBruto),
      terbilangNetto: terbilangRupiah(netto),
      terbilangQty: terbilangAngka(qty)
    };
  }

  function renderVendorKopHtml(vendor, extraStyle = '') {
    if (vendor.kopSuratUrl) {
      return `
        <div class="kop-vendor-full" style="width:100%;margin-bottom:14px;border-bottom:2.5px solid #000;padding-bottom:6px;${extraStyle}">
          <img src="${escapeHtml(vendor.kopSuratUrl)}" alt="Kop Surat ${escapeHtml(vendor.nama)}" style="width:100%;max-height:120px;object-fit:contain;display:block;margin:0 auto;" />
        </div>
      `;
    }
    return `
      <div class="kop-vendor" style="${extraStyle}">
        <img src="${escapeHtml(vendor.logoUrl || '/assets/logo-emka-real_0.png')}" class="kop-logo" alt="Logo" />
        <div class="kop-vendor-text">
          <div class="vendor-title">${escapeHtml(vendor.nama)}</div>
          <div class="vendor-subtitle">${escapeHtml(vendor.subJudul || 'KONTRAKTOR - LEVERANSIR')}</div>
          <div class="vendor-address">${escapeHtml(vendor.alamat)}</div>
        </div>
      </div>
    `;
  }

  function renderVendorTtdHtml(vendor, align = 'left') {
    const hasTtd = Boolean(vendor.ttdStempelUrl);
    const hasSpesimen = Boolean(vendor.spesimenUrl);
    if (!hasTtd && !hasSpesimen) {
      return `<div style="height:62px;"></div>`;
    }
    const justify = align === 'center' ? 'center' : 'flex-start';
    return `
      <div style="display:flex;align-items:center;justify-content:${justify};margin:4px 0 6px;">
        <div style="position:relative;display:inline-flex;align-items:center;justify-content:center;min-height:70px;min-width:185px;">
          ${hasTtd ? `<img src="${escapeHtml(vendor.ttdStempelUrl)}" alt="Cap / Stempel" style="max-height:66px;max-width:180px;object-fit:contain;display:block;" />` : ''}
          ${hasSpesimen ? `<img src="${escapeHtml(vendor.spesimenUrl)}" alt="Tanda Tangan" style="${hasTtd ? 'position:absolute;left:52%;top:54%;transform:translate(-50%, -50%);z-index:2;' : ''}max-height:68px;max-width:195px;object-fit:contain;display:block;" />` : ''}
        </div>
      </div>
    `;
  }

  function renderDirectorNameAndRoleHtml(vendor) {
    return `
      <div style="display:inline-block;text-align:inherit;">
        <div style="font-weight:bold;text-transform:uppercase;border-bottom:1.5px solid #000;padding-bottom:1px;margin-bottom:2px;display:inline-block;">
          ${escapeHtml(vendor.direktur)}
        </div>
        <div style="font-weight:normal;">
          ${escapeHtml(vendor.jabatan || 'Direktur')}
        </div>
      </div>
    `;
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ========================================================================
     API & PERSISTENCE
     ======================================================================== */
  async function loadState() {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error('Gagal memuat state dari server');
      const data = await res.json();
      state.settings = data.settings || {};
      state.vendors = data.vendors || [];
      state.units = data.units || [];
      state.batches = data.batches || [];
      if (data.serverInfo) state.serverInfo = data.serverInfo;

      if (state.vendors.length > 0 && !state.vendors.some(v => v.id === state.selectedVendorId) && state.selectedVendorId !== 'ALL') {
        state.selectedVendorId = state.vendors[0].id;
      }
      if (state.batches.length > 0 && !state.printConfig.batchId) {
        state.printConfig.batchId = state.batches[0].id;
      }
      renderAll();
    } catch (err) {
      console.error('Error loading state:', err);
      const cached = localStorage.getItem('sim_huntara_backup');
      if (cached) {
        const parsed = JSON.parse(cached);
        state.settings = parsed.settings || {};
        state.vendors = parsed.vendors || [];
        state.units = parsed.units || [];
        state.batches = parsed.batches || [];
        renderAll();
      }
    }
  }

  async function saveState(msg = 'Tersimpan Otomatis') {
    const statusEl = document.getElementById('saveStatusText');
    if (statusEl) statusEl.textContent = '⏳ Menyimpan...';
    try {
      const payload = {
        settings: state.settings,
        vendors: state.vendors,
        units: state.units,
        batches: state.batches
      };
      try {
        localStorage.setItem('sim_huntara_backup', JSON.stringify(payload));
      } catch (_) {}

      const res = await fetch('/api/save-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Server save error');
      if (statusEl) statusEl.textContent = `✅ ${msg}`;
    } catch (err) {
      console.error('Save error:', err);
      if (statusEl) statusEl.textContent = '⚠️ Tersimpan di Browser Lokal';
    }
    updateSidebarBadges();
  }

  async function uploadImageFile(file, prefix = 'foto') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const rawDataUrl = e.target.result;
        try {
          const compressed = await compressImageDataUrl(rawDataUrl, 1280, 0.84);
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataUrl: compressed, prefix })
          });
          const data = await res.json();
          if (data.ok && data.url) {
            resolve(data.url);
          } else {
            resolve(compressed);
          }
        } catch (_) {
          resolve(rawDataUrl);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function compressImageDataUrl(dataUrl, maxWidth = 1280, quality = 0.84) {
    return new Promise((resolve) => {
      if (dataUrl.startsWith('data:image/svg')) return resolve(dataUrl);
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const outType = dataUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(outType, quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  /* ========================================================================
     GETTERS & FILTER HELPERS
     ======================================================================== */
  function getVendorById(id) {
    return state.vendors.find(v => v.id === id) || state.vendors[0] || {
      id: 'default',
      nama: 'CV. EMKA UTAMA',
      subJudul: 'KONTRAKTOR - LEVERANSIR',
      direktur: 'DIREKTUR',
      jabatan: 'Direktur',
      alamat: 'Mbay, Kab. Nagekeo',
      kotaTtd: 'Mbay',
      kabupaten: 'Kabupaten Nagekeo',
      provinsi: 'Provinsi Nusa Tenggara Timur',
      namaBank: 'BANK BNI / BANK NTT',
      noRekening: '-',
      atasNamaRekening: 'CV. EMKA UTAMA',
      hargaSatuan: 34500000,
      ppnPersen: 11,
      pphPersen: 1.75,
      logoUrl: '/assets/logo-emka.svg'
    };
  }

  function getActiveUnits() {
    if (state.selectedVendorId === 'ALL') return state.units;
    return state.units.filter(u => u.vendorId === state.selectedVendorId);
  }

  function getActiveBatches() {
    if (state.selectedVendorId === 'ALL') return state.batches;
    return state.batches.filter(b => b.vendorId === state.selectedVendorId);
  }

  /* ========================================================================
     SIDEBAR & NAVIGATION
     ======================================================================== */
  function updateSidebarBadges() {
    const select = document.getElementById('globalVendorSelect');
    if (select) {
      const optionsHtml = [
        `<option value="ALL" ${state.selectedVendorId === 'ALL' ? 'selected' : ''}>🌐 Semua Perusahaan (${state.vendors.length} Vendor)</option>`,
        ...state.vendors.map(v => {
          const count = state.units.filter(u => u.vendorId === v.id).length;
          return `<option value="${escapeHtml(v.id)}" ${state.selectedVendorId === v.id ? 'selected' : ''}>🏢 ${escapeHtml(v.nama)} (${count} Unit)</option>`;
        })
      ].join('');
      select.innerHTML = optionsHtml;
    }

    const activeUnits = getActiveUnits();
    const readyUnits = activeUnits.filter(u => Number(u.progres) === 100 && !u.batchId);

    const elVendor = document.getElementById('badgeVendorCount');
    const elUnit = document.getElementById('badgeUnitCount');
    const elReady = document.getElementById('badgeReadyCount');

    if (elVendor) elVendor.textContent = state.vendors.length;
    if (elUnit) elUnit.textContent = activeUnits.length;
    if (elReady) elReady.textContent = readyUnits.length;

    const lanBox = document.getElementById('lanInfoBox');
    if (lanBox) {
      const urls = state.serverInfo?.lanUrls || [];
      if (urls.length > 0) {
        lanBox.innerHTML = `<strong>📡 Link Sharing WiFi/Tim:</strong><br/>${urls.map(u => `<span>${escapeHtml(u)}</span>`).join('<br/>')}`;
      } else {
        lanBox.innerHTML = `<strong>💻 Mode Lokal Aktif:</strong><br/>${escapeHtml(window.location.origin)}`;
      }
    }
  }

  function switchTab(tabName) {
    state.activeTab = tabName;
    document.querySelectorAll('#sidebarNav .nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    renderAll();
  }

  function renderAll() {
    updateSidebarBadges();
    const main = document.getElementById('mainContent');
    const titleEl = document.getElementById('pageTitle');
    const subEl = document.getElementById('pageSubtitle');

    const vendorLabel = state.selectedVendorId === 'ALL'
      ? 'Semua Perusahaan (Multi-Vendor)'
      : getVendorById(state.selectedVendorId).nama;

    if (state.activeTab === 'dashboard') {
      titleEl.textContent = `Dashboard & Pemantauan Progres Per Desa — ${vendorLabel}`;
      subEl.textContent = 'Rekapitulasi progres fisik (0%, 50%, 100%) per Kecamatan & Desa serta kesiapan pencairan gelondongan';
      main.innerHTML = renderDashboardTab();
    } else if (state.activeTab === 'vendors') {
      titleEl.textContent = 'Master Data Perusahaan / Vendor Pelaksana Huntara';
      subEl.textContent = 'Kelola profil CV, Direktur, Rekening Bank, Harga Satuan, Logo Kop Surat, serta Tanda Tangan & Stempel';
      main.innerHTML = renderVendorsTab();
    } else if (state.activeTab === 'units') {
      titleEl.textContent = `Data BNBA & Progres Fisik Rumah — ${vendorLabel}`;
      subEl.textContent = 'Pantau dan perbarui checklist pekerjaan 0%, 50%, 100%, foto dokumentasi, dan surat perubahan denah per KK';
      main.innerHTML = renderUnitsTab();
    } else if (state.activeTab === 'batches') {
      titleEl.textContent = 'Pencairan Gelondongan / Batch Penagihan (Minimal 10 Unit)';
      subEl.textContent = 'Pilih rumah yang sudah selesai 100% (bisa 10 unit, 20 unit, dst.) untuk diterbitkan berkas tagihan tanpa dobel klaim';
      main.innerHTML = renderBatchesTab();
    } else if (state.activeTab === 'print') {
      titleEl.textContent = 'Pusat Cetak Dokumen Pencairan & Buku Dokumentasi Foto';
      subEl.textContent = 'Cetak / Simpan PDF ukuran A4: Invoice, Surat Permohonan Pembayaran, SPS 100%, Daftar BNBA & Dokumentasi Foto';
      main.innerHTML = renderPrintTab();
    } else if (state.activeTab === 'tools') {
      titleEl.textContent = 'Studio Auto-Watermark Foto BNPB & Blanko Lapangan';
      subEl.textContent = 'Beri stempel otomatis Logo BNPB + Koordinat GPS + Nama Penerima pada foto & cetak blanko perubahan denah';
      main.innerHTML = renderToolsTab();
    } else if (state.activeTab === 'sharing') {
      titleEl.textContent = 'Sharing Tim, Kolaborasi WiFi & Backup Data Vendor';
      subEl.textContent = 'Bagikan akses ke laptop/HP tim lapangan atau kirim/gabungkan file paket data antar vendor via WhatsApp';
      main.innerHTML = renderSharingTab();
    }
  }

  /* ========================================================================
     TAB 1: DASHBOARD & PEMANTAUAN PROGRES PER DESA
     ======================================================================== */
  function renderDashboardTab() {
    const units = getActiveUnits();
    const batches = getActiveBatches();
    const minUnit = Number(state.settings.minimalUnitTagihan) || 10;

    const totalUnits = units.length;
    const count0 = units.filter(u => Number(u.progres) === 0).length;
    const count50 = units.filter(u => Number(u.progres) === 50).length;
    const count100 = units.filter(u => Number(u.progres) === 100).length;
    const countReady = units.filter(u => Number(u.progres) === 100 && !u.batchId).length;
    const countBilled = units.filter(u => Boolean(u.batchId)).length;
    const countDenah = units.filter(u => Boolean(u.perubahanDenah)).length;

    const weightedProgress = totalUnits > 0
      ? (((count50 * 50) + (count100 * 100)) / totalUnits).toFixed(1)
      : '0.0';

    // Group by Kecamatan & Desa
    const desaMap = {};
    for (const u of units) {
      const key = `${u.kecamatan || '-'}||${u.desa || '-'}`;
      if (!desaMap[key]) {
        desaMap[key] = {
          kecamatan: u.kecamatan || '-',
          desa: u.desa || '-',
          total: 0,
          p0: 0,
          p50: 0,
          p100: 0,
          ready: 0,
          billed: 0,
          denah: 0
        };
      }
      const d = desaMap[key];
      d.total++;
      if (Number(u.progres) === 100) d.p100++;
      else if (Number(u.progres) === 50) d.p50++;
      else d.p0++;

      if (Number(u.progres) === 100 && !u.batchId) d.ready++;
      if (u.batchId) d.billed++;
      if (u.perubahanDenah) d.denah++;
    }
    const desaList = Object.values(desaMap).sort((a, b) =>
      a.kecamatan.localeCompare(b.kecamatan) || b.total - a.total
    );

    // Group by Kecamatan summary
    const kecMap = {};
    for (const d of desaList) {
      if (!kecMap[d.kecamatan]) {
        kecMap[d.kecamatan] = { kecamatan: d.kecamatan, desaCount: 0, total: 0, p0: 0, p50: 0, p100: 0, ready: 0, billed: 0 };
      }
      const k = kecMap[d.kecamatan];
      k.desaCount++;
      k.total += d.total;
      k.p0 += d.p0;
      k.p50 += d.p50;
      k.p100 += d.p100;
      k.ready += d.ready;
      k.billed += d.billed;
    }
    const kecList = Object.values(kecMap);

    const activeVendor = state.selectedVendorId === 'ALL' ? state.vendors[0] : getVendorById(state.selectedVendorId);
    const finTotal = hitungKeuangan(totalUnits, activeVendor);
    const finReady = hitungKeuangan(countReady, activeVendor);

    return `
      <!-- KPI CARDS -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">Total Kuota Unit (BNBA)</span>
          <div class="kpi-value">${totalUnits} <small style="font-size:14px;font-weight:600">Unit</small></div>
          <span class="kpi-sub">Nilai Kontrak: Rp ${formatNumberDot(finTotal.totalBruto)}</span>
        </div>
        <div class="kpi-card orange">
          <span class="kpi-label">Progres Fisik Keseluruhan</span>
          <div class="kpi-value">${weightedProgress}%</div>
          <span class="kpi-sub">0%: <b>${count0}</b> | 50%: <b>${count50}</b> | 100%: <b>${count100}</b></span>
        </div>
        <div class="kpi-card green">
          <span class="kpi-label">Siap Tagih Gelondongan (100%)</span>
          <div class="kpi-value">${countReady} <small style="font-size:14px;font-weight:600">Unit</small></div>
          <span class="kpi-sub">${
            countReady >= minUnit
              ? `✅ Memenuhi syarat min. ${minUnit} unit (Netto Rp ${formatNumberDot(finReady.netto)})`
              : `⏳ Butuh ${Math.max(0, minUnit - countReady)} unit 100% lagi untuk kuota ${minUnit} unit`
          }</span>
        </div>
        <div class="kpi-card sky">
          <span class="kpi-label">Sudah Ditagihkan / Masuk Batch</span>
          <div class="kpi-value">${countBilled} <small style="font-size:14px;font-weight:600">Unit</small></div>
          <span class="kpi-sub">Tergabung dalam ${batches.length} Batch Pencairan | ${countDenah} Perubahan Denah</span>
        </div>
      </div>

      <!-- RINGKASAN PER KECAMATAN -->
      <div class="grid-2">
        ${kecList.map(k => {
          const pct = k.total > 0 ? Math.round(((k.p50 * 50) + (k.p100 * 100)) / k.total) : 0;
          const w100 = k.total > 0 ? (k.p100 / k.total) * 100 : 0;
          const w50 = k.total > 0 ? (k.p50 / k.total) * 100 : 0;
          return `
            <div class="card" style="margin-bottom:0">
              <div class="card-header">
                <h3>📍 Kecamatan ${escapeHtml(k.kecamatan)} (${k.desaCount} Desa/Kelurahan)</h3>
                <span class="badge badge-100">${k.total} Unit BNBA</span>
              </div>
              <div class="card-body">
                <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px;">
                  <span>Progres Rata-rata Kecamatan: <strong>${pct}%</strong></span>
                  <span>Selesai 100%: <strong>${k.p100} / ${k.total} Unit</strong></span>
                </div>
                <div class="progress-track" style="height:12px;margin-bottom:12px;">
                  <div class="progress-fill-100" style="width:${w100}%"></div>
                  <div class="progress-fill-50" style="width:${w50}%"></div>
                </div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:space-between;align-items:center;">
                  <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <span class="badge badge-0">0%: ${k.p0}</span>
                    <span class="badge badge-50">50%: ${k.p50}</span>
                    <span class="badge badge-100">100%: ${k.p100}</span>
                    <span class="badge badge-billed">Siap Tagih: ${k.ready}</span>
                  </div>
                  <button class="btn btn-outline btn-sm" onclick="window.app.openUnitsByLocation('${escapeHtml(k.kecamatan)}', 'ALL')">
                    Lihat Kecamatan →
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- TABEL MONITORING PROGRES PER DESA / KELURAHAN -->
      <div class="card" style="margin-top:22px;">
        <div class="card-header">
          <div>
            <h3>🏘️ Tabel Pemantauan Progres Pekerjaan Per Desa / Kelurahan</h3>
            <p style="font-size:12px;color:var(--text-muted)">Klik pada tombol Desa untuk melihat daftar KK, upload foto progres, atau mencetak dokumentasi desa</p>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-outline btn-sm" onclick="window.app.switchTab('units')">
              📋 Buka Semua Data BNBA
            </button>
            <button class="btn btn-primary btn-sm" onclick="window.app.switchTab('batches')">
              💰 Buat Pencairan Gelondongan
            </button>
          </div>
        </div>
        <div class="card-body" style="padding:0;">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:45px">No</th>
                  <th>Desa / Kelurahan</th>
                  <th>Kecamatan</th>
                  <th>Kuota Unit</th>
                  <th>Progres 0%</th>
                  <th>Progres 50%</th>
                  <th>Selesai 100%</th>
                  <th>Siap Tagih</th>
                  <th>Sudah Ditagih</th>
                  <th style="width:170px">Bar Progres Fisik</th>
                  <th style="text-align:right">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody>
                ${desaList.map((d, idx) => {
                  const pct = d.total > 0 ? Math.round(((d.p50 * 50) + (d.p100 * 100)) / d.total) : 0;
                  const w100 = d.total > 0 ? (d.p100 / d.total) * 100 : 0;
                  const w50 = d.total > 0 ? (d.p50 / d.total) * 100 : 0;
                  return `
                    <tr>
                      <td>${idx + 1}</td>
                      <td><strong>${escapeHtml(d.desa)}</strong></td>
                      <td>${escapeHtml(d.kecamatan)}</td>
                      <td><strong>${d.total} Unit</strong></td>
                      <td><span class="badge badge-0">${d.p0} Unit</span></td>
                      <td><span class="badge badge-50">${d.p50} Unit</span></td>
                      <td><span class="badge badge-100">${d.p100} Unit</span></td>
                      <td><strong style="color:#16a34a">${d.ready} Unit</strong></td>
                      <td><span class="badge badge-billed">${d.billed} Unit</span></td>
                      <td>
                        <div style="display:flex;align-items:center;gap:8px;">
                          <div class="progress-track" style="flex:1">
                            <div class="progress-fill-100" style="width:${w100}%"></div>
                            <div class="progress-fill-50" style="width:${w50}%"></div>
                          </div>
                          <span style="font-size:12px;font-weight:700;min-width:36px">${pct}%</span>
                        </div>
                      </td>
                      <td style="text-align:right;white-space:nowrap;">
                        <button class="btn btn-outline btn-sm" onclick="window.app.openUnitsByLocation('${escapeHtml(d.kecamatan)}', '${escapeHtml(d.desa)}')">
                          🏠 Lihat KK
                        </button>
                        <button class="btn btn-success btn-sm" title="Set semua unit di Desa ${escapeHtml(d.desa)} selesai 100%" onclick="window.app.setDesaProgress('${escapeHtml(d.kecamatan)}', '${escapeHtml(d.desa)}', 100)">
                          ✓ Set 100%
                        </button>
                        <button class="btn btn-primary btn-sm" title="Cetak Dokumentasi Desa ${escapeHtml(d.desa)}" onclick="window.app.printDesaDokumentasi('${escapeHtml(d.kecamatan)}', '${escapeHtml(d.desa)}')">
                          🖨️
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- REKAPITULASI MULTI-VENDOR -->
      <div class="card">
        <div class="card-header">
          <h3>🏢 Rekapitulasi Perusahaan / Vendor Pelaksana Huntara</h3>
          <button class="btn btn-outline btn-sm" onclick="window.app.switchTab('vendors')">
            ⚙️ Kelola Profil Perusahaan
          </button>
        </div>
        <div class="card-body" style="padding:0;">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nama Perusahaan (Vendor)</th>
                  <th>Direktur</th>
                  <th>Wilayah Kabupaten / Provinsi</th>
                  <th>Total Unit</th>
                  <th>Selesai 100%</th>
                  <th>Siap Ditagihkan</th>
                  <th>Harga Satuan</th>
                  <th>Status Kuota Gelondongan (Min. ${minUnit} Unit)</th>
                  <th style="text-align:right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${state.vendors.map(v => {
                  const vUnits = state.units.filter(u => u.vendorId === v.id);
                  const v100 = vUnits.filter(u => Number(u.progres) === 100).length;
                  const vReady = vUnits.filter(u => Number(u.progres) === 100 && !u.batchId).length;
                  return `
                    <tr>
                      <td><strong>${escapeHtml(v.nama)}</strong></td>
                      <td>${escapeHtml(v.direktur)}</td>
                      <td>${escapeHtml(v.kabupaten)} — ${escapeHtml(v.provinsi)}</td>
                      <td><strong>${vUnits.length} Unit</strong></td>
                      <td><span class="badge badge-100">${v100} Unit</span></td>
                      <td><strong>${vReady} Unit</strong></td>
                      <td>Rp ${formatNumberDot(v.hargaSatuan)}</td>
                      <td>
                        ${
                          vReady >= minUnit
                            ? `<span class="badge badge-100">✅ Siap Cairkan (${vReady} Unit Tersedia)</span>`
                            : `<span class="badge badge-50">⏳ Kurang ${minUnit - vReady} unit 100% lagi</span>`
                        }
                      </td>
                      <td style="text-align:right">
                        <button class="btn btn-outline btn-sm" onclick="window.app.selectVendor('${escapeHtml(v.id)}')">
                          Pilih Aktif
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  /* ========================================================================
     TAB 2: MASTER DATA PERUSAHAAN / MULTI-VENDOR
     ======================================================================== */
  function renderVendorsTab() {
    return `
      <div class="card">
        <div class="card-header">
          <div>
            <h3>🏢 Daftar Perusahaan / Kontraktor Pelaksana Huntara</h3>
            <p style="font-size:12.5px;color:var(--text-muted)">Setiap perusahaan memiliki Kop Surat, Logo, Direktur, Nomor Rekening, dan Harga Satuan masing-masing untuk cetak berkas pencairan.</p>
          </div>
          <button class="btn btn-primary" onclick="window.app.openVendorModal()">
            ➕ Tambah Perusahaan / Vendor Baru
          </button>
        </div>
        <div class="card-body">
          <div class="grid-2">
            ${state.vendors.map(v => {
              const vUnits = state.units.filter(u => u.vendorId === v.id);
              const vBatches = state.batches.filter(b => b.vendorId === v.id);
              return `
                <div class="card" style="margin-bottom:0;border:2px solid ${state.selectedVendorId === v.id ? 'var(--primary)' : '#e2e8f0'}">
                  <div class="card-header">
                    <div style="display:flex;align-items:center;gap:12px;">
                      <img src="${escapeHtml(v.logoUrl || '/assets/logo-emka.svg')}" alt="Logo" style="width:48px;height:48px;object-fit:contain;background:#fff;border:1px solid #cbd5e1;border-radius:6px;padding:3px;" />
                      <div>
                        <h3 style="font-size:16px;">${escapeHtml(v.nama)}</h3>
                        <span style="font-size:12px;color:var(--text-muted)">${escapeHtml(v.subJudul || 'KONTRAKTOR - LEVERANSIR')}</span>
                      </div>
                    </div>
                    ${state.selectedVendorId === v.id ? '<span class="badge badge-billed">Vendor Aktif</span>' : ''}
                  </div>
                  <div class="card-body" style="font-size:13px;">
                    <div style="display:grid;grid-template-columns:135px 1fr;row-gap:6px;margin-bottom:14px;">
                      <span style="color:var(--text-muted)">Nama Direktur:</span>
                      <strong>${escapeHtml(v.direktur)} (${escapeHtml(v.jabatan || 'Direktur')})</strong>
                      <span style="color:var(--text-muted)">Alamat Kantor:</span>
                      <span>${escapeHtml(v.alamat)}</span>
                      <span style="color:var(--text-muted)">Kota Tanda Tangan:</span>
                      <span>${escapeHtml(v.kotaTtd)}</span>
                      <span style="color:var(--text-muted)">Lokasi Proyek:</span>
                      <span>${escapeHtml(v.kabupaten)} - ${escapeHtml(v.provinsi)}</span>
                      <span style="color:var(--text-muted)">Bank & No. Rek:</span>
                      <strong>${escapeHtml(v.namaBank)} — ${escapeHtml(v.noRekening)} (an. ${escapeHtml(v.atasNamaRekening)})</strong>
                      <span style="color:var(--text-muted)">Harga Satuan/Unit:</span>
                      <strong>Rp ${formatNumberDot(v.hargaSatuan)} (PPN ${v.ppnPersen}%, PPh ${v.pphPersen}%)</strong>
                      <span style="color:var(--text-muted)">Kuota & Batch:</span>
                      <span><strong>${vUnits.length} Unit BNBA</strong> | <strong>${vBatches.length} Batch Pencairan</strong></span>
                      <span style="color:var(--text-muted)">Aset Dokumen:</span>
                      <div style="display:flex;gap:6px;flex-wrap:wrap;">
                        <span class="badge ${v.logoUrl ? 'badge-100' : 'badge-0'}">${v.logoUrl ? '✅ Logo' : '⚪ Logo'}</span>
                        <span class="badge ${v.kopSuratUrl ? 'badge-100' : 'badge-0'}">${v.kopSuratUrl ? '✅ Kop Surat' : '⚪ Kop Teks'}</span>
                        <span class="badge ${v.ttdStempelUrl ? 'badge-100' : 'badge-0'}">${v.ttdStempelUrl ? '✅ TT & Cap' : '⚪ TT & Cap'}</span>
                        <span class="badge ${v.spesimenUrl ? 'badge-100' : 'badge-0'}">${v.spesimenUrl ? '✅ Spesimen' : '⚪ Spesimen'}</span>
                      </div>
                    </div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;border-top:1px solid #e2e8f0;padding-top:12px;">
                      <button class="btn btn-outline btn-sm" onclick="window.app.selectVendor('${escapeHtml(v.id)}')">
                        ✓ Jadikan Vendor Aktif
                      </button>
                      <button class="btn btn-outline btn-sm" style="border-color:#2563eb;color:#2563eb;" onclick="window.app.openLogoHeaderModal('${escapeHtml(v.id)}')">
                        🏛️ Logo Pemda (Prov/Kab)
                      </button>
                      <button class="btn btn-primary btn-sm" onclick="window.app.openVendorModal('${escapeHtml(v.id)}')">
                        ✏️ Edit Profil & Kop/Rekening
                      </button>
                      ${state.vendors.length > 1 ? `
                        <button class="btn btn-danger btn-sm" onclick="window.app.deleteVendor('${escapeHtml(v.id)}')">
                          🗑️ Hapus
                        </button>
                      ` : ''}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /* ========================================================================
     TAB 3: DATA BNBA & PEMANTAUAN PROGRES FISIK RUMAH (PER DESA / KK)
     ======================================================================== */
  function renderUnitsTab() {
    const activeUnits = getActiveUnits();
    const kecOptions = [...new Set(activeUnits.map(u => u.kecamatan).filter(Boolean))].sort();
    const desaOptions = [...new Set(
      activeUnits
        .filter(u => state.unitFilter.kecamatan === 'ALL' || u.kecamatan === state.unitFilter.kecamatan)
        .map(u => u.desa)
        .filter(Boolean)
    )].sort();

    const filtered = activeUnits.filter(u => {
      if (state.unitFilter.kecamatan !== 'ALL' && u.kecamatan !== state.unitFilter.kecamatan) return false;
      if (state.unitFilter.desa !== 'ALL' && u.desa !== state.unitFilter.desa) return false;
      if (state.unitFilter.progres !== 'ALL' && String(u.progres) !== String(state.unitFilter.progres)) return false;
      if (state.unitFilter.statusTagihan === 'SIAP_TAGIH' && !(Number(u.progres) === 100 && !u.batchId)) return false;
      if (state.unitFilter.statusTagihan === 'SUDAH_TAGIH' && !u.batchId) return false;
      if (state.unitFilter.statusTagihan === 'BELUM_TAGIH' && u.batchId) return false;
      if (state.unitFilter.search) {
        const q = state.unitFilter.search.toLowerCase();
        const match =
          String(u.nama || '').toLowerCase().includes(q) ||
          String(u.nik || '').toLowerCase().includes(q) ||
          String(u.desa || '').toLowerCase().includes(q) ||
          String(u.rt || '').toLowerCase().includes(q) ||
          String(u.noBnba || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });

    return `
      <div class="card">
        <div class="card-header">
          <div>
            <h3>🏠 Daftar Penerima Huntara (BNBA) & Pemantauan Progres (${filtered.length} dari ${activeUnits.length} Unit)</h3>
            <p style="font-size:12px;color:var(--text-muted)">Klik tombol 0% / 50% / 100% untuk update cepat, atau klik "Detail & Foto" untuk upload dokumentasi foto dan surat perubahan denah</p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-success btn-sm" onclick="window.app.bulkSetFilteredProgress(100)">
              ✓ Set 100% Semua Hasil Filter (${filtered.length} Unit)
            </button>
            <button class="btn btn-warning btn-sm" onclick="window.app.bulkSetFilteredProgress(50)">
              Set 50% Hasil Filter
            </button>
            <button class="btn btn-primary btn-sm" onclick="window.app.openUnitModal()">
              ➕ Tambah Penerima (BNBA)
            </button>
          </div>
        </div>
        <div class="card-body">
          <!-- FILTER BAR -->
          <div class="filter-bar">
            <div class="form-group" style="margin-bottom:0;min-width:150px;">
              <label>Kecamatan</label>
              <select class="form-control" onchange="window.app.setUnitFilter('kecamatan', this.value)">
                <option value="ALL">Semua Kecamatan</option>
                ${kecOptions.map(k => `<option value="${escapeHtml(k)}" ${state.unitFilter.kecamatan === k ? 'selected' : ''}>${escapeHtml(k)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="margin-bottom:0;min-width:165px;">
              <label>Desa / Kelurahan</label>
              <select class="form-control" onchange="window.app.setUnitFilter('desa', this.value)">
                <option value="ALL">Semua Desa/Kelurahan</option>
                ${desaOptions.map(d => `<option value="${escapeHtml(d)}" ${state.unitFilter.desa === d ? 'selected' : ''}>${escapeHtml(d)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="margin-bottom:0;min-width:140px;">
              <label>Progres Fisik</label>
              <select class="form-control" onchange="window.app.setUnitFilter('progres', this.value)">
                <option value="ALL" ${state.unitFilter.progres === 'ALL' ? 'selected' : ''}>Semua Progres</option>
                <option value="0" ${state.unitFilter.progres === '0' ? 'selected' : ''}>Progres 0%</option>
                <option value="50" ${state.unitFilter.progres === '50' ? 'selected' : ''}>Progres 50%</option>
                <option value="100" ${state.unitFilter.progres === '100' ? 'selected' : ''}>Selesai 100%</option>
              </select>
            </div>
            <div class="form-group" style="margin-bottom:0;min-width:160px;">
              <label>Status Penagihan</label>
              <select class="form-control" onchange="window.app.setUnitFilter('statusTagihan', this.value)">
                <option value="ALL" ${state.unitFilter.statusTagihan === 'ALL' ? 'selected' : ''}>Semua Status</option>
                <option value="SIAP_TAGIH" ${state.unitFilter.statusTagihan === 'SIAP_TAGIH' ? 'selected' : ''}>✅ 100% & Siap Ditagihkan</option>
                <option value="SUDAH_TAGIH" ${state.unitFilter.statusTagihan === 'SUDAH_TAGIH' ? 'selected' : ''}>💰 Sudah Masuk Batch Tagihan</option>
                <option value="BELUM_TAGIH" ${state.unitFilter.statusTagihan === 'BELUM_TAGIH' ? 'selected' : ''}>Belum Ditagihkan</option>
              </select>
            </div>
            <div class="form-group" style="margin-bottom:0;flex:1;min-width:200px;">
              <label>Cari Nama / NIK / RT / No. BNBA</label>
              <input type="text" class="form-control" placeholder="Ketik nama warga, NIK, RT, atau desa..." value="${escapeHtml(state.unitFilter.search)}" oninput="window.app.setUnitFilter('search', this.value)" />
            </div>
            <button class="btn btn-outline" onclick="window.app.resetUnitFilter()">Reset</button>
          </div>

          <!-- TABLE BNBA -->
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>No BNBA</th>
                  <th>Insitu Desa</th>
                  <th>Nama Lengkap Penerima & NIK/KK</th>
                  <th>RT</th>
                  <th>Desa / Kelurahan</th>
                  <th>Kecamatan</th>
                  <th>Vendor</th>
                  <th>Ubah Cepat Progres</th>
                  <th>Foto & Denah</th>
                  <th>Status Tagihan</th>
                  <th style="text-align:right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.length === 0 ? `
                  <tr>
                    <td colspan="11" style="text-align:center;padding:28px;color:var(--text-muted)">
                      Tidak ada data penerima yang sesuai dengan filter di atas.
                    </td>
                  </tr>
                ` : filtered.map(u => {
                  const vendor = getVendorById(u.vendorId);
                  const photoCount = [u.foto0, u.foto50, u.foto100_1, u.foto100_2, u.foto100_3].filter(Boolean).length;
                  const batchObj = u.batchId ? state.batches.find(b => b.id === u.batchId) : null;
                  return `
                    <tr>
                      <td><strong>#${u.noBnba}</strong> ${u.tambahan ? '<span title="Data Tambahan (V)" style="color:#16a34a;font-weight:bold">✓</span>' : ''}</td>
                      <td><span class="badge badge-0">No. ${escapeHtml(u.noInsitu || String(u.noBnba).padStart(2, '0'))}</span></td>
                      <td>
                        <strong>${escapeHtml(u.nama)}</strong>
                        ${u.nik ? `<div style="font-size:11.5px;color:var(--text-muted)">NIK/KK: ${escapeHtml(u.nik)}</div>` : `<div style="font-size:11px;color:#94a3b8">NIK belum diisi</div>`}
                      </td>
                      <td>RT ${escapeHtml(u.rt)}</td>
                      <td><strong>${escapeHtml(u.desa)}</strong></td>
                      <td>${escapeHtml(u.kecamatan)}</td>
                      <td><span style="font-size:12px;font-weight:600">${escapeHtml(vendor.nama)}</span></td>
                      <td>
                        <div style="display:inline-flex;gap:4px;">
                          <button class="btn btn-sm ${Number(u.progres) === 0 ? 'btn-danger' : 'btn-outline'}" onclick="window.app.quickSetUnitProgress('${escapeHtml(u.id)}', 0)">0%</button>
                          <button class="btn btn-sm ${Number(u.progres) === 50 ? 'btn-warning' : 'btn-outline'}" onclick="window.app.quickSetUnitProgress('${escapeHtml(u.id)}', 50)">50%</button>
                          <button class="btn btn-sm ${Number(u.progres) === 100 ? 'btn-success' : 'btn-outline'}" onclick="window.app.quickSetUnitProgress('${escapeHtml(u.id)}', 100)">100%</button>
                        </div>
                      </td>
                      <td>
                        <span class="badge ${photoCount >= 5 ? 'badge-100' : photoCount > 0 ? 'badge-50' : 'badge-0'}">📷 ${photoCount}/5 Foto</span>
                        ${u.perubahanDenah ? `<span class="badge badge-denah" title="${escapeHtml(u.alasanPerubahan || 'Perubahan Denah')}">📝 Ubah Denah</span>` : ''}
                      </td>
                      <td>
                        ${
                          batchObj
                            ? `<span class="badge badge-billed" title="${escapeHtml(batchObj.namaBatch)}">💰 ${escapeHtml(batchObj.namaBatch)}</span>`
                            : Number(u.progres) === 100
                              ? `<span class="badge badge-100">✅ Siap Ditagihkan</span>`
                              : `<span class="badge badge-0">Belum Selesai</span>`
                        }
                      </td>
                      <td style="text-align:right;white-space:nowrap;display:flex;gap:4px;justify-content:flex-end;">
                        <button class="btn btn-outline btn-sm" title="Cetak Laporan Dokumentasi Progres 3 Halaman (Model laporan.pdf)" onclick="window.app.printSingleUnit('${escapeHtml(u.id)}')">
                          🖨️ Cetak Laporan
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="window.app.openUnitModal('${escapeHtml(u.id)}')">
                          📷 Detail & Foto
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  /* ========================================================================
     TAB 4: PENCAIRAN GELONDONGAN / BATCH TAGIHAN (MINIMAL 10 UNIT, BEBAS ACAK)
     ======================================================================== */
  function renderBatchesTab() {
    const minUnit = Number(state.settings.minimalUnitTagihan) || 10;
    const bf = state.batchForm;
    if (state.selectedVendorId !== 'ALL' && bf.vendorId !== state.selectedVendorId) {
      bf.vendorId = state.selectedVendorId;
    }
    const vendor = getVendorById(bf.vendorId);

    // Semua unit milik vendor yang belum masuk batch pencairan sebelumnya (semua 10 desa tampil lengkap!)
    const allVendorUnits = state.units.filter(u => u.vendorId === vendor.id);
    const unbilledUnits = allVendorUnits.filter(u => !u.batchId);

    // Daftar semua Kecamatan & semua 10 Desa/Kelurahan milik vendor
    const kecOptions = [...new Set(allVendorUnits.map(u => u.kecamatan).filter(Boolean))].sort();
    const desaOptions = [...new Set(
      allVendorUnits
        .filter(u => bf.filterKecamatan === 'ALL' || u.kecamatan === bf.filterKecamatan)
        .map(u => u.desa)
        .filter(Boolean)
    )];

    const displayedEligible = unbilledUnits.filter(u => {
      if (bf.filterKecamatan !== 'ALL' && u.kecamatan !== bf.filterKecamatan) return false;
      if (bf.filterDesa !== 'ALL' && u.desa !== bf.filterDesa) return false;
      if (bf.searchQuery && bf.searchQuery.trim()) {
        const q = bf.searchQuery.trim().toLowerCase();
        const match =
          String(u.nama || '').toLowerCase().includes(q) ||
          String(u.noBnba || '').toLowerCase().includes(q) ||
          String(u.desa || '').toLowerCase().includes(q) ||
          String(u.rt || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });

    // Pastikan selectedUnitIds hanya berisi unit yang belum pernah ditagihkan
    const unbilledSet = new Set(unbilledUnits.map(u => u.id));
    bf.selectedUnitIds = bf.selectedUnitIds.filter(id => unbilledSet.has(id));

    const selectedUnitsList = unbilledUnits.filter(u => bf.selectedUnitIds.includes(u.id));
    const selectedDesasSummary = [...new Set(selectedUnitsList.map(u => u.desa))].join(', ');
    const selectedCount = bf.selectedUnitIds.length;
    const calc = hitungKeuangan(selectedCount, vendor);
    const isValidCount = selectedCount >= minUnit || (selectedCount > 0 && bf.allowUnderMin);

    const vendorBatches = state.batches.filter(b => state.selectedVendorId === 'ALL' || b.vendorId === state.selectedVendorId);

    return `
      <!-- DAFTAR BATCH PENCAIRAN YANG SUDAH DIBUAT -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3>📑 Daftar Batch Pencairan Gelondongan yang Sudah Diterbitkan (${vendorBatches.length} Batch)</h3>
            <p style="font-size:12px;color:var(--text-muted)">Setiap batch mengunci daftar unit rumah yang ditagihkan agar tidak terjadi penagihan ganda pada gelondongan berikutnya.</p>
          </div>
        </div>
        <div class="card-body" style="padding:0;">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nama Batch / Gelondongan</th>
                  <th>Perusahaan (Vendor)</th>
                  <th>No. Invoice & Tanggal</th>
                  <th>Jumlah Unit</th>
                  <th>Desa Cakupan</th>
                  <th>Nilai Kontrak Bruto</th>
                  <th>Tagihan Bersih (Netto)</th>
                  <th>Status Pencairan</th>
                  <th style="text-align:right">Cetak Berkas & Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${vendorBatches.length === 0 ? `
                  <tr>
                    <td colspan="9" style="text-align:center;padding:24px;color:var(--text-muted)">
                      Belum ada Batch Pencairan yang dibuat. Silakan pilih minimal ${minUnit} unit rumah yang sudah 100% pada formulir di bawah untuk membuat Pencairan Gelondongan.
                    </td>
                  </tr>
                ` : vendorBatches.map(b => {
                  const v = getVendorById(b.vendorId);
                  const bUnits = state.units.filter(u => b.unitIds.includes(u.id));
                  const desas = [...new Set(bUnits.map(u => u.desa))].join(', ');
                  const fin = hitungKeuangan(b.unitIds.length, v);
                  return `
                    <tr>
                      <td><strong>${escapeHtml(b.namaBatch)}</strong></td>
                      <td>${escapeHtml(v.nama)}</td>
                      <td>
                        <div><strong>${escapeHtml(b.noInvoice)}</strong></div>
                        <div style="font-size:11.5px;color:var(--text-muted)">${escapeHtml(b.tglInvoice)}</div>
                      </td>
                      <td><span class="badge badge-100">${b.unitIds.length} Unit</span></td>
                      <td style="max-width:200px;font-size:12px;">${escapeHtml(desas || '-')}</td>
                      <td>Rp ${formatNumberDot(fin.totalBruto)}</td>
                      <td><strong style="color:#16a34a">Rp ${formatNumberDot(fin.netto)}</strong></td>
                      <td>
                        <select class="form-control" style="padding:4px 8px;font-size:12px;font-weight:600;" onchange="window.app.updateBatchStatus('${escapeHtml(b.id)}', this.value)">
                          <option value="DRAFT" ${b.status === 'DRAFT' ? 'selected' : ''}>📝 Draft Berkas</option>
                          <option value="DIAJUKAN" ${b.status === 'DIAJUKAN' ? 'selected' : ''}>📤 Diajukan ke PPK</option>
                          <option value="VERIFIKASI" ${b.status === 'VERIFIKASI' ? 'selected' : ''}>🔍 Verifikasi BNPB</option>
                          <option value="CAIR" ${b.status === 'CAIR' ? 'selected' : ''}>✅ SP2D / Dana Cair</option>
                        </select>
                      </td>
                      <td style="text-align:right;white-space:nowrap;">
                        <button class="btn btn-primary btn-sm" onclick="window.app.openPrintForBatch('${escapeHtml(b.id)}', 'ALL_LETTERS')">
                          🖨️ Cetak Surat & Invoice
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="window.app.openPrintForBatch('${escapeHtml(b.id)}', 'LAPORAN_PROGRES')">
                          📕 Cetak Laporan Progres (${b.unitIds.length} Unit)
                        </button>
                        <button class="btn btn-danger btn-sm" title="Batalkan Batch & Kembalikan Unit ke Siap Tagih" onclick="window.app.deleteBatch('${escapeHtml(b.id)}')">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- FORM BUAT PENCAIRAN GELONDONGAN BARU -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3>➕ Buat Pengajuan Pencairan Gelondongan Baru (Minimal ${minUnit} Unit — Bebas Pilih Acak Lintas Desa)</h3>
            <p style="font-size:12px;color:var(--text-muted)">Bebas pilih acak warga mana saja dari 10 Desa/Kelurahan dengan jumlah berapa pun (bisa 10, 11, 12, 13, 21, 22 unit, dst. minimal ${minUnit} unit).</p>
          </div>
        </div>
        <div class="card-body">
          <div class="grid-2">
            <!-- KOLOM KIRI: INFO SURAT & RINGKASAN KEUANGAN -->
            <div>
              <div class="form-group">
                <label>Perusahaan / Vendor Penagih</label>
                <select class="form-control" onchange="window.app.changeBatchVendor(this.value)">
                  ${state.vendors.map(v => `<option value="${escapeHtml(v.id)}" ${bf.vendorId === v.id ? 'selected' : ''}>${escapeHtml(v.nama)} (Harga: Rp ${formatNumberDot(v.hargaSatuan)}/unit)</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label>Nama Gelondongan / Termin Pencairan</label>
                <input type="text" class="form-control" value="${escapeHtml(bf.namaBatch)}" oninput="window.app.updateBatchField('namaBatch', this.value)" placeholder="Contoh: Pencairan Gelondongan Tahap 1" />
              </div>
              <div class="grid-2" style="gap:12px;">
                <div class="form-group">
                  <label>Nomor Invoice / Kuitansi No</label>
                  <input type="text" class="form-control" value="${escapeHtml(bf.noInvoice)}" oninput="window.app.updateBatchField('noInvoice', this.value)" />
                </div>
                <div class="form-group">
                  <label>Tanggal Invoice</label>
                  <input type="text" class="form-control" value="${escapeHtml(bf.tglInvoice)}" oninput="window.app.updateBatchField('tglInvoice', this.value)" />
                </div>
              </div>
              <div class="grid-2" style="gap:12px;">
                <div class="form-group">
                  <label>Nomor Surat Permohonan (SPP)</label>
                  <input type="text" class="form-control" value="${escapeHtml(bf.noSpp)}" oninput="window.app.updateBatchField('noSpp', this.value)" />
                </div>
                <div class="form-group">
                  <label>Tanggal Surat Permohonan (SPP)</label>
                  <input type="text" class="form-control" value="${escapeHtml(bf.tglSpp)}" oninput="window.app.updateBatchField('tglSpp', this.value)" />
                </div>
              </div>
              <div class="grid-2" style="gap:12px;">
                <div class="form-group">
                  <label>Nomor Surat Selesai 100% (SPS)</label>
                  <input type="text" class="form-control" value="${escapeHtml(bf.noSps)}" oninput="window.app.updateBatchField('noSps', this.value)" />
                </div>
                <div class="form-group">
                  <label>Tanggal Surat Selesai (SPS)</label>
                  <input type="text" class="form-control" value="${escapeHtml(bf.tglSps)}" oninput="window.app.updateBatchField('tglSps', this.value)" />
                </div>
              </div>

              <!-- KOTAK KALKULASI OTOMATIS -->
              <div style="background:#f8fafc;border:2px solid ${isValidCount ? '#16a34a' : '#f59e0b'};border-radius:10px;padding:16px;margin-top:8px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                  <span style="font-weight:700;font-size:14px;">Kalkulasi Tagihan Gelondongan:</span>
                  <span class="badge ${isValidCount ? 'badge-100' : 'badge-50'}">
                    ${selectedCount} Unit Dipilih (${escapeHtml(calc.terbilangQty)} Unit)
                  </span>
                </div>
                ${selectedCount > 0 ? `
                  <div style="font-size:12px;color:#0369a1;background:#e0f2fe;padding:6px 10px;border-radius:6px;margin-bottom:10px;">
                    <strong>📍 Desa Terpilih:</strong> ${escapeHtml(selectedDesasSummary)}<br/>
                    <strong>🔢 No. BNBA Terpilih:</strong> ${selectedUnitsList.map(u => '#' + u.noBnba).join(', ')}
                  </div>
                ` : ''}
                <div style="display:grid;grid-template-columns:1fr auto;row-gap:6px;font-size:13px;">
                  <span>Sub Total (${selectedCount} × Rp ${formatNumberDot(calc.hargaSatuan)}):</span>
                  <strong>Rp ${formatNumberDot(calc.totalBruto)}</strong>
                  <span>Potongan PPn (${calc.ppnPersen}%):</span>
                  <span style="color:#dc2626">- Rp ${formatNumberDot(calc.ppn)}</span>
                  <span>Potongan PPh (${calc.pphPersen}%):</span>
                  <span style="color:#dc2626">- Rp ${formatNumberDot(calc.pph)}</span>
                  <span style="font-weight:700;font-size:14.5px;padding-top:6px;border-top:1px solid #cbd5e1;">Total Tagihan Bersih (Dikurangi PPn & PPh):</span>
                  <strong style="font-size:16px;color:#16a34a;padding-top:6px;border-top:1px solid #cbd5e1;">Rp ${formatNumberDot(calc.netto)}</strong>
                </div>
                <div style="margin-top:10px;font-size:12px;background:#fff;padding:8px 10px;border-radius:6px;border:1px solid #e2e8f0;">
                  <strong>Terbilang Netto:</strong> <em>${escapeHtml(calc.terbilangNetto)}</em>
                </div>

                ${selectedCount < minUnit ? `
                  <div style="margin-top:10px;padding:8px 10px;background:#fef3c7;color:#92400e;border-radius:6px;font-size:12px;">
                    ⚠️ <strong>Aturan Minimal Penagihan:</strong> Minimal penagihan gelondongan adalah <strong>${minUnit} unit</strong> (Saat ini terpilih: ${selectedCount} unit).
                    <label style="display:flex;align-items:center;gap:6px;margin-top:6px;cursor:pointer;font-weight:600;">
                      <input type="checkbox" ${bf.allowUnderMin ? 'checked' : ''} onchange="window.app.toggleAllowUnderMin(this.checked)" />
                      Izinkan kurang dari ${minUnit} unit (Khusus pencairan sisa kuota terakhir)
                    </label>
                  </div>
                ` : ''}

                <button class="btn btn-success btn-lg" style="width:100%;margin-top:14px;" ${!isValidCount ? 'disabled style="opacity:0.5;cursor:not-allowed;width:100%;margin-top:14px;"' : ''} onclick="window.app.createBatch()">
                  💾 Simpan & Terbitkan Berkas Pencairan (${selectedCount} Unit)
                </button>
              </div>
            </div>

            <!-- KOLOM KANAN: PILIH UNIT ACAK LINTAS 10 DESA / KECAMATAN -->
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <label style="font-weight:700;font-size:13.5px;">
                  Pilih Warga Penerima BNBA (${unbilledUnits.length} Unit Belum Ditagihkan di 10 Desa)
                </label>
                <span class="badge badge-100">Tercentang: ${selectedCount} Unit</span>
              </div>

              <!-- FILTER KECAMATAN, SEMUA 10 DESA & PENCARIAN NAMA -->
              <div style="display:grid;grid-template-columns:1fr 1.2fr 1.2fr;gap:8px;margin-bottom:10px;">
                <select class="form-control" style="padding:6px 8px;font-size:12.5px;" onchange="window.app.setBatchKecamatanFilter(this.value)">
                  <option value="ALL">Semua Kecamatan (${unbilledUnits.length})</option>
                  ${kecOptions.map(k => {
                    const cnt = unbilledUnits.filter(u => u.kecamatan === k).length;
                    return `<option value="${escapeHtml(k)}" ${bf.filterKecamatan === k ? 'selected' : ''}>Kec. ${escapeHtml(k)} (${cnt} Unit)</option>`;
                  }).join('')}
                </select>

                <select class="form-control" style="padding:6px 8px;font-size:12.5px;" onchange="window.app.setBatchDesaFilter(this.value)">
                  <option value="ALL">Semua Desa/Kelurahan (${desaOptions.length} Desa)</option>
                  ${desaOptions.map(d => {
                    const cnt = unbilledUnits.filter(u => u.desa === d).length;
                    return `<option value="${escapeHtml(d)}" ${bf.filterDesa === d ? 'selected' : ''}>${escapeHtml(d)} (${cnt} Unit)</option>`;
                  }).join('')}
                </select>

                <input type="text" class="form-control" style="padding:6px 8px;font-size:12.5px;" placeholder="🔍 Cari nama / No BNBA / RT..." value="${escapeHtml(bf.searchQuery || '')}" oninput="window.app.setBatchSearchQuery(this.value)" />
              </div>

              <!-- PILIH JUMLAH BEBAS (11, 12, 13, 21, 22, DST) ATAU KETIK NOMOR BNBA ACAK -->
              <div style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;padding:10px;margin-bottom:10px;display:flex;flex-direction:column;gap:8px;">
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                  <span style="font-size:12px;font-weight:600;">Jumlah Unit Bebas:</span>
                  <input type="number" min="1" max="${unbilledUnits.length}" class="form-control" style="width:72px;padding:4px 8px;font-size:12.5px;font-weight:bold;" value="${bf.customPickCount || 12}" oninput="window.app.updateBatchField('customPickCount', Number(this.value))" />
                  <button class="btn btn-primary btn-sm" onclick="window.app.selectBatchRandomCount()">
                    🎲 Pilih Acak (${bf.customPickCount || 12} Unit)
                  </button>
                  <button class="btn btn-outline btn-sm" onclick="window.app.selectBatchUnitsCount(Number(document.querySelector('[oninput*=customPickCount]')?.value || 12))">
                    ✓ Pilih ${bf.customPickCount || 12} Unit
                  </button>
                  <button class="btn btn-outline btn-sm" onclick="window.app.addAllDisplayedToBatch()">
                    + Centang Semua Desa Ini (${displayedEligible.length})
                  </button>
                  <button class="btn btn-danger btn-sm" style="margin-left:auto;" onclick="window.app.selectBatchUnitsCount(0)">
                    Reset (0)
                  </button>
                </div>
                <div style="display:flex;align-items:center;gap:6px;">
                  <input type="text" id="randomBnbaInput" class="form-control" style="flex:1;padding:4px 8px;font-size:12px;" value="${escapeHtml(bf.randomNumbersText || '')}" oninput="window.app.updateBatchField('randomNumbersText', this.value)" placeholder="Atau ketik No. BNBA acak (Contoh: 1, 4, 9, 12, 15, 21, 22, 31, 38, 45, 52, 57)" />
                  <button class="btn btn-outline btn-sm" onclick="window.app.selectByBnbaNumbers()">
                    Pilih No. BNBA Ini
                  </button>
                </div>
              </div>

              <!-- TABEL DAFTAR WARGA UNTUK DICENTANG ACAK -->
              <div style="border:1px solid #cbd5e1;border-radius:8px;max-height:430px;overflow-y:auto;background:#fff;">
                ${displayedEligible.length === 0 ? `
                  <div style="padding:32px 20px;text-align:center;color:var(--text-muted);">
                    Tidak ada unit yang sesuai dengan pencarian/filter di atas.
                  </div>
                ` : `
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th style="width:40px">Pilih</th>
                        <th style="width:70px">No BNBA</th>
                        <th>Nama Penerima</th>
                        <th>RT / Desa / Kelurahan</th>
                        <th>Kecamatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${displayedEligible.map(u => {
                        const checked = bf.selectedUnitIds.includes(u.id);
                        return `
                          <tr style="cursor:pointer;background:${checked ? '#dcfce7' : 'transparent'}" onclick="window.app.toggleBatchUnit('${escapeHtml(u.id)}')">
                            <td>
                              <input type="checkbox" style="width:16px;height:16px;cursor:pointer;" ${checked ? 'checked' : ''} onclick="event.stopPropagation(); window.app.toggleBatchUnit('${escapeHtml(u.id)}')" />
                            </td>
                            <td><strong>#${u.noBnba}</strong></td>
                            <td><strong>${escapeHtml(u.nama)}</strong></td>
                            <td>RT ${escapeHtml(u.rt)} — <strong>${escapeHtml(u.desa)}</strong></td>
                            <td>${escapeHtml(u.kecamatan)}</td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                `}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* ========================================================================
     TAB 5: PUSAT CETAK BERKAS PENCAIRAN & DOKUMENTASI FOTO (PERSIS PDF BNPB)
     ======================================================================== */
  function renderPrintTab() {
    const pc = state.printConfig;
    if (state.selectedVendorId !== 'ALL' && pc.vendorId !== state.selectedVendorId) {
      pc.vendorId = state.selectedVendorId;
    }
    if (pc.mode === 'BATCH' && !pc.batchId && state.batches.length > 0) {
      pc.batchId = state.batches[0].id;
    }

    // Determine target vendor, units, and document metadata
    let vendor = getVendorById(pc.vendorId);
    let targetUnits = [];
    const todayStr = getTodayIndonesian();
    const seqNum = state.batches.filter(b => b.vendorId === vendor.id).length + 1;
    const autoKuitansi = generateAutoKuitansiNo(vendor, seqNum);
    const code = vendor.kodeSurat || 'EMKA';

    let meta = {
      noInvoice: pc.overrideNoInvoice || autoKuitansi,
      tglInvoice: pc.overrideTanggal || todayStr,
      noSpp: pc.overrideNoSpp || `${String(seqNum).padStart(3, '0')}/${code}/XI/2026`,
      tglSpp: pc.overrideTanggal || todayStr,
      noSps: pc.overrideNoSps || `${String(seqNum).padStart(2, '0')}/${code}/SPS/XI/2026`,
      tglSps: pc.overrideTanggal || todayStr,
      tglCoverDokumentasi: pc.overrideTanggal || todayStr,
      lokasiLabel: ''
    };

    if (pc.mode === 'BATCH' && pc.batchId) {
      const batch = state.batches.find(b => b.id === pc.batchId);
      if (batch) {
        vendor = getVendorById(batch.vendorId);
        targetUnits = state.units.filter(u => batch.unitIds.includes(u.id));
        const batchSeq = state.batches.findIndex(b => b.id === batch.id) + 1;
        const batchKuitansi = batch.noInvoice && !batch.noInvoice.includes('/')
          ? batch.noInvoice
          : generateAutoKuitansiNo(vendor, batchSeq > 0 ? batchSeq : 1);
        meta.noInvoice = pc.overrideNoInvoice || batchKuitansi;
        meta.tglInvoice = pc.overrideTanggal || batch.tglInvoice || todayStr;
        meta.noSpp = pc.overrideNoSpp || batch.noSpp || meta.noSpp;
        meta.tglSpp = pc.overrideTanggal || batch.tglSpp || todayStr;
        meta.noSps = pc.overrideNoSps || batch.noSps || meta.noSps;
        meta.tglSps = pc.overrideTanggal || batch.tglSps || todayStr;
        meta.tglCoverDokumentasi = pc.overrideTanggal || batch.tglCoverDokumentasi || batch.tglInvoice || todayStr;
      }
    } else {
      targetUnits = state.units.filter(u => {
        if (pc.singleUnitId) return u.id === pc.singleUnitId;
        if (u.vendorId !== vendor.id) return false;
        if (pc.kecamatan !== 'ALL' && u.kecamatan !== pc.kecamatan) return false;
        if (pc.desa !== 'ALL' && u.desa !== pc.desa) return false;
        return true;
      });
    }

    const vendorUnitsAll = state.units.filter(u => u.vendorId === vendor.id);
    const kecList = [...new Set(vendorUnitsAll.map(u => u.kecamatan).filter(Boolean))].sort();
    const desaList = [...new Set(
      vendorUnitsAll
        .filter(u => pc.kecamatan === 'ALL' || u.kecamatan === pc.kecamatan)
        .map(u => u.desa)
        .filter(Boolean)
    )].sort();

    const qty = (pc.mode === 'BATCH' && !pc.batchId)
      ? (Number(pc.customQty) || 20)
      : (targetUnits.length > 0 ? targetUnits.length : (Number(pc.customQty) || 20));
    const fin = hitungKeuangan(qty, vendor);

    // Build dynamic location description from targetUnits
    const uniqueDesas = [...new Set(targetUnits.map(u => u.desa).filter(Boolean))];
    const uniqueKecs = [...new Set(targetUnits.map(u => u.kecamatan).filter(Boolean))];
    const desaStr = uniqueDesas.length === 1
      ? `Desa/Kel. ${uniqueDesas[0]}`
      : uniqueDesas.length > 1
        ? `Desa/Kel. ${uniqueDesas.join(', ')}`
        : (pc.desa !== 'ALL' ? `Desa/Kel. ${pc.desa}` : 'Desa/Kel. Marapokot, Mbay I');
    const kecStr = uniqueKecs.length >= 1
      ? `Kecamatan ${uniqueKecs.join(' & ')}`
      : (pc.kecamatan !== 'ALL' ? `Kecamatan ${pc.kecamatan}` : 'Kecamatan Aesesa');

    const kabTitle = toTitleCase(vendor.kabupaten || 'Kabupaten Nagekeo');
    const provTitle = toTitleCase(vendor.provinsi || 'Provinsi Nusa Tenggara Timur');
    const autoLokasiStr = `${toTitleCase(desaStr)}, ${toTitleCase(kecStr)}, ${kabTitle}, ${provTitle}`;
    const fullLokasiStr = toTitleCase(pc.overrideDeskripsiLokasi.trim()) || autoLokasiStr;

    // Render selected sheets
    let sheetsHtml = '';
    if (pc.docType === 'ALL_LETTERS') {
      sheetsHtml =
        renderSheetInvoice(vendor, fin, meta, fullLokasiStr, desaStr, kecStr) +
        renderSheetSPP(vendor, fin, meta, fullLokasiStr) +
        renderSheetSPS(vendor, fin, meta, fullLokasiStr) +
        renderSheetBnbaList(vendor, targetUnits, meta, fullLokasiStr);
    } else if (pc.docType === 'INVOICE') {
      sheetsHtml = renderSheetInvoice(vendor, fin, meta, fullLokasiStr, desaStr, kecStr);
    } else if (pc.docType === 'SPP') {
      sheetsHtml = renderSheetSPP(vendor, fin, meta, fullLokasiStr);
    } else if (pc.docType === 'SPS') {
      sheetsHtml = renderSheetSPS(vendor, fin, meta, fullLokasiStr);
    } else if (pc.docType === 'BNBA_LIST') {
      sheetsHtml = renderSheetBnbaList(vendor, targetUnits, meta, fullLokasiStr);
    } else if (pc.docType === 'LAPORAN_PROGRES' || pc.docType === 'DOKUMENTASI') {
      sheetsHtml = renderSheetsLaporanProgres(vendor, targetUnits, meta, desaStr, kecStr);
    } else if (pc.docType === 'FULL_PACKAGE') {
      sheetsHtml =
        renderSheetInvoice(vendor, fin, meta, fullLokasiStr, desaStr, kecStr) +
        renderSheetSPP(vendor, fin, meta, fullLokasiStr) +
        renderSheetSPS(vendor, fin, meta, fullLokasiStr) +
        renderSheetBnbaList(vendor, targetUnits, meta, fullLokasiStr) +
        renderSheetsLaporanProgres(vendor, targetUnits, meta, desaStr, kecStr);
    }

    return `
      <!-- TOOLBAR PENGATURAN CETAK & KALKULASI OTOMATIS (NO-PRINT) -->
      <div class="card no-print">
        <div class="card-header">
          <div>
            <h3>🖨️ Pengaturan Cetak & Hitung Otomatis Invoice, SPP, SPS & Dokumentasi</h3>
            <p style="font-size:12px;color:var(--text-muted)">Semua Nomor, Tanggal, Deskripsi Lokasi, Sub Total, Potongan PPn, PPh, Total Tagihan Bersih & Terbilang dihitung otomatis.</p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-outline btn-lg" style="background:#fff;border-color:#2563eb;color:#2563eb;font-weight:600;" onclick="window.app.openLogoHeaderModal('${escapeHtml(vendor.id)}')">
              🏛️ Upload Logo Pemda (Prov/Kab)
            </button>
            <button class="btn btn-warning btn-lg" onclick="window.app.openRabModal()">
              ⚙️ Atur Item RAB & Bobot SPK
            </button>
            <button class="btn btn-primary btn-lg" onclick="window.print()">
              🖨️ Cetak / Simpan PDF Sekarang (Ukuran A4)
            </button>
          </div>
        </div>
        <div class="card-body">
          ${pc.singleUnitId ? `
            <div style="margin-bottom:12px;background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:8px 14px;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#92400e;">
              <span>🔍 <strong>Mode Cetak Khusus 1 Unit:</strong> Menampilkan laporan progres fisik unit <strong>${escapeHtml(targetUnits[0]?.nama || '')}</strong> (Desa ${escapeHtml(targetUnits[0]?.desa || '')} RT ${escapeHtml(targetUnits[0]?.rt || '')})</span>
              <button class="btn btn-sm btn-outline" style="background:#fff;" onclick="window.app.resetSingleUnitPrint()">Lihat Semua Unit di Desa Ini</button>
            </div>
          ` : ''}
          <!-- BARIS 1: PILIH SUMBER DATA & JENIS DOKUMEN -->
          <div class="filter-bar" style="margin-bottom:12px;">
            <div class="form-group" style="margin-bottom:0;min-width:210px;">
              <label>Sumber Data Cetak</label>
              <select class="form-control" onchange="window.app.setPrintConfig('mode', this.value)">
                <option value="BATCH" ${pc.mode === 'BATCH' ? 'selected' : ''}>📦 Dari Batch Pencairan Gelondongan</option>
                <option value="DESA" ${pc.mode === 'DESA' ? 'selected' : ''}>🏘️ Filter Per Desa / Kecamatan / Vendor</option>
              </select>
            </div>

            ${pc.mode === 'BATCH' ? `
              <div class="form-group" style="margin-bottom:0;min-width:240px;flex:1;">
                <label>Pilih Batch Pencairan Gelondongan</label>
                <select class="form-control" onchange="window.app.setPrintConfig('batchId', this.value)">
                  ${state.batches.length === 0 ? `<option value="">-- Mode Simulasi Cepat (${qty} Unit) --</option>` : ''}
                  ${state.batches.map(b => {
                    const bv = getVendorById(b.vendorId);
                    return `<option value="${escapeHtml(b.id)}" ${pc.batchId === b.id ? 'selected' : ''}>${escapeHtml(b.namaBatch)} — ${escapeHtml(bv.nama)} (${b.unitIds.length} Unit)</option>`;
                  }).join('')}
                </select>
              </div>
              ${state.batches.length === 0 ? `
                <div class="form-group" style="margin-bottom:0;width:120px;">
                  <label>Jumlah Unit (Qty)</label>
                  <input type="number" min="1" class="form-control" value="${qty}" oninput="window.app.setPrintConfig('customQty', Number(this.value))" />
                </div>
              ` : ''}
            ` : `
              <div class="form-group" style="margin-bottom:0;min-width:185px;">
                <label>Perusahaan / Vendor</label>
                <select class="form-control" onchange="window.app.setPrintConfig('vendorId', this.value)">
                  ${state.vendors.map(v => `<option value="${escapeHtml(v.id)}" ${pc.vendorId === v.id ? 'selected' : ''}>${escapeHtml(v.nama)}</option>`).join('')}
                </select>
              </div>
              <div class="form-group" style="margin-bottom:0;min-width:145px;">
                <label>Kecamatan</label>
                <select class="form-control" onchange="window.app.setPrintConfig('kecamatan', this.value)">
                  <option value="ALL">Semua Kecamatan</option>
                  ${kecList.map(k => `<option value="${escapeHtml(k)}" ${pc.kecamatan === k ? 'selected' : ''}>${escapeHtml(k)}</option>`).join('')}
                </select>
              </div>
              <div class="form-group" style="margin-bottom:0;min-width:155px;">
                <label>Desa / Kelurahan</label>
                <select class="form-control" onchange="window.app.setPrintConfig('desa', this.value)">
                  <option value="ALL">Semua Desa</option>
                  ${desaList.map(d => `<option value="${escapeHtml(d)}" ${pc.desa === d ? 'selected' : ''}>${escapeHtml(d)}</option>`).join('')}
                </select>
              </div>
            `}

            <div class="form-group" style="margin-bottom:0;min-width:280px;">
              <label>Jenis Dokumen yang Ditampilkan</label>
              <select class="form-control" onchange="window.app.setPrintConfig('docType', this.value)">
                <option value="DOKUMENTASI" ${pc.docType === 'DOKUMENTASI' || pc.docType === 'LAPORAN_PROGRES' ? 'selected' : ''}>📸 Buku Laporan Dokumentasi Progres Fisik (Model Resmi laporan.pdf)</option>
                <option value="ALL_LETTERS" ${pc.docType === 'ALL_LETTERS' ? 'selected' : ''}>📑 Paket Berkas Surat Pencairan (Invoice + SPP + SPS + Rekap BNBA)</option>
                <option value="INVOICE" ${pc.docType === 'INVOICE' ? 'selected' : ''}>1. Invoice Tagihan (Format CV. EM KA UTAMA)</option>
                <option value="SPP" ${pc.docType === 'SPP' ? 'selected' : ''}>2. Surat Permohonan Pembayaran (SPP)</option>
                <option value="SPS" ${pc.docType === 'SPS' ? 'selected' : ''}>3. Surat Pemberitahuan Selesai 100% (SPS)</option>
                <option value="BNBA_LIST" ${pc.docType === 'BNBA_LIST' ? 'selected' : ''}>4. Lampiran Rekap Daftar BNBA</option>
                <option value="FULL_PACKAGE" ${pc.docType === 'FULL_PACKAGE' ? 'selected' : ''}>📚 Bundel Super Lengkap (Semua Surat + Laporan Dokumentasi Foto)</option>
              </select>
            </div>
          </div>

          <!-- BARIS 2: PANEL PARAMETER OTOMATIS INVOICE, PAJAK & NOMOR SURAT -->
          <div class="filter-bar" style="margin-bottom:0;background:#eff6ff;border-color:#bfdbfe;">
            <div class="form-group" style="margin-bottom:0;width:155px;">
              <label>TanggaL Invoice/Surat</label>
              <input type="text" class="form-control" value="${escapeHtml(meta.tglInvoice)}" oninput="window.app.setPrintConfig('overrideTanggal', this.value)" />
            </div>
            <div class="form-group" style="margin-bottom:0;width:155px;">
              <label>Kuitansi No (Otomatis)</label>
              <input type="text" class="form-control" value="${escapeHtml(meta.noInvoice)}" oninput="window.app.setPrintConfig('overrideNoInvoice', this.value)" />
            </div>
            <div class="form-group" style="margin-bottom:0;width:155px;">
              <label>Harga/Unit (Rp)</label>
              <input type="number" class="form-control" value="${vendor.hargaSatuan}" onchange="window.app.quickUpdateVendorRate('${escapeHtml(vendor.id)}', 'hargaSatuan', Number(this.value))" />
            </div>
            <div class="form-group" style="margin-bottom:0;width:85px;">
              <label>PPn (%)</label>
              <input type="number" step="0.01" class="form-control" value="${vendor.ppnPersen}" onchange="window.app.quickUpdateVendorRate('${escapeHtml(vendor.id)}', 'ppnPersen', Number(this.value))" />
            </div>
            <div class="form-group" style="margin-bottom:0;width:85px;">
              <label>PPh (%)</label>
              <input type="number" step="0.01" class="form-control" value="${vendor.pphPersen}" onchange="window.app.quickUpdateVendorRate('${escapeHtml(vendor.id)}', 'pphPersen', Number(this.value))" />
            </div>
            <div class="form-group" style="margin-bottom:0;width:185px;">
              <label>Basis Hitung Potongan Pajak</label>
              <select class="form-control" onchange="window.app.setPrintConfig('taxMode', this.value)">
                <option value="DPP" ${pc.taxMode === 'DPP' ? 'selected' : ''}>Dari DPP (100/111 × SubTotal)</option>
                <option value="DIRECT" ${pc.taxMode === 'DIRECT' ? 'selected' : ''}>Langsung (% × SubTotal)</option>
              </select>
            </div>
            <div class="form-group" style="margin-bottom:0;flex:1;min-width:220px;">
              <label>Deskripsi Lokasi (Otomatis sesuai Desa/Kecamatan)</label>
              <input type="text" class="form-control" value="${escapeHtml(fullLokasiStr)}" oninput="window.app.setPrintConfig('overrideDeskripsiLokasi', this.value)" />
            </div>
          </div>

          <!-- RINGKASAN HITUNGAN OTOMATIS -->
          <div style="margin-top:10px;padding:10px 14px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;font-size:12.5px;">
            <div>
              <strong>Sub Total (${fin.qty} Unit):</strong> Rp ${formatNumber(fin.totalBruto)} &nbsp;|&nbsp;
              <span style="color:#dc2626"><strong>Potongan PPn (${fin.ppnPersen}%):</strong> - Rp ${formatNumber(fin.ppn)}</span> &nbsp;|&nbsp;
              <span style="color:#dc2626"><strong>Potongan PPh (${fin.pphPersen}%):</strong> - Rp ${formatNumber(fin.pph)}</span>
            </div>
            <div style="font-size:14px;">
              <strong>Total Tagihan Bersih (Dikurangi PPn & PPh): <span style="color:#15803d">Rp ${formatNumber(fin.netto)}</span></strong>
            </div>
          </div>
        </div>
      </div>

      <!-- PREVIEW LEMBAR A4 -->
      <div class="print-preview-container">
        ${sheetsHtml}
      </div>
    `;
  }

  /* ========================================================================
     TEMPLATE LEMBAR A4 #1: INVOICE (PERSIS FILE PDF INVOICE HUNTARA CV. EM KA UTAMA)
     ======================================================================== */
  function renderSheetInvoice(vendor, fin, meta, fullLokasiStr, desaStr, kecStr) {
    const kuitansiNo = meta.noInvoice || generateAutoKuitansiNo(vendor, 1);

    const addrParts = String(vendor.alamat || 'Kel. Mauponggo,Kec.Mauponggo, Kab. Nagekeo Prov. NTT').split(',');
    const addrLine1 = addrParts.length >= 2 ? `${addrParts[0].trim()},${addrParts[1].trim()},` : vendor.alamat;
    const addrLine2 = addrParts.length >= 3 ? addrParts.slice(2).join(',').trim() : 'Kab. Nagekeo Prov. NTT';
    const telpVendor = vendor.telepon || '0812 - 3982 - 0000';

    const pphLabel = String(fin.pphPersen).replace('.', ',');

    // Format deskripsi bertingkat persis seperti INVOICE HUNTARA.pdf (Title Case - huruf depan besar)
    const customDesc = state.printConfig.overrideDeskripsiLokasi?.trim();
    const formattedDesa = toTitleCase(desaStr || 'Desa/Kel. Marapokot, Mbay I');
    const formattedKec = toTitleCase(kecStr || 'Kecamatan Aesesa');
    const formattedKab = toTitleCase(vendor.kabupaten || 'Kabupaten Nagekeo');
    const formattedProv = toTitleCase(vendor.provinsi || 'Provinsi Nusa Tenggara Timur');

    const lokasiLinesHtml = customDesc
      ? `Di ${escapeHtml(toTitleCase(customDesc))}`
      : `Di ${escapeHtml(formattedDesa)}<br/>${escapeHtml(formattedKec)}<br/>${escapeHtml(formattedKab)}<br/>${escapeHtml(formattedProv)}`;

    return `
      <div class="print-sheet invoice-emka">
        <!-- HEADER KOTAK ATAS (LOGO + PROFIL CV | INVOICE + TANGGAL + KUITANSI NO) -->
        <div class="emka-top-box">
          <div class="emka-top-left">
            <img src="${escapeHtml(vendor.logoUrl || '/assets/logo-emka-real_0.png')}" alt="Logo CV" />
            <div class="emka-top-left-text">
              <div>${escapeHtml(vendor.nama)}</div>
              <div>${escapeHtml(addrLine1)}</div>
              <div>${escapeHtml(addrLine2)}</div>
              <div>${escapeHtml(telpVendor)}</div>
            </div>
          </div>
          <div class="emka-top-right">
            <div class="emka-invoice-banner">INVOICE</div>
            <div class="emka-invoice-meta">
              <table style="border-collapse:collapse;width:100%;">
                <tr>
                  <td style="width:82px;padding:1px 0;">TanggaL</td>
                  <td style="padding:1px 0;">: ${escapeHtml(meta.tglInvoice)}</td>
                </tr>
                <tr>
                  <td style="padding:1px 0;">Kuitansi No</td>
                  <td style="padding:1px 0;">: ${escapeHtml(kuitansiNo)}</td>
                </tr>
              </table>
            </div>
          </div>
        </div>

        <!-- INFORMASI PEMBERI TUGAS -->
        <div class="emka-info-section">
          <div class="emka-black-bar">INFORMASI PEMBERI TUGAS</div>
          <div class="emka-info-block">
            Kepada Yth<br/>
            Bapak Kepala Badan Nasional Penanggulangan Bencana<br/>
            Cq. Pejabat Pembuat Komitmen<br/>
            Dana Siap Pakai Pembangunan Hunian Sementara, DTH, Infrastruktur<br/>
            Darurat Dan Operasi Pendukung Percepatan Penanganan Darurat Bencana Di<br/>
            Provinsi Nusa Tenggara Timur
          </div>
          <div class="emka-info-block" style="padding-bottom:12px;">
            Alamat<br/>
            Jl. Rw. Jaya Jl. Pramuka No.38 11, RT.11/RW.5, Utan Kayu Utara, Kec.<br/>
            Matraman, Kota Jakarta Timur, Daerah Khusus Ibukota Jakarta 13120
          </div>
          <div class="emka-info-block" style="display:flex;">
            <div style="width:62%;">
              No. Telp<br/>
              -
            </div>
            <div style="width:38%;">
              E-mail<br/>
              &nbsp;
            </div>
          </div>
        </div>

        <!-- TABEL RINCIAN TAGIHAN HITAM-PUTIH -->
        <table class="emka-item-table">
          <thead>
            <tr>
              <th style="width:42px;">No.</th>
              <th>Keterangan</th>
              <th style="width:52px;">Unit</th>
              <th style="width:48px;">Qty</th>
              <th style="width:132px;">Harga/ Unit</th>
              <th style="width:142px;">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align:center;">1.</td>
              <td style="padding-right:10px;">
                Tagihan Untuk<br/>
                Pekerjaan<br/>
                Pembangunan Hunian<br/>
                Sementara (Huntara)<br/>
                ${lokasiLinesHtml}
              </td>
              <td style="text-align:center;">Unit</td>
              <td style="text-align:center;">${fin.qty}</td>
              <td>
                <div class="rp-cell"><span>Rp</span><span>${formatNumber(fin.hargaSatuan)}</span></div>
              </td>
              <td>
                <div class="rp-cell"><span>Rp</span><span>${formatNumber(fin.totalBruto)}</span></div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- CATATAN REKENING (KIRI) & SUB TOTAL / PAJAK / TOTAL BERSIH (KANAN) -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:14px;">
          <div style="width:45%;font-size:8.4pt;line-height:1.35;display:flex;gap:10px;">
            <span style="white-space:nowrap;">Catatan</span>
            <span>:</span>
            <div style="text-align:justify;flex:1;">
              Pembayaran dapat dilakukan melalui ${escapeHtml(vendor.namaBank)} Nomor Rekening ${escapeHtml(vendor.noRekening)} Nama Rekening ${escapeHtml(vendor.atasNamaRekening || vendor.nama)}
            </div>
          </div>

          <div style="width:49%;">
            <table class="emka-summary-table">
              <tbody>
                <tr>
                  <td style="width:50%;">Sub Total</td>
                  <td>
                    <div class="rp-cell"><span>Rp</span><span>${formatNumber(fin.totalBruto)}</span></div>
                  </td>
                </tr>
                <tr>
                  <td>PPn (${fin.ppnPersen}%)</td>
                  <td>
                    <div class="rp-cell"><span>Rp</span><span>${formatNumber(fin.ppn)}</span></div>
                  </td>
                </tr>
                <tr>
                  <td>PPh (${pphLabel}%)</td>
                  <td>
                    <div class="rp-cell"><span>Rp</span><span>${formatNumber(fin.pph)}</span></div>
                  </td>
                </tr>
                <tr style="font-weight:bold;">
                  <td>Total</td>
                  <td>
                    <div class="rp-cell"><span>Rp</span><span>${formatNumber(fin.netto)}</span></div>
                  </td>
                </tr>
                <tr class="no-bottom-border" style="font-weight:bold;">
                  <td>Dibulatkan</td>
                  <td>
                    <div class="rp-cell"><span>Rp</span><span>${formatNumber(fin.dibulatkan)}</span></div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- BAR HITAM TERBILANG (OTOMATIS DARI TOTAL TAGIHAN SETELAH DIKURANGI PPN & PPH) -->
        <div class="emka-terbilang-bar">
          <div style="width:108px;flex-shrink:0;">Terbilang</div>
          <div style="width:16px;flex-shrink:0;">:</div>
          <div style="flex:1;">${escapeHtml(fin.terbilangNetto)}</div>
        </div>

        <!-- TANDA TANGAN DIREKTUR -->
        <div style="margin-top:24px;margin-left:55%;font-family:Calibri, Arial, sans-serif;font-size:10.5pt;line-height:1.35;">
          <div style="font-weight:bold;">${escapeHtml(vendor.nama)}</div>
          ${renderVendorTtdHtml(vendor, 'left')}
          ${renderDirectorNameAndRoleHtml(vendor)}
        </div>
      </div>
    `;
  }

  /* ========================================================================
     TEMPLATE LEMBAR A4 #2: SURAT PERMOHONAN PEMBAYARAN (SPP)
     ======================================================================== */
  function renderSheetSPP(vendor, fin, meta, fullLokasiStr) {
    return `
      <div class="print-sheet">
        ${renderVendorKopHtml(vendor)}

        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
          <table style="border-collapse:collapse;font-size:11pt;">
            <tr>
              <td style="width:85px;">Nomor</td>
              <td>: ${escapeHtml(meta.noSpp)}</td>
            </tr>
            <tr>
              <td>Lampiran</td>
              <td>: 1 (satu) berkas</td>
            </tr>
            <tr>
              <td>Perihal</td>
              <td>: Permohonan Pembayaran</td>
            </tr>
          </table>
          <div style="font-size:11pt;">
            ${escapeHtml(vendor.kotaTtd)}, ${escapeHtml(meta.tglSpp)}
          </div>
        </div>

        <div style="margin-bottom:16px;font-size:11pt;">
          Kepada Yth :<br/>
          Kepala Badan Nasional Penanggulangan Bencana<br/>
          di-<br/>
          &nbsp;&nbsp;&nbsp;&nbsp;Tempat
        </div>

        <div style="margin-bottom:10px;font-size:11pt;text-align:justify;line-height:1.55;">
          Dengan hormat,<br/>
          Sehubungan dengan pelaksanaan Pembangunan Hunian Sementara (Huntara) di ${escapeHtml(toTitleCase(fullLokasiStr))} yang dilaksanakan oleh ${escapeHtml(vendor.nama)}, dengan ini kami mengajukan Permohonan Pembayaran dengan Nilai Kontrak ${escapeHtml(fin.terbilangQty)} (${fin.qty}) Unit Huntara Rp. ${formatNumberDot(fin.totalBruto)},- ( ${escapeHtml(fin.terbilangBruto)} ).
        </div>

        <div style="margin-bottom:6px;font-size:11pt;">Dengan rincian sebagai berikut:</div>

        <table class="spp-table">
          <thead>
            <tr>
              <th style="width:40px;">No.</th>
              <th>Nama Barang</th>
              <th style="width:70px;">Jumlah</th>
              <th style="width:65px;">Satuan</th>
              <th style="width:125px;">Harga Satuan</th>
              <th style="width:135px;">Total Biaya</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align:center;">1.</td>
              <td>PEMBANGUNAN<br/>HUNIAN SEMENTARA<br/>(HUNTARA)</td>
              <td style="text-align:center;">${fin.qty}</td>
              <td style="text-align:center;">Unit</td>
              <td style="text-align:right;">${formatNumberDot(fin.hargaSatuan)},00</td>
              <td style="text-align:right;">${formatNumberDot(fin.totalBruto)}</td>
            </tr>
            <tr>
              <td colspan="5" style="text-align:right;font-weight:bold;">PPN ${fin.ppnPersen}%</td>
              <td style="text-align:right;">${formatNumberDot(fin.ppn)}</td>
            </tr>
            <tr>
              <td colspan="5" style="text-align:right;font-weight:bold;">PPH ${String(fin.pphPersen).replace('.', ',')}%</td>
              <td style="text-align:right;">${formatNumberDot(fin.pph)}</td>
            </tr>
            <tr>
              <td colspan="5" style="text-align:right;font-weight:bold;">Total</td>
              <td style="text-align:right;font-weight:bold;">${formatNumberDot(fin.netto)}</td>
            </tr>
            <tr>
              <td colspan="2" style="text-align:center;font-weight:bold;">Terbilang :</td>
              <td colspan="4" style="font-size:10pt;">${escapeHtml(fin.terbilangNetto)}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top:12px;font-size:11pt;">
          Demikian permohonan ini kami sampaikan, atas perhatian dan kerja samanya kami ucapkan terimakasih.
        </div>

        <div style="margin-top:28px;display:flex;justify-content:flex-end;">
          <div style="width:260px;text-align:center;font-size:11pt;">
            <div>Hormat Kami</div>
            <div style="font-weight:bold;">${escapeHtml(vendor.nama)}</div>
            ${renderVendorTtdHtml(vendor, 'center')}
            ${renderDirectorNameAndRoleHtml(vendor)}
          </div>
        </div>
      </div>
    `;
  }

  /* ========================================================================
     TEMPLATE LEMBAR A4 #3: SURAT PEMBERITAHUAN SELESAI 100% (SPS)
     ======================================================================== */
  function renderSheetSPS(vendor, fin, meta, fullLokasiStr) {
    return `
      <div class="print-sheet font-arial" style="font-size:11pt;">
        ${renderVendorKopHtml(vendor)}

        <table style="border-collapse:collapse;margin-bottom:18px;font-size:11pt;">
          <tr>
            <td style="width:90px;padding:2px 0;">Nomor</td>
            <td>: ${escapeHtml(meta.noSps)}</td>
          </tr>
          <tr>
            <td style="padding:2px 0;">Lampiran</td>
            <td>: 1 (Berkas)</td>
          </tr>
          <tr>
            <td style="padding:2px 0;">Perihal</td>
            <td>: Surat Pemberitahuan Selesai 100%</td>
          </tr>
        </table>

        <div style="margin-bottom:18px;">
          Kepada Yth,<br/>
          <strong style="font-style:italic;">Bapak Kepala Badan Nasional Penanggulangan Bencana</strong><br/>
          <em>di-</em><br/>
          &nbsp;&nbsp;&nbsp;${escapeHtml(state.settings.alamatTujuanSurat || 'Graha BNPB Jl. Pramuka Kav. 38 Matraman - Jakarta Timur')}
        </div>

        <div style="margin-bottom:14px;">Yang bertanda tangan di bawah ini kami :</div>

        <table style="border-collapse:collapse;margin-bottom:20px;margin-left:8px;width:95%;">
          <tr>
            <td style="width:170px;padding:5px 0;vertical-align:top;">Nama</td>
            <td style="width:15px;padding:5px 0;vertical-align:top;">:</td>
            <td style="padding:5px 0;vertical-align:top;">${escapeHtml(vendor.direktur)}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;vertical-align:top;">Jabatan</td>
            <td style="padding:5px 0;vertical-align:top;">:</td>
            <td style="padding:5px 0;vertical-align:top;">${escapeHtml(vendor.jabatan || 'Direktur')}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;vertical-align:top;">Bertindak Untuk atas</td>
            <td style="padding:5px 0;vertical-align:top;">:</td>
            <td style="padding:5px 0;vertical-align:top;">${escapeHtml(vendor.nama)}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;vertical-align:top;">Alamat Perusahaan</td>
            <td style="padding:5px 0;vertical-align:top;">:</td>
            <td style="padding:5px 0;vertical-align:top;">${escapeHtml(vendor.alamat)}</td>
          </tr>
        </table>

        <div style="text-align:justify;line-height:1.65;margin-bottom:14px;">
          Sehubungan Dengan pekerjaan Pembangunan Hunian Sementara sebanyak ${fin.qty} (${escapeHtml(fin.terbilangQty)}) unit di ${escapeHtml(toTitleCase(fullLokasiStr))} Kami ${escapeHtml(vendor.nama)} selaku Pelaksana Pekerjaan tersebut memberitahukan bahwasanya pekerjaan tersebut sudah selesai kami kerjakan 100%.
        </div>

        <div style="text-align:justify;line-height:1.55;margin-bottom:32px;">
          Demikian surat pernyataan ini dibuat dengan sebenarnya dan penuh rasa tanggung jawab dan untuk dapat dipergunakan sebagaimana mestinya.
        </div>

        <div style="display:flex;justify-content:flex-end;">
          <div style="width:270px;font-size:11pt;">
            <div>${escapeHtml(vendor.kotaTtd)}, ${escapeHtml(meta.tglSps)}</div>
            <div style="font-weight:bold;">${escapeHtml(vendor.nama)}</div>
            ${renderVendorTtdHtml(vendor, 'left')}
            ${renderDirectorNameAndRoleHtml(vendor)}
          </div>
        </div>
      </div>
    `;
  }

  /* ========================================================================
     TEMPLATE LEMBAR A4 #4: LAMPIRAN REKAP DAFTAR BNBA PENCAIRAN
     ======================================================================== */
  function renderSheetBnbaList(vendor, units, meta, fullLokasiStr) {
    const provClean = String(vendor.provinsi || 'PROVINSI NUSA TENGGARA TIMUR').replace(/^PROVINSI\s+/i, '');
    const kabClean = String(vendor.kabupaten || 'KABUPATEN NAGEKEO').replace(/^KABUPATEN\s+/i, '');

    return `
      <div class="print-sheet font-arial">
        <!-- QUICK TOOLBAR UPLOAD LOGO PEMDA (NO-PRINT) -->
        <div class="no-print" style="margin-bottom:8px;display:flex;justify-content:flex-end;gap:8px;">
          <button class="btn btn-sm btn-outline" style="background:#fff;border-color:#2563eb;color:#2563eb;font-weight:600;display:inline-flex;align-items:center;gap:6px;box-shadow:0 1px 2px rgba(0,0,0,0.05);" onclick="window.app.openLogoHeaderModal('${escapeHtml(vendor.id)}')">
            🏛️ Upload / Ganti Logo Pemda (Provinsi &amp; Kabupaten)
          </button>
        </div>

        <!-- HEADER 4 LOGO SESUAI GAMBAR 2 -->
        <div class="lap-header-4logo">
          <div class="lap-logo-pair">
            <div class="lap-logo-box"><img src="/assets/logo-bnpb.png" alt="Logo BNPB" /></div>
            <div class="lap-logo-box"><img src="${escapeHtml(vendor.logoProvinsiUrl || '/assets/logo-provinsi.svg')}" alt="Logo Provinsi" /></div>
          </div>
          <div class="lap-header-center">
            <div class="h-bnpb">BADAN NASIONAL PENANGGULANGAN BENCANA (BNPB)</div>
            <div class="h-pemda">PEMERINTAH PROVINSI ${escapeHtml(provClean)} — PEMERINTAH<br/>KABUPATEN ${escapeHtml(kabClean)}</div>
            <div class="h-vendor">PELAKSANA: ${escapeHtml(vendor.nama)}</div>
            <div class="h-addr">Alamat: ${escapeHtml(vendor.alamat)}, Telp. ${escapeHtml(vendor.telepon || '0812 - 3982 - 0000')}</div>
          </div>
          <div class="lap-logo-pair">
            <div class="lap-logo-box"><img src="${escapeHtml(vendor.logoKabupatenUrl || '/assets/logo-kabupaten.svg')}" alt="Logo Kabupaten" /></div>
            <div class="lap-logo-box"><img src="${escapeHtml(vendor.logoUrl || '/assets/logo-emka-real_0.png')}" alt="Logo Pelaksana" /></div>
          </div>
        </div>
        <div class="lap-double-rule"></div>

        <div style="text-align:center;margin:10px 0 14px;">
          <div style="font-size:12pt;font-weight:bold;text-transform:uppercase;">LAMPIRAN DAFTAR PENERIMA HUNIAN SEMENTARA (BNBA)</div>
          <div style="font-size:10pt;">PELAKSANA : <strong>${escapeHtml(vendor.nama)}</strong> — LOKASI : <strong>${escapeHtml(toTitleCase(fullLokasiStr))}</strong></div>
          <div style="font-size:9.5pt;">Jumlah Unit : <strong>${units.length} Unit</strong> | Lampiran Invoice No: ${escapeHtml(meta.noInvoice)}</div>
        </div>

        <table class="spp-table" style="font-size:9pt;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="width:34px;">NO</th>
              <th style="width:65px;">NO BNBA</th>
              <th>NAMA LENGKAP PENERIMA</th>
              <th style="width:60px;">NO. RT</th>
              <th>DESA / KELURAHAN</th>
              <th>KECAMATAN</th>
              <th style="width:75px;">PROGRES</th>
            </tr>
          </thead>
          <tbody>
            ${units.length === 0 ? `
              <tr><td colspan="7" style="text-align:center;padding:18px;">Belum ada unit yang dipilih.</td></tr>
            ` : units.map((u, idx) => `
              <tr>
                <td style="text-align:center;">${idx + 1}</td>
                <td style="text-align:center;">${u.noBnba}</td>
                <td><strong>${escapeHtml(u.nama)}</strong></td>
                <td style="text-align:center;">${escapeHtml(u.rt)}</td>
                <td>${escapeHtml(u.desa)}</td>
                <td>${escapeHtml(u.kecamatan)}</td>
                <td style="text-align:center;font-weight:bold;">${u.progres}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top:20px;display:flex;justify-content:flex-end;">
          <div style="width:240px;text-align:center;font-size:10pt;">
            <div>${escapeHtml(vendor.kotaTtd)}, ${escapeHtml(meta.tglInvoice)}</div>
            <div style="font-weight:bold;">${escapeHtml(vendor.nama)}</div>
            ${renderVendorTtdHtml(vendor, 'center')}
            ${renderDirectorNameAndRoleHtml(vendor)}
          </div>
        </div>
      </div>
    `;
  }

  /* ========================================================================
     TEMPLATE LEMBAR A4 #5: BUKU DOKUMENTASI PROGRES FISIK (0% - 50% - 100%)
     FORMAT RESMI SESUAI REFERENSI LAPORAN.PDF (3 HALAMAN PER UNIT)
     ======================================================================== */
  function renderSheetsDokumentasi(vendor, units, meta, desaStr, kecStr) {
    // Model resmi dokumentasi foto progres fisik 0%, 50%, 100% mengikuti file acuan laporan.pdf
    return renderSheetsLaporanProgres(vendor, units, meta, desaStr, kecStr);
  }

  /* ========================================================================
     TEMPLATE LEMBAR A4 #5B: LAPORAN DOKUMENTASI PROGRES FISIK (0% - 50% - 100%)
     SESUAI FILE REFERENSI LAPORAN.PDF
     ======================================================================== */
  function renderSheetsLaporanProgres(vendor, units, meta, desaStr, kecStr) {
    const listUnits = units.length > 0 ? units : [{
      noBnba: 1,
      noInsitu: '01',
      nama: '[Nama Penerima Manfaat]',
      rt: '001',
      desa: desaStr.replace(/^Desa\/Kel\.\s*/i, ''),
      kecamatan: kecStr.replace(/^Kecamatan\s*/i, ''),
      progres: 100,
      koordinatGps: '8°40\'12,45"S, 121°19\'38,12"E',
      tipeUnit: 'Tipe Single / Insitu (36 m²)'
    }];

    const renderPhotoBox = (imgUrl, stageLabel, angleLabel) => {
      if (imgUrl) {
        return `<div class="lap-photo-frame"><img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(stageLabel)}" /></div>`;
      }
      return `
        <div class="lap-photo-frame">
          <strong style="font-size:8.5pt;color:#334155;">[Tempel Foto ${escapeHtml(stageLabel)}]</strong>
          <span style="font-size:8pt;color:#64748b;margin-top:3px;">${escapeHtml(angleLabel)}</span>
        </div>
      `;
    };

    const provClean = String(vendor.provinsi || 'PROVINSI NUSA TENGGARA TIMUR').replace(/^PROVINSI\s+/i, '');
    const kabClean = String(vendor.kabupaten || 'KABUPATEN NAGEKEO').replace(/^KABUPATEN\s+/i, '');

    const rabItems = (state.settings.itemRab && state.settings.itemRab.length > 0)
      ? state.settings.itemRab
      : getDefaultRabItems();

    const totalBobot = rabItems.reduce((acc, it) => acc + (Number(it.bobot) || 0), 0);
    const totalP0 = rabItems.reduce((acc, it) => acc + (Number(it.p0) || 0), 0);
    const totalP50 = rabItems.reduce((acc, it) => acc + (Number(it.p50) || 0), 0);
    const totalP100 = rabItems.reduce((acc, it) => acc + (Number(it.p100) || 0), 0);

    const formatPersen = (val) => {
      const num = Number(val) || 0;
      return num.toFixed(2).replace('.', ',') + '%';
    };

    const rowsRabHtml = rabItems.map((it, i) => `
      <tr>
        <td style="text-align:center;">${i + 1}</td>
        <td>${escapeHtml(it.uraian || '')}</td>
        <td style="text-align:right;">${formatPersen(it.bobot)}</td>
        <td style="text-align:right;">${formatPersen(it.p0)}</td>
        <td style="text-align:right;">${formatPersen(it.p50)}</td>
        <td style="text-align:right;">${formatPersen(it.p100)}</td>
        <td>${escapeHtml(it.keterangan || '')}</td>
      </tr>
    `).join('');

    return listUnits.map((u, idx) => {
      const unitCode = `Blok Insitu – Unit ${String(u.noInsitu || (idx + 1)).padStart(2, '0')} (BNBA #${u.noBnba})`;
      const gpsText = u.koordinatGps || '8°40\'12,45"S, 121°19\'38,12"E';
      const tipeText = u.tipeUnit || 'Tipe Single / Insitu';

      // Page 1: Header 4 Logo + 1. Data Umum Proyek + 2. Rekapitulasi Progres Fisik Pekerjaan (Item Bobot RAB/BOQ)
      const page1 = `
        <div class="print-sheet lap-sheet">
          <div>
            <!-- QUICK TOOLBAR UPLOAD LOGO PEMDA (NO-PRINT) -->
            <div class="no-print" style="margin-bottom:8px;display:flex;justify-content:flex-end;gap:8px;">
              <button class="btn btn-sm btn-outline" style="background:#fff;border-color:#2563eb;color:#2563eb;font-weight:600;display:inline-flex;align-items:center;gap:6px;box-shadow:0 1px 2px rgba(0,0,0,0.05);" onclick="window.app.openLogoHeaderModal('${escapeHtml(vendor.id)}')">
                🏛️ Upload / Ganti Logo Pemda (Provinsi &amp; Kabupaten)
              </button>
            </div>

            <!-- HEADER 4 LOGO -->
            <div class="lap-header-4logo">
              <div class="lap-logo-pair">
                <div class="lap-logo-box"><img src="/assets/logo-bnpb.png" alt="Logo BNPB" /></div>
                <div class="lap-logo-box"><img src="${escapeHtml(vendor.logoProvinsiUrl || '/assets/logo-provinsi.svg')}" alt="Logo Provinsi" /></div>
              </div>
              <div class="lap-header-center">
                <div class="h-bnpb">BADAN NASIONAL PENANGGULANGAN BENCANA (BNPB)</div>
                <div class="h-pemda">PEMERINTAH PROVINSI ${escapeHtml(provClean)} — PEMERINTAH<br/>KABUPATEN ${escapeHtml(kabClean)}</div>
                <div class="h-vendor">PELAKSANA: ${escapeHtml(vendor.nama)}</div>
                <div class="h-addr">Alamat: ${escapeHtml(vendor.alamat)}, Telp. ${escapeHtml(vendor.telepon || '0812 - 3982 - 0000')}</div>
              </div>
              <div class="lap-logo-pair">
                <div class="lap-logo-box"><img src="${escapeHtml(vendor.logoKabupatenUrl || '/assets/logo-kabupaten.svg')}" alt="Logo Kabupaten" /></div>
                <div class="lap-logo-box"><img src="${escapeHtml(vendor.logoUrl || '/assets/logo-emka-real_0.png')}" alt="Logo Pelaksana" /></div>
              </div>
            </div>
            <div class="lap-double-rule"></div>

            <!-- JUDUL LAPORAN -->
            <div class="lap-main-title">
              <div class="t-small">LAPORAN DOKUMENTASI PROGRES FISIK (0% — 50% — 100%)</div>
              <div class="t-big">PEMBANGUNAN HUNIAN SEMENTARA (HUNTARA)</div>
              <div class="t-loc">Lokasi: Desa/Kel. ${escapeHtml(u.desa)}, Kec. ${escapeHtml(u.kecamatan)}, Kab. ${escapeHtml(kabClean)}</div>
            </div>

            <!-- 1. DATA UMUM PROYEK -->
            <div class="lap-sec-title">1. Data Umum Proyek</div>
            <table class="lap-info-table">
              <tbody>
                <tr>
                  <td class="lbl">Jumlah Unit</td>
                  <td>1 Unit (${escapeHtml(unitCode)}) — Bagian dari Paket ${listUnits.length} Unit</td>
                </tr>
                <tr>
                  <td class="lbl">Lokasi Pekerjaan</td>
                  <td>Desa/Kelurahan ${escapeHtml(u.desa)} (RT ${escapeHtml(u.rt)}), Kecamatan ${escapeHtml(u.kecamatan)}, Kabupaten ${escapeHtml(kabClean)}</td>
                </tr>
                <tr>
                  <td class="lbl">Nama Penerima</td>
                  <td><strong>${escapeHtml(u.nama)}</strong>${u.nik ? ` (NIK/KK: ${escapeHtml(u.nik)})` : ''}</td>
                </tr>
              </tbody>
            </table>

            <!-- 2. REKAPITULASI PROGRES FISIK PEKERJAAN -->
            <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:6px;">
              <div class="lap-sec-title" style="margin:0;">2. Rekapitulasi Progres Fisik Pekerjaan</div>
              <button class="btn btn-sm btn-outline no-print" style="font-size:11px;padding:2px 8px;border-color:#b45309;color:#b45309;background:#fff;" onclick="window.app.openRabModal()">
                ⚙️ Sesuaikan Item &amp; Bobot RAB/SPK
              </button>
            </div>
            <p style="font-size:8.8pt;color:#334155;margin-bottom:8px;">
              Tabel berikut merangkum bobot dan capaian progres fisik pekerjaan pada tahap 0%, 50%, dan 100%. Rincian item serta bobot pekerjaan disesuaikan dengan Penawaran dan SPK kontrak.
            </p>
            <table class="lap-bobot-table">
              <thead>
                <tr>
                  <th style="width:32px;">No</th>
                  <th style="text-align:left;">Uraian Pekerjaan</th>
                  <th style="width:65px;">Bobot<br/>(%)</th>
                  <th style="width:65px;">Progres<br/>0%</th>
                  <th style="width:65px;">Progres<br/>50%</th>
                  <th style="width:65px;">Progres<br/>100%</th>
                  <th style="width:130px;text-align:left;">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                ${rowsRabHtml}
                <tr class="total-row">
                  <td colspan="2" style="text-align:center;">TOTAL PROGRES FISIK</td>
                  <td style="text-align:right;">${formatPersen(totalBobot)}</td>
                  <td style="text-align:right;">${formatPersen(totalP0)}</td>
                  <td style="text-align:right;">${formatPersen(totalP50)}</td>
                  <td style="text-align:right;">${formatPersen(totalP100)}</td>
                  <td>Selesai ${u.progres || 100}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="lap-page-footer">
            <span>Laporan Progres Fisik 0%, 50%, 100% — HUNTARA (${escapeHtml(u.nama)})</span>
            <span>Page 1 of 3</span>
          </div>
        </div>
      `;

      // Page 2: 3. Lembar Dokumentasi Foto (0% - 50% - 100%) (A. Tampak Depan, B. Tampak Samping/Belakang, C. Bagian Dalam)
      const page2 = `
        <div class="print-sheet lap-sheet">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:0;margin-bottom:6px;">
              <div class="lap-sec-title" style="margin:0;">3. Lembar Dokumentasi Foto (0% — 50% — 100%)</div>
              <button class="btn btn-sm btn-outline no-print" style="background:#fff;border-color:#2563eb;color:#2563eb;font-weight:600;display:inline-flex;align-items:center;gap:4px;" onclick="window.app.openUnitModal('${escapeHtml(u.id)}')">
                📷 Upload / Ganti / Hapus Foto Unit Ini
              </button>
            </div>
            <div class="lap-unit-bar">
              <div><strong>Unit / Blok:</strong> ${escapeHtml(unitCode)}</div>
              <div><strong>Koordinat GPS:</strong> ${escapeHtml(gpsText)}</div>
              <div><strong>Tipe Unit:</strong> ${escapeHtml(tipeText)}</div>
            </div>

            <table class="lap-matrix-table">
              <thead>
                <tr>
                  <th>Progres 0% (Kondisi Awal)</th>
                  <th>Progres 50% (Tahap Struktur)</th>
                  <th>Progres 100% (Selesai / Siap Huni)</th>
                </tr>
              </thead>
              <tbody>
                <tr class="angle-row">
                  <td colspan="3">A. Tampak Depan — Penerima: ${escapeHtml(u.nama)} (Desa ${escapeHtml(u.desa)} RT ${escapeHtml(u.rt)})</td>
                </tr>
                <tr>
                  <td class="photo-cell">${renderPhotoBox(u.foto0, '0%', 'Tampak Depan — Lahan Awal')}</td>
                  <td class="photo-cell">${renderPhotoBox(u.foto50, '50%', 'Tampak Depan — Pondasi & Rangka')}</td>
                  <td class="photo-cell">${renderPhotoBox(u.foto100_1, '100%', 'Tampak Depan — Selesai')}</td>
                </tr>
                <tr class="angle-row">
                  <td colspan="3">B. Tampak Samping / Belakang</td>
                </tr>
                <tr>
                  <td class="photo-cell">${renderPhotoBox(u.foto0_samping || u.foto0, '0%', 'Tampak Samping / Belakang')}</td>
                  <td class="photo-cell">${renderPhotoBox(u.foto50_samping || u.foto50, '50%', 'Tampak Samping / Belakang')}</td>
                  <td class="photo-cell">${renderPhotoBox(u.foto100_samping || u.foto100_1, '100%', 'Tampak Samping / Belakang')}</td>
                </tr>
                <tr class="angle-row">
                  <td colspan="3">C. Bagian Dalam (Interior)</td>
                </tr>
                <tr>
                  <td class="photo-cell">${renderPhotoBox(u.foto0_dalam || u.foto0, '0%', 'Lahan / Titik Pondasi')}</td>
                  <td class="photo-cell">${renderPhotoBox(u.foto50_dalam || u.foto50, '50%', 'Rangka & Lantai')}</td>
                  <td class="photo-cell">${renderPhotoBox(u.foto100_2, '100%', 'Dinding, Pintu & Listrik')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="lap-page-footer">
            <span>Laporan Progres Fisik 0%, 50%, 100% — HUNTARA (${escapeHtml(u.nama)})</span>
            <span>Page 2 of 3</span>
          </div>
        </div>
      `;

      // Page 3: D. MCK / Sanitasi + 4. Lembar Pengesahan + Tanda Tangan Pelaksana
      const page3 = `
        <div class="print-sheet lap-sheet">
          <div>
            <div class="no-print" style="display:flex;justify-content:flex-end;margin-bottom:6px;">
              <button class="btn btn-sm btn-outline" style="background:#fff;border-color:#2563eb;color:#2563eb;font-weight:600;display:inline-flex;align-items:center;gap:4px;" onclick="window.app.openUnitModal('${escapeHtml(u.id)}')">
                📷 Upload / Ganti / Hapus Foto Unit Ini
              </button>
            </div>
            <table class="lap-matrix-table">
              <thead>
                <tr>
                  <th>Progres 0% (Kondisi Awal)</th>
                  <th>Progres 50% (Tahap Struktur)</th>
                  <th>Progres 100% (Selesai / Siap Huni)</th>
                </tr>
              </thead>
              <tbody>
                <tr class="angle-row">
                  <td colspan="3">D. MCK / Sanitasi (Jika Ada)${u.perubahanDenah ? ` — ${escapeHtml(u.keteranganDenah)}` : ''}</td>
                </tr>
                <tr>
                  <td class="photo-cell">${renderPhotoBox(u.foto0_mck || u.foto0, '0%', 'Lokasi MCK / Septictank')}</td>
                  <td class="photo-cell">${renderPhotoBox(u.foto50_mck || u.foto50, '50%', 'Pekerjaan Instalasi & Struktur')}</td>
                  <td class="photo-cell">${renderPhotoBox(u.foto100_3, '100%', 'MCK Terpasang & Berfungsi')}</td>
                </tr>
                <tr>
                  <td style="border:1px solid #cbd5e1;padding:4px 8px;">Tanggal: ${escapeHtml(meta.tglCoverDokumentasi)}</td>
                  <td style="border:1px solid #cbd5e1;padding:4px 8px;">Tanggal: ${escapeHtml(meta.tglCoverDokumentasi)}</td>
                  <td style="border:1px solid #cbd5e1;padding:4px 8px;">Tanggal: ${escapeHtml(meta.tglCoverDokumentasi)}</td>
                </tr>
              </tbody>
            </table>

            <div class="lap-sec-title" style="margin-top:18px;">4. Lembar Pengesahan</div>
            <p style="font-size:9.5pt;line-height:1.55;color:#1e293b;">
              Demikian Laporan Dokumentasi Progres Fisik (0%, 50%, dan 100%) Pembangunan Hunian Sementara (HUNTARA) untuk penerima manfaat <strong>${escapeHtml(u.nama)}</strong> di Desa/Kelurahan <strong>${escapeHtml(u.desa)}</strong>, Kecamatan <strong>${escapeHtml(u.kecamatan)}</strong> ini dibuat dengan sebenar-benarnya untuk dipergunakan sebagaimana mestinya.
            </p>

            <div class="lap-callout-warning">
              <strong style="color:#b45309;display:block;margin-bottom:4px;">Standar Pengambilan Foto Lapangan:</strong>
              <ul style="padding-left:18px;margin:0;">
                <li><strong>Titik Bidik Sama (Fixed Point):</strong> Ambil foto 0%, 50%, dan 100% dari posisi dan sudut yang sama agar progres fisik terlihat jelas saat verifikasi.</li>
                <li><strong>Timestamp &amp; Geotagging:</strong> Pastikan foto memuat tanggal, jam, lokasi, dan koordinat GPS secara langsung.</li>
                <li><strong>Identitas Unit:</strong> Cantumkan kode unit/blok (misal: ${escapeHtml(unitCode)}) pada papan identitas lapangan atau keterangan foto agar tidak tertukar.</li>
              </ul>
            </div>

            <!-- BLOK PENGESAHAN / TANDA TANGAN PELAKSANA -->
            <div style="margin-top:26px;display:flex;justify-content:flex-end;">
              <div style="width:260px;text-align:center;font-size:10pt;">
                <div>${escapeHtml(vendor.kotaTtd)}, ${escapeHtml(meta.tglCoverDokumentasi)}</div>
                <div style="font-weight:bold;margin-top:2px;">Pelaksana Pekerjaan</div>
                <div style="font-weight:bold;">${escapeHtml(vendor.nama)}</div>
                ${renderVendorTtdHtml(vendor, 'center')}
                ${renderDirectorNameAndRoleHtml(vendor)}
              </div>
            </div>
          </div>

          <div class="lap-page-footer">
            <span>Laporan Progres Fisik 0%, 50%, 100% — HUNTARA (${escapeHtml(u.nama)})</span>
            <span>Page 3 of 3</span>
          </div>
        </div>
      `;

      const pageDenah = u.perubahanDenah ? renderSheetSuratPernyataanDenah(u, vendor) : '';
      return page1 + page2 + page3 + pageDenah;
    }).join('');
  }

  function renderSheetSuratPernyataanDenah(u, vendor) {
    if (u.fotoSuratPernyataan) {
      return `
        <div class="print-sheet" style="display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <img src="${escapeHtml(u.fotoSuratPernyataan)}" alt="Surat Pernyataan Perubahan Denah" style="max-width:100%;max-height:265mm;object-fit:contain;" />
        </div>
      `;
    }

    return `
      <div class="print-sheet font-arial" style="font-size:10.5pt;padding:20mm 20mm;">
        <div style="text-align:center;font-weight:bold;font-size:11.5pt;margin-bottom:24px;text-transform:uppercase;line-height:1.4;">
          SURAT PERNYATAAN PERUBAHAN DENAH BANGUNAN HUNIAN<br/>SEMENTARA (HUNTARA)
        </div>

        <div style="margin-bottom:12px;">Saya yang bertanda tangan di bawah ini:</div>

        <table style="border-collapse:collapse;width:100%;margin-bottom:18px;">
          <tr>
            <td style="width:160px;padding:5px 0;">Nama</td>
            <td style="width:15px;">:</td>
            <td style="border-bottom:1px dotted #000;font-weight:bold;">${escapeHtml(u.nama)}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;">Tempat/Tanggal Lahir</td>
            <td>:</td>
            <td style="border-bottom:1px dotted #000;">${escapeHtml(u.ttl || `${u.desa}, -`)}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;">NIK</td>
            <td>:</td>
            <td style="border-bottom:1px dotted #000;">${escapeHtml(u.nik || u.noKk || '')}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;">Alamat</td>
            <td>:</td>
            <td style="border-bottom:1px dotted #000;">RT ${escapeHtml(u.rt)}, Desa/Kel. ${escapeHtml(u.desa)}, Kec. ${escapeHtml(u.kecamatan)}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;">No. HP</td>
            <td>:</td>
            <td style="border-bottom:1px dotted #000;">${escapeHtml(u.noHp || '-')}</td>
          </tr>
        </table>

        <div style="line-height:1.6;text-align:justify;margin-bottom:14px;">
          Dengan ini menyatakan bahwa saya adalah warga terdampak bencana di Desa/Kelurahan ${escapeHtml(u.desa)}, Kecamatan ${escapeHtml(u.kecamatan)}, ${escapeHtml(vendor.kabupaten)}.<br/>
          Sehubungan dengan pembangunan Hunian Sementara (Huntara) oleh Pemerintah, bersama ini saya menyatakan alasan perubahan pada denah rumah :
        </div>

        <div style="min-height:110px;border:1px dashed #64748b;padding:12px;margin-bottom:20px;line-height:1.8;background:#fafafa;">
          ${escapeHtml(u.alasanPerubahan || 'Pemilik rumah meminta perubahan denah kamar mandi/WC dibangun terpisah di luar bangunan Huntara karena pertimbangan luas ruangan kamar (material diberikan).')}
        </div>

        <div style="line-height:1.6;margin-bottom:36px;">
          Pernyataan ini saya buat dengan sebenar-benarnya, tanpa adanya paksaan dari pihak mana pun, untuk dipergunakan sebagaimana mestinya.
        </div>

        <div style="display:flex;justify-content:space-between;margin-top:24px;">
          <div style="width:42%;text-align:center;">
            <div>Mengetahui,</div>
            <div>${escapeHtml(u.jabatanKepalaDesa || 'Kepala Desa / Lurah')} ${escapeHtml(u.desa)}</div>
            <div style="height:75px;"></div>
            <div>( ${escapeHtml(u.namaKepalaDesa || '............................................')} )</div>
          </div>
          <div style="width:42%;text-align:center;">
            <div>${escapeHtml(u.desa)}, ${escapeHtml(u.tglPernyataan || '........................ 2026')}</div>
            <div>Yang Menyatakan</div>
            <div style="height:75px;"></div>
            <div style="font-weight:bold;">( ${escapeHtml(u.nama)} )</div>
          </div>
        </div>
      </div>
    `;
  }

  /* ========================================================================
     TAB 6: STUDIO AUTO-WATERMARK FOTO BNPB & BLANKO LAPANGAN
     ======================================================================== */
  function renderToolsTab() {
    const activeUnits = getActiveUnits();
    return `
      <div class="grid-2">
        <!-- STUDIO WATERMARK FOTO BNPB -->
        <div class="card">
          <div class="card-header">
            <h3>📷 Studio Auto-Watermark Foto Dokumentasi BNPB</h3>
          </div>
          <div class="card-body">
            <p style="font-size:13px;color:var(--text-muted);margin-bottom:14px;">
              Fitur ini otomatis menempelkan <strong>Logo BNPB</strong> di pojok kanan atas serta <strong>Stempel Waktu, Koordinat GPS, Lokasi Desa & Nama Penerima</strong> di pojok kanan bawah persis seperti foto contoh laporan BNPB.
            </p>
            <div class="form-group">
              <label>1. Pilih Warga Penerima (BNBA)</label>
              <select id="wmUnitSelect" class="form-control">
                ${activeUnits.map(u => `<option value="${escapeHtml(u.id)}">#${u.noBnba} - ${escapeHtml(u.nama)} (Desa ${escapeHtml(u.desa)} RT ${escapeHtml(u.rt)})</option>`).join('')}
              </select>
            </div>
            <div class="grid-2" style="gap:10px;">
              <div class="form-group">
                <label>2. Simpan ke Slot Tahap Progres (12 Slot Matriks)</label>
                <select id="wmSlotSelect" class="form-control">
                  <optgroup label="A. Tampak Depan">
                    <option value="foto0">A1. Progres 0% — Tampak Depan (Lahan Awal)</option>
                    <option value="foto50">A2. Progres 50% — Tampak Depan (Pondasi/Rangka)</option>
                    <option value="foto100_1">A3. Progres 100% — Tampak Depan (Selesai)</option>
                  </optgroup>
                  <optgroup label="B. Tampak Samping / Belakang">
                    <option value="foto0_samping">B1. Progres 0% — Tampak Samping</option>
                    <option value="foto50_samping">B2. Progres 50% — Tampak Samping</option>
                    <option value="foto100_samping">B3. Progres 100% — Tampak Samping</option>
                  </optgroup>
                  <optgroup label="C. Bagian Dalam (Interior)">
                    <option value="foto0_dalam">C1. Progres 0% — Bagian Dalam</option>
                    <option value="foto50_dalam">C2. Progres 50% — Bagian Dalam</option>
                    <option value="foto100_2">C3. Progres 100% — Bagian Dalam (Pintu/Listrik)</option>
                  </optgroup>
                  <optgroup label="D. MCK / Sanitasi">
                    <option value="foto0_mck">D1. Progres 0% — MCK / Lokasi Septictank</option>
                    <option value="foto50_mck">D2. Progres 50% — MCK (Instalasi/Struktur)</option>
                    <option value="foto100_3">D3. Progres 100% — MCK Terpasang</option>
                  </optgroup>
                </select>
              </div>
              <div class="form-group">
                <label>3. Tanggal & Jam di Watermark</label>
                <input type="text" id="wmDateInput" class="form-control" value="18 Nov 2026 16.30.12" />
              </div>
            </div>
            <div class="form-group">
              <label>4. Koordinat GPS Lokasi (Otomatis / Edit)</label>
              <input type="text" id="wmGpsInput" class="form-control" value="8°40'12,450\"S 121°19'38,120\"E" />
            </div>
            <div class="form-group">
              <label>5. Pilih File Foto Lapangan</label>
              <input type="file" id="wmFileInput" accept="image/*" class="form-control" onchange="window.app.previewWatermark()" />
            </div>
            <div style="text-align:center;margin:12px 0;">
              <canvas id="wmCanvas" width="800" height="540" style="max-width:100%;height:auto;border:1px solid #cbd5e1;border-radius:8px;background:#e2e8f0;"></canvas>
            </div>
            <div style="display:flex;gap:10px;">
              <button class="btn btn-success" style="flex:1" onclick="window.app.saveWatermarkedToUnit()">
                💾 Pasang ke Dokumentasi Warga Ini
              </button>
              <button class="btn btn-outline" onclick="window.app.downloadWatermarked()">
                ⬇️ Download Foto
              </button>
            </div>
          </div>
        </div>

        <!-- CETAK BLANKO SURAT PERNYATAAN PERUBAHAN DENAH -->
        <div class="card">
          <div class="card-header">
            <h3>📝 Cetak Blanko Surat Pernyataan Perubahan Denah</h3>
          </div>
          <div class="card-body">
            <p style="font-size:13px;color:var(--text-muted);margin-bottom:14px;">
              Jika ada warga penerima Huntara yang meminta WC/Closet dibangun di luar atau ukuran kamar diperluas, cetak form Surat Pernyataan Perubahan Denah ini untuk ditandatangani warga dan Kepala Desa/Lurah.
            </p>
            <div class="form-group">
              <label>Pilih Warga Penerima untuk Diisi Otomatis ke Blanko</label>
              <select id="blankoUnitSelect" class="form-control">
                ${activeUnits.map(u => `<option value="${escapeHtml(u.id)}">#${u.noBnba} - ${escapeHtml(u.nama)} (Desa ${escapeHtml(u.desa)} RT ${escapeHtml(u.rt)})</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Alasan Perubahan Denah (Bisa dikosongkan untuk ditulis tangan di lapangan)</label>
              <textarea id="blankoReasonInput" class="form-control" rows="3" placeholder="Contoh: Tidak membuat ruangan WC di dalam Huntara karena ruangan kamar terasa sempit, WC dibangun di luar rumah."></textarea>
            </div>
            <button class="btn btn-primary" style="width:100%;" onclick="window.app.printSingleBlankoDenah()">
              🖨️ Buka & Cetak Surat Pernyataan Perubahan Denah
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /* ========================================================================
     TAB 7: SHARING TIM, JARINGAN WIFI & BACKUP DATA VENDOR
     ======================================================================== */
  function renderSharingTab() {
    const lanUrls = state.serverInfo?.lanUrls || [];
    return `
      <div class="grid-2">
        <!-- SHARING WIFI / HOTSPOT -->
        <div class="card">
          <div class="card-header">
            <h3>📡 Cara 1: Berbagi Pakai Langsung Lewat WiFi / Hotspot (Real-Time)</h3>
          </div>
          <div class="card-body">
            <p style="font-size:13.5px;margin-bottom:14px;">
              Selama aplikasi ini menyala di laptop utama Bro, teman tim atau admin vendor lain yang terhubung ke <strong>WiFi atau Hotspot HP yang sama</strong> bisa langsung membuka aplikasi ini dari browser HP/Laptop mereka melalui alamat berikut:
            </p>
            <div style="background:#0f172a;color:#38bdf8;padding:16px;border-radius:8px;font-family:monospace;font-size:15px;margin-bottom:14px;">
              ${lanUrls.length > 0 ? lanUrls.map(u => `<div style="margin:4px 0;">🔗 ${escapeHtml(u)}</div>`).join('') : `<div>🔗 ${escapeHtml(window.location.origin)} (Hubungkan ke WiFi/Hotspot untuk IP jaringan)</div>`}
            </div>
            <p style="font-size:12.5px;color:var(--text-muted);">
              💡 <strong>Keunggulan:</strong> Pengawas lapangan bisa langsung buka link di atas lewat HP untuk upload foto rumah 0%, 50%, 100%, dan datanya otomatis muncul detik itu juga di laptop utama Bro!
            </p>
          </div>
        </div>

        <!-- EXPORT / IMPORT PAKET DATA VENDOR VIA WHATSAPP -->
        <div class="card">
          <div class="card-header">
            <h3>📦 Cara 2: Kirim & Gabungkan Paket Data Vendor (Lewat WhatsApp)</h3>
          </div>
          <div class="card-body">
            <p style="font-size:13.5px;margin-bottom:14px;">
              Jika tiap vendor atau tim lapangan bekerja di lokasi yang berbeda (beda kota/kecamatan), mereka bisa klik <strong>Export Paket Data</strong> lalu kirim filenya via WhatsApp ke Bro untuk digabungkan:
            </p>
            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px;">
              <button class="btn btn-primary" onclick="window.app.exportDataPackage()">
                ⬇️ Export / Download Paket Data (.json)
              </button>
              <button class="btn btn-outline" onclick="window.app.exportCsvBnba()">
                📊 Export Tabel BNBA ke Excel (.csv)
              </button>
            </div>
            <div style="border-top:1px solid #e2e8f0;padding-top:14px;">
              <label style="font-weight:700;font-size:13px;display:block;margin-bottom:8px;">
                ⬆️ Gabungkan (Import) File Paket Data dari Tim / Vendor Lain:
              </label>
              <input type="file" accept=".json" class="form-control" onchange="window.app.importDataPackage(this.files[0])" />
            </div>
          </div>
        </div>
      </div>

      <!-- IMPORT BNBA BARU DARI EXCEL / CSV / TEKS -->
      <div class="card">
        <div class="card-header">
          <h3>📋 Import Cepat Daftar BNBA untuk Perusahaan / Vendor Lain</h3>
        </div>
        <div class="card-body">
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">
            Punya daftar nama penerima Huntara dari Excel untuk vendor baru? Tempel (copy-paste) barisnya di bawah ini dengan format: <code>Nama Lengkap | RT | Desa | Kecamatan | NIK (Opsional)</code>
          </p>
          <div class="grid-2">
            <div>
              <div class="form-group">
                <label>Masukkan ke Perusahaan / Vendor:</label>
                <select id="bulkImportVendor" class="form-control">
                  ${state.vendors.map(v => `<option value="${escapeHtml(v.id)}">${escapeHtml(v.nama)}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label>Data Baris Penerima (1 baris = 1 KK):</label>
                <textarea id="bulkImportText" class="form-control" rows="5" placeholder="Contoh:\nYohanes Laka | 004 | Marapokot | Aesesa | 531601000001\nPetrus Dhae | 002 | Anakoli | Wolowae | 531602000002"></textarea>
              </div>
              <button class="btn btn-success" onclick="window.app.runBulkTextImport()">
                ➕ Tambahkan Semua ke Daftar BNBA
              </button>
            </div>
            <div>
              <div class="form-group">
                <label>Pengaturan Tujuan Surat BNPB (Berlaku untuk SPP, SPS & Invoice)</label>
                <input type="text" class="form-control" style="margin-bottom:8px;" value="${escapeHtml(state.settings.kepadaYth || '')}" onchange="window.app.updateSetting('kepadaYth', this.value)" placeholder="Kepada Yth..." />
                <input type="text" class="form-control" style="margin-bottom:8px;" value="${escapeHtml(state.settings.cqPejabat || '')}" onchange="window.app.updateSetting('cqPejabat', this.value)" placeholder="Cq. Pejabat Pembuat Komitmen..." />
                <textarea class="form-control" rows="2" style="margin-bottom:8px;" onchange="window.app.updateSetting('satkeruraian', this.value)">${escapeHtml(state.settings.satkeruraian || '')}</textarea>
                <div style="display:flex;align-items:center;gap:10px;">
                  <label style="font-size:12.5px;font-weight:600;">Minimal Unit Penagihan Gelondongan:</label>
                  <input type="number" class="form-control" style="width:90px;" value="${Number(state.settings.minimalUnitTagihan) || 10}" onchange="window.app.updateSetting('minimalUnitTagihan', Number(this.value))" />
                </div>
                <div style="margin-top:14px;padding-top:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                  <div>
                    <div style="font-size:13px;font-weight:700;color:#1e3a5f;">Item Pekerjaan &amp; Bobot RAB (Penawaran &amp; SPK):</div>
                    <div style="font-size:11.5px;color:var(--text-muted)">Sesuaikan uraian item pekerjaan, bobot %, capaian dan catatan laporan</div>
                  </div>
                  <button class="btn btn-warning btn-sm" onclick="window.app.openRabModal()">
                    ⚙️ Atur Item &amp; Bobot RAB/SPK
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* ========================================================================
     PENGATURAN ITEM RAB / PENAWARAN & SPK (MODAL INTERAKTIF)
     ======================================================================== */
  let _rabModalItems = [];

  function getDefaultRabItems() {
    return [
      { no: 1, uraian: 'PEKERJAAN PERSIAPAN', bobot: 4.79, p0: 0.0, p50: 4.79, p100: 4.79, keterangan: 'Pengukuran, bouwplank & galian tanah' },
      { no: 2, uraian: 'PEKERJAAN LANTAI', bobot: 2.64, p0: 0.0, p50: 2.64, p100: 2.64, keterangan: 'Cor beton lantai mutu K-175' },
      { no: 3, uraian: 'PEKERJAAN RANGKA DINDING', bobot: 29.78, p0: 0.0, p50: 29.78, p100: 29.78, keterangan: 'Rangka dinding baja ringan C75' },
      { no: 4, uraian: 'PEKERJAAN DINDING', bobot: 24.32, p0: 0.0, p50: 12.79, p100: 24.32, keterangan: 'Partisi GRC 3.5mm & pengecatan tembok' },
      { no: 5, uraian: 'PEKERJAAN ATAP', bobot: 21.94, p0: 0.0, p50: 0.0, p100: 21.94, keterangan: 'Rangka atap C75, spandek & lisplank' },
      { no: 6, uraian: 'PEKERJAAN PINTU DAN JENDELA', bobot: 6.97, p0: 0.0, p50: 0.0, p100: 6.97, keterangan: 'Pintu uk. 80*200, 70*200 & jendela' },
      { no: 7, uraian: 'PEKERJAAN KANOPI', bobot: 1.10, p0: 0.0, p50: 0.0, p100: 1.10, keterangan: 'Rangka kanopi & atap spandek' },
      { no: 8, uraian: 'PEKERJAAN SANITASI', bobot: 3.55, p0: 0.0, p50: 0.0, p100: 3.55, keterangan: 'Closet jongkok, kran & septictank' },
      { no: 9, uraian: 'PEKERJAAN LISTRIK', bobot: 4.91, p0: 0.0, p50: 0.0, p100: 4.91, keterangan: 'Kabel NYM, lampu LED, saklar & MCB' }
    ];
  }

  function openRabModal() {
    const current = (state.settings.itemRab && state.settings.itemRab.length > 0)
      ? state.settings.itemRab
      : getDefaultRabItems();

    _rabModalItems = JSON.parse(JSON.stringify(current));
    renderRabModalContent();
  }

  function renderRabModalContent() {
    const modalRoot = document.getElementById('modalRoot');
    if (!modalRoot) return;

    const totalBobot = _rabModalItems.reduce((acc, it) => acc + (Number(it.bobot) || 0), 0);
    const totalP0 = _rabModalItems.reduce((acc, it) => acc + (Number(it.p0) || 0), 0);
    const totalP50 = _rabModalItems.reduce((acc, it) => acc + (Number(it.p50) || 0), 0);
    const totalP100 = _rabModalItems.reduce((acc, it) => acc + (Number(it.p100) || 0), 0);
    const is100 = Math.abs(totalBobot - 100) < 0.01;

    modalRoot.innerHTML = `
      <div class="modal-backdrop" onclick="if(event.target===this) window.app.closeModal()">
        <div class="modal-content" style="max-width:1080px;width:96%;">
          <div class="modal-header">
            <div>
              <h3 style="margin:0;">⚙️ Sesuaikan Item Pekerjaan &amp; Bobot RAB (Penawaran &amp; SPK)</h3>
              <p style="font-size:12px;color:var(--text-muted);margin:4px 0 0 0;">
                Ketik angka <strong>Bobot (%)</strong>, maka kolom <strong>0%, 50%, dan 100%</strong> otomatis terisi sendiri. Anda juga bebas mengubah angka kapan saja.
              </p>
            </div>
            <button class="btn btn-sm btn-danger" onclick="window.app.closeModal()">✕</button>
          </div>
          <div class="modal-body" style="max-height:72vh;overflow-y:auto;padding:16px;">

            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
              <div style="font-size:13px;font-weight:700;color:#1e3a5f;">
                Daftar Item Pekerjaan (${_rabModalItems.length} Baris):
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn btn-sm btn-primary" onclick="window.app.autoCalculateAllStages()" title="Otomatis isi 0%=0, 100%=Bobot, dan 50%=Pas 50%">
                  ⚡ Hitung Otomatis 0%, 50%, 100% Sesuai Bobot
                </button>
                <button class="btn btn-sm btn-outline" onclick="window.app.resetRabModalToDefault()">
                  ↺ Reset 8 Item Default
                </button>
                <button class="btn btn-sm btn-success" onclick="window.app.addRabModalRow()">
                  ➕ Tambah Baris
                </button>
              </div>
            </div>

            <div style="overflow-x:auto;">
              <table class="data-table" style="font-size:12px;width:100%;">
                <thead>
                  <tr style="background:#1e3a5f;color:#fff;">
                    <th style="width:35px;text-align:center;">No</th>
                    <th style="min-width:240px;text-align:left;">Uraian Pekerjaan (SPK)</th>
                    <th style="width:105px;text-align:center;">Bobot (%)</th>
                    <th style="width:80px;text-align:center;">0%<br/><span style="font-size:10px;font-weight:normal;">(Otomatis 0)</span></th>
                    <th style="width:115px;text-align:center;">50%<br/><span style="font-size:10px;font-weight:normal;">(Tahap 1)</span></th>
                    <th style="width:95px;text-align:center;">100%<br/><span style="font-size:10px;font-weight:normal;">(= Bobot)</span></th>
                    <th style="min-width:160px;text-align:left;">Keterangan</th>
                    <th style="width:40px;text-align:center;">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  ${_rabModalItems.map((it, idx) => `
                    <tr>
                      <td style="text-align:center;font-weight:bold;">${idx + 1}</td>
                      <td>
                        <input type="text" class="form-control" style="font-size:12px;padding:5px 8px;" value="${escapeHtml(it.uraian || '')}" oninput="window.app.updateRabModalField(${idx}, 'uraian', this.value)" placeholder="Nama item pekerjaan..." />
                      </td>
                      <td>
                        <input type="number" step="0.01" id="rab_bobot_${idx}" class="form-control" style="font-size:12px;padding:5px 6px;text-align:right;font-weight:700;color:#0f172a;background:#fffbeb;" value="${it.bobot !== undefined ? it.bobot : 0}" oninput="window.app.updateRabModalField(${idx}, 'bobot', this.value)" />
                      </td>
                      <td>
                        <input type="number" step="0.01" id="rab_p0_${idx}" class="form-control" style="font-size:12px;padding:5px 6px;text-align:right;background:#f8fafc;" value="${it.p0 !== undefined ? it.p0 : 0}" oninput="window.app.updateRabModalField(${idx}, 'p0', this.value)" />
                      </td>
                      <td>
                        <input type="number" step="0.01" id="rab_p50_${idx}" class="form-control" style="font-size:12px;padding:5px 6px;text-align:right;" value="${it.p50 !== undefined ? it.p50 : 0}" oninput="window.app.updateRabModalField(${idx}, 'p50', this.value)" />
                        <div style="display:flex;gap:3px;justify-content:center;margin-top:2px;">
                          <span class="badge" style="cursor:pointer;font-size:9px;padding:1px 3px;background:#e0f2fe;color:#0369a1;" onclick="window.app.quickSetStage50(${idx}, 'FULL')" title="Selesai penuh di 50% (= Bobot)">Penuh</span>
                          <span class="badge" style="cursor:pointer;font-size:9px;padding:1px 3px;background:#fef3c7;color:#92400e;" onclick="window.app.quickSetStage50(${idx}, 'BALANCE')" title="Sisa agar total pas 50%">Auto</span>
                          <span class="badge" style="cursor:pointer;font-size:9px;padding:1px 3px;background:#f1f5f9;color:#64748b;" onclick="window.app.quickSetStage50(${idx}, 'ZERO')" title="Belum di 50% (0%)">0%</span>
                        </div>
                      </td>
                      <td>
                        <input type="number" step="0.01" id="rab_p100_${idx}" class="form-control" style="font-size:12px;padding:5px 6px;text-align:right;font-weight:700;background:#f0fdf4;color:#166534;" value="${it.p100 !== undefined ? it.p100 : 0}" oninput="window.app.updateRabModalField(${idx}, 'p100', this.value)" />
                      </td>
                      <td>
                        <input type="text" class="form-control" style="font-size:12px;padding:5px 8px;" value="${escapeHtml(it.keterangan || '')}" oninput="window.app.updateRabModalField(${idx}, 'keterangan', this.value)" placeholder="Catatan/keterangan..." />
                      </td>
                      <td style="text-align:center;">
                        <button class="btn btn-sm btn-danger" style="padding:3px 7px;" title="Hapus baris ini" onclick="window.app.deleteRabModalRow(${idx})">🗑️</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
                <tfoot>
                  <tr style="background:#f1f5f9;font-weight:bold;font-size:12px;">
                    <td colspan="2" style="text-align:center;">TOTAL PROGRES FISIK</td>
                    <td id="rabTotalBobotCell" style="text-align:right;color:${is100 ? '#16a34a' : '#dc2626'};font-weight:800;">${totalBobot.toFixed(2).replace('.', ',')}%</td>
                    <td id="rabTotal0Cell" style="text-align:right;">${totalP0.toFixed(2).replace('.', ',')}%</td>
                    <td id="rabTotal50Cell" style="text-align:right;color:${Math.abs(totalP50 - 50) < 0.01 ? '#16a34a' : '#b45309'};font-weight:800;">${totalP50.toFixed(2).replace('.', ',')}%</td>
                    <td id="rabTotal100Cell" style="text-align:right;color:${is100 ? '#16a34a' : '#dc2626'};font-weight:800;">${totalP100.toFixed(2).replace('.', ',')}%</td>
                    <td colspan="2" id="rabBadgeStatus">
                      ${is100
                        ? `<span class="badge badge-100">✅ Bobot Pas 100%</span>`
                        : `<span class="badge badge-0" style="color:#b91c1c;">⚠️ Total Bobot ${totalBobot.toFixed(2).replace('.', ',')}% (Harus 100%)</span>`
                      }
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div style="margin-top:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;font-size:12px;color:#475569;">
              💡 <strong>Otomatisasi Cerdas:</strong>
              <ul style="margin:4px 0 0 16px;padding:0;line-height:1.55;">
                <li>Cukup ketik angka di kolom <strong>Bobot (%)</strong>:
                  <ul>
                    <li>Kolom <strong>0%</strong> otomatis diset <code>0</code>.</li>
                    <li>Kolom <strong>100%</strong> otomatis persis sama dengan <strong>Bobot</strong>.</li>
                    <li>Kolom <strong>50%</strong> otomatis menghitung item struktur penuh (Pondasi/Rangka) dan menggenapkan sisa ke Dinding sehingga pas 50,00%.</li>
                  </ul>
                </li>
                <li>Klik tombol <strong>⚡ Hitung Otomatis 0%, 50%, 100% Sesuai Bobot</strong> di kanan atas kapan saja untuk menyinkronkan seluruh baris sekaligus dalam 1 detik.</li>
              </ul>
            </div>

          </div>
          <div class="modal-footer" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <div id="rabFooterStatus">
              ${is100
                ? `<span style="color:#16a34a;font-weight:700;font-size:13px;">✓ Total Bobot Valid (100,00%)</span>`
                : `<span style="color:#dc2626;font-weight:700;font-size:13px;">⚠️ Total Bobot: ${totalBobot.toFixed(2).replace('.', ',')}% (disarankan genap 100%)</span>`
              }
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-outline" onclick="window.app.closeModal()">Batal</button>
              <button class="btn btn-primary" onclick="window.app.saveRabModal()">
                💾 Simpan Penyesuaian RAB &amp; SPK
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function updateRabModalField(idx, field, rawVal) {
    const it = _rabModalItems[idx];
    if (!it) return;

    if (field === 'uraian' || field === 'keterangan') {
      it[field] = rawVal;
      return;
    }

    const num = Number(String(rawVal).replace(',', '.')) || 0;
    it[field] = num;

    // OTOMATISASI KETIKA MENGETIK BOBOT:
    if (field === 'bobot') {
      // 1. Kolom 0% otomatis 0
      it.p0 = 0;
      const inp0 = document.getElementById(`rab_p0_${idx}`);
      if (inp0) inp0.value = 0;

      // 2. Kolom 100% otomatis sama dengan Bobot
      it.p100 = num;
      const inp100 = document.getElementById(`rab_p100_${idx}`);
      if (inp100) inp100.value = num;

      // 3. Kolom 50%:
      if (idx < 3) {
        // Item persiapan, pondasi, struktur rangka (idx 0, 1, 2) selesai penuh di tahap 50%
        it.p50 = num;
        const inp50 = document.getElementById(`rab_p50_${idx}`);
        if (inp50) inp50.value = num;
      } else if (idx >= 4) {
        // Item atap, pintu, MEP, finishing (idx 4..dst) belum di tahap 50%
        it.p50 = 0;
        const inp50 = document.getElementById(`rab_p50_${idx}`);
        if (inp50) inp50.value = 0;
      } else if (idx === 3) {
        // Item dinding/partisi auto sisa agar tahap 50% genap 50.00%
        const other50 = _rabModalItems.reduce((acc, x, i) => i === 3 ? acc : acc + (Number(x.p50) || 0), 0);
        const sisa = Math.max(0, Math.round((50 - other50) * 100) / 100);
        it.p50 = sisa;
        const inp50 = document.getElementById(`rab_p50_${idx}`);
        if (inp50) inp50.value = sisa;
      }
    }

    refreshRabModalTotals();
  }

  function quickSetStage50(idx, mode) {
    const it = _rabModalItems[idx];
    if (!it) return;
    const numBobot = Number(it.bobot) || 0;
    if (mode === 'FULL') {
      it.p50 = numBobot;
    } else if (mode === 'ZERO') {
      it.p50 = 0;
    } else if (mode === 'BALANCE') {
      const otherSum = _rabModalItems.reduce((acc, x, i) => i === idx ? acc : acc + (Number(x.p50) || 0), 0);
      const sisa = Math.max(0, Math.round((50 - otherSum) * 100) / 100);
      it.p50 = sisa;
    }
    const inp50 = document.getElementById(`rab_p50_${idx}`);
    if (inp50) inp50.value = it.p50;
    refreshRabModalTotals();
  }

  function autoCalculateAllStages() {
    let sumAwal = 0;
    _rabModalItems.forEach((it, idx) => {
      it.p0 = 0;
      it.p100 = Number(it.bobot) || 0;
      if (idx < 3) {
        it.p50 = Number(it.bobot) || 0;
        sumAwal += it.p50;
      } else {
        it.p50 = 0;
      }
    });

    if (_rabModalItems.length > 3) {
      const sisa50 = Math.max(0, Math.round((50 - sumAwal) * 100) / 100);
      _rabModalItems[3].p50 = sisa50;
    }

    renderRabModalContent();
  }

  function refreshRabModalTotals() {
    const totalBobot = _rabModalItems.reduce((acc, it) => acc + (Number(it.bobot) || 0), 0);
    const totalP0 = _rabModalItems.reduce((acc, it) => acc + (Number(it.p0) || 0), 0);
    const totalP50 = _rabModalItems.reduce((acc, it) => acc + (Number(it.p50) || 0), 0);
    const totalP100 = _rabModalItems.reduce((acc, it) => acc + (Number(it.p100) || 0), 0);
    const is100 = Math.abs(totalBobot - 100) < 0.01;
    const is50 = Math.abs(totalP50 - 50) < 0.01;

    const elTotalBobot = document.getElementById('rabTotalBobotCell');
    if (elTotalBobot) {
      elTotalBobot.textContent = totalBobot.toFixed(2).replace('.', ',') + '%';
      elTotalBobot.style.color = is100 ? '#16a34a' : '#dc2626';
    }
    const elTotal0 = document.getElementById('rabTotal0Cell');
    if (elTotal0) elTotal0.textContent = totalP0.toFixed(2).replace('.', ',') + '%';

    const elTotal50 = document.getElementById('rabTotal50Cell');
    if (elTotal50) {
      elTotal50.textContent = totalP50.toFixed(2).replace('.', ',') + '%';
      elTotal50.style.color = is50 ? '#16a34a' : '#b45309';
    }

    const elTotal100 = document.getElementById('rabTotal100Cell');
    if (elTotal100) {
      elTotal100.textContent = totalP100.toFixed(2).replace('.', ',') + '%';
      elTotal100.style.color = is100 ? '#16a34a' : '#dc2626';
    }

    const elBadge = document.getElementById('rabBadgeStatus');
    if (elBadge) {
      elBadge.innerHTML = is100
        ? `<span class="badge badge-100">✅ Bobot Pas 100%</span>`
        : `<span class="badge badge-0" style="color:#b91c1c;">⚠️ Total Bobot ${totalBobot.toFixed(2).replace('.', ',')}% (Harus 100%)</span>`;
    }

    const elFooterStatus = document.getElementById('rabFooterStatus');
    if (elFooterStatus) {
      elFooterStatus.innerHTML = is100
        ? `<span style="color:#16a34a;font-weight:700;font-size:13px;">✓ Total Bobot Valid (100,00%)</span>`
        : `<span style="color:#dc2626;font-weight:700;font-size:13px;">⚠️ Total Bobot: ${totalBobot.toFixed(2).replace('.', ',')}% (disarankan genap 100%)</span>`;
    }
  }

  function addRabModalRow() {
    _rabModalItems.push({
      no: _rabModalItems.length + 1,
      uraian: 'Pekerjaan Baru',
      bobot: 0.0,
      p0: 0.0,
      p50: 0.0,
      p100: 0.0,
      keterangan: ''
    });
    renderRabModalContent();
  }

  function deleteRabModalRow(idx) {
    if (_rabModalItems.length <= 1) {
      alert('Minimal harus ada 1 baris pekerjaan.');
      return;
    }
    _rabModalItems.splice(idx, 1);
    renderRabModalContent();
  }

  function resetRabModalToDefault() {
    if (confirm('Kembalikan item pekerjaan ke 8 item standar laporan.pdf?')) {
      _rabModalItems = getDefaultRabItems();
      renderRabModalContent();
    }
  }

  function saveRabModal() {
    _rabModalItems.forEach((it, i) => { it.no = i + 1; });
    state.settings.itemRab = JSON.parse(JSON.stringify(_rabModalItems));
    saveState('Item pekerjaan RAB / SPK berhasil disesuaikan');
    closeModal();
    renderAll();
  }

  /* ========================================================================
     MODALS: VENDOR MODAL & UNIT DETAIL/PHOTO MODAL
     ======================================================================== */
  function closeModal() {
    document.getElementById('modalRoot').innerHTML = '';
  }

  function openVendorModal(vendorId = null) {
    const existing = vendorId ? state.vendors.find(v => v.id === vendorId) : null;
    const v = existing || {
      id: 'vendor-' + Date.now(),
      nama: '',
      subJudul: 'KONTRAKTOR - LEVERANSIR',
      direktur: '',
      jabatan: 'Direktur',
      alamat: '',
      kotaTtd: 'Mbay',
      kabupaten: 'Kabupaten Nagekeo',
      provinsi: 'Provinsi Nusa Tenggara Timur',
      namaBank: 'PT. BANK NEGARA INDONESIA (BNI)',
      noRekening: '',
      atasNamaRekening: '',
      kodeSurat: 'CV',
      hargaSatuan: 34500000,
      ppnPersen: 11,
      pphPersen: 1.75,
      logoUrl: '/assets/logo-emka.svg',
      ttdStempelUrl: ''
    };

    const modalRoot = document.getElementById('modalRoot');
    modalRoot.innerHTML = `
      <div class="modal-backdrop" onclick="if(event.target===this) window.app.closeModal()">
        <div class="modal-content">
          <div class="modal-header">
            <h3>🏢 ${existing ? `Edit Profil Perusahaan: ${escapeHtml(v.nama)}` : 'Tambah Perusahaan / Vendor Baru'}</h3>
            <button class="btn btn-sm btn-danger" onclick="window.app.closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <div class="grid-2">
              <div class="form-group">
                <label>Nama Perusahaan (CV / PT)</label>
                <input type="text" id="v_nama" class="form-control" value="${escapeHtml(v.nama)}" placeholder="Contoh: CV. EMKA UTAMA" />
              </div>
              <div class="form-group">
                <label>Sub-Judul Kop Surat</label>
                <input type="text" id="v_subJudul" class="form-control" value="${escapeHtml(v.subJudul)}" placeholder="Contoh: KONTRAKTOR - LEVERANSIR" />
              </div>
              <div class="form-group">
                <label>Nama Lengkap Direktur</label>
                <input type="text" id="v_direktur" class="form-control" value="${escapeHtml(v.direktur)}" placeholder="Nama Direktur penandatangan berkas" />
              </div>
              <div class="form-group">
                <label>Jabatan Penandatangan</label>
                <input type="text" id="v_jabatan" class="form-control" value="${escapeHtml(v.jabatan)}" placeholder="Direktur" />
              </div>
              <div class="form-group">
                <label>Alamat Lengkap Perusahaan (Muncul di Kop Surat & Invoice)</label>
                <input type="text" id="v_alamat" class="form-control" value="${escapeHtml(v.alamat)}" placeholder="Kel. Mauponggo, Kec. Mauponggo, Kab. Nagekeo Prov. NTT" />
              </div>
              <div class="form-group">
                <label>No. Telepon Perusahaan (Muncul di Invoice)</label>
                <input type="text" id="v_telepon" class="form-control" value="${escapeHtml(v.telepon || '0812 - 3982 - 0000')}" placeholder="0812 - 3982 - 0000" />
              </div>
              <div class="form-group">
                <label>Kota Tempat Tanda Tangan Surat</label>
                <input type="text" id="v_kotaTtd" class="form-control" value="${escapeHtml(v.kotaTtd)}" placeholder="Contoh: Mbay / Deli Serdang" />
              </div>
              <div class="form-group">
                <label>Kode Singkatan Nomor Surat</label>
                <input type="text" id="v_kodeSurat" class="form-control" value="${escapeHtml(v.kodeSurat)}" placeholder="Contoh: EMKA" />
              </div>
              <div class="form-group">
                <label>Kabupaten Lokasi Proyek</label>
                <input type="text" id="v_kabupaten" class="form-control" value="${escapeHtml(v.kabupaten)}" placeholder="KABUPATEN NAGEKEO" />
              </div>
              <div class="form-group">
                <label>Provinsi Lokasi Proyek</label>
                <input type="text" id="v_provinsi" class="form-control" value="${escapeHtml(v.provinsi)}" placeholder="PROVINSI NUSA TENGGARA TIMUR" />
              </div>
              <div class="form-group">
                <label>Nama Bank</label>
                <input type="text" id="v_namaBank" class="form-control" value="${escapeHtml(v.namaBank)}" placeholder="PT. BANK NEGARA INDONESIA (BNI)" />
              </div>
              <div class="form-group">
                <label>Nomor Rekening Pencairan</label>
                <input type="text" id="v_noRekening" class="form-control" value="${escapeHtml(v.noRekening)}" placeholder="Nomor Rekening" />
              </div>
              <div class="form-group">
                <label>Atas Nama Rekening</label>
                <input type="text" id="v_atasNamaRekening" class="form-control" value="${escapeHtml(v.atasNamaRekening || v.nama)}" />
              </div>
              <div class="form-group">
                <label>Harga Satuan per Unit Huntara (Rp)</label>
                <input type="number" id="v_hargaSatuan" class="form-control" value="${v.hargaSatuan}" />
              </div>
              <div class="form-group">
                <label>Tarif PPN (%)</label>
                <input type="number" step="0.01" id="v_ppnPersen" class="form-control" value="${v.ppnPersen}" />
              </div>
              <div class="form-group">
                <label>Tarif PPh Konstruksi (%)</label>
                <input type="number" step="0.01" id="v_pphPersen" class="form-control" value="${v.pphPersen}" />
              </div>
            </div>

            <!-- 4 KOTAK UPLOAD ASET RESMI PERUSAHAAN: LOGO, KOP SURAT, TT & CAP, SPESIMEN -->
            <div style="margin-top:10px;border-top:1px solid #e2e8f0;padding-top:14px;">
              <h4 style="font-size:14px;color:var(--primary);margin-bottom:10px;">
                🖼️ Upload Aset Dokumen Perusahaan (Logo, Kop Surat, TT & Cap, serta Spesimen)
              </h4>
              <div class="photo-slot-grid" style="grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));">
                <!-- 1. UPLOAD LOGO PERUSAHAAN -->
                <div class="photo-slot">
                  <strong style="font-size:12px;">1. Logo Perusahaan</strong>
                  <span style="font-size:11px;color:var(--text-muted)">Tampil di Invoice & Header Dokumentasi</span>
                  <div id="preview_v_logoUrl" style="width:100%;">
                    ${v.logoUrl ? `<img src="${escapeHtml(v.logoUrl)}" alt="Logo" style="height:110px;object-fit:contain;" />` : `<div class="photo-placeholder" style="height:110px;">Belum Ada Logo</div>`}
                  </div>
                  <input type="hidden" id="v_logoUrl" value="${escapeHtml(v.logoUrl || '')}" />
                  <div style="display:flex;gap:6px;width:100%;">
                    <label class="btn btn-outline btn-sm" style="flex:1;cursor:pointer;">
                      📤 Upload Logo
                      <input type="file" accept="image/*" style="display:none;" onchange="window.app.handleVendorImageUpload(this, 'v_logoUrl', 'logo')" />
                    </label>
                    <button type="button" class="btn btn-danger btn-sm" title="Hapus Logo" onclick="window.app.clearVendorImageField('v_logoUrl', 'Belum Ada Logo')">🗑️ Hapus</button>
                  </div>
                </div>

                <!-- 2. UPLOAD KOP SURAT PERUSAHAAN -->
                <div class="photo-slot">
                  <strong style="font-size:12px;">2. Kop Surat Perusahaan</strong>
                  <span style="font-size:11px;color:var(--text-muted)">Banner Kop Surat Utuh (SPP, SPS & Cover)</span>
                  <div id="preview_v_kopSuratUrl" style="width:100%;">
                    ${v.kopSuratUrl ? `<img src="${escapeHtml(v.kopSuratUrl)}" alt="Kop Surat" style="height:110px;object-fit:contain;" />` : `<div class="photo-placeholder" style="height:110px;">Pakai Kop Teks Otomatis</div>`}
                  </div>
                  <input type="hidden" id="v_kopSuratUrl" value="${escapeHtml(v.kopSuratUrl || '')}" />
                  <div style="display:flex;gap:6px;width:100%;">
                    <label class="btn btn-outline btn-sm" style="flex:1;cursor:pointer;">
                      📤 Upload Kop Surat
                      <input type="file" accept="image/*" style="display:none;" onchange="window.app.handleVendorImageUpload(this, 'v_kopSuratUrl', 'kop')" />
                    </label>
                    <button type="button" class="btn btn-danger btn-sm" title="Hapus Kop Surat" onclick="window.app.clearVendorImageField('v_kopSuratUrl', 'Pakai Kop Teks Otomatis')">🗑️ Hapus</button>
                  </div>
                </div>

                <!-- 3. UPLOAD TT & CAP (TANDA TANGAN + STEMPEL) -->
                <div class="photo-slot">
                  <strong style="font-size:12px;">3. TT & Cap (TTD + Stempel)</strong>
                  <span style="font-size:11px;color:var(--text-muted)">Otomatis muncul di TTD Direktur</span>
                  <div id="preview_v_ttdStempelUrl" style="width:100%;">
                    ${v.ttdStempelUrl ? `<img src="${escapeHtml(v.ttdStempelUrl)}" alt="TT Cap" style="height:110px;object-fit:contain;" />` : `<div class="photo-placeholder" style="height:110px;">Belum Ada TT & Cap</div>`}
                  </div>
                  <input type="hidden" id="v_ttdStempelUrl" value="${escapeHtml(v.ttdStempelUrl || '')}" />
                  <div style="display:flex;gap:6px;width:100%;">
                    <label class="btn btn-outline btn-sm" style="flex:1;cursor:pointer;">
                      📤 Upload TT & Cap
                      <input type="file" accept="image/*" style="display:none;" onchange="window.app.handleVendorImageUpload(this, 'v_ttdStempelUrl', 'ttd')" />
                    </label>
                    <button type="button" class="btn btn-danger btn-sm" title="Hapus TT & Cap" onclick="window.app.clearVendorImageField('v_ttdStempelUrl', 'Belum Ada TT & Cap')">🗑️ Hapus</button>
                  </div>
                </div>

                <!-- 4. UPLOAD SPESIMEN -->
                <div class="photo-slot">
                  <strong style="font-size:12px;">4. Spesimen (Cap / TTD Resmi)</strong>
                  <span style="font-size:11px;color:var(--text-muted)">Arsip Spesimen Resmi Perusahaan</span>
                  <div id="preview_v_spesimenUrl" style="width:100%;">
                    ${v.spesimenUrl ? `<img src="${escapeHtml(v.spesimenUrl)}" alt="Spesimen" style="height:110px;object-fit:contain;" />` : `<div class="photo-placeholder" style="height:110px;">Belum Ada Spesimen</div>`}
                  </div>
                  <input type="hidden" id="v_spesimenUrl" value="${escapeHtml(v.spesimenUrl || '')}" />
                  <div style="display:flex;gap:6px;width:100%;">
                    <label class="btn btn-outline btn-sm" style="flex:1;cursor:pointer;">
                      📤 Upload Spesimen
                      <input type="file" accept="image/*" style="display:none;" onchange="window.app.handleVendorImageUpload(this, 'v_spesimenUrl', 'spesimen')" />
                    </label>
                    <button type="button" class="btn btn-danger btn-sm" title="Hapus Spesimen" onclick="window.app.clearVendorImageField('v_spesimenUrl', 'Belum Ada Spesimen')">🗑️ Hapus</button>
                  </div>
                </div>

                <!-- 5. UPLOAD LOGO PROVINSI (UNTUK HEADER LAPORAN PROGRES) -->
                <div class="photo-slot">
                  <strong style="font-size:12px;">5. Logo Pemerintah Provinsi</strong>
                  <span style="font-size:11px;color:var(--text-muted)">Tampil di Header Laporan Progres Fisik</span>
                  <div id="preview_v_logoProvinsiUrl" style="width:100%;">
                    <img src="${escapeHtml(v.logoProvinsiUrl || '/assets/logo-provinsi.svg')}" alt="Logo Provinsi" style="height:110px;object-fit:contain;" />
                  </div>
                  <input type="hidden" id="v_logoProvinsiUrl" value="${escapeHtml(v.logoProvinsiUrl || '/assets/logo-provinsi.svg')}" />
                  <div style="display:flex;gap:6px;width:100%;">
                    <label class="btn btn-outline btn-sm" style="flex:1;cursor:pointer;">
                      📤 Upload Logo Prov
                      <input type="file" accept="image/*" style="display:none;" onchange="window.app.handleVendorImageUpload(this, 'v_logoProvinsiUrl', 'prov')" />
                    </label>
                    <button type="button" class="btn btn-outline btn-sm" title="Kembalikan ke Default" onclick="window.app.resetVendorLogoField('v_logoProvinsiUrl', '/assets/logo-provinsi.svg')">↺ Default</button>
                  </div>
                </div>

                <!-- 6. UPLOAD LOGO KABUPATEN (UNTUK HEADER LAPORAN PROGRES) -->
                <div class="photo-slot">
                  <strong style="font-size:12px;">6. Logo Pemerintah Kabupaten</strong>
                  <span style="font-size:11px;color:var(--text-muted)">Tampil di Header Laporan Progres Fisik</span>
                  <div id="preview_v_logoKabupatenUrl" style="width:100%;">
                    <img src="${escapeHtml(v.logoKabupatenUrl || '/assets/logo-kabupaten.svg')}" alt="Logo Kabupaten" style="height:110px;object-fit:contain;" />
                  </div>
                  <input type="hidden" id="v_logoKabupatenUrl" value="${escapeHtml(v.logoKabupatenUrl || '/assets/logo-kabupaten.svg')}" />
                  <div style="display:flex;gap:6px;width:100%;">
                    <label class="btn btn-outline btn-sm" style="flex:1;cursor:pointer;">
                      📤 Upload Logo Kab
                      <input type="file" accept="image/*" style="display:none;" onchange="window.app.handleVendorImageUpload(this, 'v_logoKabupatenUrl', 'kab')" />
                    </label>
                    <button type="button" class="btn btn-outline btn-sm" title="Kembalikan ke Default" onclick="window.app.resetVendorLogoField('v_logoKabupatenUrl', '/assets/logo-kabupaten.svg')">↺ Default</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="window.app.closeModal()">Batal</button>
            <button class="btn btn-primary" onclick="window.app.saveVendorModal('${escapeHtml(v.id)}', ${Boolean(existing)})">
              💾 Simpan Profil Perusahaan
            </button>
          </div>
        </div>
      </div>
    `;
  }

  async function handleVendorImageUpload(inputEl, hiddenId, prefix) {
    if (!inputEl.files || !inputEl.files[0]) return;
    const url = await uploadImageFile(inputEl.files[0], prefix);
    const hidden = document.getElementById(hiddenId);
    if (hidden) hidden.value = url;
    const previewBox = document.getElementById('preview_' + hiddenId);
    if (previewBox) {
      previewBox.innerHTML = `<img src="${escapeHtml(url)}" alt="Preview" style="height:110px;object-fit:contain;" />`;
    }
  }

  function clearVendorImageField(hiddenId, placeholderText) {
    const hidden = document.getElementById(hiddenId);
    if (hidden) hidden.value = '';
    const previewBox = document.getElementById('preview_' + hiddenId);
    if (previewBox) {
      previewBox.innerHTML = `<div class="photo-placeholder" style="height:110px;">${escapeHtml(placeholderText)}</div>`;
    }
  }

  function saveVendorModal(id, isExisting) {
    const nama = document.getElementById('v_nama').value.trim() || 'CV. VENDOR BARU';
    const updated = {
      id,
      nama,
      subJudul: document.getElementById('v_subJudul').value.trim(),
      direktur: document.getElementById('v_direktur').value.trim(),
      jabatan: document.getElementById('v_jabatan').value.trim() || 'Direktur',
      alamat: document.getElementById('v_alamat').value.trim(),
      telepon: document.getElementById('v_telepon')?.value.trim() || '0812 - 3982 - 0000',
      kotaTtd: document.getElementById('v_kotaTtd').value.trim() || 'Mauponggo',
      kodeSurat: document.getElementById('v_kodeSurat').value.trim() || 'CV',
      kabupaten: document.getElementById('v_kabupaten').value.trim(),
      provinsi: document.getElementById('v_provinsi').value.trim(),
      namaBank: document.getElementById('v_namaBank').value.trim(),
      noRekening: document.getElementById('v_noRekening').value.trim(),
      atasNamaRekening: document.getElementById('v_atasNamaRekening').value.trim() || nama,
      hargaSatuan: Number(document.getElementById('v_hargaSatuan').value) || 34500000,
      ppnPersen: Number(document.getElementById('v_ppnPersen').value) || 11,
      pphPersen: Number(document.getElementById('v_pphPersen').value) || 1.75,
      logoUrl: document.getElementById('v_logoUrl').value,
      kopSuratUrl: document.getElementById('v_kopSuratUrl')?.value || '',
      ttdStempelUrl: document.getElementById('v_ttdStempelUrl').value,
      spesimenUrl: document.getElementById('v_spesimenUrl')?.value || '',
      logoProvinsiUrl: document.getElementById('v_logoProvinsiUrl')?.value || '/assets/logo-provinsi.svg',
      logoKabupatenUrl: document.getElementById('v_logoKabupatenUrl')?.value || '/assets/logo-kabupaten.svg'
    };

    if (isExisting) {
      const idx = state.vendors.findIndex(v => v.id === id);
      if (idx >= 0) state.vendors[idx] = updated;
    } else {
      state.vendors.push(updated);
      state.selectedVendorId = updated.id;
    }

    closeModal();
    saveState('Profil perusahaan disimpan');
    renderAll();
  }

  function resetVendorLogoField(hiddenId, defaultUrl) {
    const hidden = document.getElementById(hiddenId);
    if (hidden) hidden.value = defaultUrl;
    const previewBox = document.getElementById('preview_' + hiddenId);
    if (previewBox) {
      previewBox.innerHTML = `<img src="${escapeHtml(defaultUrl)}" alt="Logo" style="height:110px;object-fit:contain;" />`;
    }
  }

  /* ========================================================================
     MODAL KHUSUS UPLOAD LOGO PEMDA (PROVINSI & KABUPATEN)
     ======================================================================== */
  function openLogoHeaderModal(vendorId) {
    const v = (vendorId ? getVendorById(vendorId) : null) || (state.selectedVendorId !== 'ALL' ? getVendorById(state.selectedVendorId) : state.vendors[0]);
    if (!v) return;

    const currentProvLogo = v.logoProvinsiUrl || '/assets/logo-provinsi.svg';
    const currentKabLogo = v.logoKabupatenUrl || '/assets/logo-kabupaten.svg';
    const provNama = v.provinsi || 'NUSA TENGGARA TIMUR';
    const kabNama = v.kabupaten || 'NAGEKEO';

    const modalEl = document.getElementById('modal-container');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="modal-backdrop" onclick="if(event.target===this) window.app.closeModal()">
        <div class="modal-card" style="max-width:820px;width:95%;">
          <div class="modal-header">
            <div>
              <h3 style="margin:0;display:flex;align-items:center;gap:8px;">
                <span>🏛️</span> Upload &amp; Ganti Logo Pemda (Provinsi &amp; Kabupaten)
              </h3>
              <p style="font-size:12px;color:var(--text-muted);margin:4px 0 0 0;">
                Atur Logo Resmi Pemerintah Provinsi &amp; Kabupaten yang tampil pada Kop Laporan 4 Logo (${escapeHtml(v.nama)})
              </p>
            </div>
            <button class="btn btn-outline btn-sm" onclick="window.app.closeModal()">✕</button>
          </div>

          <div class="modal-body" style="padding:16px;">
            <!-- PREVIEW KOP 4 LOGO REAL-TIME -->
            <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:12px;margin-bottom:18px;">
              <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
                👁️ Live Preview Kop 4 Logo Pada Dokumen Laporan:
              </div>
              <div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:12px;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                <!-- LOGO KIRI (BNPB + PROV) -->
                <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;">
                  <div style="width:48px;height:48px;border:1px dashed #cbd5e1;padding:2px;display:flex;align-items:center;justify-content:center;background:#fff;">
                    <img src="/assets/logo-bnpb.png" alt="BNPB" style="max-height:42px;max-width:42px;object-fit:contain;" />
                  </div>
                  <div id="live_prev_prov_box" style="width:48px;height:48px;border:2px solid #2563eb;border-radius:4px;padding:2px;display:flex;align-items:center;justify-content:center;background:#eff6ff;" title="Slot 2: Logo Pemerintah Provinsi">
                    <img id="live_prev_prov_img" src="${escapeHtml(currentProvLogo)}" alt="Logo Prov" style="max-height:42px;max-width:42px;object-fit:contain;" />
                  </div>
                </div>

                <!-- TEKS TENGAH KOP -->
                <div style="text-align:center;flex:1;font-family:'Arial',sans-serif;">
                  <div style="font-weight:800;font-size:11px;color:#0f172a;letter-spacing:0.3px;">BADAN NASIONAL PENANGGULANGAN BENCANA (BNPB)</div>
                  <div style="font-weight:700;font-size:10px;color:#1e293b;line-height:1.2;margin:2px 0;">
                    PEMERINTAH PROVINSI <span id="live_prev_prov_text">${escapeHtml(provNama.toUpperCase())}</span> — PEMERINTAH KABUPATEN <span id="live_prev_kab_text">${escapeHtml(kabNama.toUpperCase())}</span>
                  </div>
                  <div style="font-weight:800;font-size:10px;color:#b45309;">PELAKSANA: ${escapeHtml(v.nama)}</div>
                </div>

                <!-- LOGO KANAN (KAB + VENDOR) -->
                <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;">
                  <div id="live_prev_kab_box" style="width:48px;height:48px;border:2px solid #16a34a;border-radius:4px;padding:2px;display:flex;align-items:center;justify-content:center;background:#f0fdf4;" title="Slot 3: Logo Pemerintah Kabupaten">
                    <img id="live_prev_kab_img" src="${escapeHtml(currentKabLogo)}" alt="Logo Kab" style="max-height:42px;max-width:42px;object-fit:contain;" />
                  </div>
                  <div style="width:48px;height:48px;border:1px dashed #cbd5e1;padding:2px;display:flex;align-items:center;justify-content:center;background:#fff;">
                    <img src="${escapeHtml(v.logoUrl || '/assets/logo-emka-real_0.png')}" alt="Logo Vendor" style="max-height:42px;max-width:42px;object-fit:contain;" />
                  </div>
                </div>
              </div>
            </div>

            <!-- DUA KOLOM PENGATURAN LOGO -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
              
              <!-- 1. LOGO PROVINSI -->
              <div style="border:1px solid #bfdbfe;background:#f8fafc;border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <strong style="font-size:13px;color:#1e40af;display:flex;align-items:center;gap:6px;">
                    <span>📍</span> 1. Logo Pemerintah Provinsi
                  </strong>
                  <span style="font-size:10px;background:#dbeafe;color:#1e40af;padding:2px 6px;border-radius:4px;font-weight:600;">Kop Kiri #2</span>
                </div>

                <div style="background:#fff;border:1px solid #cbd5e1;border-radius:6px;padding:12px;text-align:center;min-height:120px;display:flex;align-items:center;justify-content:center;">
                  <img id="modal_prov_img_preview" src="${escapeHtml(currentProvLogo)}" alt="Logo Provinsi" style="max-height:100px;max-width:100%;object-fit:contain;" />
                </div>
                <input type="hidden" id="modal_prov_logo_val" value="${escapeHtml(currentProvLogo)}" />

                <div class="form-group" style="margin-bottom:0;">
                  <label style="font-size:11px;font-weight:600;color:#475569;">Nama Provinsi di KOP</label>
                  <input type="text" id="modal_prov_name" class="form-control" style="font-size:12px;font-weight:700;" value="${escapeHtml(provNama)}" oninput="document.getElementById('live_prev_prov_text').innerText = this.value.toUpperCase()" />
                </div>

                <div style="display:flex;gap:8px;">
                  <label class="btn btn-primary btn-sm" style="flex:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
                    📤 Upload Logo Baru
                    <input type="file" accept="image/*" style="display:none;" onchange="window.app.handleQuickLogoUpload(this, 'modal_prov_logo_val', 'modal_prov_img_preview', 'live_prev_prov_img')" />
                  </label>
                  <button type="button" class="btn btn-outline btn-sm" title="Kembalikan ke Logo Default NTT" onclick="window.app.resetQuickLogo('modal_prov_logo_val', '/assets/logo-provinsi.svg', 'modal_prov_img_preview', 'live_prev_prov_img')">
                    ↺ Default
                  </button>
                </div>
                <span style="font-size:11px;color:#64748b;">Format disarankan: PNG transparan atau JPG.</span>
              </div>

              <!-- 2. LOGO KABUPATEN -->
              <div style="border:1px solid #bbf7d0;background:#f8fafc;border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <strong style="font-size:13px;color:#15803d;display:flex;align-items:center;gap:6px;">
                    <span>🏛️</span> 2. Logo Pemerintah Kabupaten
                  </strong>
                  <span style="font-size:10px;background:#dcfce7;color:#15803d;padding:2px 6px;border-radius:4px;font-weight:600;">Kop Kanan #1</span>
                </div>

                <div style="background:#fff;border:1px solid #cbd5e1;border-radius:6px;padding:12px;text-align:center;min-height:120px;display:flex;align-items:center;justify-content:center;">
                  <img id="modal_kab_img_preview" src="${escapeHtml(currentKabLogo)}" alt="Logo Kabupaten" style="max-height:100px;max-width:100%;object-fit:contain;" />
                </div>
                <input type="hidden" id="modal_kab_logo_val" value="${escapeHtml(currentKabLogo)}" />

                <div class="form-group" style="margin-bottom:0;">
                  <label style="font-size:11px;font-weight:600;color:#475569;">Nama Kabupaten di KOP</label>
                  <input type="text" id="modal_kab_name" class="form-control" style="font-size:12px;font-weight:700;" value="${escapeHtml(kabNama)}" oninput="document.getElementById('live_prev_kab_text').innerText = this.value.toUpperCase()" />
                </div>

                <div style="display:flex;gap:8px;">
                  <label class="btn btn-success btn-sm" style="flex:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;background:#16a34a;border-color:#16a34a;color:#fff;">
                    📤 Upload Logo Baru
                    <input type="file" accept="image/*" style="display:none;" onchange="window.app.handleQuickLogoUpload(this, 'modal_kab_logo_val', 'modal_kab_img_preview', 'live_prev_kab_img')" />
                  </label>
                  <button type="button" class="btn btn-outline btn-sm" title="Kembalikan ke Logo Default Nagekeo" onclick="window.app.resetQuickLogo('modal_kab_logo_val', '/assets/logo-kabupaten.svg', 'modal_kab_img_preview', 'live_prev_kab_img')">
                    ↺ Default
                  </button>
                </div>
                <span style="font-size:11px;color:#64748b;">Format disarankan: PNG transparan atau JPG.</span>
              </div>

            </div>
          </div>

          <div class="modal-footer" style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:12px;color:#64748b;">💡 Perubahan logo akan langsung diperbarui pada seluruh lembar cetak berkas &amp; laporan fisik.</span>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-outline" onclick="window.app.closeModal()">Batal</button>
              <button class="btn btn-primary" onclick="window.app.saveLogoHeaderModal('${escapeHtml(v.id)}')">
                💾 Simpan Logo &amp; Terapkan
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async function handleQuickLogoUpload(inputEl, hiddenId, previewImgId, livePrevImgId) {
    if (!inputEl.files || !inputEl.files[0]) return;
    try {
      const url = await uploadImageFile(inputEl.files[0], 'pemda_logo');
      const hidden = document.getElementById(hiddenId);
      if (hidden) hidden.value = url;
      const prevImg = document.getElementById(previewImgId);
      if (prevImg) prevImg.src = url;
      const liveImg = document.getElementById(livePrevImgId);
      if (liveImg) liveImg.src = url;
    } catch (err) {
      alert('Gagal mengupload logo: ' + (err.message || err));
    }
  }

  function resetQuickLogo(hiddenId, defaultUrl, previewImgId, livePrevImgId) {
    const hidden = document.getElementById(hiddenId);
    if (hidden) hidden.value = defaultUrl;
    const prevImg = document.getElementById(previewImgId);
    if (prevImg) prevImg.src = defaultUrl;
    const liveImg = document.getElementById(livePrevImgId);
    if (liveImg) liveImg.src = defaultUrl;
  }

  function saveLogoHeaderModal(vendorId) {
    const v = getVendorById(vendorId);
    if (!v) return;

    const provLogo = document.getElementById('modal_prov_logo_val')?.value || '/assets/logo-provinsi.svg';
    const kabLogo = document.getElementById('modal_kab_logo_val')?.value || '/assets/logo-kabupaten.svg';
    const provName = document.getElementById('modal_prov_name')?.value?.trim();
    const kabName = document.getElementById('modal_kab_name')?.value?.trim();

    v.logoProvinsiUrl = provLogo;
    v.logoKabupatenUrl = kabLogo;
    if (provName) v.provinsi = provName;
    if (kabName) v.kabupaten = kabName;

    const idx = state.vendors.findIndex(item => item.id === v.id);
    if (idx >= 0) {
      state.vendors[idx] = v;
    }

    closeModal();
    saveState('Logo Pemda Provinsi & Kabupaten berhasil diperbarui');
    renderAll();
  }

  /* ========================================================================
     MODAL DETAIL RUMAH, PROGRES 0-50-100%, FOTO & PERUBAHAN DENAH
     ======================================================================== */
  function openUnitModal(unitId = null) {
    const existing = unitId ? state.units.find(u => u.id === unitId) : null;
    const defaultVendorId = state.selectedVendorId === 'ALL' ? state.vendors[0].id : state.selectedVendorId;
    const nextBnba = state.units.length + 1;

    const u = existing ? JSON.parse(JSON.stringify(existing)) : {
      id: 'unit-' + Date.now(),
      vendorId: defaultVendorId,
      noBnba: nextBnba,
      noInsitu: String(nextBnba).padStart(2, '0'),
      nama: '',
      nik: '',
      noKk: '',
      rt: '001',
      desa: 'Marapokot',
      kecamatan: 'Aesesa',
      kabupaten: 'Kabupaten Nagekeo',
      provinsi: 'Nusa Tenggara Timur',
      tambahan: true,
      ttl: '',
      noHp: '',
      progres: 0,
      check0: true,
      check50: [false, false, false, false, false, false],
      check100: [false, false, false, false],
      foto0: '',
      foto50: '',
      foto100_1: '',
      foto100_2: '',
      foto100_3: '',
      perubahanDenah: false,
      keteranganDenah: 'PEMILIK RUMAH INGIN MEMBANGUN CLOSET DI LUAR HUNTARA (MATERIAL DI BERIKAN)',
      alasanPerubahan: '',
      tglPernyataan: '',
      namaKepalaDesa: '',
      jabatanKepalaDesa: 'Kepala Desa / Lurah',
      fotoSuratPernyataan: '',
      batchId: null,
      statusTagihan: 'BELUM_DITAGIHKAN'
    };

    window._editingUnit = u;
    window._editingUnitIsExisting = Boolean(existing);
    renderUnitModalContent();
  }

  function renderUnitModalContent() {
    const u = window._editingUnit;
    if (!u) return;
    const p50Items = (state.settings.pekerjaan50 && state.settings.pekerjaan50.length > 0) ? state.settings.pekerjaan50 : [
      '1. PEKERJAAN PERSIAPAN (Pengukuran & Galian Tanah - Bobot 4,79%)',
      '2. PEKERJAAN LANTAI (Cor Rabat Beton Mutu K-175 - Bobot 2,64%)',
      '3. PEKERJAAN RANGKA DINDING (Baja Ringan C75 - Bobot 29,78%)',
      '4. PEKERJAAN DINDING (Pemasangan Partisi GRC Tahap 1 - Bobot 12,79%)'
    ];
    const p100Items = (state.settings.pekerjaan100 && state.settings.pekerjaan100.length > 0) ? state.settings.pekerjaan100 : [
      '1. PEKERJAAN DINDING & FINISHING (Partisi GRC Lengkap & Pengecatan Tembok)',
      '2. PEKERJAAN ATAP (Rangka Atap C75, Spandek & Lisplank KalsiPlank - Bobot 21,94%)',
      '3. PEKERJAAN PINTU DAN JENDELA (Pintu 80*200, 70*200 & Jendela - Bobot 6,97%)',
      '4. PEKERJAAN KANOPI (Rangka Kanopi & Atap Spandek - Bobot 1,10%)',
      '5. PEKERJAAN SANITASI (Closet Jongkok, Kran & Septictank Buis Beton - Bobot 3,55%)',
      '6. PEKERJAAN LISTRIK (Kabel NYM, Lampu LED, Saklar & MCB - Bobot 4,91%)'
    ];

    const modalRoot = document.getElementById('modalRoot');
    modalRoot.innerHTML = `
      <div class="modal-backdrop" onclick="if(event.target===this) window.app.closeModal()">
        <div class="modal-content">
          <div class="modal-header">
            <h3>🏠 ${window._editingUnitIsExisting ? `BNBA #${u.noBnba} — ${escapeHtml(u.nama)} (Desa ${escapeHtml(u.desa)})` : 'Tambah Penerima Huntara (BNBA) Baru'}</h3>
            <button class="btn btn-sm btn-danger" onclick="window.app.closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <!-- BAGIAN 1: BIODATA PENERIMA & LOKASI DESA -->
            <h4 style="margin-bottom:10px;color:var(--primary);">1. Identitas Penerima BNBA & Lokasi Desa</h4>
            <div class="grid-3" style="margin-bottom:18px;">
              <div class="form-group">
                <label>Perusahaan / Vendor</label>
                <select class="form-control" onchange="window._editingUnit.vendorId=this.value">
                  ${state.vendors.map(v => `<option value="${escapeHtml(v.id)}" ${u.vendorId === v.id ? 'selected' : ''}>${escapeHtml(v.nama)}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label>No. Urut BNBA & No. Insitu Desa</label>
                <div style="display:flex;gap:8px;">
                  <input type="number" class="form-control" style="width:50%" value="${u.noBnba}" oninput="window._editingUnit.noBnba=Number(this.value)" placeholder="BNBA" />
                  <input type="text" class="form-control" style="width:50%" value="${escapeHtml(u.noInsitu)}" oninput="window._editingUnit.noInsitu=this.value" placeholder="Insitu 01" />
                </div>
              </div>
              <div class="form-group">
                <label>Nama Lengkap Penerima (KK)</label>
                <input type="text" class="form-control" value="${escapeHtml(u.nama)}" oninput="window._editingUnit.nama=this.value" />
              </div>
              <div class="form-group">
                <label>NIK / Nomor KK (Untuk Tabel & Surat)</label>
                <input type="text" class="form-control" value="${escapeHtml(u.nik)}" oninput="window._editingUnit.nik=this.value" placeholder="Contoh: 531601..." />
              </div>
              <div class="form-group">
                <label>Nomor RT</label>
                <input type="text" class="form-control" value="${escapeHtml(u.rt)}" oninput="window._editingUnit.rt=this.value" placeholder="001" />
              </div>
              <div class="form-group">
                <label>Desa / Kelurahan</label>
                <input type="text" class="form-control" value="${escapeHtml(u.desa)}" oninput="window._editingUnit.desa=this.value" />
              </div>
              <div class="form-group">
                <label>Kecamatan</label>
                <input type="text" class="form-control" value="${escapeHtml(u.kecamatan)}" oninput="window._editingUnit.kecamatan=this.value" />
              </div>
              <div class="form-group">
                <label>Tempat / Tanggal Lahir (Opsional)</label>
                <input type="text" class="form-control" value="${escapeHtml(u.ttl || '')}" oninput="window._editingUnit.ttl=this.value" placeholder="Contoh: Mbay, 12-05-1975" />
              </div>
              <div class="form-group">
                <label>No. HP Warga (Opsional)</label>
                <input type="text" class="form-control" value="${escapeHtml(u.noHp || '')}" oninput="window._editingUnit.noHp=this.value" placeholder="08..." />
              </div>
              <div class="form-group">
                <label>Koordinat GPS Lokasi Unit (Lat, Long)</label>
                <input type="text" class="form-control" value="${escapeHtml(u.koordinatGps || '8°40\'12,45\"S, 121°19\'38,12\"E')}" oninput="window._editingUnit.koordinatGps=this.value" placeholder="8°40'12\"S, 121°19'38\"E" />
              </div>
              <div class="form-group">
                <label>Tipe / Ukuran Unit Huntara</label>
                <input type="text" class="form-control" value="${escapeHtml(u.tipeUnit || 'Tipe Single / Insitu (36 m²)')}" oninput="window._editingUnit.tipeUnit=this.value" placeholder="Tipe Single / Insitu (36 m²)" />
              </div>
            </div>

            <!-- BAGIAN 2: STATUS PROGRES & CHECKLIST PEKERJAAN SESUAI RAB HUNTARA -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
              <h4 style="margin:0;color:var(--primary);">2. Status Progres Fisik &amp; Checklist Item Pekerjaan (Sesuai RAB Huntara)</h4>
              <button type="button" class="btn btn-warning btn-sm" onclick="window.app.openRabModal()">
                ⚙️ Sesuaikan Bobot &amp; Item RAB
              </button>
            </div>
            <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;">
              <button class="btn ${Number(u.progres) === 0 ? 'btn-danger' : 'btn-outline'}" onclick="window.app.setModalUnitProgress(0)">
                Progres 0% (Kondisi Awal / Benchmarking)
              </button>
              <button class="btn ${Number(u.progres) === 50 ? 'btn-warning' : 'btn-outline'}" onclick="window.app.setModalUnitProgress(50)">
                Progres 50% (Persiapan, Lantai, Rangka C75 &amp; GRC)
              </button>
              <button class="btn ${Number(u.progres) === 100 ? 'btn-success' : 'btn-outline'}" onclick="window.app.setModalUnitProgress(100)">
                ✅ Progres 100% (Atap, Pintu/Jendela, Kanopi, Sanitasi &amp; Listrik)
              </button>
            </div>

            <div class="grid-2" style="margin-bottom:18px;">
              <div class="checklist-box" style="background:#fff;border:1px solid #fed7aa;border-radius:8px;padding:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-bottom:1px solid #ffedd5;padding-bottom:4px;">
                  <strong style="font-size:13px;color:#c2410c;">Checklist Pekerjaan Tahap 50% (Total Bobot 50,00%):</strong>
                  <span class="badge badge-50">Tahap 50%</span>
                </div>
                ${p50Items.map((item, i) => `
                  <label class="checklist-item" style="margin-bottom:6px;">
                    <input type="checkbox" ${u.check50?.[i] ? 'checked' : ''} onchange="window._editingUnit.check50[${i}]=this.checked" />
                    <span style="font-size:12px;">${escapeHtml(item)}</span>
                  </label>
                `).join('')}
              </div>
              <div class="checklist-box" style="background:#fff;border:1px solid #bbf7d0;border-radius:8px;padding:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-bottom:1px solid #dcfce7;padding-bottom:4px;">
                  <strong style="font-size:13px;color:#15803d;">Checklist Pekerjaan Tahap 100% (Total Bobot 100,00%):</strong>
                  <span class="badge badge-100">Tahap 100%</span>
                </div>
                ${p100Items.map((item, i) => `
                  <label class="checklist-item" style="margin-bottom:6px;">
                    <input type="checkbox" ${u.check100?.[i] ? 'checked' : ''} onchange="window._editingUnit.check100[${i}]=this.checked" />
                    <span style="font-size:12px;">${escapeHtml(item)}</span>
                  </label>
                `).join('')}
              </div>
            </div>

            <!-- BAGIAN 3: UPLOAD FOTO DOKUMENTASI LENGKAP 12 FOTO (MATRIKS 4x3 SESUAI LAPORAN DOKUMENTASI FISIK) -->
            <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
              <div>
                <h4 style="margin:0;color:var(--primary);">3. Foto Dokumentasi Progres Fisik Lengkap (12 Foto Sesuai Lembar Laporan)</h4>
                <p style="font-size:12px;color:var(--text-muted);margin:2px 0 0 0;">
                  Terdiri dari 4 sudut (Depan, Samping, Dalam, MCK) pada 3 tahapan progres (0%, 50%, 100%).
                </p>
              </div>
              <div style="display:flex;gap:6px;">
                <button type="button" class="btn btn-outline btn-sm" style="color:#0284c7;border-color:#bae6fd;background:#f0f9ff;font-size:11px;font-weight:600;" onclick="window.app.copyAllAnglesFromFront()">
                  📋 Salin Foto Depan ke Samping, Dalam &amp; MCK
                </button>
                <button type="button" class="btn btn-outline btn-sm" style="color:#dc2626;border-color:#fca5a5;background:#fef2f2;font-size:11px;font-weight:600;" onclick="window.app.clearAllUnitPhotos()">
                  🗑️ Kosongkan Semua Foto
                </button>
              </div>
            </div>

            <!-- MATRIKS 12 FOTO: 4 BARIS (A, B, C, D) x 3 KOLOM (0%, 50%, 100%) -->
            <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:12px;margin-bottom:20px;display:flex;flex-direction:column;gap:14px;">
              
              <!-- BARIS A: TAMPAK DEPAN -->
              <div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:10px;">
                <div style="display:flex;align-items:center;gap:6px;font-weight:700;font-size:13px;color:#1e40af;margin-bottom:8px;border-bottom:1px solid #f1f5f9;padding-bottom:4px;">
                  <span>🏠</span> A. Tampak Depan (3 Foto: 0%, 50%, 100%)
                </div>
                <div class="photo-slot-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));gap:10px;">
                  ${renderPhotoSlotHtml(u, 'foto0', 'A1. 0% — Tampak Depan (Lahan Awal)')}
                  ${renderPhotoSlotHtml(u, 'foto50', 'A2. 50% — Tampak Depan (Pondasi & Rangka)')}
                  ${renderPhotoSlotHtml(u, 'foto100_1', 'A3. 100% — Tampak Depan (Selesai)')}
                </div>
              </div>

              <!-- BARIS B: TAMPAK SAMPING / BELAKANG -->
              <div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:10px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;border-bottom:1px solid #f1f5f9;padding-bottom:4px;">
                  <span style="font-weight:700;font-size:13px;color:#0f766e;display:flex;align-items:center;gap:6px;">
                    <span>📐</span> B. Tampak Samping / Belakang (3 Foto: 0%, 50%, 100%)
                  </span>
                  <button type="button" class="btn btn-outline btn-sm" style="font-size:10px;padding:2px 8px;" onclick="window.app.copyAngleFallback('samping')">
                    📋 Samakan dgn Tampak Depan
                  </button>
                </div>
                <div class="photo-slot-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));gap:10px;">
                  ${renderPhotoSlotHtml(u, 'foto0_samping', 'B1. 0% — Tampak Samping')}
                  ${renderPhotoSlotHtml(u, 'foto50_samping', 'B2. 50% — Tampak Samping')}
                  ${renderPhotoSlotHtml(u, 'foto100_samping', 'B3. 100% — Tampak Samping')}
                </div>
              </div>

              <!-- BARIS C: BAGIAN DALAM (INTERIOR) -->
              <div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:10px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;border-bottom:1px solid #f1f5f9;padding-bottom:4px;">
                  <span style="font-weight:700;font-size:13px;color:#7c2d12;display:flex;align-items:center;gap:6px;">
                    <span>🚪</span> C. Bagian Dalam (Interior / Listrik) (3 Foto: 0%, 50%, 100%)
                  </span>
                  <button type="button" class="btn btn-outline btn-sm" style="font-size:10px;padding:2px 8px;" onclick="window.app.copyAngleFallback('dalam')">
                    📋 Samakan dgn Tampak Depan
                  </button>
                </div>
                <div class="photo-slot-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));gap:10px;">
                  ${renderPhotoSlotHtml(u, 'foto0_dalam', 'C1. 0% — Bagian Dalam (Titik Pondasi)')}
                  ${renderPhotoSlotHtml(u, 'foto50_dalam', 'C2. 50% — Bagian Dalam (Rangka/Lantai)')}
                  ${renderPhotoSlotHtml(u, 'foto100_2', 'C3. 100% — Bagian Dalam (Pintu & Listrik)')}
                </div>
              </div>

              <!-- BARIS D: MCK / SANITASI -->
              <div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:10px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;border-bottom:1px solid #f1f5f9;padding-bottom:4px;">
                  <span style="font-weight:700;font-size:13px;color:#15803d;display:flex;align-items:center;gap:6px;">
                    <span>🚿</span> D. MCK / Sanitasi (3 Foto: 0%, 50%, 100%)
                  </span>
                  <button type="button" class="btn btn-outline btn-sm" style="font-size:10px;padding:2px 8px;" onclick="window.app.copyAngleFallback('mck')">
                    📋 Samakan dgn Tampak Depan
                  </button>
                </div>
                <div class="photo-slot-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));gap:10px;">
                  ${renderPhotoSlotHtml(u, 'foto0_mck', 'D1. 0% — MCK / Lokasi Septictank')}
                  ${renderPhotoSlotHtml(u, 'foto50_mck', 'D2. 50% — MCK (Instalasi & Struktur)')}
                  ${renderPhotoSlotHtml(u, 'foto100_3', 'D3. 100% — MCK Terpasang')}
                </div>
              </div>

            </div>

            <!-- BAGIAN 4: SURAT PERNYATAAN PERUBAHAN DENAH -->
            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px;">
              <label style="display:flex;align-items:center;gap:8px;font-weight:700;cursor:pointer;color:#9a3412;">
                <input type="checkbox" style="width:18px;height:18px;" ${u.perubahanDenah ? 'checked' : ''} onchange="window._editingUnit.perubahanDenah=this.checked; window.app.renderUnitModalContent();" />
                <span>Warga Ini Memiliki Perubahan Denah (Misal: Closet/WC Dibangun di Luar atau Kamar Diperluas)</span>
              </label>

              ${u.perubahanDenah ? `
                <div class="grid-2" style="margin-top:12px;">
                  <div>
                    <div class="form-group">
                      <label>Keterangan di Tabel Dokumentasi 100%</label>
                      <input type="text" class="form-control" value="${escapeHtml(u.keteranganDenah)}" oninput="window._editingUnit.keteranganDenah=this.value" />
                    </div>
                    <div class="form-group">
                      <label>Alasan Perubahan Denah pada Surat Pernyataan</label>
                      <textarea class="form-control" rows="3" oninput="window._editingUnit.alasanPerubahan=this.value" placeholder="Contoh: Karena ruangan kamar sempit sehingga WC dibangun terpisah di luar bangunan Huntara.">${escapeHtml(u.alasanPerubahan || '')}</textarea>
                    </div>
                    <div class="grid-2" style="gap:8px;">
                      <div class="form-group">
                        <label>Tanggal Surat Pernyataan</label>
                        <input type="text" class="form-control" value="${escapeHtml(u.tglPernyataan || '')}" oninput="window._editingUnit.tglPernyataan=this.value" placeholder="10 Oktober 2026" />
                      </div>
                      <div class="form-group">
                        <label>Nama Kepala Desa / Lurah</label>
                        <input type="text" class="form-control" value="${escapeHtml(u.namaKepalaDesa || '')}" oninput="window._editingUnit.namaKepalaDesa=this.value" placeholder="Nama Pejabat Desa" />
                      </div>
                    </div>
                  </div>
                  <div>
                    ${renderPhotoSlotHtml(u, 'fotoSuratPernyataan', 'Scan / Foto Surat Pernyataan Perubahan Denah (Jika Sudah Ditandatangani)')}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
          <div class="modal-footer">
            ${window._editingUnitIsExisting ? `
              <button class="btn btn-danger" style="margin-right:auto;" onclick="window.app.deleteUnit('${escapeHtml(u.id)}')">
                🗑️ Hapus Penerima
              </button>
            ` : ''}
            <button class="btn btn-outline" onclick="window.app.closeModal()">Batal</button>
            <button class="btn btn-primary" onclick="window.app.saveUnitModal()">
              💾 Simpan Data & Dokumentasi Rumah
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function renderPhotoSlotHtml(u, field, label) {
    const val = u[field];
    return `
      <div class="photo-slot">
        <strong style="font-size:12px;">${escapeHtml(label)}</strong>
        ${val ? `<img src="${escapeHtml(val)}" alt="${escapeHtml(label)}" />` : `<div class="photo-placeholder">Belum Ada Foto</div>`}
        <div style="display:flex;gap:6px;width:100%;">
          <label class="btn btn-outline btn-sm" style="flex:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:4px;">
            📤 ${val ? 'Ganti Foto' : 'Upload Foto'}
            <input type="file" accept="image/*" style="display:none;" onchange="window.app.handleUnitPhotoUpload(this, '${field}')" />
          </label>
          ${val ? `
            <button type="button" class="btn btn-danger btn-sm" title="Hapus foto ini" style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;font-weight:600;" onclick="window.app.deleteUnitPhoto('${field}')">
              🗑️ Hapus
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  function deleteUnitPhoto(field) {
    if (!window._editingUnit) return;
    window._editingUnit[field] = '';
    renderUnitModalContent();
  }

  function clearAllUnitPhotos() {
    if (!window._editingUnit) return;
    if (confirm('Yakin ingin menghapus / mengosongkan semua 12 foto pada rumah penerima ini?')) {
      const u = window._editingUnit;
      u.foto0 = '';
      u.foto50 = '';
      u.foto100_1 = '';
      u.foto0_samping = '';
      u.foto50_samping = '';
      u.foto100_samping = '';
      u.foto0_dalam = '';
      u.foto50_dalam = '';
      u.foto100_2 = '';
      u.foto0_mck = '';
      u.foto50_mck = '';
      u.foto100_3 = '';
      u.fotoSuratPernyataan = '';
      renderUnitModalContent();
    }
  }

  function copyAngleFallback(angle) {
    if (!window._editingUnit) return;
    const u = window._editingUnit;
    if (angle === 'samping') {
      if (u.foto0 && !u.foto0_samping) u.foto0_samping = u.foto0;
      if (u.foto50 && !u.foto50_samping) u.foto50_samping = u.foto50;
      if (u.foto100_1 && !u.foto100_samping) u.foto100_samping = u.foto100_1;
    } else if (angle === 'dalam') {
      if (u.foto0 && !u.foto0_dalam) u.foto0_dalam = u.foto0;
      if (u.foto50 && !u.foto50_dalam) u.foto50_dalam = u.foto50;
      if (u.foto100_1 && !u.foto100_2) u.foto100_2 = u.foto100_1;
    } else if (angle === 'mck') {
      if (u.foto0 && !u.foto0_mck) u.foto0_mck = u.foto0;
      if (u.foto50 && !u.foto50_mck) u.foto50_mck = u.foto50;
      if (u.foto100_1 && !u.foto100_3) u.foto100_3 = u.foto100_1;
    }
    renderUnitModalContent();
  }

  function copyAllAnglesFromFront() {
    if (!window._editingUnit) return;
    const u = window._editingUnit;
    if (u.foto0) {
      if (!u.foto0_samping) u.foto0_samping = u.foto0;
      if (!u.foto0_dalam) u.foto0_dalam = u.foto0;
      if (!u.foto0_mck) u.foto0_mck = u.foto0;
    }
    if (u.foto50) {
      if (!u.foto50_samping) u.foto50_samping = u.foto50;
      if (!u.foto50_dalam) u.foto50_dalam = u.foto50;
      if (!u.foto50_mck) u.foto50_mck = u.foto50;
    }
    if (u.foto100_1) {
      if (!u.foto100_samping) u.foto100_samping = u.foto100_1;
      if (!u.foto100_2) u.foto100_2 = u.foto100_1;
      if (!u.foto100_3) u.foto100_3 = u.foto100_1;
    }
    renderUnitModalContent();
  }

  async function handleUnitPhotoUpload(inputEl, field) {
    if (!inputEl.files || !inputEl.files[0] || !window._editingUnit) return;
    const u = window._editingUnit;
    const url = await uploadImageFile(inputEl.files[0], `bnba${u.noBnba}_${field}`);
    u[field] = url;
    renderUnitModalContent();
  }

  function setModalUnitProgress(prog) {
    const u = window._editingUnit;
    if (!u) return;
    u.progres = prog;
    const p50Len = (state.settings.pekerjaan50 || []).length || 4;
    const p100Len = (state.settings.pekerjaan100 || []).length || 6;
    u.check50 = prog >= 50 ? Array(p50Len).fill(true) : Array(p50Len).fill(false);
    u.check100 = prog === 100 ? Array(p100Len).fill(true) : Array(p100Len).fill(false);
    renderUnitModalContent();
  }

  function saveUnitModal() {
    const u = window._editingUnit;
    if (!u) return;
    if (!u.nama.trim()) {
      alert('Nama lengkap penerima wajib diisi.');
      return;
    }
    if (window._editingUnitIsExisting) {
      const idx = state.units.findIndex(x => x.id === u.id);
      if (idx >= 0) state.units[idx] = u;
    } else {
      state.units.push(u);
    }
    closeModal();
    saveState('Data rumah & progres disimpan');
    renderAll();
  }

  /* ========================================================================
     ACTIONS & EVENT HANDLERS
     ======================================================================== */
  function selectVendor(vendorId) {
    state.selectedVendorId = vendorId;
    if (vendorId !== 'ALL') {
      state.batchForm.vendorId = vendorId;
      state.printConfig.vendorId = vendorId;
    }
    renderAll();
  }

  function deleteVendor(vendorId) {
    if (state.vendors.length <= 1) return;
    if (!confirm('Hapus perusahaan ini beserta unit yang terkait?')) return;
    state.vendors = state.vendors.filter(v => v.id !== vendorId);
    state.units = state.units.filter(u => u.vendorId !== vendorId);
    state.batches = state.batches.filter(b => b.vendorId !== vendorId);
    state.selectedVendorId = state.vendors[0].id;
    saveState('Perusahaan dihapus');
    renderAll();
  }

  function deleteUnit(unitId) {
    if (!confirm('Yakin ingin menghapus data penerima BNBA ini?')) return;
    state.units = state.units.filter(u => u.id !== unitId);
    closeModal();
    saveState('Data penerima dihapus');
    renderAll();
  }

  function setUnitFilter(key, val) {
    state.unitFilter[key] = val;
    if (key === 'kecamatan') state.unitFilter.desa = 'ALL';
    renderAll();
  }

  function resetUnitFilter() {
    state.unitFilter = { kecamatan: 'ALL', desa: 'ALL', progres: 'ALL', statusTagihan: 'ALL', search: '' };
    renderAll();
  }

  function openUnitsByLocation(kecamatan, desa) {
    state.unitFilter.kecamatan = kecamatan;
    state.unitFilter.desa = desa;
    switchTab('units');
  }

  function quickSetUnitProgress(unitId, prog) {
    const u = state.units.find(x => x.id === unitId);
    if (!u) return;
    u.progres = prog;
    const p50Len = (state.settings.pekerjaan50 || []).length || 4;
    const p100Len = (state.settings.pekerjaan100 || []).length || 6;
    u.check50 = prog >= 50 ? Array(p50Len).fill(true) : Array(p50Len).fill(false);
    u.check100 = prog === 100 ? Array(p100Len).fill(true) : Array(p100Len).fill(false);
    saveState(`BNBA #${u.noBnba} diset ${prog}%`);
    renderAll();
  }

  function setDesaProgress(kecamatan, desa, prog) {
    let count = 0;
    const p50Len = (state.settings.pekerjaan50 || []).length || 4;
    const p100Len = (state.settings.pekerjaan100 || []).length || 6;
    for (const u of state.units) {
      if (state.selectedVendorId !== 'ALL' && u.vendorId !== state.selectedVendorId) continue;
      if (u.kecamatan === kecamatan && u.desa === desa) {
        u.progres = prog;
        u.check50 = prog >= 50 ? Array(p50Len).fill(true) : Array(p50Len).fill(false);
        u.check100 = prog === 100 ? Array(p100Len).fill(true) : Array(p100Len).fill(false);
        count++;
      }
    }
    saveState(`${count} unit di Desa ${desa} diset ${prog}%`);
    renderAll();
  }

  function bulkSetFilteredProgress(prog) {
    const activeUnits = getActiveUnits();
    let count = 0;
    for (const u of activeUnits) {
      if (state.unitFilter.kecamatan !== 'ALL' && u.kecamatan !== state.unitFilter.kecamatan) continue;
      if (state.unitFilter.desa !== 'ALL' && u.desa !== state.unitFilter.desa) continue;
      if (state.unitFilter.progres !== 'ALL' && String(u.progres) !== String(state.unitFilter.progres)) continue;
      u.progres = prog;
      if (prog >= 50) u.check50 = [true, true, true, true, true, true];
      if (prog === 100) u.check100 = [true, true, true, true];
      count++;
    }
    saveState(`${count} unit diset ${prog}%`);
    renderAll();
  }

  function quickDemo100() {
    // Set first 20 units of active vendor to 100% so user can immediately test 10 or 20 unit batch disbursement
    const activeUnits = getActiveUnits();
    let changed = 0;
    for (const u of activeUnits) {
      if (Number(u.progres) < 100 && changed < 20) {
        u.progres = 100;
        u.check50 = [true, true, true, true, true, true];
        u.check100 = [true, true, true, true];
        changed++;
      }
    }
    if (changed === 0 && activeUnits.length > 0) {
      alert('Semua unit sudah berada di progres 100%!');
      return;
    }
    saveState(`${changed} unit disimulasikan Selesai 100% dan siap ditagihkan!`);
    renderAll();
  }

  /* ========================================================================
     BATCH (PENCAIRAN GELONDONGAN) HANDLERS
     ======================================================================== */
  function changeBatchVendor(vendorId) {
    state.batchForm.vendorId = vendorId;
    state.batchForm.selectedUnitIds = [];
    const v = getVendorById(vendorId);
    const seq = state.batches.filter(b => b.vendorId === vendorId).length + 1;
    const nextNum = String(seq).padStart(3, '0');
    const code = v.kodeSurat || 'EMKA';
    const today = getTodayIndonesian();
    state.batchForm.namaBatch = `Pencairan Gelondongan Tahap ${seq}`;
    state.batchForm.noInvoice = generateAutoKuitansiNo(v, seq);
    state.batchForm.tglInvoice = today;
    state.batchForm.noSpp = `${nextNum}/${code}/XI/2026`;
    state.batchForm.tglSpp = today;
    state.batchForm.noSps = `${String(seq).padStart(2, '0')}/${code}/SPS/XI/2026`;
    state.batchForm.tglSps = today;
    renderAll();
  }

  function updateBatchField(field, val) {
    state.batchForm[field] = val;
  }

  function setBatchKecamatanFilter(kecamatan) {
    state.batchForm.filterKecamatan = kecamatan;
    state.batchForm.filterDesa = 'ALL';
    renderAll();
  }

  function setBatchDesaFilter(desa) {
    state.batchForm.filterDesa = desa;
    renderAll();
  }

  function setBatchSearchQuery(q) {
    state.batchForm.searchQuery = q;
    renderAll();
  }

  function toggleAllowUnderMin(checked) {
    state.batchForm.allowUnderMin = checked;
    renderAll();
  }

  function toggleBatchUnit(unitId) {
    const arr = state.batchForm.selectedUnitIds;
    const idx = arr.indexOf(unitId);
    if (idx >= 0) {
      arr.splice(idx, 1);
    } else {
      arr.push(unitId);
      const u = state.units.find(x => x.id === unitId);
      if (u && Number(u.progres) < 100) {
        u.progres = 100;
        u.check50 = [true, true, true, true, true, true];
        u.check100 = [true, true, true, true];
      }
    }
    renderAll();
  }

  function getFilteredUnbilledForBatch() {
    const bf = state.batchForm;
    return state.units.filter(u =>
      u.vendorId === bf.vendorId &&
      !u.batchId &&
      (bf.filterKecamatan === 'ALL' || u.kecamatan === bf.filterKecamatan) &&
      (bf.filterDesa === 'ALL' || u.desa === bf.filterDesa)
    );
  }

  function selectBatchUnitsCount(count) {
    const bf = state.batchForm;
    const eligible = getFilteredUnbilledForBatch();
    if (count <= 0) {
      bf.selectedUnitIds = [];
    } else {
      const picked = eligible.slice(0, count);
      bf.selectedUnitIds = picked.map(u => u.id);
      picked.forEach(u => { u.progres = 100; });
    }
    renderAll();
  }

  function selectBatchRandomCount() {
    const bf = state.batchForm;
    const count = Number(bf.customPickCount) || 12;
    const eligible = [...getFilteredUnbilledForBatch()];
    // Shuffle array randomly (Fisher-Yates)
    for (let i = eligible.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
    }
    const picked = eligible.slice(0, count);
    bf.selectedUnitIds = picked.sort((a, b) => a.noBnba - b.noBnba).map(u => u.id);
    picked.forEach(u => { u.progres = 100; });
    renderAll();
  }

  function addAllDisplayedToBatch() {
    const bf = state.batchForm;
    const eligible = getFilteredUnbilledForBatch();
    const setIds = new Set(bf.selectedUnitIds);
    for (const u of eligible) {
      setIds.add(u.id);
      u.progres = 100;
    }
    bf.selectedUnitIds = [...setIds];
    renderAll();
  }

  function selectByBnbaNumbers() {
    const bf = state.batchForm;
    const raw = (document.getElementById('randomBnbaInput')?.value || bf.randomNumbersText || '').trim();
    if (!raw) {
      alert('Ketik nomor BNBA yang ingin dipilih, misalnya: 1, 4, 11, 12, 13, 21, 22, 35, 42, 54');
      return;
    }
    const targetNums = new Set();
    const parts = raw.split(/[,;\s]+/).filter(Boolean);
    for (const p of parts) {
      if (p.includes('-')) {
        const [start, end] = p.split('-').map(n => parseInt(n, 10));
        if (!isNaN(start) && !isNaN(end)) {
          for (let k = Math.min(start, end); k <= Math.max(start, end); k++) targetNums.add(k);
        }
      } else {
        const n = parseInt(p.replace('#', ''), 10);
        if (!isNaN(n)) targetNums.add(n);
      }
    }
    const matched = state.units.filter(u => u.vendorId === bf.vendorId && !u.batchId && targetNums.has(Number(u.noBnba)));
    if (matched.length === 0) {
      alert('Nomor BNBA tidak ditemukan atau sudah masuk pencairan sebelumnya.');
      return;
    }
    const setIds = new Set(bf.selectedUnitIds);
    for (const u of matched) {
      setIds.add(u.id);
      u.progres = 100;
    }
    bf.selectedUnitIds = [...setIds];
    renderAll();
  }

  function createBatch() {
    const bf = state.batchForm;
    const minUnit = Number(state.settings.minimalUnitTagihan) || 10;
    const count = bf.selectedUnitIds.length;
    if (count === 0) {
      alert('Pilih minimal 10 unit rumah yang akan dicairkan.');
      return;
    }
    if (count < minUnit && !bf.allowUnderMin) {
      alert(`Minimal penagihan gelondongan adalah ${minUnit} unit.`);
      return;
    }

    const newBatch = {
      id: 'batch-' + Date.now(),
      vendorId: bf.vendorId,
      namaBatch: bf.namaBatch || `Pencairan Gelondongan (${count} Unit)`,
      noInvoice: bf.noInvoice,
      tglInvoice: bf.tglInvoice,
      noSpp: bf.noSpp,
      tglSpp: bf.tglSpp,
      noSps: bf.noSps,
      tglSps: bf.tglSps,
      tglCoverDokumentasi: bf.tglInvoice,
      unitIds: [...bf.selectedUnitIds],
      status: 'DIAJUKAN',
      createdAt: new Date().toISOString()
    };

    state.batches.push(newBatch);

    // Lock units to this batch & ensure progres is 100%
    for (const u of state.units) {
      if (newBatch.unitIds.includes(u.id)) {
        u.progres = 100;
        u.check50 = [true, true, true, true, true, true];
        u.check100 = [true, true, true, true];
        u.batchId = newBatch.id;
        u.statusTagihan = 'DIAJUKAN';
      }
    }

    // Prepare next batch defaults
    const v = getVendorById(bf.vendorId);
    const seq = state.batches.filter(b => b.vendorId === bf.vendorId).length + 1;
    const nextNum = String(seq).padStart(3, '0');
    const code = v.kodeSurat || 'EMKA';
    bf.selectedUnitIds = [];
    bf.namaBatch = `Pencairan Gelondongan Tahap ${seq}`;
    bf.noInvoice = generateAutoKuitansiNo(v, seq);
    bf.noSpp = `${nextNum}/${code}/XI/2026`;
    bf.noSps = `${String(seq).padStart(2, '0')}/${code}/SPS/XI/2026`;

    saveState(`Batch ${newBatch.namaBatch} (${count} Unit) diterbitkan!`);
    openPrintForBatch(newBatch.id, 'ALL_LETTERS');
  }

  function updateBatchStatus(batchId, status) {
    const b = state.batches.find(x => x.id === batchId);
    if (!b) return;
    b.status = status;
    for (const u of state.units) {
      if (b.unitIds.includes(u.id)) {
        u.statusTagihan = status;
      }
    }
    saveState(`Status batch diubah ke ${status}`);
    renderAll();
  }

  function deleteBatch(batchId) {
    if (!confirm('Hapus Batch Pencairan ini? Unit di dalamnya akan dikembalikan ke status "Siap Ditagihkan".')) return;
    state.batches = state.batches.filter(b => b.id !== batchId);
    for (const u of state.units) {
      if (u.batchId === batchId) {
        u.batchId = null;
        u.statusTagihan = 'BELUM_DITAGIHKAN';
      }
    }
    if (state.printConfig.batchId === batchId) {
      state.printConfig.batchId = state.batches[0]?.id || '';
    }
    saveState('Batch dihapus & unit dibuka kembali');
    renderAll();
  }

  function openPrintForBatch(batchId, docType = 'ALL_LETTERS') {
    state.printConfig.mode = 'BATCH';
    state.printConfig.batchId = batchId;
    state.printConfig.docType = docType;
    switchTab('print');
  }

  function printDesaDokumentasi(kecamatan, desa) {
    state.printConfig.mode = 'DESA';
    state.printConfig.kecamatan = kecamatan;
    state.printConfig.desa = desa;
    state.printConfig.singleUnitId = null;
    state.printConfig.docType = 'DOKUMENTASI';
    switchTab('print');
  }

  function printSingleUnit(unitId) {
    const u = state.units.find(x => x.id === unitId);
    if (!u) return;
    state.printConfig.mode = 'DESA';
    state.printConfig.vendorId = u.vendorId;
    state.printConfig.kecamatan = u.kecamatan;
    state.printConfig.desa = u.desa;
    state.printConfig.singleUnitId = u.id;
    state.printConfig.docType = 'DOKUMENTASI';
    switchTab('print');
  }

  function resetSingleUnitPrint() {
    state.printConfig.singleUnitId = null;
    renderAll();
  }

  function setPrintConfig(key, val) {
    state.printConfig[key] = val;
    if (key === 'kecamatan') state.printConfig.desa = 'ALL';
    if (key === 'batchId' || key === 'mode' || key === 'desa' || key === 'kecamatan' || key === 'vendorId') {
      state.printConfig.singleUnitId = null;
      state.printConfig.overrideDeskripsiLokasi = '';
      state.printConfig.overrideNoInvoice = '';
      state.printConfig.overrideTanggal = '';
    }
    renderAll();
  }

  function quickUpdateVendorRate(vendorId, field, val) {
    const v = state.vendors.find(x => x.id === vendorId);
    if (!v) return;
    v[field] = val;
    saveState(`Tarif ${field} diperbarui`);
    renderAll();
  }

  /* ========================================================================
     TOOLS: WATERMARK GENERATOR & BLANKO DENAH
     ======================================================================== */
  function previewWatermark() {
    const fileInput = document.getElementById('wmFileInput');
    const canvas = document.getElementById('wmCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const unitId = document.getElementById('wmUnitSelect')?.value;
    const u = state.units.find(x => x.id === unitId) || state.units[0];
    const dateStr = document.getElementById('wmDateInput')?.value || '18 Nov 2026 16.30';
    const gpsStr = document.getElementById('wmGpsInput')?.value || '8°40\'12"S 121°19\'38"E';

    const drawStamp = (baseImg) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (baseImg) {
        ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw BNPB Logo top-right (proporsional dan bulat sempurna)
      const logo = new Image();
      logo.onload = () => {
        const logoSize = Math.max(50, Math.round(Math.min(canvas.width, canvas.height) * 0.12));
        const pad = Math.max(12, Math.round(logoSize * 0.18));
        ctx.drawImage(logo, canvas.width - logoSize - pad, pad, logoSize, logoSize);

        // Draw bottom overlay bar & GPS info
        const barHeight = Math.max(68, Math.round(canvas.height * 0.14));
        ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
        ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

        // Mini map box bottom-left
        const boxH = Math.max(48, Math.round(barHeight * 0.74));
        const boxW = Math.max(68, Math.round(boxH * 1.3));
        const boxY = canvas.height - barHeight + Math.round((barHeight - boxH) / 2);
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(14, boxY, boxW, boxH);
        ctx.fillStyle = '#0369a1';
        ctx.font = 'bold 11px Arial';
        ctx.fillText('GPS MAP', 22, boxY + 20);
        ctx.font = '10px Arial';
        ctx.fillText(u ? u.desa.slice(0, 11) : 'Lokasi', 20, boxY + 36);

        // Right-aligned timestamp, GPS, Kegiatan, Nama Penerima (proporsional tidak gepeng)
        const fontSize = Math.max(11, Math.min(16, Math.round(barHeight * 0.17)));
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'right';
        ctx.font = `bold ${fontSize + 1}px Arial`;
        ctx.fillText(dateStr, canvas.width - 16, canvas.height - barHeight + (barHeight * 0.28));
        ctx.font = `${fontSize}px Arial`;
        ctx.fillText(gpsStr, canvas.width - 16, canvas.height - barHeight + (barHeight * 0.50));
        ctx.fillText(`KEGIATAN : Pembangunan Huntara Insitu ${u ? u.desa : ''}`, canvas.width - 16, canvas.height - barHeight + (barHeight * 0.72));
        ctx.fillStyle = '#fde047';
        ctx.font = `bold ${fontSize + 1}px Arial`;
        ctx.fillText(`Nama : ${u ? u.nama : '-'} (RT ${u ? u.rt : '-'})`, canvas.width - 16, canvas.height - barHeight + (barHeight * 0.92));
        ctx.textAlign = 'left';
      };
      logo.src = '/assets/logo-bnpb.png';
    };

    if (fileInput?.files?.[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Sesuaikan dimensi canvas mengikuti RASIO ASLI FOTO agar tidak tertarik/gepeng/melebar
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;
          const maxDim = 1200;
          if (w > maxDim || h > maxDim) {
            if (w >= h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          drawStamp(img);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(fileInput.files[0]);
    } else {
      canvas.width = 800;
      canvas.height = 540;
      drawStamp(null);
    }
  }

  async function saveWatermarkedToUnit() {
    const canvas = document.getElementById('wmCanvas');
    const unitId = document.getElementById('wmUnitSelect')?.value;
    const slot = document.getElementById('wmSlotSelect')?.value || 'foto100_1';
    const u = state.units.find(x => x.id === unitId);
    if (!canvas || !u) return;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, prefix: `wm_bnba${u.noBnba}_${slot}` })
      });
      const data = await res.json();
      u[slot] = data.ok && data.url ? data.url : dataUrl;
    } catch (_) {
      u[slot] = dataUrl;
    }

    await saveState(`Foto watermark disimpan ke BNBA #${u.noBnba} (${u.nama})`);
    alert(`Berhasil! Foto ber-watermark BNPB telah dipasang pada ${u.nama} (${slot}).`);
  }

  function downloadWatermarked() {
    const canvas = document.getElementById('wmCanvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/jpeg', 0.9);
    a.download = `Foto_Huntara_BNPB_${Date.now()}.jpg`;
    a.click();
  }

  function printSingleBlankoDenah() {
    const unitId = document.getElementById('blankoUnitSelect')?.value;
    const reason = document.getElementById('blankoReasonInput')?.value || '';
    const u = state.units.find(x => x.id === unitId);
    if (!u) return;
    u.perubahanDenah = true;
    if (reason.trim()) u.alasanPerubahan = reason.trim();
    saveState('Status perubahan denah diperbarui');

    state.printConfig.mode = 'DESA';
    state.printConfig.vendorId = u.vendorId;
    state.printConfig.kecamatan = u.kecamatan;
    state.printConfig.desa = u.desa;
    state.printConfig.docType = 'DOKUMENTASI';
    switchTab('print');
  }

  /* ========================================================================
     SHARING, EXPORT / IMPORT & BULK BNBA
     ======================================================================== */
  function exportDataPackage() {
    const payload = {
      exportedAt: new Date().toISOString(),
      settings: state.settings,
      vendors: state.vendors,
      units: state.units,
      batches: state.batches
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Paket_Data_Huntara_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }

  async function importDataPackage(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const incoming = JSON.parse(text);
      const res = await fetch('/api/import-merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incoming)
      });
      const data = await res.json();
      if (data.ok && data.db) {
        state.vendors = data.db.vendors || state.vendors;
        state.units = data.db.units || state.units;
        state.batches = data.db.batches || state.batches;
        renderAll();
        alert('Paket data berhasil digabungkan!');
      }
    } catch (err) {
      alert('Gagal membaca file paket data: ' + err.message);
    }
  }

  function exportCsvBnba() {
    const units = getActiveUnits();
    const header = ['NO_BNBA', 'NAMA_LENGKAP', 'NIK_KK', 'RT', 'DESA_KELURAHAN', 'KECAMATAN', 'PROGRES_PERSEN', 'PERUBAHAN_DENAH', 'VENDOR'];
    const rows = units.map(u => {
      const v = getVendorById(u.vendorId);
      return [
        u.noBnba,
        `"${String(u.nama || '').replace(/"/g, '""')}"`,
        `"${String(u.nik || '')}"`,
        `"${String(u.rt || '')}"`,
        `"${String(u.desa || '')}"`,
        `"${String(u.kecamatan || '')}"`,
        u.progres,
        u.perubahanDenah ? 'YA' : 'TIDAK',
        `"${String(v.nama || '')}"`
      ].join(',');
    });
    const csv = [header.join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Data_BNBA_Huntara_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  function runBulkTextImport() {
    const vendorId = document.getElementById('bulkImportVendor')?.value || state.vendors[0].id;
    const raw = document.getElementById('bulkImportText')?.value || '';
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      alert('Masukkan minimal 1 baris data penerima.');
      return;
    }
    const vendor = getVendorById(vendorId);
    let added = 0;
    for (const line of lines) {
      const parts = line.split('|').map(p => p.trim());
      const nama = parts[0];
      if (!nama) continue;
      const rt = parts[1] || '001';
      const desa = parts[2] || 'Marapokot';
      const kecamatan = parts[3] || 'Aesesa';
      const nik = parts[4] || '';
      const noBnba = state.units.filter(u => u.vendorId === vendorId).length + 1;
      const noInsitu = String(state.units.filter(u => u.vendorId === vendorId && u.desa === desa).length + 1).padStart(2, '0');

      state.units.push({
        id: `unit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        vendorId,
        noBnba,
        noInsitu,
        nama,
        nik,
        noKk: '',
        rt,
        desa,
        kecamatan,
        kabupaten: vendor.kabupaten || 'Kabupaten Nagekeo',
        provinsi: vendor.provinsi || 'Nusa Tenggara Timur',
        tambahan: true,
        ttl: '',
        noHp: '',
        progres: 0,
        check0: true,
        check50: [false, false, false, false, false, false],
        check100: [false, false, false, false],
        foto0: '',
        foto50: '',
        foto100_1: '',
        foto100_2: '',
        foto100_3: '',
        perubahanDenah: false,
        keteranganDenah: 'PEMILIK RUMAH INGIN MEMBANGUN CLOSET DI LUAR HUNTARA (MATERIAL DI BERIKAN)',
        alasanPerubahan: '',
        tglPernyataan: '',
        namaKepalaDesa: '',
        jabatanKepalaDesa: 'Kepala Desa / Lurah',
        fotoSuratPernyataan: '',
        batchId: null,
        statusTagihan: 'BELUM_DITAGIHKAN'
      });
      added++;
    }
    saveState(`${added} data BNBA baru ditambahkan!`);
    renderAll();
    alert(`Berhasil menambahkan ${added} penerima BNBA ke ${vendor.nama}.`);
  }

  function updateSetting(key, val) {
    state.settings[key] = val;
    saveState('Pengaturan disimpan');
    renderAll();
  }

  /* ========================================================================
     INITIALIZATION
     ======================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#sidebarNav .nav-item').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    const vendorSelect = document.getElementById('globalVendorSelect');
    if (vendorSelect) {
      vendorSelect.addEventListener('change', (e) => selectVendor(e.target.value));
    }

    loadState();
  });

  // Expose public API for inline event handlers
  window.app = {
    switchTab,
    selectVendor,
    openVendorModal,
    handleVendorImageUpload,
    clearVendorImageField,
    resetVendorLogoField,
    openLogoHeaderModal,
    handleQuickLogoUpload,
    resetQuickLogo,
    saveLogoHeaderModal,
    saveVendorModal,
    deleteVendor,
    openUnitModal,
    renderUnitModalContent,
    handleUnitPhotoUpload,
    deleteUnitPhoto,
    clearAllUnitPhotos,
    copyAngleFallback,
    copyAllAnglesFromFront,
    setModalUnitProgress,
    saveUnitModal,
    deleteUnit,
    closeModal,
    setUnitFilter,
    resetUnitFilter,
    openUnitsByLocation,
    quickSetUnitProgress,
    setDesaProgress,
    bulkSetFilteredProgress,
    quickDemo100,
    changeBatchVendor,
    updateBatchField,
    setBatchKecamatanFilter,
    setBatchDesaFilter,
    setBatchSearchQuery,
    toggleAllowUnderMin,
    toggleBatchUnit,
    selectBatchUnitsCount,
    selectBatchRandomCount,
    addAllDisplayedToBatch,
    selectByBnbaNumbers,
    createBatch,
    updateBatchStatus,
    deleteBatch,
    openPrintForBatch,
    printDesaDokumentasi,
    printSingleUnit,
    resetSingleUnitPrint,
    setPrintConfig,
    quickUpdateVendorRate,
    previewWatermark,
    saveWatermarkedToUnit,
    downloadWatermarked,
    printSingleBlankoDenah,
    exportDataPackage,
    importDataPackage,
    exportCsvBnba,
    runBulkTextImport,
    updateSetting,
    openRabModal,
    updateRabModalField,
    quickSetStage50,
    autoCalculateAllStages,
    addRabModalRow,
    deleteRabModalRow,
    resetRabModalToDefault,
    saveRabModal
  };
})();

