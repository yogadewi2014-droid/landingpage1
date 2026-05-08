// product.ts
type Testimonial = {
  name: string;
  text: string;
  rating?: number;
};

import type { LandingPageData as BaseLandingPageData } from "./modern";
export type LandingPageData = BaseLandingPageData;

const DEFAULT_IMAGE =
  "https://res.cloudinary.com/demo/image/upload/v1712345678/templates/product/fallback-product.jpg";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function optimizeCloudinary(url: string, width = 900): string {
  if (!url) return DEFAULT_IMAGE;
  if (url.includes("cloudinary.com")) {
    return url.replace(
      "/upload/",
      `/upload/f_auto,q_auto,w_${width},c_limit/`
    );
  }
  return url;
}

async function searchPexels(keyword: string): Promise<string | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.warn("PEXELS_API_KEY tidak disetel – melewati Pexels.");
    return null;
  }
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(
        keyword
      )}&per_page=1`,
      { headers: { Authorization: apiKey } }
    );
    const data = (await res.json()) as {
      photos?: { src: { large2x: string } }[];
    };
    return data?.photos?.[0]?.src?.large2x || null;
  } catch (err) {
    console.error("Pexels search error:", err);
    return null;
  }
}

async function searchWikimedia(keyword: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        keyword
      )}&gsrlimit=1&prop=imageinfo&iiprop=url&format=json&origin=*`
    );
    const data = (await res.json()) as {
      query?: {
        pages?: Record<
          string,
          { imageinfo?: { url: string }[] }
        >;
      };
    };
    const pages = data?.query?.pages;
    if (!pages) return null;
    const first = Object.values(pages)[0];
    return first?.imageinfo?.[0]?.url || null;
  } catch (err) {
    console.error("Wikimedia search error:", err);
    return null;
  }
}

async function uploadToCloudinary(imageUrl: string): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) {
    console.warn("Cloudinary config tidak lengkap – mengembalikan URL asli.");
    return imageUrl;
  }
  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: imageUrl,
          upload_preset: uploadPreset,
          folder: "landing-pages/product",
        }),
      }
    );
    const data = (await res.json()) as { secure_url?: string };
    return data.secure_url || imageUrl;
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    return imageUrl;
  }
}

async function resolveImage(
  keyword: string,
  userImage?: string,
  fallbackImage?: string
): Promise<string> {
  if (userImage) {
    const uploaded = await uploadToCloudinary(userImage);
    return optimizeCloudinary(uploaded);
  }
  const pexels = await searchPexels(`${keyword} product`);
  if (pexels) {
    const uploaded = await uploadToCloudinary(pexels);
    return optimizeCloudinary(uploaded);
  }
  const wiki = await searchWikimedia(`${keyword} product`);
  if (wiki) {
    const uploaded = await uploadToCloudinary(wiki);
    return optimizeCloudinary(uploaded);
  }
  return optimizeCloudinary(fallbackImage || DEFAULT_IMAGE);
}

