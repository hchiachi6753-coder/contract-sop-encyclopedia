"use client";

<style jsx global>{`
  input::placeholder {
    color: #6b7280;
  }
`}</style>

import { useEffect, useMemo, useRef, useState } from "react";
import FlexSearch from "flexsearch";

type IndexRow = {
  docId: string;
  page: number;
  text: string;
};

type SearchHit = {
  docId: string;
  page: number;
  text: string;
  score: number;
};

const DOC_LABELS: Record<string, { name: string; file: string }> = {
  sop_v13_7: { name: "SOP Ver 13.7", file: "/pdfs/sop_v13_7.pdf" },
  sop_v17: { name: "SOP Ver 17", file: "/pdfs/sop_v17.pdf" },
};

const ISSUE_CATEGORIES = [
  {
    label: "續約 / 堂數異動",
    children: [
      { label: "個人續約", q: "個人續約" },
      { label: "手足續約", q: "手足續約" },
      { label: "過期合約續約", q: "過期合約續約" },
      { label: "合約日期異動", q: "合約日期異動" },
      { label: "續約換課", q: "續約換課" },
      { label: "堂數異動", q: "堂數 異動" },
    ],
  },
  {
    label: "手足相關",
    children: [
      { label: "手足綁定", q: "手足綁定" },
      { label: "手足堂數移轉", q: "手足 堂數 移轉" },
      { label: "手足續約", q: "手足續約" },
      { label: "新約拆分", q: "新約拆分" },
    ],
  },
  {
    label: "合約拆分 / 異動",
    children: [
      { label: "新約拆分", q: "新約拆分" },
      { label: "合約拆分", q: "合約拆分" },
      { label: "合約轉換", q: "合約轉換" },
      { label: "合約異動", q: "合約異動" },
    ],
  },
  {
    label: "合約延展 / 暫停",
    children: [
      { label: "付費延展", q: "付費延展" },
      { label: "堂數延展", q: "堂數 延展" },
      { label: "專案延展", q: "專案 延展" },
      { label: "合約暫停", q: "合約 暫停" },
      { label: "過期合約延展", q: "過期 合約 延展" },
    ],
  },
  {
    label: "付費 / 退費",
    children: [
      { label: "付費", q: "付費" },
      { label: "分期", q: "分期" },
      { label: "退費", q: "退費" },
      { label: "已提退", q: "已提退" },
    ],
  },
  {
    label: "專案 / 贈堂",
    children: [
      { label: "專案贈堂", q: "專案 贈堂" },
      { label: "MGM 贈堂", q: "MGM 贈堂" },
      { label: "補贈", q: "補贈 贈堂" },
    ],
  },
  {
    label: "客訴 / 例外處理",
    children: [
      { label: "客訴", q: "客訴" },
      { label: "申覆", q: "申覆" },
      { label: "例外", q: "例外" },
      { label: "主管核准", q: "主管 核准" },
    ],
  },
];

function snippet(text: string, q: string, len = 140) {
  const t = text || "";
  const qq = (q || "").trim();
  if (!qq) return t.slice(0, len);
  const idx = t.indexOf(qq);
  if (idx === -1) return t.slice(0, len);
  const start = Math.max(0, idx - Math.floor(len / 3));
  const end = Math.min(t.length, start + len);
  return (start > 0 ? "…" : "") + t.slice(start, end) + (end < t.length ? "…" : "");
}

