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

// index.html 内の対応表をそのまま使う（二重管理を避ける）
const COMPARE_MAP = (() => {
  const m = html.match(/const COMPARE_ARTICLE_BY_SHOE = (\{[\s\S]*?\n\});/);
  return m ? Function(`"use strict"; return ${m[1]};`)() : {};
})();
const entryUrl = (id) => `https://ameblo.jp/tougyou-0111/entry-${id}.html`;

// そのモデルが主役の比較記事へのリンク。レビュー記事と同じ記事なら出さない。
function compareLink(s) {
  const id = COMPARE_MAP[s.id];
  if (!id) return "";
  const url = entryUrl(id);
  if (s.ameblo_url === url) return "";
  return `<a href="${esc(url)}" target="_blank" rel="noopener">他モデルと比較して読む →</a>`;
}

// フィルター用のキー。ブランドは表記ゆれを吸収して小文字スラッグ化する
const brandSlug = (b) =>
  String(b || "")
    .toLowerCase()
    .replace(/\s+/g, "");

// 目的タグ：1足が複数に該当してよい（クッション/スピード/安定）
function purposeTags(s) {
  const tags = [];
  const use = s.best_use || [];
  if (s.cushioning === "soft" || s.cushioning === "max" || use.includes("recovery") || use.includes("long run")) {
    tags.push("cushion");
  }
  if (s.ride === "propulsive" || s.ride === "responsive" || use.includes("tempo") || use.includes("speed")) {
    tags.push("speed");
  }
  if (s.stability === "stable" || s.stability === "high" || s.heavy_runner_ok) {
    tags.push("stability");
  }
  return tags.length ? tags : ["cushion"];
}

// 悩み起点のタグ。検索から来た人が使う言葉に近い切り口で絞り込めるようにする。
// 目的別（モノ起点）とは別軸で、掛け合わせて使える。
function concernTags(s) {
  const tags = [];
  const safe = s.injury_safe || [];
  if (safe.includes("knee")) tags.push("knee");                       // 膝が不安
  if ((s.best_use || []).includes("beginner")) tags.push("beginner"); // 初めての1足
  if (s.weight_g <= 250) tags.push("light");                          // 軽さ重視
  if (s.heavy_runner_ok && s.stability !== "low") tags.push("heavy");  // 体重が重め
  if (s.cushioning === "soft") tags.push("cushion");                  // 脚を守りたい
  if (s.width === "wide") tags.push("wide");                          // 幅広の足
  return tags;
}

// WebP優先・JPEGフォールバック。対応外ブラウザでも従来通り表示される
const picture = (id, alt, cls) => `<picture>
          <source srcset="img/${id}.webp" type="image/webp">
          <img class="${cls}" src="img/${id}.jpg" alt="${alt}" loading="lazy" decoding="async" onerror="this.closest('picture').style.display='none'">
        </picture>`;

const trainerCard = (s) => `
    <article class="zukan-card" id="z-${s.id}" data-brand="${brandSlug(s.brand)}" data-purpose="${purposeTags(s).join(" ")}" data-concern="${concernTags(s).join(" ")}" data-kind="trainer">
      <div class="zukan-top">
        ${picture(s.id, esc(s.jp_name), "zukan-img")}
        <div>
          <h4 class="zukan-name">${esc(s.jp_name)}</h4>
          <div class="zukan-spec">${esc(s.brand)} ／ ${esc(s.name)}<br>約${s.weight_g}g ・ スタック${s.heel}/${s.fore}mm ・ ドロップ${s.drop}mm ・ 参考 ¥${s.price_jpy.toLocaleString()}</div>
        </div>
      </div>
      <p class="zukan-feel">${esc(s.real_feel)}</p>
      <p class="zukan-weak">⚠ ${esc(s.weakness)}</p>
      <div class="zukan-links">
        ${s.ameblo_url ? `<a href="${esc(s.ameblo_url)}" target="_blank" rel="noopener">ブログのレビュー記事を読む →</a>` : ""}
        ${compareLink(s)}
        <button type="button" onclick="zukanToDiagnosis()">この靴が合うか診断する ↑</button>
      </div>
    </article>`;

const raceCard = (s) => `
    <article class="zukan-card" id="z-${s.id}" data-brand="${brandSlug(s.brand)}" data-purpose="speed" data-concern="${s.weight_g <= 250 ? "light" : ""}" data-kind="race">
      <div class="zukan-top">
        ${picture(s.id, esc(s.jp_name), "zukan-img")}
        <div>
          <h4 class="zukan-name">${esc(s.jp_name)}</h4>
          <div class="zukan-spec">${esc(s.brand)} ／ ${esc(s.name)} ・ ${esc(s.tag)}<br>約${s.weight_g}g ・ 参考 ¥${s.price_jpy.toLocaleString()}</div>
        </div>
      </div>
      <p class="zukan-feel">${esc(s.line)}</p>
      <p class="zukan-weak">⚠ ${esc(s.caution)}</p>
      <div class="zukan-links">
        ${s.ameblo_url ? `<a href="${esc(s.ameblo_url)}" target="_blank" rel="noopener">ブログの関連記事を読む →</a>` : ""}
        ${compareLink(s)}
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
