import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, type Cat, type Category, type User } from './api';

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return await api.get<User>('/me');
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: Infinity,
  });
}

export const useCategories = () =>
  useQuery({ queryKey: ['categories'], queryFn: () => api.get<Category[]>('/categories') });

export const useCats = () => useQuery({ queryKey: ['cats'], queryFn: () => api.get<Cat[]>('/cats') });

// Data is small, so every successful change simply refreshes everything.
export function useSave<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries(),
  });
}
