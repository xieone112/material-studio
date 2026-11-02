import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Material Studio 素材制作',
  description: '素材制作网站：浏览模板、上传图片、异步制作与历史记录',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
