import type { Comment } from "@/lib/wordpress.d";

interface CommentCardProps {
  comment: Comment;
}

export function CommentCard({ comment }: CommentCardProps) {
  const date = new Date(comment.date).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const avatarUrl =
    comment.author_avatar_urls?.["48"] ||
    comment.author_avatar_urls?.["24"] ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author_name)}&background=random`;

  return (
    <div className="flex gap-4 py-4">
      {/* Avatar */}
      <div className="shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt={comment.author_name}
          className="w-10 h-10 rounded-full"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {comment.author_url ? (
            <a
              href={comment.author_url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="font-medium hover:underline"
            >
              {comment.author_name}
            </a>
          ) : (
            <span className="font-medium">{comment.author_name}</span>
          )}
          <span className="text-sm text-muted-foreground">{date}</span>
        </div>

        <div
          className="prose prose-sm max-w-none text-foreground"
          dangerouslySetInnerHTML={{ __html: comment.content.rendered }}
        />
      </div>
    </div>
  );
}
