document.addEventListener("DOMContentLoaded", () => {
      const firebaseConfig = {
      apiKey: "AIzaSyCaRdS6DWMNd8LyGvWnO61MsOp49QuUFKU",
      authDomain: "cal-u-c17a9.firebaseapp.com",
      projectId: "cal-u-c17a9",
      storageBucket: "cal-u-c17a9.firebasestorage.app",
      messagingSenderId: "237824369858",
      appId: "1:237824369858:web:86d924f7dcac9a4163075b",
      measurementId: "G-825J221WP5"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
  // --- PIN 및 링크 복사 로직 ---
  let pin = window.location.hash.slice(1);
  if (!pin) {
    pin = prompt("캘린더 PIN을 입력하세요:");
    if (pin) {
      window.location.hash = pin;
      window.location.reload();
    }
    return;
  }

  // --- DOM 요소 선언 ---
  const calThis = document.getElementById("calendar");
  const calNext = document.getElementById("calendarNext");
  const yM = document.getElementById("yearMonth");
  const yMNext = document.getElementById("yearMonthNext");
  const prevBtn = document.getElementById("prevMonth");
  const nextBtn = document.getElementById("nextMonth");
  const toggleBtn = document.getElementById("toggleNextMonthBtn");
  const nc = document.getElementById("nextMonthContainer");
  const resetBtn = document.getElementById("resetBtn");
  const newCalBtn = document.getElementById("newCalBtn");
  const submitBtn = document.getElementById("submitBtn");
  const tbl = document.getElementById("resultTable");
  const copyLinkBtn = document.getElementById("copyLinkBtn");
  const userNameInput = document.getElementById("userName");
  const helpBtn = document.getElementById("helpBtn");
  const helpModal = document.getElementById('helpModal');
  const closeBtn = document.querySelector('.modal .close-btn');
  const noBtn = document.getElementById("noPreference");
  const satBtn = document.getElementById("blockSat");
  const sunBtn = document.getElementById("blockSun");
  const summaryBtn = document.getElementById('summaryBtn');
  const backBtn = document.getElementById('backBtn');
  const container = document.querySelector('.container');
  const finalDecisionBox = document.getElementById('finalDecisionBox');
  const finalDateInput = document.getElementById('finalDateInput');
  const finalizeBtn = document.getElementById('finalizeBtn');
  const cancelFinalizeBtn = document.getElementById('cancelFinalizeBtn');
  
  // --- 지도 및 검색 관련 요소 ---
  const locationSection = document.getElementById('locationSection');
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');

  // --- 기본 변수 선언 ---
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let current = new Date(today.getFullYear(), today.getMonth(), 1);
  let isEditing = false;
  const holidays = new Set([
    "2025-01-01", "2025-03-01", "2025-05-05", "2025-05-06",
    "2025-06-06", "2025-08-15", "2025-10-03", "2025-10-05",
    "2025-10-06", "2025-10-07", "2025-10-08", "2025-10-09",
    "2025-12-25"
  ]);

  // --- 저장된 사용자명 불러오기 ---
  const savedName = localStorage.getItem('calU_userName');
  if (savedName && userNameInput) {
    userNameInput.value = savedName;
  }

  // --- 링크 복사 버튼 이벤트 ---
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert("링크가 복사되었습니다!"))
        .catch(err => alert("복사에 실패했습니다: " + err));
    });
  }

  // --- 도움말 모달 이벤트 ---
  if (helpBtn && helpModal && closeBtn) {
    helpBtn.addEventListener('click', () => { helpModal.style.display = 'block'; });
    closeBtn.addEventListener('click', () => { helpModal.style.display = 'none'; });
    window.addEventListener('click', (event) => {
      if (event.target === helpModal) { helpModal.style.display = 'none'; }
    });
  }

  // --- 날짜 클릭 처리 함수 ---
  function onDateClick(cell) {
    if (cell.classList.contains('finalized')) {
      if (confirm(`"${cell.dataset.date}" 날짜 확정을 취소하시겠습니까?`)) {
        db.collection("calendars").doc(pin).update({
          finalizedDate: firebase.firestore.FieldValue.delete()
        }).catch(err => alert("취소 중 오류 발생: " + err));
      }
      return;
    }
    if (container.classList.contains('summary-mode')) {
      if (cell.classList.contains('all-available') || cell.classList.contains('all-preferred')) {
        finalDateInput.value = cell.dataset.date;
        finalDecisionBox.style.display = 'block';
      }
    } else {
      cell.classList.remove("all-available", "all-preferred", "unavailable");
      if (cell.classList.contains("preferred")) {
        cell.classList.replace("preferred", "user-unavailable");
      } else if (cell.classList.contains("user-unavailable")) {
        cell.classList.remove("user-unavailable");
      } else {
        cell.classList.add("preferred");
      }
    }
  }

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
      const dt = new Date(Y, M, d);
      dt.setHours(0, 0, 0, 0);
      const ds = `${Y}-${String(M + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cell.dataset.date = ds;

      if (dt.getTime() === today.getTime()) cell.classList.add("today");
      if (dt < today) cell.classList.add("past");

      const wd = dt.getDay();
      if (wd === 0 || holidays.has(ds)) cell.style.color = "red";
      else if (wd === 6) cell.style.color = "blue";

      if (!cell.classList.contains("past")) {
        cell.addEventListener("click", () => onDateClick(cell));
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

  // --- 주말 차단 적용 함수 ---
  function applyWeekendBlocks() {
    const blockSat = satBtn.classList.contains('active');
    const blockSun = sunBtn.classList.contains('active');
    const isNextMonthVisible = nc.style.display === 'block';

    document.querySelectorAll('.date:not(.past)').forEach(cell => {
      const dayOfWeek = new Date(cell.dataset.date).getDay();
      const isNextMonthCell = cell.closest("#calendarNext");
      const shouldSkip = isNextMonthCell && !isNextMonthVisible;

      if (dayOfWeek === 6 && !shouldSkip) {
        if (blockSat) cell.classList.add('user-unavailable');
        else cell.classList.remove('user-unavailable');
      }
      if (dayOfWeek === 0 && !shouldSkip) {
        if (blockSun) cell.classList.add('user-unavailable');
        else cell.classList.remove('user-unavailable');
      }
    });
  }

  function renderAll() {
    renderCal(current, calThis, yM);
    const nxt = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    renderCal(nxt, calNext, yMNext);
    applyWeekendBlocks();
  }

  // --- 내 이전 투표내역 불러오기 함수 ---
  function loadMyVote() {
    noBtn.classList.remove('active');
    satBtn.classList.remove('active');
    sunBtn.classList.remove('active');
    const myName = userNameInput.value.trim();
    if (!myName) { alert("이름을 먼저 입력해주세요."); return; }

    db.collection("calendars").doc(pin).collection("votes").doc(myName).get().then(doc => {
      if (doc.exists) {
        const data = doc.data();
        const wantCurSet = new Set(data.wantCur || []);
        const wantNextSet = new Set(data.wantNext || []);
        const canCurSet = new Set(data.canCur || []);
        const canNextSet = new Set(data.canNext || []);
        const allDays = Array.from({ length: 31 }, (_, i) => String(i + 1));
        const unavailCurSet = new Set();
        allDays.forEach(day => { if (!wantCurSet.has(day) && !canCurSet.has(day)) unavailCurSet.add(day); });
        const unavailNextSet = new Set();
        allDays.forEach(day => { if (!wantNextSet.has(day) && !canNextSet.has(day)) unavailNextSet.add(day); });
        document.querySelectorAll(".date:not(.past)").forEach(cell => {
          cell.classList.remove("preferred", "user-unavailable", "all-available", "all-preferred", "unavailable");
          const day = cell.textContent;
          const isNext = cell.closest("#calendarNext");
          if (isNext) {
            if (wantNextSet.has(day)) cell.classList.add("preferred");
            else if (unavailNextSet.has(day)) cell.classList.add("user-unavailable");
          } else {
            if (wantCurSet.has(day)) cell.classList.add("preferred");
            else if (unavailCurSet.has(day)) cell.classList.add("user-unavailable");
          }
        });
        applyWeekendBlocks();
        isEditing = true;
        submitBtn.textContent = '수정 완료';
      } else {
        alert("기존 제출 내역이 없습니다. 먼저 제출해주세요.");
      }
    });
  }

  // --- 버튼 이벤트 핸들러들 ---
  if (prevBtn) prevBtn.onclick = () => { current.setMonth(current.getMonth() - 1); renderAll(); };
  if (nextBtn) nextBtn.onclick = () => { current.setMonth(current.getMonth() + 1); renderAll(); };

  if (toggleBtn) {
    toggleBtn.onclick = () => {
      const show = nc.style.display === "none";
      nc.style.display = show ? "block" : "none";
      toggleBtn.textContent = show ? "다음달 접기" : "다음달 보기";
      applyWeekendBlocks();
    };
  }

  if (resetBtn) {
    resetBtn.onclick = () => {
      const myName = userNameInput.value.trim();
      if (!myName) { alert("이름을 먼저 입력해주세요."); return; }
      if (!confirm(`"${myName}"님의 제출 정보를 모두 삭제할까요?`)) return;
      db.collection("calendars").doc(pin).collection("votes").doc(myName).delete()
        .then(() => {
          alert("내 제출 데이터가 삭제되었습니다.");
          document.querySelectorAll(".date:not(.past)").forEach(cell => {
            cell.classList.remove("preferred", "user-unavailable", "all-available", "all-preferred", "unavailable");
          });
          submitBtn.textContent = "결과 제출하기";
          isEditing = false;
        }).catch((error) => {
          console.error("삭제 실패:", error);
          alert("삭제 중 오류가 발생했습니다.");
        });
    };
  }

  if (newCalBtn) {
    newCalBtn.addEventListener('click', () => {
      const newPin = prompt("사용할 새로운 캘린더 PIN을 입력하세요:");
      if (newPin && newPin.trim() !== "") {
        window.location.hash = newPin.trim();
        window.location.reload();
      }
    });
  }

  if (submitBtn) {
    submitBtn.onclick = () => {
      const myName = userNameInput.value.trim();
      if (!myName) return alert("이름을 입력해주세요.");
      if (submitBtn.textContent === '수정하기') { loadMyVote(); return; }
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
        name: myName, color: document.getElementById("userColor").value, noPreference: noBtn.classList.contains('active'),
        wantCur, canCur, wantNext, canNext, timestamp: new Date()
      };
      isEditing = false;
      db.collection("calendars").doc(pin).collection("votes").doc(myName).set(dataToSave).then(() => {
        console.log("✅ Firebase 저장/수정 성공");
        localStorage.setItem('calU_userName', myName);
        noBtn.classList.remove('active');
        satBtn.classList.remove('active');
        sunBtn.classList.remove('active');
      });
    };
  }

  // --- 주말 차단 버튼 이벤트 ---
  if (satBtn) { satBtn.addEventListener('click', function () { this.classList.toggle('active'); applyWeekendBlocks(); }); }
  if (sunBtn) { sunBtn.addEventListener('click', function () { this.classList.toggle('active'); applyWeekendBlocks(); }); }
  if (noBtn) {
    noBtn.addEventListener('click', function () {
      this.classList.toggle('active');
      if (this.classList.contains('active')) {
        satBtn.classList.remove('active');
        sunBtn.classList.remove('active');
      }
      applyWeekendBlocks();
    });
  }

  // --- 중간집계 스크린샷 모드 로직 ---
  if (summaryBtn) {
    summaryBtn.addEventListener('click', () => {
      container.classList.add('summary-mode');
      const prefCur = [], availCur = [], prefNext = [], availNext = [];
      const isNextMonthVisible = nc.style.display === 'block';
      calThis.querySelectorAll('.date:not(.past)').forEach(cell => {
        const day = String(+cell.dataset.date.slice(8));
        if (cell.classList.contains('all-preferred')) prefCur.push(day);
        else if (cell.classList.contains('all-available')) availCur.push(day);
      });
      if (isNextMonthVisible) {
        calNext.querySelectorAll('.date:not(.past)').forEach(cell => {
          const day = String(+cell.dataset.date.slice(8));
          if (cell.classList.contains('all-preferred')) prefNext.push(day);
          else if (cell.classList.contains('all-available')) availNext.push(day);
        });
      }
      const curM = current.getMonth() + 1;
      const nxtM = (current.getMonth() + 2 > 12) ? 1 : current.getMonth() + 2;
      const fmt = (mon, arr) => arr && arr.length ? `<strong>${mon}월</strong>: ${arr.sort((a, b) => a - b).join(", ")}` : "";
      const wantParts = [fmt(curM, prefCur), fmt(nxtM, prefNext)].filter(Boolean);
      const canParts = [fmt(curM, availCur), fmt(nxtM, availNext)].filter(Boolean);
      const resultTableBody = tbl.tBodies[0];
      const summaryRow = resultTableBody.insertRow(0);
      summaryRow.id = 'summaryRow';
      summaryRow.className = 'summary-row';
      summaryRow.innerHTML = `<td><strong>📊 중간집계</strong></td><td>${wantParts.join("<br>") || '-'}</td><td>${canParts.join("<br>") || '-'}</td>`;
    });
  }

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      container.classList.remove('summary-mode');
      const summaryRow = document.getElementById('summaryRow');
      if (summaryRow) { summaryRow.remove(); }
    });
  }

  // --- 최종 결정하기 로직 ---
  if (finalizeBtn) {
    finalizeBtn.addEventListener('click', () => {
      const finalDate = finalDateInput.value;
      if (!finalDate) return;
      db.collection("calendars").doc(pin).set({ finalizedDate: finalDate }, { merge: true })
        .then(() => {
          alert(`모임이 ${finalDate}로 최종 확정되었습니다!`);
          finalDecisionBox.style.display = 'none';
        })
        .catch(err => alert("확정 중 오류가 발생했습니다: " + err));
    });
  }

  if (cancelFinalizeBtn) {
    cancelFinalizeBtn.addEventListener('click', () => {
      finalDecisionBox.style.display = 'none';
      finalDateInput.value = '';
    });
  }

  // ===============================================
  // 5. 네이버 지도 초기화 및 검색 기능
  // ===============================================
  function initMap() {
    const map = new naver.maps.Map('map', {
        center: new naver.maps.LatLng(35.8714, 128.6014),
        zoom: 15
    });
    let currentMarker = null;
    if (searchBtn) {
      searchBtn.addEventListener('click', function () {
        const query = searchInput.value;
        if (!query) { alert('검색어를 입력해주세요.'); return; }
        naver.maps.Service.geocode({ query: query }, function (status, response) {
          if (status !== naver.maps.Service.Status.OK) { return alert('"' + query + '"에 대한 검색 결과가 없습니다.'); }
          const result = response.v2;
          const items = result.addresses;
          if (items.length === 0) { return alert('"' + query + '"에 대한 검색 결과가 없습니다.'); }
          const point = new naver.maps.LatLng(items[0].y, items[0].x);
          if (currentMarker) { currentMarker.setMap(null); }
          map.panTo(point);
          currentMarker = new naver.maps.Marker({ position: point, map: map });
        });
      });
    }
  }
  naver.maps.onJSContentLoaded = initMap;

  // --- 초기 렌더링 ---
  renderAll();

  // --- 실시간 업데이트 및 교집합 계산 로직 ---
  db.collection("calendars").doc(pin).collection("votes").onSnapshot(snapshot => {
    const tblBody = tbl.tBodies[0];
    if (!tblBody) tbl.createTBody();
    tbl.tBodies[0].innerHTML = "";
    const allDates = {};
    const totalVotes = snapshot.size;
    const myName = userNameInput.value.trim();
    let hasSubmitted = false;
    snapshot.forEach(doc => {
      if (doc.id === myName) hasSubmitted = true;
      const data = doc.data();
      const row = tbl.tBodies[0].insertRow();
      row.dataset.user = data.name;
      const c1 = row.insertCell(), c2 = row.insertCell(), c3 = row.insertCell();
      c1.textContent = data.name;
      c1.style.color = data.color || "black";
      c1.style.fontWeight = "bold";
      const curM = current.getMonth() + 1;
      const nxtM = current.getMonth() + 2 > 12 ? 1 : current.getMonth() + 2;
      const fmt = (mon, arr) => arr && arr.length ? `<strong>${mon}월</strong>: ${arr.join(", ")}` : "";
      const isNextMonthVisible = nc.style.display === 'block';
      const wantParts = data.noPreference ? ["모든 날짜 가능"] : [fmt(curM, data.wantCur), isNextMonthVisible ? fmt(nxtM, data.wantNext) : ''].filter(Boolean);
      const canParts = data.noPreference ? ["-"] : [fmt(curM, data.canCur), isNextMonthVisible ? fmt(nxtM, data.canNext) : ''].filter(Boolean);
      c2.innerHTML = wantParts.join("<br>");
      c3.innerHTML = canParts.join("<br>");
      const wantCurSet = new Set(data.wantCur || []);
      const canCurSet = new Set(data.canCur || []);
      const wantNextSet = new Set(data.wantNext || []);
      const canNextSet = new Set(data.canNext || []);
      const allPossibleDays = Array.from({ length: 31 }, (_, i) => String(i + 1));
      allPossibleDays.forEach(day => {
        const curKey = `cur-${day}`;
        if (!allDates[curKey]) allDates[curKey] = { want: 0, can: 0, unavailable: 0 };
        if (data.noPreference || wantCurSet.has(day)) allDates[curKey].want++;
        else if (canCurSet.has(day)) allDates[curKey].can++;
        else allDates[curKey].unavailable++;
        const nextKey = `next-${day}`;
        if (!allDates[nextKey]) allDates[nextKey] = { want: 0, can: 0, unavailable: 0 };
        if (data.noPreference || wantNextSet.has(day)) allDates[nextKey].want++;
        else if (canNextSet.has(day)) allDates[nextKey].can++;
        else allDates[nextKey].unavailable++;
      });
    });
    if (!isEditing) {
      submitBtn.textContent = hasSubmitted ? '수정하기' : '결과 제출하기';
    }
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
    } else if (!hasSubmitted) {
      document.querySelectorAll(".date:not(.past)").forEach(cell => {
        cell.classList.remove("all-available", "all-preferred", "unavailable", "preferred", "user-unavailable");
      });
    }
  });

  // --- 모임 확정 상태를 실시간으로 감지하는 리스너 ---
  db.collection("calendars").doc(pin).onSnapshot(doc => {
    const data = doc.data();
    document.querySelectorAll('.date.finalized').forEach(c => c.classList.remove('finalized'));
    if (data && data.finalizedDate) {
      locationSection.style.display = 'block';
      const finalDate = data.finalizedDate;
      const finalizedCell = document.querySelector(`[data-date="${finalDate}"]`);
      if (finalizedCell) {
        finalizedCell.classList.add('finalized');
      }
      if (finalDecisionBox) {
        finalDecisionBox.style.display = 'none';
      }
    } else {
      locationSection.style.display = 'none';
    }
  });
});