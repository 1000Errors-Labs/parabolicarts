// Shopify Storefront API helpers. Shared by every site — edit in core/, then `npm run sync`.
// The Storefront public token is designed to be visible in browsers; it can only read
// published products and create carts.

const Shopify = (() => {
  const { shopDomain, storefrontToken, apiVersion } = window.STORE_CONFIG || {};
  if (!shopDomain || !storefrontToken) {
    throw new Error("Missing STORE_CONFIG. Run `npm run sync` from the builder folder.");
  }

  async function graphql(query, variables = {}) {
    const res = await fetch(`https://${shopDomain}/api/${apiVersion}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontToken,
      },
      body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors || json, null, 2));
    return json.data;
  }

  const PRODUCT_CARD_FIELDS = `
    id handle title productType availableForSale
    featuredImage { url altText width height }
    priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
    compareAtPriceRange { minVariantPrice { amount currencyCode } }
  `;

  const PRODUCTS_BY_TAG = `
    query ProductsByTag($query: String!, $after: String) {
      products(first: 250, query: $query, after: $after, sortKey: CREATED_AT, reverse: true) {
        pageInfo { hasNextPage endCursor }
        nodes { ${PRODUCT_CARD_FIELDS} }
      }
    }
  `;

  const PRODUCT_BY_HANDLE = `
    query ProductByHandle($handle: String!) {
      product(handle: $handle) {
        id handle title descriptionHtml productType tags availableForSale
        images(first: 30) { nodes { url altText width height } }
        options { name optionValues { name } }
        variants(first: 100) {
          nodes {
            id title availableForSale
            selectedOptions { name value }
            price { amount currencyCode }
            compareAtPrice { amount currencyCode }
            image { url altText }
          }
        }
      }
    }
  `;

  // All products carrying the given tag (follows pagination).
  async function getProductsByTag(tag) {
    const products = [];
    let after = null;
    do {
      const data = await graphql(PRODUCTS_BY_TAG, { query: `tag:'${tag.replace(/'/g, "\\'")}'`, after });
      products.push(...data.products.nodes);
      after = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
    } while (after);
    return products;
  }

  async function getProduct(handle) {
    const data = await graphql(PRODUCT_BY_HANDLE, { handle });
    return data.product;
  }

  return { graphql, getProductsByTag, getProduct };
})();
