import Papa from "papaparse";

const data = await Bun.file("test.json").json();
const csv = Papa.unparse(data);

console.log(csv);
