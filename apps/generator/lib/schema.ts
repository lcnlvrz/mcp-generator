import { z } from 'zod'

export const generateMCPServerRequestBody = z.object({
  specURL: z.string().url().min(1, 'Spec URL is required'),
})

export type GenerateMCPServerRequestBody = z.infer<
  typeof generateMCPServerRequestBody
>
