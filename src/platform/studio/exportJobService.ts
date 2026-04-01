import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ProjectSchema, type ProjectId } from '../contracts/index.js';

const EXPORT_JOBS_TABLE = 'studio_export_jobs';
const LOCAL_EXPORT_JOBS_ROOT = path.resolve('artifacts', 'clients');

export type ExportJobStatus = 'queued' | 'running' | 'success' | 'failed';

export type ExportJobRecord = {
  jobId: string;
  projectId: ProjectId;
  status: ExportJobStatus;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  artifactFileName?: string;
  artifactStoragePath?: string;
  artifactSizeBytes?: number;
  errorMessage?: string;
};

export class ExportJobError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ExportJobError';
    this.statusCode = statusCode;
  }
}

export type ExportJobRepository = {
  createQueued(params: { projectId: string }): Promise<ExportJobRecord>;
  getLatestByProjectId(projectIdRaw: string): Promise<ExportJobRecord | null>;
  getByProjectIdAndJobId(projectIdRaw: string, jobIdRaw: string): Promise<ExportJobRecord | null>;
};

export function createExportJobRepository(params: {
  supabaseClient?: SupabaseClient | null;
}): ExportJobRepository {
  if (params.supabaseClient) {
    return createSupabaseExportJobRepository(params.supabaseClient);
  }
  return createLocalFileExportJobRepository();
}

function parseProjectIdOrThrow(projectIdRaw: string): ProjectId {
  try {
    return ProjectSchema.parse({ projectId: projectIdRaw }).projectId;
  } catch {
    throw new ExportJobError(400, 'projectId inválido');
  }
}

function parseJobIdOrThrow(jobIdRaw: string): string {
  const jobId = jobIdRaw.trim();
  if (!jobId) {
    throw new ExportJobError(400, 'jobId inválido');
  }
  return jobId;
}

function mapRowToExportJobRecord(row: Record<string, unknown>): ExportJobRecord {
  return {
    jobId: String(row.job_id),
    projectId: String(row.project_id) as ProjectId,
    status: String(row.status) as ExportJobStatus,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    ...(typeof row.started_at === 'string' ? { startedAt: row.started_at } : {}),
    ...(typeof row.finished_at === 'string' ? { finishedAt: row.finished_at } : {}),
    ...(typeof row.artifact_file_name === 'string'
      ? { artifactFileName: row.artifact_file_name }
      : {}),
    ...(typeof row.artifact_storage_path === 'string'
      ? { artifactStoragePath: row.artifact_storage_path }
      : {}),
    ...(typeof row.artifact_size_bytes === 'number'
      ? { artifactSizeBytes: row.artifact_size_bytes }
      : {}),
    ...(typeof row.error_message === 'string' ? { errorMessage: row.error_message } : {}),
  };
}

function createSupabaseExportJobRepository(supabase: SupabaseClient): ExportJobRepository {
  return {
    async createQueued(params) {
      const projectId = parseProjectIdOrThrow(params.projectId);
      const now = new Date().toISOString();
      const row = {
        job_id: randomUUID(),
        project_id: projectId,
        status: 'queued',
        created_at: now,
        updated_at: now,
      };
      const { data, error } = await supabase
        .from(EXPORT_JOBS_TABLE)
        .insert(row)
        .select('*')
        .single();
      if (error) {
        throw error;
      }
      return mapRowToExportJobRecord(data);
    },

    async getLatestByProjectId(projectIdRaw) {
      const projectId = parseProjectIdOrThrow(projectIdRaw);
      const { data, error } = await supabase
        .from(EXPORT_JOBS_TABLE)
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        throw error;
      }
      if (!data) {
        return null;
      }
      return mapRowToExportJobRecord(data);
    },

    async getByProjectIdAndJobId(projectIdRaw, jobIdRaw) {
      const projectId = parseProjectIdOrThrow(projectIdRaw);
      const jobId = parseJobIdOrThrow(jobIdRaw);
      const { data, error } = await supabase
        .from(EXPORT_JOBS_TABLE)
        .select('*')
        .eq('project_id', projectId)
        .eq('job_id', jobId)
        .maybeSingle();
      if (error) {
        throw error;
      }
      if (!data) {
        return null;
      }
      return mapRowToExportJobRecord(data);
    },
  };
}

function createLocalFileExportJobRepository(): ExportJobRepository {
  async function listJobs(projectId: ProjectId): Promise<ExportJobRecord[]> {
    const jobsPath = path.join(LOCAL_EXPORT_JOBS_ROOT, projectId, 'jobs.json');
    try {
      const raw = await fs.readFile(jobsPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed as ExportJobRecord[];
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return [];
        }
      }
      throw error;
    }
  }

  async function saveJobs(projectId: ProjectId, jobs: ExportJobRecord[]) {
    const jobsDir = path.join(LOCAL_EXPORT_JOBS_ROOT, projectId);
    const jobsPath = path.join(jobsDir, 'jobs.json');
    await fs.mkdir(jobsDir, { recursive: true });
    await fs.writeFile(jobsPath, JSON.stringify(jobs, null, 2), 'utf-8');
  }

  return {
    async createQueued(params) {
      const projectId = parseProjectIdOrThrow(params.projectId);
      const jobs = await listJobs(projectId);
      const now = new Date().toISOString();
      const job: ExportJobRecord = {
        jobId: randomUUID(),
        projectId,
        status: 'queued',
        createdAt: now,
        updatedAt: now,
      };
      jobs.unshift(job);
      await saveJobs(projectId, jobs);
      return job;
    },

    async getLatestByProjectId(projectIdRaw) {
      const projectId = parseProjectIdOrThrow(projectIdRaw);
      const jobs = await listJobs(projectId);
      return jobs[0] ?? null;
    },

    async getByProjectIdAndJobId(projectIdRaw, jobIdRaw) {
      const projectId = parseProjectIdOrThrow(projectIdRaw);
      const jobId = parseJobIdOrThrow(jobIdRaw);
      const jobs = await listJobs(projectId);
      return jobs.find((job) => job.jobId === jobId) ?? null;
    },
  };
}

