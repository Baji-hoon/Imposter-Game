Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\LOQ\.gemini\antigravity-ide\brain\8455e3f4-77dd-41d9-8c6c-17b4d4600d17\.user_uploaded\media_1790860338489.jpg"
$baseDir = "c:\Users\LOQ\OneDrive\Documents\Imposter Game"
$assetsDir = Join-Path $baseDir "apps\mobile\assets"
$resDir = Join-Path $baseDir "apps\mobile\android\app\src\main\res"

if (-not (Test-Path $srcPath)) {
    Write-Error "Source image not found: $srcPath"
    exit 1
}

$rawBmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$width = $rawBmp.Width
$height = $rawBmp.Height

# Create a 32-bit ARGB bitmap
$cleanBmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($cleanBmp)
$graphics.DrawImage($rawBmp, 0, 0, $width, $height)
$graphics.Dispose()
$rawBmp.Dispose()

# The dark background color: #190C28 (R=25, G=12, B=40)
$darkBg = [System.Drawing.Color]::FromArgb(255, 25, 12, 40)
$transparent = [System.Drawing.Color]::FromArgb(0, 0, 0, 0)

# Flood fill or corner threshold: any pixel with R > 240, G > 240, B > 240 near the outer corners
# We can do a BFS flood fill from the 4 corners to convert the outer white backdrop to darkBg
$visited = New-Object 'bool[,]' $width, $height
$queue = New-Object System.Collections.Generic.Queue[System.Drawing.Point]

# Seed corners
$corners = @(
    [System.Drawing.Point]::new(0, 0),
    [System.Drawing.Point]::new($width - 1, 0),
    [System.Drawing.Point]::new(0, $height - 1),
    [System.Drawing.Point]::new($width - 1, $height - 1)
)

foreach ($pt in $corners) {
    $c = $cleanBmp.GetPixel($pt.X, $pt.Y)
    if ($c.R -gt 220 -and $c.G -gt 220 -and $c.B -gt 220) {
        $queue.Enqueue($pt)
        $visited[$pt.X, $pt.Y] = $true
    }
}

$dx = @(1, -1, 0, 0)
$dy = @(0, 0, 1, -1)

while ($queue.Count -gt 0) {
    $curr = $queue.Dequeue()
    $cleanBmp.SetPixel($curr.X, $curr.Y, $darkBg)

    for ($i = 0; $i -lt 4; $i++) {
        $nx = $curr.X + $dx[$i]
        $ny = $curr.Y + $dy[$i]

        if ($nx -ge 0 -and $nx -lt $width -and $ny -ge 0 -and $ny -lt $height) {
            if (-not $visited[$nx, $ny]) {
                $visited[$nx, $ny] = $true
                $c = $cleanBmp.GetPixel($nx, $ny)
                # If pixel is near-white (background of mockup)
                if ($c.R -gt 210 -and $c.G -gt 210 -and $c.B -gt 210) {
                    $queue.Enqueue([System.Drawing.Point]::new($nx, $ny))
                }
            }
        }
    }
}

Write-Host "Corner fill complete. Full seamless icon created."

# 1. Save main app icon (1024x1024)
$iconPngPath = Join-Path $assetsDir "icon.png"
$cleanBmp.Save($iconPngPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved: $iconPngPath"

# Save splash icon and logo
$logoPngPath = Join-Path $assetsDir "logo.png"
$cleanBmp.Save($logoPngPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved: $logoPngPath"

# 2. Adaptive Icon Foreground:
# For adaptive icons, Android recommends placing critical content within 66% - 70% safe zone
# We'll create a 1024x1024 foreground where the logo is scaled down to ~72% (737px) and centered on a transparent background
$fgBmp = New-Object System.Drawing.Bitmap(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$fgG = [System.Drawing.Graphics]::FromImage($fgBmp)
$fgG.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$fgG.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$fgG.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$fgG.Clear($transparent)

$targetScale = 0.72
$destW = [int]($width * $targetScale)
$destH = [int]($height * $targetScale)
$destX = [int]((1024 - $destW) / 2)
$destY = [int]((1024 - $destH) / 2)

$fgG.DrawImage($cleanBmp, $destX, $destY, $destW, $destH)
$fgG.Dispose()

$fgPngPath = Join-Path $assetsDir "android-icon-foreground.png"
$fgBmp.Save($fgPngPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved: $fgPngPath"

# 3. Android adaptive background: solid #190C28
$bgBmp = New-Object System.Drawing.Bitmap(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$bgG = [System.Drawing.Graphics]::FromImage($bgBmp)
$bgG.Clear($darkBg)
$bgG.Dispose()
$bgPngPath = Join-Path $assetsDir "android-icon-background.png"
$bgBmp.Save($bgPngPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved: $bgPngPath"

# Helper function to resize and save
function Resize-Bitmap($src, $w, $h) {
    $dest = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($src, 0, 0, $w, $h)
    $g.Dispose()
    return $dest
}

# Android mipmap densities and standard launcher icon sizes
$densities = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
}

# Adaptive foreground sizes (108dp base)
$fgDensities = @{
    "mipmap-mdpi" = 108
    "mipmap-hdpi" = 162
    "mipmap-xhdpi" = 216
    "mipmap-xxhdpi" = 324
    "mipmap-xxxhdpi" = 432
}

foreach ($entry in $densities.GetEnumerator()) {
    $folder = Join-Path $resDir $entry.Key
    $size = $entry.Value
    if (Test-Path $folder) {
        $resized = Resize-Bitmap $cleanBmp $size $size
        
        # Save as PNG
        $resized.Save((Join-Path $folder "ic_launcher.png"), [System.Drawing.Imaging.ImageFormat]::Png)
        $resized.Save((Join-Path $folder "ic_launcher_round.png"), [System.Drawing.Imaging.ImageFormat]::Png)
        
        # Also remove old .webp to avoid resource conflicts or ensure our new icons take precedence
        $webpLauncher = Join-Path $folder "ic_launcher.webp"
        $webpRound = Join-Path $folder "ic_launcher_round.webp"
        if (Test-Path $webpLauncher) { Remove-Item $webpLauncher -Force }
        if (Test-Path $webpRound) { Remove-Item $webpRound -Force }
        
        $resized.Dispose()
    }
}

foreach ($entry in $fgDensities.GetEnumerator()) {
    $folder = Join-Path $resDir $entry.Key
    $fgSize = $entry.Value
    if (Test-Path $folder) {
        # Foreground
        $resizedFg = Resize-Bitmap $fgBmp $fgSize $fgSize
        $resizedFg.Save((Join-Path $folder "ic_launcher_foreground.png"), [System.Drawing.Imaging.ImageFormat]::Png)
        $webpFg = Join-Path $folder "ic_launcher_foreground.webp"
        if (Test-Path $webpFg) { Remove-Item $webpFg -Force }
        $resizedFg.Dispose()
        
        # Background
        $resizedBg = Resize-Bitmap $bgBmp $fgSize $fgSize
        $resizedBg.Save((Join-Path $folder "ic_launcher_background.png"), [System.Drawing.Imaging.ImageFormat]::Png)
        $webpBg = Join-Path $folder "ic_launcher_background.webp"
        if (Test-Path $webpBg) { Remove-Item $webpBg -Force }
        $resizedBg.Dispose()
    }
}

Write-Host "All Android mipmap icons generated successfully!"

$cleanBmp.Dispose()
$fgBmp.Dispose()
$bgBmp.Dispose()

