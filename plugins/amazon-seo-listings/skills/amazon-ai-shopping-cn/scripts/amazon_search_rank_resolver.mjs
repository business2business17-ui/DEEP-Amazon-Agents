export const ORGANIC_RANK_RESOLVER_VERSION = "organic-rank-resolver-v0.2";

export function collectOrganicSearchProductsFromDocument(options = {}) {
  const limit = Math.max(1, Number(options.limit ?? 3));
  const maxCards = Math.max(limit, Number(options.maxCards ?? 48));
  const version = "organic-rank-resolver-v0.2";

  function clean(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function normalizeUrl(href, asin) {
    if (!href) return "";
    try {
      const url = new URL(href, "https://www.amazon.com");
      const matchedAsin = asin || (url.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i) ?? [])[1];
      if (matchedAsin) return `${url.origin}/dp/${matchedAsin}`;
      url.hash = "";
      return url.toString();
    } catch {
      return href;
    }
  }

  function collectAttributes(node) {
    const attrs = [];
    for (const attr of Array.from(node.attributes || [])) {
      if (
        attr.name === "class"
        || attr.name === "id"
        || attr.name === "aria-label"
        || attr.name === "data-component-type"
        || attr.name.startsWith("data-csa-c-")
      ) {
        attrs.push(`${attr.name}=${attr.value}`);
      }
    }
    return attrs.join(" ");
  }

  function inspectSponsoredCard(card) {
    const text = clean(card.innerText || card.textContent || "");
    const attrs = collectAttributes(card);
    let sponsoredNode = null;
    try {
      sponsoredNode = card.querySelector([
        '[aria-label*="Sponsored" i]',
        '[aria-label*="Sponsor" i]',
        '[class*="s-sponsored" i]',
        '[class*="sponsored" i]',
        '[class*="AdHolder" i]',
        '[id*="sponsored" i]',
        '[data-component-type*="sp-sponsored" i]',
      ].join(","));
    } catch {
      sponsoredNode = null;
    }

    const evidence = [];
    if (/\bSponsored\b/i.test(text)) evidence.push("text:Sponsored");
    if (/sponsored|sp-?ad|advertis|AdHolder/i.test(attrs)) evidence.push("attrs:ad-marker");
    if (sponsoredNode) evidence.push("node:ad-marker");
    return { sponsored: evidence.length > 0, evidence: evidence.join("|") };
  }

  function extractTitle(card) {
    const selectors = [
      "h2 span",
      "h2",
      '[data-cy="title-recipe"] span',
      'a.a-link-normal[href*="/dp/"] span',
      ".a-text-normal",
    ];
    for (const selector of selectors) {
      const value = clean(card.querySelector(selector)?.innerText || card.querySelector(selector)?.textContent || "");
      if (value) return value;
    }
    return "";
  }

  function extractProductLink(card) {
    return card.querySelector('h2 a[href*="/dp/"], a.a-link-normal[href*="/dp/"], a[href*="/gp/product/"]');
  }

  const cards = Array.from(document.querySelectorAll('[data-component-type="s-search-result"][data-asin]')).slice(0, maxCards);
  const products = [];
  const auditRows = [];
  const selectedAsins = new Set();
  let searchPagePosition = 0;
  let sponsoredSkippedBefore = 0;
  let unverifiedOrganicBefore = 0;
  const skippedSponsoredCards = [];

  for (let index = 0; index < cards.length && products.length < limit; index += 1) {
    const card = cards[index];
    const asin = clean(card.getAttribute("data-asin"));
    if (!asin) continue;

    searchPagePosition += 1;
    const sponsoredInspection = inspectSponsoredCard(card);
    const link = extractProductLink(card);
    const title = extractTitle(card);
    const url = normalizeUrl(link?.getAttribute("href") || link?.href || "", asin);

    if (sponsoredInspection.sponsored) {
      sponsoredSkippedBefore += 1;
      const cardEvidence = `card_${searchPagePosition}:${sponsoredInspection.evidence || "ad-marker"}`;
      skippedSponsoredCards.push(cardEvidence);
      auditRows.push({
        resolverVersion: version,
        decision: "skip_sponsored",
        asin,
        title,
        searchPagePosition,
        visualCardIndex: index + 1,
        sponsoredEvidence: sponsoredInspection.evidence,
      });
      continue;
    }

    if (selectedAsins.has(asin)) {
      auditRows.push({
        resolverVersion: version,
        decision: "skip_duplicate_asin",
        asin,
        searchPagePosition,
        visualCardIndex: index + 1,
        sponsoredEvidence: sponsoredInspection.evidence || "",
      });
      continue;
    }

    if (!title || !url) {
      unverifiedOrganicBefore += 1;
      auditRows.push({
        resolverVersion: version,
        decision: "stop_unverified_organic_candidate",
        asin,
        title,
        url,
        searchPagePosition,
        visualCardIndex: index + 1,
        sponsoredEvidence: sponsoredInspection.evidence || "",
      });
      break;
    }

    if (unverifiedOrganicBefore > 0) break;

    const organicRank = products.length + 1;
    const rankEvidence = [
      `resolver=${version}`,
      `organic_rank=${organicRank}`,
      `search_card=${searchPagePosition}`,
      `sponsored_skipped_before=${sponsoredSkippedBefore}`,
      `skipped_sponsored_cards=${skippedSponsoredCards.join("|") || "none"}`,
      "card_sponsored_evidence=none",
      "rank_status=strict_organic",
    ].join("; ");

    const product = {
      resolverVersion: version,
      asin,
      title,
      url,
      rank: organicRank,
      organicRank,
      asinRank: organicRank,
      keywordRank: organicRank,
      searchResultType: "organic",
      searchPagePosition,
      visualCardIndex: index + 1,
      sponsoredSkippedBefore,
      rankEvidence,
      rankStatus: "strict_organic",
      hasRankingEvidence: true,
    };
    selectedAsins.add(asin);
    products.push(product);
    auditRows.push({
      resolverVersion: version,
      decision: "select_organic",
      asin,
      title,
      organicRank,
      searchPagePosition,
      visualCardIndex: index + 1,
      sponsoredSkippedBefore,
      rankEvidence,
    });
  }

  return {
    resolverVersion: version,
    products,
    rankAuditRows: auditRows,
    summary: {
      scannedCardCount: cards.length,
      selectedOrganicCount: products.length,
      skippedSponsoredCount: sponsoredSkippedBefore,
      unverifiedOrganicBefore,
      maxCards,
      limit,
      strict: true,
    },
  };
}

export async function resolveOrganicSearchProductsFromPage(page, options = {}) {
  return page.evaluate(collectOrganicSearchProductsFromDocument, options);
}

export function buildOrganicRankBrowserScript(options = {}) {
  return `(${collectOrganicSearchProductsFromDocument.toString()})(${JSON.stringify(options)})`;
}
