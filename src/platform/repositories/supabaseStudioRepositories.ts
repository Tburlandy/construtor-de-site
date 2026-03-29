import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  ProjectContentRecordSchema,
  ProjectMetadataSchema,
  PublicationRecordSchema,
  ProjectSeoConfigSchema,
  ProjectVersionRecordSchema,
  type JsonValue,
  type ProjectContentRecord,
  type ProjectId,
  type ProjectMetadata,
  type PublicationRecord,
  type ProjectSeoConfig,
  type ProjectVersionRecord,
} from '../contracts/index.js';
import type { ProjectContentRepository } from './projectContentRepository.js';
import type { ProjectMetadataRepository } from './projectMetadataRepository.js';
import type { ProjectPublicationRepository } from './projectPublicationRepository.js';
import type { ProjectSeoConfigRepository } from './projectSeoConfigRepository.js';
import type { ProjectVersionRepository } from './projectVersionRepository.js';

const PROJECTS_TABLE = 'studio_projects';
const CONTENTS_TABLE = 'studio_project_contents';
const SEO_TABLE = 'studio_project_seo_configs';
const VERSIONS_TABLE = 'studio_project_versions';
const PUBLICATIONS_TABLE = 'studio_project_publications';

export type SupabaseStudioClientParams = {
  supabaseUrl?: string;
  serviceRoleKey?: string;
  storageBucket?: string;
};

export type SupabaseStudioClient = {
  client: SupabaseClient;
  storageBucket: string;
};

export function createSupabaseStudioClient(
  params: SupabaseStudioClientParams = {},
): SupabaseStudioClient | null {
  const supabaseUrl = params.supabaseUrl;
  const serviceRoleKey = params.serviceRoleKey;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return {
    client: createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    storageBucket: params.storageBucket || 'studio-media',
  };
}

export function createSupabaseProjectMetadataRepository(
  supabase: SupabaseClient,
): ProjectMetadataRepository {
  return {
    async list(): Promise<ProjectMetadata[]> {
      const { data, error } = await supabase
        .from(PROJECTS_TABLE)
        .select('*')
        .order('project_id', { ascending: true });
      if (error) {
        throw error;
      }
      return (data ?? []).map(mapRowToProjectMetadata);
    },

    async getByProjectId(projectId: ProjectId): Promise<ProjectMetadata | null> {
      const { data, error } = await supabase
        .from(PROJECTS_TABLE)
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();
      if (error) {
        throw error;
      }
      if (!data) {
        return null;
      }
      return mapRowToProjectMetadata(data);
    },

    async save(metadata: ProjectMetadata): Promise<ProjectMetadata> {
      const validated = ProjectMetadataSchema.parse(metadata);
      const { data, error } = await supabase
        .from(PROJECTS_TABLE)
        .upsert(mapProjectMetadataToRow(validated), {
          onConflict: 'project_id',
        })
        .select('*')
        .single();
      if (error) {
        throw error;
      }
      return mapRowToProjectMetadata(data);
    },

    async deleteByProjectId(projectId: ProjectId): Promise<void> {
      const { error } = await supabase.from(PROJECTS_TABLE).delete().eq('project_id', projectId);
      if (error) {
        throw error;
      }
    },
  };
}

export function createSupabaseProjectContentRepository(
  supabase: SupabaseClient,
): ProjectContentRepository {
  return {
    async getByProjectId(projectId: ProjectId): Promise<ProjectContentRecord | null> {
      const { data, error } = await supabase
        .from(CONTENTS_TABLE)
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();
      if (error) {
        throw error;
      }
      if (!data) {
        return null;
      }
      return mapRowToProjectContentRecord(data);
    },

    async save(contentRecord: ProjectContentRecord): Promise<ProjectContentRecord> {
      const validated = ProjectContentRecordSchema.parse(contentRecord);
      const { data, error } = await supabase
        .from(CONTENTS_TABLE)
        .upsert(mapProjectContentRecordToRow(validated), {
          onConflict: 'project_id',
        })
        .select('*')
        .single();
      if (error) {
        throw error;
      }
      return mapRowToProjectContentRecord(data);
    },
  };
}

export function createSupabaseProjectSeoConfigRepository(
  supabase: SupabaseClient,
): ProjectSeoConfigRepository {
  return {
    async getByProjectId(projectId: ProjectId): Promise<ProjectSeoConfig | null> {
      const { data, error } = await supabase
        .from(SEO_TABLE)
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();
      if (error) {
        throw error;
      }
      if (!data) {
        return null;
      }
      return mapRowToProjectSeoConfig(data);
    },

    async save(config: ProjectSeoConfig): Promise<ProjectSeoConfig> {
      const validated = ProjectSeoConfigSchema.parse(config);
      const { data, error } = await supabase
        .from(SEO_TABLE)
        .upsert(mapProjectSeoConfigToRow(validated), {
          onConflict: 'project_id',
        })
        .select('*')
        .single();
      if (error) {
        throw error;
      }
      return mapRowToProjectSeoConfig(data);
    },
  };
}

