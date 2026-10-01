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

## Teste 3 — desafio do módulo 1 (cartão de perfil)

1. Leve a Ana para dentro da **Vila dos Componentes Fundamentais** (prédio 1, porta já aberta).
2. Aproxime-se da estação 🛠️ **Oficina do Cartão de Perfil** e aperte **E**.
3. Monte: Caixa → `View`, Foto → `Image`, Nome → `Text`, Estilos → `StyleSheet`.
   Repare que a prévia mostra os componentes reais (e quebra se escolher errado!).
4. Clique **Testar minha tela**. ✅ Som de acerto, +XP e moedas.
5. No painel, a tabela "Quem completou cada desafio" mostra ✅ para a Ana em `m1_build`.

## Teste 4 — cooperação

1. Beto entra na mesma estação e erra duas vezes (ex.: Caixa → `Text`).
   ✅ Aparece ❓ sobre o Beto, e o botão **🆘 Pedidos (1)** acende na janela da Ana.
2. Ana abre **Pedidos** (tecla H) e clica **💡 Enviar dica** (custa 10 moedas).
   ✅ Beto recebe a dica com o nome da Ana e o selo "🤝 Modo cooperação".
3. Beto acerta. ✅ Ana recebe +10 XP, +2 cooperação e a conquista **Mentor**.

## Teste 5 — dois computadores (o teste que importa)

1. No PC do professor: `npm start` e anote o IP mostrado.
2. Em outro PC da mesma rede: abra `http://IP:3000/health`. Deve aparecer `{"ok":true...}`.
   Se não abrir, veja [REDE_LOCAL.md](REDE_LOCAL.md) (firewall/isolamento de rede).
3. Repita o Teste 1 com uma janela em cada computador.

## Resetar depois dos testes

No painel, **Resetar progresso** apaga todos os jogadores e tranca os módulos 2–6
(o módulo 1 começa liberado). Também é possível apagar `server/data/save.json` com o
servidor parado.
