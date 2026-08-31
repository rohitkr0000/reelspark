import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Video } from '../types/database';

const PAGE_SIZE = 10;

export function useFeed() {
  return useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: async ({ pageParam }: { pageParam: { createdAt: string; id: string } | null }) => {
      const { data, error } = await supabase.rpc('get_feed_page', {
        cursor_created_at: pageParam?.createdAt ?? null,
        cursor_id: pageParam?.id ?? null,
        page_size: PAGE_SIZE,
      });
      if (error) throw error;
      return data as Video[];
    },
    initialPageParam: null as { createdAt: string; id: string } | null,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      const last = lastPage[lastPage.length - 1];
      return { createdAt: last.created_at, id: last.id };
    },
  });
}

export async function incrementViewCount(videoId: string) {
  await supabase.rpc('increment_view_count', { p_video_id: videoId });
}
