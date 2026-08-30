/**
 * Shared TanStack Query configuration.
 *
 * Keeping this identical across projects means caching behaviour is one thing
 * to reason about rather than N. See DESIGN.md section 2.
 */

import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Internal tools: data is usually fresh enough for half a minute and
        // refetching on every window focus is noise on a wall-mounted dashboard.
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && !error.isRetryable) return false;
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
