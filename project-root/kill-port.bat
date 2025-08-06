@echo off
echo 🔍 Procurando processos na porta 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    echo 🔫 Matando processo %%a...
    taskkill /f /pid %%a
)
echo ✅ Porta 3000 liberada!
pause