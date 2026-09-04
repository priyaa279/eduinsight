const LOCAL_WRITABLE_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function normalizedRequestHostname(request) {
  return new URL(request.url).hostname
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
}

export function isPublicDemoReadOnly(request) {
  return !LOCAL_WRITABLE_HOSTS.has(normalizedRequestHostname(request));
}

export function publicDemoReadOnlyResponse() {
  return Response.json(
    {
      error:
        "This public portfolio is read-only. Review and approval changes are available only in the local development workspace.",
      mode: "public-demo-read-only",
    },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}
