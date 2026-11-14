// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDocs, doc, setDoc, getDoc, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCRtgEJgJef3PNkPxPxbilsFRsv7Ldrv5Q",
  authDomain: "retribusi-bapenda.firebaseapp.com",
  projectId: "retribusi-bapenda",
  storageBucket: "retribusi-bapenda.firebasestorage.app",
  messagingSenderId: "479725161202",
  appId: "1:479725161202:web:3980d3054259bd5a235e6b",
  measurementId: "G-TJL81KLS2Q"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const currentUser = JSON.parse(sessionStorage.getItem("coda_user")) || null;

document.addEventListener("DOMContentLoaded", async () => {
  const path = window.location.pathname;

  // ==========================================
  // 1. HALAMAN LOGIN (index.html)
  // ==========================================
  if (path.includes("index.html") || path.endsWith("/")) {
    const roleSelect = document.getElementById("loginRole");
    const targetGroup = document.getElementById("targetMuridGroup");
    const targetSelect = document.getElementById("targetMuridSelect");

    try {
      const snap = await getDocs(collection(db, "user_coda"));
      if (targetSelect) {
        targetSelect.innerHTML = "";
        snap.forEach(d => {
          const data = d.data();
          if (data.role === "murid") {
            const opt = document.createElement("option");
            opt.value = data.nama;
            opt.textContent = data.nama;
            targetSelect.appendChild(opt);
          }
        });
      }
    } catch(e) { console.error(e); }

    roleSelect?.addEventListener("change", (e) => {
      if (targetGroup) targetGroup.style.display = e.target.value === "guru" ? "block" : "none";
    });

    document.getElementById("btnQuickNatan")?.addEventListener("click", async () => {
      const userData = { nama: "Natan", pass: "123456", role: "murid", targetMurid: "", timestamp: new Date() };
      await setDoc(doc(db, "user_coda", "Natan"), userData, { merge: true });
      sessionStorage.setItem("coda_user", JSON.stringify(userData));
      window.location.href = "materi.html";
    });

    document.getElementById("btnQuickGuru")?.addEventListener("click", async () => {
      const userData = { nama: "Pak Budi", pass: "123456", role: "guru", targetMurid: "Natan", timestamp: new Date() };
      await setDoc(doc(db, "user_coda", "Pak Budi"), userData, { merge: true });
      sessionStorage.setItem("coda_user", JSON.stringify(userData));
      window.location.href = "materi.html";
    });

    document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nama = document.getElementById("loginName").value.trim();
      const pass = document.getElementById("loginPass").value.trim();
      const role = roleSelect.value;
      const targetMurid = role === "guru" ? targetSelect.value : "";

      const userData = { nama, pass, role, targetMurid, timestamp: new Date() };
      await setDoc(doc(db, "user_coda", nama), userData, { merge: true });
      sessionStorage.setItem("coda_user", JSON.stringify(userData));
      window.location.href = "materi.html";
    });
  }

  // ==========================================
  // 2. DASHBOARD MATERI (materi.html)
  // ==========================================
  if (path.includes("materi.html")) {
    if (!currentUser) { window.location.href = "index.html"; return; }
    
    document.getElementById("displayUserInfo").textContent = `${currentUser.nama} (${currentUser.role.toUpperCase()})`;
    if (currentUser.role === "guru") {
      document.getElementById("uploadSection").style.display = "block";
      const autoIdField = document.getElementById("pptId");
      if (autoIdField) {
        autoIdField.value = "MTR-" + Math.floor(100000 + Math.random() * 900000);
      }
    }

    document.getElementById("btnLogout")?.addEventListener("click", () => {
      sessionStorage.clear();
      window.location.href = "index.html";
    });

    let fileBase64Data = "";
    const filePicker = document.getElementById("localFilePicker");
    const statusInput = document.getElementById("pptStatus");

    if (filePicker) {
      filePicker.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const titleInput = document.getElementById("pptName");
        if (titleInput && !titleInput.value) {
          titleInput.value = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        }

        statusInput.value = "Membaca file...";

        const reader = new FileReader();
        reader.onload = function(event) {
          fileBase64Data = event.target.result;
          statusInput.value = `File "${file.name}" berhasil dimuat & siap disimpan.`;
        };
        reader.readAsDataURL(file);
      });
    }

    const uploadForm = document.getElementById("uploadPptForm");
    if (uploadForm) {
      uploadForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = document.getElementById("pptId").value.trim();
        const nama = document.getElementById("pptName").value.trim();

        if (!fileBase64Data) {
          return alert("Silakan pilih file terlebih dahulu!");
        }

        try {
          await setDoc(doc(db, "mater_coda", id), { 
            id, 
            nama, 
            file: fileBase64Data 
          });
          
          alert("File berhasil disimpan ke Firestore!");
          loadMateriList();
          uploadForm.reset();
          document.getElementById("pptId").value = "MTR-" + Math.floor(100000 + Math.random() * 900000);
          fileBase64Data = "";
          statusInput.value = "";
        } catch(err) {
          alert("Gagal upload ke database: " + err.message);
        }
      });
    }

    loadMateriList();
  }

  // ==========================================
  // 3. RUANG BELAJAR (pelajaran.html)
  // ==========================================
  if (path.includes("pelajaran.html")) {
    if (!currentUser) { window.location.href = "index.html"; return; }

    document.getElementById("activeRoleBadge").textContent = `Role: ${currentUser.role.toUpperCase()}`;
    document.getElementById("activeTargetBadge").textContent = `Target: ${currentUser.targetMurid || currentUser.nama}`;

    if (currentUser.role === "guru") {
      document.getElementById("btnSelesaiBelajar").style.display = "block";
      document.getElementById("teacherSlideControls").style.display = "flex";
      document.getElementById("studentSlideIndicator").style.display = "none";
      document.getElementById("scoreDisplayWrapper").style.display = "flex";
    } else {
      document.getElementById("btnSelesaiBelajar").style.display = "none";
      document.getElementById("teacherSlideControls").style.display = "none";
      document.getElementById("studentSlideIndicator").style.display = "block";
      document.getElementById("scoreDisplayWrapper").style.display = "none";
      document.getElementById("studentNoticeBox").style.display = "block";
    }

    const dropdown = document.getElementById("selectMateriDropdown");
    try {
      const snap = await getDocs(collection(db, "mater_coda"));
      if (dropdown) {
        dropdown.innerHTML = "";
        snap.forEach(d => {
          const m = d.data();
          const opt = document.createElement("option");
          opt.value = m.id;
          opt.textContent = m.nama;
          dropdown.appendChild(opt);
        });
      }
    } catch(e) { console.error("Gagal memuat materi:", e); }

    let activeMateri = null;
    let pdfDocInstance = null;
    let pageNumTotal = 1;
    let currentPageNum = 1;
    let currentScore = 0;
    let listSoalArray = [];

    document.getElementById("btnMulaiPelajaran")?.addEventListener("click", async () => {
      const selectedId = dropdown.value;
      if (!selectedId) return alert("Pilih materi terlebih dahulu!");

      const mDoc = await getDoc(doc(db, "mater_coda", selectedId));
      if (!mDoc.exists()) return alert("Materi tidak ditemukan!");

      activeMateri = mDoc.data();
      document.getElementById("selectMateriPrompt").style.display = "none";
      document.getElementById("pptViewerSection").style.display = "block";
      document.getElementById("classroomTitle").textContent = `Pelajaran: ${activeMateri.nama}`;

      if (currentUser.role === "guru") {
        document.getElementById("teacherQuizForm").style.display = "block";
        
        // Reset sesi baru di Firestore
        const sessionId = currentUser.targetMurid;
        await setDoc(doc(db, "sesi_belajar", sessionId), {
          currentPage: 1,
          daftarSoal: [],
          skorMurid: 0,
          sesaiSelesai: false
        });
      }

      const downloadBtn = document.getElementById("downloadPptBtn");
      downloadBtn.href = activeMateri.file;
      downloadBtn.download = `${activeMateri.nama}.pdf`;

      await loadPdfToCanvas(activeMateri.file);
      initRealtimeSession();
    });

    async function loadPdfToCanvas(base64Data) {
      try {
        const base64Clean = base64Data.split(',')[1] || base64Data;
        const binaryString = atob(base64Clean);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const loadingTask = pdfjsLib.getDocument({ data: bytes });
        pdfDocInstance = await loadingTask.promise;
        pageNumTotal = pdfDocInstance.numPages;

        renderPage(1);
      } catch (err) {
        console.error("Gagal merender PDF:", err);
        alert("Gagal membaca dokumen PDF.");
      }
    }

    async function renderPage(num) {
      if (!pdfDocInstance) return;
      currentPageNum = num;
      
      const page = await pdfDocInstance.getPage(num);
      const canvas = document.getElementById("pdfCanvas");
      const ctx = canvas.getContext("2d");

      const viewport = page.getViewport({ scale: 1.5 });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };

      await page.render(renderContext).promise;

      document.getElementById("slideInfoText").textContent = `Halaman ${currentPageNum} dari ${pageNumTotal}`;
      document.getElementById("pageIndicatorText").textContent = `Slide ${currentPageNum} / ${pageNumTotal}`;
      document.getElementById("studentPageIndicatorText").textContent = `Mengikuti Tampilan Guru - Slide ${currentPageNum} / ${pageNumTotal}`;
    }

    document.getElementById("nextSlideBtn")?.addEventListener("click", () => {
      if (currentUser.role === "guru" && pdfDocInstance && currentPageNum < pageNumTotal) {
        currentPageNum++;
        renderPage(currentPageNum);
        updateSessionState({ currentPage: currentPageNum });
      }
    });

    document.getElementById("prevSlideBtn")?.addEventListener("click", () => {
      if (currentUser.role === "guru" && pdfDocInstance && currentPageNum > 1) {
        currentPageNum--;
        renderPage(currentPageNum);
        updateSessionState({ currentPage: currentPageNum });
      }
    });

    document.getElementById("btnKirimSoal")?.addEventListener("click", () => {
      const soalText = document.getElementById("inputSoalText").value.trim();
      if (!soalText) return alert("Masukkan teks pertanyaan kuis!");

      const newSoalObj = {
        id: "SOAL-" + Date.now(),
        pertanyaan: soalText,
        status: "belum"
      };

      listSoalArray.push(newSoalObj);
      updateSessionState({ daftarSoal: listSoalArray });
      document.getElementById("inputSoalText").value = "";
      alert("Pertanyaan berhasil ditambahkan & dikirim ke murid.");
    });

    function renderListSoal(soalList) {
      const container = document.getElementById("listSoalContainer");
      if (!container) return;

      if (!soalList || soalList.length === 0) {
        container.innerHTML = `<p style='color: #94a3b8; font-style: italic;'>Belum ada soal yang dikirimkan.</p>`;
        return;
      }

      container.innerHTML = "";
      soalList.forEach((s, index) => {
        const div = document.createElement("div");
        div.className = "question-item";
        
        let actionHtml = "";
        if (currentUser.role === "guru") {
          if (s.status === "belum") {
            actionHtml = `
              <div style="display: flex; gap: 8px; margin-top: 10px;">
                <button onclick="window.gradeSoal('${s.id}', 10)" class="btn-success" style="padding: 6px 12px; font-size: 12px; width:auto;">✅ Benar (+10)</button>
                <button onclick="window.gradeSoal('${s.id}', 0)" class="btn-danger" style="padding: 6px 12px; font-size: 12px; width:auto;">❌ Salah (0)</button>
              </div>
            `;
          } else {
            const badgeColor = s.status === "benar" ? "#34d399" : "#ef4444";
            const badgeText = s.status === "benar" ? "✅ Dinilai: Benar (+10 Poin)" : "❌ Dinilai: Salah (0 Poin)";
            actionHtml = `<div style="margin-top: 8px; font-size: 12px; font-weight: 600; color: ${badgeColor};">${badgeText}</div>`;
          }
        } else {
          let statusMurid = "<span style='color: #f59e0b;'>Menunggu penilaian guru...</span>";
          if (s.status === "benar") statusMurid = "<span style='color: #34d399;'>✅ Benar (+10 Poin)</span>";
          else if (s.status === "salah") statusMurid = "<span style='color: #ef4444;'>❌ Salah (0 Poin)</span>";
          
          actionHtml = `<div style="margin-top: 6px; font-size: 12px; font-weight: 600;">Status: ${statusMurid}</div>`;
        }

        div.innerHTML = `
          <div style="width: 100%;">
            <span style="font-size: 12px; color: #38bdf8; font-weight: 600;">Pertanyaan #${index + 1}</span>
            <p style="font-size: 14px; color: #fff; margin-top: 4px;">${s.pertanyaan}</p>
            ${actionHtml}
          </div>
        `;
        container.appendChild(div);
      });
    }

    window.gradeSoal = function(soalId, points) {
      const targetSoal = listSoalArray.find(s => s.id === soalId);
      if (targetSoal && targetSoal.status === "belum") {
        targetSoal.status = points > 0 ? "benar" : "salah";
        currentScore += points;
        
        document.getElementById("liveScoreDisplay").textContent = currentScore;
        updateSessionState({ daftarSoal: listSoalArray, skorMurid: currentScore });
        alert(`Nilai dicatat! Tambahan poin: ${points}`);
      }
    };

    async function updateSessionState(dataObj) {
      const sessionId = currentUser.role === "guru" ? currentUser.targetMurid : currentUser.nama;
      await setDoc(doc(db, "sesi_belajar", sessionId), dataObj, { merge: true });
    }

    function initRealtimeSession() {
      const sessionId = currentUser.role === "guru" ? currentUser.targetMurid : currentUser.nama;
      
      onSnapshot(doc(db, "sesi_belajar", sessionId), (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();

        if (data.currentPage !== undefined && data.currentPage !== currentPageNum) {
          currentPageNum = data.currentPage;
          renderPage(currentPageNum);
        }

        if (data.daftarSoal) {
          listSoalArray = data.daftarSoal;
          renderListSoal(listSoalArray);
        }

        if (data.skorMurid !== undefined) {
          currentScore = data.skorMurid;
          const sDisp = document.getElementById("liveScoreDisplay");
          if (sDisp) sDisp.textContent = currentScore;
        }

        if (data.sesaiSelesai && currentUser.role === "murid") {
          showFinalModal(currentUser.nama, activeMateri ? activeMateri.nama : "Umum", currentScore);
        }
      });
    }

    // Tombol Selesai & Simpan Nilai (Hanya Guru) -> Simpan Rekap ke user_coda murid
    document.getElementById("btnSelesaiBelajar")?.addEventListener("click", async () => {
      const targetSiswa = currentUser.targetMurid;
      const materiNama = activeMateri ? activeMateri.nama : "Umum";

      const muridDocRef = doc(db, "user_coda", targetSiswa);
      const muridSnap = await getDoc(muridDocRef);
      
      let riwayatNilai = [];
      if (muridSnap.exists() && muridSnap.data().riwayatNilai) {
        riwayatNilai = muridSnap.data().riwayatNilai;
      }

      riwayatNilai.push({
        materi: materiNama,
        guruPendamping: currentUser.nama,
        skorAkhir: currentScore,
        daftarSoal: listSoalArray,
        waktuSelesai: new Date().toISOString()
      });

      await setDoc(muridDocRef, { 
        riwayatNilai: riwayatNilai,
        skorTerakhir: currentScore 
      }, { merge: true });

      const sessionId = currentUser.targetMurid;
      await setDoc(doc(db, "sesi_belajar", sessionId), { sesaiSelesai: true }, { merge: true });

      showFinalModal(targetSiswa, materiNama, currentScore);
    });

    document.getElementById("btnCloseModal")?.addEventListener("click", () => {
      document.getElementById("scoreModal").style.display = "none";
    });

    function showFinalModal(namaMurid, materiNama, skor) {
      document.getElementById("modalNamaMurid").textContent = namaMurid;
      document.getElementById("modalMateriName").textContent = materiNama;
      document.getElementById("modalFinalScore").textContent = skor;
      document.getElementById("scoreModal").style.display = "flex";
    }
  }

  // ==========================================
  // 4. HALAMAN REPORT & REKAP NILAI (report.html)
  // ==========================================
  if (path.includes("report.html")) {
    if (!currentUser) { window.location.href = "index.html"; return; }
    
    document.getElementById("displayUserInfo").textContent = `${currentUser.nama} (${currentUser.role.toUpperCase()})`;

    const selectMurid = document.getElementById("selectMuridReport");
    
    try {
      const snap = await getDocs(collection(db, "user_coda"));
      if (selectMurid) {
        selectMurid.innerHTML = "";
        snap.forEach(d => {
          const data = d.data();
          if (data.role === "murid") {
            const opt = document.createElement("option");
            opt.value = d.id;
            opt.textContent = data.nama;
            selectMurid.appendChild(opt);
          }
        });
      }
    } catch(e) { console.error("Gagal memuat daftar murid:", e); }

    document.getElementById("btnLoadReport")?.addEventListener("click", async () => {
      const muridId = selectMurid.value;
      if (!muridId) return alert("Pilih murid terlebih dahulu!");

      const muridDocRef = doc(db, "user_coda", muridId);
      const muridSnap = await getDoc(muridDocRef);

      if (!muridSnap.exists()) {
        return alert("Data profil murid tidak ditemukan di database.");
      }

      const mData = muridSnap.data();
      document.getElementById("reportNamaMurid").textContent = mData.nama || muridId;
      document.getElementById("reportSkorTerakhir").textContent = mData.skorTerakhir || 0;

      const riwayatContainer = document.getElementById("riwayatListContainer");
      riwayatContainer.innerHTML = "";

      const riwayatArray = mData.riwayatNilai || [];
      if (riwayatArray.length === 0) {
        riwayatContainer.innerHTML = `<p style="color: #94a3b8; font-style: italic; font-size: 13px;">Belum ada riwayat pembelajaran atau kuis yang direkam untuk murid ini.</p>`;
      } else {
        riwayatArray.forEach((r, idx) => {
          const card = document.createElement("div");
          card.style.background = "rgba(15, 23, 42, 0.5)";
          card.style.border = "1px solid rgba(255, 255, 255, 0.08)";
          card.style.borderRadius = "10px";
          card.style.padding = "16px";

          let tanggalStr = "-";
          if (r.waktuSelesai) {
            try {
              tanggalStr = new Date(r.waktuSelesai).toLocaleString("id-ID", {
                dateStyle: "medium",
                timeStyle: "short"
              });
            } catch(err) { tanggalStr = r.waktuSelesai; }
          }

          let soalHtml = "";
          if (r.daftarSoal && r.daftarSoal.length > 0) {
            soalHtml += `<div style="margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 10px;"><p style="font-size: 12px; color: #38bdf8; margin-bottom: 8px;">Daftar Pertanyaan & Status Jawaban:</p><div style="display: flex; flex-direction: column; gap: 6px;">`;
            
            r.daftarSoal.forEach((s, sIdx) => {
              let badgeStyle = "color: #f59e0b;";
              let badgeText = "Belum Dinilai";
              if (s.status === "benar") {
                badgeStyle = "color: #34d399; font-weight: 600;";
                badgeText = "✅ Benar (+10)";
              } else if (s.status === "salah") {
                badgeStyle = "color: #ef4444; font-weight: 600;";
                badgeText = "❌ Salah (0)";
              }

              soalHtml += `
                <div style="background: rgba(30, 41, 59, 0.6); padding: 8px 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
                  <span><b>#${sIdx + 1}</b> ${s.pertanyaan}</span>
                  <span style="${badgeStyle}">${badgeText}</span>
                </div>
              `;
            });
            soalHtml += `</div></div>`;
          }

          card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="font-size: 12px; color: #38bdf8; font-weight: 600;">Sesi #${idx + 1} - Materi: ${r.materi || 'Umum'}</span>
                <p style="font-size: 13px; color: #94a3b8; margin-top: 2px;">Guru Pendamping: ${r.guruPendamping || '-'} | Waktu: ${tanggalStr}</p>
              </div>
              <div style="text-align: right;">
                <span style="font-size: 12px; color: #cbd5e1;">Skor Akhir:</span>
                <h3 style="color: #34d399; font-size: 20px;">${r.skorAkhir || 0}</h3>
              </div>
            </div>
            ${soalHtml}
          `;
          riwayatContainer.appendChild(card);
        });
      }

      document.getElementById("emptyReportState").style.display = "none";
      document.getElementById("reportResultSection").style.display = "block";
    });
  }
});

async function loadMateriList() {
  const container = document.getElementById("listMateriContainer");
  if (!container) return;
  container.innerHTML = "Memuat materi dari Firestore...";
  try {
    const snap = await getDocs(collection(db, "mater_coda"));
    container.innerHTML = "";
    if (snap.empty) {
      container.innerHTML = "<p style='color:#94a3b8; font-size:13px;'>Belum ada materi tersimpan di Firestore.</p>";
      return;
    }
    snap.forEach(d => {
      const m = d.data();
      const div = document.createElement("div");
      div.className = "item-card";
      div.innerHTML = `<span>📚 <b>${m.nama}</b> (ID: <code>${m.id}</code> - Dokumen Tersimpan)</span>`;
      container.appendChild(div);
    });
  } catch(e) {
    container.innerHTML = "Gagal memuat daftar materi.";
  }
}