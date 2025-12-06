// =============================================================================
// COMMENTS TAB — Document comments for right sidebar
// =============================================================================
// Displays comments on the document with full CRUD functionality
// - Add comments to content selections
// - Reply to comments
// - Edit and delete own comments
// - Thread conversations
// =============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import { MessageCircle, Send, MoreVertical, Edit2, Trash2, Reply, User } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface Comment {
  id: string;
  noteId: string;
  author: string;
  authorId: string;
  avatar?: string;
  content: string;
  timestamp: string;
  selection?: {
    start: number;
    end: number;
    text: string;
  };
  parentId?: string;
  replies: Comment[];
}

export interface CommentsTabProps {
  noteId?: string;
  currentUserId?: string;
  currentUserName?: string;
  theme: 'light' | 'dark';
  colors: Record<string, string>;
  onAddComment?: (content: string, selection?: any) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const CommentsTab: React.FC<CommentsTabProps> = ({
  noteId,
  currentUserId = 'user-1',
  currentUserName = 'You',
  theme,
  colors,
  onAddComment,
}) => {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showMenuFor, setShowMenuFor] = useState<string | null>(null);

  // Mock comments - in real implementation, would fetch from noteStore
  // Comments would be stored as part of note metadata or in a separate comments store
  const [comments, setComments] = useState<Comment[]>(() => {
    if (!noteId) return [];

    // TODO: Load from noteStore or separate comments service
    // For now, return mock data
    return [
      {
        id: 'comment-1',
        noteId,
        author: 'Alice',
        authorId: 'user-2',
        content: 'This is a great point! Could you elaborate more on this section?',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        selection: {
          start: 0,
          end: 50,
          text: 'Selected text example',
        },
        replies: [
          {
            id: 'comment-2',
            noteId,
            author: currentUserName,
            authorId: currentUserId,
            content: 'Sure! I can add more details about this.',
            timestamp: new Date(Date.now() - 1800000).toISOString(),
            parentId: 'comment-1',
            replies: [],
          },
        ],
      },
    ];
  });

  // Add new comment
  const handleAddComment = useCallback(() => {
    if (!newComment.trim() || !noteId) return;

    const comment: Comment = {
      id: `comment-${Date.now()}`,
      noteId,
      author: currentUserName,
      authorId: currentUserId,
      content: newComment.trim(),
      timestamp: new Date().toISOString(),
      replies: [],
    };

    setComments(prev => [...prev, comment]);
    setNewComment('');
    onAddComment?.(comment.content);

    // TODO: Persist to noteStore or comments service
  }, [newComment, noteId, currentUserId, currentUserName, onAddComment]);

  // Add reply
  const handleAddReply = useCallback((parentId: string) => {
    if (!replyText.trim() || !noteId) return;

    const reply: Comment = {
      id: `comment-${Date.now()}`,
      noteId,
      author: currentUserName,
      authorId: currentUserId,
      content: replyText.trim(),
      timestamp: new Date().toISOString(),
      parentId,
      replies: [],
    };

    setComments(prev =>
      prev.map(c =>
        c.id === parentId
          ? { ...c, replies: [...c.replies, reply] }
          : c
      )
    );

    setReplyText('');
    setReplyingTo(null);

    // TODO: Persist to noteStore
  }, [replyText, noteId, currentUserId, currentUserName]);

  // Delete comment
  const handleDeleteComment = useCallback((commentId: string) => {
    setComments(prev =>
      prev.filter(c => c.id !== commentId).map(c => ({
        ...c,
        replies: c.replies.filter(r => r.id !== commentId),
      }))
    );

    // TODO: Persist to noteStore
  }, []);

  // Edit comment
  const handleEditComment = useCallback((commentId: string) => {
    if (!editText.trim()) return;

    setComments(prev =>
      prev.map(c => {
        if (c.id === commentId) {
          return { ...c, content: editText.trim() };
        }
        return {
          ...c,
          replies: c.replies.map(r =>
            r.id === commentId ? { ...r, content: editText.trim() } : r
          ),
        };
      })
    );

    setEditingCommentId(null);
    setEditText('');

    // TODO: Persist to noteStore
  }, [editText]);

