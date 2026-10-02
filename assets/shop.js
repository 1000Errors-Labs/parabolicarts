// Parabolic Arts shop page: lists Shopify products tagged with SITE_CONFIG.tag.
// Routes (after /shop/):  #/  all,  #/c/<category>  one Product type,  #/p/<handle>  product page.
(() => {
  const SITE = window.SITE_CONFIG || {};
  const TAG = (SITE.tag || "").trim();
  const { esc, money, img, openDrawer } = window.PA || {};
  const main = document.getElementById("shopMain");
  const cats = document.getElementById("shopCats");
  const title = document.getElementById("shopTitle");
  if (!main || !window.PA) return;

  const slugify = t => String(t).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let products = null;

  async function load() {
    if (!products) products = await Shopify.getProductsByTag(TAG);
    return products;
  }

  function categories(list) {
    const types = [...new Set(list.map(p => p.productType).filter(Boolean))].sort();
    return types.map(t => ({ slug: slugify(t), name: t }));
  }

  function renderCats(list, active) {
    const c = categories(list);
    cats.innerHTML = c.length > 1
      ? [`<a href="#/"${!active ? ' class="is-active"' : ""}>All</a>`, ...c.map(x => `<a href="#/c/${x.slug}"${x.slug === active ? ' class="is-active"' : ""}>${esc(x.name)}</a>`)].join("")
      : "";
  }

  function card(p) {
    const min = p.priceRange.minVariantPrice, max = p.priceRange.maxVariantPrice;
    const price = Number(min.amount) === Number(max.amount) ? money(min) : `From ${money(min)}`;
    return `
      <a class="product-card" href="#/p/${encodeURIComponent(p.handle)}">
        <div class="pc-img">${p.featuredImage ? `<img loading="lazy" src="${esc(img(p.featuredImage.url, 700))}" alt="${esc(p.featuredImage.altText || p.title)}">` : ""}</div>
        <h2>${esc(p.title)}</h2>
        <div class="pc-price">${p.availableForSale ? esc(price) : "Sold out"}</div>
      </a>`;
  }

  async function showList(catSlug) {
    const list = await load();
    renderCats(list, catSlug);
    title.textContent = "Shop";
    document.title = "Shop — Parabolic Arts";
    const shown = catSlug ? list.filter(p => slugify(p.productType || "") === catSlug) : list;
    main.innerHTML = shown.length
      ? `<div class="product-grid">${shown.map(card).join("")}</div>`
      : `<div class="shop-empty">
           <p>New pieces are coming soon.</p>
           <p>In the meantime, every piece can be made to commission.</p>
           <p><a class="btn" href="contact.html">Get in Touch</a></p>
         </div>`;
  }

  async function showProduct(handle) {
    main.innerHTML = `<p class="muted">Loading…</p>`;
    load().then(l => renderCats(l, null)).catch(() => {});
    const p = await Shopify.getProduct(handle);
    if (!p || !p.tags.some(t => t.toLowerCase() === TAG.toLowerCase())) {
      main.innerHTML = `<p>That product isn't available. <a href="#/">Back to the shop</a></p>`;
      return;
    }
    document.title = `${p.title} — Parabolic Arts`;
    const variants = p.variants.nodes;
    const images = p.images.nodes;
    const options = p.options.filter(o => !(o.name === "Title" && o.optionValues.length === 1));
    const first = variants.find(v => v.availableForSale) || variants[0];
    const selected = Object.fromEntries(first.selectedOptions.map(o => [o.name, o.value]));

    main.innerHTML = `
      <a class="back-link" href="#/">← Back to shop</a>
      <div class="product">
        <div class="product-gallery">
          <div class="pg-main">${images[0] ? `<img id="mainImage" src="${esc(img(images[0].url, 1400))}" alt="${esc(images[0].altText || p.title)}">` : ""}</div>
          ${images.length > 1 ? `<div class="thumbs">${images.map((im, i) => `
            <button class="thumb${i === 0 ? " active" : ""}" data-src="${esc(im.url)}" aria-label="Image ${i + 1}"><img loading="lazy" src="${esc(img(im.url, 160))}" alt=""></button>`).join("")}</div>` : ""}
        </div>
        <div class="product-info">
          <h1>${esc(p.title)}</h1>
          <p class="product-price" id="productPrice"></p>
          ${options.map(o => `
            <div class="option">
              <div class="option-name">${esc(o.name)}</div>
              <div class="option-values">${o.optionValues.map(v => `<button type="button" class="option-value" data-option="${esc(o.name)}" data-value="${esc(v.name)}">${esc(v.name)}</button>`).join("")}</div>
            </div>`).join("")}
          <button type="button" class="btn btn-solid" id="addToCart">Add to Cart</button>
          <p class="status small" id="productStatus"></p>
          <div class="description">${p.descriptionHtml || ""}</div>
        </div>
      </div>`;

    const mainImage = document.getElementById("mainImage");
    const showImage = url => {
      if (!mainImage || !url) return;
      mainImage.src = img(url, 1400);
      main.querySelectorAll(".thumb").forEach(t => t.classList.toggle("active", t.dataset.src === url));
    };
    main.querySelectorAll(".thumb").forEach(t => t.addEventListener("click", () => showImage(t.dataset.src)));

    const current = () => variants.find(v => v.selectedOptions.every(o => selected[o.name] === o.value));
    const add = document.getElementById("addToCart");
    const status = document.getElementById("productStatus");

    function refresh() {
      const v = current();
      main.querySelectorAll(".option-value").forEach(b => {
        b.classList.toggle("active", selected[b.dataset.option] === b.dataset.value);
        const trial = { ...selected, [b.dataset.option]: b.dataset.value };
        const match = variants.find(x => x.selectedOptions.every(o => trial[o.name] === o.value));
        b.classList.toggle("unavailable", !match || !match.availableForSale);
      });
      if (!v) { add.disabled = true; add.textContent = "Unavailable"; document.getElementById("productPrice").textContent = ""; return; }
      const onSale = v.compareAtPrice && Number(v.compareAtPrice.amount) > Number(v.price.amount);
      document.getElementById("productPrice").innerHTML = esc(money(v.price)) + (onSale ? ` <s class="muted">${esc(money(v.compareAtPrice))}</s>` : "");
      add.disabled = !v.availableForSale;
      add.textContent = v.availableForSale ? "Add to Cart" : "Sold Out";
      if (v.image) showImage(v.image.url);
    }

    main.querySelectorAll(".option-value").forEach(b => b.addEventListener("click", () => {
      selected[b.dataset.option] = b.dataset.value;
      status.textContent = "";
      refresh();
    }));
    add.addEventListener("click", async () => {
      const v = current();
      if (!v) return;
      add.disabled = true;
      status.textContent = "Adding…";
      try { await Cart.add(v.id, 1); status.textContent = ""; openDrawer(); }
      catch (err) { status.textContent = "Couldn't add to cart: " + err.message; }
      finally { add.disabled = !v.availableForSale; }
    });
    refresh();
  }

  async function route() {
    const parts = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
    try {
      if (parts[0] === "p" && parts[1]) await showProduct(parts[1]);
      else await showList(parts[0] === "c" ? parts[1] : "");
      window.scrollTo(0, 0);
    } catch (err) {
      console.error(err);
      main.innerHTML = `<p>Sorry, the shop couldn't be loaded right now. Please try again shortly.</p>`;
    }
  }

  window.addEventListener("hashchange", route);
  route();
})();
