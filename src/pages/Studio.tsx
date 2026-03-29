import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Upload, Save, X, GripVertical } from 'lucide-react';
import type { Content, Benefit, Project } from '@/content/schema';
import type { ProjectMetadata } from '@/platform/contracts';

// Componente para upload de imagem com drag and drop
const ImageUploader = ({ 
  value, 
  onChange, 
  label,
  onDelete,
  uploadImage,
}: { 
  value: string; 
  onChange: (url: string) => void;
  label: string;
  onDelete?: () => void;
  uploadImage: (file: File) => Promise<string>;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const url = await uploadImage(file);
        onChange(url);
        toast({ title: 'Upload concluído', description: 'Imagem enviada com sucesso' });
      } catch {
        toast({ title: 'Erro', description: 'Falha no upload', variant: 'destructive' });
      }
    }
  }, [onChange, toast, uploadImage]);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const url = await uploadImage(file);
        onChange(url);
        toast({ title: 'Upload concluído', description: 'Imagem enviada com sucesso' });
      } catch {
        toast({ title: 'Erro', description: 'Falha no upload', variant: 'destructive' });
      }
    }
  };

  return (
    <div>
      <Label>{label}</Label>
      {value ? (
        <div className="relative mt-2 group">
          <img 
            src={value.startsWith('/') || value.startsWith('http') ? value : `/${value}`} 
            alt={label}
            className="w-full h-48 object-cover rounded-lg border-2 border-border"
            onError={(e) => {
              console.error('Erro ao carregar imagem:', value);
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remover
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div
          className={`mt-2 border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? 'border-primary bg-primary/10' : 'border-border'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-2">
            Arraste uma imagem aqui ou clique para selecionar
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
            id={`upload-${label}`}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById(`upload-${label}`)?.click()}
          >
            Selecionar arquivo
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Formatos: JPG, PNG, WebP. Será convertido automaticamente para WebP otimizado.
          </p>
        </div>
      )}
      {value && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2"
          placeholder="/hero-solar-panels.jpg"
        />
      )}
    </div>
  );
};

// Componente para card de projeto editável
const ProjectCard = ({ 
  project, 
  index, 
  onUpdate, 
  onDelete, 
  uploadImage 
}: { 
  project: Project; 
  index: number; 
  onUpdate: (project: Project) => void;
  onDelete: () => void;
  uploadImage: (file: File) => Promise<string>;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();

  return (
    <div
      draggable
      onDragStart={(e) => {
        setIsDragging(true);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());
      }}
      onDragEnd={() => setIsDragging(false)}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
    >
    <Card 
      className={`relative ${dragOver ? 'border-primary' : ''}`}
    >
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          {/* Drag Handle */}
          <div className="cursor-move pt-2">
            <GripVertical className="w-5 h-5 text-muted-foreground" />
          </div>
          
          {/* Image */}
          <div className="relative w-32 h-32 flex-shrink-0">
            <img
              src={project.image.startsWith('/') || project.image.startsWith('http') ? project.image : `/${project.image}`}
              alt={`Projeto ${index + 1}`}
              className="w-full h-full object-cover rounded-lg border-2 border-border"
              onError={(e) => {
                console.error('Erro ao carregar imagem:', project.image);
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      const url = await uploadImage(file);
                      onUpdate({ ...project, image: url });
                      toast({ title: 'Upload concluído', description: 'Imagem atualizada' });
                    } catch {
                      toast({ title: 'Erro', description: 'Falha no upload', variant: 'destructive' });
                    }
                  }
                }}
                className="hidden"
                id={`upload-project-${index}`}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => document.getElementById(`upload-project-${index}`)?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Trocar
              </Button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Tipo</Label>
              <select
                value={project.tipo}
                onChange={(e) => {
                  onUpdate({ ...project, tipo: e.target.value as 'Residencial' | 'Comercial' });
                }}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
              >
                <option value="Residencial">Residencial</option>
                <option value="Comercial">Comercial</option>
              </select>
            </div>
            <div>
              <Label>Localização</Label>
              <Input
                value={project.localizacao}
                onChange={(e) => {
                  onUpdate({ ...project, localizacao: e.target.value });
                }}
                placeholder="Ex: Barra da Tijuca"
              />
            </div>
            <div>
              <Label>Módulos</Label>
              <Input
                type="number"
                min="0"
                value={project.modulos}
                onChange={(e) => {
                  onUpdate({ ...project, modulos: parseInt(e.target.value) || 0 });
                }}
              />
            </div>
            <div>
              <Label>Potência do Módulo (W)</Label>
              <Input
                type="number"
                min="0"
                value={project.potenciaModulo}
                onChange={(e) => {
                  onUpdate({ ...project, potenciaModulo: parseInt(e.target.value) || 0 });
                }}
              />
            </div>
            <div>
              <Label>Economia Anual (R$)</Label>
              <Input
                type="number"
                min="0"
                value={project.economia}
                onChange={(e) => {
                  onUpdate({ ...project, economia: parseInt(e.target.value) || 0 });
                }}
              />
            </div>
          </div>

          {/* Delete Button */}
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
    </div>
  );
};

const Studio = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [content, setContent] = useState<Content | null>(null);
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const projectId = (searchParams.get('projectId') || '').trim();
  const isProjectScoped = projectId.length > 0;

  const contentEndpoint = isProjectScoped
    ? `/api/projects/${encodeURIComponent(projectId)}/content`
    : '/api/content';
  const uploadImageEndpoint = isProjectScoped
    ? `/api/projects/${encodeURIComponent(projectId)}/upload-image`
    : '/api/upload-image';

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('Erro ao listar projetos');
      }
      const data = (await response.json()) as ProjectMetadata[];
      setProjects(data);
    } catch {
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const loadContent = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(contentEndpoint);
      if (!response.ok) {
        throw new Error('Erro ao carregar conteúdo');
      }
      const data = await response.json();
      setContent(data);
    } catch (error) {
      console.error('Erro ao carregar conteúdo:', error);
      toast({
        title: 'Erro',
        description: isProjectScoped
          ? `Não foi possível carregar o conteúdo do projeto ${projectId}`
          : 'Não foi possível carregar o conteúdo',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [contentEndpoint, isProjectScoped, projectId, toast]);

  useEffect(() => {
    void loadContent();
  }, [loadContent]);

  const saveContent = async () => {
    if (!content) return;
    
    setSaving(true);
    try {
      const response = await fetch(contentEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content, null, 2),
      });

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: isProjectScoped
            ? `Conteúdo do projeto ${projectId} salvo com sucesso!`
            : 'Conteúdo salvo com sucesso!',
        });
      } else {
        throw new Error('Erro ao salvar');
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: isProjectScoped
          ? `Não foi possível salvar o conteúdo do projeto ${projectId}`
          : 'Não foi possível salvar o conteúdo',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(uploadImageEndpoint, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Erro ao fazer upload');
    }

    const data = await response.json();
    return data.url;
  };

  const handleProjectChange = (nextProjectId: string) => {
    const params = new URLSearchParams(searchParams);
    const normalized = nextProjectId.trim();
    if (normalized) {
      params.set('projectId', normalized);
    } else {
      params.delete('projectId');
    }
    setSearchParams(params);
  };

  if (loading || !content) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">Studio - Edição de Conteúdo</h1>
            <p className="text-muted-foreground">
              {isProjectScoped
                ? `Editando no escopo do projeto ${projectId}`
                : 'Modo legado: sem projeto selecionado'}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-[260px]">
              <Label htmlFor="studio-project-select">Projeto</Label>
              <select
                id="studio-project-select"
                className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={projectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                disabled={loadingProjects}
              >
                <option value="">Modo legado (content/content.json)</option>
                {projects.map((project) => (
                  <option key={project.projectId} value={project.projectId}>
                    {project.name} ({project.projectId})
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={saveContent} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="global" className="space-y-4">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="global">Variáveis</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="hero">Hero</TabsTrigger>
            <TabsTrigger value="benefits">Benefícios</TabsTrigger>
            <TabsTrigger value="showcase">Projetos</TabsTrigger>
            <TabsTrigger value="howItWorks">Como Funciona</TabsTrigger>
            <TabsTrigger value="proofBar">Prova Social</TabsTrigger>
            <TabsTrigger value="fullService">Serviço Completo</TabsTrigger>
          </TabsList>

          {/* Variáveis Globais */}
          <TabsContent value="global" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Variáveis Globais</CardTitle>
                <CardDescription>Configurações gerais do site</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nome da Marca</Label>
                  <Input
                    value={content.global.brand}
                    onChange={(e) => setContent({ ...content, global: { ...content.global, brand: e.target.value } })}
                  />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input
                    value={content.global.city}
                    onChange={(e) => setContent({ ...content, global: { ...content.global, city: e.target.value } })}
                  />
                </div>
                <div>
                  <Label>WhatsApp E.164</Label>
                  <Input
                    value={content.global.whatsappE164}
                    onChange={(e) => setContent({ ...content, global: { ...content.global, whatsappE164: e.target.value } })}
                    placeholder="5521999999999"
                  />
                </div>
                <div>
                  <Label>CNPJ</Label>
                  <Input
                    value={content.global.cnpj}
                    onChange={(e) => setContent({ ...content, global: { ...content.global, cnpj: e.target.value } })}
                    placeholder="00.000.000/0001-00"
                  />
                </div>
                <div>
                  <Label>Endereço</Label>
                  <Textarea
                    value={content.global.address}
                    onChange={(e) => setContent({ ...content, global: { ...content.global, address: e.target.value } })}
                    rows={3}
                    placeholder="Rua Exemplo, 123&#10;Centro - Rio de Janeiro/RJ&#10;CEP: 20000-000"
                  />
                </div>
                <div>
                  <Label>URL do Site</Label>
                  <Input
                    value={content.global.siteUrl}
                    onChange={(e) => setContent({ ...content, global: { ...content.global, siteUrl: e.target.value } })}
                    placeholder="https://www.efitecsolar.com"
                  />
                  <p className="text-xs text-muted-foreground mt-1">URL completa do site (ex: https://www.efitecsolar.com). Usado em SEO e JSON-LD.</p>
                </div>
                <div>
                  <Label>GTM ID (Google Tag Manager)</Label>
                  <Input
                    value={content.global.gtmId || ''}
                    onChange={(e) => setContent({ ...content, global: { ...content.global, gtmId: e.target.value } })}
                    placeholder="GTM-XXXXXXX"
                  />
                </div>
                <div>
                  <Label>Webhook URL</Label>
                  <Input
                    value={content.global.webhookUrl || ''}
                    onChange={(e) => setContent({ ...content, global: { ...content.global, webhookUrl: e.target.value } })}
                    placeholder="https://script.google.com/macros/s/SEU_SCRIPT/exec"
                  />
                </div>
                <div>
                  <Label>Webhook URL Secundário</Label>
                  <Input
                    value={content.global.secondaryWebhookUrl || ''}
                    onChange={(e) => setContent({ ...content, global: { ...content.global, secondaryWebhookUrl: e.target.value } })}
                    placeholder="https://seu-webhook-secundario.com/endpoint"
                  />
                </div>
                <div>
                  <Label>Form ID</Label>
                  <Input
                    value={content.global.formId || ''}
                    onChange={(e) => setContent({ ...content, global: { ...content.global, formId: e.target.value } })}
                    placeholder="54b01719"
                  />
                  <p className="text-xs text-muted-foreground mt-1">ID do formulário usado no webhook (padrão: 54b01719)</p>
                </div>
                <div>
                  <Label>Form Name</Label>
                  <Input
                    value={content.global.formName || ''}
                    onChange={(e) => setContent({ ...content, global: { ...content.global, formName: e.target.value } })}
                    placeholder="Acompanhamento"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Nome do formulário usado no webhook (padrão: Acompanhamento)</p>
                </div>
                <div>
                  <Label>Canal ID</Label>
                  <Input
                    value={content.global.canalId || ''}
                    onChange={(e) => setContent({ ...content, global: { ...content.global, canalId: e.target.value } })}
                    placeholder="ZhVZTpUHoR_CHD__"
                  />
                  <p className="text-xs text-muted-foreground mt-1">ID do canal usado no webhook (opcional)</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SEO */}
          <TabsContent value="seo" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configurações SEO</CardTitle>
                <CardDescription>Meta tags e structured data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Título</Label>
                  <Input
                    value={content.seo.title}
                    onChange={(e) => setContent({ ...content, seo: { ...content.seo, title: e.target.value } })}
                  />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={content.seo.description}
                    onChange={(e) => setContent({ ...content, seo: { ...content.seo, description: e.target.value } })}
                    rows={3}
                  />
                </div>
                <div>
                  <Label>URL Canônica</Label>
                  <Input
                    value={content.seo.canonical}
                    onChange={(e) => setContent({ ...content, seo: { ...content.seo, canonical: e.target.value } })}
                  />
                </div>
                <ImageUploader
                  label="Imagem OG (Open Graph)"
                  value={content.seo.ogImage}
                  onChange={(url) => setContent({ ...content, seo: { ...content.seo, ogImage: url } })}
                  onDelete={() => setContent({ ...content, seo: { ...content.seo, ogImage: '' } })}
                  uploadImage={uploadImage}
                />
                <div>
                  <Label>JSON-LD (Structured Data)</Label>
                  <Textarea
                    value={JSON.stringify(content.seo.jsonLd, null, 2)}
                    onChange={(e) => {
                      try {
                        const jsonLd = JSON.parse(e.target.value);
                        setContent({ ...content, seo: { ...content.seo, jsonLd } });
                      } catch {
                        // noop: mantém valor anterior até JSON válido
                      }
                    }}
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hero */}
          <TabsContent value="hero" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Seção Hero</CardTitle>
                <CardDescription>Título principal e chamada para ação</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Headline (Título Principal)</Label>
                  <Input
                    value={content.hero.headline}
                    onChange={(e) => setContent({ ...content, hero: { ...content.hero, headline: e.target.value } })}
                    placeholder="Use {{city}} para inserir a cidade"
                  />
                </div>
                <div>
                  <Label>Subheadline (Subtítulo)</Label>
                  <Textarea
                    value={content.hero.subheadline}
                    onChange={(e) => setContent({ ...content, hero: { ...content.hero, subheadline: e.target.value } })}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Texto do Botão CTA</Label>
                  <Input
                    value={content.hero.ctaLabel}
                    onChange={(e) => setContent({ ...content, hero: { ...content.hero, ctaLabel: e.target.value } })}
                  />
                </div>
                <ImageUploader
                  label="Imagem de Fundo"
                  value={content.hero.background}
                  onChange={(url) => setContent({ ...content, hero: { ...content.hero, background: url } })}
                  onDelete={() => setContent({ ...content, hero: { ...content.hero, background: '/hero-solar-panels.jpg' } })}
                  uploadImage={uploadImage}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Benefícios */}
          <TabsContent value="benefits" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Benefícios</CardTitle>
                <CardDescription>Lista de benefícios do serviço</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {content.benefits.map((benefit, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold">Benefício {index + 1}</h3>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const newBenefits = content.benefits.filter((_, i) => i !== index);
                            setContent({ ...content, benefits: newBenefits });
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div>
                        <Label>Ícone (nome do ícone Lucide)</Label>
                        <Input
                          value={benefit.icon}
                          onChange={(e) => {
                            const newBenefits = [...content.benefits];
                            newBenefits[index] = { ...benefit, icon: e.target.value };
                            setContent({ ...content, benefits: newBenefits });
                          }}
                          placeholder="FileCheck"
                        />
                      </div>
                      <div>
                        <Label>Título</Label>
                        <Input
                          value={benefit.title}
                          onChange={(e) => {
                            const newBenefits = [...content.benefits];
                            newBenefits[index] = { ...benefit, title: e.target.value };
                            setContent({ ...content, benefits: newBenefits });
                          }}
                        />
                      </div>
                      <div>
                        <Label>Descrição</Label>
                        <Textarea
                          value={benefit.text}
                          onChange={(e) => {
                            const newBenefits = [...content.benefits];
                            newBenefits[index] = { ...benefit, text: e.target.value };
                            setContent({ ...content, benefits: newBenefits });
                          }}
                          rows={2}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button
                  onClick={() => {
                    setContent({
                      ...content,
                      benefits: [...content.benefits, { icon: 'CheckCircle2', title: '', text: '' }],
                    });
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Benefício
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Showcase/Projetos */}
          <TabsContent value="showcase" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Projetos (Showcase)</CardTitle>
                <CardDescription>Edite projetos realizados - Arraste e solte para reordenar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {content.showcase.projects && content.showcase.projects.length > 0 ? (
                  <div className="space-y-4">
                    {content.showcase.projects.map((project, index) => (
                      <div 
                        key={index} 
                        data-index={index}
                        onDrop={(e) => {
                          e.preventDefault();
                          const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
                          const dropIndex = index;
                          if (!isNaN(draggedIndex) && draggedIndex !== dropIndex) {
                            const newProjects = [...content.showcase.projects];
                            const [dragged] = newProjects.splice(draggedIndex, 1);
                            newProjects.splice(dropIndex, 0, dragged);
                            setContent({ ...content, showcase: { projects: newProjects } });
                          }
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add('border-primary', 'border-2');
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.classList.remove('border-primary', 'border-2');
                        }}
                      >
                        <ProjectCard
                          project={project}
                          index={index}
                          onUpdate={(updatedProject) => {
                            const newProjects = [...content.showcase.projects];
                            newProjects[index] = updatedProject;
                            setContent({ ...content, showcase: { projects: newProjects } });
                          }}
                          onDelete={() => {
                            const newProjects = content.showcase.projects.filter((_, i) => i !== index);
                            setContent({ ...content, showcase: { projects: newProjects } });
                          }}
                          uploadImage={uploadImage}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhum projeto adicionado ainda</p>
                  </div>
                )}
                
                <Button
                  onClick={async () => {
                    // Upload imagem primeiro
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        try {
                          const url = await uploadImage(file);
                          const newProject: Project = {
                            image: url,
                            tipo: 'Residencial',
                            localizacao: '',
                            modulos: 0,
                            potenciaModulo: 0,
                            economia: 0,
                          };
                          setContent({
                            ...content,
                            showcase: { 
                              projects: [...(content.showcase.projects || []), newProject] 
                            },
                          });
                          toast({ title: 'Projeto adicionado', description: 'Complete os dados do projeto' });
                        } catch {
                          toast({ title: 'Erro', description: 'Falha no upload', variant: 'destructive' });
                        }
                      }
                    };
                    input.click();
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Projeto
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Como Funciona */}
          <TabsContent value="howItWorks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Seção Como Funciona</CardTitle>
                <CardDescription>Imagem do diagrama do sistema solar</CardDescription>
              </CardHeader>
              <CardContent>
                <ImageUploader
                  label="Imagem do Diagrama"
                  value={content.howItWorks?.image || ''}
                  onChange={(url) => setContent({ 
                    ...content, 
                    howItWorks: { image: url } 
                  })}
                  onDelete={() => setContent({ 
                    ...content, 
                    howItWorks: { image: '/solar-system-diagram.jpg' } 
                  })}
                  uploadImage={uploadImage}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prova Social */}
          <TabsContent value="proofBar" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Seção Prova Social</CardTitle>
                <CardDescription>Imagem das avaliações do Google</CardDescription>
              </CardHeader>
              <CardContent>
                <ImageUploader
                  label="Imagem das Avaliações Google"
                  value={content.proofBar?.image || ''}
                  onChange={(url) => setContent({ 
                    ...content, 
                    proofBar: { image: url } 
                  })}
                  onDelete={() => setContent({ 
                    ...content, 
                    proofBar: { image: '/google-reviews.png' } 
                  })}
                  uploadImage={uploadImage}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Serviço Completo */}
          <TabsContent value="fullService" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Seção Serviço Completo</CardTitle>
                <CardDescription>Imagem dos painéis solares</CardDescription>
              </CardHeader>
              <CardContent>
                <ImageUploader
                  label="Imagem dos Painéis Solares"
                  value={content.fullService?.image || ''}
                  onChange={(url) => setContent({ 
                    ...content, 
                    fullService: { image: url } 
                  })}
                  onDelete={() => setContent({ 
                    ...content, 
                    fullService: { image: '/solar-panels-angle.png' } 
                  })}
                  uploadImage={uploadImage}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Studio;
