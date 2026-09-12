import { Noto_Serif_TC } from "next/font/google";

import { Container, Section } from "@/components/craft";
import { cn } from "@/lib/utils";

// 專題正文用宋體，與一般文章的黑體形成兩種聲音。CJK 字型由 Google Fonts 以
// unicode-range 切片提供，瀏覽器只下載用到的字；不 preload 避免一次拉太多切片。
const serif = Noto_Serif_TC({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
  variable: "--font-serif-tc",
});

// 專題區的殼。.topic-shell 是專題專屬樣式與色調的 scope（app/globals.css）：
// 它包在 Section 外面，讓紙色背景滿版鋪到邊，nav / footer 仍跟全站主題走。
export default function TopicsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={cn("topic-shell", serif.variable)}>
      <Section>
        <Container>{children}</Container>
      </Section>
    </div>
  );
}
