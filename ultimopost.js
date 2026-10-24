
(async function () {
  const container = document.getElementById("latest-post");
  if (!container) return;

  const BASE = "/Andarilho/";

  const criar = (tag, classe, texto) => {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto != null) el.textContent = texto;
    return el;
  };

  const normalizar = texto =>
    String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  const normalizarCategoria = valor =>
    normalizar(valor).replace(/[_\s]+/g, "-");

  const paginas = {
    "filosofia": "filosofia.html",
    "literatura": "literatura.html",
    "poesia": "poesia.html",
    "temas-diversos": "temas-diversos.html"
  };

  function chaveDoPost(post) {
    return [
      String(post.title || "").trim().toLowerCase(),
      String(post.date || "").trim(),
      normalizar(post.blog)
    ].join("|");
  }

  async function buscarJSON(caminho) {
    const resposta = await fetch(BASE + caminho, {
      cache: "no-store"
    });

    if (!resposta.ok) return null;
    return resposta.json();
  }

  try {
    const antigas = await buscarJSON("content/posts.json");
    const indice = await buscarJSON("content/posts-index.json");

    const mapa = new Map();

    if (Array.isArray(antigas)) {
      antigas.forEach(post => {
        if (post && post.title) {
          mapa.set(chaveDoPost(post), post);
        }
      });
    }

    if (Array.isArray(indice)) {
      const resultados = await Promise.all(
        indice.map(async nome => {
          nome = String(nome || "").trim();

          if (
            !nome ||
            nome.includes("/") ||
            nome.includes("\\") ||
            !nome.toLowerCase().endsWith(".json")
          ) {
            return null;
          }

          try {
            return await buscarJSON(
              "content/posts/" + encodeURIComponent(nome)
            );
          } catch (erro) {
            console.warn("Não foi possível carregar:", nome, erro);
            return null;
          }
        })
      );

      resultados.filter(post => post && post.title).forEach(post => {
        mapa.set(chaveDoPost(post), post);
      });
    }

    // Mostra apenas textos publicados das quatro categorias principais.
    const textos = [...mapa.values()]
      .filter(post => {
        const categoria = normalizarCategoria(post.blog);

        return (
          post.published === true &&
          post.title &&
          post.date &&
          post.kind !== "video" &&
          Object.prototype.hasOwnProperty.call(paginas, categoria)
        );
      })
      .sort((a, b) =>
        String(b.date).localeCompare(String(a.date)) ||
        String(b.time || "").localeCompare(String(a.time || ""))
      );

    if (!textos.length) {
      container.replaceChildren(
        criar(
          "p",
          "latest-post-error",
          "Nenhum texto publicado foi encontrado nas categorias."
        )
      );
      return;
    }

    const post = textos[0];
    const categoria = normalizarCategoria(post.blog);
    const nomeCategoria = {
      "filosofia": "Filosofia",
      "literatura": "Literatura",
      "poesia": "Poesia",
      "temas-diversos": "Temas diversos"
    }[categoria];

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
      criar("span", "", nomeCategoria)
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

    const link = criar("a", "text-link", "Ler publicação ↗");
    link.href = BASE + paginas[categoria] +
      "#post=" + chaveDoPost(post);

    cartao.append(link);
    container.replaceChildren(cartao);

    console.log("Último texto exibido:", post.title, post.date);

  } catch (erro) {
    console.error("Erro ao carregar o último texto:", erro);

    container.replaceChildren(
      criar(
        "p",
        "latest-post-error",
        "Não foi possível carregar a publicação mais recente."
      )
    );
  }
})();
