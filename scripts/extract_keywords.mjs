import fs from "fs";

const index = JSON.parse(fs.readFileSync("public/index.json", "utf-8"));

// 只取每頁前面一段（通常標題/小標會在前面），避免整頁噪音太多
const HEAD_LEN = 160;

// 抓 2~4 字的中文詞（像：合約、續約、手足、付費、延展、暫停、退費、挽留...）
function extractTerms(s) {
  const head = (s || "").slice(0, HEAD_LEN);
  const cleaned = head
    .replace(/\s+/g, "")
    .replace(/[0-9A-Za-z]/g, "") // 移除英數，先專注中文
    .replace(/[，。！？、；：「」『』（）()【】\[\]—\-_.…]/g, ""); // 移除常見標點

  const terms = [];
  for (let i = 0; i < cleaned.length; i++) {
    for (let len = 2; len <= 4; len++) {
      const t = cleaned.slice(i, i + len);
      if (t.length === len) terms.push(t);
    }
  }
  return terms;
}

// 排除一些太常見/無意義詞（你也可以日後擴充）
const STOP = new Set([
  "作業","流程","說明","注意","如下","請","以及","相關","狀態","備註","內容","處理","方式","規則","標準","範本",
  "主管","同仁","客戶","系統","資料","表單","紀錄","更新","確認","進行","時間","當天","當週","每週","每月",
]);

const freq = new Map();

for (const row of index) {
  const terms = extractTerms(row.text);
  for (const t of terms) {
    if (STOP.has(t)) continue;
    // 避免一堆重複字（例如「哈哈哈」）
    if (/^(.)\1+$/.test(t)) continue;

    freq.set(t, (freq.get(t) || 0) + 1);
  }
}

// 取前 80 個候選
const top = [...freq.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 80)
  .map(([term, count]) => ({ term, count }));

fs.writeFileSync("public/keyword_candidates.json", JSON.stringify(top, null, 2), "utf-8");
console.log("✅ 已產生 public/keyword_candidates.json");
console.log("Top 30：");
top.slice(0, 30).forEach((x, i) => console.log(`${String(i + 1).padStart(2, "0")}. ${x.term} (${x.count})`));

