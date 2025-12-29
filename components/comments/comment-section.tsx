import { getCommentsByPostId } from "@/lib/wordpress";
import { CommentList } from "./comment-list";
import { CommentForm } from "./comment-form";

interface CommentSectionProps {
  postId: number;
  commentStatus: "open" | "closed";
}

export async function CommentSection({
  postId,
  commentStatus,
}: CommentSectionProps) {
  const { data: comments, headers } = await getCommentsByPostId(postId);

  return (
    <section className="mt-16 pt-8 border-t">
      <CommentList comments={comments} total={headers.total} />

      {commentStatus === "open" ? (
        <CommentForm postId={postId} />
      ) : (
        <p className="mt-8 text-muted-foreground text-center py-4 border-t">
          此文章已關閉留言功能
        </p>
      )}
    </section>
  );
}
