# Bundle modular CSS into css/style.css (single render-blocking request).
# Run after editing any file under css/base/ or css/blocks/:
#   powershell -File build-css.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

$files = @(
  "css/base/fonts.css",
  "css/base/variables.css",
  "css/base/reset.css",
  "css/base/typography.css",
  "css/base/layout.css",
  "css/blocks/header.css",
  "css/blocks/menu.css",
  "css/blocks/hero.css",
  "css/blocks/specialist.css",
  "css/blocks/docs.css",
  "css/blocks/location.css",
  "css/blocks/footer.css",
  "css/blocks/cookie.css",
  "css/blocks/privacy.css"
)

$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine(@"
/* ==========================================================================
   Shabash - bundled styles (no @import; one render-blocking request)
   Source modules: css/base/*, css/blocks/* - rebuild with: powershell -File build-css.ps1
   ========================================================================== */
"@)

foreach ($rel in $files) {
  $path = Join-Path $root $rel
  if (-not (Test-Path $path)) { throw "Missing CSS module: $rel" }
  $content = [System.IO.File]::ReadAllText($path)
  if ($rel -eq "css/base/fonts.css") {
    # paths were relative to css/base/; bundle lives in css/
    $content = $content -replace 'url\("\.\./\.\./fonts/', 'url("../fonts/'
  }
  [void]$sb.AppendLine("/* --- $rel --- */")
  [void]$sb.AppendLine($content.TrimEnd())
  [void]$sb.AppendLine()
}

$outPath = Join-Path $root "css/style.css"
[System.IO.File]::WriteAllText($outPath, $sb.ToString(), [System.Text.UTF8Encoding]::new($false))
Write-Host "Built $outPath ($((Get-Item $outPath).Length) bytes)"

# Also re-inline into index.html (keeps PageSpeed free of render-blocking CSS)
$inlineScript = Join-Path $root "inline-css.mjs"
if (Test-Path $inlineScript) {
  node $inlineScript
} else {
  Write-Host "Skip inline: inline-css.mjs not found"
}
