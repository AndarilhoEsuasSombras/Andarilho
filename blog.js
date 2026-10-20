
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

  // Converte um trecho de Markdown em elementos HTML seguros.
  function appendMarkdown(container, text) {
    if (!text.trim()) return;

    const html = window.marked.parse(text);
    const safeHTML = window.DOMPurify.sanitize(html);
    const temporary = document.createElement('div');

    temporary.innerHTML = safeHTML;

    // Corrige o caminho das imagens no GitHub Pages.
    temporary.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src');

      if (src && src.startsWith('/media/')) {
        img.setAttribute('src', '/Andarilho' + src);
      }
    });

    container.append(...temporary.childNodes);
  }

  // Cria o vídeo diretamente no DOM, sem depender de HTML embutido.
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

  // Formata o artigo e insere cada vídeo entre os trechos de texto.
  function renderBody(source) {
    const body = make('div', 'blog-post-body');

    if (!window.marked || !window.DOMPurify) {
      console.error('Marked ou DOMPurify não carregou.');
      body.textContent = source;
      return body;
    }

    /*
     * Reconhece [VIDEO](URL) em uma linha própria.
     * Também aceita links comuns do YouTube e youtu.be.
     */
    const videoPattern =
      /^[ \t]*\[VIDEO\]\((https?:\/\/[^\s)]+)\)[ \t]*$/gm;

    let lastIndex = 0;
    let match;

    while ((match = videoPattern.exec(source)) !== null) {
      // Formata todo o texto anterior ao vídeo.
      appendMarkdown(body, source.slice(lastIndex, match.index));

      // Insere o vídeo no lugar da marcação.
      const video = createYouTubeVideo(match[1]);

      if (video) {
        body.append(video);
      } else {
        // Mantém a marcação visível se o link não for reconhecido.
        appendMarkdown(body, match[0]);
      }

      lastIndex = videoPattern.lastIndex;
    }

    // Formata todo o conteúdo posterior ao último vídeo.
    appendMarkdown(body, source.slice(lastIndex));

    return body;
  }

  function renderItem(item) {
    const article = make('article', 'blog-post-card');
    const meta = make('div', 'blog-post-meta');

    if (item.blog) {
      meta.append(make('span', 'blog-post-category', item.blog));
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
    const body = make('div', 'blog-post-body');
    const source = String(item.body);

    // Detecta Markdown dentro do HTML gerado pelo editor.
    const hasMarkdown =
        /!\[[^\]]*\]\([^)]+\)/.test(source) ||
        /\[VIDEO\]\(/i.test(source) ||
        /^\s*&gt;\s?/mi.test(source) ||
        /^\s*>+\s?/m.test(source) ||
        /\*\*[^*]+\*\*/.test(source);

    let html;

    if (hasMarkdown) {
        // Remove os parágrafos externos que envolveram o Markdown.
        let markdown = source
            .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/?p[^>]*>/gi, '');

        // Converte entidades HTML, como &gt;, de volta ao texto.
        const decoder = document.createElement('textarea');
        decoder.innerHTML = markdown;
        markdown = decoder.value;

        html = window.marked.parse(markdown);
    } else {
        // Preserva a formatação HTML do editor visual.
        html = source;
    }

    if (window.DOMPurify) {
        body.innerHTML = window.DOMPurify.sanitize(html, {
            USE_PROFILES: { html: true }
        });
    } else {
        body.textContent = source;
        console.error('DOMPurify não carregou.');
    }

    article.append(body);
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
        throw new Error('O arquivo de publicações não contém uma lista.');
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
