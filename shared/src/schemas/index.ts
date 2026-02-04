// Shared Zod schemas for validation
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['user', 'lawyer', 'judge', 'admin']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CaseSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().min(1),
  status: z.enum(['pending', 'active', 'resolved', 'closed']),
  plaintiffId: z.string(),
  defendantId: z.string().optional(),
  lawyerId: z.string().optional(),
  judgeId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const EvidenceSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  title: z.string().min(1),
  description: z.string(),
  fileUrl: z.string().url().optional(),
  fileType: z.string().optional(),
  uploadedBy: z.string(),
  isVerified: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const HearingSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  scheduledDate: z.date(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']),
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

// Type inference from schemas
export type User = z.infer<typeof UserSchema>;
export type Case = z.infer<typeof CaseSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type Hearing = z.infer<typeof HearingSchema>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
