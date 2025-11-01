import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

type Props = {
  selectedIds: string[];
  onClear: () => void;
  onAfterDelete?: (deletedIds: string[]) => void;
};

export function BulkDeleteToolbar({ selectedIds, onClear, onAfterDelete }: Props) {
  const [open, setOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const { toast } = useToast();

  const onConfirm = async () => {
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('You must be logged in to delete research');
      }

      const res = await fetch(
        `https://vhjffdzroebdkbmvcpgv.supabase.co/functions/v1/bulk-delete-research`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ ids: selectedIds }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Delete failed' }));
        throw new Error(errorData.error || 'Delete failed');
      }

      const json = await res.json();
      onAfterDelete?.(selectedIds);
      onClear();
      toast({
        title: 'Deleted',
        description: `${json.deleted_count} item(s) removed successfully.`,
      });
    } catch (e: any) {
      console.error('Delete error:', e);
      toast({
        title: 'Error',
        description: e?.message ?? 'Delete failed. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setOpen(false);
    }
  };

  if (selectedIds.length === 0) return null;

  return (
    <>
      <div className="sticky bottom-4 z-30 mx-auto flex w-fit items-center gap-3 rounded-2xl border bg-white/90 px-6 py-3 shadow-lg backdrop-blur-sm">
        <span className="text-sm font-medium">
          {selectedIds.length} {selectedIds.length === 1 ? 'item' : 'items'} selected
        </span>
        <Button
          variant="destructive"
          onClick={() => setOpen(true)}
          disabled={deleting}
        >
          Delete selected
        </Button>
      </div>

      {/* Confirm modal with dead-zone overlay */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-2">
              Delete {selectedIds.length} {selectedIds.length === 1 ? 'item' : 'items'}?
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              This action is permanent and cannot be undone. All selected research sessions will be deleted.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={onConfirm}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Confirm delete'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
