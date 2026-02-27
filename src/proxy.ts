import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const password = process.env.PRIVATE_DASHBOARD_PASSWORD;
  if (!password) return NextResponse.next();

  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Basic ")) {
    const decoded = atob(auth.slice(6));
    const colonIdx = decoded.indexOf(":");
    const pass = colonIdx >= 0 ? decoded.slice(colonIdx + 1) : decoded;
    if (pass === password) return NextResponse.next();
  }

  return new NextResponse("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Private Portfolio"' },
  });
}

export const config = {
  matcher: ["/private/:path*"],
};
