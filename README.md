# CF Cheater Highlighter

A tiny Chrome extension that highlights Codeforces users flagged as cheaters. Written mostly by ChatGPT o4-mini-high and very slightly by macaquedev. 

---

## 1. Download the Latest Release

1. Open your browser and go to  
   `https://github.com/macaquedev/cf-cheater-highlighter/releases/latest`  
2. Under **Assets**, click **cf-cheater-highlighter.zip** to grab the ZIP.

---

## 2. Install in Chrome

1. In Chrome, open `chrome://extensions/`.  
2. Turn on **Developer mode** (toggle at top-right).  
3. Drag **cf-cheater-highlighter.zip** from your Downloads folder onto the extensions page.  
4. Confirm the “Add extension” prompt.

---

## 3. Install in Firefox (Temporary)

1. Download the ZIP (see step 1) or clone the repo:

   `git clone https://github.com/macaquedev/cf-cheater-highlighter.git`

2. In Firefox, open `about:debugging#/runtime/this-firefox`

3. Click Load Temporary Add-on… and select extension/manifest.json from your clone or ZIP.

4. Confirm and watch for Codeforces pages to highlight cheaters.

5. To reload after edits, return here and click the Reload 🔄 button next to the add-on entry.

### Note: This temporary install will be removed when you restart Firefox.

---

## 4. Install in Firefox (Permanent)

To keep it across restarts, you must build and sign a Firefox XPI:

1. Install web-ext:

   `npm install -g web-ext`

2. Build the extension:

   `cd extension`

   `web-ext build`

3. Sign for unlisted distribution (requires AMO API keys):
   
   [] Log in to `https://addons.mozilla.org` with your Firefox Account.

   [] Click on “Developer Hub”.

   [] In the left sidebar, under “Tools”, click “Manage API Keys.

   [] If you haven’t yet created a key, click “Generate new key”. Otherwise you’ll see your existing key listed.

   [] You’ll see two values -> `JWT Secret / JWT Issuer`


4. Run locally: 

   `web-ext sign --api-key=$ISSUER --api-secret=$SECRET --channel=unlisted`

   This will install a .xpi file to your system

5. Install the downloaded .xpi via about:addons → ⚙ → Install Add-on From File…

---

## 5. Update to a New Version

Whenever there’s a new release:

1. Chrome: Download the updated ZIP and hit ↻ Refresh on chrome://extensions.

2. Firefox (Temporary): Reload via about:debugging as in step 3.

3. Firefox (Permanent): Bump the version in manifest.json, rebuild, re-sign, and re-install the XPI.

Enjoy seeing cheaters highlighted in shame!