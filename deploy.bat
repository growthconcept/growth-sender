@echo off
REM Script de deploy para Growth Sender (Windows)
REM Uso: deploy.bat [docker]

set DEPLOY_METHOD=%1
if "%DEPLOY_METHOD%"=="" set DEPLOY_METHOD=docker

echo 🚀 Iniciando deploy usando método: %DEPLOY_METHOD%

if "%DEPLOY_METHOD%"=="docker" (
    echo 📦 Deploy com Docker Compose...
    
    REM Verificar se .env existe
    if not exist .env (
        echo ❌ Arquivo .env não encontrado!
        echo 📝 Crie um arquivo .env na raiz do projeto com as variáveis necessárias.
        echo 💡 Veja DEPLOY.md para mais informações.
        exit /b 1
    )
    
    REM Build e start
    docker-compose up -d --build
    
    REM Aguardar serviços iniciarem
    echo ⏳ Aguardando serviços iniciarem...
    timeout /t 10 /nobreak >nul
    
    REM Executar migrations
    echo 🗄️ Executando migrations...
    docker-compose exec -T backend npm run migrate || echo ⚠️ Erro ao executar migrations. Execute manualmente: docker-compose exec backend npm run migrate
    
    echo ✅ Deploy concluído!
    echo 🌐 Backend: http://localhost:3001
    echo 🌐 Frontend: http://localhost
    echo 📊 Ver logs: docker-compose logs -f
) else (
    echo ❌ Método de deploy desconhecido: %DEPLOY_METHOD%
    echo 💡 Métodos disponíveis: docker
    exit /b 1
)

