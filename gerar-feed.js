
const BASE = "https://andarilhoesuassombras.github.io/Andarilho/";

async function gerarFeed() {
  const resposta = await fetch(BASE + "content/posts.json");
  const posts = await resposta.json();

  const publicados = posts
    .filter(post => post && post.published === true)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 30);

  const escapar = texto => String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

  const itens = publicados.map(post => {
    const link = BASE + "post.html?title=" +
      encodeURIComponent(post.title || "");

    return `
      <item>
        <title>${escapar(post.title)}</title>
        <link>${escapar(link)}</link>
        <guid>${escapar(link)}</guid>
        <description>${escapar(post.summary || "")}</description>
        <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      </item>`;
  }).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Andarilho e suas Sombras</title>
    <link>${BASE}</link>
    <description>Novos textos, poemas e reflexões.</description>
    <language>pt-br</language>
    ${itens}
  </channel>
</rss>`;

  console.log(xml);
}

gerarFeed();
