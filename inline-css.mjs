import fs from "fs";

let css = fs.readFileSync("css/style.css", "utf8");
// When CSS is in index.html, relative URLs resolve from the document root
css = css.replace(/url\("\.\.\/fonts\//g, 'url("fonts/');
// Light minify — do NOT strip spaces around + / - (breaks calc(a + b))
css = css.replace(/\/\*[\s\S]*?\*\//g, "");
css = css.replace(/\s+/g, " ");
css = css.replace(/\s*([{}:;,])\s*/g, "$1");
css = css.trim();

let html = fs.readFileSync("index.html", "utf8");
const re =
  /\s*<!-- Critical CSS only[\s\S]*?-->\s*<link rel="stylesheet" href="css\/style\.css">\s*/;
if (!re.test(html)) {
  // already inlined?
  if (html.includes('id="critical-css"')) {
    html = html.replace(
      /<style id="critical-css">[\s\S]*?<\/style>/,
      `<style id="critical-css">${css}</style>`
    );
    fs.writeFileSync("index.html", html);
    console.log("updated existing inline CSS,", css.length, "chars");
    process.exit(0);
  }
  console.error("Could not find stylesheet block in index.html");
  process.exit(1);
}

html = html.replace(
  re,
  `\n  <!-- Critical CSS inlined (no render-blocking stylesheet request) -->\n  <style id="critical-css">${css}</style>\n\n`
);
fs.writeFileSync("index.html", html);
console.log("inlined", css.length, "chars; index.html", fs.statSync("index.html").size);
console.log(
  html.includes('href="css/style.css"') ? "WARN: external link still present" : "external link removed"
);
console.log(
  css.includes('url("fonts/') ? "font paths ok for HTML root" : "WARN: font paths"
);
