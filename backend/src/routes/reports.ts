import { Router } from "express";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { prisma } from "../lib/prisma";
import { requireAdmin, requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth, requireAdmin);

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendado",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
  PENDING: "Pendente",
  CANCELLED: "Cancelado",
};

function buildWhere(query: Record<string, string>) {
  const { dateFrom, dateTo, employeeId, clientId, status } = query;
  const where: any = {};
  if (employeeId) where.employeeId = employeeId;
  if (clientId) where.clientId = clientId;
  if (status) where.status = status;
  if (dateFrom || dateTo) {
    where.scheduledAt = {};
    if (dateFrom) where.scheduledAt.gte = new Date(dateFrom);
    if (dateTo) where.scheduledAt.lte = new Date(dateTo);
  }
  return where;
}

async function fetchServices(query: Record<string, string>) {
  return prisma.service.findMany({
    where: buildWhere(query),
    orderBy: { scheduledAt: "desc" },
    include: {
      client: { select: { name: true } },
      employee: { select: { name: true } },
      materials: true,
    },
  });
}

router.get("/services", async (req, res) => {
  const services = await fetchServices(req.query as Record<string, string>);
  res.json(
    services.map((s) => ({
      id: s.id,
      serviceType: s.serviceType,
      client: s.client.name,
      employee: s.employee.name,
      status: s.status,
      statusLabel: STATUS_LABELS[s.status] ?? s.status,
      scheduledAt: s.scheduledAt,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      address: s.address,
      materialsCount: s.materials.length,
    }))
  );
});

router.get("/materials", async (req, res) => {
  const services = await fetchServices(req.query as Record<string, string>);
  const totals = new Map<string, { name: string; quantity: number; uses: number }>();
  for (const s of services) {
    for (const m of s.materials) {
      const key = m.name.trim().toLowerCase();
      const qty = parseFloat(m.quantity.replace(",", ".")) || 0;
      const entry = totals.get(key) || { name: m.name, quantity: 0, uses: 0 };
      entry.quantity += qty;
      entry.uses += 1;
      totals.set(key, entry);
    }
  }
  res.json(Array.from(totals.values()).sort((a, b) => b.uses - a.uses));
});

router.get("/summary", async (req, res) => {
  const services = await fetchServices(req.query as Record<string, string>);
  const byStatus: Record<string, number> = {};
  const byEmployee: Record<string, number> = {};
  const byClient: Record<string, number> = {};
  for (const s of services) {
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;
    byEmployee[s.employee.name] = (byEmployee[s.employee.name] || 0) + 1;
    byClient[s.client.name] = (byClient[s.client.name] || 0) + 1;
  }
  res.json({
    total: services.length,
    byStatus,
    byEmployee,
    byClient,
  });
});

router.get("/export/csv", async (req, res) => {
  const services = await fetchServices(req.query as Record<string, string>);
  const header = [
    "Tipo de Serviço",
    "Cliente",
    "Funcionário",
    "Status",
    "Agendado em",
    "Iniciado em",
    "Concluído em",
    "Endereço",
  ];
  const rows = services.map((s) =>
    [
      s.serviceType,
      s.client.name,
      s.employee.name,
      STATUS_LABELS[s.status] ?? s.status,
      s.scheduledAt.toLocaleString("pt-BR"),
      s.startedAt ? s.startedAt.toLocaleString("pt-BR") : "",
      s.completedAt ? s.completedAt.toLocaleString("pt-BR") : "",
      s.address,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(";")
  );
  const csv = "﻿" + [header.join(";"), ...rows].join("\r\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=relatorio-servicos.csv");
  res.send(csv);
});

router.get("/export/xlsx", async (req, res) => {
  const services = await fetchServices(req.query as Record<string, string>);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Serviços");
  sheet.columns = [
    { header: "Tipo de Serviço", key: "serviceType", width: 22 },
    { header: "Cliente", key: "client", width: 24 },
    { header: "Funcionário", key: "employee", width: 22 },
    { header: "Status", key: "status", width: 16 },
    { header: "Agendado em", key: "scheduledAt", width: 20 },
    { header: "Iniciado em", key: "startedAt", width: 20 },
    { header: "Concluído em", key: "completedAt", width: 20 },
    { header: "Endereço", key: "address", width: 32 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const s of services) {
    sheet.addRow({
      serviceType: s.serviceType,
      client: s.client.name,
      employee: s.employee.name,
      status: STATUS_LABELS[s.status] ?? s.status,
      scheduledAt: s.scheduledAt.toLocaleString("pt-BR"),
      startedAt: s.startedAt ? s.startedAt.toLocaleString("pt-BR") : "",
      completedAt: s.completedAt ? s.completedAt.toLocaleString("pt-BR") : "",
      address: s.address,
    });
  }
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", "attachment; filename=relatorio-servicos.xlsx");
  await workbook.xlsx.write(res);
  res.end();
});

router.get("/export/pdf", async (req, res) => {
  const services = await fetchServices(req.query as Record<string, string>);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=relatorio-servicos.pdf");

  const doc = new PDFDocument({ margin: 36, size: "A4", layout: "landscape" });
  doc.pipe(res);

  doc.fontSize(16).text("Relatório de Serviços - ALPHA CLIMATIZAÇÃO", { align: "left" });
  doc.fontSize(9).fillColor("#555").text(`Gerado em ${new Date().toLocaleString("pt-BR")}`);
  doc.moveDown(1);
  doc.fillColor("#000");

  const colWidths = [110, 130, 110, 80, 100, 100, 160];
  const headers = ["Serviço", "Cliente", "Funcionário", "Status", "Agendado", "Concluído", "Endereço"];
  let y = doc.y;
  const startX = doc.x;

  function drawRow(values: string[], bold = false) {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(8);
    let x = startX;
    const rowHeight = 18;
    values.forEach((v, i) => {
      doc.text(v, x, y, { width: colWidths[i], height: rowHeight, ellipsis: true });
      x += colWidths[i];
    });
    y += rowHeight;
    if (y > doc.page.height - 50) {
      doc.addPage();
      y = doc.y;
    }
  }

  drawRow(headers, true);
  doc.moveTo(startX, y).lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y).stroke();
  y += 4;

  for (const s of services) {
    drawRow([
      s.serviceType,
      s.client.name,
      s.employee.name,
      STATUS_LABELS[s.status] ?? s.status,
      s.scheduledAt.toLocaleDateString("pt-BR"),
      s.completedAt ? s.completedAt.toLocaleDateString("pt-BR") : "-",
      s.address,
    ]);
  }

  doc.end();
});

export default router;
