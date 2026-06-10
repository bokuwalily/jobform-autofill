// e2e.test.js — table＋div 両レイアウトの sample-form.html で content.js を実行し検証。
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const dir = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(__dirname, "sample-form.html"), "utf8");
const scripts = ["src/util.js", "src/matcher.js", "src/filler.js", "src/content.js"]
  .map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n;\n");

const profile = {
  lastName: "山田", firstName: "太郎", lastNameKana: "ヤマダ", firstNameKana: "タロウ",
  birthYear: "2003", birthMonth: "10", birthDay: "17", gender: "男性",
  postalCode: "1710031", prefecture: "東京都", city: "豊島区", addressLine: "目白2-12-6", building: "アネモス目白101",
  phone: "09012345678", email: "contact@example.com",
  university: "法政大学", faculty: "経済学部", gradYear: "2028", gradMonth: "3",
  schoolType: "大学", schoolFounder: "私立", grade: "大学3年", bunri: "文系", academicField: "経済",
  gradStatus: "卒業見込み", jobStartYM: "2028年4月",
  admissionYear: "2024", admissionMonth: "4",
  highSchool: "大阪府立高津高等学校", highSchoolGradYear: "2022", highSchoolAdmYear: "2019"
  // email2 は未設定 → メールアドレス2 は埋めないことを確認
};

const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true });
const { window } = dom;
window.CSS = window.CSS || {};
window.CSS.escape = (s) => String(s).replace(/[^a-zA-Z0-9_\-]/g, (c) => "\\" + c);
window.requestAnimationFrame = (cb) => cb();
window.chrome = { storage: { local: { get: (_k, cb) => cb({ profile }) } } };
window.Element.prototype.getBoundingClientRect = function () { return { width: 10, height: 10, top: 0, left: 0, right: 10, bottom: 10 }; };

window.eval(scripts);
const doc = window.document;
const fab = doc.querySelector(".jfa-fab");
if (!fab) { console.log("✗ ボタン未生成"); process.exit(1); }

(async () => {
  fab.dispatchEvent(new window.Event("click", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 50));
  const val = (id) => doc.getElementById(id).value;
  const checks = [
    // table
    ["sei", "山田"], ["mei", "太郎"], ["seik", "ヤマダ"], ["meik", "タロウ"],
    // 例示テキスト「例（姓：…　名：…）」同居でも姓/名を取り違えない（e2r回帰）
    ["sei2", "山田"], ["mei2", "太郎"], ["seik2", "ヤマダ"], ["meik2", "タロウ"],
    ["by", "2003"], ["bm", "10"], ["bd", "17"],
    ["adY", "2024"], ["adM", "4"],
    ["hs", "大阪府立高津高等学校"], ["hsg", "2022"],
    ["course", ""],
    // div レイアウト（ラベルdiv抽出が効くか）
    ["dzip1", "171"], ["dzip2", "0031"],
    ["dpref", "東京都"], ["dcity", "豊島区"],
    // 携帯のみ入力・自宅(stale携帯番号)はクリア
    ["dh1", ""], ["dh2", ""], ["dh3", ""],
    ["dm1", "090"], ["dm2", "1717"], ["dm3", "0135"],
    // メール主+確認、メール2はスキップ
    ["dmail", "contact@example.com"], ["dmailc", "contact@example.com"],
    ["dmail2", ""], ["dmail2c", ""],
    // axol 模倣：サブラベル＋placeholder のメール本体/確認用
    ["amail", "contact@example.com"], ["amailc", "contact@example.com"]
  ];
  let pass = 0, fail = 0;
  for (const [id, expected] of checks) {
    const got = val(id);
    if (got === expected) pass++; else { fail++; console.log(`✗ #${id}  期待:"${expected}"  実際:"${got}"`); }
  }
  const checked = (n) => { const el = doc.querySelector(`input[name="${n}"]:checked`); return el ? el.value : null; };
  if (checked("gender") === "male") pass++; else { fail++; console.log(`✗ 性別  実際:${checked("gender")}`); }
  if (checked("dstype") === "daigaku") pass++; else { fail++; console.log(`✗ 学校区分(div)  実際:${checked("dstype")}`); }

  const total = checks.length + 2;
  console.log(`\n${pass}/${total} 通過` + (fail ? `（${fail}件 失敗）` : "（全通過）"));
  process.exit(fail ? 1 : 0);
})();