export default function HomePage() {
  const [rows, setRows] = useState<IndexRow[]>([]);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [selected, setSelected] = useState<{ docId: string; page: number } | null>(null);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);

  const indexRef = useRef<any>(null);
  const idToRowRef = useRef<Map<number, IndexRow>>(new Map());

  useEffect(() => {
    (async () => {
      const res = await fetch("/index.json");
      const data = (await res.json()) as IndexRow[];
      setRows(data);
    })();
  }, []);

  useEffect(() => {
    if (!rows.length) return;

    // 建立搜尋索引（以 page 為單位）
    const idx = new (FlexSearch as any).Index({
      tokenize: "forward",
      cache: true,
      resolution: 9,
    });

    const map = new Map<number, IndexRow>();
    rows.forEach((r, i) => {
      // 用 i 當 document id
      map.set(i, r);
      idx.add(i, `${r.docId} ${r.page} ${r.text}`);
    });

    indexRef.current = idx;
    idToRowRef.current = map;
  }, [rows]);

  const doSearch = (query: string) => {
    const qq = query.trim();
    setQ(qq);

    if (!qq || !indexRef.current) {
      setHits([]);
      return;
    }

    const ids: number[] = indexRef.current.search(qq, 20) || [];
    const result: SearchHit[] = ids
      .map((id) => idToRowRef.current.get(id))
      .filter(Boolean)
      .map((r) => ({
        docId: r!.docId,
        page: r!.page,
        text: r!.text,
        score: 0,
      }));

    setHits(result);
  };

  const viewerUrl = useMemo(() => {
    if (!selected) return null;
    const meta = DOC_LABELS[selected.docId];
    const file = meta?.file;
    if (!file) return null;
    // 直接用瀏覽器 PDF + #page（多數情況可用；若你要更穩，後面我們可換 PDF.js viewer）
    return `${file}#page=${selected.page}`;
  }, [selected]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", height: "100vh" }}>
      {/* Left panel */}
      <div style={{ borderRight: "1px solid #ddd", padding: 16, overflow: "auto" }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>合約相關操作百科大全</h1>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            value={q}
            onChange={(e) => doSearch(e.target.value)}
            placeholder="輸入關鍵字，例如：未曾接聽 / 可再追 / 新約拆分"
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #374151",
              background: "#111827",
              color: "#E6EDF3",
              fontSize: 14,
              outline: "none",
            }}
          />
          <button
            onClick={() => doSearch(q)}
            style={{
              padding: "10px 12px",
              border: "1px solid #ccc",
              borderRadius: 10,
              background: "white",
              cursor: "pointer",
            }}
          >
            搜尋
          </button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>常用任務（先選類別，再選子項）</div>

          {/* 大類按鈕 */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {ISSUE_CATEGORIES.map((cat, idx) => {
              const isActive = activeCategory === idx;
              return (
                <button
                  key={cat.label}
                  onClick={() => setActiveCategory(isActive ? null : idx)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 999,
                    background: isActive ? "#2563EB" : "#1F2937",
                    color: "#E5E7EB",
                    border: "1px solid #374151",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* 子類按鈕：只有選了大類才顯示 */}
          {activeCategory !== null && (
            <div
              style={{
                marginTop: 8,
                padding: 12,
                borderRadius: 14,
                background: "#0B1220",
                border: "1px solid #1F2A44",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#E6EDF3" }}>
                  子選項：{ISSUE_CATEGORIES[activeCategory].label}
                </div>
                <div style={{ fontSize: 12, color: "#9BA3AF" }}>
                  點子選項會自動搜尋並跳頁
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {ISSUE_CATEGORIES[activeCategory].children.map((child) => (
                  <button
                    key={child.label}
                    onClick={() => {
                      // 1) 搜尋框顯示人話
                      setQ(child.label);

                      // 2) 實際搜尋用更精準的查詢字（q）
                      doSearch(child.q);
                    }}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      background: "#FFFFFF",
                      color: "#111827",
                      border: "1px solid #D1D5DB",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {child.label}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: "#9BA3AF", lineHeight: 1.5 }}>
                找不到你要的子選項？你也可以直接在上方搜尋框輸入關鍵字。
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            marginBottom: 10,
            padding: "10px 12px",
            borderRadius: 14,
            background: hits.length ? "#FFF7ED" : "#F3F4F6",
            border: hits.length ? "1px solid #FDBA74" : "1px solid #E5E7EB",
            color: hits.length ? "#9A3412" : "#374151",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          {hits.length ? (
            <>
              ✅ 已找到 <b>{hits.length}</b> 筆結果。下一步請 <b>點選下方任一張「結果卡片」</b>，右側才會開啟 PDF 並跳到對應頁。
            </>
          ) : (
            <>
              先從上方「問題類型」選大類 → 再選子項，或直接在搜尋框輸入關鍵字。找到結果後請點卡片開啟右側 PDF。
            </>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {hits.map((h, idx) => {
            const meta = DOC_LABELS[h.docId];
            return (
              <button
                key={`${h.docId}-${h.page}-${idx}`}
                onClick={() => {
                  const meta = DOC_LABELS[h.docId];
                  if (!meta?.file) return;

                  const pdfUrl = `${meta.file}#page=${h.page}`;

                  const isMobile = window.matchMedia("(max-width: 767px)").matches;

                  if (isMobile) {
                    window.location.href = pdfUrl; // ✅ 手機：同分頁打開 PDF
                  } else {
                    setSelected({ docId: h.docId, page: h.page }); // ✅ 桌機：右側 iframe 不變
                  }
                }}
                style={{
                  textAlign: "left",
                  borderRadius: 16,
                  padding: 14,
                  background: "#0F172A",
                  border: "1px solid #1E293B",
                  color: "#E5E7EB",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: "#F8FAFC" }}>
                  {meta?.name || h.docId} ・第 {h.page} 頁
                </div>
                <div style={{ fontSize: 12, color: "#CBD5E1", lineHeight: 1.5 }}>
                  {snippet(h.text, q)}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 18, fontSize: 12, color: "#888", lineHeight: 1.5 }}>
          提醒：目前搜尋只針對 PDF 的「文字層」。操作截圖中的圖片文字若需搜尋，之後可加 OCR。
        </div>
      </div>

      {/* Right panel */}
      <div style={{ height: "100%", background: "#fafafa" }}>
        {viewerUrl ? (
          <iframe title="pdf" src={viewerUrl} style={{ width: "100%", height: "100%", border: 0 }} />
        ) : (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#777",
              fontSize: 14,
            }}
          >
            左邊搜尋後，點選結果即可在這裡顯示並跳到指定頁
          </div>
        )}
      </div>
    </div>
  );
}