export function createSupabaseProjectVersionRepository(
  supabase: SupabaseClient,
): ProjectVersionRepository {
  return {
    async listByProjectId(projectId: ProjectId): Promise<ProjectVersionRecord[]> {
      const { data, error } = await supabase
        .from(VERSIONS_TABLE)
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) {
        throw error;
      }
      return (data ?? []).map(mapRowToProjectVersionRecord);
    },

    async getByProjectIdAndVersionId(
      projectId: ProjectId,
      versionId: string,
    ): Promise<ProjectVersionRecord | null> {
      const { data, error } = await supabase
        .from(VERSIONS_TABLE)
        .select('*')
        .eq('project_id', projectId)
        .eq('version_id', versionId)
        .maybeSingle();
      if (error) {
        throw error;
      }
      if (!data) {
        return null;
      }
      return mapRowToProjectVersionRecord(data);
    },

    async createSnapshot(params: {
      projectId: ProjectId;
      content: Record<string, JsonValue>;
      versionId?: string;
      createdAt?: string;
    }): Promise<ProjectVersionRecord> {
      const record = ProjectVersionRecordSchema.parse({
        versionId: params.versionId?.trim() || buildVersionId(),
        projectId: params.projectId,
        content: params.content,
        createdAt: params.createdAt ?? new Date().toISOString(),
      });
      const { data, error } = await supabase
        .from(VERSIONS_TABLE)
        .insert(mapProjectVersionRecordToRow(record))
        .select('*')
        .single();
      if (error) {
        throw error;
      }
      return mapRowToProjectVersionRecord(data);
    },
  };
}

export function createSupabaseProjectPublicationRepository(
  supabase: SupabaseClient,
): ProjectPublicationRepository {
  return {
    async listByProjectId(projectId: ProjectId): Promise<PublicationRecord[]> {
      const { data, error } = await supabase
        .from(PUBLICATIONS_TABLE)
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) {
        // Mantem comportamento tolerante para não bloquear Studio se tabela ainda não existir.
        if (
          error.code === '42P01' ||
          error.message.toLowerCase().includes('does not exist')
        ) {
          return [];
        }
        throw error;
      }
      return (data ?? []).map(mapRowToProjectPublicationRecord);
    },
  };
}

function mapRowToProjectMetadata(row: Record<string, unknown>): ProjectMetadata {
  return ProjectMetadataSchema.parse({
    projectId: row.project_id,
    name: row.name,
    slug: row.slug,
    description:
      typeof row.description === 'string' && row.description.length > 0
        ? row.description
        : undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapProjectMetadataToRow(metadata: ProjectMetadata): Record<string, unknown> {
  return {
    project_id: metadata.projectId,
    name: metadata.name,
    slug: metadata.slug,
    description: metadata.description ?? null,
    status: metadata.status,
    created_at: metadata.createdAt,
    updated_at: metadata.updatedAt,
  };
}

function mapRowToProjectContentRecord(
  row: Record<string, unknown>,
): ProjectContentRecord {
  return ProjectContentRecordSchema.parse({
    projectId: row.project_id,
    schemaVersion:
      typeof row.schema_version === 'string' && row.schema_version.length > 0
        ? row.schema_version
        : undefined,
    content: row.content,
    updatedAt: row.updated_at,
  });
}

function mapProjectContentRecordToRow(
  record: ProjectContentRecord,
): Record<string, unknown> {
  return {
    project_id: record.projectId,
    schema_version: record.schemaVersion ?? null,
    content: record.content,
    updated_at: record.updatedAt,
  };
}

function mapRowToProjectSeoConfig(row: Record<string, unknown>): ProjectSeoConfig {
  return ProjectSeoConfigSchema.parse({
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    canonical: row.canonical,
    ogImage: row.og_image,
    jsonLd: row.json_ld ?? undefined,
    updatedAt: row.updated_at,
  });
}

function mapProjectSeoConfigToRow(config: ProjectSeoConfig): Record<string, unknown> {
  return {
    project_id: config.projectId,
    title: config.title,
    description: config.description,
    canonical: config.canonical,
    og_image: config.ogImage,
    json_ld: config.jsonLd ?? null,
    updated_at: config.updatedAt,
  };
}

function mapRowToProjectVersionRecord(
  row: Record<string, unknown>,
): ProjectVersionRecord {
  return ProjectVersionRecordSchema.parse({
    projectId: row.project_id,
    versionId: row.version_id,
    content: row.content,
    createdAt: row.created_at,
  });
}

function mapProjectVersionRecordToRow(
  record: ProjectVersionRecord,
): Record<string, unknown> {
  return {
    project_id: record.projectId,
    version_id: record.versionId,
    content: record.content,
    created_at: record.createdAt,
  };
}

function mapRowToProjectPublicationRecord(
  row: Record<string, unknown>,
): PublicationRecord {
  return PublicationRecordSchema.parse({
    publicationId: row.publication_id,
    projectId: row.project_id,
    deployTargetId:
      typeof row.deploy_target_id === 'string' && row.deploy_target_id.length > 0
        ? row.deploy_target_id
        : undefined,
    artifactPath: row.artifact_path,
    status: row.status,
    createdAt: row.created_at,
    finishedAt:
      typeof row.finished_at === 'string' && row.finished_at.length > 0
        ? row.finished_at
        : undefined,
    message:
      typeof row.message === 'string' && row.message.length > 0
        ? row.message
        : undefined,
  });
}

function buildVersionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
