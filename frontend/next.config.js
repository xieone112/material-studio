/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // 将后端资源统一代理：/backend/api/** 业务接口、/backend/demo/** 模板示例图、
    // /backend/files/** 上传素材，前端一律走同源 /backend 前缀
    const backend = process.env.BACKEND_ORIGIN || 'http://localhost:8080';
    return [
      {
        source: '/backend/:path*',
        destination: `${backend}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
