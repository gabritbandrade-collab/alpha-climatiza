# ALPHA CLIMATIZAÇÃO — Sistema de Gestão de Serviços Externos

Aplicativo web completo para administração de clientes, funcionários e serviços
externos, com painel administrativo (desktop) e app mobile para os funcionários
em campo.

**Frontend 100% HTML, CSS e JavaScript puros** — sem React, sem TypeScript e
sem build step. O painel administrativo e o app do funcionário rodam
inteiramente no navegador e conversam direto com um banco de dados real no
**Supabase** (Postgres + Auth + Storage), então todo mundo (administrador e
funcionários, de qualquer dispositivo) compartilha os mesmos dados.

## Estrutura do projeto

```
frontend/
  index.html        Ponto de entrada
  css/styles.css     Todo o visual do sistema (variáveis de cor, componentes)
  assets/            Ícone e logo do site
  js/
    main.js          Bootstrap: aguarda a sessão do Supabase, registra rotas
                      e inicia o roteador
    router.js        Roteador baseado em hash (#/admin/agenda, #/app, ...)
    layouts.js        Estrutura do painel admin e do app do funcionário
    lib/
      store.js         Camada de dados: fala com o Supabase (Postgres/Auth/
                        Storage) e concentra toda a lógica de negócio —
                        autenticação, agendamento, distribuição por cidade,
                        dashboard, relatórios etc.
      ui.js            Toasts, modais, gráficos (SVG/CSS), exportação de
                        relatórios (CSV/Excel/PDF)
      icons.js         Ícones em SVG inline
      date.js          Formatação de datas em pt-BR
      theme.js         Modo claro/escuro
    components/        Pequenos widgets reutilizáveis (tags de cidade)
    pages/admin/       Uma tela por arquivo (dashboard, agenda, clientes...)
    pages/employee/    Telas do app do funcionário
```

## Banco de dados (Supabase)

O projeto Supabase (Postgres + Auth + Storage + uma Edge Function) já vem
configurado — a URL e a chave pública ficam embutidas em
`frontend/js/lib/store.js` (é seguro expor essa chave: o acesso real é
controlado por Row Level Security no banco). Principais peças:

- **Tabelas**: `profiles` (admin/funcionários), `employee_cities`, `clients`,
  `services` (+ `service_photos`, `service_materials`, `service_history`),
  `service_requests`, `notifications` — todas com RLS: cada funcionário só
  enxerga/edita os próprios serviços; cadastro de clientes, funcionários e
  solicitações é restrito ao administrador.
- **Autenticação**: Supabase Auth de verdade (sessão/JWT). Criar, trocar
  e-mail/senha ou excluir um funcionário passa pela Edge Function
  `admin-users`, que usa a service role no servidor (nunca exposta no
  navegador) e só aceita chamadas de um administrador autenticado.
- **Fotos**: enviadas para os buckets `service-photos` e `employee-photos`
  do Supabase Storage (redimensionadas no navegador antes do envio).

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

Tudo fica no banco Postgres do projeto Supabase — os mesmos dados aparecem
para qualquer pessoa que acessar o sistema, em qualquer computador ou
celular. A sessão de login (token do Supabase Auth) é o único dado guardado
no navegador de cada pessoa, só para não pedir login a cada acesso.

## Apagando os dados de exemplo e cadastrando os reais

Não há um botão de "resetar" pelo navegador (o banco agora é compartilhado
por todo mundo, então isso teria que ser uma ação deliberada do
administrador). Para limpar os dados de demonstração:

1. Entre como Administrador.
2. Vá em **Funcionários** e **Clientes** e exclua os registros de exemplo
   (ou cadastre os reais e vá excluindo os de exemplo aos poucos).
3. Para apagar tudo de uma vez e começar do zero, use o painel do Supabase
   (SQL Editor) para limpar as tabelas `services`, `service_requests`,
   `clients`, `notifications` etc., e o painel de Authentication para
   remover os usuários de demonstração.

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
