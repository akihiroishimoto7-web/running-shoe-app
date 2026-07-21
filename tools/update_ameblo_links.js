/**
 * アメブロ記事リンク 自動更新スクリプト（月次実行想定）
 *
 * やること：
 *  1. ameblo.jp/tougyou-0111 の記事一覧を全ページクロール
 *  2. index.html 内の ameblo_url:"" （空欄）だけを対象に、
 *     シューズ名キーワードで記事をマッチング
 *  3. マッチしたら URL を書き込み → git commit & push（自動デプロイ）
 *
 * 安全設計：
 *  - 既に入っているリンクは絶対に上書きしない（空欄のみ埋める）
 *  - 変更が無ければ commit しない
 *  - 実行ログを tools/update_log.txt に追記
 *
 * 手動実行: node tools/update_ameblo_links.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");
const { execSync } = require("child_process");

const REPO = path.join(__dirname, "..");
const FILE = path.join(REPO, "index.html");
const LOG = path.join(__dirname, "update_log.txt");
const BLOG = "tougyou-0111";
const BASE = `https://ameblo.jp/${BLOG}/entry-`;

// モデルID → タイトルマッチ用キーワード（新モデル追加時はここに追記）
const KEYWORDS = {
  pegasus_42: /ペガサス\s*42|pegasus\s*42/i,
  vomero_18: /ボメロ\s*18|vomero\s*18/i,
  evo_sl: /evo\s*sl|エボ\s*SL/i,
  novablast_6: /ノヴァブラスト\s*6|ノバブラスト\s*6|novablast\s*6/i,
  nb_1080_v15: /1080\s*v?15/i,
  rebel_v5: /rebel\s*v?5|リベル\s*v?5/i,
  clifton_11: /クリフトン\s*11|clifton\s*11/i,
  cloudmonster_3: /クラウドモンスター|cloudmonster/i,
  kayano_33: /カヤノ\s*33|kayano\s*33/i,
  nimbus_28: /ニンバス\s*28|nimbus\s*28/i,
  rider_30: /ウェーブライダー\s*30|ウエーブライダー\s*30|wave\s*rider\s*30/i,
  boston_13: /ボストン\s*13|boston\s*13/i,
  pegasus_plus: /ペガサス\s*プラス|pegasus\s*plus/i,
  vomero_plus: /ボメロ\s*プラス|vomero\s*plus/i,
  bondi_9: /ボンダイ|bondi/i,
  mach_7: /マッハ\s*7|mach\s*7|ホカ\s*マッハ/i,
  cloudsurfer_2: /クラウドサーファー|cloudsurfer/i,
  cloud_6: /クラウド\s*6|cloud\s*6/i,
  vaporfly_4: /ヴェイパーフライ|ベイパーフライ|vaporfly/i,
  alphafly_3: /アルファフライ|alphafly/i,
  metaspeed_sky_tokyo: /メタスピード\s*スカイ|metaspeed\s*sky/i,
  metaspeed_edge_tokyo: /メタスピード\s*エッジ|metaspeed\s*edge/i,
  metaspeed_ray: /メタスピード\s*レイ|metaspeed\s*ray/i,
  adios_pro_5: /アディオス\s*プロ\s*5|adios\s*pro\s*5/i,
  rebellion_pro_3: /リベリオン|rebellion/i,
  sc_elite_v5: /sc\s*elite|SCエリート/i,
  fastr_3: /fast-?r|ファストR/i,
  cloudboom_strike: /クラウドブーム|cloudboom/i,
};

const fetchPage = (url) =>
  new Promise((res, rej) => {
    https
      .get(
        url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0",
            "Accept-Encoding": "identity",
          },
        },
        (r) => {
          let d = "";
          r.on("data", (c) => (d += c));
          r.on("end", () => res(d));
        }
      )
      .on("error", rej);
  });

const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG, line + "\n");
};

(async () => {
  try {
    // 1. 記事一覧クロール（新しい順）
    const entries = [];
    const seen = new Set();
    for (let p = 1; p <= 15; p++) {
      const url =
        `https://ameblo.jp/${BLOG}/entrylist` + (p === 1 ? "" : `-${p}`) + ".html";
      let html;
      try {
        html = await fetchPage(url);
      } catch (e) {
        break;
      }
      const m = html.match(/window\.INIT_DATA\s*=\s*({.*?});/s);
      if (!m) break;
      let found = 0;
      const re = /"entry_id":(\d+),[^{}]*?"entry_title":"((?:[^"\\]|\\.)*)"/g;
      let x;
      while ((x = re.exec(m[1]))) {
        if (!seen.has(x[1])) {
          seen.add(x[1]);
          entries.push({ id: x[1], title: JSON.parse('"' + x[2] + '"') });
          found++;
        }
      }
      if (found === 0) break;
    }
    log(`crawled ${entries.length} blog entries`);
    if (entries.length === 0) {
      log("SKIP: crawl returned nothing (ameblo layout changed?)");
      return;
    }

    // 2. 空欄スロットの特定
    let html = fs.readFileSync(FILE, "utf8");
    const emptyIds = [];
    const slotRe = /id:"([a-z0-9_]+)"[\s\S]*?ameblo_url:""/g;
    let s;
    const idRe = /id:"([a-z0-9_]+)"/g;
    // 各 ameblo_url:"" の直前にある id を拾う
    const positions = [];
    let mm;
    const emptyRe = /ameblo_url:""/g;
    while ((mm = emptyRe.exec(html))) positions.push(mm.index);
    for (const pos of positions) {
      const before = html.slice(0, pos);
      const ids = [...before.matchAll(idRe)];
      if (ids.length) emptyIds.push(ids[ids.length - 1][1]);
    }
    log(`empty slots: ${emptyIds.length ? emptyIds.join(", ") : "none"}`);

    // 3. マッチング（単独記事優先＝タイトルに vs/比較 を含まないもの、次に新しい順）
    let filled = 0;
    for (const id of emptyIds) {
      const kw = KEYWORDS[id];
      if (!kw) {
        log(`no keyword map for "${id}" — add it to KEYWORDS`);
        continue;
      }
      const hits = entries.filter((e) => kw.test(e.title));
      if (!hits.length) continue;
      const solo = hits.find((e) => !/vs|比較|どっち/i.test(e.title));
      const pick = solo || hits[0];
      const re = new RegExp(`(id:"${id}"[\\s\\S]*?ameblo_url:)""`);
      html = html.replace(re, `$1"${BASE}${pick.id}.html"`);
      filled++;
      log(`filled ${id} <- ${pick.title}`);
    }

    if (filled === 0) {
      log("no new links to fill — done");
      return;
    }

    // 4. 書き込み → 図鑑を再生成（記事リンクを図鑑側にも反映）→ commit → push
    fs.writeFileSync(FILE, html);
    try {
      execSync("node tools/generate_zukan.js", { cwd: REPO });
      log("regenerated zukan section");
    } catch (e) {
      log("WARN: zukan regen failed — " + (e && e.message ? e.message : e));
    }
    execSync("git add index.html", { cwd: REPO });
    execSync(
      `git commit -m "Auto-update: fill ${filled} Ameblo article link(s)"`,
      { cwd: REPO }
    );
    execSync("git push", { cwd: REPO });
    log(`pushed ${filled} new link(s) — Vercel will auto-deploy`);
  } catch (e) {
    log("ERROR: " + (e && e.message ? e.message : String(e)));
    process.exitCode = 1;
  }
})();
