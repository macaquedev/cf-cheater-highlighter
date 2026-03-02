const cheaterLink = 'https://macaquedev.github.io/cf-cheater-highlighter/cheaters.json';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'fetchCheaters') {
        fetch(cheaterLink)
            .then(r => r.json())
            .then(data => sendResponse({ data }))
            .catch(() => sendResponse({ data: null }));
        return true;
    }
});
