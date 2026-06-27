// filler.js — DOM への入力プリミティブ。React/Vue を考慮し native セッター + input/change を発火する。

function setNativeValue(el, value) {
  const proto =
    el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype :
    el.tagName === "SELECT" ? HTMLSelectElement.prototype :
    HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, "value");
  if (desc && desc.set) desc.set.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function fillText(el, value) {
  if (value == null || value === "") return false;
  setNativeValue(el, String(value));
  el.dispatchEvent(new Event("blur", { bubbles: true }));
  return true;
}

// candidates の文字列いずれかに一致する option を選ぶ
function selectOption(el, candidates) {
  const cands = candidates.filter(Boolean).map((c) => normalizeContext(String(c)));
  if (!cands.length) return false;
  const opts = Array.from(el.options);
  // 1) 完全一致（text / value）
  for (const o of opts) {
    const t = normalizeContext(o.textContent);
    const v = normalizeContext(o.value);
    if (cands.some((c) => c === t || c === v)) { commitSelect(el, o); return true; }
  }
  // 2) 部分一致（option が候補を含む / 候補が option を含む。空 option は除外）
  for (const o of opts) {
    const t = normalizeContext(o.textContent);
    if (!t) continue;
    if (cands.some((c) => c && (t.includes(c) || c.includes(t)))) { commitSelect(el, o); return true; }
  }
  return false;
}

function commitSelect(el, option) {
  el.value = option.value;
  if (el.selectedIndex !== option.index) el.selectedIndex = option.index;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

// 数値（年/月/日）を option から選ぶ。'5' '05' '5月' などの揺れを吸収
function selectNumber(el, num) {
  const n = parseInt(num, 10);
  if (isNaN(n)) return false;
  return selectOption(el, [String(n), String(n).padStart(2, "0"), `${n}月`, `${n}日`, `${n}年`, `平成${n}`]);
}

// option の数値レンジから「年/月/日」のどれを表す select か推定
function detectDateRole(el) {
  const nums = Array.from(el.options)
    .map((o) => parseInt((o.value || o.textContent).replace(/[^0-9]/g, ""), 10))
    .filter((x) => !isNaN(x));
  if (!nums.length) return null;
  const max = Math.max(...nums);
  if (max >= 1900) return "year";
  if (max <= 12) return "month";
  if (max <= 31) return "day";
  return null;
}

// 数字を複数ボックスに分割して入れる（電話 090-1234-5678 / 郵便 140-0014）。
// 電話は桁数から定番パターンで分割（boxのmaxlengthが過大なケースを誤らない）。
function fillSplitNumber(els, value, kind) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return 0;
  let pattern;
  if (kind === "postal") {
    pattern = digits.length === 7 ? [3, 4] : null;
  } else if (kind === "phone") {
    if (els.length === 3) {
      if (digits.length === 11) pattern = [3, 4, 4];                 // 携帯 090-XXXX-XXXX
      else if (digits.length === 10) pattern = digits.startsWith("0") ? [2, 4, 4] : [3, 3, 4]; // 固定 03-XXXX-XXXX 等
    } else if (els.length === 2) {
      pattern = [3, digits.length - 3];
    }
  }
  // パターン未確定なら箱数で等分 or maxlength
  if (!pattern) {
    const lens = els.map((e) => { const m = parseInt(e.getAttribute("maxlength"), 10); return m > 0 && m < 20 ? m : null; });
    pattern = lens.every((l) => l) ? lens : null;
  }
  const parts = pattern ? sliceByLens(digits, pattern) : [digits];
  let n = 0;
  els.forEach((el, i) => { if (parts[i] != null) { setNativeValue(el, parts[i]); el.dispatchEvent(new Event("blur", { bubbles: true })); n++; } });
  return n ? 1 : 0; // グループ単位で1カウント
}

function sliceByLens(digits, lens) {
  const out = []; let pos = 0;
  for (let i = 0; i < lens.length; i++) {
    const take = i === lens.length - 1 ? digits.length - pos : lens[i];
    out.push(digits.slice(pos, pos + take)); pos += take;
  }
  return out;
}

// ラジオ/チェックボックス群から value に一致するものを選択（完全一致優先→部分一致）
function checkChoice(groupEls, candidates) {
  const cands = candidates.filter(Boolean).map((c) => normalizeContext(String(c)));
  if (!cands.length) return false;
  const valOf = (el) => normalizeContext(el.value);
  // ラベル抽出：まず <label>/label[for]/aria-label。
  // それらが無い裸ラジオ（e2r の <input value="1">男性 形式）のときだけ直近テキストノードを採用する。
  // ※ <label>済みの欄で隣接テキストを足すとラベルが重複し、完全一致が崩れて部分一致が誤爆する。
  const labelOf = (el) => {
    const wrapped = [el.getAttribute("aria-label"),
      el.id && (document.querySelector(`label[for="${CSS.escape(el.id)}"]`) || {}).textContent,
      (el.closest("label") || {}).textContent].filter(Boolean).join(" ");
    if (wrapped.trim()) return normalizeContext(wrapped);
    const sib = [el.nextSibling, el.previousSibling]
      .filter((n) => n && n.nodeType === 3).map((n) => n.textContent).join(" ");
    return normalizeContext(sib);
  };
  const pick = (el) => {
    el.checked = true;
    ["input", "change", "click"].forEach((ev) => el.dispatchEvent(new Event(ev, { bubbles: true })));
    return true;
  };
  // 1) value 完全一致（最も信頼できる） 2) ラベル完全一致 3) ラベル部分一致
  for (const el of groupEls) { if (cands.includes(valOf(el))) return pick(el); }
  for (const el of groupEls) { if (cands.includes(labelOf(el))) return pick(el); }
  for (const el of groupEls) { const l = labelOf(el); if (cands.some((c) => c && l.includes(c))) return pick(el); }
  return false;
}
