(function () {
  const feed = document.querySelector('[data-blog-feed]');
  const blogMode = document.body.dataset.blogMode;

  if (!feed) return;

  const BASE_PATH = '/Andarilho/';
  
function getPostKey(item) {
  return [
    String(item.title || '').trim().toLowerCase(),
    String(item.date || '').trim(),
    normalizeBlog(item.blog)
  ].join('|');
}
  
  const make = (tag, className, text) => {
    const el = document.createElement(tag);

    if (className) el.className = className;
    if (text !== undefined && text !== null) {
      el.textContent = text;
    }

    return el;
  };

  // Identifica vídeos do YouTube e extrai o ID.
  function escapeYouTubeId(url) {
    try {
      const parsed = new URL(url);
      let id = '';

      if (
        parsed.hostname === 'youtu.be' ||
        parsed.hostname.endsWith('.youtu.be')
      ) {
        id = parsed.pathname.split('/').filter(Boolean)[0] || '';
      } else if (
        parsed.hostname === 'youtube.com' ||
        parsed.hostname.endsWith('.youtube.com') ||
        parsed.hostname === 'youtube-nocookie.com' ||
        parsed.hostname.endsWith('.youtube-nocookie.com')
      ) {
        id =
          parsed.searchParams.get('v') ||
          (parsed.pathname.match(
            /\/(?:embed|shorts)\/([^/?]+)/
          ) || [])[1] ||
          '';
      }

      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : '';
    } catch (error) {
      return '';
    }
  }

  // Formata a data para português.
  function formatDate(value) {
    if (!value) return '';

    const date = new Date(
      value + (value.length === 10 ? 'T12:00:00' : '')
    );

    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        }).format(date);
  }


  // Formata o horário da publicação.
  function formatTime(value) {
    if (!value) return '';

    const match = String(value).match(/^([01]\d|2[0-3]):([0-5]\d)$/);

    return match ? match[0] : '';
  }

  
  // Aceita nomes de seção com maiúsculas, espaços ou acentos.
  function normalizeBlog(value) {
    let name = String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[_\s]+/g, '-');

    const aliases = {
      'diario-audiovisual': 'diario',
      'temas-diversos': 'temas-diversos'
    };

    return aliases[name] || name;
  }

  // Corrige os caminhos das imagens do GitHub Pages.

function fixImagePaths(container) {
  container.querySelectorAll(
    'img, video, audio, source'
  ).forEach((element) => {
    for (const atributo of ['src', 'poster']) {
      const valor = element.getAttribute(atributo);

      if (valor && valor.startsWith('/media/')) {
        element.setAttribute(
          atributo,
          BASE_PATH + valor.slice(1)
        );
      }
    }
  });
}


  // Converte entidades HTML, como >, em caracteres normais.
  function decodeEntities(value) {
    const decoder = document.createElement('textarea');
    decoder.innerHTML = value;
    return decoder.value;
  }

  // Preserva a estrutura HTML criada pelo PagesCMS.
  // Isso mantém os parágrafos, imagens e citações.
  function normalizeSource(source) {
    let text = String(source || '');
    return decodeEntities(text).trim();
  }

  // Insere Markdown convertido e higienizado.
  function appendMarkdown(container, text) {
    if (!text.trim()) return;

    const html = window.marked.parse(text);
    const safeHTML = window.DOMPurify.sanitize(html);
    const temporary = document.createElement('div');

    temporary.innerHTML = safeHTML;
    fixImagePaths(temporary);

    container.append(...temporary.childNodes);
  }

  // Cria um vídeo incorporado sem inserir HTML de iframe vindo do texto.
