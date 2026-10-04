/*
 * config.js 의 내용을 읽어 화면을 그리는 스크립트입니다.
 * 내용 수정은 config.js 에서 하고, 이 파일은 보통 고칠 필요가 없습니다.
 */
(function () {
  "use strict";

  var C = window.SITE_CONFIG;
  if (!C) {
    document.body.innerHTML = '<p style="padding:40px;text-align:center">config.js 를 불러오지 못했습니다. 파일 위치와 문법(쉼표, 따옴표)을 확인해 주세요.</p>';
    return;
  }

  /* ============ 공통 도우미 ============ */
  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function $(id) { return document.getElementById(id); }
  function each(list, fn) { return (list || []).map(fn).join(""); }
  function head(eyebrow, title, lead) {
    return '<div class="section__head reveal">' +
      '<span class="section__eyebrow">' + esc(eyebrow) + "</span>" +
      '<h2 class="section__title">' + esc(title) + "</h2>" +
      (lead ? '<p class="section__lead">' + esc(lead) + "</p>" : "") +
      "</div>";
  }
  // "#id" 는 페이지 안 이동, 그 밖의 주소는 새 창
  function linkAttrs(href) {
    href = href || "#";
    if (href.charAt(0) === "#") return 'href="' + esc(href) + '" data-scroll="' + esc(href.slice(1)) + '"';
    return 'href="' + esc(href) + '" target="_blank" rel="noopener"';
  }

  /* ---------- 날짜 도우미 ---------- */
  var DAYS = "일월화수목금토";
  function parseDate(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function key(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function fmtDate(d) { return (d.getMonth() + 1) + "월 " + d.getDate() + "일 (" + DAYS[d.getDay()] + ")"; }
  function fmtDateTime(d) {
    return d.getFullYear() + "." + (d.getMonth() + 1) + "." + d.getDate() + " (" + DAYS[d.getDay()] + ") " +
      String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  function dot(d) { return d.getFullYear() + "." + String(d.getMonth() + 1).padStart(2, "0") + "." + String(d.getDate()).padStart(2, "0"); }

  /* ============ 수업 일정 계산 (시작일부터 매주, 휴강일은 건너뜀) ============ */
  var cur = C.curriculum;
  var sch = cur.schedule;
  var holidayMap = {};
  (sch.holidays || []).forEach(function (h) { holidayMap[h.date] = h.label; });

  var sessions = [];
  (function () {
    var d = parseDate(sch.startDate);
    cur.weeks.forEach(function (w, i) {
      var date;
      if (w.date) date = parseDate(w.date);
      else {
        while (holidayMap[key(d)]) d.setDate(d.getDate() + 7);
        date = new Date(d);
        d.setDate(d.getDate() + 7);
      }
      sessions.push({
        n: i + 1, w: w, date: date, key: key(date),
        time: w.time || sch.time, location: w.location || sch.location,
        due: w.assignment && w.assignment.due ? new Date(w.assignment.due) : null,
      });
    });
  })();
  var sessionByKey = {}, dueByKey = {};
  sessions.forEach(function (s) {
    sessionByKey[s.key] = s;
    if (s.due) dueByKey[key(s.due)] = s;
  });

  var today = new Date(); today.setHours(0, 0, 0, 0);
  var nextSession = sessions.filter(function (s) { return s.date >= today; })[0];

  /* ============ 메타 / 헤더 ============ */
  document.title = C.site.title;
  var meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute("content", C.site.description);
  $("logoText").textContent = C.site.logoText;
  $("nav").innerHTML = each(C.nav, function (n) {
    return '<a href="#' + esc(n.target) + '" data-scroll="' + esc(n.target) + '">' + esc(n.label) + "</a>";
  });

  /* ============ 히어로 ============ */
  var h = C.hero;
  var autoSchedule = sessions.length
    ? dot(sessions[0].date) + " – " + dot(sessions[sessions.length - 1].date).slice(5) + " · 매주 " + DAYS[sessions[0].date.getDay()] + "요일 (" + sessions.length + "회)"
    : "";
  $("hero").innerHTML =
    '<div class="card hero__card reveal">' +
      (h.badge ? '<span class="hero__badge">🌸 ' + esc(h.badge) + "</span>" : "") +
      '<h1 class="hero__title">' + esc(h.title) + "</h1>" +
      '<p class="hero__subtitle">' + esc(h.subtitle) + "</p>" +
      '<p class="hero__desc">' + esc(h.description) + "</p>" +
      '<div class="hero__buttons">' + each(h.buttons, function (b) {
        return '<a class="btn ' + (b.primary ? "btn--primary" : "btn--ghost") + '" ' + linkAttrs(b.href) + ">" + esc(b.label) + "</a>";
      }) + "</div>" +
    "</div>" +
    '<div class="quick">' + each(h.info, function (it) {
      return '<div class="card quick__item reveal">' +
        '<span class="quick__icon">' + esc(it.icon) + "</span>" +
        '<div><div class="quick__label">' + esc(it.label) + '</div><div class="quick__value">' +
        esc(it.value === "auto" ? autoSchedule : it.value) + "</div></div></div>";
    }) + "</div>";

  /* ============ 공지사항 (중요 공지 먼저, 그다음 최신순) ============ */
  var notices = (C.notices || []).filter(function (n) { return n && n.title; }).slice().sort(function (a, b) {
    if (!!b.important !== !!a.important) return b.important ? 1 : -1;
    return String(b.date || "").localeCompare(String(a.date || ""));
  });
  if (notices.length) {
    var SHOW = 3;
    $("notice").innerHTML =
      '<div class="card notice-board reveal">' +
        '<div class="notice-board__head"><h2 class="notice-board__title">📢 공지사항</h2><span class="notice-board__count">' + notices.length + "건</span></div>" +
        '<ul class="notice-list">' + each(notices, function (n, i) {
          return '<li class="notice-item' + (i >= SHOW ? " is-extra" : "") + '">' +
            '<button class="notice-item__head" aria-expanded="false">' +
              (n.important ? '<span class="tag tag--hw">중요</span>' : "") +
              '<span class="notice-item__title">' + esc(n.title) + "</span>" +
              '<span class="notice-item__date">' + esc(n.date || "") + "</span>" +
            "</button>" +
            '<div class="collapse"><div><p class="notice-item__body">' + esc(n.body || "") + "</p></div></div>" +
          "</li>";
        }) + "</ul>" +
        (notices.length > SHOW ? '<button class="notice-more" id="noticeMore">공지 ' + (notices.length - SHOW) + "건 더 보기</button>" : "") +
      "</div>";
    $("notice").addEventListener("click", function (ev) {
      var h = ev.target.closest(".notice-item__head");
      if (h) {
        var open = !h.parentElement.classList.contains("is-open");
        h.parentElement.classList.toggle("is-open", open);
        h.setAttribute("aria-expanded", String(open));
      }
      if (ev.target.id === "noticeMore") {
        $("notice").classList.add("show-all");
        ev.target.remove();
      }
    });
  } else {
    $("notice").hidden = true;
  }

  /* ============ 프로그램 소개: 통계 + 장점 슬라이드 ============ */
  var ab = C.about;
  $("about").innerHTML =
    head("ABOUT", ab.title, ab.lead) +
    '<div class="grid grid--4 stats">' + each(ab.stats, function (s) {
      return '<div class="card card--hover stat-card reveal">' +
        '<div class="stat-card__value"><span class="count" data-to="' + Number(s.value) + '">0</span>' + esc(s.suffix) + "</div>" +
        '<div class="stat-card__label">' + esc(s.label) + "</div></div>";
    }) + "</div>" +
    '<div class="slider reveal" id="slider">' +
      '<div class="slider__head"><h3 class="sub-title">' + esc(ab.strengthsTitle) + "</h3>" +
        '<div class="slider__nav"><button class="round-btn" data-slide="prev" aria-label="이전">‹</button>' +
        '<button class="round-btn" data-slide="next" aria-label="다음">›</button></div></div>' +
      '<div class="slider__track" tabindex="0">' + each(ab.strengths, function (s) {
        return '<article class="card slide"><div class="feature__icon">' + esc(s.icon) + "</div>" +
          '<h4 class="slide__title">' + esc(s.title) + '</h4><p class="slide__text">' + esc(s.text) + "</p></article>";
      }) + "</div>" +
      '<div class="slider__dots">' + each(ab.strengths, function (s, i) {
        return '<button class="slider__dot" data-index="' + i + '" aria-label="' + (i + 1) + '번째 슬라이드"></button>';
      }) + "</div>" +
    "</div>";

  /* ============ 커리큘럼: 주차 아코디언 + 달력 ============ */
  function weekBody(s) {
    var w = s.w, a = w.assignment;
    return '<dl class="week__meta">' +
        "<div><dt>📅 날짜</dt><dd>" + esc(fmtDate(s.date)) + "</dd></div>" +
        "<div><dt>⏰ 시간</dt><dd>" + esc(s.time) + "</dd></div>" +
        "<div><dt>📍 장소</dt><dd>" + esc(s.location) + "</dd></div>" +
      "</dl>" +
      '<h4 class="week__h">학습 내용</h4><ul class="week__topics">' + each(w.topics, function (t) { return "<li>" + esc(t) + "</li>"; }) + "</ul>" +
      (w.videos && w.videos.length
        ? '<h4 class="week__h">참고 영상</h4><div class="week__videos">' + each(w.videos, function (v) {
            return '<a class="chip" href="' + esc(v.url) + '" target="_blank" rel="noopener">▶ ' + esc(v.title) + "</a>";
          }) + "</div>"
        : "") +
      (a
        ? '<div class="assign">' +
            '<div class="assign__top"><h4 class="assign__title">📝 ' + esc(a.title) + "</h4>" +
            '<span class="countdown" data-due="' + esc(a.due) + '"></span></div>' +
            '<p class="assign__desc">' + esc(a.description) + "</p>" +
            '<div class="assign__bottom"><span class="assign__due">마감 ' + esc(fmtDateTime(s.due)) + "</span>" +
            '<span class="assign__actions"><span class="submit-status" data-status-week="' + s.n + '"></span>' +
            '<button class="btn btn--primary btn--sm" data-submit-week="' + s.n + '">과제 제출</button></span></div>' +
          "</div>"
        : "");
  }

  $("curriculum").innerHTML =
    head("CURRICULUM", cur.title, cur.lead) +
    '<div class="curri">' +
      '<div class="weeks">' + each(sessions, function (s) {
        var past = s.date < today;
        var isNext = nextSession && s.n === nextSession.n;
        return '<div class="card week reveal' + (past ? " is-past" : "") + '" id="week-' + s.n + '">' +
          '<button class="week__head" aria-expanded="false" aria-controls="week-body-' + s.n + '">' +
            '<span class="week__num">' + s.n + "주차</span>" +
            '<span class="week__main"><span class="week__date">' + esc(fmtDate(s.date)) + "</span>" +
            '<span class="week__title">' + esc(s.w.title) + "</span></span>" +
            '<span class="week__tags">' +
              (isNext ? '<span class="tag tag--next">다음 수업</span>' : "") +
              (s.w.assignment ? '<span class="tag tag--hw">과제</span>' : "") +
            "</span>" +
            '<span class="week__chev">+</span>' +
          "</button>" +
          '<div class="collapse" id="week-body-' + s.n + '" role="region"><div><div class="week__body">' + weekBody(s) + "</div></div></div>" +
        "</div>";
      }) + "</div>" +
      '<aside class="card cal reveal" id="calendar">' +
        '<div class="cal__head">' +
          '<button class="round-btn" data-cal="prev" aria-label="이전 달">‹</button>' +
          '<h3 class="cal__title" id="calTitle"></h3>' +
          '<button class="round-btn" data-cal="next" aria-label="다음 달">›</button>' +
        "</div>" +
        '<div class="cal__grid cal__dow">' + each(DAYS.split(""), function (d, i) {
          return '<span class="' + (i === 0 ? "sun" : i === 6 ? "sat" : "") + '">' + d + "</span>";
        }) + "</div>" +
        '<div class="cal__grid" id="calDays"></div>' +
        '<div class="cal__legend"><span><i class="lg lg--class"></i>수업</span><span><i class="lg lg--due"></i>과제 마감</span><span><i class="lg lg--off"></i>휴강</span><span><i class="lg lg--today"></i>오늘</span></div>' +
        '<div class="cal__detail" id="calDetail"></div>' +
      "</aside>" +
    "</div>";

  /* ============ 수강 안내: AI 도구 + 준비물 ============ */
  var en = C.enroll;
  $("enroll").innerHTML =
    head("GUIDE", en.title, en.lead) +
    '<h3 class="sub-title reveal">' + esc(en.toolsTitle) + "</h3>" +
    '<div class="grid grid--3 tools">' + each(en.tools, function (t) {
      return '<a class="card card--hover tool reveal" href="' + esc(t.url) + '" target="_blank" rel="noopener">' +
        '<span class="tool__icon">' + esc(t.icon) + "</span>" +
        '<span><span class="tool__name">' + esc(t.name) + ' <small>↗</small></span><span class="tool__desc">' + esc(t.desc) + "</span></span></a>";
    }) + "</div>" +
    '<h3 class="sub-title reveal">' + esc(en.prepTitle) + "</h3>" +
    '<div class="grid grid--4">' + each(en.prep, function (p) {
      return '<div class="card card--hover feature reveal"><div class="feature__icon">' + esc(p.icon) + "</div>" +
        '<h4 class="feature__title">' + esc(p.title) + '</h4><p class="feature__text">' + esc(p.text) + "</p></div>";
    }) + "</div>" +
    (en.notice ? '<p class="notice reveal">💌 ' + esc(en.notice) + "</p>" : "");

  /* ============ FAQ ============ */
  var fq = C.faq;
  $("faq").innerHTML =
    head("FAQ", fq.title, fq.lead) +
    '<div class="faq-list">' + each(fq.items, function (it, i) {
      return '<div class="card faq-item reveal">' +
        '<button class="faq-item__q" aria-expanded="false" aria-controls="faq-a-' + i + '">' +
          '<span class="faq-item__mark">Q</span><span class="faq-item__q-text">' + esc(it.q) + '</span><span class="week__chev">+</span>' +
        "</button>" +
        '<div class="collapse" id="faq-a-' + i + '" role="region"><div><p class="faq-item__a">' + esc(it.a) + "</p></div></div>" +
      "</div>";
    }) + "</div>";

  /* ============ 푸터: 교수자 소개 + 연락처 ============ */
  var p = C.instructor;
  $("instructor").innerHTML =
    '<div class="footer__inner">' +
      '<div class="section__head reveal"><span class="section__eyebrow">INSTRUCTOR</span><h2 class="section__title">' + esc(p.title) + "</h2></div>" +
      '<div class="card prof reveal">' +
        '<div class="prof__photo">' + (p.photo ? '<img src="' + esc(p.photo) + '" alt="' + esc(p.name) + '" />' : "👩‍🏫") + "</div>" +
        '<div class="prof__body">' +
          '<h3 class="prof__name">' + esc(p.name) + "</h3>" +
          '<p class="prof__position">' + esc(p.position) + "</p>" +
          '<p class="prof__bio">' + esc(p.bio) + "</p>" +
          '<ul class="prof__career">' + each(p.career, function (c) { return "<li>" + esc(c) + "</li>"; }) + "</ul>" +
        "</div>" +
      "</div>" +
      '<div class="contacts reveal">' + each(p.contacts, function (c) {
        var inner = '<span class="contact__icon">' + esc(c.icon) + '</span><span><span class="contact__label">' + esc(c.label) +
          '</span><span class="contact__value">' + esc(c.value) + "</span></span>";
        return c.href ? '<a class="contact" href="' + esc(c.href) + '">' + inner + "</a>" : '<div class="contact">' + inner + "</div>";
      }) + "</div>" +
      '<p class="footer__copy">' + esc(C.footer.copyright) + "</p>" +
    "</div>";

  /* ================================================================
   *  동작
   * ================================================================ */
  var header = $("header"), nav = $("nav"), toggle = $("menuToggle"), toTop = $("toTop");

  // 알림 메시지
  var toastTimer;
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("is-visible"); }, 2600);
  }

  // 모바일 메뉴
  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
  }
  toggle.addEventListener("click", function () { setMenu(!nav.classList.contains("is-open")); });

  // 접기/펼치기 (주차, FAQ 공용)
  function setOpen(item, btn, open) {
    item.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", String(open));
  }
  function openWeek(n) {
    var item = $("week-" + n);
    if (!item) return;
    setOpen(item, item.querySelector(".week__head"), true);
    item.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.addEventListener("click", function (ev) {
    // 메뉴 바깥 클릭 시 닫기
    if (!nav.contains(ev.target) && !toggle.contains(ev.target)) setMenu(false);

    // 섹션 이동
    var link = ev.target.closest("[data-scroll]");
    if (link) {
      var id = link.getAttribute("data-scroll");
      var target = $(id);
      if (id === "top" || target) {
        ev.preventDefault();
        setMenu(false);
        if (id === "top") window.scrollTo({ top: 0, behavior: "smooth" });
        else target.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", id === "top" ? location.pathname : "#" + id);
      }
      return;
    }

    // 주차 / FAQ 펼치기
    var accBtn = ev.target.closest(".week__head, .faq-item__q");
    if (accBtn) {
      var item = accBtn.parentElement;
      setOpen(item, accBtn, !item.classList.contains("is-open"));
      return;
    }

    // 달력에서 '자세히 보기'
    var go = ev.target.closest("[data-open-week]");
    if (go) openWeek(+go.getAttribute("data-open-week"));
  });

  toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });

  // 스크롤: 헤더 그림자, 맨 위로 버튼, 현재 메뉴 강조
  var sections = C.nav.map(function (n) { return $(n.target); }).filter(Boolean);
  var links = nav.querySelectorAll("a");
  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 8);
    toTop.classList.toggle("is-visible", y > 400);
    var current = "";
    var line = y + header.offsetHeight + 80;
    sections.forEach(function (s) { if (s.getBoundingClientRect().top + y <= line) current = s.id; });
    if (window.innerHeight + y >= document.documentElement.scrollHeight - 4 && sections.length) {
      current = sections[sections.length - 1].id;
    }
    links.forEach(function (l) { l.classList.toggle("is-active", l.getAttribute("data-scroll") === current); });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- 과제 마감 카운트다운 ---------- */
  function updateCountdowns() {
    var now = Date.now();
    document.querySelectorAll(".countdown").forEach(function (el) {
      var diff = new Date(el.getAttribute("data-due")).getTime() - now;
      el.classList.remove("is-urgent", "is-closed");
      if (isNaN(diff)) { el.textContent = ""; return; }
      if (diff <= 0) { el.textContent = "마감되었습니다"; el.classList.add("is-closed"); return; }
      var m = Math.floor(diff / 60000), d = Math.floor(m / 1440), hr = Math.floor((m % 1440) / 60), mi = m % 60;
      el.textContent = (d > 0 ? "D-" + d + " · " + d + "일 " + hr + "시간 남음" : "마감 임박 · " + hr + "시간 " + mi + "분 남음");
      if (diff < 3 * 86400000) el.classList.add("is-urgent");
    });
  }
  updateCountdowns();
  setInterval(updateCountdowns, 30000);

  /* ---------- 월간 달력 ---------- */
  var first = sessions[0] ? sessions[0].date : today;
  var last = sessions.length ? sessions[sessions.length - 1].date : today;
  var inTerm = today >= first && today <= last;
  var view = inTerm ? new Date(today.getFullYear(), today.getMonth(), 1) : new Date(first.getFullYear(), first.getMonth(), 1);
  var selectedKey = inTerm && nextSession ? nextSession.key : (sessions[0] ? sessions[0].key : key(today));

  function renderCalendar() {
    var y = view.getFullYear(), mo = view.getMonth();
    $("calTitle").textContent = y + "년 " + (mo + 1) + "월";
    var startDow = new Date(y, mo, 1).getDay();
    var days = new Date(y, mo + 1, 0).getDate();
    var html = "";
    for (var i = 0; i < startDow; i++) html += "<span></span>";
    for (var d = 1; d <= days; d++) {
      var date = new Date(y, mo, d), k = key(date), s = sessionByKey[k];
      var cls = ["cal__day"];
      if (date.getDay() === 0) cls.push("sun");
      if (date.getDay() === 6) cls.push("sat");
      if (s) cls.push("has-class");
      if (holidayMap[k]) cls.push("is-off");
      if (dueByKey[k]) cls.push("has-due");
      if (k === key(today)) cls.push("is-today");
      if (k === selectedKey) cls.push("is-selected");
      html += '<button class="' + cls.join(" ") + '" data-date="' + k + '" aria-label="' + esc(fmtDate(date)) +
        (s ? ", " + s.n + "주차 수업" : "") + '">' + d + (s ? '<small>' + s.n + "주</small>" : "") + "</button>";
    }
    $("calDays").innerHTML = html;
    renderDetail();
  }

  function renderDetail() {
    var k = selectedKey, date = parseDate(k), s = sessionByKey[k], due = dueByKey[k], html;
    if (s) {
      html = '<div class="cal__when">' + esc(fmtDate(date)) + " · " + s.n + "주차</div>" +
        '<h4 class="cal__class">' + esc(s.w.title) + "</h4>" +
        '<p class="cal__meta">⏰ ' + esc(s.time) + "<br>📍 " + esc(s.location) + "</p>" +
        '<ul class="week__topics">' + each(s.w.topics, function (t) { return "<li>" + esc(t) + "</li>"; }) + "</ul>";
      if (s.w.assignment) html += '<p class="cal__hw">📝 ' + esc(s.w.assignment.title) + "</p>";
      html += '<button class="btn btn--ghost btn--sm" data-open-week="' + s.n + '">커리큘럼에서 자세히 보기</button>';
    } else if (holidayMap[k]) {
      html = '<div class="cal__when">' + esc(fmtDate(date)) + '</div><p class="cal__empty">🌙 ' + esc(holidayMap[k]) + "</p>";
    } else {
      html = '<div class="cal__when">' + esc(fmtDate(date)) + '</div><p class="cal__empty">수업이 없는 날입니다.</p>';
    }
    if (due) {
      html += '<p class="cal__due">⏳ <strong>' + esc(due.w.assignment.title) + "</strong> 마감일 (" +
        esc(fmtDateTime(due.due).split(" ").pop()) + ")</p>";
    }
    $("calDetail").innerHTML = html;
  }

  $("calendar").addEventListener("click", function (ev) {
    var nav2 = ev.target.closest("[data-cal]");
    if (nav2) {
      view.setMonth(view.getMonth() + (nav2.getAttribute("data-cal") === "next" ? 1 : -1));
      renderCalendar();
      return;
    }
    var day = ev.target.closest(".cal__day");
    if (day) {
      selectedKey = day.getAttribute("data-date");
      $("calDays").querySelectorAll(".is-selected").forEach(function (e) { e.classList.remove("is-selected"); });
      day.classList.add("is-selected");
      renderDetail();
    }
  });
  renderCalendar();

  /* ---------- 장점 슬라이드 (스와이프 + 버튼 + 점 + 자동 넘김) ---------- */
  (function () {
    var root = $("slider");
    var track = root.querySelector(".slider__track");
    var slides = track.children;
    var dots = root.querySelectorAll(".slider__dot");
    if (!slides.length) return;

    function step() { return slides.length > 1 ? slides[1].offsetLeft - slides[0].offsetLeft : track.clientWidth; }
    function index() { return Math.round(track.scrollLeft / step()); }
    function maxIndex() { return Math.max(0, Math.round((track.scrollWidth - track.clientWidth) / step())); }
    function goTo(i) {
      var max = maxIndex();
      if (i > max) i = 0;
      if (i < 0) i = max;
      track.scrollTo({ left: i * step(), behavior: "smooth" });
    }
    function updateDots() {
      var i = Math.min(index(), maxIndex()), max = maxIndex();
      dots.forEach(function (d, j) {
        d.classList.toggle("is-active", j === i);
        d.hidden = j > max; // 한 화면에 여러 장 보일 때 남는 점 숨김
      });
    }
    root.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-slide]");
      if (b) goTo(index() + (b.getAttribute("data-slide") === "next" ? 1 : -1));
      var d = ev.target.closest(".slider__dot");
      if (d) goTo(+d.getAttribute("data-index"));
    });
    track.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowRight") { ev.preventDefault(); goTo(index() + 1); }
      if (ev.key === "ArrowLeft") { ev.preventDefault(); goTo(index() - 1); }
    });
    var raf;
    track.addEventListener("scroll", function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(updateDots); }, { passive: true });
    window.addEventListener("resize", updateDots);
    updateDots();

    // 자동 넘김: 마우스를 올리거나 터치/포커스 중이면 멈춤
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      var paused = false;
      ["mouseenter", "touchstart", "focusin"].forEach(function (e) { root.addEventListener(e, function () { paused = true; }, { passive: true }); });
      ["mouseleave", "focusout"].forEach(function (e) { root.addEventListener(e, function () { paused = false; }); });
      setInterval(function () { if (!paused && !document.hidden) goTo(index() + 1); }, 5000);
    }
  })();

  /* ---------- 스크롤 등장 + 숫자 카운트업 ---------- */
  function countUp(el) {
    var to = +el.getAttribute("data-to"), start = null, dur = 1400;
    function tick(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  function reveal(el) {
    el.classList.add("is-visible");
    el.querySelectorAll(".count").forEach(countUp);
  }
  var io = "IntersectionObserver" in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { reveal(en.target); io.unobserve(en.target); } });
      }, { threshold: 0.1 })
    : null;
  // 나중에 그려지는 요소도 등장 애니메이션을 받도록 root 안의 .reveal 을 등록
  function observe(root) {
    (root || document).querySelectorAll(".reveal:not(.is-visible)").forEach(function (el) {
      if (io) io.observe(el); else reveal(el);
    });
  }
  observe();

  /* ---------- 흩날리는 벚꽃잎 ---------- */
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var box = document.querySelector(".petals");
    var count = window.innerWidth < 600 ? 10 : 18;
    for (var i = 0; i < count; i++) {
      var pe = document.createElement("span");
      pe.className = "petal";
      var size = 8 + Math.random() * 10;
      pe.style.left = Math.random() * 100 + "%";
      pe.style.width = size + "px";
      pe.style.height = size * 0.85 + "px";
      pe.style.animationDuration = 10 + Math.random() * 12 + "s";
      pe.style.animationDelay = -Math.random() * 20 + "s";
      pe.style.opacity = 0.35 + Math.random() * 0.45;
      box.appendChild(pe);
    }
  }

  // 참여 기능(interact.js)에서 함께 쓰는 도구들
  window.SITE = {
    config: C, esc: esc, each: each, head: head, key: key, today: today, parseDate: parseDate,
    sessions: sessions, sessionByKey: sessionByKey,
    fmtDate: fmtDate, fmtDateTime: fmtDateTime,
    toast: toast, observe: observe, openWeek: openWeek, updateCountdowns: updateCountdowns,
  };

  // 주소에 #섹션 이 있으면 렌더링 후 그 위치로 이동
  if (location.hash) {
    var t = $(location.hash.slice(1));
    if (t) setTimeout(function () { t.scrollIntoView(); }, 50);
  }
})();
