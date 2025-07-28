# 🚀 Guia do Webhook Umbler

## URLs Importantes

### Local
- Frontend: http://localhost:3000
- Webhook: http://localhost:3000/webhook/umbler

### Público (com túnel)
- Será gerado automaticamente pelo ngrok

## Como usar

1. Execute: `npm run dev`
2. Acesse: http://localhost:3000  
3. Clique em "🌐 Iniciar Túnel"
4. Copie a URL pública gerada
5. Configure na Umbler

## Teste o webhook

Use a interface web ou:

```bash
curl -X POST [URL_PUBLICA]/webhook/umbler \
  -H "Content-Type: application/json" \
  -d '{"event": "message_received", "message": {"content": "teste"}}'
```

Pronto! 🎉