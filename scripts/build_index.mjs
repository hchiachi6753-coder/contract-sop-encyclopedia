import fs from "fs";
import path from "path";

const PDF_DIR = path.join(process.cwd(), "public/pdfs");
const OUTPUT_FILE = path.join(process.cwd(), "public/index.json");

async function extractPdfByPage(filePath, docId) {
  // ✅ Node.js 用 legacy build，避免 DOMMatrix 問題
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const data = new Uint8Array(fs.readFileSync(filePath));
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;

  const pages = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const strings = textContent.items.map((item) => item.str);
    pages.push({
      docId,
      page: pageNum,
      text: strings.join(" ").replace(/\s+/g, " ").trim(),
    });
  }
  return pages;
}

async function buildIndex() {
  const files = fs.readdirSync(PDF_DIR).filter((f) => f.endsWith(".pdf"));
  let index = [];

  for (const file of files) {
    console.log(`Processing ${file}...`);
    const filePath = path.join(PDF_DIR, file);
    const docId = file.replace(".pdf", "");
    const pages = await extractPdfByPage(filePath, docId);
    index = index.concat(pages);
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index, null, 2), "utf-8");
  console.log(`Index written to ${OUTPUT_FILE}`);
}

buildIndex().catch((err) => {
  console.error(err);
  process.exit(1);
});
