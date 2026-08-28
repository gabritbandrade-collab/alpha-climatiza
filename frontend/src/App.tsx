import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { FullPageSpinner } from "./components/ui/Misc";

import { LoginPage } from "./pages/LoginPage";
import { AdminLayout } from "./components/layout/AdminLayout";
import { EmployeeLayout } from "./components/layout/EmployeeLayout";

import { DashboardPage } from "./pages/admin/DashboardPage";
import { AgendaPage } from "./pages/admin/AgendaPage";
import { ServiceFormPage } from "./pages/admin/ServiceFormPage";
import { AdminServiceDetailPage } from "./pages/admin/AdminServiceDetailPage";
import { ClientsPage } from "./pages/admin/ClientsPage";
import { ClientDetailPage } from "./pages/admin/ClientDetailPage";
import { EmployeesPage } from "./pages/admin/EmployeesPage";
import { EmployeeDetailPage } from "./pages/admin/EmployeeDetailPage";
import { ReportsPage } from "./pages/admin/ReportsPage";
import { AdminNotificationsPage } from "./pages/admin/AdminNotificationsPage";
import { ServiceRequestsPage } from "./pages/admin/ServiceRequestsPage";
import { ServiceRequestDetailPage } from "./pages/admin/ServiceRequestDetailPage";
import { DistributionPage } from "./pages/admin/DistributionPage";

import { EmployeeHomePage } from "./pages/employee/EmployeeHomePage";
import { EmployeeServicesPage } from "./pages/employee/EmployeeServicesPage";
import { EmployeeServiceDetailPage } from "./pages/employee/EmployeeServiceDetailPage";
import { EmployeeServiceExecutionPage } from "./pages/employee/EmployeeServiceExecutionPage";
import { EmployeeNotificationsPage } from "./pages/employee/EmployeeNotificationsPage";
import { EmployeeProfilePage } from "./pages/employee/EmployeeProfilePage";

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "ADMIN" ? "/admin" : "/app"} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/login" element={<LoginPage />} />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute role="ADMIN">
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="agenda" element={<AgendaPage />} />
                <Route path="solicitacoes" element={<ServiceRequestsPage />} />
                <Route path="solicitacoes/:id" element={<ServiceRequestDetailPage />} />
                <Route path="distribuicao" element={<DistributionPage />} />
                <Route path="servicos/novo" element={<ServiceFormPage />} />
                <Route path="servicos/:id" element={<AdminServiceDetailPage />} />
                <Route path="servicos/:id/editar" element={<ServiceFormPage />} />
                <Route path="clientes" element={<ClientsPage />} />
                <Route path="clientes/:id" element={<ClientDetailPage />} />
                <Route path="funcionarios" element={<EmployeesPage />} />
                <Route path="funcionarios/:id" element={<EmployeeDetailPage />} />
                <Route path="relatorios" element={<ReportsPage />} />
                <Route path="notificacoes" element={<AdminNotificationsPage />} />
              </Route>

              <Route
                path="/app"
                element={
                  <ProtectedRoute role="EMPLOYEE">
                    <EmployeeLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<EmployeeHomePage />} />
                <Route path="servicos" element={<EmployeeServicesPage />} />
                <Route path="servicos/:id" element={<EmployeeServiceDetailPage />} />
                <Route path="servicos/:id/execucao" element={<EmployeeServiceExecutionPage />} />
                <Route path="notificacoes" element={<EmployeeNotificationsPage />} />
                <Route path="perfil" element={<EmployeeProfilePage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
