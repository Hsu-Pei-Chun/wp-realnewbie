"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const commentSchema = z.object({
  author_name: z.string().min(1, "請輸入您的名稱").max(100, "名稱過長"),
  content: z
    .string()
    .min(2, "留言內容太短")
    .max(5000, "留言內容過長（最多 5000 字）"),
  website: z.string().optional(), // Honeypot field
});

type CommentFormValues = z.infer<typeof commentSchema>;

interface CommentFormProps {
  postId: number;
  onSuccess?: () => void;
}

export function CommentForm({ postId, onSuccess }: CommentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      author_name: "",
      content: "",
      website: "", // Honeypot field
    },
  });

  async function onSubmit(values: CommentFormValues) {
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post: postId,
          ...values,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSubmitStatus({
          type: "success",
          message: result.message || "留言已送出，審核後將會顯示",
        });
        form.reset();
        onSuccess?.();
      } else {
        setSubmitStatus({
          type: "error",
          message: result.error || "留言提交失敗",
        });
      }
    } catch {
      setSubmitStatus({
        type: "error",
        message: "網路錯誤，請稍後再試",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-12 pt-8 border-t">
      <h3 className="text-xl font-semibold mb-6">發表留言</h3>

      {submitStatus && (
        <div
          className={`p-4 mb-6 rounded-md ${
            submitStatus.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {submitStatus.message}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Honeypot field - hidden from real users */}
          <div className="hidden" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              {...form.register("website")}
            />
          </div>

          <FormField
            control={form.control}
            name="author_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  名稱 <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="您的名稱" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  留言內容 <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="寫下您的留言..."
                    className="min-h-[120px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "送出中..." : "送出留言"}
          </Button>
        </form>
      </Form>

      <p className="text-sm text-muted-foreground mt-4">留言將在審核後顯示。</p>
    </div>
  );
}
