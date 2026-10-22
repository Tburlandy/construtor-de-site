import { z } from 'zod';

export const ClientVariableDefinitionSchema = z.object({
  key: z.string().trim().min(1),
  label: z.string().trim().min(1),
  group: z.string().trim().min(1),
  source: z.string().trim().min(1),
  description: z.string().optional(),
  insertable: z.boolean(),
});

export type ClientVariableDefinition = z.infer<typeof ClientVariableDefinitionSchema>;
export type ClientVariableValue = {
  definition: ClientVariableDefinition;
  value: string;
  configured: boolean;
};
