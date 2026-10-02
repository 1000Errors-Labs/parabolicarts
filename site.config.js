// Settings for Parabolic Arts.
// This site is "ejected": its pages are hand-built HTML (index.html, about/index.html, …),
// styled by assets/site.css. Only store.js and CNAME are updated by `npm run sync`.

window.SITE_CONFIG = {
  name: "Parabolic Arts",
  description: "Sculptural artwork and bespoke installations — wedding décor and interior installations.",

  // Shopify products with this tag appear on the /shop/ page.
  tag: "parabolicarts",

  // The "Shop" menu link appears automatically once a product has the tag above.
  // Set to true to always show it, or false to always hide it.
  showShop: "auto",

  // Contact form and "Studio Updates" sign-ups are emailed here (via formsubmit.co).
  // The first time someone submits, FormSubmit emails this address an activation link — click it once.
  contactEmail: "hello@parabolicarts.uk",

  // Your own domain for GitHub Pages, e.g. "parabolicarts.uk" (then run npm run sync).
  customDomain: "parabolicarts.uk",

  ejected: true,
};
