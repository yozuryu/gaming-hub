// Art fallback offsets (classic script, on every page). Every img.art-icon shows the same library
// mosaic (assets/ui.css, art-fallback.webp); started at the same corner, cards side by side would
// show the same patch of it. This starts each one at a spot picked from its icon URL, so neighbours
// differ and a game always shows the same patch. Watches the page for new or changed images.
(function () {
  var W = 287, H = 210;   // the mosaic's drawn size (ui.css background-size)
  function place(img) {
    var src = img.getAttribute('src') || '';
    if (img.dataset.artFor === src) return;
    var h = 0;
    for (var i = 0; i < src.length; i++) h = (h * 31 + src.charCodeAt(i)) | 0;
    h = Math.abs(h);
    img.style.backgroundPosition = -(h % W) + 'px ' + -((h >> 9) % H) + 'px';
    img.dataset.artFor = src;
  }
  function scan(root) {
    if (root.matches && root.matches('img.art-icon')) place(root);
    if (root.querySelectorAll) root.querySelectorAll('img.art-icon').forEach(place);
  }
  function start() {
    scan(document);
    new MutationObserver(function (list) {
      list.forEach(function (m) {
        if (m.type === 'attributes') scan(m.target);
        else m.addedNodes.forEach(scan);
      });
    }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'src'] });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
