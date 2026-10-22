param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateSet('doctor', 'inspect', 'export', 'render', 'script')]
    [string]$Action,
    [string]$BlendFile,
    [string]$Output,
    [string]$Script
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot

function Resolve-ProjectPath([string]$PathValue) {
    if ([System.IO.Path]::IsPathRooted($PathValue)) {
        return [System.IO.Path]::GetFullPath($PathValue)
    }
    return [System.IO.Path]::GetFullPath((Join-Path $projectRoot $PathValue))
}

$blenderPath = $null
if ($env:BLENDER_EXE) {
    $blenderPath = $env:BLENDER_EXE
} else {
    $command = Get-Command blender.exe -ErrorAction SilentlyContinue
    if ($command) {
        $blenderPath = $command.Source
    } else {
        $installRoot = Join-Path $env:ProgramFiles 'Blender Foundation'
        if (Test-Path -LiteralPath $installRoot) {
            $blenderPath = Get-ChildItem -LiteralPath $installRoot -Directory |
                Sort-Object Name -Descending |
                ForEach-Object { Join-Path $_.FullName 'blender.exe' } |
                Where-Object { Test-Path -LiteralPath $_ } |
                Select-Object -First 1
        }
    }
}

if (-not $blenderPath -or -not (Test-Path -LiteralPath $blenderPath -PathType Leaf)) {
    throw 'Blender introuvable. Définis BLENDER_EXE avec le chemin de blender.exe.'
}

$arguments = @('--background', '--factory-startup', '--python-exit-code', '1')
if ($Action -ne 'doctor') {
    if (-not $BlendFile -and $Action -ne 'script') {
        throw "L'action $Action nécessite -BlendFile."
    }
    if ($BlendFile) {
        $blendPath = Resolve-ProjectPath $BlendFile
        if (-not (Test-Path -LiteralPath $blendPath -PathType Leaf)) {
            throw "Fichier Blender introuvable : $blendPath"
        }
        $arguments += $blendPath
    }
}

if ($Action -eq 'script') {
    if (-not $Script) {
        throw "L'action script nécessite -Script."
    }
    $scriptPath = Resolve-ProjectPath $Script
    if (-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)) {
        throw "Script introuvable : $scriptPath"
    }
    $arguments += @('--python', $scriptPath)
} else {
    $arguments += @('--python', (Join-Path $PSScriptRoot 'blender_bridge.py'), '--', $Action)
    if ($Action -in @('export', 'render')) {
        if (-not $Output) {
            throw "L'action $Action nécessite -Output."
        }
        $outputPath = Resolve-ProjectPath $Output
        $expectedExtension = if ($Action -eq 'export') { '.glb' } else { '.png' }
        if ([System.IO.Path]::GetExtension($outputPath).ToLowerInvariant() -ne $expectedExtension) {
            throw "L'action $Action nécessite une sortie $expectedExtension."
        }
        $arguments += $outputPath
    }
}

& $blenderPath @arguments
if ($LASTEXITCODE -ne 0) {
    throw "Blender a échoué avec le code $LASTEXITCODE."
}
