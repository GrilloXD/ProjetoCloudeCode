param([Parameter(Mandatory=$true)][string]$Dir, [string]$Filter = '*.docx', [string]$Pdf = '')
# Para cada .docx: páginas, topo da 1ª linha do corpo e topo da última linha (pt, relativo à página)
$ErrorActionPreference = 'Stop'
$files = Get-ChildItem -LiteralPath $Dir -Filter $Filter | Where-Object { $_.Name -notlike '~$*' } | Sort-Object Name
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  foreach ($f in $files) {
    $doc = $word.Documents.Open($f.FullName, $false, $true)
    try {
      $doc.Repaginate()
      $pages = $doc.ComputeStatistics(2)
      $c = $doc.Content
      $first = $doc.Range($c.Start, $c.Start + 1)
      $lastPos = $c.End - 2
      $last = $doc.Range($lastPos, $lastPos + 1)
      $top = $first.Information(6)
      $bot = $last.Information(6)
      $pgLast = $last.Information(3)
      if ($Pdf -ne '' -and $f.Name -like $Pdf) { $doc.SaveAs2([ref]([System.IO.Path]::ChangeExtension($f.FullName, '.pdf')), [ref]17) }
      Write-Output ("{0}`t{1}`t{2}`t{3}`t{4}" -f $f.Name, $pages, $top, $bot, $pgLast)
    } finally { $doc.Close($false) }
  }
} finally { $word.Quit(); [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null }
