@echo off
setlocal

set REGISTRY=kouchouai2.sakuracr.jp

:: login (1回のみでOK)
docker login %REGISTRY%

:: API
docker build -t %REGISTRY%/kouchou-ai-api:latest ./server
docker push %REGISTRY%/kouchou-ai-api:latest

:: Client-admin
docker build -t %REGISTRY%/kouchou-ai-client-admin:latest ./client-admin
docker push %REGISTRY%/kouchou-ai-client-admin:latest

echo Done!
pause