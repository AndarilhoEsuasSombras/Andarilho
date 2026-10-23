
(function () {
  const container = document.getElementById('random-post');
  if (!container) return;

  const BASE = '/Andarilho/';

  const categorias = {
    filosofia: 'filosofia.html',
    literatura: 'literatura.html',
    poesia: 'poesia.html',
    'temas-diversos': 'temas-diversos.html'
  };

  function normalizar(valor) {
    return String(valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, '-');
  }

  function criar(tag, classe, texto) {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (texto != null) elemento.textContent = texto;
    return elemento;
  }

  function extrairTrecho(post) {
    // Prioriza o resumo cadastrado no PagesCMS.
    if (post.summary && post.summary.trim()) {
      return post.summary.trim();
    }

    // Se não houver resumo, extrai um trecho do corpo.
    const temporario = document.createElement('div');
    temporario.innerHTML = String(post.body || '');

    let texto = temporario.textContent || temporario.innerText || '';

    texto = texto
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[VIDEO\]\([^)]*\)/gi, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[#>*_`~]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (texto.length > 260) {
      texto = texto.slice(0, 257).trimEnd() + '...';
    }

    return texto || 'Uma leitura do Caderno de Ideias.';
  }

  function sortear(publicacoes) {
    const post = publicacoes[
      Math.floor(Math.random() * publicacoes.length)
    ];

    const categoriaOriginal = post.blog || 'Temas diversos';
    const categoria = normalizar(categoriaOriginal);
    const destino = categorias[categoria] || 'temas-diversos.html';

    const cartao = criar('article', 'random-post-card');

  
const dataFormatada = post.date
  ? new Date(post.date + 'T12:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  : '';

const meta = criar('div', 'random-post-meta');

if (dataFormatada) {
  meta.append(criar('span', '', dataFormatada));
}

meta.append(criar('span', '', categoriaOriginal));

cartao.append(meta);



    cartao.append(
      criar('h3', 'random-post-title', post.title || 'Sem título')
    );

    cartao.append(
      criar('p', 'random-post-summary', extrairTrecho(post))
    );

    const link = criar('a', 'text-link', 'Ler publicação ↗');
link.href =
  BASE + destino +
  '#post=' + encodeURIComponent(
    [
      String(post.title || '').trim().toLowerCase(),
      String(post.date || '').trim(),
      normalizar(post.blog)
    ].join('|')
  );

    cartao.append(link);
    container.replaceChildren(cartao);
  }

  async function carregarPublicacoes() {
    try {
      // Carrega publicações antigas.
      const respostaAntigas = await fetch(
        BASE + 'content/posts.json',
        { cache: 'no-store' }
      );

      if (!respostaAntigas.ok) {
        throw new Error('Não foi possível carregar posts.json');
      }

      const antigas = await respostaAntigas.json();

      if (!Array.isArray(antigas)) {
        throw new Error('posts.json precisa conter uma lista.');
      }

      // Carrega a lista de publicações individuais.
      let nomes = [];

      try {
        const respostaIndice = await fetch(
          BASE + 'content/posts-index.json',
          { cache: 'no-store' }
        );

        if (respostaIndice.ok) {
          const indice = await respostaIndice.json();

          if (Array.isArray(indice)) {
            nomes = indice;
          }
        }
      } catch (erro) {
        console.warn('Não foi possível carregar o índice:', erro);
      }

      // Busca cada publicação individual.
      const resultados = await Promise.all(
        nomes.map(async (nome) => {
          nome = String(nome || '').trim();

          if (
            !nome ||
            nome.includes('/') ||
            nome.includes('\\') ||
            !nome.toLowerCase().endsWith('.json')
          ) {
            return null;
          }

          try {
            const resposta = await fetch(
              BASE + 'content/posts/' + encodeURIComponent(nome),
              { cache: 'no-store' }
            );

            if (!resposta.ok) return null;

            const post = await resposta.json();

            return post &&
              typeof post === 'object' &&
              !Array.isArray(post)
              ? post
              : null;
          } catch (erro) {
            console.warn('Erro ao carregar publicação:', nome, erro);
            return null;
          }
        })
      );

      // Combina as fontes, priorizando os arquivos individuais.
      const mapa = new Map();

      [...antigas, ...resultados.filter(Boolean)].forEach((post) => {
        if (!post || typeof post !== 'object') return;

        const chave = [
          String(post.title || '').trim().toLowerCase(),
          String(post.date || '').trim(),
          normalizar(post.blog)
        ].join('|');

        mapa.set(chave, post);
      });

      // Sorteia apenas textos publicados.
      const publicacoes = [...mapa.values()].filter((post) => {
        return (
          post.published === true &&
          post.title &&
          post.kind !== 'video' &&
          post.body
        );
      });

      if (!publicacoes.length) {
        container.replaceChildren(
          criar(
            'p',
            'note',
            'Ainda não há textos publicados para sortear.'
          )
        );
        return;
      }

      sortear(publicacoes);

    } catch (erro) {
      console.error('Erro ao carregar Texto sortido:', erro);

      container.replaceChildren(
        criar(
          'p',
          'note',
          'Não foi possível carregar um texto agora.'
        )
      );
    }
  }

  carregarPublicacoes();
})();
