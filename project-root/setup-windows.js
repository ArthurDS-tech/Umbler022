const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('🪟 Setup PostgreSQL para Windows - Umbler Webhook\n');

// Configuração para umbler_user
const prompt = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

async function setupWindowsPostgreSQL() {
  return new Promise((resolve) => {
    prompt.question('Digite a senha do usuário umbler_user: ', async (password) => {
      prompt.close();
      
      console.log('\n🔧 Configurando PostgreSQL...\n');

      // Configuração de conexão
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'postgres',
        user: 'umbler_user',
        password: password,
      };

      console.log(`🔌 Conectando como: ${config.user}@${config.host}:${config.port}`);

      const adminPool = new Pool(config);
      
      try {
        // 1. Teste de conexão
        console.log('🧪 Testando conexão...');
        await adminPool.query('SELECT NOW()');
        console.log('✅ Conexão estabelecida!\n');

        // 2. Criar banco se não existir
        console.log('📦 Verificando banco umbler_webhook_db...');
        const dbCheck = await adminPool.query(
          "SELECT 1 FROM pg_database WHERE datname = 'umbler_webhook_db'"
        );

        if (dbCheck.rows.length === 0) {
          console.log('📦 Criando banco umbler_webhook_db...');
          await adminPool.query('CREATE DATABASE umbler_webhook_db');
          console.log('✅ Banco criado com sucesso!\n');
        } else {
          console.log('✅ Banco já existe!\n');
        }

        await adminPool.end();

        // 3. Conectar ao banco específico e executar schema
        console.log('🔧 Executando schema SQL...');
        const appConfig = { ...config, database: 'umbler_webhook_db' };
        const appPool = new Pool(appConfig);

        // Ler arquivo SQL
        const sqlPath = path.join(__dirname, 'schema-postgresql.sql');
        
        if (!fs.existsSync(sqlPath)) {
          console.log('❌ Arquivo schema-postgresql.sql não encontrado!');
          console.log(`   Procurado em: ${sqlPath}`);
          return resolve(false);
        }

        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        console.log(`📄 Arquivo SQL carregado (${sqlContent.length} caracteres)`);

        // Executar SQL
        try {
          await appPool.query(sqlContent);
          console.log('✅ Schema executado com sucesso!\n');
        } catch (error) {
          console.log('⚠️ Erro ao executar schema completo, tentando por partes...');
          
          // Dividir em comandos menores
          const commands = sqlContent
            .split(';')
            .map(cmd => cmd.trim())
            .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

          for (let i = 0; i < commands.length; i++) {
            try {
              await appPool.query(commands[i]);
              console.log(`✅ Comando ${i + 1}/${commands.length} executado`);
            } catch (cmdError) {
              if (!cmdError.message.includes('already exists')) {
                console.log(`⚠️ Erro no comando ${i + 1}: ${cmdError.message}`);
              }
            }
          }
        }

        // 4. Verificar tabelas criadas
        console.log('\n📊 Verificando tabelas criadas...');
        const tables = await appPool.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name
        `);

        console.log(`✅ ${tables.rows.length} tabelas encontradas:`);
        tables.rows.forEach((row, index) => {
          console.log(`   ${index + 1}. ${row.table_name}`);
        });

        // 5. Inserir dados de exemplo
        console.log('\n🔧 Inserindo dados de exemplo...');
        
        // Verificar se já tem dados
        const contactCount = await appPool.query('SELECT COUNT(*) FROM contacts');
        
        if (parseInt(contactCount.rows[0].count) === 0) {
          console.log('📝 Inserindo contatos de exemplo...');
          
          await appPool.query(`
            INSERT INTO contacts (umbler_contact_id, phone_number, name, email, tags) VALUES
            ('contact_1', '+5511999999999', 'João Silva', 'joao@email.com', ARRAY['✨ REPECON FIAT', '🐨 LOJISTA']),
            ('contact_2', '+5511888888888', 'Maria Santos', 'maria@email.com', ARRAY['✨ AUTOMEGA', '💗 Troca']),
            ('contact_3', '+5521777777777', 'Pedro Costa', 'pedro@email.com', ARRAY['🐨 DICAS', '💛 Zero']),
            ('contact_4', '+5531666666666', 'Ana Oliveira', 'ana@email.com', ARRAY['🥳 PV', '💚 seminovo']),
            ('contact_5', '+5541555555555', 'Carlos Lima', 'carlos@email.com', ARRAY['🐨 PIX VISTORIA', '🤎 zero fora'])
          `);

          console.log('✅ Contatos inseridos!');
        } else {
          console.log('✅ Dados já existem!');
        }

        await appPool.end();

        // 6. Atualizar .env automaticamente
        console.log('\n🔧 Atualizando arquivo .env...');
        const envPath = path.join(__dirname, '.env');
        let envContent = '';
        
        if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, 'utf8');
        }

        // Substituir senhas no .env
        envContent = envContent.replace(/DATABASE_PASSWORD=.*/, `DATABASE_PASSWORD=${password}`);
        envContent = envContent.replace(
          /DATABASE_URL=postgresql:\/\/umbler_user:.*@/,
          `DATABASE_URL=postgresql://umbler_user:${password}@`
        );

        fs.writeFileSync(envPath, envContent);
        console.log('✅ Arquivo .env atualizado!\n');

        console.log('🎉 Setup completo! Configuração finalizada:');
        console.log('✅ Banco de dados criado');
        console.log('✅ Tabelas criadas');
        console.log('✅ Dados de exemplo inseridos');
        console.log('✅ Arquivo .env atualizado');
        console.log('\n📝 Próximos passos:');
        console.log('1. npm run dev (para iniciar o backend)');
        console.log('2. cd frontend && npm run dev (para iniciar o frontend)');

        resolve(true);

      } catch (error) {
        console.log('\n❌ Erro na configuração:');
        console.log(`   ${error.message}\n`);
        
        console.log('🔧 Possíveis soluções:');
        console.log('1. Verificar se PostgreSQL está rodando');
        console.log('2. Verificar se o usuário umbler_user existe');
        console.log('3. Verificar se a senha está correta');
        console.log('4. Se estiver no Windows, usar pgAdmin para conectar manualmente');

        resolve(false);
      } finally {
        if (adminPool) {
          try { await adminPool.end(); } catch (e) {}
        }
      }
    });
  });
}

// Executar setup
if (require.main === module) {
  setupWindowsPostgreSQL()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { setupWindowsPostgreSQL };