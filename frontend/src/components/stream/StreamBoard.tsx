"use client";

import { useState } from "react";
import { LoaderCircle, Megaphone, Send, Trash2 } from "lucide-react";
import { CARD } from "@/components/dashboard/tone";
import { Avatar } from "@/components/ui/Avatar";
import { FormAlert } from "@/components/ui/form";
import { BTN_PRIMARY, INPUT } from "@/components/ui/styles";
import { api, ApiError } from "@/lib/api";
import type { CommentView, PostView } from "@/lib/classwork";
import { formatRelative } from "@/lib/dashboard/format";
import { ROLE_LABELS } from "@/lib/session";

function Composer({ courseId, onPosted }: { courseId: string; onPosted: (post: PostView) => void }) {
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (!content.trim()) return;
    setBusy(true);
    setError(null);
    try {
      onPosted(await api<PostView>(`/courses/${courseId}/posts`, { method: "POST", body: { content } }));
      setContent("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo publicar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={publish} className={`${CARD} space-y-3 p-4 sm:p-5`}>
      <label htmlFor="new-post" className="text-sm font-semibold text-uach-ink">
        Publicar un aviso para la clase
      </label>
      {error && <FormAlert message={error} />}
      <textarea
        id="new-post"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={3}
        maxLength={5000}
        placeholder="Ej. Mañana la clase será en el laboratorio 3."
        className={`${INPUT} resize-y`}
      />
      <div className="flex justify-end">
        <button type="submit" disabled={busy || !content.trim()} className={BTN_PRIMARY}>
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Megaphone className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
          Publicar
        </button>
      </div>
    </form>
  );
}

function PostCard({
  post,
  now,
  userId,
  canModerate,
  canComment,
  onChange,
  onRemove,
}: {
  post: PostView;
  now: Date;
  userId: string;
  canModerate: boolean;
  canComment: boolean;
  onChange: (post: PostView) => void;
  onRemove: () => void;
}) {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendComment(event: React.FormEvent) {
    event.preventDefault();
    if (!comment.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const created = await api<CommentView>(`/posts/${post.id}/comments`, { method: "POST", body: { content: comment } });
      onChange({ ...post, comments: [...post.comments, created] });
      setComment("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "No se pudo comentar.");
    } finally {
      setBusy(false);
    }
  }

  async function removeComment(id: string) {
    if (!window.confirm("¿Borrar este comentario?")) return;
    try {
      await api(`/comments/${id}`, { method: "DELETE" });
      onChange({ ...post, comments: post.comments.filter((item) => item.id !== id) });
    } catch (caught) {
      window.alert(caught instanceof ApiError ? caught.message : "No se pudo borrar.");
    }
  }

  async function removePost() {
    if (!window.confirm("¿Borrar este aviso y sus comentarios?")) return;
    try {
      await api(`/posts/${post.id}`, { method: "DELETE" });
      onRemove();
    } catch (caught) {
      window.alert(caught instanceof ApiError ? caught.message : "No se pudo borrar.");
    }
  }

  return (
    <article className={`${CARD} p-4 sm:p-5`}>
      <header className="flex items-center gap-3">
        <Avatar name={post.author.fullName} tone="petrol" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-uach-ink">{post.author.fullName}</p>
          <p className="text-xs text-uach-ink/75">
            {ROLE_LABELS[post.author.role]} · {formatRelative(post.createdAt, now)}
          </p>
        </div>
        {(post.author.id === userId || canModerate) && (
          <button
            type="button"
            onClick={removePost}
            aria-label="Borrar aviso"
            className="press grid h-10 w-10 place-items-center rounded-xl text-uach-ink/50 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </button>
        )}
      </header>
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-uach-ink">{post.content}</p>

      <div className="mt-4 border-t border-uach-ink/[0.06] pt-3">
        {post.comments.length > 0 && (
          <ul className="mb-3 space-y-3">
            {post.comments.map((item) => (
              <li key={item.id} className="group flex gap-2.5">
                <Avatar name={item.author.fullName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs">
                    <span className="font-semibold text-uach-ink">{item.author.fullName}</span>{" "}
                    <span className="text-uach-ink/75">· {formatRelative(item.createdAt, now)}</span>
                  </p>
                  <p className="whitespace-pre-line text-sm text-uach-ink">{item.content}</p>
                </div>
                {(item.author.id === userId || canModerate) && (
                  <button
                    type="button"
                    onClick={() => removeComment(item.id)}
                    aria-label="Borrar comentario"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-uach-ink/40 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {error && <div className="mb-2"><FormAlert message={error} /></div>}
        {canComment && (
        <form onSubmit={sendComment} className="flex gap-2">
          <label htmlFor={`c-${post.id}`} className="sr-only">Escribe un comentario</label>
          <input
            id={`c-${post.id}`}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={2000}
            placeholder="Escribe un comentario…"
            className={`${INPUT} h-11`}
          />
          <button
            type="submit"
            disabled={busy || !comment.trim()}
            aria-label="Enviar comentario"
            className="press grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-uach-teal text-white transition-colors hover:bg-uach-tealDark disabled:opacity-50"
          >
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
          </button>
        </form>
        )}
      </div>
    </article>
  );
}

export function StreamBoard({
  courseId,
  userId,
  canPost,
  canComment,
  canModerate,
  initialPosts,
  nowIso,
}: {
  courseId: string;
  userId: string;
  canPost: boolean;
  canComment: boolean;
  canModerate: boolean;
  initialPosts: PostView[];
  nowIso: string;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const now = new Date(nowIso);

  return (
    <div className="space-y-4">
      {canPost && <Composer courseId={courseId} onPosted={(post) => setPosts((list) => [post, ...list])} />}
      {posts.length === 0 ? (
        <div className={`${CARD} flex flex-col items-center px-6 py-12 text-center`}>
          <span className="grid h-12 w-12 place-items-center rounded-full bg-uach-subtle text-uach-teal">
            <Megaphone className="h-6 w-6" strokeWidth={1.5} aria-hidden />
          </span>
          <h2 className="mt-4 text-base font-semibold text-uach-ink">El tablón está tranquilo</h2>
          <p className="mt-1 max-w-sm text-sm text-uach-ink/75">
            {canPost
              ? "Publica el primer aviso para tu grupo."
              : canModerate
                ? "El docente todavía no publica avisos."
                : "Aquí aparecerán los avisos de tu docente."}
          </p>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            now={now}
            userId={userId}
            canModerate={canModerate}
            canComment={canComment}
            onChange={(updated) => setPosts((list) => list.map((item) => (item.id === updated.id ? updated : item)))}
            onRemove={() => setPosts((list) => list.filter((item) => item.id !== post.id))}
          />
        ))
      )}
    </div>
  );
}
