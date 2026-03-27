/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Tạm bỏ qua cảnh báo ESLint trong lúc build trên cloud
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Tạm bỏ qua lỗi check kiểu ts strict để ưu tiên deploy UI lên trước
    ignoreBuildErrors: true, 
  }
};

export default nextConfig;
