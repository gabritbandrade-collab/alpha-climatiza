# ALPHA CLIMATIZAÇÃO — Sistema de Gestão de Serviços Externos

Aplicativo web completo para administração de clientes, funcionários e serviços
externos, com painel administrativo (desktop) e app mobile para os funcionários
em campo.

## Estrutura do projeto

```
backend/     API REST em Node.js + Express + TypeScript + Prisma + SQLite
frontend/    Aplicação React + Vite + TypeScript + Tailwind CSS
```

## Como rodar o projeto

### 1. Backend (API)

```bash
cd backend
npm install
npx prisma migrate dev   # cria o banco de dados (primeira vez)
npm run seed              # popula com dados de exemplo
npm run dev                # inicia a API em http://localhost:3333
```

### 2. Frontend (aplicativo web)

Em outro terminal:

```bash
cd frontend
npm install
npm run dev   # inicia em http://localhost:5173
```

Abra `http://localhost:5173` no navegador.

## Acessos de demonstração

| Perfil        | E-mail                              | Senha    |
|---------------|--------------------------------------|----------|
| Administrador | admin@nsclimatizacao.com.br          | admin123 |
| Funcionário   | joao@nsclimatizacao.com.br           | 123456   |
| Funcionário   | marcos@nsclimatizacao.com.br         | 123456   |
| Funcionário   | renata@nsclimatizacao.com.br         | 123456   |

## Apagando os dados de exemplo e usando dados reais

Os dados de demonstração (clientes, funcionários e serviços fictícios) existem
apenas para você visualizar o sistema funcionando. Para começar a usar com os
dados reais da empresa:

1. Entre como Administrador.
2. Vá em **Funcionários** e **Clientes** e exclua os registros de exemplo (ou
   simplesmente cadastre os reais e vá excluindo os de exemplo aos poucos).
3. Também é possível apagar tudo e recomeçar do zero rodando novamente:
   ```bash
   cd backend
   npx prisma migrate reset
   ```
   Isso recria o banco vazio. Depois crie o primeiro usuário administrador
   editando `backend/prisma/seed.ts` (ou peça para o desenvolvedor criar um
   script de "primeiro acesso").

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
  exportação em CSV, Excel e PDF.
- Modo claro/escuro, layout responsivo (desktop, tablet e celular).
- Banco de dados real (SQLite via Prisma) com upload de fotos armazenado em
  disco — nada é simulado apenas na tela.
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

As cores da marca ficam centralizadas em
`frontend/src/index.css` (bloco `:root`, variáveis `--brand-*`). Basta trocar
os valores para aplicar a nova identidade visual em todo o sistema.
