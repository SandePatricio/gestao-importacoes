"""Extração de informação básica de uma página de produto (link colado).

Usa as meta tags Open Graph / HTML (og:title, og:image, og:price…), que a maioria
das lojas expõe — genérico, sem depender da estrutura de cada site. Páginas muito
dependentes de JavaScript ou que bloqueiam bots podem devolver pouca informação.
"""
import html as _html
import ipaddress
import re
import socket
from urllib.parse import urlparse

import httpx

_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)
_MAX_BYTES = 800_000  # lê no máximo ~800 KB de HTML


def _validar_url(url: str) -> None:
    """Aceita apenas http/https e bloqueia endereços internos (anti-SSRF)."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise ValueError("URL inválido. Use um endereço http(s) completo.")
    try:
        infos = socket.getaddrinfo(parsed.hostname, None)
    except socket.gaierror:
        raise ValueError("Não foi possível resolver o endereço do site.")
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            raise ValueError("Endereço não permitido.")


def _meta(html_txt: str, chave: str) -> str | None:
    """Procura o content de uma meta tag por property/name/itemprop (ordem livre)."""
    for attr in ("property", "name", "itemprop"):
        padroes = [
            rf'<meta[^>]+{attr}=["\']{re.escape(chave)}["\'][^>]*content=["\']([^"\']*)["\']',
            rf'<meta[^>]+content=["\']([^"\']*)["\'][^>]*{attr}=["\']{re.escape(chave)}["\']',
        ]
        for p in padroes:
            m = re.search(p, html_txt, re.IGNORECASE)
            if m and m.group(1).strip():
                return _html.unescape(m.group(1).strip())
    return None


def _primeiro(*valores):
    for v in valores:
        if v:
            return v
    return None


def extrair_info_url(url: str) -> dict:
    """Devolve {url, titulo, descricao, imagem, preco, moeda} a partir do link."""
    _validar_url(url)
    try:
        resp = httpx.get(
            url,
            headers={"User-Agent": _UA, "Accept-Language": "pt,en;q=0.8"},
            timeout=10.0,
            follow_redirects=True,
        )
        resp.raise_for_status()
    except httpx.HTTPError:
        raise ValueError("Não foi possível aceder à página do produto.")

    txt = resp.text[:_MAX_BYTES]

    titulo = _primeiro(_meta(txt, "og:title"), _meta(txt, "twitter:title"))
    if not titulo:
        m = re.search(r"<title[^>]*>([^<]+)</title>", txt, re.IGNORECASE)
        titulo = _html.unescape(m.group(1).strip()) if m else None

    descricao = _primeiro(_meta(txt, "og:description"), _meta(txt, "description"))
    imagem = _primeiro(_meta(txt, "og:image"), _meta(txt, "twitter:image"), _meta(txt, "image"))
    preco = _primeiro(
        _meta(txt, "product:price:amount"), _meta(txt, "og:price:amount"), _meta(txt, "price")
    )
    moeda = _primeiro(_meta(txt, "product:price:currency"), _meta(txt, "og:price:currency"))

    return {
        "url": url,
        "titulo": titulo,
        "descricao": descricao,
        "imagem": imagem,
        "preco": preco,
        "moeda": moeda,
    }
