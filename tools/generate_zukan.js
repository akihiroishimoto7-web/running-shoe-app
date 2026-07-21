/**
 * 図鑑セクション自動生成スクリプト
 *
 * index.html 内の SHOES / RACE_SHOES 配列を読み取り、
 * SEO用の静的HTML（図鑑カード）を <!-- ZUKAN:START/END --> の間に注入する。
 * モデルを追加・更新したら `node tools/generate_zukan.js` を再実行するだけ。
 */
const fs = require("fs");
const path = require("path");
const FILE = path.join(__dirname, "..", "index.html");

const html = fs.readFileSync(FILE, "utf8");

// 配列リテラルを抽出して評価（データは純リテラルなので安全に評価できる）
function extractArray(name) {
  const re = new RegExp(`const ${name} = (\\[[\\s\\S]*?\\n\\]);`);
  const m = html.match(re);
  if (!m) throw new Error(`${name} not found`);
  return Function(`"use strict"; return ${m[1]};`)();
}

const esc = (s) =>
  String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const SHOES = extractArray("SHOES");
const RACE = extractArray("RACE_SHOES");

const trainerCard = (s) => `
    <article class="zukan-card" id="z-${s.id}">
      <div class="zukan-top">
        <img class="zukan-img" src="img/${s.id}.jpg" alt="${esc(s.jp_name)}" loading="lazy" onerror="this.style.display='none'">
        <div>
          <h4 class="zukan-name">${esc(s.jp_name)}</h4>
          <div class="zukan-spec">${esc(s.brand)} ／ ${esc(s.name)}<br>約${s.weight_g}g ・ スタック${s.heel}/${s.fore}mm ・ ドロップ${s.drop}mm ・ 参考 ¥${s.price_jpy.toLocaleString()}</div>
        </div>
      </div>
      <p class="zukan-feel">${esc(s.real_feel)}</p>
      <p class="zukan-weak">⚠ ${esc(s.weakness)}</p>
      <div class="zukan-links">
        ${s.ameblo_url ? `<a href="${esc(s.ameblo_url)}" target="_blank" rel="noopener">ブログのレビュー記事を読む →</a>` : ""}
        <button type="button" onclick="zukanToDiagnosis()">この靴が合うか診断する ↑</button>
      </div>
    </article>`;

const raceCard = (s) => `
    <article class="zukan-card" id="z-${s.id}">
      <div class="zukan-top">
        <img class="zukan-img" src="img/${s.id}.jpg" alt="${esc(s.jp_name)}" loading="lazy" onerror="this.style.display='none'">
        <div>
          <h4 class="zukan-name">${esc(s.jp_name)}</h4>
          <div class="zukan-spec">${esc(s.brand)} ／ ${esc(s.name)} ・ ${esc(s.tag)}<br>約${s.weight_g}g ・ 参考 ¥${s.price_jpy.toLocaleString()}</div>
        </div>
      </div>
      <p class="zukan-feel">${esc(s.line)}</p>
      <p class="zukan-weak">⚠ ${esc(s.caution)}</p>
      <div class="zukan-links">
        ${s.ameblo_url ? `<a href="${esc(s.ameblo_url)}" target="_blank" rel="noopener">ブログの関連記事を読む →</a>` : ""}
        <button type="button" onclick="zukanToDiagnosis()">診断で相性を見る ↑</button>
      </div>
    </article>`;

const body = `
    <h3 class="zukan-cat">練習用トレーナー ${SHOES.length}モデル</h3>
${SHOES.map(trainerCard).join("\n")}
    <h3 class="zukan-cat">サブ3向けカーボンレーシング ${RACE.length}選</h3>
${RACE.map(raceCard).join("\n")}`;

const out = html.replace(
  /<!-- ZUKAN:START -->[\s\S]*?<!-- ZUKAN:END -->/,
  `<!-- ZUKAN:START -->${body}\n    <!-- ZUKAN:END -->`
);
fs.writeFileSync(FILE, out);
console.log(
  `zukan generated: ${SHOES.length} trainers + ${RACE.length} racers, ` +
    `${(out.length - html.length).toLocaleString()} bytes added`
);
