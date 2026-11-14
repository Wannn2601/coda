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

    // Shortcut Demo Natan (Murid)
    document.getElementById("btnQuickNatan")?.addEventListener("click", async () => {
      const userData = { nama: "Natan", pass: "123456", role: "murid", targetMurid: "", timestamp: new Date() };
      await setDoc(doc(db, "user_coda", "Natan"), userData, { merge: true });
      sessionStorage.setItem("coda_user", JSON.stringify(userData));
      window.location.href = "materi.html";
    });

    // Shortcut Demo Guru (Budi)
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
  // 2. DASHBOARD MATERI (materi.html) - LocalStorage Upload
  // ==========================================
  if (path.includes("materi.html")) {
    if (!currentUser) { window.location.href = "index.html"; return; }
    
    document.getElementById("displayUserInfo").textContent = `${currentUser.nama} (${currentUser.role.toUpperCase()})`;
    if (currentUser.role === "guru") {
      document.getElementById("uploadSection").style.display = "block";
    }

    document.getElementById("btnLogout")?.addEventListener("click", () => {
      sessionStorage.clear();
      window.location.href = "index.html";
    });

    const uploadForm = document.getElementById("uploadPptForm");
    if (uploadForm) {
      uploadForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const id = document.getElementById("pptId").value.trim();
        const nama = document.getElementById("pptName").value.trim();
        const contentRaw = document.getElementById("pptContentJson").value;
        
        const slides = contentRaw.split("---slide---").map(s => s.trim());
        const materiObj = { id, nama, slides };

        // Simpan ke LocalStorage dengan key 'mater_coda'
        let existingMateri = JSON.parse(localStorage.getItem("mater_coda")) || [];
        existingMateri = existingMateri.filter(m => m.id !== id); // update jika id sama
        existingMateri.push(materiObj);
        localStorage.setItem("mater_coda", JSON.stringify(existingMateri));

        alert("Materi PPT berhasil disimpan ke LocalStorage!");
        loadMateriListLocal();
        uploadForm.reset();
      });
    }

    loadMateriListLocal();
  }

  // ==========================================
  // 3. RUANG BELAJAR (pelajaran.html)
  // ==========================================
  if (path.includes("pelajaran.html")) {
    if (!currentUser) { window.location.href = "index.html"; return; }

    document.getElementById("activeRoleBadge").textContent = `Role: ${currentUser.role.toUpperCase()}`;
    document.getElementById("activeTargetBadge").textContent = `Target: ${currentUser.targetMurid || currentUser.nama}`;

    const dropdown = document.getElementById("selectMateriDropdown");
    const localMateriList = JSON.parse(localStorage.getItem("mater_coda")) || [];
    
    if (dropdown) {
      dropdown.innerHTML = "";
      localMateriList.forEach(m => {
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = m.nama;
        dropdown.appendChild(opt);
      });
    }

    let activeMateri = null;
    let currentSlideIdx = 0;
    let currentScore = 0;

    document.getElementById("btnMulaiPelajaran")?.addEventListener("click", () => {
      const selectedId = dropdown.value;
      if (!selectedId) return alert("Pilih materi terlebih dahulu!");

      activeMateri = localMateriList.find(m => m.id === selectedId);
      if (!activeMateri) return alert("Materi tidak ditemukan di LocalStorage!");

      document.getElementById("selectMateriPrompt").style.display = "none";
      document.getElementById("pptViewerSection").style.display = "block";
      document.getElementById("classroomTitle").textContent = `Pelajaran: ${activeMateri.nama}`;

      if (currentUser.role === "guru") {
        document.getElementById("slideControlsNav").style.display = "flex";
        document.getElementById("teacherQuizForm").style.display = "block";
        document.getElementById("gradingActionArea").style.display = "block";
      } else {
        document.getElementById("slideControlsNav").style.display = "none";
        document.getElementById("studentWaitingNotice").style.display = "block";
      }

      renderSlide(0);
      initRealtimeSession();
    });

    document.getElementById("nextSlideBtn")?.addEventListener("click", () => {
      if (activeMateri && currentSlideIdx < activeMateri.slides.length - 1) {
        currentSlideIdx++;
        updateSessionState({ currentSlide: currentSlideIdx });
      }
    });

    document.getElementById("prevSlideBtn")?.addEventListener("click", () => {
      if (activeMateri && currentSlideIdx > 0) {
        currentSlideIdx--;
        updateSessionState({ currentSlide: currentSlideIdx });
      }
    });

    document.getElementById("btnKirimSoal")?.addEventListener("click", () => {
      const soalText = document.getElementById("inputSoalText").value.trim();
      const kunci = document.getElementById("inputSoalKunci").value;
      if (!soalText) return alert("Masukkan teks soal!");

      updateSessionState({ soal: soalText, kunciJawaban: kunci, statusSoal: "aktif" });
      alert("Soal berhasil dikirim ke murid.");
    });

    document.getElementById("btnBeriBenar")?.addEventListener("click", () => applyGrade(10));
    document.getElementById("btnBeriSalah")?.addEventListener("click", () => applyGrade(0));

    function applyGrade(points) {
      currentScore += points;
      document.getElementById("liveScoreDisplay").textContent = currentScore;
      updateSessionState({ skorMurid: currentScore, statusSoal: "dinilai" });
      alert(`Penilaian dicatat. Tambahan poin: ${points}`);
    }

    async function updateSessionState(dataObj) {
      const sessionId = currentUser.role === "guru" ? currentUser.targetMurid : currentUser.nama;
      await setDoc(doc(db, "sesi_belajar", sessionId), dataObj, { merge: true });
    }

    function initRealtimeSession() {
      const sessionId = currentUser.role === "guru" ? currentUser.targetMurid : currentUser.nama;
      
      onSnapshot(doc(db, "sesi_belajar", sessionId), (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();

        if (data.currentSlide !== undefined && data.currentSlide !== currentSlideIdx) {
          currentSlideIdx = data.currentSlide;
          renderSlide(currentSlideIdx);
        }

        if (data.soal) {
          const qDisp = document.getElementById("questionTextDisplay");
          if (qDisp) qDisp.textContent = `Soal: ${data.soal}`;
        }

        if (data.skorMurid !== undefined) {
          currentScore = data.skorMurid;
          const sDisp = document.getElementById("liveScoreDisplay");
          if (sDisp) sDisp.textContent = currentScore;
        }
      });
    }

    function renderSlide(idx) {
      if (!activeMateri) return;
      document.getElementById("currentSlideNum").textContent = idx + 1;
      document.getElementById("totalSlideNum").textContent = activeMateri.slides.length;
      document.getElementById("slideContentDisplay").textContent = activeMateri.slides[idx] || "(Slide Kosong)";
    }

    document.getElementById("btnSelesaiBelajar")?.addEventListener("click", async () => {
      const targetSiswa = currentUser.role === "guru" ? currentUser.targetMurid : currentUser.nama;
      
      await addDoc(collection(db, "record_nilai"), {
        namaMurid: targetSiswa,
        guruPendamping: currentUser.role === "guru" ? currentUser.nama : "Mandiri",
        materi: activeMateri ? activeMateri.nama : "Umum",
        skorAkhir: currentScore,
        waktuSelesai: new Date()
      });

      document.getElementById("modalNamaMurid").textContent = targetSiswa;
      document.getElementById("modalMateriName").textContent = activeMateri ? activeMateri.nama : "-";
      document.getElementById("modalFinalScore").textContent = currentScore;
      document.getElementById("scoreModal").style.display = "flex";
    });
  }
});

function loadMateriListLocal() {
  const container = document.getElementById("listMateriContainer");
  if (!container) return;
  
  const localMateriList = JSON.parse(localStorage.getItem("mater_coda")) || [];
  container.innerHTML = "";
  
  if (localMateriList.length === 0) {
    container.innerHTML = "<p style='color:#94a3b8; font-size:13px;'>Belum ada materi tersimpan di LocalStorage.</p>";
    return;
  }

  localMateriList.forEach(m => {
    const div = document.createElement("div");
    div.className = "item-card";
    div.innerHTML = `<span>📚 <b>${m.nama}</b> (ID: <code>${m.id}</code> - ${m.slides.length} Slide)</span>`;
    container.appendChild(div);
  });
}