// popup.js — プロフィール編集 UI の生成・保存・読込

const GROUPS = [
  { title: "氏名", fields: [
    ["lastName", "姓（漢字）"], ["firstName", "名（漢字）"],
    ["lastNameKana", "姓（カナ・全角）"], ["firstNameKana", "名（カナ・全角）"]
  ], rows: [["lastName", "firstName"], ["lastNameKana", "firstNameKana"]] },
  { title: "生年月日・性別", fields: [
    ["birthYear", "生年（西暦4桁）"], ["birthMonth", "月"], ["birthDay", "日"], ["gender", "性別"]
  ], rows: [["birthYear", "birthMonth", "birthDay"]], selects: { gender: ["", "男性", "女性", "その他"] } },
  { title: "住所", fields: [
    ["postalCode", "郵便番号（ハイフンなし）"], ["prefecture", "都道府県"], ["city", "市区町村"],
    ["addressLine", "町名・番地"], ["building", "建物名・部屋番号"]
  ] },
  { title: "連絡先", fields: [["phone", "電話番号（ハイフンなし）"], ["email", "メールアドレス"]] },
  { title: "学歴", fields: [
    ["university", "大学名"], ["faculty", "学部"], ["department", "学科"],
    ["gradYear", "卒業予定年（西暦）"], ["gradMonth", "卒業予定月"]
  ], rows: [["faculty", "department"], ["gradYear", "gradMonth"]] },
  { title: "学校属性・進路（プルダウン用）", fields: [
    ["schoolType", "学校区分"], ["schoolFounder", "設置区分"], ["grade", "現在の学年"],
    ["bunri", "文理区分"], ["academicField", "系統（例: 経済）"],
    ["gradStatus", "卒業見込み区分"], ["jobStartYM", "就職希望年月（例: 2028年4月）"]
  ], rows: [["schoolType", "schoolFounder"], ["grade", "bunri"], ["gradStatus", "jobStartYM"]],
    selects: {
      schoolType: ["", "大学", "大学院"],
      schoolFounder: ["", "国立", "公立", "私立"],
      grade: ["", "大学1年", "大学2年", "大学3年", "大学4年", "修士1年", "修士2年", "博士課程"],
      bunri: ["", "文系", "理系", "文理融合"],
      gradStatus: ["", "卒業見込み", "卒業"]
    } },
  { title: "入学・高校（企業により必要）", fields: [
    ["admissionYear", "大学入学年（西暦）"], ["admissionMonth", "大学入学月"],
    ["highSchool", "出身高校名"], ["highSchoolAdmYear", "高校入学年（西暦）"], ["highSchoolGradYear", "高校卒業年（西暦）"],
    ["email2", "サブメールアドレス（任意）"]
  ], rows: [["admissionYear", "admissionMonth"], ["highSchoolAdmYear", "highSchoolGradYear"]] }
];

function inputFor(key, label, selects) {
  if (selects && selects[key]) {
    const opts = selects[key].map((o) => `<option value="${o}">${o || "選択"}</option>`).join("");
    return `<label>${label}</label><select id="f_${key}" data-key="${key}">${opts}</select>`;
  }
  return `<label>${label}</label><input id="f_${key}" data-key="${key}" type="text" autocomplete="off" />`;
}

function render() {
  const root = document.getElementById("form");
  root.innerHTML = GROUPS.map((g) => {
    const labelOf = Object.fromEntries(g.fields);
    const used = new Set();
    let html = `<section class="group"><h2>${g.title}</h2>`;
    (g.rows || []).forEach((row) => {
      html += `<div class="field row">` +
        row.map((k) => { used.add(k); return `<div class="cell">${inputFor(k, labelOf[k], g.selects)}</div>`; }).join("") +
        `</div>`;
    });
    g.fields.forEach(([k, lbl]) => {
      if (used.has(k)) return;
      html += `<div class="field">${inputFor(k, lbl, g.selects)}</div>`;
    });
    return html + `</section>`;
  }).join("");
}

function load() {
  chrome.storage.local.get("profile", (d) => {
    const p = d.profile || {};
    document.querySelectorAll("[data-key]").forEach((el) => { el.value = p[el.dataset.key] || ""; });
    attachAutoSave();   // 値を流し込んだ後に監視を付ける（プログラム代入では発火しない）
  });
}

function save(msg) {
  const p = {};
  document.querySelectorAll("[data-key]").forEach((el) => {
    const v = el.value.trim();
    if (v) p[el.dataset.key] = v;
  });
  chrome.storage.local.set({ profile: p }, () => {
    const s = document.getElementById("status");
    if (!s) return;
    s.textContent = msg || "自動保存しました ✓";
    clearTimeout(save._t);
    save._t = setTimeout(() => (s.textContent = ""), 2000);
  });
}

// 保存し忘れ撲滅：入力のたびにデバウンス保存する。
let autoSaveTimer;
function attachAutoSave() {
  document.querySelectorAll("[data-key]").forEach((el) => {
    const ev = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(ev, () => { clearTimeout(autoSaveTimer); autoSaveTimer = setTimeout(() => save(), 300); });
  });
}

render();
load();
const saveBtn = document.getElementById("save");
if (saveBtn) saveBtn.addEventListener("click", () => save("保存しました ✓"));
