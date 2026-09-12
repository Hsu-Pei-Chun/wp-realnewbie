import type { Metadata } from "next";
import { getAllTopics } from "@/lib/topics";
import { TopicCard } from "@/components/topics/topic-card";

export const metadata: Metadata = {
  title: "專題",
  description: "以互動內容深入單一主題的長文專題。",
};

export default async function Page() {
  const topics = await getAllTopics();

  return (
    <>
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight">專題</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          以互動內容深入單一主題的長文。
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
