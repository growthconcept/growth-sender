#!/bin/bash

echo "🔍 Diagnóstico de CORS - Growth Sender"
echo "======================================"
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="https://api-sender.growthdigitalmkt.com.br"
FRONTEND_URL="https://sender.growthdigitalmkt.com.br"

echo "1. Testando requisição OPTIONS (preflight)..."
echo "----------------------------------------------"
OPTIONS_RESPONSE=$(curl -s -i -X OPTIONS "$API_URL/api/upload" \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization")

if echo "$OPTIONS_RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
  echo -e "${GREEN}✅ Headers CORS encontrados na resposta OPTIONS${NC}"
  echo "$OPTIONS_RESPONSE" | grep -i "access-control"
else
  echo -e "${RED}❌ Headers CORS NÃO encontrados na resposta OPTIONS${NC}"
  echo "Resposta completa:"
  echo "$OPTIONS_RESPONSE"
fi

echo ""
echo "2. Testando requisição POST (simulando upload)..."
echo "------------------------------------------------"
POST_RESPONSE=$(curl -s -i -X POST "$API_URL/api/upload" \
  -H "Origin: $FRONTEND_URL" \
  -H "Content-Type: multipart/form-data" \
  -H "Authorization: Bearer test" \
  --data "test=data")

if echo "$POST_RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
  echo -e "${GREEN}✅ Headers CORS encontrados na resposta POST${NC}"
  echo "$POST_RESPONSE" | grep -i "access-control"
else
  echo -e "${RED}❌ Headers CORS NÃO encontrados na resposta POST${NC}"
  echo "Status code: $(echo "$POST_RESPONSE" | head -1)"
fi

echo ""
echo "3. Verificando configuração do Nginx no container..."
echo "-----------------------------------------------------"
if docker exec growth-nginx nginx -t 2>&1 | grep -q "successful"; then
  echo -e "${GREEN}✅ Configuração do Nginx é válida${NC}"
else
  echo -e "${RED}❌ Erro na configuração do Nginx${NC}"
  docker exec growth-nginx nginx -t
fi

echo ""
echo "4. Verificando se o Nginx foi recarregado recentemente..."
echo "---------------------------------------------------------"
NGINX_RELOAD=$(docker exec growth-nginx sh -c "stat /etc/nginx/nginx.conf | grep Modify")
echo "Última modificação do nginx.conf: $NGINX_RELOAD"

echo ""
echo "5. Verificando logs do Nginx (últimas 20 linhas)..."
echo "---------------------------------------------------"
docker logs growth-nginx --tail 20 2>&1 | grep -i "error\|warn\|cors" || echo "Nenhum erro relacionado encontrado"

echo ""
echo "6. Verificando logs do Backend (últimas 20 linhas)..."
echo "-----------------------------------------------------"
docker logs growth-backend --tail 20 2>&1 | grep -i "error\|cors" || echo "Nenhum erro relacionado encontrado"

echo ""
echo "======================================"
echo "✅ Diagnóstico concluído"
echo ""
echo "Para aplicar as correções:"
echo "1. git pull"
echo "2. docker cp nginx.conf growth-nginx:/etc/nginx/nginx.conf"
echo "3. docker exec growth-nginx nginx -t"
echo "4. docker exec growth-nginx nginx -s reload"
echo "5. docker-compose restart backend"

