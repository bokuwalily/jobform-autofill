// matcher の分類ロジックの自己テスト。`node test/matcher.test.js` で実行。
const { normalizeContext } = require("../src/util.js");
const { classifyField } = require("../src/matcher.js");

const cases = [
  ["氏名", "fullName"],
  ["お名前", "fullName"],
  ["姓", "lastName"],
  ["名", "firstName"],
  ["姓（漢字）", "lastName"],
  ["名（漢字）", "firstName"],
  ["フリガナ（セイ）", "lastNameKana"],
  ["フリガナ（メイ）", "firstNameKana"],
  ["セイ", "lastNameKana"],
  ["メイ", "firstNameKana"],
  ["氏名カナ", "fullNameKana"],
  ["ふりがな", "fullNameKana"],
  ["生年月日", "birthdate"],
  ["誕生日", "birthdate"],
  ["性別", "gender"],
  ["郵便番号", "postalCode"],
  ["〒", "postalCode"],
  ["都道府県", "prefecture"],
  ["市区町村", "city"],
  ["町名・番地", "addressLine"],
  ["建物名・部屋番号", "building"],
  ["ご住所", "addressFull"],
  ["電話番号", "phone"],
  ["携帯電話", "phoneMobile"],
  ["自宅電話番号", "phoneHome"],
  ["メールアドレス2", "email2"],
  ["メールアドレス（確認用）", "email"],
  ["出身高校名", "highSchool"],
  ["高校卒業年", "highSchoolGradYear"],
  ["大学入学年月", "admissiondate"],
  ["メールアドレス", "email"],
  ["E-mail", "email"],
  ["大学名", "university"],
  ["学校名", "university"],
  ["学部", "faculty"],
  ["学科", "department"],
  ["卒業予定年", "graddate"],
  ["卒業予定月", "graddate"],
  ["備考", null],
  ["志望動機", null],
  // 実フォームで踏んだ罠の回帰テスト
  ["現住所市区郡・地名", "city"],   // 「地名」を名(first)と誤認しない
  ["市区郡町村", "city"],
  ["学校名の頭文字", null],          // 頭文字欄はスキップ
  ["卒業（予定）年月", "graddate"],
  ["携帯電話番号", "phoneMobile"],
  ["現住所番地", "addressLine"],
  ["建物名・部屋番号", "building"],
  ["メールアドレス（確認用）", "email"],
  ["会社名", null],                  // 複合語の「名」を名(first)にしない
  ["カナ氏名", "fullNameKana"],
  // v0.3: 行ラベル汚染・新プルダウン・スキップ
  ["氏名 姓", "lastName"],            // 行の「氏名」に潰されず姓と判定
  ["氏名 名", "firstName"],           // 同上、名と判定（フルネームにしない）
  ["コース名", null],
  ["学校区分", "schoolType"],
  ["学歴区分", "schoolType"],
  ["設置区分", "schoolFounder"],
  ["現在の学年", "grade"],
  ["文理区分", "bunri"],
  ["系統", "academicField"],
  ["系統その他", null],
  ["卒業・見込み区分", "gradStatus"],
  ["就職（入社）希望年月", "jobStartYM"],
  ["海外在住の方はこちら", null]
];

let pass = 0, fail = 0;
for (const [input, expected] of cases) {
  const got = classifyField(normalizeContext(input));
  if (got === expected) { pass++; }
  else { fail++; console.log(`✗ "${input}"  期待:${expected}  実際:${got}`); }
}
console.log(`\n${pass}/${cases.length} 通過` + (fail ? `（${fail}件 失敗）` : "（全通過）"));
process.exit(fail ? 1 : 0);
