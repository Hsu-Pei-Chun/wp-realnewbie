import type { Comment } from "@/lib/wordpress.d";
import { CommentCard } from "./comment-card";

interface CommentListProps {
  comments: Comment[];
  total: number;
}

interface CommentWithReplies extends Comment {
  replies: CommentWithReplies[];
}

// 將平面留言列表轉換為樹狀結構
function buildCommentTree(comments: Comment[]): CommentWithReplies[] {
  const commentMap = new Map<number, CommentWithReplies>();
  const roots: CommentWithReplies[] = [];

  // 先建立所有留言的 map
  comments.forEach((comment) => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  // 建立樹狀結構
  comments.forEach((comment) => {
    const node = commentMap.get(comment.id)!;
    if (comment.parent === 0) {
      // 頂層留言
      roots.push(node);
    } else {
      // 回覆留言
      const parent = commentMap.get(comment.parent);
      if (parent) {
        parent.replies.push(node);
      } else {
        // 如果找不到父留言，當作頂層留言
        roots.push(node);
      }
    }
  });

  return roots;
}

// 遞迴渲染留言和回覆
function CommentThread({
  comment,
  depth = 0,
}: {
  comment: CommentWithReplies;
  depth?: number;
}) {
  const maxDepth = 3; // 最大縮排層級
  const actualDepth = Math.min(depth, maxDepth);

  return (
    <div>
      <div style={{ marginLeft: `${actualDepth * 2}rem` }}>
        <CommentCard comment={comment} />
      </div>
      {comment.replies.length > 0 && (
        <div>
          {comment.replies.map((reply) => (
            <CommentThread key={reply.id} comment={reply} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentList({ comments, total }: CommentListProps) {
  if (comments.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        目前還沒有留言，成為第一個留言的人吧！
      </div>
    );
  }

  const commentTree = buildCommentTree(comments);

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">留言 ({total})</h3>
      <div className="divide-y">
        {commentTree.map((comment) => (
          <CommentThread key={comment.id} comment={comment} />
        ))}
      </div>
    </div>
  );
}
