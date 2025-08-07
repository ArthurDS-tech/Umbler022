@echo off
echo Corrigindo erro do logger...

REM Backup do arquivo original
copy "src\utils\logger.js" "src\utils\logger.js.backup" >nul 2>&1

REM Aplicar correção usando PowerShell
powershell -Command "(Get-Content 'src\utils\logger.js') -replace 'environment\.paths\.logs', 'path.dirname(environment.logging.file ^|^| \"./logs/app.log\")' | Set-Content 'src\utils\logger.js'"

powershell -Command "(Get-Content 'src\utils\logger.js') -replace 'environment\.logging\.prettyLogs', 'false' | Set-Content 'src\utils\logger.js'"

echo Logger corrigido!
echo Execute: npm run dev