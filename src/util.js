// util.js — 変換ユーティリティ・プロフィール項目定義（純粋関数中心。Node からも require 可能）

// カタカナ→ひらがな
function kataToHira(s) {
  return (s || "").replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}
// ひらがな→カタカナ
function hiraToKata(s) {
  return (s || "").replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

// 全角カタカナ→半角カタカナ
const FULL_TO_HALF_KANA = {
  "ガ":"ｶﾞ","ギ":"ｷﾞ","グ":"ｸﾞ","ゲ":"ｹﾞ","ゴ":"ｺﾞ","ザ":"ｻﾞ","ジ":"ｼﾞ","ズ":"ｽﾞ","ゼ":"ｾﾞ","ゾ":"ｿﾞ",
  "ダ":"ﾀﾞ","ヂ":"ﾁﾞ","ヅ":"ﾂﾞ","デ":"ﾃﾞ","ド":"ﾄﾞ","バ":"ﾊﾞ","ビ":"ﾋﾞ","ブ":"ﾌﾞ","ベ":"ﾍﾞ","ボ":"ﾎﾞ",
  "パ":"ﾊﾟ","ピ":"ﾋﾟ","プ":"ﾌﾟ","ペ":"ﾍﾟ","ポ":"ﾎﾟ","ヴ":"ｳﾞ",
  "ア":"ｱ","イ":"ｲ","ウ":"ｳ","エ":"ｴ","オ":"ｵ","カ":"ｶ","キ":"ｷ","ク":"ｸ","ケ":"ｹ","コ":"ｺ",
  "サ":"ｻ","シ":"ｼ","ス":"ｽ","セ":"ｾ","ソ":"ｿ","タ":"ﾀ","チ":"ﾁ","ツ":"ﾂ","テ":"ﾃ","ト":"ﾄ",
  "ナ":"ﾅ","ニ":"ﾆ","ヌ":"ﾇ","ネ":"ﾈ","ノ":"ﾉ","ハ":"ﾊ","ヒ":"ﾋ","フ":"ﾌ","ヘ":"ﾍ","ホ":"ﾎ",
  "マ":"ﾏ","ミ":"ﾐ","ム":"ﾑ","メ":"ﾒ","モ":"ﾓ","ヤ":"ﾔ","ユ":"ﾕ","ヨ":"ﾖ",
  "ラ":"ﾗ","リ":"ﾘ","ル":"ﾙ","レ":"ﾚ","ロ":"ﾛ","ワ":"ﾜ","ヲ":"ｦ","ン":"ﾝ",
  "ァ":"ｧ","ィ":"ｨ","ゥ":"ｩ","ェ":"ｪ","ォ":"ｫ","ャ":"ｬ","ュ":"ｭ","ョ":"ｮ","ッ":"ｯ","ー":"ｰ","・":"･","　":" "
};
function fullToHalfKana(s) {
  let out = "";
  for (const ch of (s || "")) out += FULL_TO_HALF_KANA[ch] || ch;
  return out;
}

// カナ表記をフィールドのヒントに合わせて変換する
//   hint: フィールド文脈（ラベル等）の小文字化済み文字列
//   value: 全角カタカナで保持しているカナ
function adaptKana(value, hint) {
  if (/半角|ﾊﾝｶｸ|hankaku|半角カナ/.test(hint)) return fullToHalfKana(value);
  if (/ひらがな|ふりがな|hiragana/.test(hint)) return kataToHira(value);
  return value; // 既定は全角カタカナ
}

// 文脈文字列の正規化（全角英数→半角・小文字化・空白圧縮）
function normalizeContext(s) {
  return (s || "")
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// プロフィール項目の定義（popup の生成にも matcher の対象にも使う）
const PROFILE_FIELDS = [
  { key: "lastName", label: "姓（漢字）", kind: "text" },
  { key: "firstName", label: "名（漢字）", kind: "text" },
  { key: "lastNameKana", label: "姓（カナ・全角）", kind: "text" },
  { key: "firstNameKana", label: "名（カナ・全角）", kind: "text" },
  { key: "birthYear", label: "生年（西暦4桁）", kind: "text" },
  { key: "birthMonth", label: "生月（1-12）", kind: "text" },
  { key: "birthDay", label: "生日（1-31）", kind: "text" },
  { key: "gender", label: "性別", kind: "text" },
  { key: "postalCode", label: "郵便番号（7桁・ハイフンなし）", kind: "text" },
  { key: "prefecture", label: "都道府県", kind: "text" },
  { key: "city", label: "市区町村", kind: "text" },
  { key: "addressLine", label: "町名・番地", kind: "text" },
  { key: "building", label: "建物名・部屋番号", kind: "text" },
  { key: "phone", label: "電話番号（ハイフンなし）", kind: "text" },
  { key: "email", label: "メールアドレス", kind: "text" },
  { key: "university", label: "大学名", kind: "text" },
  { key: "faculty", label: "学部", kind: "text" },
  { key: "department", label: "学科", kind: "text" },
  { key: "gradYear", label: "卒業予定年（西暦）", kind: "text" },
  { key: "gradMonth", label: "卒業予定月", kind: "text" },
  { key: "schoolType", label: "学校区分", kind: "text" },     // 大学 / 大学院
  { key: "schoolFounder", label: "設置区分", kind: "text" },  // 国立 / 公立 / 私立
  { key: "grade", label: "現在の学年", kind: "text" },        // 大学3年 など
  { key: "bunri", label: "文理区分", kind: "text" },          // 文系 / 理系 / 文理融合
  { key: "academicField", label: "系統（専攻系統）", kind: "text" }, // 経済 など
  { key: "gradStatus", label: "卒業見込み区分", kind: "text" }, // 卒業見込み / 卒業
  { key: "jobStartYM", label: "就職希望年月", kind: "text" },  // 2028年4月 など
  { key: "admissionYear", label: "大学入学年（西暦）", kind: "text" },
  { key: "admissionMonth", label: "大学入学月", kind: "text" },
  { key: "highSchool", label: "出身高校名", kind: "text" },
  { key: "highSchoolGradYear", label: "高校卒業年（西暦）", kind: "text" },
  { key: "highSchoolAdmYear", label: "高校入学年（西暦）", kind: "text" },
  { key: "email2", label: "サブメールアドレス（任意）", kind: "text" }
];

if (typeof module !== "undefined" && module.exports) {
  module.exports = { kataToHira, hiraToKata, fullToHalfKana, adaptKana, normalizeContext, PROFILE_FIELDS };
}
