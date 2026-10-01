# Jogando na rede local

```
  [PC do professor]  npm start  →  servidor em 0.0.0.0:3000
          │
     (mesma rede Wi-Fi / cabo)
          │
  [PCs dos alunos]  navegador → http://IP_DO_PROFESSOR:3000
```

## 1. Descobrir o IP do computador do professor

O servidor já imprime o IP ao iniciar (`Alunos (mesma rede): http://192.168.x.x:3000`).
Se houver mais de um (ex.: Wi-Fi e cabo, ou adaptador de máquina virtual), use o da rede
em que os alunos estão. Para conferir manualmente:

**Windows** — Prompt de Comando ou PowerShell:
```
ipconfig
```
Procure "Endereço IPv4" do adaptador Wi-Fi/Ethernet (ex.: `192.168.0.10`).

**Linux**:
```
hostname -I
# ou
ip -4 addr show
```

**macOS**:
```
ipconfig getifaddr en0     # Wi-Fi (en1 em alguns modelos)
```
ou Ajustes do Sistema → Rede → Wi-Fi → Detalhes → Endereço IP.

> Ignore endereços `127.0.0.1` (só a própria máquina) e, normalmente, `172.x` de
> Docker/VirtualBox/WSL.

## 2. Liberar a porta 3000 no firewall

**Windows**: na primeira execução o Windows pergunta se o Node.js pode acessar a rede —
marque **Redes privadas** e clique em Permitir. Se a pergunta não apareceu, rode o
PowerShell **como administrador**:
```powershell
New-NetFirewallRule -DisplayName "React Native Quest" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private
```
Confira também se a rede está marcada como **Privada** (Configurações → Rede e Internet →
Wi-Fi → propriedades). Em rede "Pública" o Windows bloqueia conexões de entrada.

**Linux (ufw)**:
```bash
sudo ufw allow 3000/tcp
```
(firewalld: `sudo firewall-cmd --add-port=3000/tcp`)

**macOS**: Ajustes do Sistema → Rede → Firewall. Se estiver ativo, permita conexões de
entrada para o `node` quando o macOS perguntar.

## 3. Conectar os alunos

1. Todos na **mesma rede** do professor. Redes de escola às vezes isolam os clientes
   ("AP isolation"/"client isolation") — se nenhum aluno conseguir acessar, peça à TI para
   liberar a comunicação entre máquinas ou use um roteador próprio para a aula.
2. Cada aluno abre o navegador em `http://IP_DO_PROFESSOR:3000` (dá para escanear o QR
   Code do terminal com o celular só para ver o endereço).
3. Digita o nome, escolhe cor e equipe e clica **Entrar no lobby**.
4. O professor abre `http://IP_DO_PROFESSOR:3000/admin`, entra com a senha e libera os
   módulos conforme a aula avança. As portas abrem na hora para todos.

Teste rápido de um aluno: abrir `http://IP_DO_PROFESSOR:3000/health` deve mostrar `{"ok":true,...}`.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Funciona em `localhost` mas não em outros PCs | Firewall (passo 2) ou rede "Pública" no Windows |
| Nenhum aluno acessa, nem com firewall desligado | Isolamento de clientes na rede da escola |
| "EADDRINUSE" ao iniciar | Porta ocupada: use `PORT=3001 npm start` |
| Página diz "cliente ainda não foi compilado" | Rode `npm start` (ou `npm run build`) |
| Sem som | Navegadores só tocam som depois de um clique; confira o botão 🔊 do HUD |
| Aluno caiu da rede | Basta recarregar a página: o progresso continua (fica salvo no servidor) |

## (Opcional) Acesso fora da rede local

**Não é necessário para o MVP.** Se quiser que alguém de fora da escola entre (ex.: aula
remota), dá para criar um túnel temporário. Atenção: qualquer pessoa com o link poderá
acessar o jogo — troque a `ADMIN_SENHA` antes.

**Cloudflare Tunnel** (gratuito, sem conta para túneis rápidos):
```bash
# instale o cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
cloudflared tunnel --url http://localhost:3000
```
Ele mostra um endereço `https://algo.trycloudflare.com` para compartilhar.

**ngrok** (precisa de conta gratuita):
```bash
ngrok http 3000
```

WebSocket (Socket.io) funciona pelos dois. Encerre o túnel ao fim da aula.
