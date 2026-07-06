import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3는 네이티브 바인딩이라 서버 번들에 포함시키지 않고 외부 모듈로 둔다.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
