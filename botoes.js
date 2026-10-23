
document.addEventListener('DOMContentLoaded', function () {
  const links = document.querySelectorAll('nav a[href]');

  const paginaAtual = window.location.pathname
    .split('/')
    .pop() || 'index.html';

  links.forEach(function (link) {
    const destino = new URL(link.href, window.location.href);
    const paginaDestino = destino.pathname.split('/').pop();

    if (paginaDestino === paginaAtual) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    }
  });
});
