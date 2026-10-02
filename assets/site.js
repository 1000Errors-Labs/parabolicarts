// Parabolic Arts — shared page behaviour: mobile menu, banner slideshows, forms, Shopify cart.
(() => {
  const SITE = window.SITE_CONFIG || {};
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- mobile menu ----------
  const toggle = $("menuToggle");
  toggle?.addEventListener("click", () => {
    const open = document.body.classList.toggle("nav-open");
    toggle.setAttribute("aria-expanded", open);
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });

  // ---------- banner slideshows ----------
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll(".slideshow").forEach(show => {
    const slides = [...show.querySelectorAll(".slide")];
    const dots = [...show.querySelectorAll(".slideshow-dots button")];
    if (slides.length < 2) return;
    let index = 0, timer = null;
    const go = i => {
      index = (i + slides.length) % slides.length;
      slides.forEach((s, n) => s.classList.toggle("is-active", n === index));
      dots.forEach((d, n) => d.setAttribute("aria-current", n === index));
    };
    const start = () => {
      if (show.dataset.autoplay !== "true" || reduceMotion) return;
      clearInterval(timer);
      timer = setInterval(() => go(index + 1), Number(show.dataset.interval) || 3000);
    };
    dots.forEach((d, n) => d.addEventListener("click", () => { go(n); start(); }));
    start();
  });

  // ---------- lightbox for image strips ----------
  const lbLinks = [...document.querySelectorAll("[data-lightbox]")];
  if (lbLinks.length) {
    const box = document.createElement("div");
    box.className = "lightbox";
    box.hidden = true;
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Image viewer");
    box.innerHTML = `<img alt=""><button class="lb-close" aria-label="Close">×</button><button class="lb-prev" aria-label="Previous">‹</button><button class="lb-next" aria-label="Next">›</button>`;
    document.body.appendChild(box);
    const img = box.querySelector("img");
    let at = 0;
    const show = i => {
      at = (i + lbLinks.length) % lbLinks.length;
      img.src = lbLinks[at].href;
      img.alt = lbLinks[at].querySelector("img")?.alt || "";
      box.hidden = false;
    };
    lbLinks.forEach((a, i) => a.addEventListener("click", e => { e.preventDefault(); show(i); }));
    box.querySelector(".lb-close").addEventListener("click", () => { box.hidden = true; });
    box.querySelector(".lb-prev").addEventListener("click", () => show(at - 1));
    box.querySelector(".lb-next").addEventListener("click", () => show(at + 1));
    box.addEventListener("click", e => { if (e.target === box) box.hidden = true; });
    document.addEventListener("keydown", e => {
      if (box.hidden) return;
      if (e.key === "Escape") box.hidden = true;
      if (e.key === "ArrowLeft") show(at - 1);
      if (e.key === "ArrowRight") show(at + 1);
    });
  }

  // ---------- forms (contact + newsletter) ----------
  // GitHub Pages can't receive form posts, so submissions go to FormSubmit, which emails them
  // to SITE.contactEmail. The very first submission sends an activation email to that address.
  const countrySelect = document.querySelector(".js-countries");
  if (countrySelect && window.Intl?.DisplayNames) {
    const names = new Intl.DisplayNames(["en-GB"], { type: "region", fallback: "none" });
    const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const skip = new Set(["EU", "EZ", "UN", "ZZ", "QO", "XA", "XB", "XK"]);
    const list = [];
    for (const a of A) for (const b of A) {
      const code = a + b;
      if (skip.has(code)) continue;
      const name = names.of(code);
      if (name && name !== code) list.push(name);
    }
    list.splice(0, list.length, ...new Set(list));
    list.sort((x, y) => x.localeCompare(y));
    countrySelect.innerHTML = list.map(n => `<option${n === "United Kingdom" ? " selected" : ""}>${esc(n)}</option>`).join("");
  }

  document.querySelectorAll(".js-form").forEach(form => {
    const status = form.querySelector(".form-status");
    form.addEventListener("submit", async e => {
      e.preventDefault();
      form.classList.add("was-validated");
      if (!form.checkValidity()) {
        status.textContent = "Please fill in the required fields.";
        status.classList.add("is-error");
        form.querySelector(":invalid")?.focus();
        return;
      }
      const endpoint = SITE.formEndpoint || (SITE.contactEmail && `https://formsubmit.co/ajax/${SITE.contactEmail}`);
      if (!endpoint) { status.textContent = "Form not configured."; return; }

      const data = Object.fromEntries(new FormData(form));
      data._subject = form.dataset.subject || "Website form";
      data._template = "table";
      data._captcha = "false";

      const button = form.querySelector("button[type=submit]");
      button.disabled = true;
      status.classList.remove("is-error");
      status.textContent = "Sending…";
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === "false" || json.success === false) throw new Error(json.message || res.statusText);
        if (form.classList.contains("contact-form")) {
          form.innerHTML = `<p class="form-done">Thank you! Your inquiry has been sent and I'll be in touch soon.</p>`;
        } else {
          form.reset();
          form.classList.remove("was-validated");
          status.textContent = "Thank you for signing up!";
        }
      } catch (err) {
        status.classList.add("is-error");
        status.textContent = `Sorry, that didn't send. Please email ${SITE.contactEmail || "us"} directly.`;
        console.error(err);
      } finally {
        button.disabled = false;
      }
    });
  });

  // ---------- Shopify: "Shop" menu link + cart ----------
  if (typeof Shopify === "undefined" || typeof Cart === "undefined" || !SITE.tag) return;

  const money = m => {
    if (!m) return "";
    try { return new Intl.NumberFormat("en-GB", { style: "currency", currency: m.currencyCode }).format(Number(m.amount)); }
    catch { return `${Number(m.amount).toFixed(2)} ${m.currencyCode}`; }
  };
  const img = (url, w) => url ? url + (url.includes("?") ? "&" : "?") + "width=" + w : "";
  const shopUrl = (document.querySelector(".shop-link")?.getAttribute("href")) || "shop.html";
  window.PA = { esc, money, img, openDrawer, shopUrl };

  // Show "Shop" in the menu only once there are products tagged for this site
  // (or always/never if SITE.showShop is true/false).
  const shopLink = document.querySelector(".shop-link");
  const showShop = on => { if (shopLink) shopLink.hidden = !on; };
  if (SITE.showShop === true || location.pathname.includes("/shop")) showShop(true);
  else if (SITE.showShop !== false) {
    const KEY = "pa:hasProducts:" + SITE.tag;
    let cached = null;
    try { cached = sessionStorage.getItem(KEY); } catch {}
    if (cached !== null) showShop(cached === "1");
    else {
      Shopify.graphql(`query($q: String!) { products(first: 1, query: $q) { nodes { id } } }`, { q: `tag:'${SITE.tag}'` })
        .then(d => {
          const has = d.products.nodes.length > 0;
          try { sessionStorage.setItem(KEY, has ? "1" : "0"); } catch {}
          showShop(has);
        })
        .catch(() => {});
    }
  }

  function openDrawer() {
    document.body.classList.add("drawer-open");
    $("cartDrawer").setAttribute("aria-hidden", "false");
    $("drawerBackdrop").hidden = false;
  }
  function closeDrawer() {
    document.body.classList.remove("drawer-open");
    $("cartDrawer").setAttribute("aria-hidden", "true");
    $("drawerBackdrop").hidden = true;
  }

  function renderCart(cart) {
    const lines = cart?.lines?.nodes || [];
    $("cartButton").hidden = !lines.length && !location.pathname.includes("/shop");
    $("cartCount").textContent = cart?.totalQuantity || 0;
    $("cartSubtotal").textContent = cart ? money(cart.cost.subtotalAmount) : "";
    const checkout = $("checkoutButton");
    checkout.href = cart?.checkoutUrl || "#";
    checkout.classList.toggle("disabled", !lines.length);
    $("cartLines").innerHTML = lines.length ? lines.map(l => {
      const m = l.merchandise;
      const image = m.image || m.product.featuredImage;
      return `
        <div class="line" data-line="${esc(l.id)}">
          ${image ? `<img src="${esc(img(image.url, 160))}" alt="">` : `<div></div>`}
          <div class="line-info">
            <a href="${esc(shopUrl)}#/p/${encodeURIComponent(m.product.handle)}">${esc(m.product.title)}</a>
            ${m.title !== "Default Title" ? `<div class="muted small">${esc(m.title)}</div>` : ""}
            <div class="qty">
              <button data-qty="${l.quantity - 1}" aria-label="Decrease">−</button>
              <span>${l.quantity}</span>
              <button data-qty="${l.quantity + 1}" aria-label="Increase">+</button>
              <button class="link remove" data-qty="0">Remove</button>
            </div>
          </div>
          <div class="line-price">${esc(money(l.cost.totalAmount))}</div>
        </div>`;
    }).join("") : `<p class="muted">Your cart is empty.</p>`;
  }

  $("cartButton").addEventListener("click", openDrawer);
  $("cartClose").addEventListener("click", closeDrawer);
  $("drawerBackdrop").addEventListener("click", closeDrawer);
  document.addEventListener("keydown", e => { if (e.key === "Escape") { closeDrawer(); document.body.classList.remove("nav-open"); } });
  $("checkoutButton").addEventListener("click", e => { if (!Cart.get()?.lines?.nodes?.length) e.preventDefault(); });
  $("cartLines").addEventListener("click", async e => {
    const btn = e.target.closest("button[data-qty]");
    if (!btn) return;
    btn.closest(".line").classList.add("busy");
    try { await Cart.update(btn.closest(".line").dataset.line, Number(btn.dataset.qty)); }
    catch (err) { alert(err.message); renderCart(Cart.get()); }
  });
  Cart.onChange(renderCart);
  Cart.load();
})();
