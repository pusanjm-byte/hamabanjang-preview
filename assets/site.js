/* 하마반장 사이트 공통 동작. 자료는 data/cases.js 의 window.CASES 에서만 읽습니다. */
(function () {
  "use strict";
  var CASES = (window.CASES || []).filter(function (c) { return c && c.id; });
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }
  // [ ]로 시작하는 값은 '받지 못한 자료' 표시
  function val(s) {
    s = String(s == null ? "" : s);
    if (s.charAt(0) === "[") return '<span class="tbd">' + esc(s.replace(/^\[|\]$/g, "").trim() || "[ ]") + "</span>";
    return esc(s);
  }
  function icon(id) { return '<svg aria-hidden="true" viewBox="0 0 24 24"><use href="#i-' + id + '"/></svg>'; }
  function ph(name, desc) {
    return '<div class="ph" role="img" aria-label="사진 자리: ' + esc(name) + '">' + icon("photo") + "<b>" + esc(name) + "</b><span>" + esc(desc || "") + "</span></div>";
  }
  function photo(p, cls) {
    if (p && p.파일) return '<img class="' + (cls || "") + '" src="' + esc(p.파일) + '" alt="' + esc(p.이름) + '" loading="lazy">';
    return ph(p ? p.이름 : "관리 건물 사진", p ? p.설명 : "관리 건물 사진 — 건물주 동의 후 넣습니다");
  }
  // 공개 동의 전에는 건물 이름·주소를 절대 쓰지 않음
  function title(c) { return c.공개동의 && c.건물이름 ? c.건물이름 : c.제목; }
  function place(c) { return [c.구, c.동].filter(Boolean).join(" "); }

  /* ---------- 사례 카드 ---------- */
  function card(c) {
    var first = (c.사진목록 || [])[0];
    return '<a class="case-card" href="case.html?id=' + encodeURIComponent(c.id) + '">' +
      (first && first.파일 ? photo(first) : ph("관리 건물 사진", "건물주 동의 후 넣습니다")) +
      '<div class="body"><div class="meta"><span class="tag tag-green">' + esc(c.건물유형) + "</span><span>부산 " + esc(place(c)) + "</span></div>" +
      "<h3>" + esc(title(c)) + "</h3>" +
      '<div class="tags">' + (c.해결한일 || []).map(function (t) { return '<span class="tag tag-line">' + esc(t) + "</span>"; }).join("") + "</div>" +
      '<span class="go">사례 자세히 보기 →</span></div></a>';
  }
  function emptyMsg(text) { return '<p class="empty">' + esc(text) + ' <a class="more" href="contact.html">관리 상담 문의</a></p>'; }

  /* ---------- 홈: 최근 사례 ---------- */
  var recent = document.getElementById("recent-cases");
  if (recent) {
    recent.innerHTML = CASES.length ? CASES.slice(0, 3).map(card).join("") : emptyMsg("공개한 관리 사례가 아직 없습니다.");
  }

  /* ---------- 관리 방식: 이 유형의 사례 ---------- */
  var typed = document.getElementById("type-cases");
  if (typed) {
    var t = typed.getAttribute("data-type");
    var list = CASES.filter(function (c) { return c.건물유형 === t; });
    typed.innerHTML = list.length ? list.map(card).join("") : emptyMsg("이 유형에서 공개한 관리 사례는 아직 없습니다.");
  }

  /* ---------- 사례 목록 + 거르기 ---------- */
  var listEl = document.getElementById("case-list");
  var filterEl = document.getElementById("filters");
  if (listEl && filterEl) {
    var groups = [
      { key: "건물유형", label: "건물 유형", get: function (c) { return [c.건물유형]; } },
      { key: "구", label: "지역(구)", get: function (c) { return [c.구]; } },
      { key: "해결한일", label: "해결한 일", get: function (c) { return c.해결한일 || []; } }
    ];
    var state = {};
    filterEl.innerHTML = groups.map(function (g) {
      var vals = [];
      CASES.forEach(function (c) { g.get(c).forEach(function (v) { if (v && vals.indexOf(v) < 0) vals.push(v); }); });
      state[g.key] = "";
      return '<fieldset><legend>' + esc(g.label) + '</legend><div class="fbtns">' +
        '<button type="button" class="fbtn" data-g="' + g.key + '" data-v="" aria-pressed="true">전체</button>' +
        vals.map(function (v) { return '<button type="button" class="fbtn" data-g="' + g.key + '" data-v="' + esc(v) + '" aria-pressed="false">' + esc(v) + "</button>"; }).join("") +
        "</div></fieldset>";
    }).join("");
    var countEl = document.getElementById("case-count");
    function draw() {
      var shown = CASES.filter(function (c) {
        return groups.every(function (g) { return !state[g.key] || g.get(c).indexOf(state[g.key]) >= 0; });
      });
      listEl.innerHTML = shown.length ? shown.map(card).join("") : '<p class="empty">고른 조건에 맞는 사례가 없습니다. 위에서 ‘전체’를 눌러 보세요.</p>';
      if (countEl) countEl.textContent = "관리 사례 " + shown.length + "건";
      listEl.setAttribute("data-count", shown.length);
    }
    filterEl.addEventListener("click", function (e) {
      var b = e.target.closest(".fbtn"); if (!b) return;
      var g = b.getAttribute("data-g");
      state[g] = b.getAttribute("data-v");
      filterEl.querySelectorAll('.fbtn[data-g="' + g + '"]').forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      if (reduce) { draw(); return; }
      listEl.classList.add("fading");
      setTimeout(function () { draw(); listEl.classList.add("fading"); requestAnimationFrame(function () { requestAnimationFrame(function () { listEl.classList.remove("fading"); }); }); }, 200);
    });
    draw();
  }

  /* ---------- 사례 상세 ---------- */
  var root = document.getElementById("case-root");
  if (root) {
    var id = new URLSearchParams(location.search).get("id") || (CASES[0] && CASES[0].id);
    var c = CASES.filter(function (x) { return x.id === id; })[0];
    if (!c) {
      root.innerHTML = '<div class="page-head"><h1>사례를 찾을 수 없습니다</h1><p>주소가 바뀌었거나 아직 공개하지 않은 사례입니다.</p></div><p style="margin-top:16px"><a class="more" href="cases.html">관리 사례 목록으로</a></p>';
    } else {
      document.title = title(c) + " | 관리 사례 | 하마반장";
      root.innerHTML = renderCase(c);
    }
  }

  function isTbd(v) { return v == null || String(v).trim() === "" || String(v).trim().charAt(0) === "["; }
  function pending(text) { return '<p class="pending">' + esc(text || "자료 정리 중입니다") + "</p>"; }
  function renderCase(c) {
    var photos = c.사진목록 || [];
    var spec = [["위치", "부산 " + place(c)]];
    if (c.공개동의 && c.주소) spec.push(["주소", c.주소]); else spec.push(["주소", "[건물주 동의 후 공개]"]);
    spec.push(["세대수", c.세대수 + "세대"]);
    (c.개요 || []).forEach(function (r) { spec.push(r); });
    var iconOf = { "에어컨": "air", "냉장고": "fridge", "세탁기": "washer", "인덕션·가스레인지": "cook", "침대·책상·옷장": "bed", "전자레인지·TV 등": "tv" };
    var rent = c.임대현황표 || {}, rows = rent.행 || [], n = c.세대수 || 0;
    var L = ["구조·면적", "보증금", "월세", "관리비", "계약 만기", "상태"], K = ["구조", "보증금", "월세", "관리비", "만기", "상태"];
    var body = "";
    var useRows = rows.length ? rows : Array.apply(null, Array(n)).map(function () { return { 호실: "[호실]" }; });
    useRows.forEach(function (r) {
      body += '<tr><td class="first" data-label="">' + val(r.호실 || "[호실]") + "</td>" + K.map(function (k, i) { return '<td data-label="' + L[i] + '">' + val(r[k] || "[ ]") + "</td>"; }).join("") + "</tr>";
    });
    var exampleCards = rows.length ? "" : [0, 1, 2].map(function () {
      return '<div class="card room"><span class="no">[호실]</span><span class="tag tag-ex">예시 화면</span><div class="kv"><span>구조 <b>[ ]</b></span><span>보증금 <b>[ ]</b></span><span>월세 <b>[ ]</b></span><span>상태 <b>[ ]</b></span></div></div>';
    }).join("");
    var optsEmpty = !(c.옵션 || []).some(function (o) { return !isTbd(o[1]); });
    var feesEmpty = isTbd(rent.관리비포함) && isTbd(rent.개별부담);
    var billsEmpty = !(c.공과금 || []).some(function (r) { return !isTbd(r[1]); });
    var loc = c.입지 || {};
    var flow = c.업체흐름 || [];
    var news = loc.소식;

    return '' +
      '<section class="hero" aria-labelledby="case-title">' + photo(photos[0], "") +
      '<div><p class="eyebrow">관리 사례 · 부산 ' + esc(place(c)) + "</p>" +
      '<h1 id="case-title" class="appear" style="font-size:clamp(27px,4vw,36px)">' + esc(title(c)) + ',<br>하마반장이 이렇게 관리합니다</h1>' +
      '<ul class="chips" style="margin-top:16px" aria-label="건물 요약">' + (c.요약칩 || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" +
      '<p style="margin-top:16px">' + esc(c.요약) + "</p>" +
      '<div class="tags" style="margin-top:14px"><span class="tag tag-green">' + esc(c.건물유형) + '</span>' + (c.해결한일 || []).map(function (x) { return '<span class="tag tag-line">' + esc(x) + "</span>"; }).join("") + "</div></div></section>" +

      '<div class="duo">' +
      '<section class="section" aria-labelledby="h-ov"><div class="sec-head"><h2 id="h-ov">건물 한눈에</h2></div>' +
      '<div class="card"><dl class="spec">' + spec.map(function (r) { return "<div><dt>" + esc(r[0]) + "</dt><dd>" + val(r[1]) + "</dd></div>"; }).join("") + "</dl></div>" +
      '<p class="sub-title">세대 옵션</p>' + (optsEmpty ? pending() : '<ul class="opts">' +
      (c.옵션 || []).map(function (o) { return '<li class="opt">' + icon(iconOf[o[0]] || "check") + "<b>" + esc(o[0]) + "</b><span>" + val(o[1]) + "</span></li>"; }).join("") + "</ul>") +
      (photos[1] ? '<div style="margin-top:12px">' + photo(photos[1]) + "</div>" : "") + "</section>" +

      '<section class="section" aria-labelledby="h-rent"><div class="sec-head"><h2 id="h-rent">임대 현황</h2><p>건물주가 공개에 동의한 범위만 보여 드립니다.</p></div>' +
      (rows.length ? '<details class="all" open><summary>' + esc(n) + '세대 전체 보기</summary><table class="rent-table"><caption>임대 현황표</caption>' +
        '<thead><tr><th scope="col">호실</th>' + L.map(function (l) { return '<th scope="col">' + l + "</th>"; }).join("") + "</tr></thead><tbody>" + body + "</tbody></table></details>" : pending()) +
      (feesEmpty ? "" : '<div class="card fees"><span><b>관리비에 포함되는 것</b> ' + val(rent.관리비포함 || "[ ]") + '</span><span><b>개별 부담</b> ' + val(rent.개별부담 || "[ ]") + "</span></div>") + "</section></div>" +

      '<section class="section" aria-labelledby="h-loc"><div class="sec-head"><h2 id="h-loc">입지</h2></div><div class="duo">' +
      (loc.약도 ? '<figure class="map"><img src="' + esc(loc.약도) + '" alt="관리 건물 주변 대략 약도. 정확한 위치는 표시하지 않았습니다." width="600" height="520"><figcaption>' + esc(loc.약도설명 || "") + "</figcaption></figure>" : "") +
      '<div class="stack"><div class="card"><h3>지하철까지 직선거리</h3><ul class="dist">' +
      (loc.지하철 || []).map(function (s) { return "<li>" + icon("train") + "<b>" + esc(s[0]) + "</b><span>" + esc(s[1]) + "</span></li>"; }).join("") + "</ul>" +
      (loc.거리안내 ? '<p class="note" style="margin-top:8px">' + esc(loc.거리안내) + "</p>" : "") + "</div>" +
      '<div class="card"><h3>주변</h3><ul class="bullets">' + (loc.주변 || []).map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") +
      (loc.임차인층 ? "<li>주 임차인층: " + val(loc.임차인층) + "</li>" : "") + "</ul></div></div></div>" +
      (news ? '<div class="redev" role="note"><h3>' + esc(news.제목) + "</h3><p>" + esc(news.내용).replace(/(\d{4}-\d{2}-\d{2}|제\d{4}-\d+호)/g, '<span style="white-space:nowrap">$1</span>') + "</p>" + (news.확인중 ? '<p class="warn">' + esc(news.확인중) + "</p>" : "") + "</div>" : "") + "</section>" +

      '<div class="duo">' +
      '<section class="section" aria-labelledby="h-yield"><div class="sec-head"><h2 id="h-yield">임대수입은 이렇게 계산합니다</h2><p>숫자를 받으면 이 순서대로 계산해 넣습니다.</p></div><ol class="stairs">' +
      [["연 임대수입", "세대별 월세 합계 × 12 (+ 관리비 수입)"],
       ["연 운영비", "공용 전기·수도, 인터넷, 승강기·소방·전기·주차 설비 점검, 청소·분리수거, 수선비, 관리 수수료"],
       ["공실 손실", "빈 방 월세 × 빈 기간. 원룸은 회전이 빨라 이 칸이 수익률을 크게 흔듭니다."],
       ["순수익", "연 임대수입 − 연 운영비 − 공실 손실"],
       ["실투자금", "매입가 − 보증금 합계 − 대출금 (+ 취득세 등 부대비용)"],
       ["실투자 수익률", "(순수익 − 연 대출이자) ÷ 실투자금"]].map(function (s, i) {
        return "<li" + (i === 5 ? ' class="last"' : "") + '><span class="n">' + (i + 1) + "</span><b>" + s[0] + '</b><span class="f">' + s[1] + '</span><span class="v' + (i === 5 ? "" : " tbd") + '">자료 받은 뒤 계산</span></li>';
      }).join("") + "</ol>" +
      '</section>' +

      '<section class="section" aria-labelledby="h-flow"><div class="sec-head"><h2 id="h-flow">공실에서 입주까지</h2><p>빈 방이 생기면 이 순서로 진행합니다. 단계마다 맡는 곳이 다릅니다.</p></div>' +
      '<div class="card"><div class="legend"><span><i style="background:var(--green)"></i>하마반장이 맡는 단계</span><span><i style="background:#fff;border:3px solid #B9AE9C"></i>업체·중개사가 맡는 단계</span></div>' +
      '<ol class="timeline" data-reveal>' + flow.map(function (f, i) {
        return "<li" + (f.하마반장 ? ' class="ours"' : "") + '><span class="dot"></span><span class="t">' + (i + 1) + ". " + esc(f.단계) + '</span>' + (f.설명 ? '<p class="note" style="margin-top:2px">' + esc(f.설명) + '</p>' : '') + '<div class="who">' +
          (f.맡는곳 || []).map(function (w) { return '<span class="tag ' + (/^하마반장/.test(w) ? "tag-green" : "tag-line") + '">' + esc(w) + "</span>"; }).join("") + "</div></li>";
      }).join("") + '</ol><p class="contract">하마반장은 중개를 하지 않습니다. 임대 계약과 중개는 공인중개사가 합니다.</p></div></section></div>' +

      '<div class="duo">' +
      '<section class="section" aria-labelledby="h-rep"><div class="sec-head"><h2 id="h-rep">자주 생기는 민원</h2></div><div class="grid issues">' +
      (c.민원 || []).map(function (m) {
        var ic = { "도배 훼손": "wall", "타일 훼손": "tile", "변기 고장": "toilet", "샤워기 고장": "shower", "싱크대 수리": "sink" }[m[0]] || "check";
        return '<div class="card issue">' + icon(ic) + "<b>" + esc(m[0]) + "</b><span>보통 원인: " + esc(m[1]) + "</span><span>연결: " + esc(m[2]) + "</span></div>";
      }).join("") + "</div>" +
      '<div class="card" style="margin-top:12px"><h3>처리 순서</h3><ol class="steps"><li>접수</li><li>사진 확인</li><li><span>원인 구분 <small>(세입자 과실 / 노후)</small></span></li><li>업체 연결</li><li><span>완료 보고 <small>(완료 사진·비용)</small></span></li></ol></div></section>' +

      '<section class="section" aria-labelledby="h-mon"><div class="sec-head"><h2 id="h-mon">매달 하는 일</h2></div><div class="stack">' +
      '<div class="card"><h3 class="group-h">' + icon("check") + '건물 점검</h3><ul class="list-rows">' +
      (c.점검 || []).map(function (r) { return '<li><span>' + esc(r[0]) + '</span><span class="r">' + val(r[1]) + '</span><span class="s">' + esc(r[2]) + "</span></li>"; }).join("") + "</ul>" +
      (c.점검안내 ? '<p class="note" style="margin-top:8px">' + esc(c.점검안내) + "</p>" : "") + "</div>" +
      '<div class="card"><h3 class="group-h">' + icon("bill") + '공용 공과금</h3>' + (billsEmpty ? pending() : '<ul class="list-rows">' +
      (c.공과금 || []).map(function (r) { return '<li><span>' + esc(r[0]) + '</span><span class="r">' + val(r[1]) + "</span></li>"; }).join("") + "</ul>") + "</div>" +
      '<div class="card"><h3 class="group-h">' + icon("build") + '관리하는 시설물</h3><ul class="facil">' +
      (c.시설물 || []).map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul>" +
      (photos[2] ? '<div style="margin-top:12px">' + photo(photos[2]) + "</div>" : "") + "</div></div></section></div>" +
      '<p style="margin-top:28px"><a class="more" href="cases.html">다른 관리 사례 보기</a></p>';
  }

  /* ---------- 차례로 켜지는 단계 (보일 때 한 번) ---------- */
  function light(list) {
    var items = list.querySelectorAll("li");
    if (reduce) { items.forEach(function (li) { li.classList.add("on"); }); return; }
    items.forEach(function (li, i) { setTimeout(function () { li.classList.add("on"); }, i * 110); });
  }
  var revs = document.querySelectorAll("[data-reveal]");
  if (revs.length) {
    if (!("IntersectionObserver" in window)) revs.forEach(light);
    else {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { light(e.target); io.unobserve(e.target); } });
      }, { threshold: 0.25 });
      revs.forEach(function (r) { io.observe(r); });
    }
  }

  /* ---------- 공실 현황 (협력중개사무소 정보가 다 있는 방만) ---------- */
  var vList = document.getElementById("vac-list");
  if (vList) {
    var okOffice = function (o) { return o && ["상호", "대표", "등록번호", "전화"].every(function (k) { return o[k] && String(o[k]).trim() && String(o[k]).trim().charAt(0) !== "["; }); };
    var VAC = (window.VACANCIES || []).filter(function (v) { return v && v.id && okOffice(v.협력중개사무소); });
    var vFilterEl = document.getElementById("vac-filters"), vCount = document.getElementById("vac-count");
    var vGroups = [
      { key: "구", label: "지역(구)", get: function (v) { return [v.구]; } },
      { key: "구조", label: "구조", get: function (v) { return [v.구조]; } },
      { key: "한달", label: "한 달 살기", get: function (v) { return v.한달살기가능 === true ? ["한 달 살기 가능"] : []; } }
    ];
    var vState = {};
    function vCard(v) {
      var o = v.협력중개사무소, first = (v.사진목록 || [])[0];
      return '<article class="case-card vac">' + (first && first.파일 ? photo(first) : ph("방 사진", "사진 준비 중")) +
        '<div class="body"><div class="meta"><span class="tag tag-green">' + esc(v.건물유형) + "</span><span>부산 " + esc([v.구, v.동].filter(Boolean).join(" ")) + "</span>" +
        (v.한달살기가능 === true ? '<span class="tag tag-line">한 달 살기 가능(30일 이상)</span>' : "") + "</div>" +
        "<h3>" + esc([v.구조, v.면적, v.층].filter(Boolean).join(" · ")) + "</h3>" +
        '<dl class="vac-dl"><div><dt>보증금</dt><dd>' + val(v.보증금) + "</dd></div><div><dt>월세</dt><dd>" + val(v.월세) + "</dd></div><div><dt>관리비</dt><dd>" + val(v.관리비) + "</dd></div><div><dt>입주 가능일</dt><dd>" + val(v.입주가능일) + "</dd></div></dl>" +
        ((v.옵션 || []).length ? '<div class="tags">' + v.옵션.map(function (x) { return '<span class="tag tag-line">' + esc(x) + "</span>"; }).join("") + "</div>" : "") +
        '<p class="vac-office"><b>문의:</b> ' + esc(o.상호) + " · 대표 " + esc(o.대표) + " · 등록번호 " + esc(o.등록번호) + " · 전화 " + esc(o.전화) + (o.주소 ? '<br><small>' + esc(o.주소) + "</small>" : "") + "</p>" +
        (v.게시일 ? '<p class="note">게시일 ' + esc(v.게시일) + "</p>" : "") + "</div></article>";
    }
    vFilterEl.innerHTML = VAC.length ? vGroups.map(function (g) {
      var vals = []; VAC.forEach(function (v) { g.get(v).forEach(function (x) { if (x && vals.indexOf(x) < 0) vals.push(x); }); });
      vState[g.key] = "";
      return vals.length ? '<fieldset><legend>' + esc(g.label) + '</legend><div class="fbtns"><button type="button" class="fbtn" data-g="' + g.key + '" data-v="" aria-pressed="true">전체</button>' +
        vals.map(function (x) { return '<button type="button" class="fbtn" data-g="' + g.key + '" data-v="' + esc(x) + '" aria-pressed="false">' + esc(x) + "</button>"; }).join("") + "</div></fieldset>" : "";
    }).join("") : "";
    if (!VAC.length) vFilterEl.style.display = "none";
    function vDraw() {
      var shown = VAC.filter(function (v) { return vGroups.every(function (g) { return !vState[g.key] || g.get(v).indexOf(vState[g.key]) >= 0; }); });
      vList.innerHTML = shown.length ? shown.map(vCard).join("") : '<p class="empty">지금 안내할 공실이 없습니다.</p>';
      if (vCount) vCount.textContent = VAC.length ? "공실 " + shown.length + "건" : "";
    }
    vFilterEl.addEventListener("click", function (e) {
      var b = e.target.closest(".fbtn"); if (!b) return;
      var g = b.getAttribute("data-g"); vState[g] = b.getAttribute("data-v");
      vFilterEl.querySelectorAll('.fbtn[data-g="' + g + '"]').forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      vDraw();
    });
    vDraw();
  }

  /* ---------- 설정값(data/settings.js) 채우기 ---------- */
  var S = window.HAMA_SETTINGS || {};
  document.querySelectorAll("[data-hs]").forEach(function (el) {
    var k = el.getAttribute("data-hs");
    var v = S[k] != null && S[k] !== "" ? String(S[k]) : "";
    if (v && el.getAttribute("data-hs-pick") === "percent") { var m = v.match(/\d+(\.\d+)?\s*%/); v = m ? m[0] : v; }
    el.textContent = v || "[ ]";
    if (el.hasAttribute("data-hs-sms")) {
      var digits = v.replace(/[^0-9+]/g, "");
      if (v && v.charAt(0) !== "[" && digits.length >= 8) { el.setAttribute("href", "sms:" + digits); el.classList.remove("tbd"); }
      else { el.removeAttribute("href"); el.classList.add("tbd"); }
    }
  });

  /* ---------- 문의 버튼: 전송하지 않음 ---------- */
  var send = document.getElementById("send");
  if (send) send.addEventListener("click", function () {
    var st = document.getElementById("form-status");
    st.textContent = "문의 접수 기능은 준비 중입니다. 입력한 내용은 보내지지 않았습니다.";
    st.focus();
  });
})();
