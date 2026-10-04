/*
 * 관리자 모드
 *  - 오른쪽 위 자물쇠(🔒) → 비밀번호 확인 → 관리자 화면
 *  - 사이트 내용 편집 · 공지 · 수강생 명단 · 출석/과제/신청 현황 · 엑셀(CSV) 내려받기 · 설정 파일 저장/불러오기
 *
 *  ※ 비밀번호는 config.js 에 원문이 아닌 해시값으로만 저장됩니다.
 *    다만 서버가 없는 정적 사이트이므로 이 잠금은 '일반 방문자가 관리자 화면에 들어오지 못하게 하는'
 *    수준입니다. 브라우저 개발자 도구를 다룰 줄 아는 사람까지 막지는 못합니다.
 */
(function () {
  "use strict";

  var S = window.SITE, Store = window.Store;
  if (!S || !Store || !S.openModal) return;
  var esc = S.esc, each = S.each;
  var C = window.SITE_CONFIG;
  function $(id) { return document.getElementById(id); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function ss(k, v) { // sessionStorage 도우미
    try {
      if (v === undefined) return sessionStorage.getItem("ku-course:" + k);
      if (v === null) sessionStorage.removeItem("ku-course:" + k);
      else sessionStorage.setItem("ku-course:" + k, v);
    } catch (e) { return null; }
  }
  function stamp() {
    var d = new Date();
    return S.key(d) + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  function fmtShort(iso) {
    var d = new Date(iso);
    return (d.getMonth() + 1) + "/" + d.getDate() + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  /* ================================================================
   *  SHA-256 (file:// 로 열어도 동작하도록 직접 구현)
   * ================================================================ */
  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }
  function sha256hex(str) {
    var bytes = new TextEncoder().encode(str), l = bytes.length;
    var total = ((l + 9 + 63) >> 6) << 6;
    var m = new Uint8Array(total);
    m.set(bytes);
    m[l] = 0x80;
    var dv = new DataView(m.buffer);
    dv.setUint32(total - 8, Math.floor(l / 0x20000000));
    dv.setUint32(total - 4, (l * 8) >>> 0);
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var W = new Int32Array(64);
    for (var off = 0; off < total; off += 64) {
      var t;
      for (t = 0; t < 16; t++) W[t] = dv.getInt32(off + t * 4);
      for (t = 16; t < 64; t++) {
        var x = W[t - 15], y = W[t - 2];
        W[t] = (W[t - 16] + (rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3)) + W[t - 7] + (rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10))) | 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (t = 0; t < 64; t++) {
        var t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[t] + W[t]) | 0;
        var t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map(function (v) { return ("00000000" + (v >>> 0).toString(16)).slice(-8); }).join("");
  }
  // 소금(salt)을 붙여 여러 번 반복 해시 → 해시값만 보고 비밀번호를 알아내기 어렵게
  function hashPassword(pw, salt, iterations) {
    var h = salt + ":" + pw;
    for (var i = 0; i < (iterations || 1); i++) h = sha256hex(h);
    return h;
  }
  function randomSalt() {
    var a = new Uint8Array(8);
    (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.random() * 256; });
    return [].map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  }
  window.__sha256hex = sha256hex; // 자체 점검용

  /* ================================================================
   *  파일 내려받기 · CSV(엑셀)
   * ================================================================ */
  function download(name, text, type) {
    var blob = new Blob([text], { type: type });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function csvCell(v) {
    v = v == null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; // 엑셀 수식으로 실행되는 것 방지
    if (/[",\r\n]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
    return v;
  }
  // UTF-8 BOM 을 붙여야 엑셀에서 한글이 깨지지 않습니다.
  function downloadCsv(name, rows) {
    download(name + "_" + S.key(new Date()) + ".csv",
      "﻿" + rows.map(function (r) { return r.map(csvCell).join(","); }).join("\r\n"),
      "text/csv;charset=utf-8");
    S.toast("📥 " + name + " 파일을 내려받았어요. 엑셀에서 바로 열 수 있습니다.");
  }
  function readFileText(file) {
    return file.arrayBuffer().then(function (buf) {
      try { return new TextDecoder("utf-8", { fatal: true }).decode(buf); }
      catch (e) { return new TextDecoder("euc-kr").decode(buf); } // 엑셀에서 저장한 CSV(CP949) 대비
    });
  }

  /* ================================================================
   *  로그인 (비밀번호 확인)
   * ================================================================ */
  var fails = 0, lockUntil = 0;
  var adminBtn = $("adminBtn");

  function openAuth() {
    if (Store.isAdmin()) { openPanel(); return; }
    S.openModal(
      '<div class="auth__icon">🔒</div>' +
      '<h3 class="modal__title" id="modalTitle">관리자 확인</h3>' +
      '<p class="modal__text">관리자 비밀번호를 입력해 주세요.</p>' +
      '<form id="adminAuth" class="login-form" novalidate>' +
        '<input class="input" type="password" name="pw" autocomplete="current-password" placeholder="비밀번호" autofocus />' +
        '<p class="form-error" id="authError" role="alert"></p>' +
        '<button class="btn btn--primary btn--block" type="submit">관리자 화면 열기</button>' +
      "</form>",
      "small"
    );
  }
  document.addEventListener("submit", function (ev) {
    if (ev.target.id !== "adminAuth") return;
    ev.preventDefault();
    var err = $("authError"), pw = ev.target.pw.value, a = C.admin || {};
    if (Date.now() < lockUntil) {
      err.textContent = "여러 번 틀려 잠시 잠겼어요. " + Math.ceil((lockUntil - Date.now()) / 1000) + "초 뒤에 다시 시도해 주세요.";
      return;
    }
    if (!a.passwordHash) { err.textContent = "config.js 에 관리자 비밀번호가 설정되어 있지 않습니다."; return; }
    if (!pw) { err.textContent = "비밀번호를 입력해 주세요."; return; }
    err.textContent = "확인 중…";
    setTimeout(function () {
      if (hashPassword(pw, a.salt || "", a.iterations || 1) === a.passwordHash) {
        fails = 0;
        Store.setAdmin(true);
        S.closeModal();
        setTimeout(openPanel, 260);
        renderLock();
      } else {
        fails++;
        if (fails >= 5) { lockUntil = Date.now() + 30000; fails = 0; err.textContent = "5번 틀렸어요. 30초 뒤에 다시 시도해 주세요."; }
        else err.textContent = "비밀번호가 올바르지 않습니다. (" + fails + "/5)";
        ev.target.pw.select();
      }
    }, 30);
  });

  function renderLock() {
    var on = Store.isAdmin();
    adminBtn.textContent = on ? "🔓" : "🔒";
    adminBtn.classList.toggle("is-on", on);
    adminBtn.setAttribute("aria-label", on ? "관리자 화면 열기" : "관리자 모드");
  }
  adminBtn.addEventListener("click", openAuth);

  /* ================================================================
   *  관리자 화면 틀
   * ================================================================ */
  var TABS = [
    { id: "dash", icon: "📊", label: "대시보드" },
    { id: "notice", icon: "📢", label: "공지 관리" },
    { id: "edit", icon: "✏️", label: "사이트 편집" },
    { id: "roster", icon: "👥", label: "수강생 명단" },
    { id: "att", icon: "🗓️", label: "출석 현황" },
    { id: "hw", icon: "📝", label: "과제 현황" },
    { id: "apps", icon: "📮", label: "수강 신청" },
    { id: "file", icon: "💾", label: "설정 파일" },
    { id: "pw", icon: "🔑", label: "비밀번호" },
  ];
  var panel = $("admin");
  var st = { tab: ss("adminTab") || "dash", section: ss("adminSection") || "site", draft: clone(C), dirty: false, open: {} };

  function openPanel() {
    panel.hidden = false;
    document.body.classList.add("no-scroll");
    panel.innerHTML =
      '<div class="admin__shell">' +
        '<aside class="admin__side">' +
          '<div class="admin__brand">🔓 관리자 모드</div>' +
          '<nav class="admin__tabs" aria-label="관리자 메뉴">' + each(TABS, function (t) {
            return '<button class="admin__tab" data-tab="' + t.id + '"><span>' + t.icon + "</span>" + t.label + "</button>";
          }) + "</nav>" +
          '<div class="admin__side-foot">' +
            '<button class="btn btn--ghost btn--sm" data-admin-close>사이트 보기</button>' +
            '<button class="btn btn--sm btn--soft" data-admin-logout>로그아웃</button>' +
          "</div>" +
        "</aside>" +
        '<section class="admin__main"><div id="adminMain"></div></section>' +
        '<div class="admin__dirty" id="adminDirty" hidden>' +
          "<span>✏️ 적용하지 않은 변경 사항이 있어요</span>" +
          '<div><button class="btn btn--sm btn--ghost" data-discard>되돌리기</button>' +
          '<button class="btn btn--sm btn--primary" data-apply>적용하고 미리보기</button></div>' +
        "</div>" +
      "</div>";
    renderTab();
    renderDirty();
    var cur = panel.querySelector(".admin__tab.is-on");
    if (cur) cur.focus();
  }
  function closePanel() {
    if (st.dirty && !confirm("적용하지 않은 변경 사항이 있습니다. 버리고 닫을까요?")) return;
    st.draft = clone(C); st.dirty = false;
    panel.hidden = true;
    panel.innerHTML = "";
    document.body.classList.remove("no-scroll");
    ss("adminOpen", null);
    adminBtn.focus();
  }
  function setTab(id) {
    st.tab = id;
    ss("adminTab", id);
    renderTab();
  }
  function renderTab() {
    panel.querySelectorAll(".admin__tab").forEach(function (b) {
      var on = b.getAttribute("data-tab") === st.tab;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-current", on ? "page" : "false");
    });
    var main = $("adminMain");
    if (!main) return;
    var fn = { dash: tabDash, notice: tabNotice, edit: tabEdit, roster: tabRoster, att: tabAtt, hw: tabHw, apps: tabApps, file: tabFile, pw: tabPw }[st.tab] || tabDash;
    fn(main);
    main.parentElement.scrollTop = 0;
  }
  function markDirty() { st.dirty = true; renderDirty(); }
  function renderDirty() { var d = $("adminDirty"); if (d) d.hidden = !st.dirty; }

  function applyDraft() {
    Store.setConfigOverride(st.draft).then(function () {
      st.dirty = false;
      ss("adminOpen", "1");
      ss("adminJustApplied", "1");
      location.reload();
    });
  }

  function title(t, desc) {
    return '<header class="admin__head"><h2>' + t + "</h2>" + (desc ? "<p>" + desc + "</p>" : "") + "</header>";
  }
  function empty(msg) { return '<div class="admin__empty">' + msg + "</div>"; }

  /* ================================================================
   *  학생 데이터 모으기
   * ================================================================ */
  function loadAll() {
    return Promise.all([Store.getRoster(), Store.getAllApplications(), Store.getAllAttendance(), Store.getAllSubmissions(), Store.getUsers(), Store.getVoteCount()])
      .then(function (r) {
        var roster = r[0], apps = r[1], att = r[2], subs = r[3], users = r[4];
        var map = {};
        function add(id, name) {
          if (!/^\d+$/.test(id)) return;
          if (!map[id]) map[id] = { id: id, name: "" };
          if (name && !map[id].name) map[id].name = name;
        }
        roster.forEach(function (s) { add(s.studentId, s.name); });
        Object.keys(apps).forEach(function (id) { add(id, apps[id].name); });
        Object.keys(users).forEach(function (id) { add(id, users[id]); });
        Object.keys(att).forEach(function (id) { add(id); });
        Object.keys(subs).forEach(function (id) { add(id); });
        var students = Object.keys(map).sort().map(function (id) { return map[id]; });
        return { roster: roster, apps: apps, att: att, subs: subs, users: users, votes: r[5], students: students };
      });
  }
  var assignments = S.sessions.filter(function (s) { return s.w.assignment; });
  function heldSessions() { var now = new Date(); return S.sessions.filter(function (s) { return s.date <= now; }); }

  /* ================================================================
   *  탭: 대시보드
   * ================================================================ */
  function tabDash(main) {
    loadAll().then(function (D) {
      var attTotal = 0, subTotal = 0;
      Object.keys(D.att).forEach(function (id) { attTotal += Object.keys(D.att[id]).length; });
      Object.keys(D.subs).forEach(function (id) { subTotal += Object.keys(D.subs[id]).length; });
      var tiles = [
        { n: D.roster.length, l: "등록된 수강생", tab: "roster" },
        { n: Object.keys(D.apps).length, l: "수강 신청서", tab: "apps" },
        { n: attTotal, l: "출석 체크 기록", tab: "att" },
        { n: subTotal, l: "과제 제출", tab: "hw" },
        { n: D.votes, l: "투표 참여", tab: null },
        { n: (C.notices || []).length, l: "게시된 공지", tab: "notice" },
      ];
      main.innerHTML = title("대시보드", "사이트와 수강생 활동을 한눈에 확인하세요.") +
        '<div class="admin-tiles">' + each(tiles, function (t) {
          return '<button class="admin-tile"' + (t.tab ? ' data-tab="' + t.tab + '"' : " disabled") + "><b>" + t.n + "</b><span>" + t.l + "</span></button>";
        }) + "</div>" +
        '<div class="admin-card">' +
          "<h3>⚙️ 설정 상태</h3>" +
          (window.SITE_CONFIG_OVERRIDDEN
            ? '<p><span class="pill pill--warn">임시 수정본 적용 중</span> 관리자 화면에서 고친 내용이 <b>이 브라우저에만</b> 보이고 있어요. 모든 방문자에게 보이게 하려면 <b>설정 파일 저장</b> 후 config.js 를 교체해 다시 배포하세요.</p>' +
              '<button class="btn btn--sm btn--primary" data-tab="file">설정 파일 탭으로</button>'
            : '<p><span class="pill pill--ok">원본 사용 중</span> 지금 보이는 사이트는 config.js 원본 그대로입니다.</p>') +
        "</div>" +
        '<div class="admin-card admin-card--note">' +
          "<h3>ℹ️ 데모 모드 안내</h3>" +
          "<p>서버가 없는 정적 사이트라서 수강생 데이터(신청서·출석·과제·투표)는 <b>각자의 브라우저</b>에 저장됩니다. 이 화면에는 <b>이 브라우저에 저장된 기록만</b> 보입니다. 여러 수강생의 기록을 한곳에 모으려면 서버(예: Firebase) 연결이 필요합니다 — README.md 참고.</p>" +
        "</div>";
    });
  }

  /* ================================================================
   *  사이트 편집기 (config 를 자동으로 입력 폼으로 바꿔 줌)
   * ================================================================ */
  var SECTIONS = {
    site: "기본 정보", nav: "상단 메뉴", hero: "첫 화면", about: "프로그램 소개", curriculum: "커리큘럼·일정",
    student: "수강생 공간", poll: "투표", application: "수강 신청서", welcome: "환영 효과", popup: "안내 팝업",
    enroll: "수강 안내", faq: "FAQ", instructor: "교수자", footer: "푸터",
  };
  var LABELS = {
    title: "제목", subtitle: "부제", description: "설명", badge: "배지", label: "이름", value: "값", icon: "아이콘",
    text: "내용", lead: "소개 문구", href: "링크", target: "이동할 섹션", primary: "강조 버튼", stats: "통계 카드",
    suffix: "단위", strengths: "장점 슬라이드", strengthsTitle: "장점 제목", weeks: "주차", topics: "학습 내용",
    videos: "참고 영상", url: "주소", assignment: "과제", due: "마감 일시", schedule: "수업 일정", startDate: "1주차 날짜",
    time: "수업 시간", location: "수업 장소", holidays: "휴강일", date: "날짜", tools: "AI 도구", name: "이름",
    desc: "설명", prep: "준비물", notice: "안내 문구", items: "항목", q: "질문", a: "답변", position: "직위",
    photo: "사진 경로", bio: "소개", career: "경력", contacts: "연락처", copyright: "저작권 문구", logoText: "로고 글자",
    buttons: "버튼", info: "요약 정보", options: "선택지", id: "고유 id", fields: "입력 항목", type: "입력 형식",
    required: "필수 항목", placeholder: "예시 문구", pattern: "형식 규칙(정규식)", patternMessage: "형식 오류 안내",
    minLength: "최소 글자 수", inputmode: "키보드 종류", summaryLabel: "오류 목록용 짧은 이름", submitLabel: "제출 버튼 문구",
    successTitle: "완료 제목", successText: "완료 문구", confetti: "폭죽 효과", message: "환영 메시지", enabled: "팝업 사용",
    delaySeconds: "뜨는 시간(초)", ctaLabel: "버튼 문구", ctaHref: "버튼 링크", hideTodayLabel: "‘오늘 하루 보지 않기’ 문구",
    body: "본문", loginCheck: "로그인 허용 기준", attendance: "출석 규칙", anytime: "언제든 출석 허용(테스트용)",
    openBefore: "수업 시작 몇 분 전부터", closeAfter: "수업 시작 몇 분 후까지", submission: "과제 제출 규칙",
    accept: "허용 파일 형식", maxMB: "최대 크기(MB)", allowLate: "지각 제출 허용", toolsTitle: "도구 제목",
    prepTitle: "준비물 제목", important: "중요 공지(맨 위 고정)", week: "주차", university: "학교", department: "학과",
    courseName: "과목명", notices: "공지",
  };
  var HINTS = {
    target: "about · curriculum · join · enroll · faq · instructor 중 하나",
    href: "#apply 처럼 섹션으로 이동하거나 https:// 로 시작하는 주소",
    icon: "이모지 1개", photo: "예: images/professor.jpg (비우면 기본 아이콘)",
    id: "영문으로. 바꾸면 그 선택지의 기존 표가 사라집니다", startDate: "이후 매주 같은 요일로 자동 계산됩니다",
    value: "‘auto’ 로 두면 일정에서 자동 계산", accept: "쉼표로 구분 (예: .pdf,.zip)",
  };
  var ENUMS = {
    loginCheck: [["none", "누구나 로그인"], ["applicants", "신청서 낸 학번만"], ["roster", "수강생 명단에 있는 학번·이름만"]],
    type: [["text", "한 줄 글"], ["email", "이메일"], ["tel", "전화번호"], ["select", "목록에서 선택"], ["radio", "하나 고르기"], ["checkbox", "여러 개 고르기"], ["textarea", "여러 줄 글"], ["consent", "동의 체크"]],
  };
  var LONG = { description: 1, text: 1, bio: 1, body: 1, desc: 1, a: 1, message: 1, successText: 1 };
  var TEMPLATES = {
    "notices": function () { return { date: S.key(new Date()), title: "", body: "", important: false }; },
    "curriculum.weeks": function () { return { title: "", topics: [""], videos: [] }; },
    "curriculum.weeks.*.videos": function () { return { title: "", url: "" }; },
    "curriculum.schedule.holidays": function () { return { date: "", label: "휴강" }; },
    "application.fields": function () { return { name: "", label: "", type: "text", required: false, placeholder: "" }; },
  };
  var OPTIONAL = { // 없을 수도 있는 하위 항목 (추가/삭제 버튼 제공)
    "curriculum.weeks.*": { assignment: function () { return { title: "", description: "", due: "" }; } },
  };

  function generic(path) { return path.replace(/\.\d+(?=\.|$)/g, ".*"); }
  function getPath(obj, path) { return path.split(".").reduce(function (o, k) { return o == null ? o : o[k]; }, obj); }
  function setPath(obj, path, val) {
    var ks = path.split("."), last = ks.pop();
    getPath(obj, ks.join("."))[last] = val;
  }
  function blank(v) {
    if (Array.isArray(v)) return [];
    if (v && typeof v === "object") { var o = {}; Object.keys(v).forEach(function (k) { o[k] = blank(v[k]); }); return o; }
    return typeof v === "number" ? 0 : typeof v === "boolean" ? false : "";
  }
  function templateFor(path, arr) {
    var t = TEMPLATES[generic(path)];
    if (t) return t();
    return arr.length ? blank(arr[arr.length - 1]) : "";
  }
  function label(k) { return LABELS[k] || k; }
  function itemSummary(item, i, path) {
    if (generic(path) === "curriculum.weeks") return (i + 1) + "주차 · " + (item.title || "(제목 없음)");
    if (item && typeof item === "object") {
      var s = item.title || item.label || item.name || item.q || item.date || "";
      return (i + 1) + ". " + (s || "(비어 있음)");
    }
    return String(i + 1);
  }

  function edValue(val, path, key) {
    var id = "ed-" + path.replace(/\./g, "-");
    var hint = HINTS[key] ? '<small class="ed-hint">' + esc(HINTS[key]) + "</small>" : "";
    if (Array.isArray(val)) return edArray(val, path, key);
    if (val && typeof val === "object") return edObject(val, path, key);
    if (typeof val === "boolean") {
      return '<label class="ed-check"><input type="checkbox" data-path="' + path + '" data-type="bool"' + (val ? " checked" : "") + " /><span>" + esc(label(key)) + "</span></label>";
    }
    var input;
    if (typeof val === "number") {
      input = '<input class="input" id="' + id + '" type="number" data-path="' + path + '" data-type="num" value="' + esc(val) + '" />';
    } else if (ENUMS[key]) {
      var opts = ENUMS[key].slice();
      if (!opts.some(function (o) { return o[0] === val; })) opts.unshift([val, val]);
      input = '<select class="input" id="' + id + '" data-path="' + path + '">' + each(opts, function (o) {
        return '<option value="' + esc(o[0]) + '"' + (o[0] === val ? " selected" : "") + ">" + esc(o[1]) + "</option>";
      }) + "</select>";
    } else if (key === "due") {
      input = '<input class="input" id="' + id + '" type="datetime-local" data-path="' + path + '" value="' + esc(val) + '" />';
    } else if ((key === "date" || key === "startDate") && (!val || /^\d{4}-\d{2}-\d{2}$/.test(val))) {
      input = '<input class="input" id="' + id + '" type="date" data-path="' + path + '" value="' + esc(val) + '" />';
    } else if (LONG[key] || String(val).length > 60 || String(val).indexOf("\n") >= 0) {
      input = '<textarea class="input" id="' + id + '" rows="3" data-path="' + path + '">' + esc(val) + "</textarea>";
    } else {
      input = '<input class="input" id="' + id + '" data-path="' + path + '" value="' + esc(val) + '" />';
    }
    return '<div class="ed-field"><label for="' + id + '">' + esc(label(key)) + "</label>" + input + hint + "</div>";
  }
  function edObject(obj, path, key) {
    var opt = OPTIONAL[generic(path)] || {};
    var parentOpt = OPTIONAL[generic(path.split(".").slice(0, -1).join("."))] || {};
    var removable = parentOpt[key] ? ' <button type="button" class="ed-mini ed-mini--del" data-del-opt="' + path + '">삭제</button>' : "";
    var html = Object.keys(obj).map(function (k) { return edValue(obj[k], path + "." + k, k); }).join("");
    Object.keys(opt).forEach(function (k) {
      if (!(k in obj)) html += '<button type="button" class="ed-add" data-add-opt="' + path + "." + k + '">+ ' + esc(label(k)) + " 추가</button>";
    });
    if (/\.\d+$/.test(path)) return html; // 배열 항목 안의 객체는 테두리 없이
    return '<fieldset class="ed-group"><legend>' + esc(label(key)) + removable + "</legend>" + html + "</fieldset>";
  }
  function edArray(arr, path, key) {
    var objects = arr.length ? typeof arr[0] === "object" : typeof templateFor(path, arr) === "object";
    var head = '<div class="ed-array__head"><span>' + esc(label(key)) + " <small>(" + arr.length + "개)</small></span>" +
      '<button type="button" class="ed-add" data-add="' + path + '">+ 추가</button></div>';
    if (!objects) {
      return '<div class="ed-array">' + head + '<div class="ed-list">' + each(arr, function (v, i) {
        return '<div class="ed-row"><input class="input" data-path="' + path + "." + i + '" value="' + esc(v) + '" aria-label="' + esc(label(key)) + " " + (i + 1) + '" />' +
          '<button type="button" class="ed-mini" data-move="' + path + "." + i + '|-1" aria-label="위로">↑</button>' +
          '<button type="button" class="ed-mini ed-mini--del" data-del="' + path + "." + i + '" aria-label="삭제">✕</button></div>';
      }) + "</div></div>";
    }
    return '<div class="ed-array">' + head + each(arr, function (item, i) {
      var p = path + "." + i;
      return '<details class="ed-item" data-open-path="' + p + '"' + (st.open[p] ? " open" : "") + ">" +
        '<summary><span class="ed-item__title">' + esc(itemSummary(item, i, path)) + "</span>" +
          '<span class="ed-item__tools">' +
            '<button type="button" class="ed-mini" data-move="' + p + '|-1" aria-label="위로">↑</button>' +
            '<button type="button" class="ed-mini" data-move="' + p + '|1" aria-label="아래로">↓</button>' +
            '<button type="button" class="ed-mini ed-mini--del" data-del="' + p + '" aria-label="삭제">✕</button>' +
          "</span></summary>" +
        '<div class="ed-item__body">' + edValue(item, p, key) + "</div></details>";
    }) + "</div>";
  }

  function rerenderKeepScroll() {
    var sc = $("adminMain").parentElement, top = sc.scrollTop;
    renderTab();
    sc.scrollTop = top;
  }
  // 편집기 입력 → 초안(draft)에 바로 반영
  function onEditInput(ev) {
    var el = ev.target, path = el.getAttribute && el.getAttribute("data-path");
    if (!path) return;
    var v = el.getAttribute("data-type") === "bool" ? el.checked : el.getAttribute("data-type") === "num" ? Number(el.value) : el.value;
    setPath(st.draft, path, v);
    markDirty();
  }
  function onEditClick(ev) {
    var b;
    if ((b = ev.target.closest("[data-add]"))) {
      var p = b.getAttribute("data-add"), arr = getPath(st.draft, p), item = templateFor(p, arr);
      arr.push(item);
      st.open[p + "." + (arr.length - 1)] = true;
      markDirty(); rerenderKeepScroll(); return true;
    }
    if ((b = ev.target.closest("[data-move]"))) {
      ev.preventDefault();
      var parts = b.getAttribute("data-move").split("|"), ip = parts[0].split("."), i = +ip.pop(), ap = ip.join(".");
      var a = getPath(st.draft, ap), j = i + Number(parts[1]);
      if (j < 0 || j >= a.length) return true;
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
      var oi = st.open[ap + "." + i]; st.open[ap + "." + i] = st.open[ap + "." + j]; st.open[ap + "." + j] = oi;
      markDirty(); rerenderKeepScroll(); return true;
    }
    if ((b = ev.target.closest("[data-del]"))) {
      ev.preventDefault();
      var dp = b.getAttribute("data-del").split("."), di = +dp.pop(), dap = dp.join("."), darr = getPath(st.draft, dap);
      if (typeof darr[di] === "object" && !confirm("‘" + itemSummary(darr[di], di, dap) + "’ 항목을 삭제할까요?")) return true;
      darr.splice(di, 1);
      st.open = {};
      markDirty(); rerenderKeepScroll(); return true;
    }
    if ((b = ev.target.closest("[data-add-opt]"))) {
      var op = b.getAttribute("data-add-opt"), ok = op.split("."), k = ok.pop();
      setPath(st.draft, op, OPTIONAL[generic(ok.join("."))][k]());
      markDirty(); rerenderKeepScroll(); return true;
    }
    if ((b = ev.target.closest("[data-del-opt]"))) {
      ev.preventDefault();
      var rp = b.getAttribute("data-del-opt").split("."), rk = rp.pop();
      if (!confirm(label(rk) + " 항목을 삭제할까요?")) return true;
      delete getPath(st.draft, rp.join("."))[rk];
      markDirty(); rerenderKeepScroll(); return true;
    }
    return false;
  }

  function tabEdit(main) {
    var keys = Object.keys(SECTIONS).filter(function (k) { return st.draft[k] !== undefined; });
    if (keys.indexOf(st.section) < 0) st.section = keys[0];
    main.innerHTML = title("사이트 편집", "고친 내용은 <b>적용하고 미리보기</b>를 눌러야 화면에 반영됩니다. 모두에게 보이게 하려면 이후 ‘설정 파일’ 탭에서 저장해 배포하세요.") +
      '<div class="ed-sections" role="tablist">' + each(keys, function (k) {
        return '<button class="chip-btn' + (k === st.section ? " is-on" : "") + '" data-section="' + k + '" role="tab" aria-selected="' + (k === st.section) + '">' + esc(SECTIONS[k]) + "</button>";
      }) + "</div>" +
      '<div class="ed-form">' + edValue(st.draft[st.section], st.section, st.section).replace(/^<fieldset class="ed-group"><legend>[^<]*<\/legend>/, '<div class="ed-group ed-group--root">').replace(/<\/fieldset>$/, "</div>") + "</div>";
  }

  /* ================================================================
   *  탭: 공지 관리
   * ================================================================ */
  function tabNotice(main) {
    if (!Array.isArray(st.draft.notices)) st.draft.notices = [];
    main.innerHTML = title("공지 관리", "새 공지를 올리면 사이트 상단 ‘공지사항’에 표시됩니다.") +
      '<form class="admin-card notice-form" id="noticeForm" novalidate>' +
        "<h3>📢 새 공지 올리기</h3>" +
        '<div class="ed-field"><label for="nTitle">제목</label><input class="input" id="nTitle" name="title" placeholder="예: 3주차 휴강 안내" /></div>' +
        '<div class="ed-field"><label for="nBody">내용</label><textarea class="input" id="nBody" name="body" rows="4" placeholder="공지 내용을 적어 주세요."></textarea></div>' +
        '<div class="notice-form__row"><div class="ed-field"><label for="nDate">게시일</label><input class="input" id="nDate" type="date" name="date" value="' + S.key(new Date()) + '" /></div>' +
        '<label class="ed-check"><input type="checkbox" name="important" /><span>중요 공지 (맨 위 고정)</span></label></div>' +
        '<p class="form-error" id="noticeError" role="alert"></p>' +
        '<button class="btn btn--primary" type="submit">공지 올리기</button>' +
      "</form>" +
      '<div class="admin-card"><h3>게시된 공지</h3>' +
        (st.draft.notices.length ? '<div class="ed-form">' + edArray(st.draft.notices, "notices", "notices") + "</div>" : empty("아직 공지가 없어요.")) +
      "</div>" +
      '<p class="admin-tip">💡 공지는 설정 파일(config.js)에 들어갑니다. 수강생 모두에게 보이게 하려면 <b>적용</b> → <b>설정 파일 저장</b> → config.js 교체 후 배포하세요.</p>';
  }
  document.addEventListener("submit", function (ev) {
    if (ev.target.id !== "noticeForm") return;
    ev.preventDefault();
    var f = ev.target, t = f.title.value.trim(), b = f.body.value.trim();
    if (!t || !b) { $("noticeError").textContent = !t ? "제목을 입력해 주세요." : "내용을 입력해 주세요."; (t ? f.body : f.title).focus(); return; }
    st.draft.notices.unshift({ date: f.date.value || S.key(new Date()), title: t, body: b, important: f.important.checked });
    markDirty();
    renderTab();
    S.toast("공지를 추가했어요. ‘적용하고 미리보기’를 누르면 사이트에 표시됩니다.");
  });

  /* ================================================================
   *  탭: 수강생 명단
   * ================================================================ */
  function splitLine(line) {
    if (line.indexOf("\t") >= 0 && line.indexOf(",") < 0) return line.split("\t");
    var out = [], cur = "", q = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (q) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') q = false;
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === ",") { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  }
  function parseRoster(text) {
    var res = { list: [], skipped: [] };
    text.replace(/^﻿/, "").split(/\r?\n/).forEach(function (line, i) {
      if (!line.trim()) return;
      var c = splitLine(line).map(function (x) { return x.trim().replace(/^'/, ""); });
      if (!/^\d{10}$/.test(c[0])) { if (i > 0 || /\d/.test(c[0])) res.skipped.push(i + 1); return; } // 첫 줄 제목행은 건너뜀
      res.list.push({ studentId: c[0], name: c[1] || "", department: c[2] || "", email: c[3] || "" });
    });
    return res;
  }
  function mergeRoster(adds) {
    return Store.getRoster().then(function (roster) {
      var added = 0, updated = 0, map = {};
      roster.forEach(function (s, i) { map[s.studentId] = i; });
      adds.forEach(function (s) {
        if (s.studentId in map) {
          var cur = roster[map[s.studentId]];
          Object.keys(s).forEach(function (k) { if (s[k]) cur[k] = s[k]; });
          updated++;
        } else { map[s.studentId] = roster.length; roster.push(s); added++; }
      });
      roster.sort(function (a, b) { return a.studentId.localeCompare(b.studentId); });
      return Store.saveRoster(roster).then(function () { return { added: added, updated: updated }; });
    });
  }

  function tabRoster(main) {
    Promise.all([Store.getRoster(), Store.getAllApplications()]).then(function (r) {
      var roster = r[0], apps = r[1];
      var rule = (C.student || {}).loginCheck || "none";
      main.innerHTML = title("수강생 명단", "명단은 이 브라우저에만 저장되며 설정 파일에는 들어가지 않습니다 (개인정보 보호).") +
        '<div class="admin-grid">' +
          '<form class="admin-card" id="rosterAdd" novalidate><h3>➕ 한 명씩 등록</h3>' +
            '<div class="admin-form2">' +
              '<div class="ed-field"><label for="rId">학번 *</label><input class="input" id="rId" name="studentId" inputmode="numeric" placeholder="2024123456" /></div>' +
              '<div class="ed-field"><label for="rName">이름 *</label><input class="input" id="rName" name="name" placeholder="홍길동" /></div>' +
              '<div class="ed-field"><label for="rDept">학과</label><input class="input" id="rDept" name="department" /></div>' +
              '<div class="ed-field"><label for="rMail">이메일</label><input class="input" id="rMail" name="email" type="email" /></div>' +
            "</div>" +
            '<p class="form-error" id="rosterError" role="alert"></p>' +
            '<button class="btn btn--primary btn--sm" type="submit">등록</button>' +
          "</form>" +
          '<div class="admin-card"><h3>📋 한꺼번에 등록</h3>' +
            '<p class="admin-small">한 줄에 한 명씩 <code>학번,이름,학과,이메일</code> 순서로 붙여 넣거나, 엑셀에서 저장한 CSV 파일을 불러오세요. 엑셀 표를 그대로 복사해 붙여 넣어도 됩니다.</p>' +
            '<textarea class="input" id="rosterBulk" rows="4" placeholder="2024123456,홍길동,**학과,hong@korea.ac.kr"></textarea>' +
            '<div class="admin-actions">' +
              '<button class="btn btn--primary btn--sm" data-roster-bulk>붙여 넣은 내용 등록</button>' +
              '<label class="btn btn--ghost btn--sm file-btn">CSV 파일 불러오기<input type="file" accept=".csv,.txt" id="rosterFile" /></label>' +
            "</div>" +
          "</div>" +
        "</div>" +
        '<div class="admin-card">' +
          '<div class="admin-card__head"><h3>👥 등록된 수강생 <small>' + roster.length + "명</small></h3>" +
            '<div class="admin-actions">' +
              '<input class="input input--sm" id="rosterSearch" placeholder="이름·학번 검색" aria-label="명단 검색" />' +
              '<button class="btn btn--sm btn--soft" data-roster-from-apps' + (Object.keys(apps).length ? "" : " disabled") + ">신청자 " + Object.keys(apps).length + "명 명단에 추가</button>" +
              '<button class="btn btn--sm btn--ghost" data-export="roster"' + (roster.length ? "" : " disabled") + ">📥 엑셀로 내려받기</button>" +
              '<button class="btn btn--sm btn--danger" data-roster-clear' + (roster.length ? "" : " disabled") + ">전체 삭제</button>" +
            "</div></div>" +
          '<p class="admin-small">현재 로그인 허용 기준: <b>' + esc(({ none: "누구나", applicants: "신청서 낸 학번만", roster: "명단에 있는 학번·이름만" })[rule] || rule) +
            "</b> · 바꾸려면 사이트 편집 → 수강생 공간 → 로그인 허용 기준</p>" +
          (roster.length
            ? '<div class="table-wrap"><table class="admin-table" id="rosterTable"><thead><tr><th>학번</th><th>이름</th><th>학과</th><th>이메일</th><th>신청서</th><th></th></tr></thead><tbody>' +
                each(roster, function (s) {
                  return '<tr data-search="' + esc((s.studentId + " " + s.name).toLowerCase()) + '"><td>' + esc(s.studentId) + "</td><td>" + esc(s.name) + "</td><td>" + esc(s.department) + "</td><td>" + esc(s.email) + "</td>" +
                    "<td>" + (apps[s.studentId] ? '<span class="pill pill--ok">제출</span>' : '<span class="pill">없음</span>') + "</td>" +
                    '<td><button class="ed-mini ed-mini--del" data-roster-del="' + esc(s.studentId) + '" aria-label="' + esc(s.name) + ' 삭제">✕</button></td></tr>';
                }) + "</tbody></table></div>"
            : empty("아직 등록된 수강생이 없어요. 위에서 등록해 보세요.")) +
        "</div>";
    });
  }

  /* ================================================================
   *  탭: 출석 현황
   * ================================================================ */
  function tabAtt(main) {
    loadAll().then(function (D) {
      var held = heldSessions().length;
      var now = new Date();
      main.innerHTML = title("출석 현황", "칸을 누르면 출석 ↔ 결석을 직접 고칠 수 있어요 (공결 처리 등).") +
        '<div class="admin-card"><div class="admin-card__head"><h3>🗓️ 출석부 <small>' + D.students.length + "명 · 진행 " + held + "/" + S.sessions.length + "회</small></h3>" +
          '<button class="btn btn--sm btn--ghost" data-export="att"' + (D.students.length ? "" : " disabled") + ">📥 엑셀로 내려받기</button></div>" +
          '<p class="admin-small"><span class="att-dot att-dot--on">○</span> 출석 <span class="att-dot att-dot--off">✕</span> 결석 <span class="att-dot">·</span> 아직 진행 전</p>' +
          (D.students.length
            ? '<div class="table-wrap"><table class="admin-table admin-table--att"><thead><tr><th class="sticky-col">학번 · 이름</th>' +
                each(S.sessions, function (s) { return "<th>" + s.n + "주<small>" + (s.date.getMonth() + 1) + "/" + s.date.getDate() + "</small></th>"; }) +
                "<th>출석</th><th>출석률</th></tr></thead><tbody>" +
                each(D.students, function (stu) {
                  var a = D.att[stu.id] || {}, cnt = 0;
                  var cells = each(S.sessions, function (s) {
                    var on = !!a[s.key], future = s.date > now;
                    if (on) cnt++;
                    return '<td><button class="att-cell ' + (on ? "is-on" : future ? "is-future" : "is-off") + '" data-att="' + stu.id + "|" + s.key + '" title="' +
                      esc(s.n + "주차 · " + (on ? "출석 " + fmtShort(a[s.key]) : future ? "진행 전" : "결석")) + '" aria-label="' + esc(stu.name + " " + s.n + "주차 " + (on ? "출석" : "결석")) + '">' +
                      (on ? "○" : future ? "·" : "✕") + "</button></td>";
                  });
                  return '<tr><th class="sticky-col">' + esc(stu.id) + "<small>" + esc(stu.name || "-") + "</small></th>" + cells +
                    "<td><b>" + cnt + "</b></td><td>" + (held ? Math.round((cnt / held) * 100) + "%" : "–") + "</td></tr>";
                }) + "</tbody></table></div>"
            : empty("아직 출석 기록이 있는 수강생이 없어요.")) +
        "</div>";
    });
  }

  /* ================================================================
   *  탭: 과제 현황
   * ================================================================ */
  function tabHw(main) {
    loadAll().then(function (D) {
      main.innerHTML = title("과제 현황", "수강생별 과제 제출 여부와 제출 시각입니다. (데모 모드에서는 파일 이름·크기·시각만 기록됩니다)") +
        '<div class="admin-card"><div class="admin-card__head"><h3>📝 제출 현황 <small>' + D.students.length + "명 · 과제 " + assignments.length + "개</small></h3>" +
          '<button class="btn btn--sm btn--ghost" data-export="hw"' + (D.students.length ? "" : " disabled") + ">📥 엑셀로 내려받기</button></div>" +
          '<div class="hw-summary">' + each(assignments, function (s) {
            var n = D.students.filter(function (x) { return (D.subs[x.id] || {})[s.n]; }).length;
            return '<div><b>' + n + "</b>/" + D.students.length + "<span>" + esc(s.w.assignment.title) + "</span></div>";
          }) + "</div>" +
          (D.students.length
            ? '<div class="table-wrap"><table class="admin-table"><thead><tr><th class="sticky-col">학번 · 이름</th>' +
                each(assignments, function (s) { return "<th>" + esc(s.w.assignment.title.split("·")[0].trim()) + "<small>마감 " + (s.due.getMonth() + 1) + "/" + s.due.getDate() + "</small></th>"; }) +
                "<th>제출</th></tr></thead><tbody>" +
                each(D.students, function (stu) {
                  var subs = D.subs[stu.id] || {}, cnt = 0;
                  return '<tr><th class="sticky-col">' + esc(stu.id) + "<small>" + esc(stu.name || "-") + "</small></th>" +
                    each(assignments, function (s) {
                      var x = subs[s.n];
                      if (x) cnt++;
                      return x ? '<td><span class="pill ' + (x.late ? "pill--warn" : "pill--ok") + '" title="' + esc(x.fileName) + '">' + (x.late ? "지각" : "제출") + "</span><small>" + fmtShort(x.submittedAt) + "</small></td>"
                               : '<td><span class="pill">미제출</span></td>';
                    }) + "<td><b>" + cnt + "</b>/" + assignments.length + "</td></tr>";
                }) + "</tbody></table></div>"
            : empty("아직 과제를 제출한 수강생이 없어요.")) +
        "</div>";
    });
  }

  /* ================================================================
   *  탭: 수강 신청
   * ================================================================ */
  var appFields = (C.application || {}).fields || [];
  function fieldName(f) { return f.summaryLabel || String(f.label || f.name).replace(/\s*\(.*\)$/, ""); }
  function fmtAppValue(v) { return Array.isArray(v) ? v.join(", ") : v === true ? "동의" : v === false ? "미동의" : v == null ? "" : String(v); }

  function tabApps(main) {
    Store.getAllApplications().then(function (apps) {
      var list = Object.keys(apps).map(function (k) { return apps[k]; }).sort(function (a, b) { return String(a.submittedAt).localeCompare(String(b.submittedAt)); });
      main.innerHTML = title("수강 신청 내역", "수강생이 제출한 신청서입니다. 같은 학번으로 다시 제출하면 최신 내용으로 바뀝니다.") +
        '<div class="admin-card"><div class="admin-card__head"><h3>📮 신청서 <small>' + list.length + "건</small></h3>" +
          '<button class="btn btn--sm btn--ghost" data-export="apps"' + (list.length ? "" : " disabled") + ">📥 엑셀로 내려받기</button></div>" +
          (list.length
            ? '<div class="table-wrap"><table class="admin-table"><thead><tr><th>#</th>' + each(appFields, function (f) { return "<th>" + esc(fieldName(f)) + "</th>"; }) +
                "<th>제출 시각</th><th></th></tr></thead><tbody>" +
                each(list, function (a, i) {
                  return "<tr><td>" + (i + 1) + "</td>" + each(appFields, function (f) {
                    var v = fmtAppValue(a[f.name]);
                    return '<td class="' + (f.type === "textarea" ? "cell-long" : "") + '">' + esc(v) + "</td>";
                  }) + "<td>" + esc(fmtShort(a.submittedAt)) + '</td><td><button class="ed-mini ed-mini--del" data-app-del="' + esc(a.studentId) + '" aria-label="삭제">✕</button></td></tr>';
                }) + "</tbody></table></div>"
            : empty("아직 제출된 신청서가 없어요.")) +
        "</div>";
    });
  }

  /* ---------- 엑셀(CSV) 내보내기 ---------- */
  function exportData(kind) {
    loadAll().then(function (D) {
      var now = new Date(), rows;
      if (kind === "roster") {
        rows = [["학번", "이름", "학과", "이메일", "신청서"]].concat(D.roster.map(function (s) {
          return [s.studentId, s.name, s.department, s.email, D.apps[s.studentId] ? "제출" : ""];
        }));
        downloadCsv("수강생명단", rows);
      } else if (kind === "att") {
        var held = heldSessions().length;
        rows = [["학번", "이름"].concat(S.sessions.map(function (s) { return s.n + "주차(" + (s.date.getMonth() + 1) + "/" + s.date.getDate() + ")"; }), ["출석", "출석률"])];
        D.students.forEach(function (stu) {
          var a = D.att[stu.id] || {}, cnt = 0;
          var cells = S.sessions.map(function (s) { if (a[s.key]) { cnt++; return "출석"; } return s.date > now ? "" : "결석"; });
          rows.push([stu.id, stu.name].concat(cells, [cnt, held ? Math.round((cnt / held) * 100) + "%" : ""]));
        });
        downloadCsv("출석부", rows);
      } else if (kind === "hw") {
        var h = ["학번", "이름"];
        assignments.forEach(function (s) { var t = s.w.assignment.title; h.push(t + " 상태", t + " 파일", t + " 제출 시각"); });
        rows = [h];
        D.students.forEach(function (stu) {
          var subs = D.subs[stu.id] || {}, r = [stu.id, stu.name];
          assignments.forEach(function (s) {
            var x = subs[s.n];
            r.push(x ? (x.late ? "지각 제출" : "제출") : "미제출", x ? x.fileName : "", x ? S.fmtDateTime(new Date(x.submittedAt)) : "");
          });
          rows.push(r);
        });
        downloadCsv("과제제출현황", rows);
      } else if (kind === "apps") {
        rows = [appFields.map(fieldName).concat(["제출 시각"])];
        Object.keys(D.apps).forEach(function (k) {
          var a = D.apps[k];
          rows.push(appFields.map(function (f) { return fmtAppValue(a[f.name]); }).concat([S.fmtDateTime(new Date(a.submittedAt))]));
        });
        downloadCsv("수강신청내역", rows);
      }
    });
  }

  /* ================================================================
   *  탭: 설정 파일 (저장 / 불러오기 / 되돌리기 / 데이터 백업)
   * ================================================================ */
  function configFileText(cfg) {
    return "/*\n * 사이트 설정 파일 — 관리자 화면에서 저장 (" + stamp() + ")\n" +
      " * 이 파일로 기존 config.js 를 교체한 뒤 배포하면 모든 방문자에게 반영됩니다.\n" +
      " * 각 항목 설명은 README.md 를 참고하세요.\n */\n" +
      "window.SITE_CONFIG = " + JSON.stringify(cfg, null, 2) + ";\n";
  }
  // 저장했던 config.js / .json 읽기. 손으로 고친 config.js(주석 포함)도 읽을 수 있도록,
  // JSON 으로 안 읽히면 관리자가 고른 파일을 직접 실행해 설정값을 꺼냅니다.
  function parseConfigText(text) {
    text = text.replace(/^﻿/, "");
    var s = text.indexOf("{"), e = text.lastIndexOf("}");
    try { return JSON.parse(text.slice(s, e + 1)); } catch (err) { /* JS 형식으로 다시 시도 */ }
    var fake = {};
    new Function("window", text)(fake);
    return fake.SITE_CONFIG;
  }
  function tabFile(main) {
    main.innerHTML = title("설정 파일", "사이트 내용(문구·일정·공지·비밀번호 해시)을 파일로 저장하고 다시 불러옵니다.") +
      '<div class="admin-card"><h3>현재 상태</h3>' +
        (window.SITE_CONFIG_OVERRIDDEN
          ? '<p><span class="pill pill--warn">임시 수정본 적용 중</span> 이 브라우저에서만 고친 내용이 보이는 상태예요.</p>'
          : '<p><span class="pill pill--ok">원본 사용 중</span> config.js 원본 그대로입니다.</p>') +
        (st.dirty ? '<p class="admin-small">✏️ 아직 적용하지 않은 편집 내용도 저장 파일에 함께 들어갑니다.</p>' : "") +
      "</div>" +
      '<div class="admin-grid">' +
        '<div class="admin-card"><h3>💾 설정 파일 저장</h3>' +
          '<p class="admin-small">내려받은 <b>config.js</b> 로 사이트 폴더의 config.js 를 교체하고 다시 배포하면, 모든 방문자에게 바뀐 내용이 보입니다.</p>' +
          '<button class="btn btn--primary btn--sm" data-save-config>config.js 내려받기</button></div>' +
        '<div class="admin-card"><h3>📂 설정 파일 불러오기</h3>' +
          '<p class="admin-small">예전에 저장한 config.js(또는 .json)를 불러와 이 브라우저에 적용합니다.</p>' +
          '<label class="btn btn--ghost btn--sm file-btn">파일 선택<input type="file" accept=".js,.json" id="configFile" /></label>' +
          '<p class="form-error" id="configError" role="alert"></p></div>' +
        '<div class="admin-card"><h3>↩️ 원래대로 되돌리기</h3>' +
          '<p class="admin-small">이 브라우저의 임시 수정본을 지우고 config.js 원본으로 돌아갑니다.</p>' +
          '<button class="btn btn--sm btn--danger" data-reset-config' + (window.SITE_CONFIG_OVERRIDDEN ? "" : " disabled") + ">원본으로 되돌리기</button></div>" +
        '<div class="admin-card"><h3>🗂️ 수강생 데이터 백업</h3>' +
          '<p class="admin-small">명단·신청서·출석·과제·투표 기록을 하나의 파일로 저장하거나, 다른 브라우저에서 복원합니다.</p>' +
          '<div class="admin-actions"><button class="btn btn--ghost btn--sm" data-backup>백업 파일 저장</button>' +
          '<label class="btn btn--ghost btn--sm file-btn">백업 복원<input type="file" accept=".json" id="backupFile" /></label></div></div>' +
      "</div>";
  }

  /* ================================================================
   *  탭: 비밀번호 변경
   * ================================================================ */
  function tabPw(main) {
    main.innerHTML = title("비밀번호 변경", "새 비밀번호는 해시값으로 바뀌어 설정 파일에 저장됩니다.") +
      '<form class="admin-card pw-form" id="pwForm" novalidate>' +
        '<div class="ed-field"><label for="pw0">현재 비밀번호</label><input class="input" type="password" id="pw0" name="cur" autocomplete="current-password" /></div>' +
        '<div class="ed-field"><label for="pw1">새 비밀번호 (8자 이상)</label><input class="input" type="password" id="pw1" name="next" autocomplete="new-password" /></div>' +
        '<div class="ed-field"><label for="pw2">새 비밀번호 확인</label><input class="input" type="password" id="pw2" name="again" autocomplete="new-password" /></div>' +
        '<p class="form-error" id="pwError" role="alert"></p>' +
        '<button class="btn btn--primary btn--sm" type="submit">새 비밀번호 만들기</button>' +
      "</form>" +
      '<div id="pwResult"></div>' +
      '<p class="admin-tip">💡 다른 기기·브라우저에서도 새 비밀번호를 쓰려면 <b>적용</b> 후 ‘설정 파일’ 탭에서 config.js 를 저장해 교체·배포하세요.</p>';
  }
  document.addEventListener("submit", function (ev) {
    if (ev.target.id !== "pwForm") return;
    ev.preventDefault();
    var f = ev.target, err = $("pwError"), a = C.admin || {};
    if (hashPassword(f.cur.value, a.salt || "", a.iterations || 1) !== a.passwordHash) { err.textContent = "현재 비밀번호가 올바르지 않습니다."; f.cur.focus(); return; }
    if (f.next.value.length < 8) { err.textContent = "새 비밀번호는 8자 이상으로 정해 주세요."; f.next.focus(); return; }
    if (f.next.value !== f.again.value) { err.textContent = "새 비밀번호가 서로 다릅니다."; f.again.focus(); return; }
    err.textContent = "";
    var salt = randomSalt(), iter = 20000;
    st.draft.admin = { salt: salt, iterations: iter, passwordHash: hashPassword(f.next.value, salt, iter) };
    markDirty();
    f.reset();
    $("pwResult").innerHTML = '<div class="admin-card admin-card--ok"><h3>✅ 새 비밀번호가 준비되었어요</h3>' +
      '<p class="admin-small">아래 <b>적용하고 미리보기</b>를 누르면 이 브라우저에서 바로 새 비밀번호가 쓰입니다. config.js 를 직접 고치려면 admin 부분을 아래 내용으로 바꾸세요.</p>' +
      "<pre class=\"code\">admin: " + esc(JSON.stringify(st.draft.admin, null, 2)) + ",</pre></div>";
  });

  /* ================================================================
   *  관리자 화면 이벤트
   * ================================================================ */
  panel.addEventListener("input", function (ev) {
    if (ev.target.id === "rosterSearch") {
      var q = ev.target.value.trim().toLowerCase();
      panel.querySelectorAll("#rosterTable tbody tr").forEach(function (tr) { tr.hidden = q && tr.getAttribute("data-search").indexOf(q) < 0; });
      return;
    }
    if (ev.target.closest(".ed-form")) onEditInput(ev);
  });
  panel.addEventListener("change", function (ev) {
    var t = ev.target;
    if (t.closest(".ed-form") && (t.type === "checkbox" || t.tagName === "SELECT" || t.type === "date" || t.type === "datetime-local")) { onEditInput(ev); return; }
    if (t.id === "rosterFile" && t.files[0]) {
      readFileText(t.files[0]).then(function (text) {
        var r = parseRoster(text);
        if (!r.list.length) { S.toast("파일에서 학번(숫자 10자리)으로 시작하는 줄을 찾지 못했어요."); return; }
        mergeRoster(r.list).then(function (m) {
          S.toast("👥 " + m.added + "명 추가, " + m.updated + "명 갱신" + (r.skipped.length ? " · " + r.skipped.length + "줄 건너뜀" : ""));
          renderTab();
        });
      });
    }
    if (t.id === "configFile" && t.files[0]) {
      readFileText(t.files[0]).then(function (text) {
        var cfg;
        try { cfg = parseConfigText(text); } catch (e) { cfg = null; }
        if (!cfg || !cfg.site || !cfg.curriculum || !Array.isArray(cfg.curriculum.weeks)) {
          $("configError").textContent = "올바른 설정 파일이 아니에요. 관리자 화면에서 저장한 config.js 를 골라 주세요.";
          t.value = "";
          return;
        }
        if (!confirm("‘" + t.files[0].name + "’ 설정을 이 브라우저에 적용할까요? (지금 편집 중인 내용은 사라집니다)")) { t.value = ""; return; }
        st.draft = cfg;
        applyDraft();
      });
    }
    if (t.id === "backupFile" && t.files[0]) {
      readFileText(t.files[0]).then(function (text) {
        var data;
        try { data = JSON.parse(text); } catch (e) { data = null; }
        if (!data || data.__type !== "ku-course-backup") { S.toast("백업 파일이 아니에요."); t.value = ""; return; }
        if (!confirm("백업을 복원할까요? 같은 항목은 백업 내용으로 덮어씁니다.")) { t.value = ""; return; }
        delete data.__type;
        Store.importAll(data).then(function () { ss("adminOpen", "1"); location.reload(); });
      });
    }
  });
  panel.addEventListener("toggle", function (ev) {
    var d = ev.target;
    if (d.matches && d.matches("details[data-open-path]")) st.open[d.getAttribute("data-open-path")] = d.open;
  }, true);

  panel.addEventListener("click", function (ev) {
    var b = ev.target.closest("button, [data-tab]");
    if (!b) return;
    if (b.hasAttribute("data-tab")) { setTab(b.getAttribute("data-tab")); return; }
    if (b.hasAttribute("data-section")) { st.section = b.getAttribute("data-section"); ss("adminSection", st.section); st.open = {}; renderTab(); return; }
    if (b.hasAttribute("data-admin-close")) { closePanel(); return; }
    if (b.hasAttribute("data-admin-logout")) {
      if (st.dirty && !confirm("적용하지 않은 변경 사항이 있습니다. 버리고 로그아웃할까요?")) return;
      st.dirty = false;
      Store.setAdmin(false); closePanel(); renderLock(); S.toast("관리자 모드에서 로그아웃했어요.");
      return;
    }
    if (b.hasAttribute("data-apply")) { applyDraft(); return; }
    if (b.hasAttribute("data-discard")) {
      if (!confirm("편집한 내용을 모두 되돌릴까요?")) return;
      st.draft = clone(C); st.dirty = false; renderDirty(); renderTab(); return;
    }
    if (onEditClick(ev)) return;
    if (b.hasAttribute("data-export")) { exportData(b.getAttribute("data-export")); return; }

    // 명단
    if (b.hasAttribute("data-roster-bulk")) {
      var text = $("rosterBulk").value, r = parseRoster(text);
      if (!r.list.length) { S.toast("학번(숫자 10자리)으로 시작하는 줄이 없어요."); return; }
      mergeRoster(r.list).then(function (m) {
        S.toast("👥 " + m.added + "명 추가, " + m.updated + "명 갱신" + (r.skipped.length ? " · " + r.skipped.join(", ") + "번째 줄 건너뜀" : ""));
        renderTab();
      });
      return;
    }
    if (b.hasAttribute("data-roster-from-apps")) {
      Store.getAllApplications().then(function (apps) {
        var list = Object.keys(apps).map(function (k) { var a = apps[k]; return { studentId: a.studentId, name: a.name || "", department: a.department || "", email: a.email || "" }; });
        return mergeRoster(list);
      }).then(function (m) { S.toast("👥 신청자 " + m.added + "명 추가, " + m.updated + "명 갱신"); renderTab(); });
      return;
    }
    if (b.hasAttribute("data-roster-del")) {
      var id = b.getAttribute("data-roster-del");
      if (!confirm(id + " 학생을 명단에서 삭제할까요?")) return;
      Store.getRoster().then(function (list) {
        return Store.saveRoster(list.filter(function (s) { return s.studentId !== id; }));
      }).then(renderTab);
      return;
    }
    if (b.hasAttribute("data-roster-clear")) {
      if (!confirm("수강생 명단 전체를 삭제할까요? 되돌릴 수 없습니다.")) return;
      Store.saveRoster([]).then(renderTab);
      return;
    }
    // 출석 직접 수정
    if (b.hasAttribute("data-att")) {
      var p = b.getAttribute("data-att").split("|"), on = !b.classList.contains("is-on");
      Store.setAttendance(p[0], p[1], on).then(function () {
        var sc = $("adminMain").parentElement, top = sc.scrollTop, left = (panel.querySelector(".table-wrap") || {}).scrollLeft;
        renderTab();
        setTimeout(function () { sc.scrollTop = top; var tw = panel.querySelector(".table-wrap"); if (tw) tw.scrollLeft = left; }, 30);
      });
      return;
    }
    if (b.hasAttribute("data-app-del")) {
      var aid = b.getAttribute("data-app-del");
      if (!confirm(aid + " 학생의 신청서를 삭제할까요?")) return;
      Store.deleteApplication(aid).then(renderTab);
      return;
    }
    // 설정 파일
    if (b.hasAttribute("data-save-config")) {
      download("config.js", configFileText(st.draft), "text/javascript;charset=utf-8");
      S.toast("💾 config.js 를 내려받았어요. 사이트 폴더의 config.js 와 바꿔 주세요.");
      return;
    }
    if (b.hasAttribute("data-reset-config")) {
      if (!confirm("임시 수정본을 지우고 config.js 원본으로 되돌릴까요?")) return;
      Store.clearConfigOverride().then(function () { ss("adminOpen", "1"); location.reload(); });
      return;
    }
    if (b.hasAttribute("data-backup")) {
      Store.exportAll().then(function (data) {
        data.__type = "ku-course-backup";
        download("수강생데이터백업_" + S.key(new Date()) + ".json", JSON.stringify(data, null, 2), "application/json");
        S.toast("🗂️ 백업 파일을 저장했어요.");
      });
    }
  });
  panel.addEventListener("submit", function (ev) {
    if (ev.target.id !== "rosterAdd") return;
    ev.preventDefault();
    var f = ev.target, id = f.studentId.value.trim(), name = f.name.value.trim(), err = $("rosterError");
    if (!/^\d{10}$/.test(id)) { err.textContent = "학번은 숫자 10자리로 입력해 주세요."; f.studentId.focus(); return; }
    if (!name) { err.textContent = "이름을 입력해 주세요."; f.name.focus(); return; }
    mergeRoster([{ studentId: id, name: name, department: f.department.value.trim(), email: f.email.value.trim() }]).then(function (m) {
      S.toast(m.added ? "👥 " + name + " 학생을 등록했어요." : "👥 " + name + " 학생 정보를 갱신했어요.");
      renderTab();
      setTimeout(function () { var x = $("rId"); if (x) x.focus(); }, 30);
    });
  });

  // 다른 탭에서 수강생 데이터가 바뀌면 현황표 새로 그림
  Store.onChange(function () {
    if (!panel.hidden && /^(dash|roster|att|hw|apps)$/.test(st.tab)) renderTab();
  });

  /* ================================================================
   *  시작
   * ================================================================ */
  renderLock();

  // 임시 수정본이 적용 중이면 왼쪽 아래에 작은 표시 (이 브라우저에서만 보임)
  if (window.SITE_CONFIG_OVERRIDDEN) {
    var badge = document.createElement("button");
    badge.className = "override-badge";
    badge.type = "button";
    badge.innerHTML = "⚙️ 관리자 수정본 적용 중";
    badge.title = "관리자 화면에서 고친 내용이 이 브라우저에만 적용되어 있어요";
    badge.addEventListener("click", function () { st.tab = "file"; ss("adminTab", "file"); openAuth(); });
    document.body.appendChild(badge);
  }

  // 적용 후 새로고침했을 때 관리자 화면을 다시 열어 줌
  if (Store.isAdmin() && ss("adminOpen") === "1") {
    openPanel();
    if (ss("adminJustApplied") === "1") {
      ss("adminJustApplied", null);
      setTimeout(function () { S.toast("✅ 적용했어요! ‘사이트 보기’로 확인하고, 모두에게 반영하려면 설정 파일을 저장하세요."); }, 300);
    }
  }
})();
