import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import type { Application, ApplicationInsert, ApplicationUpdate } from '@/types'

export const APPLICATIONS_KEY = ['applications'] as const

export function useApplications() {
  return useQuery({
    queryKey: APPLICATIONS_KEY,
    queryFn: () => api.getApplications(),
  })
}

export function useApplication(id: string | undefined) {
  return useQuery({
    queryKey: ['application', id],
    queryFn: () => api.getApplication(id!),
    enabled: !!id,
  })
}

export function useCreateApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ApplicationInsert) => api.createApplication(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPLICATIONS_KEY })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create application')
    },
  })
}

export function useUpdateApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApplicationUpdate }) =>
      api.updateApplication(id, data),
    onMutate: async ({ id, data }) => {
      // Optimistic update for status changes (Kanban drag)
      await queryClient.cancelQueries({ queryKey: APPLICATIONS_KEY })
      const previous = queryClient.getQueryData<Application[]>(APPLICATIONS_KEY)
      if (previous) {
        queryClient.setQueryData<Application[]>(
          APPLICATIONS_KEY,
          previous.map(app => (app.id === id ? { ...app, ...data } : app))
        )
      }
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(APPLICATIONS_KEY, context.previous)
      }
      toast.error('Failed to update application')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: APPLICATIONS_KEY })
    },
  })
}

export function useDeleteApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteApplication(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: APPLICATIONS_KEY })
      const previous = queryClient.getQueryData<Application[]>(APPLICATIONS_KEY)
      if (previous) {
        queryClient.setQueryData<Application[]>(
          APPLICATIONS_KEY,
          previous.filter(app => app.id !== id)
        )
      }
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(APPLICATIONS_KEY, context.previous)
      }
      toast.error('Failed to delete application')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: APPLICATIONS_KEY })
    },
  })
}
