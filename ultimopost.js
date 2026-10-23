
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

  const normalizar = texto =>
    String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  const categorias = {
    "filosofia": "filosofia.html",
    "literatura": "literatura.html",
    "poesia": "poesia.html",
    "temas diversos": "temas-diversos.html",
    "reflexoes": "reflexoes.html",
    "diario audiovisual": "diario-audiovisual.html",
  };

  try {
    // Carrega as publicações antigas.
    const resposta = await fetch(
      BASE_PATH + "content/posts.json",
      { cache: "no-store" }
    );

    if (!resposta.ok) {
      throw new Error("Erro ao carregar posts.json: " + resposta.status);
    }

    const antigas = await resposta.json();

    if (!Array.isArray(antigas)) {
      throw new Error("posts.json não contém uma lista.");
    }

    // Carrega a lista automática dos arquivos individuais.
    let nomes = [];

    const respostaIndice = await fetch(
      BASE_PATH + "content/posts-index.json",
      { cache: "no-store" }
    );

    if (respostaIndice.ok) {
      nomes = await respostaIndice.json();

      if (!Array.isArray(nomes)) {
        throw new Error("posts-index.json não contém uma lista.");
      }
    } else {
      console.warn("Índice não encontrado; usando posts antigos.");
    }

    // Carrega cada publicação individual.
    const resultados = await Promise.all(
      nomes.map(async nome => {
        try {
          nome = String(nome || "").trim();

          if (
            !nome ||
            nome.includes("/") ||
            nome.includes("\\") ||
            !nome.toLowerCase().endsWith(".json")
          ) {
            return null;
          }

          const respostaPost = await fetch(
            BASE_PATH + "content/posts/" +
              encodeURIComponent(nome),
            { cache: "no-store" }
          );

          if (!respostaPost.ok) {
            throw new Error("Erro ao carregar " + nome);
          }

          const post = await respostaPost.json();

          if (!post || typeof post !== "object" || Array.isArray(post)) {
            return null;
          }

          return post;
        } catch (erro) {
          console.error("Erro ao carregar publicação individual:", erro);
          return null;
        }
      })
    );

    const individuais = resultados.filter(Boolean);

    // Combina os posts antigos e os individuais sem duplicações.
    const mapa = new Map();

    [...antigas, ...individuais].forEach(post => {
      if (!post || typeof post !== "object") return;

      const chave = [
        normalizar(post.title),
        String(post.date || "").trim(),
        normalizar(post.blog)
      ].join("|");

      // Se houver duplicação, o arquivo individual prevalece.
      mapa.set(chave, post);
    });

    // Seleciona o texto publicado mais recente.
    const textos = [...mapa.values()]
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
        criar(
          "p",
          "latest-post-error",
          "Nenhum texto publicado foi encontrado."
        )
      );
      return;
    }

    const post = textos[0];
    const tema = post.blog || "Temas diversos";
    const data = new Date(post.date + "T12:00:00")
      .toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      });

    // Mantém o visual original do cartão.
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

    const link = criar("a", "text-link", "Ler publicação ↗");
    link.href = BASE_PATH + (
      categorias[normalizar(tema)] || "index.html"
    );

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
