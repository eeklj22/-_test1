/*
 * ============================================================
 *  데이터 저장소 (투표 · 수강 신청 · 로그인 · 출석 · 과제 제출)
 * ============================================================
 *  지금은 "데모 모드"입니다. 모든 데이터가 이 브라우저(localStorage)에만 저장됩니다.
 *   - 같은 브라우저의 다른 탭끼리는 실시간으로 동기화됩니다.
 *   - 다른 사람·다른 기기와는 공유되지 않으며, 파일 내용은 업로드되지 않고
 *     파일 이름·크기·제출 시각만 기록됩니다.
 *
 *  실제 운영(여러 수강생이 함께 쓰기)을 하려면 서버가 필요합니다.
 *  그때는 이 파일의 함수들만 같은 이름·같은 반환 형태로 다시 구현하면
 *  (예: Firebase Firestore/Auth/Storage) 화면 코드는 고칠 필요가 없습니다.
 *  모든 함수는 Promise 를 돌려주므로 서버 호출로 바꾸기 쉽습니다.
 */
(function () {
  "use strict";

  var PREFIX = "ku-course:";
  var memory = {}; // localStorage 를 못 쓰는 환경(사생활 보호 모드 등) 대비

  function read(k, fallback) {
    try {
      var v = localStorage.getItem(PREFIX + k);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) {
      return k in memory ? memory[k] : fallback;
    }
  }
  function write(k, v) {
    memory[k] = v;
    try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch (e) { /* 메모리에만 보관 */ }
  }
  function remove(k) {
    delete memory[k];
    try { localStorage.removeItem(PREFIX + k); } catch (e) { /* 무시 */ }
  }
  function ok(v) { return Promise.resolve(v); }
  function allKeys() {
    var ks = {};
    Object.keys(memory).forEach(function (k) { ks[k] = 1; });
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(PREFIX) === 0) ks[k.slice(PREFIX.length)] = 1;
      }
    } catch (e) { /* 무시 */ }
    return Object.keys(ks);
  }
  // "attendance:2024123456" 같은 키들을 { 학번: 값 } 으로 모음
  function collect(prefix) {
    var out = {};
    allKeys().forEach(function (k) {
      if (k.indexOf(prefix + ":") === 0) out[k.slice(prefix.length + 1)] = read(k, {});
    });
    return out;
  }

  /* ---------- 관리자가 화면에서 고친 설정(임시 수정본)을 config.js 대신 적용 ---------- */
  window.SITE_CONFIG_ORIGINAL = window.SITE_CONFIG;
  window.SITE_CONFIG_OVERRIDDEN = false;
  (function () {
    var ov = read("configOverride", null);
    if (ov && ov.site && ov.curriculum) {
      window.SITE_CONFIG = ov;
      window.SITE_CONFIG_OVERRIDDEN = true;
    }
  })();

  // 브라우저마다 고유한 투표자 id
  function voterId() {
    var id = read("voterId", null);
    if (!id) { id = "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); write("voterId", id); }
    return id;
  }

  var listeners = [];
  function emit(topic) { listeners.forEach(function (fn) { fn(topic); }); }
  // 다른 탭에서 바뀐 내용 감지 → 실시간 반영
  window.addEventListener("storage", function (e) {
    if (!e.key || e.key.indexOf(PREFIX) !== 0) return;
    emit(e.key.slice(PREFIX.length).split(":")[0]);
  });

  window.Store = {
    mode: "demo",

    /* 변경 알림 구독: fn(topic) — topic: "votes" | "user" | "attendance" | "submissions" | "applications" */
    onChange: function (fn) { listeners.push(fn); },

    /* ---------- 투표 ---------- */
    getPoll: function () {
      var votes = read("votes", {});
      var counts = {};
      Object.keys(votes).forEach(function (v) { counts[votes[v]] = (counts[votes[v]] || 0) + 1; });
      return ok({ counts: counts, myVote: votes[voterId()] || null });
    },
    vote: function (optionId) {
      var votes = read("votes", {});
      votes[voterId()] = optionId;
      write("votes", votes);
      emit("votes");
      return this.getPoll();
    },

    /* ---------- 수강 신청 (같은 학번으로 다시 내면 수정) ---------- */
    submitApplication: function (data) {
      var apps = read("applications", {});
      var existed = !!apps[data.studentId];
      var rec = Object.assign({}, data, { submittedAt: new Date().toISOString() });
      apps[data.studentId] = rec;
      write("applications", apps);
      write("myApplication", data.studentId);
      emit("applications");
      return ok({ record: rec, updated: existed });
    },
    getMyApplication: function () {
      var id = read("myApplication", null);
      return ok(id ? read("applications", {})[id] || null : null);
    },
    hasApplication: function (studentId) {
      return ok(!!read("applications", {})[studentId]);
    },

    /* ---------- 로그인 ---------- */
    currentUser: function () { return read("user", null); },
    login: function (studentId, name) {
      var user = { studentId: studentId, name: name, loggedInAt: new Date().toISOString() };
      write("user", user);
      var users = read("users", {}); // 관리자 화면에서 이름을 찾기 위한 기록
      users[studentId] = name;
      write("users", users);
      emit("user");
      return ok(user);
    },
    logout: function () { remove("user"); emit("user"); return ok(); },

    /* ---------- 출석 { 날짜키: 체크 시각 } ---------- */
    getAttendance: function (studentId) {
      return ok(read("attendance:" + studentId, {}));
    },
    checkIn: function (studentId, sessionKey) {
      var att = read("attendance:" + studentId, {});
      if (!att[sessionKey]) att[sessionKey] = new Date().toISOString();
      write("attendance:" + studentId, att);
      emit("attendance");
      return ok(att);
    },

    /* ---------- 과제 제출 { 주차: { fileName, size, submittedAt, late } } ---------- */
    getSubmissions: function (studentId) {
      return ok(read("submissions:" + studentId, {}));
    },
    submitAssignment: function (studentId, week, file, late) {
      var subs = read("submissions:" + studentId, {});
      subs[week] = { fileName: file.name, size: file.size, submittedAt: new Date().toISOString(), late: !!late };
      write("submissions:" + studentId, subs);
      emit("submissions");
      return ok(subs[week]);
    },

    /* ---------- 방문 기록 · 팝업 ---------- */
    isFirstVisit: function () { return !read("visited", false); },
    markVisited: function () { write("visited", true); },
    getPopupHiddenDate: function () { return read("popupHiddenDate", ""); },
    hidePopupFor: function (dateKey) { write("popupHiddenDate", dateKey); },

    /* ================= 관리자용 ================= */
    isAdmin: function () { try { return sessionStorage.getItem(PREFIX + "admin") === "1"; } catch (e) { return !!memory.__admin; } },
    setAdmin: function (on) {
      memory.__admin = on;
      try { if (on) sessionStorage.setItem(PREFIX + "admin", "1"); else sessionStorage.removeItem(PREFIX + "admin"); } catch (e) { /* 무시 */ }
    },

    /* 수강생 명단 [{ studentId, name, department, email }] */
    getRoster: function () { return ok(read("roster", [])); },
    saveRoster: function (list) { write("roster", list); emit("roster"); return ok(list); },

    getAllApplications: function () { return ok(read("applications", {})); },
    deleteApplication: function (id) {
      var apps = read("applications", {});
      delete apps[id];
      write("applications", apps);
      emit("applications");
      return ok();
    },
    getAllAttendance: function () { return ok(collect("attendance")); },
    setAttendance: function (studentId, sessionKey, on) {
      var att = read("attendance:" + studentId, {});
      if (on) att[sessionKey] = att[sessionKey] || new Date().toISOString();
      else delete att[sessionKey];
      write("attendance:" + studentId, att);
      emit("attendance");
      return ok(att);
    },
    getAllSubmissions: function () { return ok(collect("submissions")); },
    getUsers: function () { return ok(read("users", {})); },
    getVoteCount: function () { return ok(Object.keys(read("votes", {})).length); },

    /* 설정 임시 수정본 */
    getConfigOverride: function () { return ok(read("configOverride", null)); },
    setConfigOverride: function (cfg) { write("configOverride", cfg); return ok(); },
    clearConfigOverride: function () { remove("configOverride"); return ok(); },

    /* 전체 데이터 백업 / 복원 (브라우저를 옮길 때) */
    exportAll: function () {
      var out = {};
      allKeys().forEach(function (k) { if (k !== "voterId" && k !== "user" && k.indexOf("__") !== 0) out[k] = read(k, null); });
      return ok(out);
    },
    importAll: function (data) {
      Object.keys(data || {}).forEach(function (k) {
        if (k !== "voterId" && k !== "user" && k.indexOf("__") !== 0) write(k, data[k]);
      });
      emit("all");
      return ok();
    },
  };
})();
