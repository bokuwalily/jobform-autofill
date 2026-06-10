// matcher.js — フィールド文脈の文字列を見て、どのプロフィール項目かを推定する。
// buildContext は DOM 依存（table / div / dl どのレイアウトでもラベルを拾えるよう汎用化）。
// classifyField は純粋（Nodeでテスト可能）。

// 例示注記（「例（姓：マツシタ　名：タロウ）」等）を除去する。
// これらは入力欄のラベルではなく記入例なので、姓/名・市区郡/地名などの判定を汚染する。
// 半角/全角括弧・空白揺れに対応。正規化（小文字化）前の raw 文字列に適用する。
function stripExample(s) {
  return String(s)
    .replace(/例\s*[（(][^）)]*[）)]/g, " ")         // 例（…）
    .replace(/[（(]\s*例\s*[：:][^）)]*[）)]/g, " ")  // （例：…）
    .replace(/[（(]\s*e\.?\s*g\.?[\s.:][^）)]*[）)]/gi, " "); // (e.g. …)
}

function buildContext(el) {
  const parts = [];
  const seen = new Set();
  const push = (v) => {
    if (v == null) return;
    const t = stripExample(String(v).replace(/\s+/g, " ").trim()).replace(/\s+/g, " ").trim();
    if (t && t.length < 80 && !seen.has(t)) { seen.add(t); parts.push(t); }
  };

  ["name", "id", "placeholder", "aria-label", "autocomplete", "title", "data-label"].forEach((a) => push(el.getAttribute(a)));
  const lb = el.getAttribute("aria-labelledby");
  if (lb) lb.split(/\s+/).forEach((id) => { const e = document.getElementById(id); if (e) push(e.textContent); });
  if (el.id) document.querySelectorAll(`label[for="${CSS.escape(el.id)}"]`).forEach((l) => push(l.textContent));
  const wrap = el.closest("label"); if (wrap) push(wrap.textContent);
  const fs = el.closest("fieldset"); if (fs) { const lg = fs.querySelector("legend"); if (lg) push(lg.textContent); }

  // 祖先を遡り、各階層で「直前にあるラベル/見出し（フォーム部品を含まない要素）」を拾う。
  // これで table(th)・div(ラベルdiv→入力div)・dl(dt→dd) を横断的にカバーする。
  let node = el;
  for (let depth = 0; depth < 5 && node && node.tagName !== "BODY"; depth++) {
    if (node.tagName === "TD" || node.tagName === "TH") {
      const row = node.closest("tr");
      if (row) { const h = row.querySelector("th") || row.querySelector("td"); if (h && h !== node) push(h.textContent); }
    }
    if (node.tagName === "DD" && node.previousElementSibling && node.previousElementSibling.tagName === "DT") {
      push(node.previousElementSibling.textContent);
    }
    let sib = node.previousElementSibling, hops = 0;
    while (sib && hops < 3) {
      const isControl = sib.matches && sib.matches("input, select, textarea, button");
      const hasControl = sib.querySelectorAll && sib.querySelectorAll("input, select, textarea").length > 0;
      if (!isControl && !hasControl) {
        const t = sib.textContent && sib.textContent.trim();
        if (t) { push(t); break; }
      }
      sib = sib.previousElementSibling; hops++;
    }
    node = node.parentElement;
  }

  if (el.previousSibling && el.previousSibling.nodeType === 3) push(el.previousSibling.textContent);
  if (el.nextSibling && el.nextSibling.nodeType === 3) push(el.nextSibling.textContent);
  if (el.nextElementSibling && el.nextElementSibling.textContent && el.nextElementSibling.textContent.length < 8) push(el.nextElementSibling.textContent);

  return normalizeContext(parts.join(" | "));
}

