# 옵시디언 자동 받기 (윈도우 PC용)
# 하는 일: 깃허브 저장소의 data/obsidian/지식센터 폴더를 내려받아
#          내 옵시디언 볼트 폴더(기본 D:\mybrain\Clippings\지식센터)에 똑같이 맞춰 줍니다.
# 쓰는 법:
#   1) 한 번 직접 실행:   powershell -ExecutionPolicy Bypass -File 옵시디언_자동받기.ps1
#   2) 매일 아침 07:30 자동 실행 등록(한 번만):  ... -File 옵시디언_자동받기.ps1 -Register
# 준비물: git 이 설치되어 있어야 합니다.
param(
    [string]$Target = "D:\mybrain\Clippings\지식센터",
    [string]$Repo = "https://github.com/kwang-gi/pro_01.git",
    [string]$Branch = "",  # 비워두면 저장소 기본 브랜치
    [switch]$Register
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

if ($Register) {
    $script = $MyInvocation.MyCommand.Path
    $arg = "-NoProfile -ExecutionPolicy Bypass -File `"$script`" -Target `"$Target`" -Repo `"$Repo`" -Branch `"$Branch`""
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $arg
    $trigger = New-ScheduledTaskTrigger -Daily -At "07:30"
    Register-ScheduledTask -TaskName "옵시디언_자동받기" -Action $action -Trigger $trigger -Force | Out-Null
    Write-Host "등록 완료: 매일 07:30 에 자동으로 받아옵니다."
    return
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "git 이 없습니다. https://git-scm.com 에서 설치한 뒤 다시 실행하세요."
    exit 1
}

$work = Join-Path $env:LOCALAPPDATA "pro_01_sync"
if (Test-Path (Join-Path $work ".git")) {
    Write-Host "기존 복사본을 최신으로 갱신합니다..."
    git -C $work pull --ff-only
} else {
    Write-Host "처음 받는 중입니다(필요한 폴더만)..."
    $branchArgs = @()
    if ($Branch) { $branchArgs = @("--branch", $Branch) }
    git clone --depth 1 --filter=blob:none --sparse @branchArgs $Repo $work
    git -C $work sparse-checkout set data/obsidian
}
if ($LASTEXITCODE -ne 0) { Write-Host "받기에 실패했습니다."; exit 1 }

$src = Join-Path $work "data\obsidian\지식센터"
if (-not (Test-Path $src)) {
    Write-Host "저장소에 아직 data/obsidian/지식센터 폴더가 없습니다."
    exit 1
}

New-Item -ItemType Directory -Force -Path $Target | Out-Null
robocopy $src $Target /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
# robocopy 는 8 미만이면 성공
if ($LASTEXITCODE -ge 8) { Write-Host "복사에 실패했습니다(코드 $LASTEXITCODE)."; exit 1 }
Write-Host "완료: $Target"
exit 0
