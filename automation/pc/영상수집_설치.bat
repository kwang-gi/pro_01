@echo off
chcp 65001 >nul
rem 한 번만 실행: 저장소 받기 + yt-dlp 설치 + 월·목 06:35 예약 등록 + 첫 수집
set REPO=D:\test_d\pro_01_collect
if not exist %REPO% git clone -b manual-creation https://github.com/kwang-gi/pro_01.git %REPO%
python -m pip install -q -U yt-dlp
schtasks /Create /F /TN "pro_01_영상수집" /SC WEEKLY /D MON,THU /ST 06:35 /TR "\"%REPO%\automation\pc\영상수집.bat\""
call "%REPO%\automation\pc\영상수집.bat"
