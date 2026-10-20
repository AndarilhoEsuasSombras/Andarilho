
(function () {
  const feed = document.querySelector('[data-blog-feed]');
  const blogMode = document.body.dataset.blogMode;

  if (!feed) return;

  const make = (tag, className, text) => {
    const el = document.createElement(tag);

    if (className) el.className = className;
    if (text !== undefined && text !== null) {
      el.textContent = text;
    }

    return el;
  };

  const escapeYouTubeId = (url) => {
    try {
      const parsed = new URL(url);
      let id = '';

      if (parsed.hostname.includes('youtu.be')) {
        id = parsed.pathname.split('/').filter(Boolean)[0] || '';
      } else if (
        parsed.hostname.includes('youtube.com') ||
        parsed.hostname.includes('youtube-nocookie.com')
      ) {
        id =
          parsed.searchParams.get('v') ||
          (parsed.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/) || [])[1] ||
          '';
      }

      return /^[a-zA-Z0-9_-]{6,}$/.test(id) ? id : '';
    } catch (_) {
      return '';
    }
  };

  const formatDate = (value) => {
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
  };

  // Converte Markdown em HTML seguro.
  function appendMarkdown(container, text) {
    if (!text.trim()) return;

    const html = window.marked.parse(text);
    const safeHTML = window.DOMPurify.sanitize(html);
    const temporary = document.createElement('div');

    temporary.innerHTML = safeHTML;

    // Corrige os caminhos das imagens no GitHub Pages.
    temporary.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src');

      if (src && src.startsWith('/media/')) {
        img.setAttribute('src', '/Andarilho' + src);
      }
    });

    container.append(...temporary.childNodes);
  }

  // Cria um vídeo do YouTube.
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

  // Extrai o ID do YouTube mesmo quando o Pages CMS altera a marcação.
  function extractYouTubeIdFromMarker(line) {
    let normalized = line;

    // Decodifica endereços que foram codificados pelo editor.
    for (let i = 0; i < 4; i++) {
      try {
        const decoded = decodeURIComponent(normalized);

        if (decoded === normalized) break;

        normalized = decoded;
      } catch (_) {
        break;
      }
    }

    // Remove barras invertidas inseridas pelo editor Markdown.
    normalized = normalized.replace(/\\/g, '');

    const match = normalized.match(
      /(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/i
    );

    return match ? match[1] : '';
  }

  // Formata o artigo e insere os vídeos entre os trechos de texto.
  function renderBody(source) {
    const body = make('div', 'blog-post-body');

    if (!window.marked || !window.DOMPurify) {
      console.error('Marked ou DOMPurify não carregou.');
      body.textContent = source;
      return body;
    }

    // Aceita [VIDEO](URL) e a versão alterada pelo Pages CMS.
    // A marcação precisa estar sozinha em uma linha.
    const videoPattern = /^[ \t]*\[VIDEO\].*$/gm;

    let lastIndex = 0;
    let match;

    while ((match = videoPattern.exec(source)) !== null) {
      // Formata o texto anterior ao vídeo.
      appendMarkdown(body, source.slice(lastIndex, match.index));

      const videoId = extractYouTubeIdFromMarker(match[0]);

      if (videoId) {
        const video = createYouTubeVideo(
          'https://www.youtube.com/watch?v=' + videoId
        );

        if (video) {
          body.append(video);
        }
      } else {
        // Mantém a marcação visível se não for possível reconhecer o link.
        appendMarkdown(body, match[0]);
        console.warn(
          'Não foi possível identificar o vídeo:',
          match[0]
        );
      }

      lastIndex = videoPattern.lastIndex;
    }

    // Formata o conteúdo depois do último vídeo.
    appendMarkdown(body, source.slice(lastIndex));

    return body;
  }

  function renderItem(item) {
    const article = make('article', 'blog-post-card');
    const meta = make('div', 'blog-post-meta');

    if (item.blog) {
      meta.append(
        make('span', 'blog-post-category', item.blog)
      );
    }

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

    // Mantém o suporte às publicações exclusivamente em vídeo.
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

    // Publicações de texto com imagens, citações e vídeos incorporados.
    if (item.body) {
      article.append(renderBody(String(item.body)));
    }

    return article;
  }

  feed.replaceChildren(
    make('p', 'note', 'Carregando publicações...')
  );

  fetch('/Andarilho/content/posts.json', { cache: 'no-store' })
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

      const visible = items.filter(
        (item) =>
          item &&
          item.published === true &&
          item.blog === blogMode
      );

      visible.sort((a, b) =>
        String(b.date || '').localeCompare(String(a.date || ''))
      );

      feed.replaceChildren();

      if (!visible.length) {
        const messages = {
          Filosofia: 'Ainda não há publicações em Filosofia.',
          Literatura: 'Ainda não há publicações em Literatura.',
          Poesia: 'Ainda não há publicações em Poesia.',
          'Temas Diversos':
            'Ainda não há publicações em Temas Diversos.'
        };

        feed.append(
          make(
            'div',
            'blog-empty',
            messages[blogMode] ||
              'Ainda não há publicações nesta seção.'
          )
        );

        return;
      }

      visible.forEach((item) => {
        feed.append(renderItem(item));
      });
    })
    .catch((error) => {
      console.error('Erro ao carregar o blog:', error);

      feed.replaceChildren(
        make(
          'div',
          'blog-empty',
          'Não foi possível carregar as publicações. Verifique o Console do navegador.'
        )
      );
    });
})();
