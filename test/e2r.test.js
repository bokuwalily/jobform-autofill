// e2r.test.js — e2r 模倣フォーム（海外注記インライン・分割box・例示テキスト）で
// 国内ユーザーが正しく埋まり、海外専用boxは空のまま、を検証する回帰テスト。
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const dir = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(__dirname, "sample-e2r.html"), "utf8");
const scripts = ["src/util.js", "src/matcher.js", "src/filler.js", "src/content.js"]
  .map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n;\n");

const profile = {
  lastName: "山田", firstName: "太郎", lastNameKana: "ヤマダ", firstNameKana: "タロウ",
  birthYear: "2003", birthMonth: "10", birthDay: "17", gender: "男性",
  postalCode: "1710031", prefecture: "東京都", city: "豊島区", addressLine: "目白2-12-6", building: "アネモス目白101",
  phone: "09012345678", email: "contact@example.com",
  university: "法政大学", faculty: "経済学部", gradYear: "2028", gradMonth: "3",
  schoolFounder: "私立"
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
    ["seik", "ヤマダ"], ["meik", "タロウ"],
    ["by", "2003"], ["bm", "10"], ["bd", "17"],
    // 海外注記が同居していても国内欄は埋まる
    ["zip1", "171"], ["zip2", "0031"], ["zipov", ""],
    ["city", "豊島区"], ["addr", "目白2-12-6"], ["bldg", "アネモス目白101"],
    ["ph1", "090"], ["ph2", "1717"], ["ph3", "0135"], ["phov", ""],
    ["mail", "contact@example.com"], ["mailc", "contact@example.com"]
  ];
  let pass = 0, fail = 0;
  for (const [id, expected] of checks) {
    const got = val(id);
    if (got === expected) pass++; else { fail++; console.log(`✗ #${id}  期待:"${expected}"  実際:"${got}"`); }
  }
  // select（都道府県）と radio（性別）
  if (val("pref") === "東京都") pass++; else { fail++; console.log(`✗ #pref  実際:"${val("pref")}"`); }
  // 裸テキストノード＋コード値ラジオでも「男性」ラベルから value="1" を選べる
  const gender = (doc.querySelector('input[name="gender"]:checked') || {}).value || null;
  if (gender === "1") pass++; else { fail++; console.log(`✗ 性別  実際:${gender}`); }
  // 設置区分：選択肢に「日本国外」があっても私立を選べる（海外スキップ巻き添え回帰）
  const founder = (doc.querySelector('input[name="founder"]:checked') || {}).value || null;
  if (founder === "私立") pass++; else { fail++; console.log(`✗ 設置区分  実際:${founder}`); }

  const total = checks.length + 3;
  console.log(`\n${pass}/${total} 通過` + (fail ? `（${fail}件 失敗）` : "（全通過）"));
  process.exit(fail ? 1 : 0);
})();
