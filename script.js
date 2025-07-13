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

  // --- DOM 요소 및 기본 변수 선언 ---
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
  
  let isEditing = false; 

  const holidays = new Set([
    "2025-01-01", "2025-03-01", "2025-05-05", "2025-05-06",
    "2025-06-06", "2025-08-15", "2025-10-03", "2025-10-05",
    "2025-06-06", "2025-08-15", "2025-10-03", "2025-10-05",
    "2025-10-06", "2025-10-07", "2025-10-08", "2025-10-09",
    "2025-12-25"
  ]);

  // --- 달력 렌더링 함수 ---
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
          cell.classList.remove("all-available", "all-preferred", "unavailable");
          
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

  // --- 버튼 이벤트 핸들러 ---
  prevBtn.onclick = () => { current.setMonth(current.getMonth() - 1); renderAll(); };
  nextBtn.onclick = () => { current.setMonth(current.getMonth() + 1); renderAll(); };
  toggleBtn.onclick = () => {
    const nc = document.getElementById("nextMonthContainer");
    const show = nc.style.display === "none";
    nc.style.display = show ? "block" : "none";
    toggleBtn.textContent = show ? "다음달 접기" : "다음달 보기";
  };
  resetBtn.onclick = () => {
  const myName = document.getElementById("userName").value.trim();
  if (!myName) {
    alert("이름을 먼저 입력해주세요.");
    return;
  }

  if (!confirm(`"${myName}"님의 제출 정보를 모두 삭제할까요?`)) return;

  db.collection("calendars").doc(pin).collection("votes").doc(myName)
    .delete()
    .then(() => {
      alert("내 제출 데이터가 삭제되었습니다.");
      // ✅ 달력 초기화
      document.querySelectorAll(".date:not(.past)").forEach(cell => {
        cell.classList.remove("preferred", "user-unavailable", "all-available", "all-preferred", "unavailable");
      });

      // ✅ 버튼 텍스트 및 상태 초기화
      submitBtn.textContent = "결과 제출하기";
      isEditing = false;
    })
    .catch((error) => {
      console.error("삭제 실패:", error);
      alert("삭제 중 오류가 발생했습니다.");
    });
};

  // --- 나의 이전 투표내역을 불러오는 함수 ---
  function loadMyVote() {
    const myName = document.getElementById("userName").value.trim();
    if (!myName) {
        alert("이름을 먼저 입력해주세요.");
        return;
    }
    db.collection("calendars").doc(pin).collection("votes").doc(myName).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            const wantCurSet = new Set(data.wantCur || []);
            const wantNextSet = new Set(data.wantNext || []);
            // '가능'은 '선호'와 '불가능'을 제외한 나머지 전부이므로, '불가능'만 알면 된다.
            const unavailCurSet = new Set();
            const unavailNextSet = new Set();
            
            // '불가능' 날짜를 추정한다 (wants와 cans에 모두 없는 날짜)
            const allDays = Array.from({length: 31}, (_,i) => String(i+1));
            const canCurSet = new Set(data.canCur || []);
            allDays.forEach(day => {
                if(!wantCurSet.has(day) && !canCurSet.has(day)) {
                    unavailCurSet.add(day);
                }
            });
            const canNextSet = new Set(data.canNext || []);
            allDays.forEach(day => {
                if(!wantNextSet.has(day) && !canNextSet.has(day)) {
                    unavailNextSet.add(day);
                }
            });

            document.querySelectorAll(".date:not(.past)").forEach(cell => {
                cell.classList.remove("preferred", "user-unavailable", "all-available", "all-preferred", "unavailable");
                const day = cell.textContent;
                const isNext = cell.closest("#calendarNext");

                if (isNext) { // 다음달
                    if (wantNextSet.has(day)) cell.classList.add("preferred");
                    if (unavailNextSet.has(day)) cell.classList.add("user-unavailable");
                } else { // 이번달
                    if (wantCurSet.has(day)) cell.classList.add("preferred");
                    if (unavailCurSet.has(day)) cell.classList.add("user-unavailable");
                }
            });
            isEditing = true;
            submitBtn.textContent = '수정 완료';
        } else {
            alert("기존 제출 내역이 없습니다. 먼저 제출해주세요.");
        }
    });
  }

  // --- 제출 및 수정 버튼 로직 ---
  submitBtn.onclick = () => {
    const myName = document.getElementById("userName").value.trim();
    if (!myName) return alert("이름을 입력해주세요.");
    
    if (submitBtn.textContent === '수정하기') {
        loadMyVote();
        return;
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
        name: myName,
        color: document.getElementById("userColor").value,
        noPreference: noChk.checked,
        wantCur, canCur, wantNext, canNext, 
        timestamp: new Date()
    };
    
    // ✅ 2번 클릭 문제 해결: isEditing 상태를 DB 저장 전에 먼저 변경
    isEditing = false; 

    db.collection("calendars").doc(pin).collection("votes").doc(myName).set(dataToSave)
      .then(() => {
        console.log("✅ Firebase 저장/수정 성공");
          noChk.checked = false; // ✅ 자동으로 상관없음 체크 해제
      });
  };

  renderAll();
  
  // --- 실시간 업데이트 및 교집합 계산 로직 ---
  db.collection("calendars").doc(pin).collection("votes").onSnapshot(snapshot => {
    const tblBody = tbl.tBodies[0];
    if (!tblBody) tbl.createTBody();
    tbl.tBodies[0].innerHTML = "";

    const allDates = {};
    const totalVotes = snapshot.size;
    const myName = document.getElementById("userName").value.trim();
    let hasSubmitted = false;
    
    snapshot.forEach(doc => {
      if (doc.id === myName) hasSubmitted = true;
      const data = doc.data();
      // 테이블 채우기 로직 (수정 없음)
      const row = tbl.tBodies[0].insertRow();
      row.dataset.user = data.name;
      const c1 = row.insertCell(), c2 = row.insertCell(), c3 = row.insertCell();
      c1.textContent = data.name; c1.style.color = data.color || "black"; c1.style.fontWeight = "bold";
      const curM = current.getMonth() + 1;
      const nxtM = current.getMonth() + 2 > 12 ? 1 : current.getMonth() + 2;
      const fmt = (mon, arr) => arr && arr.length ? `<strong>${mon}월</strong>: ${arr.join(", ")}` : "";
      const wantParts = data.noPreference ? ["모든 날짜 가능"] : [fmt(curM, data.wantCur), fmt(nxtM, data.wantNext)].filter(Boolean);
      const canParts = data.noPreference ? ["-"] : [fmt(curM, data.canCur), fmt(nxtM, data.canNext)].filter(Boolean);
      c2.innerHTML = wantParts.join("<br>");
      c3.innerHTML = canParts.join("<br>");

      // 교집합 계산 로직 (수정 없음)
      const wantCurSet = new Set(data.wantCur || []); const canCurSet = new Set(data.canCur || []);
      const wantNextSet = new Set(data.wantNext || []); const canNextSet = new Set(data.canNext || []);
      const allPossibleDays = Array.from({ length: 31 }, (_, i) => String(i + 1));
      allPossibleDays.forEach(day => {
        const curKey = `cur-${day}`; if (!allDates[curKey]) allDates[curKey] = { want: 0, can: 0, unavailable: 0 };
        if (data.noPreference || wantCurSet.has(day)) allDates[curKey].want++;
        else if (canCurSet.has(day)) allDates[curKey].can++;
        else allDates[curKey].unavailable++;
        const nextKey = `next-${day}`; if (!allDates[nextKey]) allDates[nextKey] = { want: 0, can: 0, unavailable: 0 };
        if (data.noPreference || wantNextSet.has(day)) allDates[nextKey].want++;
        else if (canNextSet.has(day)) allDates[nextKey].can++;
        else allDates[nextKey].unavailable++;
      });
    });
    
    if (!isEditing) {
        submitBtn.textContent = hasSubmitted ? '수정하기' : '결과 제출하기';
    }

    // ✅ 초기 로딩 시 빈 달력 표시: 내가 제출했고, 수정 중이 아닐 때만 교집합 표시
    if (hasSubmitted && !isEditing) {
      document.querySelectorAll(".date:not(.past)").forEach(cell => {
          cell.classList.remove("all-available", "all-preferred", "unavailable", "preferred", "user-unavailable");
          const day = cell.textContent;
          const isNextMonth = cell.closest("#calendarNext");
          const key = isNextMonth ? `next-${day}` : `cur-${day}`;
          const stats = allDates[key];
          if (stats && totalVotes > 0) {
              if (stats.unavailable > 0) cell.classList.add("unavailable");
              else if (stats.want === totalVotes) cell.classList.add("all-preferred");
              else if (stats.want + stats.can === totalVotes) cell.classList.add("all-available");
          }
      });
    } else if (!hasSubmitted) { // ✅ 아직 제출 안했으면 달력 깨끗하게 비우기
       document.querySelectorAll(".date:not(.past)").forEach(cell => {
           cell.classList.remove("all-available", "all-preferred", "unavailable", "preferred", "user-unavailable");
       });
    }
  });
});