@echo off
echo Libération du port 8080...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8080" ^| find "LISTENING"') do taskkill /F /PID %%a
echo Port 8080 libre.
echo.
echo Lancement du serveur bgammon sur le port 8081 pour éviter les conflits Windows...
go run -tags full main.go -port=8081
pause
