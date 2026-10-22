const HTML_HEADERS = {
  "content-type": "text/html; charset=utf-8"
};

export function successFragment(message) {
  return htmlResponse(
    `<div class="form-success" role="status">${escapeHtml(message)}</div>`,
    200
  );
}

export function errorFragment(message, status = 400) {
  return htmlResponse(
    `<div class="form-error" role="alert">${escapeHtml(message)}</div>`,
    status
  );
}

export function methodNotAllowedFragment() {
  return new Response(
    `<div class="form-error" role="alert">Please submit the form from the website.</div>`,
    {
      status: 405,
      headers: {
        ...HTML_HEADERS,
        allow: "POST"
      }
    }
  );
}

// Full page used when the form is submitted without JavaScript (no htmx).
export function errorPage(message, status = 400) {
  const body = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>We could not send your message | Dakota Horizons</title>
  <link rel="stylesheet" href="/assets/css/tokens.css">
  <link rel="stylesheet" href="/assets/css/main.css">
</head>
<body>
  <main class="page-hero page-hero--center">
    <div class="container">
      <h1>We could not send your message</h1>
      <div class="form-error" role="alert">${escapeHtml(message)}</div>
      <p class="lead"><a href="/contact/">Go back to the contact form</a></p>
    </div>
  </main>
</body>
</html>`;
  return htmlResponse(body, status);
}

export function redirectResponse(request, path) {
  return Response.redirect(new URL(path, request.url).toString(), 303);
}

export function isHtmxRequest(request) {
  return request.headers.get("hx-request") === "true";
}

function htmlResponse(body, status) {
  return new Response(body, {
    status,
    headers: HTML_HEADERS
  });
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
