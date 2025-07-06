// ✅ 완성된 script.js (실시간 연동 + 교집합 계산 포함)
document.addEventListener("DOMContentLoaded", () => {
  // --- PIN 및 링크 복사 로직 (수정 없음) ---
  let pin = window.location.hash.slice(1);
  if (!pin) {
    pin = prompt("캘린더 PIN을 입력하세요:");
    if (pin) {
      window.location.hash = pin;
      window.location.reload();
    }
    return;
  }
  const copyLinkBtn = document.getElementById("copyLinkBtn");
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert("링크가 복사되었습니다!"))
        .catch(err => alert("복사에 실패했습니다: " + err));
    });
  }

  // --- DOM 요소 및 기본 변수 선언 (수정 없음) ---
  const calThis = document.getElementById("calendar");
  const calNext = document.getElementById("calendarNext");
  const yM = document.getElementById("yearMonth");
  const yMNext = document.getElementById("yearMonthNext");
  const prevBtn = document.getElementById("prevMonth");
  const nextBtn = document.getElementById("nextMonth");
  const toggleBtn = document.getElementById("toggleNextMonthBtn");
  const resetBtn = document.getElementById("resetBtn");
  const submitBtn = document.getElementById("submitBtn");
  const tbl = document.getElementById("resultTable");
  const noChk = document.getElementById("noPreference");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let current = new Date(today.getFullYear(), today.getMonth(), 1);
  const holidays = new Set([
    "2025-01-01", "2025-03-01", "2025-05-05", "2025-05-06",
    "2025-06-06", "2025-08-15", "2025-10-03", "2025-10-05",
    "2025-10-06", "2025-10-07", "2025-10-08", "2025-10-09",
    "2025-12-25"
  ]);

  // --- 달력 렌더링 함수 (수정 없음) ---
  function renderCal(date, container, labelEl) {
    container.innerHTML = "";
    const Y = date.getFullYear(), M = date.getMonth();
    labelEl.textContent = `${Y}년 ${M + 1}월`;
    const firstDay = new Date(Y, M, 1).getDay();
    const lastDate = new Date(Y, M + 1, 0).getDate();
    const prevLast = new Date(Y, M, 0).getDate();

    for (let i = firstDay; i > 0; i--) {
      const d = document.createElement("div");
      d.className = "date past";
      d.textContent = prevLast - i + 1;
      container.appendChild(d);
    }
    for (let d = 1; d <= lastDate; d++) {
      const cell = document.createElement("div");
      cell.className = "date";
      cell.textContent = d;
      const dt = new Date(Y, M, d); dt.setHours(0, 0, 0, 0);
      const ds = `${Y}-${String(M + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cell.dataset.date = ds;
      if (dt.getTime() === today.getTime()) cell.classList.add("today");
      if (dt < today) cell.classList.add("past");
      const wd = dt.getDay();
      if (wd === 0 || holidays.has(ds)) cell.style.color = "red";
      else if (wd === 6) cell.style.color = "blue";
  if (!cell.classList.contains("past")) {
  cell.addEventListener("click", () => {
    if (cell.classList.contains("preferred")) {
      cell.classList.replace("preferred", "user-unavailable");
    } else if (cell.classList.contains("user-unavailable")) {
      cell.classList.remove("user-unavailable");
    } else {
      cell.classList.add("preferred");
    }
  });
}

      container.appendChild(cell);
    }
    const total = container.children.length;
    const slots = (total > 35 ? 42 : 35) - total;
    for (let i = 1; i <= slots; i++) {
      const d = document.createElement("div");
      d.className = "date past";
      d.textContent = i;
      container.appendChild(d);
    }
  }

  function renderAll() {
    renderCal(current, calThis, yM);
    const nxt = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    renderCal(nxt, calNext, yMNext);
  }

  // --- 버튼 이벤트 핸들러 (수정 없음) ---
  prevBtn.onclick = () => { current.setMonth(current.getMonth() - 1); renderAll(); };
  nextBtn.onclick = () => { current.setMonth(current.getMonth() + 1); renderAll(); };
  toggleBtn.onclick = () => {
    const nc = document.getElementById("nextMonthContainer");
    const show = nc.style.display === "none";
    nc.style.display = show ? "block" : "none";
    toggleBtn.textContent = show ? "다음달 접기" : "다음달 보기";
  };
  resetBtn.onclick = () => {
    if (!confirm("달력, 제출결과가 리셋됩니다")) return;
    // Firebase 데이터 리셋 로직 필요 (이 버튼은 현재 로컬만 리셋함)
    document.querySelectorAll(".date.preferred, .date.unavailable").forEach(el => el.classList.remove("preferred", "unavailable"));
    const tb = tbl.tBodies[0];
    if (tb) tb.innerHTML = "";
    noChk.checked = false;
    document.getElementById("blockSat").checked = false;
    document.getElementById("blockSun").checked = false;
  };

  // --- 제출(submit) 로직 (수정 없음) ---
  submitBtn.onclick = () => {
    const name = document.getElementById("userName").value.trim();
    if (!name) return alert("이름을 입력해주세요.");
    const noP = noChk.checked;
    const blockSat = document.getElementById("blockSat").checked;
    const blockSun = document.getElementById("blockSun").checked;

    if (blockSat || blockSun) {
      document.querySelectorAll(".date:not(.past)").forEach(cell => {
        const wd = new Date(cell.dataset.date).getDay();
        if ((blockSat && wd === 6) || (blockSun && wd === 0)) {
          cell.classList.add("unavailable");
        }
      });
    }

    const wantCur = [], canCur = [], wantNext = [], canNext = [];
document.querySelectorAll("#calendar .date:not(.past)").forEach(c => {
  const day = String(+c.dataset.date.slice(8));
  if (c.classList.contains("preferred")) wantCur.push(day);
  else if (!c.classList.contains("user-unavailable")) canCur.push(day);
});
document.querySelectorAll("#calendarNext .date:not(.past)").forEach(c => {
  const day = String(+c.dataset.date.slice(8));
  if (c.classList.contains("preferred")) wantNext.push(day);
  else if (!c.classList.contains("user-unavailable")) canNext.push(day);
});
    
    const dataToSave = {
      name,
      color: document.getElementById("userColor").value,
      noPreference: noP,
      wantCur, canCur, wantNext, canNext, 
      timestamp: new Date()
    };

    db.collection("calendars").doc(pin).collection("votes").doc(name).set(dataToSave)
      .then(() => {
        console.log("✅ Firebase 저장 성공");
        document.querySelectorAll(".date.preferred, .date.unavailable").forEach(el => {
          el.classList.remove("preferred", "user-unavailable");
        });
      });
    noChk.checked = false;
    document.getElementById("blockSat").checked = false;
    document.getElementById("blockSun").checked = false;
  };

  renderAll();
  
  // =================================================================
  // ✅ 실시간 업데이트 및 교집합 계산 로직 (버그 수정)
  // =================================================================
  db.collection("calendars").doc(pin).collection("votes").onSnapshot(snapshot => {
    const tblBody = tbl.tBodies[0];
    if (!tblBody) tbl.createTBody();
    tbl.tBodies[0].innerHTML = "";

    const allDates = {}; // 날짜별 투표 집계 객체 초기화
    const totalVotes = snapshot.size;
    const myName = document.getElementById("userName").value.trim();
    let hasSubmitted = false;
    
    // 1. 모든 투표 데이터를 순회하며 테이블 채우고, 교집합 계산을 위한 데이터 수집
    snapshot.forEach(doc => {
      const data = doc.data();
      if (doc.id === myName) hasSubmitted = true;

      // --- 유저별 결과 테이블 행 추가 ---
      const row = tbl.tBodies[0].insertRow();
      row.dataset.user = data.name;
      const c1 = row.insertCell(), c2 = row.insertCell(), c3 = row.insertCell();
      c1.textContent = data.name;
      c1.style.color = data.color || "black";
      c1.style.fontWeight = "bold";

      const curM = current.getMonth() + 1;
      const nxtM = current.getMonth() + 2 > 12 ? 1 : current.getMonth() + 2;
      const fmt = (mon, arr) => arr && arr.length ? `<strong>${mon}월</strong>: ${arr.join(", ")}` : "";
      
      const wantParts = data.noPreference ? ["모든 날짜 가능"] : [fmt(curM, data.wantCur), fmt(nxtM, data.wantNext)].filter(Boolean);
      const canParts = data.noPreference ? ["-"] : [fmt(curM, data.canCur), fmt(nxtM, data.canNext)].filter(Boolean);

      c2.innerHTML = wantParts.join("<br>");
      c3.innerHTML = canParts.join("<br>");

      // --- 교집합 계산을 위해 날짜별 투표 수 집계 (수정된 로직) ---
      const wantCurSet = new Set(data.wantCur || []);
      const canCurSet = new Set(data.canCur || []);
      const wantNextSet = new Set(data.wantNext || []);
      const canNextSet = new Set(data.canNext || []);

      const allPossibleDays = Array.from({ length: 31 }, (_, i) => String(i + 1));

      allPossibleDays.forEach(day => {
        // 현재 달
        const curKey = `cur-${day}`;
        if (!allDates[curKey]) allDates[curKey] = { want: 0, can: 0, unavailable: 0 };
        if (data.noPreference || wantCurSet.has(day)) {
            allDates[curKey].want++;
        } else if (canCurSet.has(day)) {
            allDates[curKey].can++;
        } else {
            allDates[curKey].unavailable++;
        }

        // 다음 달
        const nextKey = `next-${day}`;
        if (!allDates[nextKey]) allDates[nextKey] = { want: 0, can: 0, unavailable: 0 };
        if (data.noPreference || wantNextSet.has(day)) {
            allDates[nextKey].want++;
        } else if (canNextSet.has(day)) {
            allDates[nextKey].can++;
        } else {
            allDates[nextKey].unavailable++;
        }
      });
    });

    // 2. 집계된 투표 결과로 달력에 교집합 색상 표시
    if (totalVotes === 0 || !hasSubmitted) {
        document.querySelectorAll(".all-available, .all-preferred, .unavailable").forEach(cell => {
            cell.classList.remove("all-available", "all-preferred", "unavailable");
        });
        return;
    }
    
    document.querySelectorAll(".date:not(.past)").forEach(cell => {
        cell.classList.remove("all-available", "all-preferred", "unavailable");

        const day = cell.textContent;
        const isNextMonth = cell.closest("#calendarNext");
        const key = isNextMonth ? `next-${day}` : `cur-${day}`;
        const stats = allDates[key];

        if (stats) {
            if (stats.unavailable > 0) {
                cell.classList.add("unavailable");
            } else if (stats.want === totalVotes) {
                cell.classList.add("all-preferred");
            } else if (stats.want + stats.can === totalVotes) {
                cell.classList.add("all-available");
            }
        }
    });
  });
});