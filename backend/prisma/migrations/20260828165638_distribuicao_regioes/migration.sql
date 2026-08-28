-- CreateTable
CREATE TABLE "employee_cities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "employee_cities_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "service_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientName" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "serviceType" TEXT NOT NULL,
    "description" TEXT,
    "desiredAt" DATETIME NOT NULL,
    "notes" TEXT,
    "materialsPlan" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "clientId" TEXT,
    "resultingServiceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "service_requests_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "service_requests_resultingServiceId_fkey" FOREIGN KEY ("resultingServiceId") REFERENCES "services" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_services" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceType" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "materialsPlan" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "scheduledAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "employeeObservations" TEXT,
    "problems" TEXT,
    "pendingNotes" TEXT,
    "clientId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "services_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "services_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_services" ("address", "clientId", "completedAt", "createdAt", "description", "employeeId", "employeeObservations", "id", "materialsPlan", "notes", "pendingNotes", "problems", "scheduledAt", "serviceType", "startedAt", "status", "updatedAt") SELECT "address", "clientId", "completedAt", "createdAt", "description", "employeeId", "employeeObservations", "id", "materialsPlan", "notes", "pendingNotes", "problems", "scheduledAt", "serviceType", "startedAt", "status", "updatedAt" FROM "services";
DROP TABLE "services";
ALTER TABLE "new_services" RENAME TO "services";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "employee_cities_employeeId_city_key" ON "employee_cities"("employeeId", "city");

-- CreateIndex
CREATE UNIQUE INDEX "service_requests_resultingServiceId_key" ON "service_requests"("resultingServiceId");
