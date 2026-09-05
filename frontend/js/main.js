import { registerRoutes, startRouter } from "./router.js";
import { renderAdminShell, renderEmployeeShell, renderBareLayout } from "./layouts.js";
import { initTheme } from "./lib/theme.js";
import { renderLoginPage } from "./pages/login.js";

import { renderDashboardPage } from "./pages/admin/dashboard.js";
import { renderAgendaPage } from "./pages/admin/agenda.js";
import { renderServiceFormPage } from "./pages/admin/serviceForm.js";
import { renderAdminServiceDetailPage } from "./pages/admin/serviceDetail.js";
import { renderClientsPage } from "./pages/admin/clients.js";
import { renderClientDetailPage } from "./pages/admin/clientDetail.js";
import { renderEmployeesPage } from "./pages/admin/employees.js";
import { renderEmployeeDetailPage } from "./pages/admin/employeeDetail.js";
import { renderReportsPage } from "./pages/admin/reports.js";
import { renderAdminNotificationsPage } from "./pages/admin/notifications.js";
import { renderServiceRequestsPage } from "./pages/admin/serviceRequests.js";
import { renderServiceRequestDetailPage } from "./pages/admin/serviceRequestDetail.js";
import { renderDistributionPage } from "./pages/admin/distribution.js";

import { renderEmployeeHomePage } from "./pages/employee/home.js";
import { renderEmployeeServicesPage } from "./pages/employee/services.js";
import { renderEmployeeServiceDetailPage } from "./pages/employee/serviceDetail.js";
import { renderEmployeeServiceExecutionPage } from "./pages/employee/serviceExecution.js";
import { renderEmployeeNotificationsPage } from "./pages/employee/notifications.js";
import { renderEmployeeProfilePage } from "./pages/employee/profile.js";

initTheme();

function admin(renderFn) {
  return async (params, query) => {
    const content = renderAdminShell();
    await renderFn(content, params, query);
  };
}

function employee(renderFn) {
  return async (params, query) => {
    const content = renderEmployeeShell();
    await renderFn(content, params, query);
  };
}

registerRoutes([
  {
    path: "/login",
    role: null,
    handler: async () => {
      renderBareLayout();
      renderLoginPage();
    },
  },

  { path: "/admin", role: "ADMIN", handler: admin(renderDashboardPage) },
  { path: "/admin/agenda", role: "ADMIN", handler: admin(renderAgendaPage) },
  { path: "/admin/solicitacoes", role: "ADMIN", handler: admin(renderServiceRequestsPage) },
  { path: "/admin/solicitacoes/:id", role: "ADMIN", handler: admin(renderServiceRequestDetailPage) },
  { path: "/admin/distribuicao", role: "ADMIN", handler: admin(renderDistributionPage) },
  { path: "/admin/servicos/novo", role: "ADMIN", handler: admin(renderServiceFormPage) },
  { path: "/admin/servicos/:id/editar", role: "ADMIN", handler: admin(renderServiceFormPage) },
  { path: "/admin/servicos/:id", role: "ADMIN", handler: admin(renderAdminServiceDetailPage) },
  { path: "/admin/clientes", role: "ADMIN", handler: admin(renderClientsPage) },
  { path: "/admin/clientes/:id", role: "ADMIN", handler: admin(renderClientDetailPage) },
  { path: "/admin/funcionarios", role: "ADMIN", handler: admin(renderEmployeesPage) },
  { path: "/admin/funcionarios/:id", role: "ADMIN", handler: admin(renderEmployeeDetailPage) },
  { path: "/admin/relatorios", role: "ADMIN", handler: admin(renderReportsPage) },
  { path: "/admin/notificacoes", role: "ADMIN", handler: admin(renderAdminNotificationsPage) },

  { path: "/app", role: "EMPLOYEE", handler: employee(renderEmployeeHomePage) },
  { path: "/app/servicos", role: "EMPLOYEE", handler: employee(renderEmployeeServicesPage) },
  { path: "/app/servicos/:id/execucao", role: "EMPLOYEE", handler: employee(renderEmployeeServiceExecutionPage) },
  { path: "/app/servicos/:id", role: "EMPLOYEE", handler: employee(renderEmployeeServiceDetailPage) },
  { path: "/app/notificacoes", role: "EMPLOYEE", handler: employee(renderEmployeeNotificationsPage) },
  { path: "/app/perfil", role: "EMPLOYEE", handler: employee(renderEmployeeProfilePage) },
]);

startRouter();
