const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('🐧➡️🪟 Setup PostgreSQL - Windows conectando ao Kali Linux\n');

const prompt = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

async function setupKaliRemote() {
  return new Promise((resolve) => {
    console.log('🔧 Configuração para conectar ao PostgreSQL do Kali Linux\n');
    
    prompt.question('IP do Kali Linux (ex: 192.168.1.100): ', (kaliIP) => {
      prompt.question('Senha do usuário umbler_user: ', async (password) => {
        prompt.close();
        
        console.log('\n🔧 Configurando conexão remota...\n');

        // Configuração de conexão remota
        const config = {
          host: kaliIP,
          port: 5432,
          database: 'postgres',
          user: 'umbler_user',
          password: password,
        };

        console.log(`🔌 Conectando ao: ${config.user}@${config.host}:${config.port}`);

        const adminPool = new Pool(config);
        
        try {
          // 1. Teste de conexão remota
          console.log('🧪 Testando conexão remota...');
          const testResult = await adminPool.query('SELECT NOW(), current_user');
          console.log('✅ Conexão remota estabelecida!');
          console.log(`⏰ Hora no Kali: ${testResult.rows[0].now}`);
          console.log(`👤 Usuário: ${testResult.rows[0].current_user}\n`);

          // 2. Verificar/criar banco
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
          console.log('🔧 Executando schema SQL no banco remoto...');
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

          // Executar SQL em partes (mais seguro para conexão remota)
          console.log('🔧 Executando comandos SQL...');
          const commands = sqlContent
            .split(';')
            .map(cmd => cmd.trim())
            .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

          let sucessCount = 0;
          for (let i = 0; i < commands.length; i++) {
            try {
              await appPool.query(commands[i]);
              sucessCount++;
              if (i % 10 === 0) {
                console.log(`✅ Progresso: ${i + 1}/${commands.length} comandos`);
              }
            } catch (cmdError) {
              if (!cmdError.message.includes('already exists')) {
                console.log(`⚠️ Aviso comando ${i + 1}: ${cmdError.message.substring(0, 100)}`);
              }
            }
          }
          console.log(`✅ ${sucessCount}/${commands.length} comandos executados com sucesso!\n`);

          // 4. Verificar tabelas criadas
          console.log('📊 Verificando tabelas criadas...');
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
          
          try {
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
          } catch (insertError) {
            console.log('⚠️ Erro ao inserir dados de exemplo, mas tabelas estão criadas');
          }

          await appPool.end();

          // 6. Atualizar .env automaticamente
          console.log('\n🔧 Atualizando arquivo .env para conexão remota...');
          const envPath = path.join(__dirname, '.env');
          let envContent = '';
          
          if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
          }

          // Substituir configurações no .env
          envContent = envContent.replace(/DATABASE_HOST=.*/, `DATABASE_HOST=${kaliIP}`);
          envContent = envContent.replace(/DATABASE_PASSWORD=.*/, `DATABASE_PASSWORD=${password}`);
          envContent = envContent.replace(
            /DATABASE_URL=postgresql:\/\/umbler_user:.*@.*:/,
            `DATABASE_URL=postgresql://umbler_user:${password}@${kaliIP}:`
          );

          fs.writeFileSync(envPath, envContent);
          console.log('✅ Arquivo .env atualizado para conexão remota!\n');

          console.log('🎉 Setup completo! Configuração finalizada:');
          console.log('✅ Conexão remota ao PostgreSQL do Kali estabelecida');
          console.log('✅ Banco de dados criado');
          console.log('✅ Tabelas criadas');
          console.log('✅ Dados de exemplo inseridos');
          console.log('✅ Arquivo .env atualizado');
          
          console.log('\n📝 Configuração final:');
          console.log(`   Host: ${kaliIP}`);
          console.log(`   Porta: 5432`);
          console.log(`   Usuario: umbler_user`);
          console.log(`   Banco: umbler_webhook_db`);
          
          console.log('\n🚀 Próximos passos:');
          console.log('1. npm run dev (para iniciar o backend)');
          console.log('2. cd frontend && npm run dev (para iniciar o frontend)');

          resolve(true);

        } catch (error) {
          console.log('\n❌ Erro na conexão remota:');
          console.log(`   ${error.message}\n`);
          
          console.log('🔧 Possíveis soluções:');
          console.log('1. No Kali Linux, verificar se PostgreSQL está rodando:');
          console.log('   sudo systemctl status postgresql');
          console.log('2. No Kali Linux, configurar para aceitar conexões remotas:');
          console.log('   sudo nano /etc/postgresql/*/main/postgresql.conf');
          console.log('   listen_addresses = \'*\'');
          console.log('3. No Kali Linux, permitir conexões na rede:');
          console.log('   sudo nano /etc/postgresql/*/main/pg_hba.conf');
          console.log('   host all all 0.0.0.0/0 md5');
          console.log('4. Reiniciar PostgreSQL no Kali:');
          console.log('   sudo systemctl restart postgresql');
          console.log('5. Verificar firewall do Kali (porta 5432)');
          console.log('6. Verificar IP do Kali: hostname -I');

          resolve(false);
        } finally {
          if (adminPool) {
            try { await adminPool.end(); } catch (e) {}
          }
        }
      });
    });
  });
}

// Executar setup
if (require.main === module) {
  setupKaliRemote()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { setupKaliRemote };