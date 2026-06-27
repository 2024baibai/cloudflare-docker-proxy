addEventListener("fetch", (event) => {
  event.passThroughOnException();
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);

  if (url.pathname == "/") {
    return Response.redirect(url.protocol + "//" + url.host + "/v2/", 301);
  }

  if (url.pathname == "/v2/") {
    return jsonResponse({});
  }

  if (request.method != "GET" && request.method != "HEAD") {
    return jsonResponse({ message: "METHOD_NOT_ALLOWED" }, 405);
  }

  if (!isRegistryObjectPath(url.pathname)) {
    return jsonResponse({ message: "NOT_FOUND" }, 404);
  }

  const objectKey = url.pathname.replace(/^\//, "");
  const object = await REGISTRY_BUCKET.get(objectKey);
  if (object === null) {
    return jsonResponse({ message: "NOT_FOUND" }, 404);
  }

  const headers = await buildObjectHeaders(object, objectKey);
  if (request.method == "HEAD") {
    return new Response(null, { headers });
  }

  if (isManifestKey(objectKey)) {
    const body = await object.arrayBuffer();
    headers.set("docker-content-digest", await digestBody(body));
    return new Response(body, { headers });
  }

  return new Response(object.body, { headers });
}

function isRegistryObjectPath(pathname) {
  return /^\/v2\/.+\/(manifests|blobs)\/.+$/.test(pathname);
}

async function buildObjectHeaders(object, objectKey) {
  const headers = new Headers();

  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("content-length", object.size.toString());

  if (isManifestKey(objectKey)) {
    headers.set("content-type", "application/vnd.oci.image.manifest.v1+json");
  }

  const digest = getDigestFromKey(objectKey);
  if (digest) {
    headers.set("docker-content-digest", digest);
  }

  return headers;
}

function isManifestKey(objectKey) {
  return objectKey.includes("/manifests/");
}

function getDigestFromKey(objectKey) {
  const digestMatch = objectKey.match(/\/(sha256:[a-f0-9]{64})$/);
  if (digestMatch) {
    return digestMatch[1];
  }
  return "";
}

async function digestBody(body) {
  const hash = await crypto.subtle.digest("SHA-256", body);
  const hex = [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return "sha256:" + hex;
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: {
      "content-type": "application/json",
    },
  });
}
