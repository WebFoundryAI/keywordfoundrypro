import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, ThumbsUp, Lightbulb, Calendar, Rocket, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import { cn } from '@/lib/utils';

interface RoadmapItem {
  id: string;
  title: string;
  body: string;
  state: 'idea' | 'planned' | 'in-progress' | 'done';
  created_at: string;
  vote_count: number;
  user_voted?: boolean;
}

const stateConfig = {
  idea: {
    label: 'Ideas',
    icon: Lightbulb,
    color: 'bg-purple-500',
    description: 'Community suggestions under review',
  },
  planned: {
    label: 'Planned',
    icon: Calendar,
    color: 'bg-blue-500',
    description: 'Accepted and scheduled for development',
  },
  'in-progress': {
    label: 'In Progress',
    icon: Rocket,
    color: 'bg-orange-500',
    description: 'Currently being worked on',
  },
  done: {
    label: 'Completed',
    icon: CheckCircle2,
    color: 'bg-green-500',
    description: 'Released and available',
  },
};

export default function Roadmap() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedState, setSelectedState] = useState<string | null>(null);

  // Fetch roadmap items
  const { data: items, isLoading } = useQuery({
    queryKey: ['roadmap'],
    queryFn: async () => {
      const response = await fetch('/api/roadmap');
      if (!response.ok) throw new Error('Failed to fetch roadmap');
      const data = await response.json();
      return data.items as RoadmapItem[];
    },
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      if (!user) {
        throw new Error('Please sign in to vote');
      }

      const response = await fetch(`/api/roadmap/${itemId}/vote`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.id}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to vote');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to vote',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Remove vote mutation
  const removeVoteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      if (!user) {
        throw new Error('Please sign in');
      }

      const response = await fetch(`/api/roadmap/${itemId}/vote`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${user.id}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove vote');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to remove vote',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleVote = (itemId: string, hasVoted: boolean) => {
    if (hasVoted) {
      removeVoteMutation.mutate(itemId);
    } else {
      voteMutation.mutate(itemId);
    }
  };

  const groupedItems = items?.reduce((acc, item) => {
    if (!acc[item.state]) acc[item.state] = [];
    acc[item.state].push(item);
    return acc;
  }, {} as Record<string, RoadmapItem[]>);

  const filteredItems = selectedState
    ? groupedItems?.[selectedState] || []
    : items || [];

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Product Roadmap</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          See what we're working on and vote for features you'd like to see
        </p>
      </div>

      {/* State Filter */}
      <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
        <Button
          variant={selectedState === null ? 'default' : 'outline'}
          onClick={() => setSelectedState(null)}
        >
          All
        </Button>
        {Object.entries(stateConfig).map(([state, config]) => {
          const Icon = config.icon;
          const count = groupedItems?.[state]?.length || 0;

          return (
            <Button
              key={state}
              variant={selectedState === state ? 'default' : 'outline'}
              onClick={() => setSelectedState(state)}
              className="whitespace-nowrap"
            >
              <Icon className="h-4 w-4 mr-2" />
              {config.label}
              <Badge variant="secondary" className="ml-2">
                {count}
              </Badge>
            </Button>
          );
        })}
      </div>

      {/* Items List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const StateIcon = stateConfig[item.state].icon;

            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          className={cn(
                            'text-white',
                            stateConfig[item.state].color
                          )}
                        >
                          <StateIcon className="h-3 w-3 mr-1" />
                          {stateConfig[item.state].label}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl">{item.title}</CardTitle>
                      <CardDescription className="mt-2">
                        {item.body}
                      </CardDescription>
                    </div>

                    {/* Vote Button */}
                    <div className="flex flex-col items-center gap-1">
                      <Button
                        variant={item.user_voted ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleVote(item.id, item.user_voted || false)}
                        disabled={
                          !user ||
                          voteMutation.isPending ||
                          removeVoteMutation.isPending
                        }
                        className="min-w-[80px]"
                      >
                        <ThumbsUp
                          className={cn(
                            'h-4 w-4 mr-1',
                            item.user_voted && 'fill-current'
                          )}
                        />
                        {item.vote_count}
                      </Button>
                      {!user && (
                        <p className="text-xs text-muted-foreground">
                          Sign in to vote
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No items in this category yet
            </p>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="mt-8 border-muted">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Have a feature request?{' '}
            <a href="/contact" className="text-primary underline">
              Let us know
            </a>{' '}
            and we'll add it to the roadmap for community voting.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
