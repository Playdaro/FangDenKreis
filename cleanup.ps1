# Löscht alle Dateien im aktuellen Ordner, die KEINE Dateiendung besitzen.
# JS-Dateien bleiben unangetastet.

Write-Host "Suche nach Dateien ohne Endung…" -ForegroundColor Cyan

$files = Get-ChildItem -File

foreach ($file in $files) {
    if ($file.Extension -eq "") {
        Write-Host "Lösche: $($file.Name)" -ForegroundColor Yellow
        Remove-Item $file.FullName -Force
    }
}

Write-Host "Bereinigung abgeschlossen!" -ForegroundColor Green
