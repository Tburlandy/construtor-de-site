import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { ProjectMetadata, PublicationRecord } from '@/platform/contracts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useContent } from '@/lib/content';
import { ArrowLeft, Copy, Loader2 } from 'lucide-react';

function formatDateLabel(raw: string): string {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }
  return date.toLocaleString('pt-BR');
}

function formatPublicationDestination(publication: PublicationRecord): string {
  return publication.deployTargetId ? publication.deployTargetId : 'não informado';
}

export default function StudioProjectShell() {
  const { projectId: projectIdParam } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<ProjectMetadata | null>(null);
  const [publications, setPublications] = useState<PublicationRecord[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingPublications, setLoadingPublications] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [duplicateForm, setDuplicateForm] = useState({
    targetProjectId: '',
    name: '',
    slug: '',
    description: '',
  });

  const projectId = projectIdParam ? decodeURIComponent(projectIdParam) : '';
  const { content: projectContent, loading: loadingProjectContent } = useContent(
    project ? project.projectId : undefined,
  );

  const duplicateDefaults = useMemo(
    () => ({
      targetProjectId: project ? `${project.projectId}-copia` : '',
      name: project ? `${project.name} (cópia)` : '',
      slug: project ? `${project.slug}-copia` : '',
      description: project?.description ?? '',
    }),
    [project],
  );

  const loadPublications = useCallback(
    async (currentProjectId: string) => {
      setLoadingPublications(true);
      try {
        const res = await fetch(
          `/api/projects/${encodeURIComponent(currentProjectId)}/publications`,
        );
        if (res.status === 404) {
          setPublications([]);
          return;
        }
        if (!res.ok) {
          throw new Error('fetch failed');
        }
        const data = (await res.json()) as PublicationRecord[];
        setPublications(data);
      } catch {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar o histórico de publicações.',
          variant: 'destructive',
        });
        setPublications([]);
      } finally {
        setLoadingPublications(false);
      }
    },
    [toast],
  );

  const load = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      setNotFound(true);
      setPublications([]);
      return;
    }
    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`);
      if (res.status === 404) {
        setProject(null);
        setNotFound(true);
        setPublications([]);
        return;
      }
      if (!res.ok) {
        throw new Error('fetch failed');
      }
      const data = (await res.json()) as ProjectMetadata;
      setProject(data);
      await loadPublications(data.projectId);
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o projeto.',
        variant: 'destructive',
      });
      setProject(null);
      setPublications([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, toast, loadPublications]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDuplicateDialog = () => {
    setDuplicateForm(duplicateDefaults);
    setDuplicateOpen(true);
  };

  const handleDuplicate = async () => {
    const body = {
      targetProjectId: duplicateForm.targetProjectId.trim(),
      ...(duplicateForm.name.trim() ? { name: duplicateForm.name.trim() } : {}),
      ...(duplicateForm.slug.trim() ? { slug: duplicateForm.slug.trim() } : {}),
      ...(duplicateForm.description.trim()
        ? { description: duplicateForm.description.trim() }
        : {}),
    };

    if (!body.targetProjectId) {
      toast({
        title: 'ID obrigatório',
        description: 'Informe o ID do projeto de destino para duplicação.',
        variant: 'destructive',
      });
      return;
    }

    setDuplicating(true);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          typeof payload.error === 'string' ? payload.error : 'Não foi possível duplicar o projeto.';
        toast({
          title: 'Erro ao duplicar',
          description: message,
          variant: 'destructive',
        });
        return;
      }

      setDuplicateOpen(false);
      toast({
        title: 'Projeto duplicado',
        description: `Novo projeto: ${body.targetProjectId}`,
      });
      navigate(`/dev/studio/projects/${encodeURIComponent(body.targetProjectId)}`);
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha de rede ao duplicar o projeto.',
        variant: 'destructive',
      });
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dev/studio/projects">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Projetos
            </Link>
          </Button>
          {project ? (
            <Dialog open={duplicateOpen} onOpenChange={setDuplicateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" onClick={openDuplicateDialog}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicar projeto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Duplicar projeto</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label htmlFor="dup-target-id">ID de destino</Label>
                    <Input
                      id="dup-target-id"
                      value={duplicateForm.targetProjectId}
                      onChange={(e) =>
                        setDuplicateForm((current) => ({
                          ...current,
                          targetProjectId: e.target.value,
                        }))
                      }
                      placeholder="ex: cliente-rio-copia"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dup-name">Nome (opcional)</Label>
                    <Input
                      id="dup-name"
                      value={duplicateForm.name}
                      onChange={(e) =>
                        setDuplicateForm((current) => ({ ...current, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dup-slug">Slug (opcional)</Label>
                    <Input
                      id="dup-slug"
                      value={duplicateForm.slug}
                      onChange={(e) =>
                        setDuplicateForm((current) => ({ ...current, slug: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dup-desc">Descrição (opcional)</Label>
                    <Textarea
                      id="dup-desc"
                      rows={3}
                      value={duplicateForm.description}
                      onChange={(e) =>
                        setDuplicateForm((current) => ({
                          ...current,
                          description: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDuplicateOpen(false)}
                    disabled={duplicating}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={() => void handleDuplicate()} disabled={duplicating}>
                    {duplicating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Duplicando…
                      </>
                    ) : (
                      'Duplicar'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-16 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            Carregando projeto…
          </div>
        ) : notFound ? (
          <Card>
            <CardHeader>
              <CardTitle>Projeto não encontrado</CardTitle>
              <CardDescription>
                Não há metadados para <span className="font-mono">{projectId || '—'}</span>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/dev/studio/projects">Voltar à lista</Link>
              </Button>
            </CardContent>
          </Card>
        ) : project ? (
          <Card>
            <CardHeader>
              <CardTitle>{project.name}</CardTitle>
              <CardDescription>
                Shell do editor · <span className="font-mono">{project.projectId}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between gap-4 border-b border-border pb-2">
                  <dt className="text-muted-foreground">Slug</dt>
                  <dd className="font-medium">{project.slug}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-border pb-2">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="font-medium">{project.status}</dd>
                </div>
                {project.description ? (
                  <div className="pt-1">
                    <dt className="text-muted-foreground mb-1">Descrição</dt>
                    <dd>{project.description}</dd>
                  </div>
                ) : null}
              </dl>
              <p className="text-sm text-muted-foreground rounded-md border border-dashed border-border p-4">
                Área reservada para o editor por projeto (conteúdo, SEO, mídia). Ainda não migrado
                neste card.
              </p>
              <div className="rounded-md border border-border bg-muted/20 p-4 space-y-3">
                <p className="text-sm font-medium">Conteúdo resolvido do projeto (shell)</p>
                <p className="text-xs text-muted-foreground">
                  Fonte esperada: <code>/api/projects/:projectId/content</code> com fallback legado
                  via loader para transição.
                </p>
                {loadingProjectContent ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Carregando conteúdo do projeto…
                  </div>
                ) : projectContent ? (
                  <dl className="grid gap-1.5 text-xs sm:text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Marca</dt>
                      <dd className="font-medium">{projectContent.global.brand}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Cidade</dt>
                      <dd className="font-medium">{projectContent.global.city}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Headline</dt>
                      <dd className="font-medium text-right line-clamp-1">{projectContent.hero.headline}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Benefícios</dt>
                      <dd className="font-medium">{projectContent.benefits.length}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Projetos showcase</dt>
                      <dd className="font-medium">{projectContent.showcase.projects.length}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Conteúdo indisponível para o projeto no momento.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {!loading && !notFound && project ? (
          <Card>
            <CardHeader>
              <CardTitle>Histórico de publicações</CardTitle>
              <CardDescription>Leitura operacional dos registros em disco do projeto</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPublications ? (
                <div className="flex items-center gap-2 text-muted-foreground py-6 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando histórico…
                </div>
              ) : publications.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  Ainda não há publicações registradas para este projeto.
                </p>
              ) : (
                <ul className="divide-y divide-border rounded-md border border-border">
                  {publications.map((publication) => (
                    <li key={publication.publicationId} className="p-3 space-y-1">
                      <p className="text-sm font-medium">
                        <span className="font-mono">{publication.publicationId}</span>
                        <span className="mx-2">·</span>
                        {publication.status}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        criado em {formatDateLabel(publication.createdAt)}
                        {publication.finishedAt
                          ? ` · finalizado em ${formatDateLabel(publication.finishedAt)}`
                          : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        projeto: <span className="font-mono">{publication.projectId}</span> · destino:{' '}
                        <span className="font-mono">{formatPublicationDestination(publication)}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        artefato: <span className="font-mono">{publication.artifactPath}</span>
                      </p>
                      {publication.message ? (
                        <p className="text-xs text-muted-foreground">{publication.message}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
