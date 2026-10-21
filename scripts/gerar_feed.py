
import json
import os
from datetime import datetime, timezone
from email.utils import format_datetime
from xml.etree.ElementTree import Element, SubElement, ElementTree, indent

BASE_URL = "https://andarilhoesuassombras.github.io/Andarilho/"
POSTS_FILE = "content/posts.json"
FEED_FILE = "feed.xml"

with open(POSTS_FILE, "r", encoding="utf-8") as arquivo:
    posts = json.load(arquivo)

rss = Element("rss", version="2.0")
channel = SubElement(rss, "channel")

SubElement(channel, "title").text = "Andarilho e suas Sombras"
SubElement(channel, "link").text = BASE_URL
SubElement(channel, "description").text = (
    "Novos textos, poemas e reflexões do Caderno de Ideias."
)
SubElement(channel, "language").text = "pt-br"

publicados = [
    post for post in posts
    if post and post.get("published") is True
]

publicados.sort(
    key=lambda post: post.get("date", ""),
    reverse=True
)

for post in publicados[:30]:
    titulo = post.get("title", "Nova publicação")
    data = post.get("date", "")
    resumo = post.get("summary", "")

    link = (
        BASE_URL
        + "post.html?title="
        + __import__("urllib.parse", fromlist=["quote"]).quote(titulo)
    )

    item = SubElement(channel, "item")
    SubElement(item, "title").text = titulo
    SubElement(item, "link").text = link
    SubElement(item, "guid", isPermaLink="false").text = link
    SubElement(item, "description").text = resumo

    try:
        data_obj = datetime.strptime(data[:10], "%Y-%m-%d")
        data_obj = data_obj.replace(tzinfo=timezone.utc)
        SubElement(item, "pubDate").text = format_datetime(data_obj)
    except (ValueError, TypeError):
        pass

indent(rss, space="  ")

ElementTree(rss).write(
    FEED_FILE,
    encoding="utf-8",
    xml_declaration=True
)

print(f"Feed RSS gerado com {min(len(publicados), 30)} publicações.")
