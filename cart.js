// Cart via the Shopify Storefront Cart API. Checkout happens on Shopify's own checkout page,
// so orders, payments and emails all appear in your normal Shopify admin.

const Cart = (() => {
  const STORAGE_KEY = `cart:${(window.SITE_CONFIG || {}).tag || "site"}`;
  const listeners = new Set();
  let cart = null;

  const CART_FIELDS = `
    id checkoutUrl totalQuantity
    cost { subtotalAmount { amount currencyCode } }
    lines(first: 100) {
      nodes {
        id quantity
        cost { totalAmount { amount currencyCode } }
        merchandise {
          ... on ProductVariant {
            id title
            image { url altText }
            product { title handle featuredImage { url altText } }
          }
        }
      }
    }
  `;

  function storedId() {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  }
  function store(id) {
    try { id ? localStorage.setItem(STORAGE_KEY, id) : localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  function set(next) {
    cart = next;
    store(next?.id || null);
    listeners.forEach(fn => fn(cart));
    return cart;
  }

  function checkUserErrors(payload) {
    if (payload.userErrors?.length) throw new Error(payload.userErrors.map(e => e.message).join("\n"));
    return payload.cart;
  }

  async function load() {
    const id = storedId();
    if (!id) return set(null);
    try {
      const data = await Shopify.graphql(`query($id: ID!) { cart(id: $id) { ${CART_FIELDS} } }`, { id });
      return set(data.cart); // null if the cart expired or was checked out
    } catch {
      return set(null);
    }
  }

  async function add(variantId, quantity = 1) {
    const lines = [{ merchandiseId: variantId, quantity }];
    if (!cart) {
      const data = await Shopify.graphql(
        `mutation($lines: [CartLineInput!]) { cartCreate(input: { lines: $lines }) { cart { ${CART_FIELDS} } userErrors { message } } }`,
        { lines }
      );
      return set(checkUserErrors(data.cartCreate));
    }
    const data = await Shopify.graphql(
      `mutation($id: ID!, $lines: [CartLineInput!]!) { cartLinesAdd(cartId: $id, lines: $lines) { cart { ${CART_FIELDS} } userErrors { message } } }`,
      { id: cart.id, lines }
    );
    return set(checkUserErrors(data.cartLinesAdd));
  }

  async function update(lineId, quantity) {
    if (quantity <= 0) return remove(lineId);
    const data = await Shopify.graphql(
      `mutation($id: ID!, $lines: [CartLineUpdateInput!]!) { cartLinesUpdate(cartId: $id, lines: $lines) { cart { ${CART_FIELDS} } userErrors { message } } }`,
      { id: cart.id, lines: [{ id: lineId, quantity }] }
    );
    return set(checkUserErrors(data.cartLinesUpdate));
  }

  async function remove(lineId) {
    const data = await Shopify.graphql(
      `mutation($id: ID!, $lineIds: [ID!]!) { cartLinesRemove(cartId: $id, lineIds: $lineIds) { cart { ${CART_FIELDS} } userErrors { message } } }`,
      { id: cart.id, lineIds: [lineId] }
    );
    return set(checkUserErrors(data.cartLinesRemove));
  }

  return {
    load, add, update, remove,
    get: () => cart,
    onChange: fn => listeners.add(fn),
  };
})();