export async function render(data: LandingPageData): Promise<string> {
  if (!process.env.PEXELS_API_KEY)
    console.warn("[product.ts] PEXELS_API_KEY kosong.");
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_UPLOAD_PRESET)
    console.warn("[product.ts] Cloudinary config kurang.");

  const image = await resolveImage(
    data.headline || "product",
    data.image,
    data.fallbackImage
  );

  const headline = escapeHtml(data.headline || "Produk Unggulan");
  const subheadline = escapeHtml(
    data.subheadline || "Solusi terbaik untuk kebutuhan Anda."
  );
  const badge = escapeHtml(data.badge || "🏆 Best Seller");
  const featureTitle = escapeHtml(data.featureTitle || "Keunggulan Produk");
  const testimonialTitle = escapeHtml(data.testimonialTitle || "Testimoni Pelanggan");
  const ctaTitle = escapeHtml(data.ctaTitle || "Dapatkan Sekarang");
  const ctaDescription = escapeHtml(
    data.ctaDescription || "Jangan lewatkan penawaran spesial ini."
  );
  const ctaText = escapeHtml(data.cta || "Beli Sekarang");
  const ctaLink = escapeHtml(data.ctaLink || "#");

  const featuresHtml = (data.features || [])
    .map(
      (f) =>
        `<div class="feature"><div class="icon">✓</div><p>${escapeHtml(f)}</p></div>`
    )
    .join("");

  const testimonialsHtml = (data.testimonials || [])
    .map(
      (t) => `
        <div class="testimonial">
          <div class="stars">${"★".repeat(t.rating || 5)}</div>
          <p>"${escapeHtml(t.text)}"</p>
          <div class="user">— ${escapeHtml(t.name)}</div>
        </div>`
    )
    .join("");

  const testimonialSection = data.testimonials?.length
    ? `<section class="section">
         <h2 class="section-title">${testimonialTitle}</h2>
         ${testimonialsHtml}
       </section>`
    : "";

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${headline}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Inter',sans-serif;background:#f4f7fb;color:#0f172a;}
    .container{max-width:520px;margin:0 auto;background:white;min-height:100vh;overflow:hidden;}
    .hero{position:relative;padding:56px 24px 42px;background:radial-gradient(circle at top left,#6366f1 0%,transparent 35%),radial-gradient(circle at top right,#8b5cf6 0%,transparent 30%),linear-gradient(135deg,#312e81,#4f46e5,#7c3aed);color:white;text-align:center;}
    .badge{display:inline-block;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.2);backdrop-filter:blur(10px);padding:10px 18px;border-radius:999px;font-size:13px;margin-bottom:22px;}
    h1{font-size:36px;line-height:1.15;font-weight:800;margin-bottom:16px;}
    .subheadline{font-size:16px;line-height:1.7;opacity:.92;margin-bottom:28px;}
    .hero img{width:100%;border-radius:28px;object-fit:cover;box-shadow:0 20px 40px rgba(0,0,0,0.25),0 0 0 6px rgba(255,255,255,0.08);}
    .section{padding:30px 24px;}
    .section-title{font-size:26px;font-weight:800;margin-bottom:22px;text-align:center;color:#111827;}
    .feature{display:flex;gap:14px;align-items:flex-start;background:#f8fafc;border:1px solid #e2e8f0;border-radius:22px;padding:18px;margin-bottom:14px;}
    .icon{width:42px;height:42px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;font-size:18px;flex-shrink:0;}
    .feature p{font-size:16px;line-height:1.6;color:#334155;}
    .testimonial{background:white;border-radius:24px;padding:22px;margin-bottom:16px;border:1px solid #f1f5f9;box-shadow:0 10px 30px rgba(15,23,42,0.06);}
    .stars{color:#f59e0b;font-size:18px;margin-bottom:10px;}
    .testimonial p{line-height:1.7;color:#475569;margin-bottom:12px;}
    .user{font-weight:700;color:#0f172a;}
    .cta-box{margin:28px 24px;background:linear-gradient(135deg,#16a34a,#22c55e);border-radius:28px;padding:28px 22px;text-align:center;color:white;box-shadow:0 20px 40px rgba(34,197,94,0.3);}
    .cta-box h3{font-size:28px;margin-bottom:10px;font-weight:800;}
    .cta-box p{opacity:.92;line-height:1.7;margin-bottom:22px;}
    .cta-button{display:block;width:100%;background:white;color:#16a34a;text-decoration:none;padding:18px;border-radius:18px;font-size:18px;font-weight:800;}
    .footer{text-align:center;padding:34px 20px 90px;font-size:13px;color:#94a3b8;}
    .footer a{color:#4f46e5;text-decoration:none;font-weight:700;}
    .sticky{position:fixed;bottom:0;left:0;width:100%;background:white;padding:14px;border-top:1px solid #e2e8f0;box-shadow:0 -10px 30px rgba(0,0,0,0.06);}
    .sticky a{display:block;max-width:520px;margin:0 auto;text-align:center;background:linear-gradient(135deg,#16a34a,#22c55e);color:white;text-decoration:none;padding:18px;border-radius:18px;font-size:18px;font-weight:800;}
  </style>
</head>
<body>
<div class="container">
  <section class="hero">
    <div class="badge">${badge}</div>
    <h1>${headline}</h1>
    <p class="subheadline">${subheadline}</p>
    <img src="${escapeHtml(image)}" alt="${headline}" loading="lazy" />
  </section>
  <section class="section">
    <h2 class="section-title">${featureTitle}</h2>
    ${featuresHtml}
  </section>
  ${testimonialSection}
  <div class="cta-box">
    <h3>${ctaTitle}</h3>
    <p>${ctaDescription}</p>
    <a href="${ctaLink}" class="cta-button">${ctaText}</a>
  </div>
  <div class="footer">
    Dibuat dengan ❤️ oleh <a href="https://cblzai.com">cblzai.com</a>
  </div>
</div>
<div class="sticky">
  <a href="${ctaLink}">${ctaText}</a>
</div>
</body>
</html>`;
}
