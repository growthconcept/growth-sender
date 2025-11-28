#!/bin/bash

echo "🔍 Teste de CORS para Upload"
echo "============================"
echo ""

API_URL="https://api-sender.growthdigitalmkt.com.br"
FRONTEND_URL="https://sender.growthdigitalmkt.com.br"

echo "1. Testando requisição OPTIONS (preflight) para /api/upload..."
echo "---------------------------------------------------------------"
OPTIONS_RESPONSE=$(curl -s -i -X OPTIONS "$API_URL/api/upload" \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization")

echo "Status: $(echo "$OPTIONS_RESPONSE" | head -1)"
echo ""
echo "Headers CORS encontrados:"
echo "$OPTIONS_RESPONSE" | grep -i "access-control" || echo "❌ Nenhum header CORS encontrado!"
echo ""

echo "2. Verificando se o backend está respondendo..."
echo "-------------------------------------------------"
HEALTH_RESPONSE=$(curl -s -i "$API_URL/health")
echo "Status: $(echo "$HEALTH_RESPONSE" | head -1)"
echo ""

echo "3. Verificando configuração do Nginx no container..."
echo "-----------------------------------------------------"
if docker exec growth-nginx nginx -t 2>&1 | grep -q "successful"; then
  echo "✅ Configuração do Nginx é válida"
else
  echo "❌ Erro na configuração do Nginx"
  docker exec growth-nginx nginx -t
fi
echo ""

echo "4. Verificando se o backend está rodando..."
echo "--------------------------------------------"
if docker ps | grep -q "growth-backend"; then
  echo "✅ Container do backend está rodando"
  echo "Status: $(docker ps | grep growth-backend | awk '{print $7}')"
else
  echo "❌ Container do backend NÃO está rodando!"
fi
echo ""

echo "5. Últimas 20 linhas dos logs do backend..."
echo "-------------------------------------------"
docker logs growth-backend --tail 20 2>&1 | tail -20
echo ""

echo "6. Últimas 20 linhas dos logs do Nginx..."
echo "-----------------------------------------"
docker logs growth-nginx --tail 20 2>&1 | tail -20
echo ""

echo "7. Verificando variável FRONTEND_URL no backend..."
echo "--------------------------------------------------"
docker exec growth-backend env | grep FRONTEND_URL || echo "⚠️  FRONTEND_URL não configurada!"
echo ""

echo "============================"
echo "✅ Diagnóstico concluído"
echo ""
echo "Se os headers CORS não aparecerem, execute:"
echo "1. docker-compose restart backend"
echo "2. docker exec growth-nginx nginx -s reload"
echo "3. Verifique se FRONTEND_URL está configurada corretamente"

