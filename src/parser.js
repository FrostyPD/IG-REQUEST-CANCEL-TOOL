const fs = require("fs");
const cheerio = require("cheerio");

function parsePendingHtml(filePath) {
  const html = fs.readFileSync(filePath, "utf8");
  const $ = cheerio.load(html);

  const usernames = new Set();

  $("a").each((_, el) => {
    const text = ($(el).text() || "").trim().replace(/^@/, "");
    if (/^[a-zA-Z0-9._]{1,30}$/.test(text)) {
      usernames.add(text);
    }
  });

  return [...usernames];
}

module.exports = { parsePendingHtml };