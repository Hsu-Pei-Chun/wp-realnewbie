import type { Metadata } from "next";
import { getAllTopics } from "@/lib/topics";
import { TopicCard } from "@/components/topics/topic-card";

export const metadata: Metadata = {
  title: "專題",
  description:
    "一次拆一個主題，拆到它變成理所當然——每篇專題還原一個東西的來龍去脈與取捨，並附上可以動手操作的互動內容。",
  alternates: {
    canonical: "/topics",
  },
};

export default async function Page() {
  const topics = await getAllTopics();

  return (
    <>
      <div className="topic-serif mb-12 border-b border-border pb-10">
        <h1 className="text-[2.125rem] font-semibold leading-[1.35] tracking-[0.01em] md:text-[2.5rem]">
          專題
        </h1>
        <p className="mt-5 text-[1.125rem] leading-[1.9] tracking-[0.02em] text-muted-foreground">
          一次拆一個主題，拆到它變成理所當然。
        </p>
      </div>
      {topics.length === 0 ? (
        <p className="text-muted-foreground">目前還沒有專題。</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {topics.map((topic) => (
            <TopicCard key={topic.slug} topic={topic} />
          ))}
        </div>
      )}
    </>
  );
}
