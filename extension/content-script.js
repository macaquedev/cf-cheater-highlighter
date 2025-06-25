const cheaterLink = 'https://macaquedev.github.io/cf-cheater-highlighter/cheaters.json';

(async () => {
  // Highlight cheaters
  function markCheaters(cheaterSet) {
    if (cheaterSet == null) return;
    const anchors = document.querySelectorAll('a[href^="/profile/"]');
    anchors.forEach(a => {
      const parts = a.getAttribute('href').split('/');
      const user = parts[2];
      if (!user) return;
      if (cheaterSet.has(user) && !a.classList.contains('cf-cheater')) {
        a.classList.add('cf-cheater');
        a.textContent = `${a.textContent}: CHEATER`;
      }
    });
  }

  function getCachedCheaters() {
    try {
      const cached = localStorage.getItem('cf-cheater-list');
      if (cached) {
        const cachedData = JSON.parse(cached);
        const cachedCheaters = new Set(cachedData.cheaters || []);
        return cachedCheaters;
      }
    } catch (e) {
      return null;
    }
  }

  async function getCheaterData() {
    try {
      const resp = await fetch(cheaterLink);
      const data = await resp.json();
      return data;
    } catch (e) {
      return null;
    }
  }

  try {
    const cachedCheaters = getCachedCheaters();
    if (cachedCheaters) markCheaters(cachedCheaters);

    const data = await getCheaterData();
    if (data) {
      const cheaters = new Set(data.cheaters);
      if (cheaters != cachedCheaters) {
        localStorage.setItem('cf-cheater-list', JSON.stringify(data));
        markCheaters(cheaters);
      }
    }
  } catch (e) {
    console.error('Failed to load cheaters', e);
  }
})();