function classifyField(ctx) {
  const has = (re) => re.test(ctx);

  // スキップすべき欄（誤入力防止。最優先）
  // 注: 「海外在住」は欄ラベルではなく記入注記なので最優先で捨てると国内欄まで巻き添えになる。
  // → 通常分類を全部試したあとの fallback（末尾）で判定する。
  if (has(/頭文字|イニシャル|一文字|1文字/)) return null;
  if (has(/その他.*詳細|詳細を入力|系統その他|区分その他/)) return null;

  // メール（メールアドレス2＝別アドレスは email2。本体＋確認用は email）
  if (has(/メール|e-?mail|mail/)) {
    // 「同じメールアドレスを2度ご記入」等の回数表現は誤検出のもと → 除去してから判定。
    // また英語 name の "email2"（本体の確認用に流用される）も序数の根拠にしない。
    const e2 = ctx.replace(/[2２][\s　]*(度|回|目|通)/g, " ");
    // email2 とみなすのは「メールアドレス2」等の和文序数か、サブ/予備/セカンド/別アドレスのみ。
    if (/(メールアドレス|メール)[\s　]*[2２]|サブ|予備|セカンド|secondary|別.{0,4}(アドレス|メール)/.test(e2)) return "email2";
    return "email";
  }
  if (has(/郵便|〒|zip|postal/)) return "postalCode";

  // 電話（自宅/固定 と 携帯 を区別）
  if (has(/携帯|けいたい|mobile|cell/)) return "phoneMobile";
  if (has(/自宅|固定電話|home.?phone|住宅電話/)) return "phoneHome";
  if (has(/電話|tel(?!l)|phone|連絡先番号/)) return "phone";

  // 高校（大学・卒業ルールより先に）
  if (has(/高校|高等学校|出身高/)) {
    if (has(/卒業|修了/)) return "highSchoolGradYear";
    if (has(/入学/)) return "highSchoolAdmYear";
    return "highSchool";
  }

  // 進路・区分
  if (has(/就職.*希望|入社.*希望|入社時期|就業開始/)) return "jobStartYM";
  if (has(/入学年|入学年月|入学年度|入学時期/)) return "admissiondate";
  if (has(/卒業.*(見込|区分)|修了.*(見込|区分)|見込み区分/)) return "gradStatus";
  if (has(/卒業|修了|graduat/)) return "graddate";
  if (has(/生年月日|誕生日|date.?of.?birth|birth|生まれ/)) return "birthdate";

  // 学校属性
  if (has(/学校区分|学歴区分|学校種別|在学区分|学生区分/)) return "schoolType";
  if (has(/設置区分|国公立区分/)) return "schoolFounder";
  if (has(/学年|在学年次/)) return "grade";
  if (has(/文理|文系理系/)) return "bunri";
  if (has(/系統|専攻系統|学問系統/)) return "academicField";

  // 学歴
  if (has(/学部|faculty/)) return "faculty";
  if (has(/学科|専攻|department|major/)) return "department";
  if (has(/大学名|学校名|出身校|出身大学|university|学校/)) return "university";

  // 住所
  if (has(/都道府県|prefecture|todofuken/)) return "prefecture";
  if (has(/市区町村|市区郡|市町村|区市町村|市郡|\bcity\b/)) return "city";
  if (has(/建物|マンション|アパート|ビル|部屋|building|号室/)) return "building";
  if (has(/丁目|番地|町域|町名|street|address.?line|それ以降|以降の住所/)) return "addressLine";
  if (has(/住所|所在地|現住所|address/)) return "addressFull";

  // 性別
  if (has(/性別|gender|\bsex\b/)) return "gender";

  // 氏名（行ラベルの「氏名」で姓/名判定が潰れないよう複合語を除去）
  const stripped = ctx.replace(/氏名|お名前|名前|フリガナ|ふりがな|カナ氏名|fullname|name|kana/g, " ");
  const COMPOUND = /(地名|署名|記名|件名|品名|名称|名義|会社名|学校名|大学名|店名|国名|科目|名簿|名刺|地域名|路線名|店舗名|コース名|講座名|資格名)/;
  const isKana = has(/フリガナ|ふりがな|カナ|ｶﾅ|kana|furigana|hurigana|カタカナ|セイ|メイ/);
  const isLast = /姓|せい|セイ|苗字|名字|last|family/.test(stripped);
  const isFirst = /めい|メイ|first|given/.test(stripped) || (/名/.test(stripped) && !COMPOUND.test(ctx));
  const hasFull = has(/氏名|お名前|名前|fullname|\bname\b/);
  if (isKana) {
    if (isLast) return "lastNameKana";
    if (isFirst) return "firstNameKana";
    return "fullNameKana";
  }
  if (isLast) return "lastName";
  if (isFirst) return "firstName";
  if (hasFull) return "fullName";

  // fallback: どの正規カテゴリにも当たらず「海外」だけが手掛かりの欄＝海外専用入力。スキップ。
  if (has(/海外在住|日本国外|国外の場合|overseas/)) return null;

  return null;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { classifyField };
}
