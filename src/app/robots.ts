import type { MetadataRoute } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/en"],
        disallow: [
          "/admin",
          "/admin/",
          "/admin/*",
          "/dashboard",
          "/settings",
          "/login",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}


