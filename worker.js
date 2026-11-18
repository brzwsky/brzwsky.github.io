async function getAsset(env, request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname.endsWith("/") ? pathname + "index.html" : pathname;
  url.search = "";
  const res = await env.ASSETS.fetch(new Request(url, request));
  return res.status === 404 ? null : res;
}

export default {
  async fetch(request, env) {
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
  },
};
