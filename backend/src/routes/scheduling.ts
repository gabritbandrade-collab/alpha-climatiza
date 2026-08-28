import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { getEmployeeSuggestions } from "../lib/scheduling";

const router = Router();
router.use(requireAuth, requireAdmin);

router.get("/suggestions", async (req, res) => {
  const { city, at, excludeServiceId } = req.query as { city?: string; at?: string; excludeServiceId?: string };
  if (!city || !at) {
    return res.status(400).json({ error: "Informe cidade e data/horário." });
  }
  const targetAt = new Date(at);
  if (Number.isNaN(targetAt.getTime())) {
    return res.status(400).json({ error: "Data/horário inválido." });
  }
  const suggestions = await getEmployeeSuggestions({ city, targetAt, excludeServiceId });
  res.json(suggestions);
});

export default router;
