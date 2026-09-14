# Create a source-only ZIP for a Linux Node.js hosting panel.
# Explicit allowlist: never include node_modules, databases, .env or uploaded images.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$taskProject = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskOutputDir = Join-Path $taskProject 'dist-packages'
[System.IO.Directory]::CreateDirectory($taskOutputDir) | Out-Null
$taskOutput = Join-Path $taskOutputDir 'locket-chi-tieu-hosting.zip'
$taskFiles = @('index.js', 'package.json', 'package-lock.json', 'README.md', 'HUONG-DAN-HOSTING.md', 'HUONG-DAN-VERCEL.md', '.env.example', '.gitignore', '.nvmrc', 'vercel.json')
$taskFolders = @('api', 'public', 'src', 'views', 'tests', 'scripts', 'supabase')

$taskStream = [System.IO.File]::Open($taskOutput, [System.IO.FileMode]::Create)
$taskZip = [System.IO.Compression.ZipArchive]::new($taskStream, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($taskName in $taskFiles) {
        $taskFile = Join-Path $taskProject $taskName
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($taskZip, $taskFile, $taskName) | Out-Null
    }
    foreach ($taskFolder in $taskFolders) {
        Get-ChildItem -LiteralPath (Join-Path $taskProject $taskFolder) -Recurse -File | ForEach-Object {
            if ($_.Attributes -band [System.IO.FileAttributes]::ReparsePoint) { throw "Refusing linked file: $($_.FullName)" }
            $taskRelative = $_.FullName.Substring($taskProject.Length + 1).Replace('\', '/')
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($taskZip, $_.FullName, $taskRelative) | Out-Null
        }
    }
    $taskZip.CreateEntry('uploads/.gitkeep') | Out-Null
} finally {
    $taskZip.Dispose()
    $taskStream.Dispose()
}

$taskCheck = [System.IO.Compression.ZipFile]::OpenRead($taskOutput)
try {
    foreach ($taskEntry in $taskCheck.Entries) {
        if ($taskEntry.FullName -match '(^|/)node_modules/|\.node$|\.db(-wal|-shm)?$|(^|/)\.env$|^uploads/(?!\.gitkeep$)') {
            throw "Unexpected private or platform-specific file: $($taskEntry.FullName)"
        }
    }
    if (-not $taskCheck.GetEntry('index.js')) { throw 'Missing root entry point' }
    Write-Output "Verified $($taskCheck.Entries.Count) source files: $taskOutput"
} finally {
    $taskCheck.Dispose()
}
