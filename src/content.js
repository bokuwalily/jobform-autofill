// content.js — フォーム走査 → 分類 → 入力。手動トリガー（フローティングボタン）。
// 電話・郵便・日付などの「グループ」は毎回上書き（前回の誤入力=staleを残さない）。
// 氏名や住所などの単体欄は空のときだけ入れる（手入力を尊重）。

(function () {
  if (window.__jfaInjected) return;
  window.__jfaInjected = true;

  // 診断ログ。本番(ストア配布)では false。フォーム不一致を調べるときだけ true にして再ビルド。
  const DEBUG = false;

  const FILLABLE = "input, textarea, select";
  const SKIP_TYPES = new Set(["hidden", "submit", "button", "reset", "file", "image", "password"]);

  // storage不能（権限なし/拡張未リロード）と「プロフィール未保存」を区別する。
  // 握り潰すと両者が同じ"未設定"になり原因が分からなくなるため、__noStorage で識別。
  const getProfile = () => new Promise((res) => {
    if (!(typeof chrome !== "undefined" && chrome.storage && chrome.storage.local)) { res({ __noStorage: true }); return; }
    try { chrome.storage.local.get("profile", (d) => res((d && d.profile) || {})); }
    catch (e) { console.warn("[就活autofill] storage読込失敗:", e); res({ __noStorage: true }); }
  });

  function isVisible(el) {
    if (el.disabled || el.readOnly) return false;
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  const isFilled = (el) => el.tagName === "SELECT" ? el.selectedIndex > 0 : !!(el.value && el.value.trim());
  const container = (el) => el.closest("td, th, fieldset, dd, li") || el.parentElement;
  const digitsOf = (s) => String(s || "").replace(/\D/g, "");

  function genderCandidates(g) {
    if (!g) return [];
    if (/男/.test(g)) return ["男性", "男", "male", "man"];
    if (/女/.test(g)) return ["女性", "女", "female", "woman"];
    return [g, "回答しない", "その他"];
  }

  function textValue(key, p, ctx) {
    switch (key) {
      case "lastName": return p.lastName;
      case "firstName": return p.firstName;
      case "fullName": return [p.lastName, p.firstName].filter(Boolean).join("　");
      case "lastNameKana": return adaptKana(p.lastNameKana || "", ctx);
      case "firstNameKana": return adaptKana(p.firstNameKana || "", ctx);
      case "fullNameKana": return adaptKana([p.lastNameKana, p.firstNameKana].filter(Boolean).join("　"), ctx);
      case "email": return p.email;
      case "email2": return p.email2;
      case "phone": case "phoneMobile": case "phoneHome": return (p.phone || "").replace(/-/g, "");
      case "postalCode": return (p.postalCode || "").replace(/-/g, "");
      case "prefecture": return p.prefecture;
      case "city": return p.city;
      case "addressLine": return p.addressLine;
      case "addressFull": return [p.prefecture, p.city, p.addressLine, p.building].filter(Boolean).join("");
      case "building": return p.building;
      case "university": return p.university;
      case "faculty": return p.faculty;
      case "department": return p.department;
      case "gender": return p.gender;
      case "schoolType": return p.schoolType;
      case "schoolFounder": return p.schoolFounder;
      case "grade": return p.grade;
      case "bunri": return p.bunri;
      case "academicField": return p.academicField;
      case "gradStatus": return p.gradStatus;
      case "jobStartYM": return p.jobStartYM;
      case "highSchool": return p.highSchool;
      case "highSchoolGradYear": return p.highSchoolGradYear;
      case "highSchoolAdmYear": return p.highSchoolAdmYear;
      default: return null;
    }
  }

  function candidates(key, p, ctx) {
    switch (key) {
      case "gender": return genderCandidates(p.gender);
      case "schoolType": return p.schoolType === "大学院" ? ["大学院", "現大学院", "修士"] : ["大学(学部)", "現大学", "学部", "大学"];
      case "schoolFounder": return [p.schoolFounder];
      case "grade": return [p.grade, (p.grade || "").replace(/^大学/, "")];
      case "bunri": return [p.bunri];
      case "academicField": return [p.academicField];
      case "gradStatus": return /見込/.test(p.gradStatus || "") ? [p.gradStatus, "見込み"] : [p.gradStatus];
      case "jobStartYM": return [p.jobStartYM, (p.jobStartYM || "").replace("年", "/").replace("月", "")];
      default: return [textValue(key, p, ctx)];
    }
  }

  function fillDateGroup(els, y, m, d) {
    let n = 0; const texts = [];
    els.forEach((el) => {
      if (el.tagName === "SELECT") {
        const role = detectDateRole(el);
        const v = role === "year" ? y : role === "month" ? m : role === "day" ? d : null;
        if (v && selectNumber(el, v)) n++;
      } else if (el.type === "date") {
        if (y && m && d && fillText(el, `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`)) n++;
      } else { texts.push(el); }
    });
    if (texts.length) texts.forEach((el, i) => {
      // 単位(年/月/日)は入力の直後に来ることが多い → nextSibling を最優先
      const next = el.nextSibling && el.nextSibling.nodeType === 3 ? el.nextSibling.textContent : "";
      const c = buildContext(el);
      const by = (s) => /月|month/.test(s) ? m : /日|day/.test(s) ? d : /年|year/.test(s) ? y : null;
      const v = by(next) || by(c) || [y, m, d][i];
      if (v && fillText(el, v)) n++;
    });
    return n;
  }

  function groupByContainer(entries) {
    const m = new Map();
    entries.forEach((e) => { const c = container(e.el); if (!m.has(c)) m.set(c, []); m.get(c).push(e); });
    return [...m.values()];
  }

  // 電話/郵便用：行(tr)・fieldset・.field など「フィールド全体」でまとめる。
  // e2r は国内分割box(左td)と海外用単独box(右td)を別セルに置くため、tr単位で束ねないと
  // 海外boxが単独グループ化し full桁が入る。tr単位なら splitCluster が大maxlength の海外boxを除外できる。
  const fieldContainer = (el) => el.closest("tr, fieldset, .field, dd, li") || container(el);
  function groupByField(entries) {
    const m = new Map();
    entries.forEach((e) => { const c = fieldContainer(e.el); if (!m.has(c)) m.set(c, []); m.get(c).push(e); });
    return [...m.values()];
  }

  // 分割box（電話/郵便）のクラスタだけを取り出す。
  // e2r 等は同一セルに「国内用の小maxlength分割box群」＋「海外用の単独box」を併設する。
  // 一部だけが小maxlength(1-6)なら、それが分割クラスタ＝海外用の単独boxを除外する。
  const SPLIT_MAXLEN = 6;
  function splitCluster(els) {
    const small = els.filter((e) => { const m = parseInt(e.getAttribute("maxlength"), 10); return m >= 1 && m <= SPLIT_MAXLEN; });
    return small.length && small.length < els.length ? small : els;
  }

  function run(p) {
    if (p && p.__noStorage) { toast("拡張のstorageにアクセスできない。chrome://extensions で拡張を再読み込みして。", true); return; }
    if (!p || !Object.keys(p).length) { toast("プロフィール未保存。拡張アイコンを開いて内容を入れる（自動保存されます）。", true); return; }
    const all = Array.from(document.querySelectorAll(FILLABLE)).filter((el) => {
      if (el.type && SKIP_TYPES.has(el.type)) return false;
      if (["radio", "checkbox"].includes(el.type)) return true;
      return isVisible(el);
    });

    const entries = [];
    const unmatched = [];
    const unmatchedEls = [];
    for (const el of all) {
      if (["radio", "checkbox"].includes(el.type)) continue;
      const ctx = buildContext(el);
      const key = classifyField(ctx);
      if (key) entries.push({ el, key, ctx });
      else if (ctx) { unmatched.push(ctx.slice(0, 50)); unmatchedEls.push(el); }
    }
    // 診断: 分類できなかった欄を console に出す（DEBUG時のみ。スクショ不要で精密に報告できる）
    if (DEBUG && unmatched.length) console.log("[就活autofill] 未分類フィールド（要・規則追加）:", unmatched);
    // 詳細診断（バグ調査用・1ログにまとめる）。DEBUG時のみ。
    if (DEBUG) try {
      const rowHtml = (el) => {
        let n = el;                                  // ラベルを含む親まで5階層遡る（axolはtr/.field等を使わない）
        for (let i = 0; i < 5 && n.parentElement && n.parentElement.tagName !== "BODY"; i++) n = n.parentElement;
        return n.outerHTML
          .replace(/<option[\s\S]*?<\/option>/g, "")  // option(年/月の羅列)は除去して構造を見やすく
          .replace(/\s+/g, " ").slice(0, 600);
      };
      const diag = {
        profileKeys: Object.keys(p).filter((k) => p[k]),
        classified: entries.map((e) => `${e.el.id || e.el.name || "?"}=${e.key}`),
        emailCtx: entries.filter((e) => /^email/.test(e.key)).map((e) => `${e.el.id || e.el.name}[${e.key}] ${e.ctx.slice(0, 50)}`),
        unmatchedHTML: unmatchedEls.map(rowHtml),
      };
      console.log("[就活autofill] 診断", diag);
      // 1行の文字列でも出す（この行を右クリック→「文字列をコピー」で全文取得できる）
      console.log("[就活autofill] 診断JSON >>> " + JSON.stringify(diag));
    } catch (e) { /* 診断は失敗しても本処理に影響させない */ }

    let filled = 0;
    const handled = new Set();
    const mark = (els) => els.forEach((e) => handled.add(e));

    // --- 電話（自宅/携帯を区別。携帯優先で入力、自宅に入った携帯番号は消す。グループ上書き） ---
    const phoneEntries = entries.filter((e) => /^phone/.test(e.key) && e.el.tagName !== "SELECT");
    if (phoneEntries.length) {
      const groups = groupByField(phoneEntries).map((g) => ({ els: g.map((e) => e.el), home: g.some((e) => e.key === "phoneHome") }));
      const mobileGroups = groups.filter((g) => !g.home);
      const targets = mobileGroups.length ? mobileGroups : groups;
      const mobile = (p.phone || "").replace(/-/g, "");
      for (const g of targets) {
        const cluster = splitCluster(g.els);   // 海外用単独boxを除外
        if (mobile) { if (cluster.length >= 2) filled += fillSplitNumber(cluster, mobile, "phone"); else if (fillText(cluster[0], mobile)) filled++; }
        mark(g.els);
      }
      // 携帯を入れたのに自宅にも携帯番号が残っている → 消す（過去の誤入力対策）
      if (mobileGroups.length) for (const g of groups) {
        if (!g.home) continue;
        if (digitsOf(g.els.map((e) => e.value).join("")) === digitsOf(mobile)) g.els.forEach((e) => setNativeValue(e, ""));
        mark(g.els);
      }
    }

    // --- 郵便番号（グループ上書き） ---
    {
      const ent = entries.filter((e) => e.key === "postalCode" && e.el.tagName !== "SELECT");
      for (const g of groupByField(ent)) {
        const all = g.map((e) => e.el);
        const els = splitCluster(all);          // 海外用単独boxを除外
        const v = (p.postalCode || "").replace(/-/g, "");
        if (v) { if (els.length >= 2) filled += fillSplitNumber(els, v, "postal"); else if (fillText(els[0], v)) filled++; }
        mark(all);
      }
    }

    // --- 日付グループ（生年月日・卒業年月・入学年月。上書き） ---
    const DATE = { birthdate: [p.birthYear, p.birthMonth, p.birthDay], graddate: [p.gradYear, p.gradMonth, null], admissiondate: [p.admissionYear, p.admissionMonth, null] };
    for (const k in DATE) {
      const ent = entries.filter((e) => e.key === k);
      if (!ent.length) continue;
      const [y, m, d] = DATE[k];
      filled += fillDateGroup(ent.map((e) => e.el), y, m, d);
      mark(ent.map((e) => e.el));
    }

    // --- メール（主＋確認用は上書き。メール2は profile.email2 がある時だけ） ---
    for (const e of entries) {
      if (handled.has(e.el)) continue;
      if (e.key === "email") { if (p.email && fillText(e.el, p.email)) filled++; handled.add(e.el); }
      else if (e.key === "email2") { if (p.email2 && fillText(e.el, p.email2)) filled++; handled.add(e.el); }
    }

    // --- 残り（単体）。select は未選択時、text は空欄時のみ ---
    for (const { el, key, ctx } of entries) {
      if (handled.has(el)) continue;
      if (el.tagName === "SELECT") {
        if (el.selectedIndex > 0) continue;
        const cands = candidates(key, p, ctx).filter(Boolean);
        if (cands.length && selectOption(el, cands)) filled++;
      } else {
        if (isFilled(el)) continue;
        const val = textValue(key, p, ctx);
        if (val && fillText(el, val)) filled++;
      }
    }

    // --- ラジオ / チェックボックス ---
    const RADIO_KEYS = new Set(["gender", "schoolType", "schoolFounder", "gradStatus", "grade", "bunri", "academicField"]);
    const groups = {};
    all.filter((el) => ["radio", "checkbox"].includes(el.type)).forEach((el) => {
      const n = el.name || el.id || Math.random();
      (groups[n] = groups[n] || []).push(el);
    });
    for (const name in groups) {
      const g = groups[name];
      if (g.some((el) => el.checked)) continue;
      const ctx = g.map(buildContext).join(" ");
      if (g[0].type === "checkbox" && /同じ|同上/.test(ctx) && !/海外|国外/.test(ctx)) {
        g[0].checked = true;
        ["input", "change", "click"].forEach((ev) => g[0].dispatchEvent(new Event(ev, { bubbles: true })));
        filled++; continue;
      }
      const key = classifyField(ctx);
      if (RADIO_KEYS.has(key) && checkChoice(g, candidates(key, p, ctx))) filled++;
    }

    toast(`${filled} 項目を自動入力した。内容を必ず確認して。`);
  }

  function toast(msg, warn) {
    const t = document.createElement("div");
    t.className = "jfa-toast" + (warn ? " jfa-warn" : "");
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("jfa-show"));
    setTimeout(() => { t.classList.remove("jfa-show"); setTimeout(() => t.remove(), 300); }, 3600);
  }

  function mountButton() {
    if (document.querySelector(".jfa-fab")) return;
    const n = document.querySelectorAll("input:not([type=hidden]):not([type=submit]):not([type=button]), textarea, select").length;
    if (n < 3) return;
    const btn = document.createElement("button");
    btn.className = "jfa-fab"; btn.type = "button"; btn.textContent = "自動入力";
    btn.title = "保存したプロフィールでこのフォームを埋める";
    btn.addEventListener("click", async (e) => { e.preventDefault(); btn.disabled = true; run(await getProfile()); btn.disabled = false; });
    document.body.appendChild(btn);
  }

  if (document.body) mountButton();
  else window.addEventListener("DOMContentLoaded", mountButton);
})();
