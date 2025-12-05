/**
 * Script de diagnóstico para identificar problemas com conexões
 * 
 * Uso: node src/scripts/diagnoseConnections.js [userId]
 */

import sequelize from '../config/database.js';
import { Connection, User } from '../models/index.js';
import { Op } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

async function diagnoseConnections(userId = null) {
  try {
    console.log('🔍 Iniciando diagnóstico de conexões...\n');

    // Buscar todas as conexões
    const where = userId ? { user_id: userId } : {};
    const allConnections = await Connection.findAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }],
      order: [['created_at', 'DESC']]
    });

    console.log(`📊 Total de conexões encontradas: ${allConnections.length}\n`);

    // Verificar duplicatas por instance_name
    const instanceNameMap = new Map();
    const duplicates = [];

    allConnections.forEach(conn => {
      const key = conn.instance_name;
      if (!instanceNameMap.has(key)) {
        instanceNameMap.set(key, []);
      }
      instanceNameMap.get(key).push(conn);
    });

    instanceNameMap.forEach((connections, instanceName) => {
      if (connections.length > 1) {
        duplicates.push({
          instanceName,
          count: connections.length,
          connections: connections.map(c => ({
            id: c.id,
            userId: c.user_id,
            userName: c.user?.name || 'N/A',
            status: c.status,
            createdAt: c.created_at
          }))
        });
      }
    });

    if (duplicates.length > 0) {
      console.log('⚠️  DUPLICATAS ENCONTRADAS:\n');
      duplicates.forEach(dup => {
        console.log(`  Instance: ${dup.instanceName} (${dup.count} ocorrências)`);
        dup.connections.forEach((conn, idx) => {
          console.log(`    ${idx + 1}. ID: ${conn.id} | User: ${conn.userName} (${conn.userId}) | Status: ${conn.status} | Criado: ${conn.createdAt}`);
        });
        console.log('');
      });
    } else {
      console.log('✅ Nenhuma duplicata encontrada\n');
    }

    // Estatísticas por usuário
    const userStats = new Map();
    allConnections.forEach(conn => {
      const userId = conn.user_id;
      const userName = conn.user?.name || 'N/A';
      if (!userStats.has(userId)) {
        userStats.set(userId, {
          userName,
          total: 0,
          connected: 0,
          disconnected: 0,
          error: 0
        });
      }
      const stats = userStats.get(userId);
      stats.total++;
      if (conn.status === 'connected') stats.connected++;
      else if (conn.status === 'disconnected') stats.disconnected++;
      else if (conn.status === 'error') stats.error++;
    });

    console.log('📈 ESTATÍSTICAS POR USUÁRIO:\n');
    userStats.forEach((stats, userId) => {
      console.log(`  ${stats.userName} (${userId}):`);
      console.log(`    Total: ${stats.total}`);
      console.log(`    Conectadas: ${stats.connected}`);
      console.log(`    Desconectadas: ${stats.disconnected}`);
      console.log(`    Erro: ${stats.error}`);
      console.log('');
    });

    // Conexões sem instance_name
    const withoutInstanceName = allConnections.filter(c => !c.instance_name || c.instance_name.trim() === '');
    if (withoutInstanceName.length > 0) {
      console.log(`⚠️  Conexões sem instance_name: ${withoutInstanceName.length}\n`);
    }

    // Resumo
    console.log('\n📋 RESUMO:');
    console.log(`  Total de conexões: ${allConnections.length}`);
    console.log(`  Duplicatas: ${duplicates.length}`);
    console.log(`  Usuários únicos: ${userStats.size}`);
    console.log(`  Conexões sem instance_name: ${withoutInstanceName.length}`);

    // Sugestões
    if (duplicates.length > 0) {
      console.log('\n💡 SUGESTÕES:');
      console.log('  1. Execute a sincronização novamente para limpar duplicatas');
      console.log('  2. Verifique se a Evolution API está retornando instâncias duplicadas');
      console.log('  3. Considere executar um script de limpeza para remover duplicatas antigas');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);
    process.exit(1);
  }
}

// Executar diagnóstico
const userId = process.argv[2] || null;
diagnoseConnections(userId);

