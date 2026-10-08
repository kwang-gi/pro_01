@echo off
chcp 65001 >nul
rem 영상 스크립트 수집 (실장님 PC 전용, 월·목 06:35 예약)
rem 유튜브가 클라우드를 봇으로 막아서 PC에서 받는다. 받은 것은 저장소에 올리고, 하이쿠 가공은 08:20 루틴이 한다.
set REPO=D:\test_d\pro_01_collect
cd /d %REPO% || exit /b 1
git pull -q origin manual-creation
python -m pip install -q -U yt-dlp
python automation\scripts\yt_scripts.py --limit 30 >> data\scripts\_pc_log.txt 2>&1
git add data/scripts
git diff --cached --quiet || git commit -q -m "영상 스크립트 PC 수집 %date%"
git pull -q --rebase origin manual-creation && git push -q origin HEAD:manual-creation
