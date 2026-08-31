// Fixture for TanStack Query rules.
// Missing userId in queryKey should trigger @tanstack/query/exhaustive-deps.
import { useQuery } from "@tanstack/react-query";

export function useUser(userId: string) {
  return useQuery({
    queryKey: ["user"],
    queryFn: () => fetch(`/api/users/${userId}`).then((res) => res.json()),
  });
}
