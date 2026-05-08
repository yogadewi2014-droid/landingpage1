// restaurant.ts
type Testimonial = {
  name: string;
  text: string;
  rating?: number;
};

import type { LandingPageData as BaseLandingPageData } from "./modern";
export type LandingPageData = BaseLandingPageData;

const DEFAULT_IMAGE =
  "https://res.cloudinary.com/demo/image/upload/v1712345678/templates/restaurant/fallback-restaurant.jpg";

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
          folder: "landing-pages/restaurant",
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
  const pexels = await searchPexels(`${keyword} restaurant fine dining`);
  if (pexels) {
    const uploaded = await uploadToCloudinary(pexels);
    return optimizeCloudinary(uploaded);
  }
  const wiki = await searchWikimedia(`${keyword} restaurant`);
  if (wiki) {
    const uploaded = await uploadToCloudinary(wiki);
    return optimizeCloudinary(uploaded);
  }
  return optimizeCloudinary(fallbackImage || DEFAULT_IMAGE);
}

export async function render(data: LandingPageData): Promise<string> {
  if (!process.env.PEXELS_API_KEY)
    console.warn("[restaurant.ts] PEXELS_API_KEY kosong.");
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_UPLOAD_PRESET)
    console.warn("[restaurant.ts] Cloudinary config kurang.");

  const image = await resolveImage(
    data.headline || "restaurant",
    data.image,
    data.fallbackImage
  );

  const headline = escapeHtml(data.headline || "Rasakan Kemewahan Dalam Setiap Sajian");
  const subheadline = escapeHtml(
    data.subheadline || "Pengalaman kuliner premium dengan cita rasa istimewa."
  );
  const badge = escapeHtml(data.badge || "🍷 Fine Dining Experience");
  const featureTitle = escapeHtml(data.featureTitle || "Kenapa Tamu Kami Menyukainya?");
  const testimonialTitle = escapeHtml(data.testimonialTitle || "Review Pengunjung");
  const ctaTitle = escapeHtml(data.ctaTitle || "Reservasi Sekarang");
  const ctaDescription = escapeHtml(
    data.ctaDescription || "Nikmati pengalaman makan premium bersama orang tercinta."
  );
  const ctaText = escapeHtml(data.cta || "Book Table");
  const ctaLink = escapeHtml(data.ctaLink || "#");

  const featuresHtml = (data.features || [])
    .map(
      (f) =>
        `<div class="feature"><div class="icon">🍷</div><p>${escapeHtml(f)}</p></div>`
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
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Inter',sans-serif;background:#faf5ef;color:#3e2723;}
    .container{max-width:520px;margin:0 auto;background:white;min-height:100vh;overflow:hidden;}
    .hero{position:relative;padding:64px 24px 46px;background:radial-gradient(circle at top left,#8d6e63 0%,transparent 35%),radial-gradient(circle at top right,#6d4c41 0%,transparent 30%),linear-gradient(135deg,#3e2723,#4e342e,#5d4037);color:#ffcc80;text-align:center;}
    .badge{display:inline-block;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.15);backdrop-filter:blur(10px);padding:10px 18px;border-radius:999px;font-size:13px;margin-bottom:22px;color:#ffe0b2;}
    h1{font-family:'Playfair Display',serif;font-size:40px;line-height:1.15;font-weight:800;margin-bottom:16px;}
    .subheadline{font-size:17px;line-height:1.8;font-style:italic;opacity:.92;margin-bottom:30px;}
    .hero img{width:100%;border-radius:30px;object-fit:cover;box-shadow:0 20px 40px rgba(0,0,0,0.28),0 0 0 6px rgba(255,255,255,0.06);}
    .section{padding:32px 24px;}
    .section-title{font-family:'Playfair Display',serif;font-size:30px;font-weight:700;margin-bottom:24px;text-align:center;color:#4e342e;}
    .feature{display:flex;gap:14px;align-items:flex-start;background:#fff3e0;border:1px solid #ffe0b2;border-radius:22px;padding:18px;margin-bottom:14px;}
    .icon{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#8d6e63,#a1887f);color:white;font-size:18px;flex-shrink:0;}
    .feature p{font-size:16px;line-height:1.7;color:#5d4037;}
    .testimonial{background:white;border-radius:24px;padding:22px;margin-bottom:16px;border:1px solid #efebe9;box-shadow:0 10px 30px rgba(62,39,35,0.06);}
    .stars{color:#ffb300;font-size:18px;margin-bottom:10px;}
    .testimonial p{line-height:1.8;color:#6d4c41;margin-bottom:12px;}
    .user{font-weight:700;color:#3e2723;}
    .cta-box{margin:28px 24px;background:linear-gradient(135deg,#a1887f,#8d6e63);border-radius:30px;padding:30px 24px;text-align:center;color:white;box-shadow:0 20px 40px rgba(93,64,55,0.25);}
    .cta-box h3{font-family:'Playfair Display',serif;font-size:32px;margin-bottom:10px;font-weight:700;}
    .cta-box p{opacity:.94;line-height:1.8;margin-bottom:22px;}
    .cta-button{display:block;width:100%;background:#fff3e0;color:#4e342e;text-decoration:none;padding:18px;border-radius:18px;font-size:18px;font-weight:800;}
    .footer{text-align:center;padding:34px 20px 90px;font-size:13px;color:#a1887f;}
    .footer a{color:#8d6e63;text-decoration:none;font-weight:700;}
    .sticky{position:fixed;bottom:0;left:0;width:100%;background:white;padding:14px;border-top:1px solid #efebe9;box-shadow:0 -10px 30px rgba(0,0,0,0.06);}
    .sticky a{display:block;max-width:520px;margin:0 auto;text-align:center;background:linear-gradient(135deg,#8d6e63,#a1887f);color:white;text-decoration:none;padding:18px;border-radius:18px;font-size:18px;font-weight:800;}
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
