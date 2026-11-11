# GMX FASHION INDIA — Complete Website Source Package

**Design status: LOCKED.** The approved design, brand colors, typography, layout, homepage sections and supplied peacock logo should not be changed unless the owner explicitly requests it.

## Project files
- `index.html` — Vite app entry HTML and SEO metadata
- `src/App.jsx` — React storefront, navigation, product cards, cart, wishlist, product detail modal and enquiry sections
- `src/main.jsx` — React application bootstrap
- `src/style.css` — responsive design, styling, animations and reduced-motion support
- `src/catalog.json` — sample product catalogue
- `public/gmx-logo.jpg` — approved GMX peacock logo for the header
- `public/products/` — 30 product photographs extracted from the supplied ZIP
- `package.json` — dependencies and run/build scripts
- `supabase/schema.sql` — starter PostgreSQL schema for Supabase
- `.env.example` — environment variable names/template
- `netlify.toml`, `vercel.json` — deployment build configuration
- `.gitignore` — excludes local dependencies and secrets

## Run on a computer
1. Install Node.js 20 or newer.
2. Extract this ZIP.
3. Open a terminal in the extracted `gmx-fashion-india` folder.
4. Run `npm install`.
5. Run `npm run dev`.
6. Open the local URL printed by Vite (usually `http://localhost:5173`).
7. For a production build, run `npm run build`. The generated site is in `dist/`.

## Important current functionality and production limitations
This package includes the complete current frontend source and assets. Cart and wishlist data are stored in the visitor's browser. The currency selector currently uses illustrative sample conversion rates; it is not a live FX feed. The catalogue titles, prices, stock, product details and sequential image assignments are sample content and must be checked against the real products before launch.

The following are not yet implemented/connected as live production services: secure customer/admin authentication, cloud-backed product management, persistent cloud image uploads, server-side order creation, payment gateway and webhooks, real-time shipping quotes, country-specific tax/customs calculations, live FX rates, verified translations, email notifications and order tracking. The checkout preview deliberately does not accept payments.

## Backend setup path
1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Configure Storage buckets, Row Level Security and server-side API endpoints.
4. Implement server-side order totals and payment verification. Never trust browser-calculated totals or store raw card details.
5. Configure an eligible merchant payment provider and test its sandbox/webhooks.
6. Add real shipping, tax, customs and exchange-rate services.
7. Configure admin roles securely. Never expose a Supabase service-role key or payment secret in frontend code.
8. Replace sample products with verified product records and correct photo mappings.
9. Add reviewed translations, verified policies, contact email and social links.
10. Test mobile/desktop, checkout, admin permissions, payment callbacks, security and backups before launch.

## Environment variables
Copy `.env.example` to `.env` for local frontend configuration. Only public client-side values may use a `VITE_` prefix. Secrets must be configured server-side in the hosting provider's secret manager.

## Product photos
The original ZIP's 30 image files are included in `public/products/`. They are assigned sequentially as provisional catalogue images. Review and match every photo to the actual SKU before publishing.
Cloudflare deployment configuration updated.
