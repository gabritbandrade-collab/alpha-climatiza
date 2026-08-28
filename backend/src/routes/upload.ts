import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { uploadEmployeePhoto } from "../lib/upload";

const router = Router();

router.post("/employee-photo", requireAuth, uploadEmployeePhoto.single("photo"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado." });
  res.status(201).json({ url: `/uploads/employees/${req.file.filename}` });
});

export default router;
