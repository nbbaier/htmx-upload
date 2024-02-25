import { Hono } from "hono";
import { logger } from "hono/logger";
import Papa from "papaparse";

const app = new Hono();

app.use("*", logger());
app.get("/", async (c) => {
  const path = "src/index.html";
  const file = Bun.file(path);
  const index = await file.text();

  return c.html(index);
});

async function parseBlob(blob: Blob) {
  let buffer = await blob.arrayBuffer();
  let jsonString = new TextDecoder().decode(buffer);
  let jsObject = JSON.parse(jsonString);
  return jsObject;
}

async function getCSV(file: File) {
  const fileType = file.type.split(";")[0];

  let csv;

  switch (fileType) {
    case "application/json":
      const data = await parseBlob(file);
      csv = Papa.unparse(data);

      break;
    case "text/csv":
      csv = await file.text();
      break;
    default:
      console.log(fileType);
      break;
  }
  return csv;
}

function createSql(table: string, csv: string) {
  if (csv === "") {
    return "";
  }
  const rows = csv.split("\n");
  const headers = `(${rows[0].replace(",", ", ").trim()})`;
  const values = rows
    .slice(1)
    .map((row) => `(${row.replace(",", ", ").trim()})`);
  const sql = `INSERT INTO ${table} ${headers}
  VALUES ${values.join(", ")};`;

  return sql;
}

app.post("/upload", async (c) => {
  const body = await c.req.parseBody();

  const file = body.file as File;
  const table = file.name.replace(/\.[^/.]+$/, "");
  console.log(table);
  const csv = await getCSV(file);
  const sql = createSql(table, csv || "");

  return c.html(
    sql ? `<code>${sql.replace("\n", "<br/>")}</code>` : "Something went wrong"
  );
});

Bun.serve({ fetch: app.fetch });
