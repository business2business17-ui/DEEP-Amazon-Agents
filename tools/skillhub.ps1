#!/usr/bin/env pwsh
<#
Skill Hub for OpenCode — link skills from the DEEP repos into the global
OpenCode skills directory on demand, instead of loading all ~500 at once.

Usage:
  skillhub.ps1                     # same as: status
  skillhub.ps1 list [filter]       # available + installed (filter = substring)
  skillhub.ps1 add <id> [<id>...]  # link skill(s) into ~/.config/opencode/skills
  skillhub.ps1 remove <id> [...]   # unlink (never touches the source)
  skillhub.ps1 status              # what is linked right now
  skillhub.ps1 sources             # scan roots and counts

Links are directory junctions, so a skill stays in sync with its repo:
editing SKILL.md in the repo updates what OpenCode loads.
#>
[CmdletBinding()]
param(
  [Parameter(Position = 0)]
  [string]$Action = 'status',
  [Parameter(Position = 1, ValueFromRemainingArguments = $true)]
  [string[]]$Ids = @()
)

$ErrorActionPreference = 'Stop'
$Hub = Join-Path $env:USERPROFILE '.config\opencode\skills'

# Source roots, highest priority first. First hit for an id wins.
$Roots = @(
  @{ Name = 'amazon-agents';   Path = 'C:\Users\adria\AMAZON\DEEP-Amazon-Agents\plugins' },
  @{ Name = 'marketplace';     Path = 'C:\Users\adria\AMAZON\DEEP-Marketplace-Agents' },
  @{ Name = 'agents-design';   Path = 'C:\Users\adria\Agents\plugins' }
)

$MaxDepth = 8
$IdPattern = '^[a-z0-9]+(-[a-z0-9]+)*$'

function Get-Description([string]$skillMd) {
  try {
    $head = Get-Content -LiteralPath $skillMd -TotalCount 40 -Encoding UTF8 -ErrorAction Stop
  } catch { return '' }
  $inFm = $false; $desc = ''
  foreach ($line in $head) {
    if ($line -eq '---') {
      if (-not $inFm) { $inFm = $true; continue } else { break }
    }
    if ($inFm -and $line -match '^description:\s*(.+)$') { $desc = $Matches[1].Trim().Trim('"', "'"); break }
  }
  if (-not $desc) {
    foreach ($line in $head) { if ($line -and $line -notmatch '^(---|#)') { $desc = $line.Trim(); break } }
  }
  if ($desc.Length -gt 110) { $desc = $desc.Substring(0, 107) + '...' }
  return $desc
}

function Get-Index {
  $index = [ordered]@{}
  foreach ($root in $Roots) {
    if (-not (Test-Path -LiteralPath $root.Path)) { continue }
    $files = Get-ChildItem -LiteralPath $root.Path -Recurse -Filter 'SKILL.md' -File -Depth $MaxDepth -ErrorAction SilentlyContinue
    foreach ($f in $files) {
      if ($f.FullName -match '\\node_modules\\|\\\.git\\') { continue }
      $dir = Split-Path $f.FullName -Parent
      $id = Split-Path $dir -Leaf
      if ($id -notmatch $IdPattern) { continue }
      if ($index.Contains($id)) { continue }
      $index[$id] = [pscustomobject]@{
        Id     = $id
        Path   = $dir
        Source = $root.Name
        Desc   = (Get-Description $f.FullName)
      }
    }
  }
  return $index
}

function Get-Installed {
  $map = @{}
  if (-not (Test-Path -LiteralPath $Hub)) { return $map }
  foreach ($d in Get-ChildItem -LiteralPath $Hub -Directory -Force -ErrorAction SilentlyContinue) {
    $map[$d.Name] = $d
  }
  return $map
}

function Test-Link([string]$path) {
  $item = Get-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
  return ($item -and ($item.Attributes -band [IO.FileAttributes]::ReparsePoint))
}

function Show-List([string]$filter) {
  $index = Get-Index
  $installed = Get-Installed
  $rows = $index.Values | Where-Object { -not $filter -or $_.Id -like "*$filter*" -or $_.Desc -like "*$filter*" }
  if (-not $rows) { Write-Output "no skills match '$filter'"; return }
  $on = @($rows | Where-Object { $installed.ContainsKey($_.Id) }).Count
  Write-Output ("{0} skills found ({1} linked)  hub: {2}`n" -f @($rows).Count, $on, $Hub)
  foreach ($r in ($rows | Sort-Object Source, Id)) {
    $mark = if ($installed.ContainsKey($r.Id)) { '[on] ' } else { '[  ] ' }
    Write-Output ("{0}{1,-34} {2,-14} {3}" -f $mark, $r.Id, $r.Source, $r.Desc)
  }
  Write-Output "`nadd:  /skill add <id>     remove: /skill remove <id>     all: /skill add all"
  Write-Output "linked skills appear right away; if one is missing from the model list, run /reload"
}

