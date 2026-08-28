import fs from "fs";
import path from "path";
import multer from "multer";

const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || "./uploads");
const SERVICES_DIR = path.join(UPLOADS_DIR, "services");
const EMPLOYEES_DIR = path.join(UPLOADS_DIR, "employees");

for (const dir of [UPLOADS_DIR, SERVICES_DIR, EMPLOYEES_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];

function makeStorage(subdir: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join(UPLOADS_DIR, subdir)),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".jpg";
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, unique);
    },
  });
}

function fileFilter(_req: unknown, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Formato de imagem não suportado."));
}

export const uploadServicePhoto = multer({
  storage: makeStorage("services"),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const uploadEmployeePhoto = multer({
  storage: makeStorage("employees"),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export { UPLOADS_DIR };
