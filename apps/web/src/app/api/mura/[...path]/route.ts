import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const allowed = [
  /^v1\/recordings$/,
  /^v1\/recordings\/rec_[a-f0-9]+$/,
  /^v1\/jobs\/job_[a-f0-9]+$/,
];

function configuration() {
  const baseUrl = process.env.MURA_API_URL?.replace(/\/$/, "");
  const apiKey = process.env.MURA_CORE_API_KEY;
  return baseUrl && apiKey ? { baseUrl, apiKey } : null;
}

async function proxy(request: NextRequest, path: string[]) {
  const route = path.join("/");
  if (!allowed.some((pattern) => pattern.test(route))) {
    return NextResponse.json({ error: "route_not_allowed" }, { status: 404 });
  }
  const config = configuration();
  if (!config) {
    return NextResponse.json(
      { error: "mura_backend_not_configured" },
      { status: 503 },
    );
  }

  const headers = new Headers({ Authorization: `Bearer ${config.apiKey}` });
  let body: FormData | undefined;
  if (request.method === "POST") body = await request.formData();
  try {
    const response = await fetch(`${config.baseUrl}/${route}`, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    const payload = await response.text();
    return new NextResponse(payload, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "mura_backend_unavailable" }, { status: 502 });
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, (await context.params).path);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, (await context.params).path);
}
