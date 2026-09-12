import { Container, Section } from "@/components/craft";

// 專題區的殼。.topic-shell 是專題專屬樣式的 scope（app/globals.css），
// 之後要給專題區不同的風格，只需在這個 scope 內調整。
export default function TopicsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Section>
      <Container>
        <div className="topic-shell">{children}</div>
      </Container>
    </Section>
  );
}
