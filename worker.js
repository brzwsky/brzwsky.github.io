// Cloudflare Worker: правила бывшего .htaccess + редирект на URL со слэшем
// + внедрение страны посетителя в HTML (бывший topjeu-geo-worker).

async function getAsset(env, request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname.endsWith("/") ? pathname + "index.html" : pathname;
  url.search = "";
  const res = await env.ASSETS.fetch(new Request(url, request));
  return res.status === 404 ? null : res;
}

async function handle(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const isRead = request.method === "GET" || request.method === "HEAD";

  // 1) /reviews/имя (один сегмент) -> 301 на /имя/
  const direct = path.match(/^\/reviews\/([^/]+)\/?$/);
  if (direct && isRead) {
    return Response.redirect(`${url.origin}/${direct[1]}/`, 301);
  }

  // Реальный файл (или index.html папки при пути со слэшем)
  let res = await getAsset(env, request, path);
  if (res) return res;

  // /имя без слэша (папка или обзор) -> 301 на /имя/ (query сохраняется)
  if (!path.endsWith("/") && isRead) {
    const name = path.match(/^\/([a-zA-Z0-9-]+)$/);
    const isDir = await getAsset(env, request, path + "/");
    const isReview = !isDir && name && (await getAsset(env, request, `/reviews/${name[1]}/`));
    if (isDir || isReview) {
      url.pathname = path + "/";
      return Response.redirect(url.toString(), 301);
    }
  }

  // 2) и 3) /имя/[путь] -> /reviews/имя/[путь]
  const m = path.match(/^\/([a-zA-Z0-9-]+)(?:\/(.*))?$/);
  if (m) {
    res = await getAsset(env, request, `/reviews/${m[1]}/${m[2] ?? ""}`);
    if (res) return res;
  }

  return new Response("Not found", { status: 404 });
}

// Гео: только для HTML. Путь берём из исходного запроса (не из внутреннего rewrite).
function addGeo(request, response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  const country = request.cf?.country || "XX";
  const path = new URL(request.url).pathname;
  let metaFound = false;

  const rewritten = new HTMLRewriter()
    .on("meta[name='visitor-country']", {
      element(el) {
        metaFound = true;
        el.setAttribute("content", country);
      },
    })
    .on("html", {
      element(el) {
        el.setAttribute("data-geo-country", country);
        el.setAttribute("data-current-path", path);
      },
    })
    // проверяем в конце <head>, когда уже известно, была ли meta
    .on("head", {
      element(head) {
        head.onEndTag((end) => {
          if (!metaFound) {
            end.before(`<meta name="visitor-country" content="${country}">`, { html: true });
          }
        });
      },
    })
    .transform(response);

  const headers = new Headers(rewritten.headers);
  headers.set("x-worker-country", country);
  // HTML зависит от страны посетителя: не отдаём его из общего кеша и не даём 304 по старому etag
  headers.set("cache-control", "private, no-cache");
  headers.delete("etag");

  return new Response(rewritten.body, {
    status: rewritten.status,
    statusText: rewritten.statusText,
    headers,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // apex -> www (путь и query сохраняются)
    if (url.hostname === "topjeu777.com") {
      url.hostname = "www.topjeu777.com";
      const code = request.method === "GET" || request.method === "HEAD" ? 301 : 308;
      return Response.redirect(url.toString(), code);
    }

    const response = addGeo(request, await handle(request, env));

    // тестовый адрес не индексируем
    if (url.hostname.endsWith(".workers.dev")) {
      const r = new Response(response.body, response);
      r.headers.set("x-robots-tag", "noindex, nofollow");
      return r;
    }
    return response;
  },
};
