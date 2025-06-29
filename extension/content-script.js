const cheaterLink = 'https://macaquedev.github.io/cf-cheater-highlighter/cheaters.json';

(async () => {
  // Highlight cheaters
  function markCheaters(cheaterSet) {
    if (cheaterSet == null) return;
    const anchors = document.querySelectorAll('a.rated-user');
    anchors.forEach(a => {
      const user = a.textContent.trim();
      if (!user) return;
      if (cheaterSet.has(user.toLowerCase()) && !a.classList.contains('cf-cheater')) {
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
        const cachedCheaters = new Set((cachedData.cheaters || []).map(u => u.toLowerCase()));
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
      data.cheaters = (data.cheaters || []).map(u => u.toLowerCase());
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