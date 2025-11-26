#!/bin/bash

# Script de deploy para Growth Sender
# Uso: ./deploy.sh [docker|railway|render]

set -e

DEPLOY_METHOD=${1:-docker}

echo "🚀 Iniciando deploy usando método: $DEPLOY_METHOD"

case $DEPLOY_METHOD in
  docker)
    echo "📦 Deploy com Docker Compose..."
    
    # Verificar se .env existe
    if [ ! -f .env ]; then
      echo "❌ Arquivo .env não encontrado!"
      echo "📝 Crie um arquivo .env na raiz do projeto com as variáveis necessárias."
      echo "💡 Veja DEPLOY.md para mais informações."
      exit 1
    fi
    
    # Build e start
    docker-compose up -d --build
    
    # Aguardar serviços iniciarem
    echo "⏳ Aguardando serviços iniciarem..."
    sleep 10
    
    # Executar migrations
    echo "🗄️ Executando migrations..."
    docker-compose exec -T backend npm run migrate || echo "⚠️ Erro ao executar migrations. Execute manualmente: docker-compose exec backend npm run migrate"
    
    echo "✅ Deploy concluído!"
    echo "🌐 Backend: http://localhost:3001"
    echo "🌐 Frontend: http://localhost"
    echo "📊 Ver logs: docker-compose logs -f"
    ;;
    
  railway)
    echo "🚂 Deploy no Railway..."
    echo "📝 Certifique-se de ter o Railway CLI instalado: npm i -g @railway/cli"
    echo "📝 Faça login: railway login"
    echo "📝 Siga as instruções em DEPLOY.md"
    ;;
    
  render)
    echo "🎨 Deploy no Render..."
    echo "📝 Acesse https://render.com e siga as instruções em DEPLOY.md"
    ;;
    
  *)
    echo "❌ Método de deploy desconhecido: $DEPLOY_METHOD"
    echo "💡 Métodos disponíveis: docker, railway, render"
    exit 1
    ;;
esac

