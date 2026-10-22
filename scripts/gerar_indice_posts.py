
import json
from pathlib import Path

PASTA = Path("content/posts")
INDICE = Path("content/posts-index.json")

PASTA.mkdir(parents=True, exist_ok=True)

arquivos = sorted(
    arquivo.name
    for arquivo in PASTA.glob("*.json")
    if arquivo.is_file()
)

INDICE.parent.mkdir(parents=True, exist_ok=True)
INDICE.write_text(
    json.dumps(arquivos, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8"
)

print(f"Índice atualizado: {len(arquivos)} publicações individuais.")
