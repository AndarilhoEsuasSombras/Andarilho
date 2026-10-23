
(function () {
  'use strict';

  const BASE = '/Andarilho/';

  const form = document.getElementById('search-form');
  const input = document.getElementById('search-input');
  const status = document.getElementById('search-status');
  const results = document.getElementById('search-results');

  if (!form || !input || !status || !results) return;

  function normalizar(valor) {
    return String(valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag);

    if (classe) elemento.className = classe;
    if (texto !== undefined) elemento.textContent = texto;

    return elemento;
  }

  function limparHTML(html) {
    const documento = new DOMParser().parseFromString(
      String(html || ''),
      'text/html'
    );

    return documento.body.textContent || '';
  }

  function dataFormatada(valor) {
    if (!valor) return '';

    const partes = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!partes) return String(valor);

    return `${partes[3]}/${partes[2]}/${partes[1]}`;
  }

  function categoriaDoPost(post) {
    const categoria = String(post.blog || post.category || 'Blog').trim();

    const categorias = {
      'filosofia': 'Filosofia',
      'literatura': 'Literatura',
      'poesia': 'Poesia',
      'temas diversos': 'Temas diversos',
      'blog': 'Blog'
    };

    return categorias[normalizar(categoria)] || categoria;
  }

  function paginaDaCategoria(categoria) {
    const paginas = {
      'filosofia': 'filosofia.html',
      'literatura': 'literatura.html',
      'poesia': 'poesia.html',
      'temas diversos': 'temas-diversos.html',
      'blog': 'blog.html'
    };

    return paginas[normalizar(categoria)] || 'blog.html';
  }

  function chaveDoPost(post) {
    return [
      normalizar(post.title),
      String(post.date || '').trim(),
      normalizar(post.blog || post.category)
    ].join('|');
  }

  function extrairTexto(post) {
    const partes = [
      post.title,
      post.summary,
      post.body,
      post.content,
      post.text
    ];

    return limparHTML(partes.filter(Boolean).join(' '));
  }

  function criarResultado(post, termo) {
    const categoria = categoriaDoPost(post);
    const artigo = criarElemento('article', 'search-result');

    const meta = criarElemento(
      'div',
      'search-result-meta',
      `${categoria} · ${dataFormatada(post.date)}`
    );

    const titulo = criarElemento('h2');
    const link = criarElemento('a', '', post.title);

    const destino = new URL(
      paginaDaCategoria(categoria),
      window.location.origin + BASE
    );

    destino.hash = 'post=' + chaveDoPost(post);

    link.href = destino.pathname + destino.hash;
    titulo.appendChild(link);

    const textoCompleto = extrairTexto(post);
    const textoNormalizado = normalizar(textoCompleto);
    const posicao = textoNormalizado.indexOf(normalizar(termo));

    let trecho = textoCompleto;

    if (posicao >= 0) {
      const inicio = Math.max(0, posicao - 100);
      const fim = Math.min(textoCompleto.length, posicao + termo.length + 180);

      trecho =
        (inicio > 0 ? '…' : '') +
        textoCompleto.slice(inicio, fim).trim() +
        (fim < textoCompleto.length ? '…' : '');
    } else if (trecho.length > 220) {
      trecho = trecho.slice(0, 220).trim() + '…';
    }

    artigo.append(meta, titulo, criarElemento('p', '', trecho));

    return artigo;
  }

  async function carregarPublicacoes() {
    const mapa = new Map();

    async function buscarJSON(caminho) {
      try {
        const resposta = await fetch(BASE + caminho, {
          cache: 'no-store'
        });

        if (!resposta.ok) return null;

        return await resposta.json();
      } catch (erro) {
        console.warn('Não foi possível carregar:', caminho, erro);
        return null;
      }
    }

    // Carrega publicações do formato antigo, se existir.
    const antigas = await buscarJSON('content/posts.json');

    if (Array.isArray(antigas)) {
      antigas.forEach(post => {
        if (post && post.title) {
          mapa.set(chaveDoPost(post), post);
        }
      });
    }

    // Carrega a lista dos arquivos individuais.
    const indice = await buscarJSON('content/posts-index.json');

    if (Array.isArray(indice)) {
      const individuais = await Promise.all(
        indice.map(async nome => {
          const post = await buscarJSON(
            'content/posts/' + encodeURIComponent(nome)
          );

          return post && post.title ? post : null;
        })
      );

      individuais.filter(Boolean).forEach(post => {
        mapa.set(chaveDoPost(post), post);
      });
    }

    return [...mapa.values()].filter(post =>
      post &&
      post.title &&
      post.published !== false
    );
  }

  let publicacoes = [];
  let carregado = false;

  async function pesquisar(evento) {
    evento.preventDefault();

    const termo = input.value.trim();

    results.replaceChildren();

    if (!termo) {
      status.textContent = 'Digite uma palavra para pesquisar.';
      return;
    }

    if (!carregado) {
      status.textContent = 'Carregando publicações...';

      try {
        publicacoes = await carregarPublicacoes();
        carregado = true;
      } catch (erro) {
        console.error(erro);
        status.textContent =
          'Não foi possível carregar os textos. Tente novamente.';
        return;
      }
    }

    const palavra = normalizar(termo);

    const encontrados = publicacoes.filter(post => {
      const titulo = normalizar(post.title);
      const conteudo = normalizar(extrairTexto(post));

      return titulo.includes(palavra) || conteudo.includes(palavra);
    });

    encontrados.sort((a, b) =>
      String(b.date || '').localeCompare(String(a.date || '')) ||
      String(b.time || '').localeCompare(String(a.time || ''))
    );

    status.textContent = encontrados.length
      ? `${encontrados.length} resultado(s) encontrado(s).`
      : 'Nenhuma publicação encontrada. Tente outras palavras.';

    encontrados.forEach(post => {
      results.appendChild(criarResultado(post, termo));
    });
  }

  form.addEventListener('submit', pesquisar);

  // Permite pesquisar automaticamente se a página abrir com ?q=palavra.
  const parametros = new URLSearchParams(window.location.search);
  const consultaInicial = parametros.get('q');

  if (consultaInicial) {
    input.value = consultaInicial;
    form.requestSubmit();
  }
})();