// Cria um player do YouTube ou de um arquivo MP4.
function createVideo(url) {
  if (!url) return null;

  // Mantém o suporte aos vídeos do YouTube.
  const youtubeId = escapeYouTubeId(url);

  if (youtubeId) {
    const wrapper = make('div', 'blog-video-frame');
    const iframe = document.createElement('iframe');

    iframe.src =
      'https://www.youtube-nocookie.com/embed/' +
      encodeURIComponent(youtubeId);

    iframe.title = 'Vídeo do YouTube';
    iframe.loading = 'lazy';
    iframe.allow =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allowFullscreen = true;

    wrapper.append(iframe);
    return wrapper;
  }

  // Aceita MP4 hospedado no próprio site.
  let videoURL;

  try {
    videoURL = new URL(url, window.location.origin);
  } catch (error) {
    return null;
  }

  if (videoURL.origin !== window.location.origin) return null;
  if (!/\.mp4$/i.test(videoURL.pathname)) return null;

  // Corrige caminhos como /media/videos/exemplo.mp4.
  if (videoURL.pathname.startsWith('/media/')) {
    videoURL.pathname =
      BASE_PATH + videoURL.pathname.slice(1);
  }

  const video = document.createElement('video');
  video.controls = true;
  video.preload = 'metadata';
  video.playsInline = true;
  video.setAttribute('aria-label', 'Vídeo da publicação');
  video.src = videoURL.pathname + videoURL.search;

  return video;
}

  // Converte o texto da publicação, incluindo vídeos no meio do conteúdo.
  function renderBody(originalSource) {
    const body = make('div', 'blog-post-body');
    const source = normalizeSource(originalSource);

    if (!window.marked || !window.DOMPurify) {
      console.error('Marked ou DOMPurify não carregou.');
      body.textContent = source;
      return body;
    }

    const hasMarkdown =
      /!\[[^\]]*\]\([^)]+\)/.test(source) ||
      /\[VIDEO\]\(/i.test(source) ||
      /^\s*>\s?/mi.test(String(originalSource)) ||
      /^\s*>+\s?/m.test(source) ||
      /\*\*[^*]+\*\*/.test(source) ||
      /(^|[^*])\*[^*\n]+\*/.test(source) ||
      /^\s*#{1,6}\s+/m.test(source) ||
      /^\s*[-*+]\s+/m.test(source);

    // Se for HTML puro do editor visual, preserva sua estrutura.
    if (!hasMarkdown && /<\/?[a-z][\s\S]*>/i.test(source)) {
      body.innerHTML = window.DOMPurify.sanitize(source);
      fixImagePaths(body);
      return body;
    }

    // Reconhece [VIDEO](URL), mesmo que o editor tenha
    // colocado a marcação no meio de um parágrafo.

const videoPattern =
  /\[VIDEO\]\(\s*(?:<a\b[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?<\/a>|([^\s)]+))\s*\)/gi;

    let lastIndex = 0;
    let match;

    while ((match = videoPattern.exec(source)) !== null) {
      // Formata o texto que aparece antes do vídeo.
      appendMarkdown(
        body,
        source.slice(lastIndex, match.index)
      );

const video = createVideo(match[1] || match[2]);

      if (video) {
        body.append(video);
      } else {
        appendMarkdown(body, match[0]);
      }

      lastIndex = videoPattern.lastIndex;
    }

    // Formata o restante do texto após o último vídeo.
    appendMarkdown(body, source.slice(lastIndex));

    return body;
  }

  
  // Arquivo de publicações exclusivo da página Filosofia.
