import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import prisma from "./lib/prisma";
import { renderTemplate } from "./services/template-engine/renderer";
import type { LandingPageData } from "./services/template-engine/renderer"; // ← tambahkan import tipe

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health Check
app.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "CBLZ Landing Page Builder API 🚀",
    version: "0.1.0",
    status: "online",
  });
});

app.get("/api/hello", (_req: Request, res: Response) => {
  res.json({ hello: "world" });
});

// ─── Generate Landing Page ─────────────────────────────
app.post("/api/pages/generate", async (req: Request, res: Response) => {
  try {
    const {
      userId = "guest",
      template = "office",
      title,
      headline,
      subheadline,
      cta,
      features,
      image,
    } = req.body;

    if (!title && !headline) {
      return res.status(400).json({ error: "Judul atau headline wajib diisi" });
    }

    const baseSlug = (title || headline)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const slug = `${baseSlug}-${Date.now()}`;

    const pageData: LandingPageData = {
      headline: headline || title,
      subheadline: subheadline || "Solusi terbaik untuk Anda",
      cta: cta || "Hubungi Sekarang",
      features: features || ["Mudah", "Cepat", "Profesional"],
      image: image || "https://via.placeholder.com/400x300",
      // watermark tidak disertakan di sini karena bukan bagian dari LandingPageData,
      // bisa ditambahkan jika diperlukan
    };

    // Simpan ke database
    const page = await prisma.page.create({
      data: {
        userId,
        template,
        slug,
        data: pageData,
        published: true,
      },
    });

    // ⚠️ Pastikan await, karena renderTemplate mengembalikan Promise<string>
    const html = await renderTemplate(template, pageData);

    res.status(201).json({
      success: true,
      pageId: page.id,
      slug,
      url: `${process.env.FRONTEND_URL || "https://cblzai.com"}/p/${slug}`,
      previewHtml: html.substring(0, 200) + "...",
    });
  } catch (error) {
    console.error("Generate error:", error);
    res.status(500).json({ error: "Gagal membuat landing page" });
  }
});

// ─── List Pages ────────────────────────────────────────
app.get("/api/pages", async (req: Request, res: Response) => {
  try {
    const userId =
      typeof req.query.userId === "string" ? req.query.userId : undefined;

    const pages = await prisma.page.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: "desc" },
    });

    res.json({ pages });
  } catch (error) {
    console.error("Error fetching pages:", error);
    res.status(500).json({ error: "Gagal mengambil daftar halaman" });
  }
});

// ─── Get Page HTML ─────────────────────────────────────
app.get("/api/pages/:slug/html", async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug;
    if (!slug) {
      return res.status(400).json({ error: "Slug tidak valid" });
    }

    const page = await prisma.page.findUnique({ where: { slug } });
    if (!page) {
      return res.status(404).json({ error: "Halaman tidak ditemukan" });
    }

    // ⚠️ Pastikan await, dan gunakan type assertion yang aman
    const html = await renderTemplate(page.template, page.data as LandingPageData);

    res.json({ html, slug: page.slug });
  } catch (error) {
    console.error("Error fetching page:", error);
    res.status(500).json({ error: "Gagal mengambil halaman" });
  }
});

// ─── Auth Placeholder ─────────────────────────────────
app.post("/api/auth/login", async (_req: Request, res: Response) => {
  res.json({ message: "Login endpoint belum diimplementasikan" });
});

// ─── Global Error Handler ──────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Server error:", err.message);
  res.status(500).json({ error: "Terjadi kesalahan pada server" });
});

// ─── Start Server ──────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Server berjalan di port ${PORT}`);
  console.log(`🌐 http://localhost:${PORT}`);
});
