import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ulovepdf.onrender.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/*",
          "/dashboard",
          "/dashboard/*",
          "/history",
          "/history/*",
          "/settings",
          "/settings/*",
          "/profile",
          "/profile/*",
          "/api",
          "/api/*",
          "/auth/callback",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

