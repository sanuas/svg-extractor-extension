document.getElementById('extractBtn').addEventListener('click', extractSVGs);

async function extractSVGs() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Step 1: Run script in page context to collect initial info
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const results = [];

      // 1. Lottie SVGs
      document.querySelectorAll('lottie-player').forEach((player, pIndex) => {
        const shadowRoot = player.shadowRoot;
        if (!shadowRoot) return;

        shadowRoot.querySelectorAll('svg').forEach((svg, sIndex) => {
          results.push({
            html: svg.outerHTML,
            source: 'Lottie Player',
            index: `L${pIndex + 1}.${sIndex + 1}`
          });
        });
      });

      // 2. Inline SVGs (not inside lottie-player)
      document.querySelectorAll('svg').forEach((svg, i) => {
        if (svg.closest('lottie-player')) return;
        results.push({
          html: svg.outerHTML,
          source: 'Page SVG',
          index: `P${i + 1}`
        });
      });

      // 3. <img src="...svg"> - just collect URLs here
      const externalSVGs = Array.from(document.querySelectorAll('img[src$=".svg"]')).map((img, i) => ({
        src: img.src,
        source: 'Image Tag (External)',
        index: `I${i + 1}`
      }));

      return { results, externalSVGs };
    }
  }, async ([injectedResult]) => {
    const svgList = document.getElementById('svgList');
    svgList.innerHTML = '';

    const { results = [], externalSVGs = [] } = injectedResult?.result || {};

    // Step 2: Fetch external SVGs
    for (let img of externalSVGs) {
      try {
        const res = await fetch(img.src);
        const text = await res.text();
        if (text.includes('<svg')) {
          results.push({
            html: text,
            source: img.source,
            index: img.index
          });
        }
      } catch (err) {
        results.push({
          html: `<small>⚠️ Failed to fetch: ${img.src}</small>`,
          source: img.source,
          index: img.index
        });
      }
    }

    if (results.length === 0) {
      svgList.textContent = 'No SVGs found on this page.';
      return;
    }

    // Step 3: Render all
    results.forEach((item) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'svg-item';

      const label = document.createElement('div');
      label.innerHTML = `<strong>${item.source}</strong> — ID: ${item.index}`;

      const preview = document.createElement('div');
      preview.className = 'svg-preview';
      preview.innerHTML = item.html;

      const downloadBtn = document.createElement('button');
      downloadBtn.textContent = `Download SVG ${item.index}`;
      downloadBtn.addEventListener('click', () => {
        const blob = new Blob([item.html], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `svg_${item.index}.svg`;
        a.click();
        URL.revokeObjectURL(url);
      });

      wrapper.appendChild(label);
      wrapper.appendChild(preview);
      wrapper.appendChild(downloadBtn);
      svgList.appendChild(wrapper);
    });
  });
}