  // Start editing
  const startEdit = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditText(comment.content);
    setShowMenuFor(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b" style={{ borderColor: colors.border }}>
        <h3 className="text-sm font-medium" style={{ color: colors.text }}>
          Comments
        </h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {comments.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <MessageCircle size={32} className="mb-3 opacity-20" style={{ color: colors.textMuted }} />
            <p className="text-xs mb-1" style={{ color: colors.textMuted }}>
              No comments yet
            </p>
            <p className="text-xs" style={{ color: colors.textMuted }}>
              Add your first comment below
            </p>
          </div>
        ) : (
          // Comments List
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="space-y-2">
                {/* Main Comment */}
                <div
                  className="p-3 rounded-lg"
                  style={{ background: colors.hover }}
                >
                  {/* Comment Header */}
                  <div className="flex items-start gap-2 mb-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
                      style={{ background: colors.accent, color: '#fff' }}
                    >
                      {comment.avatar ? (
                        <img src={comment.avatar} alt={comment.author} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <User size={14} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium" style={{ color: colors.text }}>
                        {comment.author}
                      </p>
                      <p className="text-xs" style={{ color: colors.textMuted }}>
                        {new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {/* Action Menu */}
                    {comment.authorId === currentUserId && (
                      <div className="relative">
                        <button
                          onClick={() => setShowMenuFor(showMenuFor === comment.id ? null : comment.id)}
                          className="p-1 rounded hover:bg-white/10"
                          style={{ color: colors.textMuted }}
                        >
                          <MoreVertical size={14} />
                        </button>

                        {showMenuFor === comment.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowMenuFor(null)} />
                            <div
                              className="absolute right-0 top-full mt-1 z-50 py-1 rounded-lg shadow-lg min-w-28"
                              style={{ background: colors.sidebar, border: `1px solid ${colors.border}` }}
                            >
                              <button
                                onClick={() => startEdit(comment)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-white/5"
                                style={{ color: colors.text }}
                              >
                                <Edit2 size={12} />
                                Edit
                              </button>
                              <button
                                onClick={() => { handleDeleteComment(comment.id); setShowMenuFor(null); }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-white/5"
                                style={{ color: '#ef4444' }}
                              >
                                <Trash2 size={12} />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selection Quote */}
                  {comment.selection && (
                    <div className="mb-2 px-2 py-1.5 rounded border-l-2" style={{ background: colors.bg, borderColor: colors.accent }}>
                      <p className="text-xs italic" style={{ color: colors.textMuted }}>
                        "{comment.selection.text}"
                      </p>
                    </div>
                  )}

                  {/* Comment Content */}
                  {editingCommentId === comment.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full px-2 py-1.5 rounded text-xs resize-none outline-none border"
                        style={{
                          background: colors.bg,
                          borderColor: colors.border,
                          color: colors.text,
                          minHeight: '60px',
                        }}
                        autoFocus
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => { setEditingCommentId(null); setEditText(''); }}
                          className="px-2 py-1 rounded text-xs"
                          style={{ background: colors.bg, color: colors.textMuted }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleEditComment(comment.id)}
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{ background: colors.accent, color: '#fff' }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs whitespace-pre-wrap" style={{ color: colors.text }}>
                      {comment.content}
                    </p>
                  )}

                  {/* Reply Button */}
                  {editingCommentId !== comment.id && (
                    <button
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                      className="mt-2 flex items-center gap-1 text-xs hover:underline"
                      style={{ color: colors.accent }}
                    >
                      <Reply size={12} />
                      Reply
                    </button>
                  )}
                </div>

                {/* Replies */}
                {comment.replies.length > 0 && (
                  <div className="ml-6 space-y-2">
                    {comment.replies.map((reply) => (
                      <div
                        key={reply.id}
                        className="p-2 rounded"
                        style={{ background: colors.hover }}
                      >
                        <div className="flex items-start gap-2 mb-1">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                            style={{ background: colors.accent, color: '#fff' }}
                          >
                            <User size={12} />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-medium" style={{ color: colors.text }}>
                              {reply.author}
                            </p>
                            <p className="text-xs" style={{ color: colors.textMuted }}>
                              {new Date(reply.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs whitespace-pre-wrap ml-8" style={{ color: colors.text }}>
                          {reply.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Input */}
                {replyingTo === comment.id && (
                  <div className="ml-6 p-2 rounded" style={{ background: colors.hover }}>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a reply..."
                      className="w-full px-2 py-1.5 rounded text-xs resize-none outline-none border mb-2"
                      style={{
                        background: colors.bg,
                        borderColor: colors.border,
                        color: colors.text,
                        minHeight: '50px',
                      }}
                      autoFocus
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => { setReplyingTo(null); setReplyText(''); }}
                        className="px-2 py-1 rounded text-xs"
                        style={{ background: colors.bg, color: colors.textMuted }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleAddReply(comment.id)}
                        disabled={!replyText.trim()}
                        className="px-2 py-1 rounded text-xs font-medium flex items-center gap-1 disabled:opacity-40"
                        style={{ background: colors.accent, color: '#fff' }}
                      >
                        <Send size={10} />
                        Reply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Comment Input */}
      <div className="px-4 py-3 border-t" style={{ borderColor: colors.border }}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="w-full px-3 py-2 rounded-lg text-xs resize-none outline-none border mb-2"
          style={{
            background: colors.bg,
            borderColor: colors.border,
            color: colors.text,
            minHeight: '60px',
          }}
        />
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: colors.textMuted }}>
            {comments.length} comment{comments.length !== 1 ? 's' : ''}
          </p>
          <button
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            style={{ background: colors.accent, color: '#fff' }}
          >
            <Send size={12} />
            Comment
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentsTab;
