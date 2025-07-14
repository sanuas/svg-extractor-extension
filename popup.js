document.getElementById('extractBtn').addEventListener('click', extractSVGs);

async function extractSVGs() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const results = [];

      // Priority 1: SVGs inside <lottie-player> shadow DOM
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

      // Priority 2: All other SVGs (outside lottie-player)
      document.querySelectorAll('svg').forEach((svg, i) => {
        if (svg.closest('lottie-player')) return; // skip duplicates
        results.push({
          html: svg.outerHTML,
          source: 'Page SVG',
          index: `P${i + 1}`
        });
      });

      return results;
    }
  }, (results) => {
    const svgList = document.getElementById('svgList');
    svgList.innerHTML = '';

    const allSVGs = results?.[0]?.result || [];

    if (allSVGs.length === 0) {
      svgList.textContent = 'No SVGs found on this page.';
      return;
    }

    allSVGs.forEach((item) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'svg-item';

      // Label (Source and ID)
      const label = document.createElement('div');
      label.innerHTML = `<strong>${item.source}</strong> — ID: ${item.index}`;

      // SVG Preview
      const preview = document.createElement('div');
      preview.className = 'svg-preview';
      preview.innerHTML = item.html;

      // Download Button
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
