(async () => {
  // 1) Fetch the cheater list
  let cheaters = [];
  try {
    const resp = await fetch('https://macaquedev.github.io/cf-cheater-highlighter/cheaters.json');         // Fetch API :contentReference[oaicite:4]{index=4}
    const data = await resp.json();
    cheaters = new Set(data.cheaters || []);
  } catch (e) {
    console.error('Failed to load cheater list', e);
    return;
  }

  // 2) Find all profile links
  const anchors = document.querySelectorAll('a[href^="/profile/"]');           // CSS attribute selector :contentReference[oaicite:5]{index=5} :contentReference[oaicite:6]{index=6}

  anchors.forEach(a => {
    // Extract the username from the URL: "/profile/{username}"
    const parts = a.getAttribute('href').split('/');
    const user  = parts[2];
    if (!user) return;

    // 3) If this user is in the cheater set, highlight
    if (cheaters.has(user)) {
      a.classList.add('cf-cheater');
      // Avoid appending multiple times
      if (!a.textContent.includes(': CHEATER')) {
        a.textContent = `${a.textContent}: CHEATER`;
      }
    }
  });
})();
