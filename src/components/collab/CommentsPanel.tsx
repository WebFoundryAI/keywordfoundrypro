import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/AuthProvider';

interface Comment {
  id: string;
  project_id: string;
  subject_type: string;
  subject_id: string | null;
  content: string;
  created_by: string;
  created_at: string;
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
}

interface CommentsPanelProps {
  projectId: string;
  subjectType: 'keyword' | 'cluster' | 'project';
  subjectId?: string;
  className?: string;
}

export function CommentsPanel({
  projectId,
  subjectType,
  subjectId,
  className = '',
}: CommentsPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');

  // Fetch comments
  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', projectId, subjectType, subjectId],
    queryFn: async () => {
      let query = supabase
        .from('project_comments')
        .select(`
          *,
          profiles:created_by(display_name, avatar_url, email)
        `)
        .eq('project_id', projectId)
        .eq('subject_type', subjectType)
        .order('created_at', { ascending: true });

      if (subjectId) {
        query = query.eq('subject_id', subjectId);
      } else {
        query = query.is('subject_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as Comment[];
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('project_comments')
        .insert({
          project_id: projectId,
          subject_type: subjectType,
          subject_id: subjectId || null,
          content,
          created_by: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', projectId, subjectType, subjectId] });
      setNewComment('');
      toast({
        title: 'Comment added',
        description: 'Your comment has been posted',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to add comment',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('project_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', projectId, subjectType, subjectId] });
      toast({
        title: 'Comment deleted',
        description: 'The comment has been removed',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete comment',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    if (!newComment.trim()) {
      toast({
        title: 'Comment required',
        description: 'Please enter a comment',
        variant: 'destructive',
      });
      return;
    }

    addCommentMutation.mutate(newComment);
  };

  const handleDelete = (commentId: string) => {
    if (confirm('Delete this comment?')) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h3 className="font-semibold">
            Comments
            {comments && comments.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {comments.length}
              </Badge>
            )}
          </h3>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            Loading comments...
          </div>
        )}

        {!isLoading && (!comments || comments.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No comments yet</p>
            <p className="text-sm">Be the first to comment</p>
          </div>
        )}

        {comments && comments.length > 0 && (
          <div className="space-y-4">
            {comments.map((comment) => {
              const isOwn = user?.id === comment.created_by;
              const displayName =
                comment.profiles?.display_name ||
                comment.profiles?.email?.split('@')[0] ||
                'Unknown';
              const initials = displayName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <div
                  key={comment.id}
                  className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.profiles?.avatar_url || ''} />
                    <AvatarFallback className="text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className={`flex-1 space-y-1 ${isOwn ? 'text-right' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{displayName}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(comment.created_at)}
                      </span>
                    </div>

                    <div
                      className={`inline-block rounded-lg px-3 py-2 text-sm ${
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {comment.content}
                    </div>

                    {isOwn && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs"
                        onClick={() => handleDelete(comment.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t space-y-2">
        <Textarea
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSubmit();
            }
          }}
          rows={3}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Press Cmd+Enter to send
          </span>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={addCommentMutation.isPending || !newComment.trim()}
          >
            <Send className="h-4 w-4 mr-2" />
            {addCommentMutation.isPending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}
