# Correção do Upload de Foto de Perfil (Erro CORS)

O erro "loop infinito" ou falha ao trocar a foto de perfil em produção ("Access to XMLHttpRequest ... blocked by CORS policy") acontece porque o Firebase Storage bloqueia uploads vindos do teu site por defeito.

## Como Resolver (Passo Único)

Precisas de aplicar as regras de CORS ao teu bucket.

1. Acede ao [Google Cloud Console](https://console.cloud.google.com/) e abre o **Cloud Shell** (ícone de terminal no topo direito da barra azul).
2. Cola o seguinte comando no terminal e tecla Enter:

```bash
echo '[{"origin": ["*"],"method": ["GET", "HEAD", "PUT", "POST", "DELETE", "OPTIONS"],"maxAgeSeconds": 3600}]' > cors.json && gsutil cors set cors.json gs://platforma-e0c48.firebasestorage.app
```

**Pronto!** Tenta fazer upload da foto novamente (pode ser necessário refrescar a página).

---
### O que este comando faz?
Ele cria um ficheiro de configuração temporário que permite uploads de QUALQUER origem (`*`) e envia essa configuração para o teu bucket de storage (`gs://platforma-e0c48.firebasestorage.app`). Isto resolve o bloqueio do navegador.
