const puppeteer = require("puppeteer");

//const id = "5ef29078-cdb0-4134-887a-69250a9f2732";  // ← ここだけ変えればOK
//const id = "6ec90412-dbd8-4333-887f-94bff41758a8";  // ← ここだけ変えればOK
//const id = "d50be473-efa9-4e9f-b93c-d124f4005bc8";  // ← ここだけ変えればOK
//const id = "f339b806-773d-47ca-a257-7f43c4748da1";  // ← ここだけ変えればOK
const id = "40da515e-4f63-44b8-90af-7f410c28f93e";  // ← ここだけ変えればOK

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(`http://localhost:4000/evaluation/merged/${id}`, {
    waitUntil: "networkidle0",
  });

  await page.pdf({
    path: `evaluation_${id}.pdf`,
    format: "A4",
    printBackground: true,
  });

  await browser.close();
})();