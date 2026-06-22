// button-gate.test.js — ボタン表示判定の回帰テスト。
// 求人検索/絞り込みページ（sample-listing.html）ではボタンを出さない（false positive 防止）。
// 本物のエントリーフォーム（sample-form.html）では出す。
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const dir = path.join(__dirname, "..");
const scripts = ["src/util.js", "src/matcher.js", "src/filler.js", "src/content.js"]
  .map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n;\n");

function mountsButton(htmlFile) {
  const html = fs.readFileSync(path.join(__dirname, htmlFile), "utf8");
  const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true });
  const { window } = dom;
  window.CSS = window.CSS || {};
  window.CSS.escape = (s) => String(s).replace(/[^a-zA-Z0-9_\-]/g, (c) => "\\" + c);
  window.requestAnimationFrame = (cb) => cb();
  window.chrome = { storage: { local: { get: (_k, cb) => cb({ profile: {} }) } } };
  window.Element.prototype.getBoundingClientRect = function () { return { width: 10, height: 10, top: 0, left: 0, right: 10, bottom: 10 }; };
  window.eval(scripts);
  return !!window.document.querySelector(".jfa-fab");
}

let fail = 0;
const cases = [
  ["sample-listing.html", false, "求人検索ページではボタンを出さない"],
  ["sample-form.html", true, "エントリーフォームではボタンを出す"],
  ["sample-e2r.html", true, "e2r フォームではボタンを出す"],
];
for (const [file, expected, label] of cases) {
  const got = mountsButton(file);
  if (got === expected) console.log(`✓ ${label}`);
  else { fail++; console.log(`✗ ${label}  期待:${expected}  実際:${got}`); }
}
console.log(`\n${cases.length - fail}/${cases.length} 通過` + (fail ? `（${fail}件 失敗）` : "（全通過）"));
process.exit(fail ? 1 : 0);
