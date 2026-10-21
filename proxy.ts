import { NextResponse, type NextRequest } from "next/server";

// เข้า "/" เฉย ๆ → ส่งไป /th หรือ /en ตามภาษาที่เบราว์เซอร์ตั้งไว้ (ไม่รู้จักภาษาไหนให้เป็นไทย)
export function proxy(request: NextRequest) {
  const accept = request.headers.get("accept-language") ?? "";
  const prefersEnglish = /^\s*en\b/i.test(accept);
  return NextResponse.redirect(new URL(prefersEnglish ? "/en" : "/th", request.url));
}

export const config = {
  matcher: "/",
};
