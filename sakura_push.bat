@echo off
setlocal

set REGISTRY=kouchouai2.sakuracr.jp

:: login (1回のみでOK)
docker login %REGISTRY%

:: API
docker tag kouchou-ai-api:latest %REGISTRY%/kouchou-ai-api:latest
docker push %REGISTRY%/kouchou-ai-api:latest

:: Client-admin
docker tag kouchou-ai-client-admin:latest %REGISTRY%/kouchou-ai-client-admin:latest
docker push %REGISTRY%/kouchou-ai-client-admin:latest

:: Client
docker tag kouchou-ai-client:latest %REGISTRY%/kouchou-ai-client:latest
docker push %REGISTRY%/kouchou-ai-client:latest

echo Done!
pause