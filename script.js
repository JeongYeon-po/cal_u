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
  const nc = document.getElementById("nextMonthContainer");
  const resetBtn = document.getElementById("resetBtn");
  const newCalBtn = document.getElementById("newCalBtn");
  const submitBtn = document.getElementById("submitBtn");
  const tbl = document.getElementById("resultTable");
  // const noChk = document.getElementById("noPreference"); // 이 줄은 삭제하거나 주석 처리

  // ✅ 아래 3줄 추가
  const noBtn = document.getElementById("noPreference");
  const satBtn = document.getElementById("blockSat");
  const sunBtn = document.getElementById("blockSun");
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
  function onDateClick(cell) {
     // [추가] 확정된 날짜를 클릭했을 때의 로직
        if (cell.classList.contains('finalized')) {
         if (confirm(`"${cell.dataset.date}" 날짜 확정을 취소하시겠습니까?`)) {
            // DB에서 finalizedDate 필드를 삭제하여 '미확정' 상태로 되돌립니다.
            db.collection("calendars").doc(pin).update({
                finalizedDate: firebase.firestore.FieldValue.delete()
            }).catch(err => alert("취소 중 오류 발생: " + err));
        }
        return; // 확정 취소 로직 후 함수 종료
    }
    // '중간 집계' 모드일 때만 최종 결정 로직이 작동
    if (container.classList.contains('summary-mode')) {
        if (cell.classList.contains('all-available') || cell.classList.contains('all-preferred')) {
            finalDateInput.value = cell.dataset.date;
            finalDecisionBox.style.display = 'block';
        }
    } else { // 일반 모드에서는 기존의 투표 로직 실행
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

  function renderAll() {
    renderCal(current, calThis, yM);
    const nxt = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    renderCal(nxt, calNext, yMNext);
    applyWeekendBlocks(); // ✅ 달력을 모두 그린 후, 마지막에 한 번만 실행합니다.
  }

  // --- 버튼 이벤트 핸들러 ---
  prevBtn.onclick = () => { current.setMonth(current.getMonth() - 1); renderAll(); };
  nextBtn.onclick = () => { current.setMonth(current.getMonth() + 1); renderAll(); };
  toggleBtn.onclick = () => {
   const show = nc.style.display === "none";
    nc.style.display = show ? "block" : "none";
    toggleBtn.textContent = show ? "다음달 접기" : "다음달 보기";
    applyWeekendBlocks(show); // ✅ 다음 달 표시 상태 변경 시 주말 불가 업데이트
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

newCalBtn.addEventListener('click', () => {
  const newPin = prompt("사용할 새로운 캘린더 PIN을 입력하세요:");
  // 사용자가 값을 입력하고 '확인'을 눌렀을 경우 (취소하거나 비워두지 않았을 경우)
  if (newPin && newPin.trim() !== "") {
    window.location.hash = newPin.trim(); // 주소창의 PIN을 사용자가 입력한 값으로 교체
    window.location.reload();           // 페이지를 새로고침하여 새 캘린더 로드
  }
});

  // --- 나의 이전 투표내역을 불러오는 함수 ---
 function loadMyVote() {
    // 버튼 상태 초기화
    noBtn.classList.remove('active');
    satBtn.classList.remove('active');
    sunBtn.classList.remove('active');

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
            const canCurSet = new Set(data.canCur || []);
            const canNextSet = new Set(data.canNext || []);
            const allDays = Array.from({length: 31}, (_,i) => String(i+1));
            const unavailCurSet = new Set();
            allDays.forEach(day => {
                if(!wantCurSet.has(day) && !canCurSet.has(day)) unavailCurSet.add(day);
            });
            const unavailNextSet = new Set();
            allDays.forEach(day => {
                if(!wantNextSet.has(day) && !canNextSet.has(day)) unavailNextSet.add(day);
            });

            document.querySelectorAll(".date:not(.past)").forEach(cell => {
                cell.classList.remove("preferred", "user-unavailable", "all-available", "all-preferred", "unavailable");
                const day = cell.textContent;
                const isNext = cell.closest("#calendarNext");

                if (isNext) { // 다음달
                    if (wantNextSet.has(day)) cell.classList.add("preferred");
                    else if (unavailNextSet.has(day)) cell.classList.add("user-unavailable");
                } else { // 이번달
                    if (wantCurSet.has(day)) cell.classList.add("preferred");
                    else if (unavailCurSet.has(day)) cell.classList.add("user-unavailable");
                }
            });

            // ✅ 데이터를 불러온 후, 마지막에 주말 필터 적용
            applyWeekendBlocks(); 
            
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
        noPreference: noBtn.classList.contains('active'),
        wantCur, canCur, wantNext, canNext, 
        timestamp: new Date()
    };
    
    // ✅ 2번 클릭 문제 해결: isEditing 상태를 DB 저장 전에 먼저 변경
    isEditing = false; 

    db.collection("calendars").doc(pin).collection("votes").doc(myName).set(dataToSave)
      .then(() => {
        console.log("✅ Firebase 저장/수정 성공");
          noChk.checked = false; // ✅ 자동으로 상관없음 체크 해제
          noBtn.classList.remove('active'); // ✅ 추가: 상관없음 버튼 비활성화
          satBtn.classList.remove('active'); // ✅ 추가: 토요일 불가 버튼 비활성화
          sunBtn.classList.remove('active'); // ✅ 추가: 일요일 불가 버튼 비활성화
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
      const isNextMonthVisible = nc.style.display === 'block'; // ✅ 다음달 표시 여부 확인
      const wantParts = data.noPreference ? ["모든 날짜 가능"] : [fmt(curM, data.wantCur), isNextMonthVisible ? fmt(nxtM, data.wantNext) : ''].filter(Boolean);
      const canParts = data.noPreference ? ["-"] : [fmt(curM, data.canCur), isNextMonthVisible ? fmt(nxtM, data.canNext) : ''].filter(Boolean);
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

  // --- 중간 집계 스크린샷 모드 로직 ---
  const summaryBtn = document.getElementById('summaryBtn');
  const backBtn = document.getElementById('backBtn');
  const container = document.querySelector('.container');
  const resultTableBody = document.getElementById('resultTable').tBodies[0];

  summaryBtn.addEventListener('click', () => {
 container.classList.add('summary-mode');

    // ✅ 월별, 상태별로 날짜를 나누어 저장할 배열 생성
    const prefCur = [], availCur = [], prefNext = [], availNext = [];
    const isNextMonthVisible = nc.style.display === 'block';

    // 현재 달력에서 날짜 수집
    calThis.querySelectorAll('.date:not(.past)').forEach(cell => {
      const day = String(+cell.dataset.date.slice(8));
      if (cell.classList.contains('all-preferred')) prefCur.push(day);
      else if (cell.classList.contains('all-available')) availCur.push(day);
    });

    // ✅ 다음달 달력이 보일 때만 다음달 날짜 수집
    if (isNextMonthVisible) {
      calNext.querySelectorAll('.date:not(.past)').forEach(cell => {
        const day = String(+cell.dataset.date.slice(8));
        if (cell.classList.contains('all-preferred')) prefNext.push(day);
        else if (cell.classList.contains('all-available')) availNext.push(day);
      });
    }

    // ✅ 'fmt' 함수를 사용해 월별로 결과 포맷팅 (기존 사용자 테이블 로직 재활용)
    const curM = current.getMonth() + 1;
    const nxtM = (current.getMonth() + 2 > 12) ? 1 : current.getMonth() + 2;
    const fmt = (mon, arr) => arr && arr.length ? `<strong>${mon}월</strong>: ${arr.sort((a, b) => a - b).join(", ")}` : "";
    
    const wantParts = [fmt(curM, prefCur), fmt(nxtM, prefNext)].filter(Boolean);
    const canParts = [fmt(curM, availCur), fmt(nxtM, availNext)].filter(Boolean);
    
    const summaryRow = resultTableBody.insertRow(0);
    summaryRow.id = 'summaryRow';
    summaryRow.className = 'summary-row';
    
    summaryRow.innerHTML = `
      <td><strong>📊 중간집계</strong></td>
      <td>${wantParts.join("<br>") || '-'}</td>
      <td>${canParts.join("<br>") || '-'}</td>
    `;
  });

  backBtn.addEventListener('click', () => {
    // 1. 스크린샷 모드 클래스 제거
    container.classList.remove('summary-mode');

    // 2. 추가했던 '중간 집계' 행 삭제
    const summaryRow = document.getElementById('summaryRow');
    if (summaryRow) {
      summaryRow.remove();
    }
  });
// ✅ '주말 불가' 버튼 기능 로직 (새로 추가)
   function applyWeekendBlocks() {
    const blockSat = satBtn.classList.contains('active');
    const blockSun = sunBtn.classList.contains('active');
    const isNextMonthVisible = nc.style.display === 'block';

    document.querySelectorAll('.date:not(.past)').forEach(cell => {
      const dayOfWeek = new Date(cell.dataset.date).getDay();
      const isNextMonthCell = cell.closest("#calendarNext");

      // 보이지 않는 다음달 셀은 건드리지 않도록 수정
      const shouldSkip = isNextMonthCell && !isNextMonthVisible;

      // 토요일 처리
      if (dayOfWeek === 6 && !shouldSkip) { 
        if(blockSat) cell.classList.add('user-unavailable');
        else cell.classList.remove('user-unavailable');
      }
      // 일요일 처리
      if (dayOfWeek === 0 && !shouldSkip) {
        if(blockSun) cell.classList.add('user-unavailable');
        else cell.classList.remove('user-unavailable');
      }
    });
  }

    satBtn.addEventListener('click', function() {
      this.classList.toggle('active');
      applyWeekendBlocks();
    });

    sunBtn.addEventListener('click', function() {
      this.classList.toggle('active');
      applyWeekendBlocks();
    });

    noBtn.addEventListener('click', function() {
      this.classList.toggle('active');
      // '상관없음'을 누르면 주말 불가 버튼은 비활성화
      if (this.classList.contains('active')) {
        satBtn.classList.remove('active');
        sunBtn.classList.remove('active');
      }
      applyWeekendBlocks(); // 달력 상태 업데이트
    });
 // ✅ --- 최종 결정하기 로직 ---
    const finalDecisionBox = document.getElementById('finalDecisionBox');
    const finalDateInput = document.getElementById('finalDateInput');
    const finalizeBtn = document.getElementById('finalizeBtn');
    const cancelFinalizeBtn = document.getElementById('cancelFinalizeBtn');

    // 달력의 날짜를 클릭했을 때의 이벤트 리스너 수정
    function onDateClick(cell) {
        // 중간 집계 모드에서만 최종 결정 가능
        if (container.classList.contains('summary-mode')) {
            if (cell.classList.contains('all-available') || cell.classList.contains('all-preferred')) {
                finalDateInput.value = cell.dataset.date;
                finalDecisionBox.style.display = 'block';
            }
        } else { // 일반 모드에서는 기존 투표 로직 실행
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
    
    // 기존 renderCal 함수 안의 addEventListener 부분을 onDateClick 함수를 사용하도록 수정
    // renderCal 함수를 찾아서 아래와 같이 수정해주세요.
    // if (!cell.classList.contains("past")) {
    //   cell.addEventListener("click", () => onDateClick(cell));
    // }

    // '네, 확정합니다!' 버튼 클릭 시
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

    // '아니요, 취소합니다.' 버튼 클릭 시
    cancelFinalizeBtn.addEventListener('click', () => {
        finalDecisionBox.style.display = 'none';
        finalDateInput.value = '';
    });
    // ✅ --- 최종 결정하기 로직 ---

    // '네, 확정합니다!' 버튼 클릭 시
    finalizeBtn.addEventListener('click', () => {
        const finalDate = finalDateInput.value;
        if (!finalDate) return;

        // DB에 `finalizedDate` 필드를 저장 (또는 업데이트)
        db.collection("calendars").doc(pin).set({ finalizedDate: finalDate }, { merge: true })
            .then(() => {
                alert(`모임이 ${finalDate}로 최종 확정되었습니다!`);
                finalDecisionBox.style.display = 'none';
            })
            .catch(err => alert("확정 중 오류가 발생했습니다: " + err));
    });

    // '아니요, 취소합니다.' 버튼 클릭 시
    cancelFinalizeBtn.addEventListener('click', () => {
        finalDecisionBox.style.display = 'none';
        finalDateInput.value = '';
    });
    
    // ✅ 모임 확정 상태를 실시간으로 감지하는 리스너 (새로 추가)
    db.collection("calendars").doc(pin).onSnapshot(doc => {
    const data = doc.data();

    // 이전에 확정된 날짜가 있다면 스타일 초기화
    document.querySelectorAll('.date.finalized').forEach(c => c.classList.remove('finalized'));

    if (data && data.finalizedDate) {
        const finalDate = data.finalizedDate;

        // [수정] UI 잠금 코드를 모두 제거했습니다.

        // 달력의 날짜에 확정 스타일만 적용
        const finalizedCell = document.querySelector(`[data-date="${finalDate}"]`);
        if (finalizedCell) {
            finalizedCell.classList.add('finalized');
        }
        
        // 만약 최종 결정 창이 열려있다면 닫아줍니다.
        finalDecisionBox.style.display = 'none';
    }
});
  }); 
    // 실시간 업데이트 로직(onSnapshot)에 확정 날짜 표시 기능 추가
    // db.collection("calendars").doc(pin).onSnapshot(snapshot => { ... }); 를 찾아서
    // snapshot.data()?.finalizedDate 부분을 확인하는 코드를 추가합니다.

    
