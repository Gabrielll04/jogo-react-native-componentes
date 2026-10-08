# Testando o multiplayer antes da aula

Leva uns 10 minutos e evita surpresas.

## Teste 1 — dois navegadores no mesmo computador

1. `npm start` no terminal.
2. Abra **duas janelas independentes** apontando para `http://localhost:3000`:
   - uma janela normal do Chrome e outra **anônima** (Ctrl+Shift+N), **ou**
   - Chrome e Firefox/Edge.

   > Duas abas comuns do mesmo navegador também funcionam (cada aba vira um jogador
   > diferente), mas janelas separadas deixam mais fácil ver as duas ao mesmo tempo.
3. Janela A: nome **Ana**, entre no lobby. Janela B: nome **Beto**, entre no lobby.
   (O nome é a "conta" do aluno: usar o mesmo nome depois volta ao mesmo progresso.)
   ✅ Os dois aparecem na lista "Jogadores conectados" das duas janelas.
4. Clique em um emote (👋) em A. ✅ Aparece ao lado da Ana na janela B.
5. Clique **Entrar no mundo** nas duas. Mova a Ana com WASD/setas.
   ✅ A Ana se move suavemente na janela B.
6. Abra `http://localhost:3000/admin` (senha `professor123`). ✅ Os dois aparecem como online.

## Teste 2 — portas e módulos

1. No mapa, leve a Ana até a porta do **Mercado da Interação** (prédio 2, laranja).
   ✅ A porta está marrom com 🔒 e não deixa passar; aparece o aviso de módulo trancado.
2. No painel, clique em **🔒 Trancado (clique p/ liberar)** no módulo 2.
   ✅ Som de porta, aviso "foi LIBERADO" nas duas janelas e a porta fica aberta (contorno verde).
3. Tranque de novo para voltar ao estado da aula.

## Teste 3 — lição com um Mestre

1. Na primeira entrada aparece o tutorial do Reacto; siga a **seta amarela** até a
   **Vila dos Componentes Fundamentais** (prédio 1, porta já aberta).
2. Aproxime-se do **Mestre View** (❗ amarelo) e aperte **E**.
3. Faça as 4 etapas: Conheça → Experimente (clique nos valores do código até cumprir as
   missões) → Teste → Carta. ✅ +15 XP, carta `<View>` na coleção (tecla **I**) e ✓ sobre o Mestre.
4. Repita com os outros 4 Mestres. Ao aprender os 5, os **terminais** do prédio destravam.

## Teste 4 — "Monte a tela" (cartão de perfil)

1. Vá até o terminal 🛠️ **MONTAR** (Oficina do Cartão de Perfil) e aperte **E**.
2. Clique nos blocos para escrever o JSX: `<SafeAreaView>` (estilo `styles.tela`) →
   `<View>` (`styles.cartao`) → `<Image>` (`styles.foto`) → os dois `<Text>` (`styles.nome`, `styles.bio`).
   Clique numa linha do código para selecioná-la e trocar o estilo; ↑ ↓ ✕ movem/apagam.
3. Compare "🎯 Objetivo" com "📱 Seu app" e clique **Executar e conferir**.
   Errado: a folha vermelha diz o primeiro ponto diferente. Certo: confete, XP e o código completo.
4. No painel, a tabela "Quem completou cada desafio" mostra ✅ para a Ana em `m1_build`.

## Teste 5 — cooperação

1. Beto aprende os 5 componentes, entra no mesmo terminal e erra duas vezes (ex.: executa uma tela vazia ou só com `<View>`).
   ✅ Aparece ❓ sobre o Beto, e o botão **🆘 Pedidos (1)** acende na janela da Ana.
2. Ana abre **Pedidos** (tecla H) e clica **💡 Enviar dica** (custa 10 moedas).
   ✅ Beto recebe a dica com o nome da Ana e o selo "🤝 Modo cooperação".
3. Beto acerta. ✅ Ana recebe +10 XP, +2 cooperação e a conquista **Mentor**.

## Teste 6 — duelo

1. Ana clica em **⚔️ Duelo (X)**, escolhe **🧱 Blocos**, escolhe o Beto e envia.
   ✅ Na janela do Beto aparece uma notificação no **canto inferior direito**, com som e barra de tempo;
   ele continua conseguindo andar.
2. Beto clica **✔ Aceitar**. ✅ Os dois veem a contagem 3-2-1 e a mesma tela para recriar.
3. Quem clicar em **Executar e conferir** com a tela certa primeiro vence.
   ✅ Vencedor: +moedas do outro e +20 XP; perdedor: -moedas (nunca abaixo de 0).
4. Repita com **⌨️ Código**: digite o componente pedido; o checklist e o celular atualizam enquanto digita.

## Teste 7 — progresso pelo nome, loja e laboratório

1. Feche a janela da Ana e abra outra (pode ser anônima). Digite **ana** no nome.
   ✅ Aparece "👋 Bem-vindo(a) de volta, Ana!" com o nível/XP; ao entrar, o progresso está lá.
2. Na janela do Beto, tente entrar com o nome **Ana** enquanto ela está jogando.
   ✅ "Já tem alguém jogando como Ana agora".
3. No mapa, aperte **K** (loja), compre um chapéu. ✅ O chapéu aparece na cabeça dela também na janela do Beto.
4. Aperte **L** (laboratório), escolha "↔️ Lado a lado" e troque `row` por `column`. ✅ O celular muda na hora.
5. Num terminal, responda errado muito rápido. ✅ "🎲 Isso pareceu um chute!" e o botão "🧠 Pense… Xs".

## Teste 8 — corrida e painel

1. Com os dois no mapa, no painel clique **🧱 Iniciar corrida de Blocos**. ✅ Contagem 5 s nos dois e a mesma tela.
2. Termine em uma janela. ✅ Ranking ao vivo nas duas e no painel; quando os dois terminam, a corrida acaba.
3. No painel, ✏️ renomeie o Beto. ✅ Ele recebe o aviso com o nome novo. 🚫 bloqueie: ✅ ele sai na hora
   e não consegue entrar de novo até ✅ desbloquear.

## Teste 9 — dois computadores (o teste que importa)

1. No PC do professor: `npm start` e anote o IP mostrado.
2. Em outro PC da mesma rede: abra `http://IP:3000/health`. Deve aparecer `{"ok":true...}`.
   Se não abrir, veja [REDE_LOCAL.md](REDE_LOCAL.md) (firewall/isolamento de rede).
3. Repita o Teste 1 com uma janela em cada computador.

## Resetar depois dos testes

No painel, **Resetar progresso** apaga todos os jogadores e tranca os módulos 2–6
(o módulo 1 começa liberado) — antes, uma cópia vai para `server/data/backups/`. Também é possível apagar `server/data/save.json` com o
servidor parado.
