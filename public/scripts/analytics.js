(() => {
  const token = document.currentScript?.dataset.token;
  const excludeEU = document.currentScript?.dataset.excludeEu === 'true';
  if (!token) return;

  async function loadBeacon() {
    // Avoid duplicate pageviews while automatic injection is being phased out.
    if (window.__konakonaAnalyticsStarted || document.querySelector('script[src^="https://static.cloudflareinsights.com/beacon.min.js"]')) return;
    window.__konakonaAnalyticsStarted = true;

    // Preserve Cloudflare's existing "excluding visitors in the EU" setting.
    if (excludeEU) {
      try {
        const response = await fetch('/cdn-cgi/trace', { cache: 'no-store', credentials: 'omit' });
        if (!response.ok) return;
        const country = (await response.text()).match(/^loc=([A-Z]{2})\s*$/m)?.[1];
        const eu = new Set(['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE']);
        if (!country || eu.has(country)) return;
      } catch {
        return;
      }
    }

    const beacon = document.createElement('script');
    beacon.type = 'module';
    beacon.async = true;
    beacon.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    beacon.crossOrigin = 'anonymous';
    // Preserve the proxied-site configuration and its same-origin collector.
    beacon.dataset.cfBeacon = JSON.stringify({ token, spa: 2, version: '2024.11.0', r: 1 });
    document.head.append(beacon);
  }

  // Schedule after the load event has finished, including when loaded late.
  function scheduleBeacon() {
    setTimeout(loadBeacon, 0);
  }

  if (document.readyState === 'complete') {
    scheduleBeacon();
  } else {
    window.addEventListener('load', scheduleBeacon, { once: true });
  }
})();