function Show-Status {
  $installed = Get-Installed
  $index = Get-Index
  if ($installed.Count -eq 0) { Write-Output "nothing linked yet. try: /skill list amazon"; return }
  Write-Output ("{0} linked in {1}" -f $installed.Count, $Hub)
  foreach ($k in ($installed.Keys | Sort-Object)) {
    $item = $installed[$k]
    $isLink = ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)
    $target = ''
    if ($isLink) { try { $target = (Get-Item -LiteralPath $item.FullName -Force).Target } catch {} }
    $state = if (-not $isLink) { 'local' } elseif ($target -and (Test-Path -LiteralPath $target)) { 'ok' } else { 'BROKEN' }
    Write-Output ("  {0,-34} {1,-7} {2}" -f $k, $state, $target)
  }
  $known = @($installed.Keys | Where-Object { -not $index.Contains($_) })
  if ($known) { Write-Output ("`nnot from the repos (manual): " + ($known -join ', ')) }
}

function Add-Skills([string[]]$wanted) {
  if (-not $wanted) { Write-Output "usage: /skill add <id> [<id>...]"; return }
  $index = Get-Index
  if ($wanted.Count -eq 1 -and $wanted[0] -eq 'all') { $wanted = @($index.Keys) }
  if (-not (Test-Path -LiteralPath $Hub)) { New-Item -ItemType Directory -Path $Hub -Force | Out-Null }
  $added = 0; $skipped = 0; $missing = @()
  foreach ($id in $wanted) {
    if (-not $index.Contains($id)) { $missing += $id; continue }
    $dest = Join-Path $Hub $id
    if (Test-Path -LiteralPath $dest) {
      if (Test-Link $dest) { $skipped++; Write-Output "  already linked: $id"; continue }
      Write-Output "  SKIP $id : a real folder already exists at $dest"; $skipped++; continue
    }
    $src = $index[$id].Path
    New-Item -ItemType Junction -Path $dest -Target $src | Out-Null
    Write-Output "  linked: $id  ->  $src"
    $added++
  }
  if ($missing) { Write-Output ("  not found: " + ($missing -join ', ')) }
  Write-Output ""
  Write-Output ("linked {0}, skipped {1}, missing {2}" -f $added, $skipped, $missing.Count)
  if ($added -gt 0) { Write-Output "if a linked skill does not show up in the model list, run /reload" }
}

function Remove-Skills([string[]]$wanted) {
  if (-not $wanted) { Write-Output "usage: /skill remove <id> [<id>...]"; return }
  if ($wanted.Count -eq 1 -and $wanted[0] -eq 'all') { $wanted = @((Get-Installed).Keys) }
  $removed = 0
  foreach ($id in $wanted) {
    $dest = Join-Path $Hub $id
    if (-not (Test-Path -LiteralPath $dest)) { Write-Output "  not linked: $id"; continue }
    if (-not (Test-Link $dest)) { Write-Output "  REFUSE $id : not a junction (real folder, left untouched)"; continue }
    # Directory.Delete on a reparse point removes the link only, never the target.
    [System.IO.Directory]::Delete($dest, $false)
    Write-Output "  unlinked: $id"
    $removed++
  }
  Write-Output ("`nunlinked {0}" -f $removed)
  if ($removed -gt 0) { Write-Output "if a removed skill is still offered, run /reload" }
}

function Show-Sources {
  Write-Output "hub: $Hub`n"
  foreach ($root in $Roots) {
    if (-not (Test-Path -LiteralPath $root.Path)) { Write-Output ("{0,-14} MISSING  {1}" -f $root.Name, $root.Path); continue }
    $n = (Get-ChildItem -LiteralPath $root.Path -Recurse -Filter 'SKILL.md' -File -Depth $MaxDepth -ErrorAction SilentlyContinue).Count
    Write-Output ("{0,-14} {1,4} skills  {2}" -f $root.Name, $n, $root.Path)
  }
}

switch ($Action.ToLower()) {
  'list'    { Show-List ($Ids -join ' ') }
  'ls'      { Show-List ($Ids -join ' ') }
  'add'     { Add-Skills $Ids }
  'install' { Add-Skills $Ids }
  'remove'  { Remove-Skills $Ids }
  'rm'      { Remove-Skills $Ids }
  'unlink'  { Remove-Skills $Ids }
  'status'  { Show-Status }
  'sources' { Show-Sources }
  'help'    { Get-Help $PSCommandPath -Detailed | Out-String | Write-Output }
  default   { Show-List $Action }
}
