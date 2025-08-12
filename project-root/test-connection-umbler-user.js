const { Pool } = require('pg');

// Teste de conexão para usuário umbler_user
async function testUmblerUserConnection() {
  console.log('🔍 Testando conexão com usuário umbler_user...\n');

  // Pedir senha do usuário
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Digite a senha do usuário umbler_user: ', async (password) => {
      rl.close();
      
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'postgres',
        user: 'umbler_user',
        password: password,
      };

      console.log('\n🔧 Configuração de teste:');
      console.log(`- Host: ${config.host}`);
      console.log(`- Porta: ${config.port}`);
      console.log(`- Usuário: ${config.user}`);
      console.log(`- Banco: ${config.database}`);
      console.log('- Senha: ***\n');

      const pool = new Pool(config);

      try {
        // Teste 1: Conexão básica
        console.log('🧪 Teste 1: Conexão básica...');
        const result = await pool.query('SELECT NOW() as current_time, current_user');
        console.log('✅ Conexão estabelecida com sucesso!');
        console.log(`⏰ Hora atual: ${result.rows[0].current_time}`);
        console.log(`👤 Usuário conectado: ${result.rows[0].current_user}\n`);

        // Teste 2: Verificar permissões
        console.log('🧪 Teste 2: Verificando permissões...');
        try {
          await pool.query('CREATE DATABASE test_permissions_temp');
          console.log('✅ Usuário tem permissão para criar bancos');
          await pool.query('DROP DATABASE test_permissions_temp');
          console.log('✅ Usuário tem permissão para deletar bancos\n');
        } catch (error) {
          if (error.message.includes('permission denied')) {
            console.log('⚠️ Usuário não tem permissão para criar/deletar bancos');
            console.log('💡 Execute: GRANT CREATEDB TO umbler_user;\n');
          } else {
            console.log('✅ Permissões OK\n');
          }
        }

        // Teste 3: Verificar se banco umbler_webhook_db existe
        console.log('🧪 Teste 3: Verificando banco umbler_webhook_db...');
        const dbCheck = await pool.query(
          "SELECT 1 FROM pg_database WHERE datname = 'umbler_webhook_db'"
        );
        
        if (dbCheck.rows.length > 0) {
          console.log('✅ Banco umbler_webhook_db já existe');
          
          // Teste conectar no banco específico
          const appPool = new Pool({
            ...config,
            database: 'umbler_webhook_db'
          });
          
          try {
            await appPool.query('SELECT 1');
            console.log('✅ Acesso ao banco umbler_webhook_db OK');
            
            // Verificar tabelas
            const tables = await appPool.query(`
              SELECT table_name 
              FROM information_schema.tables 
              WHERE table_schema = 'public'
            `);
            console.log(`📊 Tabelas encontradas: ${tables.rows.length}`);
            tables.rows.forEach(row => {
              console.log(`  - ${row.table_name}`);
            });
            
            await appPool.end();
          } catch (error) {
            console.log(`❌ Erro ao acessar banco: ${error.message}`);
          }
        } else {
          console.log('⚠️ Banco umbler_webhook_db não existe ainda');
          console.log('💡 Execute: node setup-postgresql-complete.js');
        }

        console.log('\n🎉 Teste de conexão concluído!');
        console.log('\n📝 Próximos passos:');
        console.log('1. Atualize o arquivo .env com esta senha');
        console.log('2. Execute: node setup-postgresql-complete.js');
        console.log('3. Inicie o servidor: npm run dev');

        resolve(true);
      } catch (error) {
        console.log('❌ Erro na conexão:');
        console.log(`   ${error.message}\n`);
        
        console.log('🔧 Possíveis soluções:');
        console.log('1. Verificar se PostgreSQL está rodando:');
        console.log('   sudo systemctl status postgresql');
        console.log('2. Verificar se o usuário existe:');
        console.log('   sudo -u postgres psql -c "\\du"');
        console.log('3. Criar usuário se necessário:');
        console.log('   sudo -u postgres createuser -P umbler_user');
        console.log('4. Dar permissões:');
        console.log('   sudo -u postgres psql -c "ALTER USER umbler_user CREATEDB;"');

        resolve(false);
      } finally {
        await pool.end();
      }
    });
  });
}

// Executar teste
if (require.main === module) {
  testUmblerUserConnection()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Erro no teste:', error);
      process.exit(1);
    });
}

module.exports = { testUmblerUserConnection };