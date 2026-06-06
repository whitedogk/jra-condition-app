import fs from "node:fs";
import path from "node:path";

const basePath = path.resolve(process.env.JRA_BASE_PATH || "data/jra-results-actual.csv");
const incrementalPath = path.resolve(process.env.JRA_INCREMENTAL_PATH || "");
const startDate = process.env.JRA_MERGE_START_DATE;
const endDate = process.env.JRA_MERGE_END_DATE;

if (!incrementalPath || !fs.existsSync(incrementalPath)) {
  throw new Error("JRA_INCREMENTAL_PATH must point to an existing CSV file.");
}

if (!startDate || !endDate) {
  throw new Error("JRA_MERGE_START_DATE and JRA_MERGE_END_DATE are required.");
}

const base = readCsv(basePath);
const incremental = readCsv(incrementalPath);
const headers = [...new Set([...base.headers, ...incremental.headers])];

const outsideRange = base.rows.filter((row) => row.date < startDate || row.date > endDate);
const mergedRows = [...outsideRange, ...incremental.rows].sort(compareRows);

fs.writeFileSync(basePath, toCsv(headers, mergedRows), "utf8");

console.log(`base_rows=${base.rows.length}`);
console.log(`removed_rows=${base.rows.length - outsideRange.length}`);
console.log(`incremental_rows=${incremental.rows.length}`);
console.log(`merged_rows=${mergedRows.length}`);
console.log(`csv=${basePath}`);

function readCsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const records = parseCsv(text);
  const headers = records.shift() || [];
  return {
    headers,
    rows: records.filter((record) => record.some(Boolean)).map((record) => Object.fromEntries(headers.map((h, i) => [h, record[i] ?? ""]))),
  };
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function compareRows(a, b) {
  const keyA = rowKey(a);
  const keyB = rowKey(b);
  return keyA.localeCompare(keyB, "ja");
}

function rowKey(row) {
  return [
    row.date || "",
    row.course || "",
    String(row.race || "").padStart(2, "0"),
    String(row.finish || "").padStart(2, "0"),
    String(row.horseNumber || "").padStart(2, "0"),
  ].join("-");
}

function toCsv(headers, rows) {
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
    "",
  ].join("\n");
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
