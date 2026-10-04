/*
 * 수강생 참여 기능: 실시간 투표 · 수강 신청서 · 로그인 · 출석 · 과제 제출 · 안내 팝업 · 첫 방문 폭죽
 * 내용은 config.js, 데이터 저장은 js/store.js 에서 관리합니다.
 */
(function () {
  "use strict";

  var S = window.SITE, Store = window.Store;
  if (!S || !Store) return;
  var C = S.config, esc = S.esc, each = S.each;
  function $(id) { return document.getElementById(id); }
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function fmtSize(b) { return b < 1024 * 1024 ? Math.max(1, Math.round(b / 1024)) + "KB" : (b / 1024 / 1024).toFixed(1) + "MB"; }
  function fmtShort(iso) {
    var d = new Date(iso);
    return (d.getMonth() + 1) + "." + d.getDate() + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  var assignments = S.sessions.filter(function (s) { return s.w.assignment; });

  /* ================================================================
   *  모달 (팝업 · 로그인 · 과제 제출 공용)
   * ================================================================ */
  var modal = $("modal"), modalBox = modal.querySelector(".modal__box"), modalBody = $("modalBody");
  var lastFocus = null, closeTimer = null;

  function openModal(html, variant) {
    clearTimeout(closeTimer);
    if (modal.hidden) lastFocus = document.activeElement;
    modalBody.innerHTML = html;
    modal.className = "modal" + (variant ? " modal--" + variant : "");
    modal.hidden = false;
    document.body.classList.add("no-scroll");
    requestAnimationFrame(function () { modal.classList.add("is-open"); });
    var first = modal.querySelector("[autofocus]") || modalBox;
    first.focus();
    S.updateCountdowns();
  }
  function closeModal() {
    if (modal.hidden) return;
    modal.classList.remove("is-open");
    document.body.classList.remove("no-scroll");
    closeTimer = setTimeout(function () { modal.hidden = true; modalBody.innerHTML = ""; }, 250);
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }
  modal.addEventListener("click", function (ev) {
    if (ev.target.closest("[data-close]") || ev.target.closest("[data-scroll]")) closeModal();
  });
  S.openModal = openModal;
  S.closeModal = closeModal;
  document.addEventListener("keydown", function (ev) {
    if (modal.hidden) return;
    if (ev.key === "Escape") { closeModal(); return; }
    if (ev.key === "Tab") { // 포커스를 모달 안에 가둠
      var f = modalBox.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
    }
  });

  /* ================================================================
   *  로그인
   * ================================================================ */
  var stu = C.student;
  var afterLogin = null;

  function requireLogin(then) {
    if (Store.currentUser()) then();
    else { afterLogin = then; openLogin(); }
  }

  function openLogin(prefill) {
    prefill = prefill || {};
    openModal(
      '<h3 class="modal__title" id="modalTitle">수강생 로그인</h3>' +
      '<p class="modal__text">학번과 이름을 입력해 주세요.</p>' +
      '<form class="login-form" id="loginForm" novalidate>' +
        '<label class="field"><span class="field__label">학번</span>' +
          '<input class="input" name="studentId" inputmode="numeric" autocomplete="username" placeholder="2024123456" value="' + esc(prefill.studentId || "") + '" autofocus /></label>' +
        '<label class="field"><span class="field__label">이름</span>' +
          '<input class="input" name="name" autocomplete="name" placeholder="홍길동" value="' + esc(prefill.name || "") + '" /></label>' +
        '<p class="form-error" id="loginError" role="alert"></p>' +
        '<button class="btn btn--primary btn--block" type="submit">로그인</button>' +
      "</form>" +
      '<p class="modal__note">아직 신청 전이라면 <a href="#apply" data-scroll="apply">수강 신청서</a>를 먼저 작성해 주세요.</p>' +
      demoNote(),
      "small"
    );
  }

  document.addEventListener("submit", function (ev) {
    if (ev.target.id !== "loginForm") return;
    ev.preventDefault();
    var f = ev.target, id = f.studentId.value.trim(), name = f.name.value.trim(), err = $("loginError");
    if (!/^\d{10}$/.test(id)) { err.textContent = "학번은 숫자 10자리로 입력해 주세요."; f.studentId.focus(); return; }
    if (!name) { err.textContent = "이름을 입력해 주세요."; f.name.focus(); return; }
    var rule = stu.loginCheck || (stu.onlyApplicants ? "applicants" : "none");
    Promise.all([Store.hasApplication(id), Store.getRoster()]).then(function (r) {
      if (rule === "applicants" && !r[0]) { err.textContent = "수강 신청서를 제출한 학번만 로그인할 수 있어요."; return; }
      if (rule === "roster") {
        var m = r[1].filter(function (x) { return x.studentId === id; })[0];
        if (!m) { err.textContent = "수강생 명단에 없는 학번입니다. 교수자에게 문의해 주세요."; return; }
        if (m.name && m.name !== name) { err.textContent = "명단에 등록된 이름과 다릅니다."; return; }
      }
      return Store.login(id, name).then(function (u) {
        closeModal();
        S.toast(u.name + "님, 반가워요!");
        if (afterLogin) { var fn = afterLogin; afterLogin = null; setTimeout(fn, 300); }
      });
    });
  });

  function demoNote() {
    return Store.mode === "demo"
      ? '<p class="demo-note">ℹ️ 데모 모드: 입력한 정보는 이 브라우저에만 저장되며 서버로 전송되지 않습니다.</p>'
      : "";
  }

  // 헤더 로그인 버튼
  var loginBtn = $("loginBtn");
  function renderHeader() {
    var u = Store.currentUser();
    loginBtn.innerHTML = S.icon.user + "<span>" + (u ? esc(u.name) + "님" : "로그인") + "</span>";
    loginBtn.setAttribute("aria-label", u ? u.name + "님 · 수강생 공간으로" : "수강생 로그인");
    loginBtn.classList.toggle("is-in", !!u);
  }
  loginBtn.addEventListener("click", function () {
    if (Store.currentUser()) $("student").scrollIntoView({ behavior: "smooth", block: "start" });
    else openLogin();
  });

  /* ================================================================
   *  수강생 공간: 출석 + 과제
   * ================================================================ */
  function startTime(s) {
    var m = /(\d{1,2}):(\d{2})/.exec(s.time || "");
    var d = new Date(s.date);
    if (m) d.setHours(+m[1], +m[2], 0, 0);
    return d;
  }
  // done 출석 | open 체크 가능 | upcoming 예정 | absent 결석
  function attState(s, att) {
    if (att[s.key]) return "done";
    var now = new Date(), a = stu.attendance;
    if (a.anytime) return s.date <= now ? "open" : "upcoming";
    var start = startTime(s).getTime();
    if (now.getTime() < start - a.openBefore * 60000) return "upcoming";
    if (now.getTime() <= start + a.closeAfter * 60000) return "open";
    return "absent";
  }

  function renderStudent() {
    var root = $("student"), u = Store.currentUser();
    var headHtml = S.head("MY CLASS", stu.title, stu.lead);
    if (!u) {
      root.innerHTML = headHtml +
        '<div class="card stu-guest reveal">' +
          '<div class="stu-guest__icon">🔐</div>' +
          "<h3>로그인이 필요해요</h3>" +
          "<p>로그인하면 출석 체크와 과제 파일 제출, 나의 제출 현황을 확인할 수 있습니다.</p>" +
          '<div class="stu-guest__btns"><button class="btn btn--primary" data-login>로그인</button>' +
          '<a class="btn btn--ghost" href="#apply" data-scroll="apply">수강 신청하기</a></div>' +
        "</div>";
      S.observe(root);
      updateSubmitStatuses({});
      return;
    }
    Promise.all([Store.getAttendance(u.studentId), Store.getSubmissions(u.studentId)]).then(function (r) {
      var att = r[0], subs = r[1], now = new Date();
      var held = S.sessions.filter(function (s) { return s.date <= now; });
      var attended = S.sessions.filter(function (s) { return att[s.key]; }).length;
      var submitted = assignments.filter(function (s) { return subs[s.n]; }).length;
      var todays = S.sessionByKey[S.key(S.today)];

      var todayHtml;
      if (todays) {
        var st = attState(todays, att);
        todayHtml = '<div class="today-class"><div><span class="today-class__label">오늘 수업 · ' + todays.n + "주차</span>" +
          "<strong>" + esc(todays.w.title) + "</strong><span>" + esc(todays.time) + " · " + esc(todays.location) + "</span></div>" +
          (st === "done" ? '<span class="att att--done">✅ 출석 완료 ' + fmtShort(att[todays.key]).split(" ")[1] + "</span>"
            : st === "open" ? '<button class="btn btn--primary" data-checkin="' + todays.key + '">출석 체크</button>'
            : st === "upcoming" ? '<span class="att">출석은 수업 ' + stu.attendance.openBefore + "분 전부터</span>"
            : '<span class="att att--absent">출석 시간이 지났어요</span>') + "</div>";
      } else {
        var next = S.sessions.filter(function (s) { return s.date > now; })[0];
        todayHtml = '<div class="today-class is-none"><div><span class="today-class__label">오늘은 수업이 없어요</span>' +
          (next ? "<strong>다음 수업: " + esc(S.fmtDate(next.date)) + " · " + next.n + "주차</strong><span>" + esc(next.w.title) + "</span>"
                : "<strong>이번 학기 수업이 모두 끝났어요</strong><span>한 학기 동안 수고 많으셨습니다</span>") +
          "</div></div>";
      }

      root.innerHTML = headHtml +
        '<div class="card stu-profile reveal">' +
          '<div class="stu-profile__avatar">' + esc(u.name.charAt(0)) + "</div>" +
          '<div class="stu-profile__info"><strong>' + esc(u.name) + "</strong><span>" + esc(u.studentId) + "</span></div>" +
          '<div class="stu-profile__stats">' +
            '<div><b>' + (held.length ? Math.round((attended / held.length) * 100) + "%" : "–") + "</b><span>출석률 (" + attended + "/" + held.length + ")</span></div>" +
            "<div><b>" + submitted + "/" + assignments.length + "</b><span>과제 제출</span></div>" +
          "</div>" +
          '<button class="btn btn--ghost btn--sm" data-logout>로그아웃</button>' +
        "</div>" +
        '<div class="stu-grid">' +
          '<div class="card reveal"><h3 class="card__title">🗓️ 출석 체크</h3>' + todayHtml +
            '<ul class="att-list">' + each(S.sessions, function (s) {
              var st = attState(s, att);
              var badge = st === "done" ? '<span class="att att--done">출석 · ' + fmtShort(att[s.key]) + "</span>"
                : st === "open" ? '<button class="btn btn--sm btn--soft" data-checkin="' + s.key + '">출석 체크</button>'
                : st === "absent" ? '<span class="att att--absent">결석</span>'
                : '<span class="att">예정</span>';
              return '<li><span class="att-list__week">' + s.n + '주</span><span class="att-list__date">' + esc(S.fmtDate(s.date)) + "</span>" + badge + "</li>";
            }) + "</ul>" +
            (stu.attendance.anytime ? '<p class="demo-note">ℹ️ 테스트 설정: 지난 수업도 출석 체크할 수 있습니다. (config.js 의 attendance.anytime)</p>' : "") +
          "</div>" +
          '<div class="card reveal"><h3 class="card__title">📝 과제 제출</h3><ul class="hw-list">' + each(assignments, function (s) {
            var a = s.w.assignment, sub = subs[s.n];
            return '<li class="hw"><div class="hw__top"><strong>' + esc(a.title) + '</strong><span class="countdown" data-due="' + esc(a.due) + '"></span></div>' +
              '<div class="hw__meta">' + s.n + "주차 · 마감 " + esc(S.fmtDateTime(s.due)) + "</div>" +
              '<div class="hw__bottom">' +
                (sub ? '<span class="sub-ok">✅ ' + esc(sub.fileName) + " · " + fmtShort(sub.submittedAt) + (sub.late ? ' <em>지각</em>' : "") + "</span>"
                     : '<span class="sub-none">미제출</span>') +
                '<button class="btn btn--sm ' + (sub ? "btn--ghost" : "btn--primary") + '" data-submit-week="' + s.n + '">' + (sub ? "다시 제출" : "제출하기") + "</button>" +
              "</div></li>";
          }) + "</ul></div>" +
        "</div>" + demoNote();
      S.observe(root);
      S.updateCountdowns();
      updateSubmitStatuses(subs);
    });
  }

  // 커리큘럼 주차 안의 과제 제출 상태 표시
  function updateSubmitStatuses(subs) {
    document.querySelectorAll("#curriculum [data-status-week]").forEach(function (el) {
      var sub = subs[el.getAttribute("data-status-week")];
      el.innerHTML = sub ? "✅ 제출 완료 · " + fmtShort(sub.submittedAt) + (sub.late ? " (지각)" : "") : "";
      var btn = el.parentElement.querySelector("[data-submit-week]");
      if (btn) btn.textContent = sub ? "다시 제출" : "과제 제출";
    });
  }

  /* ---------- 과제 제출 모달 ---------- */
  var sub = stu.submission;
  function openSubmit(n) {
    var s = S.sessions[n - 1];
    if (!s || !s.w.assignment) return;
    var u = Store.currentUser(), a = s.w.assignment;
    var late = s.due && Date.now() > s.due.getTime();
    Store.getSubmissions(u.studentId).then(function (subs) {
      var prev = subs[n];
      var blocked = late && !sub.allowLate;
      openModal(
        '<span class="modal__badge">' + n + "주차 과제</span>" +
        '<h3 class="modal__title" id="modalTitle">' + esc(a.title) + "</h3>" +
        '<p class="modal__text">' + esc(a.description) + "</p>" +
        '<div class="submit-due"><span>마감 ' + esc(S.fmtDateTime(s.due)) + '</span><span class="countdown" data-due="' + esc(a.due) + '"></span></div>' +
        (prev ? '<p class="submit-prev">이전 제출: <b>' + esc(prev.fileName) + "</b> (" + fmtSize(prev.size) + ", " + fmtShort(prev.submittedAt) + ")<br>새 파일을 내면 이전 제출을 대체합니다.</p>" : "") +
        (blocked
          ? '<p class="form-error">마감이 지나 제출할 수 없습니다.</p>'
          : '<form id="submitForm" data-week="' + n + '" novalidate>' +
              '<label class="dropzone" id="dropzone">' +
                '<input type="file" name="file" accept="' + esc(sub.accept) + '" />' +
                '<span class="dropzone__icon">📎</span>' +
                '<span class="dropzone__text" id="dropText">파일을 끌어다 놓거나 <u>눌러서 선택</u>하세요</span>' +
                '<span class="dropzone__hint">' + esc(sub.accept.split(",").join(" ")) + " · 최대 " + sub.maxMB + "MB</span>" +
              "</label>" +
              '<p class="form-error" id="submitError" role="alert"></p>' +
              (late ? '<p class="late-warn">⚠️ 마감이 지났습니다. 지금 제출하면 지각으로 기록됩니다.</p>' : "") +
              '<button class="btn btn--primary btn--block" type="submit">' + (prev ? "다시 제출하기" : "제출하기") + "</button>" +
            "</form>") +
        demoNote()
      );
    });
  }

  function checkFile(file) {
    if (!file) return "제출할 파일을 선택해 주세요.";
    var ext = "." + file.name.split(".").pop().toLowerCase();
    var ok = sub.accept.split(",").map(function (x) { return x.trim().toLowerCase(); });
    if (ok.indexOf(ext) < 0) return "허용되지 않는 파일 형식입니다. (" + ok.join(", ") + ")";
    if (file.size > sub.maxMB * 1024 * 1024) return "파일이 너무 큽니다. 최대 " + sub.maxMB + "MB까지 제출할 수 있어요.";
    if (file.size === 0) return "빈 파일은 제출할 수 없습니다.";
    return "";
  }
  function showFile(form) {
    var file = form.file.files[0];
    $("dropText").innerHTML = file ? "📄 <b>" + esc(file.name) + "</b> (" + fmtSize(file.size) + ")" : "파일을 끌어다 놓거나 <u>눌러서 선택</u>하세요";
    $("submitError").textContent = file ? checkFile(file) : "";
    $("dropzone").classList.toggle("has-file", !!file);
  }
  modal.addEventListener("change", function (ev) {
    if (ev.target.name === "file") showFile(ev.target.form);
  });
  ["dragenter", "dragover"].forEach(function (t) {
    modal.addEventListener(t, function (ev) {
      var dz = ev.target.closest && ev.target.closest(".dropzone");
      if (dz) { ev.preventDefault(); dz.classList.add("is-drag"); }
    });
  });
  ["dragleave", "drop"].forEach(function (t) {
    modal.addEventListener(t, function (ev) {
      var dz = ev.target.closest && ev.target.closest(".dropzone");
      if (!dz) return;
      dz.classList.remove("is-drag");
      if (t === "drop") {
        ev.preventDefault();
        var input = dz.querySelector("input");
        input.files = ev.dataTransfer.files;
        showFile(input.form);
      }
    });
  });
  document.addEventListener("submit", function (ev) {
    if (ev.target.id !== "submitForm") return;
    ev.preventDefault();
    var form = ev.target, file = form.file.files[0], msg = checkFile(file);
    if (msg) { $("submitError").textContent = msg; return; }
    var n = +form.getAttribute("data-week"), s = S.sessions[n - 1];
    var late = Date.now() > s.due.getTime();
    Store.submitAssignment(Store.currentUser().studentId, n, file, late).then(function () {
      closeModal();
      S.toast("📮 " + s.w.assignment.title + " 제출 완료!" + (late ? " (지각)" : ""));
    });
  });

  /* ================================================================
   *  참여하기: 실시간 투표 + 수강 신청서
   * ================================================================ */
  var poll = C.poll, app = C.application;
  $("join").innerHTML =
    S.head("JOIN US", "참여하기", "투표하고, 신청서를 작성해 함께해요") +
    '<div class="card poll reveal" id="poll">' +
      '<div class="poll__ask">' +
        '<h3 class="card__title">🗳️ ' + esc(poll.title) + "</h3>" +
        '<p class="poll__desc">' + esc(poll.desc) + "</p>" +
        '<div class="poll__options" role="group" aria-label="' + esc(poll.title) + '">' + each(poll.options, function (o) {
          return '<button class="poll__opt" data-vote="' + esc(o.id) + '" aria-pressed="false"><span class="poll__radio"></span>' + esc(o.label) + "</button>";
        }) + "</div>" +
      "</div>" +
      '<div class="poll__result">' +
        '<div class="poll__result-head"><h4>실시간 결과</h4><span class="live"><i></i>LIVE</span></div>' +
        '<p class="poll__total" id="pollTotal"></p>' +
        '<div class="bars" id="pollBars"></div>' +
      "</div>" +
    "</div>" +
    '<div class="card apply reveal" id="apply"></div>';

  var tip = document.createElement("div");
  tip.className = "chart-tip";
  tip.setAttribute("role", "presentation");
  document.body.appendChild(tip);

  function renderPoll() {
    Store.getPoll().then(function (p) {
      var total = 0;
      poll.options.forEach(function (o) { total += p.counts[o.id] || 0; });
      $("pollTotal").textContent = total ? "총 " + total + "표 참여" : "아직 투표가 없어요. 첫 번째로 참여해 보세요!";
      // 순서는 설정 순서 그대로 고정 (막대가 순위에 따라 움직이지 않게)
      $("pollBars").innerHTML = each(poll.options, function (o) {
        var c = p.counts[o.id] || 0, pct = total ? Math.round((c / total) * 100) : 0, mine = p.myVote === o.id;
        return '<div class="bar-row' + (mine ? " is-mine" : "") + '" data-tip="' + esc(o.label + " · " + c + "표 (" + pct + "%)") + '">' +
          '<div class="bar-row__label">' + esc(o.label) + (mine ? ' <span class="mine-tag">내 선택</span>' : "") + "</div>" +
          '<div class="bar-row__track"><div class="bar-row__fill" style="width:' + pct + '%"></div></div>' +
          '<div class="bar-row__value">' + c + "표 · " + pct + "%</div>" +
        "</div>";
      });
      document.querySelectorAll("#poll [data-vote]").forEach(function (b) {
        var on = b.getAttribute("data-vote") === p.myVote;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-pressed", String(on));
      });
    });
  }
  $("poll").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-vote]");
    if (!b) return;
    Store.vote(b.getAttribute("data-vote")).then(function () { S.toast("투표했어요! 결과에 바로 반영됩니다 🗳️"); });
  });
  $("pollBars").addEventListener("mousemove", function (ev) {
    var row = ev.target.closest(".bar-row");
    if (!row) { tip.classList.remove("is-on"); return; }
    tip.textContent = row.getAttribute("data-tip");
    tip.style.left = ev.clientX + "px";
    tip.style.top = ev.clientY + "px";
    tip.classList.add("is-on");
  });
  $("pollBars").addEventListener("mouseleave", function () { tip.classList.remove("is-on"); });

  /* ---------- 수강 신청서 ---------- */
  var CHOICE = { select: 1, radio: 1, checkbox: 1 };
  function fieldHtml(f) {
    var id = "f-" + f.name, req = f.required ? ' <span class="req">*</span>' : "";
    var aria = ' aria-describedby="err-' + f.name + '"';
    var wide = f.type === "textarea" || f.type === "radio" || f.type === "checkbox" || f.type === "consent";
    var inner;
    if (f.type === "select") {
      inner = '<label class="field__label" for="' + id + '">' + esc(f.label) + req + "</label>" +
        '<select class="input" id="' + id + '" name="' + esc(f.name) + '"' + aria + '><option value="">선택해 주세요</option>' +
        each(f.options, function (o) { return "<option>" + esc(o) + "</option>"; }) + "</select>";
    } else if (f.type === "radio" || f.type === "checkbox") {
      inner = '<fieldset><legend class="field__label">' + esc(f.label) + req + '</legend><div class="choices">' +
        each(f.options, function (o, i) {
          return '<label class="choice"><input type="' + f.type + '" name="' + esc(f.name) + '" value="' + esc(o) + '"' + (i === 0 ? ' id="' + id + '"' : "") + aria + " /><span>" + esc(o) + "</span></label>";
        }) + "</div></fieldset>";
    } else if (f.type === "textarea") {
      inner = '<label class="field__label" for="' + id + '">' + esc(f.label) + req + "</label>" +
        '<textarea class="input" id="' + id + '" name="' + esc(f.name) + '" rows="4" placeholder="' + esc(f.placeholder || "") + '"' + aria + "></textarea>" +
        (f.minLength ? '<span class="counter" data-counter="' + esc(f.name) + '">0 / ' + f.minLength + "자 이상</span>" : "");
    } else if (f.type === "consent") {
      inner = '<label class="consent"><input type="checkbox" id="' + id + '" name="' + esc(f.name) + '"' + aria + " /><span>" + esc(f.label) + req + "</span></label>";
    } else {
      inner = '<label class="field__label" for="' + id + '">' + esc(f.label) + req + "</label>" +
        '<input class="input" id="' + id + '" name="' + esc(f.name) + '" type="' + esc(f.type) + '" placeholder="' + esc(f.placeholder || "") + '"' +
        (f.inputmode ? ' inputmode="' + esc(f.inputmode) + '"' : "") + aria + " />";
    }
    return '<div class="field' + (wide ? " field--wide" : "") + '" data-field="' + esc(f.name) + '">' + inner +
      '<p class="field__error" id="err-' + esc(f.name) + '"></p></div>';
  }

  function getValue(form, f) {
    if (f.type === "checkbox") return [].map.call(form.querySelectorAll('input[name="' + f.name + '"]:checked'), function (i) { return i.value; });
    if (f.type === "radio") { var r = form.querySelector('input[name="' + f.name + '"]:checked'); return r ? r.value : ""; }
    if (f.type === "consent") return form.elements[f.name].checked;
    return form.elements[f.name].value.trim();
  }
  function isEmpty(form, f) {
    var v = getValue(form, f);
    return Array.isArray(v) ? !v.length : !v;
  }
  function checkField(form, f) {
    var v = getValue(form, f);
    if (isEmpty(form, f)) {
      if (!f.required) return "";
      return f.type === "consent" ? "동의해 주셔야 신청할 수 있어요." : CHOICE[f.type] ? "항목을 선택해 주세요." : "항목을 입력해 주세요.";
    }
    if (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "올바른 이메일 형식이 아닙니다.";
    if (f.pattern && typeof v === "string" && !new RegExp(f.pattern).test(v)) return f.patternMessage || "형식을 확인해 주세요.";
    if (f.minLength && v.length < f.minLength) return f.minLength + "자 이상 입력해 주세요. (현재 " + v.length + "자)";
    return "";
  }
  function setError(form, f, msg) {
    var wrap = form.querySelector('[data-field="' + f.name + '"]');
    wrap.classList.toggle("has-error", !!msg);
    $("err-" + f.name).textContent = msg;
    wrap.querySelectorAll("input, select, textarea").forEach(function (el) { el.setAttribute("aria-invalid", msg ? "true" : "false"); });
  }

  function renderApplyForm(values) {
    var box = $("apply");
    box.innerHTML =
      '<h3 class="card__title">📮 ' + esc(app.title) + "</h3>" +
      '<p class="apply__desc">' + esc(app.desc) + "</p>" +
      '<div class="form-summary" id="formSummary" tabindex="-1" hidden></div>' +
      '<form class="apply__form" id="applyForm" novalidate>' + each(app.fields, fieldHtml) +
        '<div class="field field--wide apply__submit"><button class="btn btn--primary" type="submit">' + esc(app.submitLabel) + "</button>" +
        '<span class="apply__hint">같은 학번으로 다시 제출하면 기존 신청서가 수정됩니다.</span></div>' +
      "</form>" + demoNote();
    if (values) { // 수정하기: 기존 값 채우기
      var form = $("applyForm");
      app.fields.forEach(function (f) {
        var v = values[f.name];
        if (v == null) return;
        if (f.type === "checkbox") form.querySelectorAll('input[name="' + f.name + '"]').forEach(function (i) { i.checked = v.indexOf(i.value) >= 0; });
        else if (f.type === "radio") form.querySelectorAll('input[name="' + f.name + '"]').forEach(function (i) { i.checked = i.value === v; });
        else if (f.type === "consent") form.elements[f.name].checked = !!v;
        else form.elements[f.name].value = v;
      });
      updateCounters(form);
    }
  }
  function updateCounters(form) {
    form.querySelectorAll("[data-counter]").forEach(function (c) {
      var f = app.fields.filter(function (x) { return x.name === c.getAttribute("data-counter"); })[0];
      var len = form.elements[f.name].value.trim().length;
      c.textContent = len + " / " + f.minLength + "자 이상";
      c.classList.toggle("is-ok", len >= f.minLength);
    });
  }

  function renderApplyDone(rec, updated) {
    $("apply").innerHTML =
      '<div class="apply-done">' +
        '<div class="apply-done__icon">🎉</div>' +
        "<h3>" + esc(updated ? "신청서가 수정되었어요!" : app.successTitle) + "</h3>" +
        "<p>" + esc(app.successText) + "</p>" +
        '<dl class="apply-done__info">' +
          "<div><dt>이름</dt><dd>" + esc(rec.name) + "</dd></div>" +
          "<div><dt>학번</dt><dd>" + esc(rec.studentId) + "</dd></div>" +
          "<div><dt>제출 시각</dt><dd>" + esc(S.fmtDateTime(new Date(rec.submittedAt))) + "</dd></div>" +
        "</dl>" +
        '<div class="apply-done__btns">' +
          (Store.currentUser() ? "" : '<button class="btn btn--primary" data-login-as>이 학번으로 로그인</button>') +
          '<button class="btn btn--ghost" data-edit-apply>신청서 수정하기</button>' +
        "</div>" +
      "</div>";
  }

  var applyBox = $("apply");
  applyBox.addEventListener("submit", function (ev) {
    if (ev.target.id !== "applyForm") return;
    ev.preventDefault();
    var form = ev.target, errors = [];
    app.fields.forEach(function (f) {
      var msg = checkField(form, f);
      setError(form, f, msg);
      if (msg) errors.push({ f: f, msg: msg });
    });
    var sum = $("formSummary");
    if (errors.length) {
      var missing = errors.filter(function (e) { return isEmpty(form, e.f); }).length;
      sum.innerHTML = "<strong>⚠️ 확인이 필요한 항목이 " + errors.length + "개 있어요" +
        (missing ? " (빠진 항목 " + missing + "개)" : "") + "</strong><ul>" +
        each(errors, function (e) {
          return '<li><button type="button" data-goto="' + esc(e.f.name) + '">' + esc(e.f.summaryLabel || e.f.label.replace(/\s*\(.*\)$/, "")) + "</button> — " + esc(e.msg) + "</li>";
        }) + "</ul>";
      sum.hidden = false;
      sum.scrollIntoView({ behavior: "smooth", block: "center" });
      sum.focus({ preventScroll: true });
      return;
    }
    sum.hidden = true;
    var data = {};
    app.fields.forEach(function (f) { data[f.name] = getValue(form, f); });
    Store.submitApplication(data).then(function (r) {
      renderApplyDone(r.record, r.updated);
      $("apply").scrollIntoView({ behavior: "smooth", block: "center" });
      if (!r.updated) fireConfetti();
    });
  });
  // 오류가 있던 항목은 고치는 즉시 다시 검사
  function liveCheck(ev) {
    var form = ev.target.form;
    if (!form || form.id !== "applyForm") return;
    updateCounters(form);
    var f = app.fields.filter(function (x) { return x.name === ev.target.name; })[0];
    var wrap = f && form.querySelector('[data-field="' + f.name + '"]');
    if (wrap && wrap.classList.contains("has-error")) setError(form, f, checkField(form, f));
  }
  applyBox.addEventListener("input", liveCheck);
  applyBox.addEventListener("change", liveCheck);
  applyBox.addEventListener("click", function (ev) {
    var go = ev.target.closest("[data-goto]");
    if (go) {
      var el = $("f-" + go.getAttribute("data-goto"));
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus({ preventScroll: true });
      return;
    }
    if (ev.target.closest("[data-edit-apply]")) {
      Store.getMyApplication().then(function (rec) { renderApplyForm(rec); });
      return;
    }
    if (ev.target.closest("[data-login-as]")) {
      Store.getMyApplication().then(function (rec) {
        if (!rec) return;
        Store.login(rec.studentId, rec.name).then(function () {
          S.toast(rec.name + "님, 반가워요!");
          renderApplyDone(rec, false);
          $("student").scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    }
  });

  /* ================================================================
   *  공통 클릭 (로그인 / 로그아웃 / 출석 / 과제 제출)
   * ================================================================ */
  document.addEventListener("click", function (ev) {
    if (ev.target.closest("[data-login]")) { openLogin(); return; }
    if (ev.target.closest("[data-logout]")) {
      Store.logout().then(function () { S.toast("로그아웃되었습니다."); });
      return;
    }
    var ci = ev.target.closest("[data-checkin]");
    if (ci) {
      var s = S.sessionByKey[ci.getAttribute("data-checkin")];
      Store.checkIn(Store.currentUser().studentId, s.key).then(function () { S.toast("✅ " + s.n + "주차 출석 완료!"); });
      return;
    }
    var sb = ev.target.closest("[data-submit-week]");
    if (sb) {
      var n = +sb.getAttribute("data-submit-week");
      requireLogin(function () { openSubmit(n); });
    }
  });

  /* ================================================================
   *  첫 방문 폭죽 (캔버스)
   * ================================================================ */
  var canvas = $("confetti"), ctx = canvas.getContext("2d"), parts = [], running = false;
  var COLORS = ["#2245ff", "#2245ff", "#151515", "#151515", "#ffffff", "#9aa8ff", "#cfcfcb"];

  function fireConfetti() {
    if (reduceMotion || !ctx) return;
    var dpr = window.devicePixelRatio || 1, w = window.innerWidth, h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = w < 600 ? 110 : 180;
    for (var i = 0; i < n; i++) {
      var left = i % 2 === 0;
      var ang = (left ? -60 : -120) + (Math.random() * 40 - 20); // 양쪽 아래에서 안쪽 위로 발사
      var sp = (w < 600 ? 11 : 15) + Math.random() * 8;
      parts.push({
        x: left ? 0 : w, y: h * 0.85,
        vx: Math.cos(ang * Math.PI / 180) * sp, vy: Math.sin(ang * Math.PI / 180) * sp,
        size: 6 + Math.random() * 7, rot: Math.random() * 360, vr: Math.random() * 12 - 6,
        color: COLORS[(Math.random() * COLORS.length) | 0], shape: (Math.random() * 3) | 0,
        tilt: Math.random() * Math.PI, life: 0,
      });
    }
    canvas.classList.add("is-on");
    if (!running) { running = true; requestAnimationFrame(tick); }
  }
  function tick() {
    var w = window.innerWidth, h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);
    parts = parts.filter(function (p) { return p.y < h + 40 && p.life < 360; });
    parts.forEach(function (p) {
      p.life++;
      p.vx *= 0.985; p.vy = p.vy * 0.985 + 0.32; // 공기 저항 + 중력
      p.x += p.vx + Math.sin(p.tilt += 0.08) * 0.6; p.y += p.vy; p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180);
      ctx.globalAlpha = Math.min(1, (360 - p.life) / 60);
      ctx.fillStyle = p.color;
      if (p.shape === 0) ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      else if (p.shape === 1) { ctx.beginPath(); ctx.arc(0, 0, p.size / 3, 0, Math.PI * 2); ctx.fill(); }
      else { // 벚꽃잎
        ctx.beginPath(); ctx.moveTo(0, -p.size / 2);
        ctx.quadraticCurveTo(p.size / 2, 0, 0, p.size / 2);
        ctx.quadraticCurveTo(-p.size / 2, 0, 0, -p.size / 2); ctx.fill();
      }
      ctx.restore();
    });
    if (parts.length) requestAnimationFrame(tick);
    else { running = false; ctx.clearRect(0, 0, w, h); canvas.classList.remove("is-on"); }
  }

  /* ================================================================
   *  수강 신청 안내 팝업 ("오늘 하루 보지 않기")
   * ================================================================ */
  var pop = C.popup;
  function showPopup() {
    if (!modal.hidden) return; // 다른 창이 열려 있으면 띄우지 않음
    openModal(
      '<div class="promo__art" aria-hidden="true">' + esc((C.hero.art && C.hero.art.year) || "2026") + "</div>" +
      '<span class="modal__badge">' + esc(pop.badge) + "</span>" +
      '<h3 class="modal__title" id="modalTitle">' + esc(pop.title) + "</h3>" +
      '<p class="modal__text promo__body">' + esc(pop.body) + "</p>" +
      '<ul class="promo__items">' + each(pop.items, function (i) { return "<li>" + esc(i) + "</li>"; }) + "</ul>" +
      '<a class="btn btn--primary btn--block" href="' + esc(pop.ctaHref) + '" data-scroll="' + esc(pop.ctaHref.replace("#", "")) + '" autofocus>' + esc(pop.ctaLabel) + "</a>" +
      '<div class="promo__foot"><button class="promo__hide" data-hide-today>' + esc(pop.hideTodayLabel) + '</button><button class="promo__hide" data-close>닫기</button></div>',
      "promo"
    );
  }
  modal.addEventListener("click", function (ev) {
    if (ev.target.closest("[data-hide-today]")) {
      Store.hidePopupFor(S.key(new Date()));
      closeModal();
      S.toast("오늘 하루 안내 팝업을 띄우지 않을게요.");
    }
  });

  /* ================================================================
   *  초기화
   * ================================================================ */
  renderHeader();
  renderStudent();
  renderPoll();
  Store.getMyApplication().then(function (rec) { if (rec) renderApplyDone(rec, false); else renderApplyForm(); });
  S.observe($("join"));

  Store.onChange(function (topic) {
    if (topic === "votes") renderPoll();
    if (topic === "user") { renderHeader(); renderStudent(); }
    if (topic === "attendance" || topic === "submissions") renderStudent();
  });

  // 첫 방문: 폭죽 + 환영 메시지
  if (Store.isFirstVisit()) {
    Store.markVisited();
    if (C.welcome && C.welcome.confetti) setTimeout(fireConfetti, 500);
    if (C.welcome && C.welcome.message) setTimeout(function () { S.toast(C.welcome.message); }, 700);
  }
  // 안내 팝업 (오늘 숨김을 고르지 않았을 때만)
  if (pop && pop.enabled && Store.getPopupHiddenDate() !== S.key(new Date())) {
    setTimeout(showPopup, (pop.delaySeconds || 0) * 1000);
  }
})();