function renderArchive(items) {
    const archive = make('section', 'philosophy-archive');
    const controls = make('div', 'archive-controls');
    const label = make('label', 'archive-label', 'Selecionar publicação');

    const select = document.createElement('select');
    select.className = 'archive-select';
    select.setAttribute('aria-label', 'Selecionar publicação');

    items.forEach((item, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = item.title || 'Sem título';
      select.append(option);
    });

    label.append(select);
    controls.append(label);

    const navigation = make('div', 'archive-navigation');
    const previous = make('button', 'archive-button', '← Anterior');
    const next = make('button', 'archive-button', 'Próxima →');
    const counter = make('span', 'archive-counter');

    previous.type = 'button';
    next.type = 'button';

    const postContainer = make('div', 'archive-current-post');

    let currentIndex = 0;

    function showPost(index) {
      currentIndex = Math.max(0, Math.min(index, items.length - 1));

      select.value = String(currentIndex);
      counter.textContent =
        `Publicação ${currentIndex + 1} de ${items.length}`;

      previous.disabled = currentIndex === 0;
      next.disabled = currentIndex === items.length - 1;

      postContainer.replaceChildren(renderItem(items[currentIndex]));
    }

    select.addEventListener('change', () => {
      showPost(Number(select.value));
    });

    previous.addEventListener('click', () => {
      showPost(currentIndex - 1);
    });

    next.addEventListener('click', () => {
      showPost(currentIndex + 1);
    });

    navigation.append(previous, counter, next);
    archive.append(controls, navigation, postContainer);


  const postSolicitado = new URLSearchParams(
    window.location.hash.slice(1)
  ).get('post');

  const indiceSolicitado = postSolicitado
    ? items.findIndex(item => getPostKey(item) === postSolicitado)
    : -1;

  showPost(indiceSolicitado >= 0 ? indiceSolicitado : 0);

  if (indiceSolicitado >= 0) {
    requestAnimationFrame(() => {
      archive.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  }

  return archive;

  }

  
  // Monta cada publicação.
  function renderItem(item) {
    const article = make('article', 'blog-post-card');
    const meta = make('div', 'blog-post-meta');

    meta.append(
      make(
        'span',
        'blog-post-category',
        item.category || item.blog || ''
      )
    );


  if (item.date) {
    meta.append(
      make('span', 'blog-post-date', formatDate(item.date))
    );
  }

  const horario = formatTime(item.time);

  if (horario) {
    meta.append(
      make('span', 'blog-post-time', horario)
    );
  }


    article.append(meta);

    article.append(
      make('h2', 'blog-post-title', item.title || 'Sem título')
    );

    if (item.summary) {
      article.append(
        make('p', 'blog-post-summary', item.summary)
      );
    }

    // Publicação exclusivamente em vídeo.
    if (item.kind === 'video') {
const video = createVideo(item.video_url || '');

      if (video) {
        article.append(video);
      } else {
        article.append(
          make(
            'p',
            'blog-post-summary',
            'O vídeo ainda não tem um link válido do YouTube.'
          )
        );
      }
    }

    // Texto em Markdown ou HTML, com imagens e vídeos incorporados.
    if (item.body) {
      article.append(renderBody(item.body));
    }

    return article;
  }


  // Carrega as publicações antigas e as novas publicações individuais.
  feed.replaceChildren(
    make('p', 'note', 'Carregando publicações...')
  );

  (async function carregarPublicacoes() {
    try {
      // 1. Carrega o arquivo antigo, que continua existindo.
      const respostaAntigas = await fetch(
        BASE_PATH + 'content/posts.json',
        { cache: 'no-store' }
      );

      if (!respostaAntigas.ok) {
        throw new Error('Não foi possível carregar content/posts.json');
      }

      const antigas = await respostaAntigas.json();

      if (!Array.isArray(antigas)) {
        throw new Error('content/posts.json precisa conter uma lista.');
      }

      // 2. Lê a lista dos arquivos individuais.
      let nomesArquivos = [];

      try {
        const respostaIndice = await fetch(
          BASE_PATH + 'content/posts-index.json',
          { cache: 'no-store' }
        );

        if (respostaIndice.ok) {
          nomesArquivos = await respostaIndice.json();

          if (!Array.isArray(nomesArquivos)) {
            throw new Error(
              'posts-index.json precisa conter uma lista de nomes.'
            );
          }
        } else {
          console.warn(
            'posts-index.json não encontrado. Carregando apenas os posts antigos.'
          );
        }
      } catch (erroIndice) {
        console.warn('Não foi possível ler o índice:', erroIndice);
      }

      // 3. Carrega cada publicação individual.
      const resultados = await Promise.all(
        nomesArquivos.map(async (nomeArquivo) => {
          try {
            const nomeSeguro = String(nomeArquivo || '').trim();

            // Aceita apenas nomes de arquivos JSON, sem caminhos de pastas.
            if (
              !nomeSeguro ||
              nomeSeguro.includes('/') ||
              nomeSeguro.includes('\\') ||
              !nomeSeguro.toLowerCase().endsWith('.json')
            ) {
              console.warn('Nome de arquivo inválido:', nomeArquivo);
              return null;
            }

            const resposta = await fetch(
              BASE_PATH + 'content/posts/' +
                encodeURIComponent(nomeSeguro),
              { cache: 'no-store' }
            );

            if (!resposta.ok) {
              throw new Error(
                'Erro HTTP ' + resposta.status + ': ' + nomeSeguro
              );
            }

            const dados = await resposta.json();

            // Cada arquivo deve conter um objeto de publicação.
            if (
              !dados ||
              typeof dados !== 'object' ||
              Array.isArray(dados)
            ) {
              throw new Error(
                'Formato inválido no arquivo ' + nomeSeguro
              );
            }

            return dados;
          } catch (erro) {
            console.error(
              'Erro ao carregar uma publicação individual:',
              erro
            );
            return null;
          }
        })
      );

      const novas = resultados.filter(Boolean);

      // 4. Combina as duas fontes e evita duplicações.
      // Se título, data e categoria forem iguais, a publicação
      // individual prevalece sobre a antiga.
      const publicacoesPorChave = new Map();

      [...antigas, ...novas].forEach((item) => {
        if (!item || typeof item !== 'object') return;

        const chave = [
          String(item.title || '').trim().toLowerCase(),
          String(item.date || '').trim(),
          normalizeBlog(item.blog)
        ].join('|');

        publicacoesPorChave.set(
          chave,
          item
        );
      });

      const todas = Array.from(publicacoesPorChave.values());

      // 5. Mantém a separação entre as categorias.
      const currentBlog = normalizeBlog(blogMode);

      const visiveis = todas.filter((item) => {
        return (
          item.published === true &&
          normalizeBlog(item.blog) === currentBlog
        );
      });

      // 6. Ordena da publicação mais recente para a mais antiga.
      visiveis.sort((a, b) =>
        String(b.date || '').localeCompare(String(a.date || ''))
      );

      feed.replaceChildren();

      if (!visiveis.length) {
        const mensagens = {
          reflexoes: 'Ainda não há publicações em Reflexões.',
          diario: 'Ainda não há publicações no Diário Audiovisual.',
          filosofia: 'Ainda não há publicações em Filosofia.',
          literatura: 'Ainda não há publicações em Literatura.',
          poesia: 'Ainda não há publicações em Poesia.',
          'temas-diversos':
            'Ainda não há publicações em Temas Diversos.',
          blog: 'Ainda não há publicações no Blog.'
        };

        feed.append(
          make(
            'div',
            'blog-empty',
            mensagens[currentBlog] ||
              'Ainda não há publicações nesta seção.'
          )
        );

        return;
      }

      // 7. Preserva o sistema de arquivo que você já utiliza.
      feed.append(renderArchive(visiveis));

    } catch (erro) {
      console.error('Erro ao carregar o blog:', erro);

      feed.replaceChildren(
        make(
          'div',
          'blog-empty',
          'Não foi possível carregar as publicações antigas. Verifique content/posts.json e o Console do navegador.'
        )
      );
    }
  })();

  

/* Último texto publicado na página inicial */
async function carregarUltimoTexto() {
  const container = document.getElementById("latest-post");
  if (!container) return;

  const BASE = "/Andarilho/";

  const categorias = {
    "Filosofia": "filosofia.html",
    "Literatura": "literatura.html",
    "Poesia": "poesia.html",
    "Temas diversos": "temas-diversos.html",
  };

  const normalizar = texto =>
    String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  const criar = (tag, classe, texto) => {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto != null) el.textContent = texto;
    return el;
  };

  try {
    // 1. Carrega as publicações antigas.
    const resposta = await fetch(
      BASE + "content/posts.json",
      { cache: "no-store" }
    );

    if (!resposta.ok) {
      throw new Error("Erro ao carregar posts.json");
    }

    const antigas = await resposta.json();

    if (!Array.isArray(antigas)) {
      throw new Error("posts.json precisa conter uma lista.");
    }

    // 2. Lê a lista automática de arquivos individuais.
    let nomes = [];

    try {
      const respostaIndice = await fetch(
        BASE + "content/posts-index.json",
        { cache: "no-store" }
      );

      if (respostaIndice.ok) {
        nomes = await respostaIndice.json();

        if (!Array.isArray(nomes)) {
          throw new Error("O índice não contém uma lista.");
        }
      }
    } catch (erro) {
      console.warn("Não foi possível carregar o índice:", erro);
    }

    // 3. Carrega as publicações individuais.
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
            BASE + "content/posts/" + encodeURIComponent(nome),
            { cache: "no-store" }
          );

          if (!respostaPost.ok) {
            throw new Error("Erro ao carregar " + nome);
          }

          const post = await respostaPost.json();

          if (
            !post ||
            typeof post !== "object" ||
            Array.isArray(post)
          ) {
            return null;
          }

          return post;
        } catch (erro) {
          console.error("Erro ao carregar publicação:", erro);
          return null;
        }
      })
    );

    const individuais = resultados.filter(Boolean);

    // 4. Combina as fontes, evitando publicações duplicadas.
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

    // 5. Seleciona os textos publicados.
    const textos = [...mapa.values()]
      .filter(post =>
        post.published !== false &&
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

    // 6. Exibe a publicação mais recente.
    const post = textos[0];
    const tema = post.blog || "Temas diversos";
    const destino = categorias[normalizar(tema)] || "index.html";

    const cartao = criar("article", "latest-post-card");
    const meta = criar("div", "latest-post-meta");

    const data = new Date(post.date + "T12:00:00")
      .toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      });

    meta.append(
      criar("span", "", data),
      criar("span", "", tema)
    );

    const titulo = criar("h3", "", post.title);

    const resumo = criar(
      "p",
      "latest-summary",
      post.summary ||
        "Leia a publicação mais recente do Caderno de Ideias."
    );

    const link = criar("a", "text-link", "Ler texto completo ↗");
    link.href = BASE + destino;

    cartao.append(meta, titulo, resumo, link);
    container.replaceChildren(cartao);

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
}


carregarUltimoTexto();

})();
