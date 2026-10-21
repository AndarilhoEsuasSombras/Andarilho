
(async function () {
  const container = document.getElementById("latest-post");
  if (!container) return;

  const BASE_PATH = "/Andarilho/";

  const criar = (tag, classe, texto) => {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto != null) el.textContent = texto;
    return el;
  };

  try {
    const resposta = await fetch(
      BASE_PATH + "content/posts.json",
      { cache: "no-store" }
    );

    if (!resposta.ok) {
      throw new Error("Erro HTTP " + resposta.status);
    }

    const posts = await resposta.json();

    if (!Array.isArray(posts)) {
      throw new Error("posts.json não contém uma lista");
    }

    const textos = posts
      .filter(post =>
        post &&
        post.published === true &&
        post.title &&
        post.date &&
        post.kind !== "video"
      )
      .sort((a, b) =>
        String(b.date).localeCompare(String(a.date))
      );

    if (!textos.length) {
      container.replaceChildren(
        criar("p", "latest-post-error",
          "Nenhum texto publicado foi encontrado.")
      );
      return;
    }

    const post = textos[0];
    const tema = post.blog || "Temas diversos";

    const normalizar = texto =>
      String(texto)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();

    const categorias = {
      "filosofia": "filosofia.html",
      "literatura": "literatura.html",
      "poesia": "poesia.html",
      "temas diversos": "temas-diversos.html",
      "reflexões": "reflexoes.html",
      "diário audiovisual": "diario-audiovisual.html"
    };

    const data = new Date(post.date + "T12:00:00")
      .toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      });

    const cartao = criar("article", "latest-post-card");
    const meta = criar("div", "latest-post-meta");

    meta.append(
      criar("span", "", data),
      criar("span", "", tema)
    );

    cartao.append(
      meta,
      criar("h3", "", post.title),
      criar(
        "p",
        "latest-summary",
        post.summary ||
          "Leia a publicação mais recente do Caderno de Ideias."
      )
    );

    const link = criar("a", "text-link", "Ver publicações da seção ↗");
    link.href = BASE_PATH + (
      categorias[normalizar(tema)] || "index.html"
    );

    cartao.append(link);
    container.replaceChildren(cartao);

  } catch (erro) {
    console.error("Erro ao carregar o último texto:", erro);

    container.replaceChildren(
      criar("p", "latest-post-error",
        "Não foi possível carregar a publicação mais recente.")
    );
  }
})();
