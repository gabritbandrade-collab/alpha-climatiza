# ALPHA CLIMATIZAÇÃO — Sistema de Gestão de Serviços Externos

Aplicativo web completo para administração de clientes, funcionários e serviços
externos, com painel administrativo (desktop) e app mobile para os funcionários
em campo.

**100% HTML, CSS e JavaScript puros** — sem React, sem TypeScript, sem build
step e sem backend. Todo o sistema roda inteiramente no navegador; os dados
ficam salvos no `localStorage` do próprio navegador.

## Estrutura do projeto

```
frontend/
  index.html        Ponto de entrada
  css/styles.css     Todo o visual do sistema (variáveis de cor, componentes)
  assets/            Ícone do site
  js/
    main.js          Bootstrap: registra rotas e inicia o roteador
    router.js        Roteador baseado em hash (#/admin/agenda, #/app, ...)
    layouts.js        Estrutura do painel admin e do app do funcionário
    lib/
      store.js         "Banco de dados" local (localStorage) + toda a lógica
                        de negócio: autenticação, agendamento, distribuição
                        por cidade, dashboard, relatórios etc.
      ui.js            Toasts, modais, gráficos (SVG/CSS), exportação de
                        relatórios (CSV/Excel/PDF)
      icons.js         Ícones em SVG inline
      date.js          Formatação de datas em pt-BR
      theme.js         Modo claro/escuro
    components/        Pequenos widgets reutilizáveis (tags de cidade)
    pages/admin/       Uma tela por arquivo (dashboard, agenda, clientes...)
    pages/employee/    Telas do app do funcionário
```

## Como rodar o projeto

Como o app usa módulos ES (`<script type="module">`) e caminhos absolutos,
é preciso servir a pasta `frontend/` por HTTP (não funciona abrindo o
`index.html` direto com duplo-clique). Qualquer servidor estático simples
resolve:

```bash
cd frontend
npx serve -l 5510
```

Abra `http://localhost:5510` no navegador.

## Acessos de demonstração

| Perfil        | E-mail                              | Senha    |
|---------------|--------------------------------------|----------|
| Administrador | admin@nsclimatizacao.com.br          | admin123 |
| Funcionário   | joao@nsclimatizacao.com.br           | 123456   |
| Funcionário   | marcos@nsclimatizacao.com.br         | 123456   |
| Funcionário   | renata@nsclimatizacao.com.br         | 123456   |

## Onde ficam os dados

Tudo é gravado em `localStorage`, na chave `ns_db_v1` (dados) e
`ns_session_v1` (sessão de login). Isso significa que:

- Os dados são **por navegador/dispositivo** — não há um servidor central
  compartilhando informação entre computadores diferentes.
- Fotos de serviços e de perfil são convertidas para imagem comprimida e
  guardadas junto com o resto dos dados (o navegador costuma permitir alguns
  megabytes por site).
- Limpar os dados do site no navegador (ou o histórico/"dados de
  navegação") apaga o sistema por completo.

## Apagando os dados de exemplo e recomeçando do zero

Abra o Console do navegador (F12) na página do sistema e rode:

```js
localStorage.clear();
location.reload();
```

Isso recria a base com os dados de demonstração descritos acima. Para editar
os dados iniciais (ex.: criar o primeiro usuário administrador real antes de
distribuir o sistema), altere a função `seed()` em `frontend/js/lib/store.js`.

## O que já está implementado

- Login com identificação automática de Administrador/Funcionário e opção
  "Esqueci minha senha".
- Painel administrativo com dashboard, gráficos e indicadores em tempo real.
- Agenda de serviços em lista e calendário, com criação, edição, atribuição a
  funcionários e controle de status (Agendado, Em andamento, Concluído,
  Pendente, Cancelado).
- Cadastro completo de clientes, com histórico de serviços por cliente.
- Cadastro completo de funcionários (foto, cargo, contato, login e senha),
  com visualização dos serviços de cada um.
- Aplicativo mobile-first para o funcionário: próximo serviço, agenda da
  semana, detalhes do serviço, início/execução/conclusão, fotos de
  antes/depois, materiais utilizados, observações, problemas encontrados e
  pendências.
- Notificações para administrador e funcionários nos eventos importantes.
- Relatórios com filtros por período, funcionário, cliente e status, com
  exportação em CSV, Excel (.xls) e PDF (via impressão do navegador).
- Modo claro/escuro, layout responsivo (desktop, tablet e celular).
- **Distribuição de serviços por cidade/região:**
  - Cada funcionário tem uma "Região de atendimento" (uma ou várias cidades),
    cadastrada em Funcionários.
  - Tela **Solicitações** para registrar pedidos de clientes (cidade, tipo de
    serviço, data/horário desejados, prioridade).
  - Ao abrir uma solicitação, o sistema mostra automaticamente só os
    funcionários que atendem aquela cidade, aponta um recomendado e alerta
    sobre conflitos de horário antes de atribuir o serviço.
  - Tela **Distribuição** com os cards de acompanhamento (novos pedidos,
    aguardando distribuição, agendados, em andamento, concluídos, pendentes),
    visão por cidade e agenda individual de cada funcionário.
  - Botão "Transferir serviço" em qualquer atendimento, restrito aos
    funcionários daquela região, com notificação para o funcionário antigo e
    o novo, e registro no histórico.
  - Filtros por cidade e prioridade na Agenda normal também.

## Personalizando a identidade visual

As cores da marca ficam centralizadas em `frontend/css/styles.css`, no bloco
`:root` (variáveis `--brand-*`, `--surface-*`, `--text-*`). Basta trocar os
valores para aplicar a nova identidade visual em todo o sistema — inclusive
no modo escuro (bloco `.dark`).
