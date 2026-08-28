import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { requireAuth, signToken } from "../middleware/auth";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ error: "Informe e-mail e senha." });
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    return res.status(401).json({ error: "E-mail ou senha inválidos." });
  }
  if (user.status === "INACTIVE") {
    return res.status(403).json({ error: "Usuário inativo. Contate o administrador." });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "E-mail ou senha inválidos." });
  }

  const authUser = {
    id: user.id,
    role: user.role as "ADMIN" | "EMPLOYEE",
    name: user.name,
    email: user.email,
  };
  const token = signToken(authUser);

  res.json({
    token,
    user: {
      ...authUser,
      phone: user.phone,
      cargo: user.cargo,
      photoUrl: user.photoUrl,
    },
  });
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) return res.status(400).json({ error: "Informe o e-mail." });

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  // Always respond the same way to avoid leaking which emails exist.
  res.json({
    message:
      "Se este e-mail estiver cadastrado, o administrador do sistema foi notificado para redefinir sua senha. Entre em contato com a empresa para receber uma nova senha temporária.",
  });

  if (user) {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
    await Promise.all(
      admins.map((admin) =>
        prisma.notification.create({
          data: {
            userId: admin.id,
            title: "Solicitação de redefinição de senha",
            message: `${user.name} (${user.email}) solicitou a redefinição de senha.`,
          },
        })
      )
    );
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
  const { passwordHash, ...safe } = user;
  res.json(safe);
});

router.put("/me", requireAuth, async (req, res) => {
  const { name, phone, photoUrl } = req.body as { name?: string; phone?: string; photoUrl?: string };
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      name: name || undefined,
      phone: phone ?? undefined,
      photoUrl: photoUrl ?? undefined,
    },
  });
  const { passwordHash, ...safe } = user;
  res.json(safe);
});

router.post("/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Informe a senha atual e a nova senha." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "A nova senha deve ter ao menos 6 caracteres." });
  }
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Senha atual incorreta." });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  res.json({ message: "Senha alterada com sucesso." });
});

export default router;
