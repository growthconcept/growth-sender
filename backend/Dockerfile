# Dockerfile para Backend
FROM node:18-alpine

# Instalar dependências do sistema necessárias para PostgreSQL
RUN apk add --no-cache python3 make g++

# Criar diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Criar diretório de uploads
RUN mkdir -p uploads

# Expor porta
EXPOSE 3001

# Comando para iniciar o servidor
CMD ["node", "src/server.js"]

