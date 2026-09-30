# build-brand-assets.ps1
# LATAWEL brand asset pipeline - PowerShell 5.1 + System.Drawing
# Re-runnable: powershell -ExecutionPolicy Bypass -File scripts\assets\build-brand-assets.ps1
# ASCII-only by policy. Read-only over logos\ originals (never moved/modified).
# Output confined to assets\brand\ .

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# ---- paths ---------------------------------------------------------------
$root     = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$logosDir = Join-Path $root 'logos'
$brandDir = Join-Path $root 'assets\brand'
$favDir   = Join-Path $brandDir 'favicon'
$ogDir    = Join-Path $brandDir 'og'

foreach ($d in @($brandDir, $favDir, $ogDir)) {
    if (-not (Test-Path -LiteralPath $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
}

# ---- helpers -------------------------------------------------------------
# Read from memory (not FromFile) so the source file is never locked; this
# allows a derivative to overwrite a normalized copy with the same name.
function Load-Argb {
    param([string]$Path)
    $bytes = [System.IO.File]::ReadAllBytes($Path)
    $ms = New-Object System.IO.MemoryStream
    $ms.Write($bytes, 0, $bytes.Length)
    $ms.Position = 0
    $src = [System.Drawing.Image]::FromStream($ms)
    $rect = New-Object System.Drawing.Rectangle 0, 0, $src.Width, $src.Height
    $bmp = $src.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $src.Dispose()
    $ms.Dispose()
    return $bmp
}

function Resize-Image {
    param([System.Drawing.Image]$Source, [int]$Width, [int]$Height)
    $bmp = New-Object System.Drawing.Bitmap $Width, $Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $bmp.SetResolution(96, 96)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.CompositingMode    = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($Source, (New-Object System.Drawing.Rectangle 0, 0, $Width, $Height))
    $g.Dispose()
    return $bmp
}

# Progressive halving avoids aliasing when downscaling far (e.g. 1277 -> 16).
function Resize-Progressive {
    param([System.Drawing.Image]$Source, [int]$Width, [int]$Height)
    $cur = $Source
    $owned = $false
    while ((($cur.Width / 2) -ge $Width) -and (($cur.Height / 2) -ge $Height) -and ($cur.Width -gt 2) -and ($cur.Height -gt 2)) {
        $nw = [Math]::Max($Width,  [int][Math]::Floor($cur.Width / 2))
        $nh = [Math]::Max($Height, [int][Math]::Floor($cur.Height / 2))
        $next = Resize-Image -Source $cur -Width $nw -Height $nh
        if ($owned) { $cur.Dispose() }
        $cur = $next
        $owned = $true
    }
    $final = Resize-Image -Source $cur -Width $Width -Height $Height
    if ($owned) { $cur.Dispose() }
    return $final
}

function Save-Png {
    param([System.Drawing.Bitmap]$Bmp, [string]$Path)
    $Bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
}

# Recolor dark neutral pixels (wordmark + separator) to pure white #FFFFFF,
# keep saturated orange symbol untouched. Alpha preserved (this is straight
# ARGB, not premultiplied). MaxLuma defaults to 130 (horizontal artwork, one
# neutral black family); the vertical artwork carries a gray elliptical shadow
# (luma ~160) plus a soft antialias skirt, so it uses MaxLuma 90 to whiten the
# wordmark only and leave the shadow untouched.
function Convert-DarkToWhite {
    param([System.Drawing.Bitmap]$Bmp, [int]$MaxLuma = 130)
    $w = $Bmp.Width; $h = $Bmp.Height
    $rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
    $data = $Bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $stride = $data.Stride
    $bytes = New-Object byte[] ($stride * $h)
    [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
    for ($y = 0; $y -lt $h; $y++) {
        $row = $y * $stride
        for ($x = 0; $x -lt $w; $x++) {
            $i = $row + $x * 4
            $a = $bytes[$i + 3]
            if ($a -eq 0) { continue }
            $b = $bytes[$i]; $g = $bytes[$i + 1]; $r = $bytes[$i + 2]
            $mx = [Math]::Max($r, [Math]::Max($g, $b))
            $mn = [Math]::Min($r, [Math]::Min($g, $b))
            $sat = $mx - $mn
            if (($sat -lt 40) -and ($mx -lt $MaxLuma)) {
                $bytes[$i] = 255; $bytes[$i + 1] = 255; $bytes[$i + 2] = 255
            }
        }
    }
    [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $data.Scan0, $bytes.Length)
    $Bmp.UnlockBits($data)
}

# ICO container with PNG-compressed entries (Vista+ / all modern browsers).
function New-IcoFile {
    param([System.Drawing.Bitmap[]]$Bitmaps, [string]$Path)
    $png = @()
    foreach ($b in $Bitmaps) {
        $ms = New-Object System.IO.MemoryStream
        $b.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $png += , ($ms.ToArray())
        $ms.Dispose()
    }
    $count = $Bitmaps.Count
    $out = New-Object System.IO.MemoryStream
    $bw = New-Object System.IO.BinaryWriter($out)
    $bw.Write([uint16]0)      # reserved
    $bw.Write([uint16]1)      # type = icon
    $bw.Write([uint16]$count) # image count
    $offset = 6 + 16 * $count
    for ($k = 0; $k -lt $count; $k++) {
        $wb = if ($Bitmaps[$k].Width  -ge 256) { 0 } else { $Bitmaps[$k].Width }
        $hb = if ($Bitmaps[$k].Height -ge 256) { 0 } else { $Bitmaps[$k].Height }
        $bw.Write([byte]$wb)
        $bw.Write([byte]$hb)
        $bw.Write([byte]0)   # color count
        $bw.Write([byte]0)   # reserved
        $bw.Write([uint16]1) # color planes
        $bw.Write([uint16]32)
        $bw.Write([uint32]$png[$k].Length)
        $bw.Write([uint32]$offset)
        $offset += $png[$k].Length
    }
    foreach ($d in $png) { $bw.Write($d) }
    $bw.Flush()
    [System.IO.File]::WriteAllBytes($Path, $out.ToArray())
    $bw.Dispose(); $out.Dispose()
}

function Test-HasAlpha {
    param([string]$Path)
    $bmp = [System.Drawing.Bitmap]::FromFile($Path)
    $w = $bmp.Width; $h = $bmp.Height
    $rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
    $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $stride = $data.Stride
    $bytes = New-Object byte[] ($stride * $h)
    [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
    $bmp.UnlockBits($data); $bmp.Dispose()
    $found = $false
    for ($y = 0; $y -lt $h -and -not $found; $y++) {
        $row = $y * $stride
        for ($x = 0; $x -lt $w; $x += 2) {
            if ($bytes[$row + $x * 4 + 3] -lt 255) { $found = $true; break }
        }
    }
    return $found
}

# ---- 1. normalized copies from logos\ (originals untouched) --------------
$sources = @(
    @{ Src = 'logo horizontal la tawel.png'; Dst = 'latawel-logo-horizontal.png' },
    @{ Src = 'Logo vertical.png';           Dst = 'latawel-logo-vertical.png' },
    @{ Src = 'boton.png';                   Dst = 'latawel-simbolo.png' },
    @{ Src = 'boton vertical latawel.png';  Dst = 'latawel-lockup.png' }
)
foreach ($s in $sources) {
    $src = Join-Path $logosDir $s.Src
    if (-not (Test-Path -LiteralPath $src)) { throw "Missing source: $src" }
    Copy-Item -LiteralPath $src -Destination (Join-Path $brandDir $s.Dst) -Force
}

# ---- 2. web derivatives (2x / 1x), alpha kept ----------------------------
$horSrc = Load-Argb (Join-Path $brandDir 'latawel-logo-horizontal.png')
$verSrc = Load-Argb (Join-Path $brandDir 'latawel-logo-vertical.png')

$hor2x = Resize-Progressive -Source $horSrc -Width 480 -Height ([int][Math]::Round(480 * $horSrc.Height / $horSrc.Width))
$hor1x = Resize-Progressive -Source $horSrc -Width 240 -Height ([int][Math]::Round(240 * $horSrc.Height / $horSrc.Width))
Save-Png $hor2x (Join-Path $brandDir 'latawel-logo-horizontal@2x.png')
Save-Png $hor1x (Join-Path $brandDir 'latawel-logo-horizontal.png')
$hor2x.Dispose(); $hor1x.Dispose()

$ver2x = Resize-Progressive -Source $verSrc -Width 480 -Height ([int][Math]::Round(480 * $verSrc.Height / $verSrc.Width))
$ver1x = Resize-Progressive -Source $verSrc -Width 240 -Height ([int][Math]::Round(240 * $verSrc.Height / $verSrc.Width))
Save-Png $ver2x (Join-Path $brandDir 'latawel-logo-vertical@2x.png')
Save-Png $ver1x (Join-Path $brandDir 'latawel-logo-vertical.png')
$ver2x.Dispose(); $ver1x.Dispose()

# ---- 3. dark-background variant (white wordmark, orange symbol) ----------
# Recolor from the FULL-RES original (not the 1x derivative) for max quality.
$white = Load-Argb (Join-Path $logosDir 'logo horizontal la tawel.png')
Convert-DarkToWhite $white
$white1x = Resize-Progressive -Source $white -Width 240 -Height ([int][Math]::Round(240 * $white.Height / $white.Width))
Save-Png $white1x (Join-Path $brandDir 'latawel-logo-horizontal-white.png')
$white1x.Dispose(); $white.Dispose()

# Vertical lockup dark variant: orange symbol + gray shadow stay as-is, only
# the dark wordmark turns white. MaxLuma 90 keeps the shadow (luma ~160).
$vwhite = Load-Argb (Join-Path $logosDir 'Logo vertical.png')
Convert-DarkToWhite $vwhite -MaxLuma 90
$vwhite2x = Resize-Progressive -Source $vwhite -Width 480 -Height ([int][Math]::Round(480 * $vwhite.Height / $vwhite.Width))
$vwhite1x = Resize-Progressive -Source $vwhite -Width 240 -Height ([int][Math]::Round(240 * $vwhite.Height / $vwhite.Width))
Save-Png $vwhite2x (Join-Path $brandDir 'latawel-logo-vertical-white@2x.png')
Save-Png $vwhite1x (Join-Path $brandDir 'latawel-logo-vertical-white.png')
$vwhite2x.Dispose(); $vwhite1x.Dispose(); $vwhite.Dispose()

# ---- 4. favicon set (square pad first, never distort the circle) ---------
$sym = Load-Argb (Join-Path $brandDir 'latawel-simbolo.png')
$side = [Math]::Max($sym.Width, $sym.Height)
$sq = New-Object System.Drawing.Bitmap $side, $side, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$sq.SetResolution(96, 96)
$sg = [System.Drawing.Graphics]::FromImage($sq)
$sg.Clear([System.Drawing.Color]::Transparent)
$sg.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$sg.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$sg.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$ox = [int](($side - $sym.Width) / 2)
$oy = [int](($side - $sym.Height) / 2)
$sg.DrawImage($sym, $ox, $oy, $sym.Width, $sym.Height)
$sg.Dispose()

$fav16 = Resize-Progressive -Source $sq -Width 16  -Height 16
$fav32 = Resize-Progressive -Source $sq -Width 32  -Height 32
$fav48 = Resize-Progressive -Source $sq -Width 48  -Height 48
$fav180 = Resize-Progressive -Source $sq -Width 180 -Height 180
Save-Png $fav16  (Join-Path $favDir 'favicon-16.png')
Save-Png $fav32  (Join-Path $favDir 'favicon-32.png')
Save-Png $fav180 (Join-Path $favDir 'favicon-180.png')
New-IcoFile -Bitmaps @($fav16, $fav32, $fav48) -Path (Join-Path $favDir 'favicon.ico')
$fav16.Dispose(); $fav32.Dispose(); $fav48.Dispose(); $fav180.Dispose(); $sq.Dispose(); $sym.Dispose()

# ---- 5. Open Graph 1200x630 on white --------------------------------
$canvas = New-Object System.Drawing.Bitmap 1200, 630, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$canvas.SetResolution(96, 96)
$cg = [System.Drawing.Graphics]::FromImage($canvas)
$cg.Clear([System.Drawing.Color]::White)
$cg.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$cg.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$cg.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$cg.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$maxW = 1080; $maxH = 510   # guarantees >= 60px side margin on 1200x630
$scale = [Math]::Min($maxW / $horSrc.Width, $maxH / $horSrc.Height)
$lw = [int][Math]::Round($horSrc.Width * $scale)
$lh = [int][Math]::Round($horSrc.Height * $scale)
$lx = [int](1200 - $lw) / 2
$ly = [int](630 - $lh) / 2
$cg.DrawImage($horSrc, $lx, $ly, $lw, $lh)
$cg.Dispose()
Save-Png $canvas (Join-Path $ogDir 'latawel-og-1200x630.png')
$canvas.Dispose()
$horSrc.Dispose(); $verSrc.Dispose()

# ---- verification (real files, real dimensions) --------------------------
Write-Host ''
Write-Host 'LATAWEL brand assets - verification' -ForegroundColor Cyan
Write-Host ('{0,-42} {1,-12} {2,9} {3,6}' -f 'FILE', 'WxH', 'KB', 'ALPHA')
Write-Host ('-' * 74)
$targets = @(
    'latawel-logo-horizontal.png',
    'latawel-logo-horizontal@2x.png',
    'latawel-logo-vertical.png',
    'latawel-logo-vertical@2x.png',
    'latawel-logo-horizontal-white.png',
    'latawel-logo-vertical-white.png',
    'latawel-logo-vertical-white@2x.png',
    'latawel-simbolo.png',
    'latawel-lockup.png',
    'favicon\favicon-16.png',
    'favicon\favicon-32.png',
    'favicon\favicon-180.png',
    'favicon\favicon.ico',
    'og\latawel-og-1200x630.png'
)
foreach ($rel in $targets) {
    $p = Join-Path $brandDir $rel
    $kb = [Math]::Round((Get-Item -LiteralPath $p).Length / 1KB, 1)
    $dim = ''
    $alpha = ''
    if ($rel -like '*.ico') {
        $dim = 'multi'
        $alpha = 'yes'
    } else {
        try {
            $im = [System.Drawing.Image]::FromFile($p)
            $dim = "$($im.Width)x$($im.Height)"
            $im.Dispose()
            $alpha = if (Test-HasAlpha $p) { 'yes' } else { 'no' }
        } catch { $dim = 'ERROR'; $alpha = '-' }
    }
    Write-Host ('{0,-42} {1,-12} {2,9} {3,6}' -f $rel, $dim, $kb, $alpha)
}
Write-Host ('-' * 74)
Write-Host 'Done.' -ForegroundColor Green
