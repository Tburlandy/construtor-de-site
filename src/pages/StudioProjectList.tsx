import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ProjectMetadata } from '@/platform/contracts';
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
import { FolderOpen, Loader2, Plus } from 'lucide-react';

export default function StudioProjectList() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectMetadata[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    projectId: '',
    name: '',
    slug: '',
    description: '',
  });

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) {
        throw new Error('Falha ao listar');
      }
      const data = (await res.json()) as ProjectMetadata[];
      setProjects(data);
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os projetos.',
        variant: 'destructive',
      });
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreate = async () => {
    const body = {
      projectId: form.projectId.trim(),
      name: form.name.trim(),
      slug: form.slug.trim(),
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
    };

    if (!body.projectId || !body.name || !body.slug) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha ID do projeto, nome e slug.',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          typeof payload.error === 'string' ? payload.error : 'Não foi possível criar o projeto.';
        toast({
          title: 'Erro ao criar',
          description: msg,
          variant: 'destructive',
        });
        return;
      }

      toast({ title: 'Projeto criado', description: body.name });
      setCreateOpen(false);
      setForm({ projectId: '', name: '', slug: '', description: '' });
      await loadProjects();
      navigate(`/dev/studio/projects/${encodeURIComponent(body.projectId)}`);
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha de rede ao criar projeto.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projetos</h1>
            <p className="text-muted-foreground">Gestão de projetos da plataforma (shell)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo projeto
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Criar projeto</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label htmlFor="project-id">ID do projeto</Label>
                    <Input
                      id="project-id"
                      placeholder="ex: cliente-rio-2025"
                      value={form.projectId}
                      onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Pasta em <code className="text-xs">data/projects/&lt;id&gt;</code>; sem barras.
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="project-name">Nome</Label>
                    <Input
                      id="project-name"
                      placeholder="Nome exibido"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="project-slug">Slug</Label>
                    <Input
                      id="project-slug"
                      placeholder="ex: cliente-rio"
                      value={form.slug}
                      onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="project-desc">Descrição (opcional)</Label>
                    <Textarea
                      id="project-desc"
                      rows={3}
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
                    Cancelar
                  </Button>
                  <Button onClick={() => void handleCreate()} disabled={creating}>
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Criando…
                      </>
                    ) : (
                      'Criar'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista</CardTitle>
            <CardDescription>Projetos registrados no servidor do Studio</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
                Carregando…
              </div>
            ) : !projects?.length ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Nenhum projeto ainda. Use &quot;Novo projeto&quot; para começar.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {projects.map((p) => (
                  <li
                    key={p.projectId}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-mono text-xs">{p.projectId}</span>
                        <span className="mx-2">·</span>
                        slug: {p.slug}
                        <span className="mx-2">·</span>
                        {p.status}
                      </p>
                    </div>
                    <Button variant="secondary" asChild>
                      <Link to={`/dev/studio/projects/${encodeURIComponent(p.projectId)}`}>
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Abrir
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
