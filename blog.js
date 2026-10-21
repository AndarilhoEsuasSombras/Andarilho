
(function () {
  const feed = document.querySelector('[data-blog-feed]');
  const blogMode = document.body.dataset.blogMode;
  

if (!feed) return;
}

  const BASE_PATH = '/Andarilho/';

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
    container.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src');

      if (src && src.startsWith('/media/')) {
        img.setAttribute('src', BASE_PATH + src.slice(1));
      }
    });
  }

  // Converte entidades HTML, como &gt;, em caracteres normais.
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
  function createYouTubeVideo(url) {
    const id = escapeYouTubeId(url);

    if (!id) return null;

    const wrapper = make('div', 'blog-video-frame');
    const iframe = document.createElement('iframe');

    iframe.src =
      'https://www.youtube-nocookie.com/embed/' +
      encodeURIComponent(id);

    iframe.title = 'Vídeo do YouTube';
    iframe.loading = 'lazy';
    iframe.allow =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allowFullscreen = true;

    wrapper.append(iframe);

    return wrapper;
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
      /^\s*&gt;\s?/mi.test(String(originalSource)) ||
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
  /\[VIDEO\]\(\s*(?:<a\b[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>[\s\S]*?<\/a>|(https?:\/\/[^\s)]+))\s*\)/gi;

    let lastIndex = 0;
    let match;

    while ((match = videoPattern.exec(source)) !== null) {
      // Formata o texto que aparece antes do vídeo.
      appendMarkdown(
        body,
        source.slice(lastIndex, match.index)
      );

const video = createYouTubeVideo(match[1] || match[2]);

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

    showPost(0);

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
      const video = createYouTubeVideo(item.video_url || '');

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

  feed.replaceChildren(
    make('p', 'note', 'Carregando publicações...')
  );

  fetch(BASE_PATH + 'content/posts.json', {
    cache: 'no-store'
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Erro HTTP ' + response.status);
      }

      return response.json();
    })
    .then((items) => {
      if (!Array.isArray(items)) {
        throw new Error(
          'O arquivo de publicações não contém uma lista.'
        );
      }

      const currentBlog = normalizeBlog(blogMode);

      const visible = items.filter((item) => {
        return (
          item &&
          item.published === true &&
          normalizeBlog(item.blog) === currentBlog
        );
      });

      visible.sort((a, b) =>
        String(b.date || '').localeCompare(String(a.date || ''))
      );

      feed.replaceChildren();

      if (!visible.length) {
        const messages = {
          reflexoes: 'Ainda não há publicações em Reflexões.',
          diario: 'Ainda não há publicações no Diário Audiovisual.',
          filosofia: 'Ainda não há publicações em Filosofia.',
          literatura: 'Ainda não há publicações em Literatura.',
          poesia: 'Ainda não há publicações em Poesia.',
          'temas-diversos':
            'Ainda não há publicações em Temas Diversos.'
        };

        feed.append(
          make(
            'div',
            'blog-empty',
            messages[currentBlog] ||
              'Ainda não há publicações nesta seção.'
          )
        );

        return;
      }



      // Todas as páginas usam o sistema de arquivo.
      feed.append(renderArchive(visible));

    })
    .catch((error) => {
      console.error('Erro ao carregar o blog:', error);

      feed.replaceChildren(
        make(
          'div',
          'blog-empty',
          'Não foi possível carregar as publicações. Verifique o arquivo content/posts.json e o Console do navegador.'
        )
      );
    });
})();
