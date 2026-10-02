# Parabolic Arts

parabolicarts.uk, rebuilt from the old Squarespace site as plain static pages for GitHub Pages.
It's connected to the shared Shopify store: products tagged `parabolicarts` appear on the Shop page (`shop.html`).

## Pages

Each page is one HTML file, named after its web address (`about.html` → parabolicarts.uk/about).
You can open any of them by double-clicking, or preview the whole site with `npm run dev`.

| File | Page |
|---|---|
| `index.html` | Home |
| `wedding-decor.html`, `interior-installations.html`, `case-studies.html`, `about.html`, `contact.html` | Main menu pages |
| `geometric-archway.html`, `mandala-installation-for-the-reception.html`, `architectural-room-divider-installation.html`, `the-immersive-architecture-study.html`, `sacred-geometry-flower-garden.html` | Case studies |
| `coming-soon.html` | Coming soon |
| `wedding-decor-4.html`, `geometric-archway2.html` | Unlinked draft copies from Squarespace (hidden from Google) |
| `shop.html` | Shopify products tagged `parabolicarts` |

- **Text:** edit it directly in the page's HTML file.
- **Images:** they live in `assets/img/`.
- **Layout:** each page's `<style>` block places its blocks on a 24-column grid (`grid-area: row/col/row/col`). The first `grid-area` is for phones and the one inside `@media (min-width: 768px)` is for desktop.
- **Shared styles and scripts:** `assets/site.css` and `assets/site.js`. Put your own tweaks in `custom.css`.

## Shop

Tag a product `parabolicarts` in Shopify and make it available on the Headless sales channel.
A **Shop** link then appears in the menu automatically. Product types become filters on the shop page.

## Forms

The contact form and the "Studio Updates" sign-up are sent by [FormSubmit](https://formsubmit.co)
to `contactEmail` in `site.config.js`. The first real submission makes FormSubmit email that address
an activation link. Click it once, and submissions arrive by email from then on.

## Preview and publish

From the builder folder:

```
npm run dev -- parabolicarts        # preview at http://localhost:8080
npm run publish -- parabolicarts    # push to GitHub
```
