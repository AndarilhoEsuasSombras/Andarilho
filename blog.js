(function () {
  const feed = document.querySelector('[data-blog-feed]');
  const blogMode = document.body.dataset.blogMode;

  if (!feed) return;

  console.log('Blog selecionado:', blogMode);

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
        id = parsed.searchParams.get('v') ||
          (parsed.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/) || [])[1] || '';
      }

      return /^[a-zA-Z0-9_-]{6,}$/.test(id) ? id : '';
    } catch (_) {
      return '';
    }
  };

  const formatDate = (value) => {
    if (!value) return '';

    const d = new Date(
      value + (value.length === 10 ? 'T12:00:00' : '')
    );

    return Number.isNaN(d.getTime())
      ? value
      : new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        }).format(d);
  };

  function renderItem(item) {
    const article = make('article', 'blog-post-card');
    const meta = make('div', 'blog-post-meta');

    if (item.blog) {
      meta.append(make('span', 'blog-post-category', item.blog));
    }

    if (item.date) {
      meta.append(make('span', 'blog-post-date', formatDate(item.date)));
    }

    article.append(meta);
    article.append(make('h2', 'blog-post-title', item.title || 'Sem título'));

    if (item.summary) {
      article.append(make('p', 'blog-post-summary', item.summary));
    }

    if (item.kind === 'video') {
      const id = escapeYouTubeId(item.video_url || '');

      if (id) {
        const frameWrap = make('div', 'blog-video-frame');
        const frame = document.createElement('iframe');

        frame.src = 'https://www.youtube-nocookie.com/embed/' +
          encodeURIComponent(id);
        frame.title = item.title || 'Vídeo de Andarilho e suas Sombras';
        frame.loading = 'lazy';
        frame.allow =
          'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        frame.referrerPolicy = 'strict-origin-when-cross-origin';
        frame.allowFullscreen = true;

        frameWrap.append(frame);
        article.append(frameWrap);
      } else {
        article.append(
          make('p', 'blog-post-summary',
            'O vídeo ainda não tem um link válido do YouTube.')
        );
      }
    }

    if (item.body) {
      const body = make('div', 'blog-post-body');
      const source = String(item.body);

      if (window.marked && window.DOMPurify) {
        const rendered = window.marked.parse(source);
        body.innerHTML = window.DOMPurify.sanitize(rendered);

        // Corrige imagens para o endereço do GitHub Pages.
        body.querySelectorAll('img').forEach((img) => {
          const src = img.getAttribute('src');

          if (src && src.startsWith('/media/')) {
            img.setAttribute('src', '/Andarilho' + src);
          }
        });
      } else {
        console.error('As bibliotecas Marked ou DOMPurify não carregaram.');
        body.textContent = source;
      }

      article.append(body);
    }

    return article;
  }

  feed.replaceChildren(make('p', 'note', 'Carregando publicações...'));

  fetch('/Andarilho/content/posts.json', { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Erro HTTP ' + response.status +
          ' ao carregar content/posts.json');
      }
      return response.json();
    })
    .then((items) => {
      if (!Array.isArray(items)) {
        throw new Error('O arquivo de publicações precisa conter uma lista.');
      }

      const visible = items.filter((item) =>
        item &&
        item.published === true &&
        item.blog === blogMode
      );

      visible.sort((a, b) =>
        String(b.date || '').localeCompare(String(a.date || ''))
      );

      feed.replaceChildren();

      if (!visible.length) {
        const mensagens = {
          Filosofia: 'Ainda não há publicações em Filosofia.',
          Literatura: 'Ainda não há publicações em Literatura.',
          Poesia: 'Ainda não há publicações em Poesia.',
          'Temas Diversos': 'Ainda não há publicações em Temas Diversos.'
        };

        feed.append(make(
          'div',
          'blog-empty',
          mensagens[blogMode] || 'Ainda não há publicações nesta seção.'
        ));
        return;
      }

      visible.forEach((item) => {
        feed.append(renderItem(item));
      });
    })
    .catch((error) => {
      console.error('Erro ao carregar o blog:', error);

      feed.replaceChildren(make(
        'div',
        'blog-empty',
        'Não foi possível carregar as publicações. Verifique o Console do navegador.'
      ));
    });
})();
