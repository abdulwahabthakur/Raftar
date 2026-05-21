import { z } from 'zod';

export const GPSPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0),
  timestamp: z.number().int().positive(),
});

export const StartRunSchema = z.object({
  startedAt: z.string().datetime(),
  deviceId: z.string().min(1).max(128),
});

export const EndRunSchema = z.object({
  runId: z.string().uuid(),
  endedAt: z.string().datetime(),
  distanceMeters: z.number().min(0),
  route: z.object({
    type: z.literal('LineString'),
    coordinates: z.array(z.tuple([z.number(), z.number()])).min(2),
  }),
});

export const SubmitCaptureSchema = z.object({
  runId: z.string().uuid(),
  cellId: z.string().uuid(),
  enteredAt: z.string().datetime(),
  exitedAt: z.string().datetime(),
  gpsSlice: z.array(GPSPointSchema).min(2).max(50),
  deviceId: z.string().min(1).max(128),
});

export const UpdateProfileSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username may only contain letters, numbers, _ and -'),
  avatarUrl: z.string().url().optional().nullable(),
});

export type GPSPointInput = z.infer<typeof GPSPointSchema>;
export type StartRunInput = z.infer<typeof StartRunSchema>;
export type EndRunInput = z.infer<typeof EndRunSchema>;
export type SubmitCaptureInput = z.infer<typeof SubmitCaptureSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
