(() => {
  const feed = document.querySelector("[data-video-feed]");
  if (!feed) return;

  const BASE_PATH = "/Andarilho/";

  const make = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };

  function getBitchuteId(url) {
    try {
      const parsed = new URL(url);
      if (!/(^|\.)bitchute\.com$/i.test(parsed.hostname)) return "";
      const match = parsed.pathname.match(/^\/video\/([a-zA-Z0-9]+)\/?/);
      return match ? match[1] : "";
    } catch {
      return "";
    }
  }

  function renderVideo(item, index, total) {
    const article = make("article", "blog-post-card video-archive-card");
    article.append(make("div", "blog-post-meta", `Vídeo ${index + 1} de ${total}`));
    article.append(make("h2", "blog-post-title", item.title || "Vídeo sem título"));

    const id = getBitchuteId(item.url || "");
    if (id) {
      const frame = make("div", "blog-video-frame");
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.bitchute.com/embed/${encodeURIComponent(id)}/`;
      iframe.title = item.title || "Vídeo do Bitchute";
      iframe.loading = "lazy";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.allowFullscreen = true;
      frame.append(iframe);
      article.append(frame);
    } else {
      article.append(make("p", "blog-post-summary", "Não foi possível reconhecer o link deste vídeo."));
    }

    const link = make("a", "text-link", "ASSISTIR NO BITCHUTE ↗");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    article.append(link);
    return article;
  }

  function renderArchive(items) {
    const archive = make("section", "philosophy-archive video-archive");
    const controls = make("div", "archive-controls");
    const label = make("label", "archive-label", "Selecionar vídeo");
    const select = document.createElement("select");
    select.className = "archive-select";
    select.setAttribute("aria-label", "Selecionar vídeo");

    items.forEach((item, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = item.title || "Vídeo sem título";
      select.append(option);
    });

    label.append(select);
    controls.append(label);

    const navigation = make("div", "archive-navigation");
    const previous = make("button", "archive-button", "← Anterior");
    const next = make("button", "archive-button", "Próximo →");
    const counter = make("span", "archive-counter");
    previous.type = "button";
    next.type = "button";

    const current = make("div", "archive-current-post");
    let currentIndex = 0;

    function show(index) {
      currentIndex = Math.max(0, Math.min(index, items.length - 1));
      select.value = String(currentIndex);
      counter.textContent = `Vídeo ${currentIndex + 1} de ${items.length}`;
      previous.disabled = currentIndex === 0;
      next.disabled = currentIndex === items.length - 1;
      current.replaceChildren(renderVideo(items[currentIndex], currentIndex, items.length));
    }

    select.addEventListener("change", () => show(Number(select.value)));
    previous.addEventListener("click", () => show(currentIndex - 1));
    next.addEventListener("click", () => show(currentIndex + 1));

    navigation.append(previous, counter, next);
    archive.append(controls, navigation, current);
    show(0);
    return archive;
  }

  fetch(BASE_PATH + "content/videos.json", { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);
      return response.json();
    })
    .then(items => {
      if (!Array.isArray(items) || !items.length) {
        feed.replaceChildren(make("p", "blog-empty", "Nenhum vídeo foi encontrado na lista."));
        return;
      }
      feed.replaceChildren(renderArchive(items));
    })
    .catch(error => {
      console.error("Erro ao carregar a lista de vídeos:", error);
      feed.replaceChildren(make("p", "blog-empty", "Não foi possível carregar os vídeos. Confira se content/videos.json foi enviado ao GitHub."));
    });
})();
