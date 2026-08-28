export type Role = "ADMIN" | "EMPLOYEE";
export type UserStatus = "ACTIVE" | "INACTIVE";
export type ServiceStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "PENDING" | "CANCELLED";
export type PhotoType = "BEFORE" | "AFTER";
export type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type ServiceRequestStatus = "PENDING" | "ASSIGNED" | "CANCELLED";

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Baixa",
  NORMAL: "Normal",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  NORMAL: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  HIGH: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  URGENT: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export const REQUEST_STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  PENDING: "Aguardando distribuição",
  ASSIGNED: "Atribuído",
  CANCELLED: "Cancelado",
};

export const STATUS_LABELS: Record<ServiceStatus, string> = {
  SCHEDULED: "Agendado",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
  PENDING: "Pendente",
  CANCELLED: "Cancelado",
};

export const STATUS_COLORS: Record<ServiceStatus, string> = {
  SCHEDULED: "#f59e0b",
  IN_PROGRESS: "#3b82f6",
  COMPLETED: "#22c55e",
  PENDING: "#ef4444",
  CANCELLED: "#64748b",
};

export const STATUS_DOT: Record<ServiceStatus, string> = {
  SCHEDULED: "🟡",
  IN_PROGRESS: "🔵",
  COMPLETED: "🟢",
  PENDING: "🔴",
  CANCELLED: "⚫",
};

export interface AuthUser {
  id: string;
  role: Role;
  name: string;
  email: string;
  phone?: string | null;
  cargo?: string | null;
  photoUrl?: string | null;
}

export interface EmployeeCity {
  id: string;
  city: string;
  state?: string | null;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  cargo?: string | null;
  photoUrl?: string | null;
  status: UserStatus;
  role: Role;
  createdAt: string;
  _count?: { servicesAsEmployee: number };
  servicesAsEmployee?: Service[];
  serviceRegions?: EmployeeCity[];
}

export interface Client {
  id: string;
  name: string;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  number?: string | null;
  complement?: string | null;
  city?: string | null;
  state?: string | null;
  notes?: string | null;
  createdAt: string;
  _count?: { services: number };
  services?: Service[];
}

export interface ServicePhoto {
  id: string;
  serviceId: string;
  type: PhotoType;
  url: string;
  createdAt: string;
}

export interface ServiceMaterial {
  id: string;
  serviceId: string;
  name: string;
  quantity: string;
  notes?: string | null;
  createdAt: string;
}

export interface ServiceHistoryEntry {
  id: string;
  action: string;
  fromValue?: string | null;
  toValue?: string | null;
  createdAt: string;
  user?: { id: string; name: string } | null;
}

export interface Service {
  id: string;
  serviceType: string;
  description?: string | null;
  notes?: string | null;
  materialsPlan?: string | null;
  address: string;
  city?: string | null;
  state?: string | null;
  priority: Priority;
  scheduledAt: string;
  status: ServiceStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  employeeObservations?: string | null;
  problems?: string | null;
  pendingNotes?: string | null;
  clientId: string;
  client: Client;
  employeeId: string;
  employee: { id: string; name: string; phone?: string | null; cargo?: string | null; photoUrl?: string | null };
  photos: ServicePhoto[];
  materials: ServiceMaterial[];
  history: ServiceHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRequest {
  id: string;
  clientName: string;
  phone?: string | null;
  address: string;
  city: string;
  state?: string | null;
  serviceType: string;
  description?: string | null;
  desiredAt: string;
  notes?: string | null;
  materialsPlan?: string | null;
  priority: Priority;
  status: ServiceRequestStatus;
  clientId?: string | null;
  resultingServiceId?: string | null;
  resultingService?: {
    id: string;
    status?: ServiceStatus;
    employee: { id: string; name: string; phone?: string | null; cargo?: string | null };
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeSuggestion {
  id: string;
  name: string;
  cargo?: string | null;
  photoUrl?: string | null;
  phone?: string | null;
  cities: { city: string; state: string | null }[];
  serviceCountOnDate: number;
  sameCityServiceCountOnDate: number;
  conflict: {
    hasConflict: boolean;
    conflictingService?: {
      id: string;
      serviceType: string;
      scheduledAt: string;
      clientName: string;
    };
  };
  recommended: boolean;
  reasons: string[];
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  relatedServiceId?: string | null;
  createdAt: string;
}

export interface DashboardStats {
  total: number;
  today: number;
  inProgress: number;
  completed: number;
  pending: number;
  scheduled: number;
  cancelled: number;
  employees: number;
  clients: number;
  byStatus: { status: ServiceStatus; count: number }[];
  timeline: { date: string; count: number }[];
  employeeLoad: { id: string; name: string; count: number }[];
}
