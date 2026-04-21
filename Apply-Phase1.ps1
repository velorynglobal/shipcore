# ============================================================
# ShipCore Pro — Phase 1 Update Script
# Run from: C:\Projects\shipcore
# Usage: .\Apply-Phase1.ps1 -ZipPath "C:\Users\YourName\Downloads\phase1-updates.zip"
# ============================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$ZipPath,

    [string]$ProjectPath = $PSScriptRoot
)

$ErrorActionPreference = "Stop"

# ── Colours ──────────────────────────────────────────────────
function Info  { param($m) Write-Host "  $m"            -ForegroundColor Cyan    }
function OK    { param($m) Write-Host "  ✓ $m"          -ForegroundColor Green   }
function Warn  { param($m) Write-Host "  ⚠ $m"          -ForegroundColor Yellow  }
function Err   { param($m) Write-Host "  ✗ $m"          -ForegroundColor Red     }
function Head  { param($m) Write-Host "`n━━ $m ━━"      -ForegroundColor White   }

# ── Banner ────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ╔══════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "  ║   ShipCore Pro — Phase 1 Installer   ║" -ForegroundColor Blue
Write-Host "  ╚══════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""

# ── Validate inputs ───────────────────────────────────────────
Head "Validating"

if (-not (Test-Path $ZipPath)) {
    Err "Zip not found: $ZipPath"
    exit 1
}
OK "Zip found: $ZipPath"

if (-not (Test-Path "$ProjectPath\src\app")) {
    Err "Not a ShipCore project: $ProjectPath"
    Warn "Run this script from C:\Projects\shipcore or pass -ProjectPath"
    exit 1
}
OK "Project root: $ProjectPath"

# ── Extract zip to temp ───────────────────────────────────────
Head "Extracting zip"

$TempDir = Join-Path $env:TEMP "shipcore-phase1-$(Get-Random)"
Expand-Archive -Path $ZipPath -DestinationPath $TempDir -Force
$Phase1 = Join-Path $TempDir "phase1"

if (-not (Test-Path $Phase1)) {
    # Try one level deeper
    $Phase1 = Get-ChildItem $TempDir -Directory | Select-Object -First 1 -ExpandProperty FullName
}
OK "Extracted to: $TempDir"

# ── File copy map ─────────────────────────────────────────────
# Format: [source relative to phase1] = [destination relative to ProjectPath]
$FileMappings = @{
    # New pages
    "settings\page.tsx"              = "src\app\settings\page.tsx"
    "settings\layout.tsx"            = "src\app\settings\layout.tsx"
    "tasks\page.tsx"                 = "src\app\tasks\page.tsx"
    "tasks\layout.tsx"               = "src\app\tasks\layout.tsx"

    # Enhanced pages (overwrite existing)
    "vendors-enhanced\page.tsx"      = "src\app\vendors\page.tsx"
    "vendors-enhanced\layout.tsx"    = "src\app\vendors\layout.tsx"
    "customs-enhanced\page.tsx"      = "src\app\customs\page.tsx"
    "customs-enhanced\layout.tsx"    = "src\app\customs\layout.tsx"

    # New API routes
    "api-settings-route.ts"          = "src\app\api\settings\route.ts"
    "api-tasks-route.ts"             = "src\app\api\tasks\route.ts"
    "api-tasks-id-route.ts"          = "src\app\api\tasks\[id]\route.ts"
    "api-users-route.ts"             = "src\app\api\users\route.ts"
    "api-vendor-bills-route.ts"      = "src\app\api\vendor-bills\route.ts"
}

Head "Copying files"

$Copied  = 0
$Created = 0

foreach ($entry in $FileMappings.GetEnumerator()) {
    $Src  = Join-Path $Phase1 $entry.Key
    $Dest = Join-Path $ProjectPath $entry.Value

    if (-not (Test-Path $Src)) {
        Warn "Source missing, skipping: $($entry.Key)"
        continue
    }

    $DestDir = Split-Path $Dest -Parent
    if (-not (Test-Path $DestDir)) {
        New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
        $Created++
        Info "Created dir: $DestDir"
    }

    $isNew = -not (Test-Path $Dest)
    Copy-Item -Path $Src -Destination $Dest -Force
    if ($isNew) {
        OK "Created: $($entry.Value)"
        $Created++
    } else {
        OK "Updated: $($entry.Value)"
        $Copied++
    }
}

# ── Patch AppShell.tsx ────────────────────────────────────────
Head "Patching AppShell.tsx"

$AppShell = Join-Path $ProjectPath "src\components\layout\AppShell.tsx"

if (-not (Test-Path $AppShell)) {
    Warn "AppShell.tsx not found — skipping nav patch"
} else {
    $content = Get-Content $AppShell -Raw

    # 1. Add CheckSquare to lucide-react import
    if ($content -notmatch "CheckSquare") {
        $content = $content -replace "(Building2, TrendingUp, FileSearch,? ?Brain?,?)", '$1 CheckSquare,'
        # Fallback: append to any lucide import line
        if ($content -notmatch "CheckSquare") {
            $content = $content -replace "} from 'lucide-react';", "  CheckSquare,`n} from 'lucide-react';"
        }
        OK "Added CheckSquare to lucide-react imports"
    } else {
        Warn "CheckSquare already imported — skipping"
    }

    # 2. Add Tasks nav item after agent-dashboard
    if ($content -notmatch "href: '/tasks'") {
        $taskNavItem = "      { href: '/tasks',         label: 'Tasks',            icon: CheckSquare,     roles: ['admin','operator'] },"
        $content = $content -replace "(.*href: '/agent-dashboard'.*)", "`$1`n$taskNavItem"
        OK "Added Tasks nav item to AppShell"
    } else {
        Warn "Tasks nav item already exists — skipping"
    }

    # 3. Write back
    Set-Content -Path $AppShell -Value $content -NoNewline
    OK "AppShell.tsx saved"
}

# ── Cleanup temp ──────────────────────────────────────────────
Remove-Item -Path $TempDir -Recurse -Force
OK "Temp files cleaned up"

# ── Git status ────────────────────────────────────────────────
Head "Git status"

$gitOutput = git -C $ProjectPath status --short 2>&1
if ($gitOutput) {
    Info "Changed files:"
    $gitOutput | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
} else {
    Warn "No git changes detected"
}

# ── Summary ───────────────────────────────────────────────────
Head "Summary"
Write-Host "  Files updated : $Copied"    -ForegroundColor Green
Write-Host "  Files created : $Created"   -ForegroundColor Green
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor White
Write-Host "    1. Review changes in VS Code" -ForegroundColor Gray
Write-Host "    2. Test locally:  npm run dev" -ForegroundColor Gray
Write-Host "    3. Commit:        git add ." -ForegroundColor Gray
Write-Host "               git commit -m `"Phase 1: settings, tasks, vendors, customs`"" -ForegroundColor Gray
Write-Host "    4. Push:          git push origin main" -ForegroundColor Gray
Write-Host ""
Write-Host "  New routes live after deploy:" -ForegroundColor White
Write-Host "    /settings     — Company, Tax, Bank, Notifications" -ForegroundColor Cyan
Write-Host "    /tasks        — Agent task board (Priority columns)" -ForegroundColor Cyan
Write-Host "    /vendors      — Vendors + Bills tab" -ForegroundColor Cyan
Write-Host "    /customs      — BE + Examination + Dipika AI notes" -ForegroundColor Cyan
Write-Host ""
