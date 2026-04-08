import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { templates } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  Image,
  Video,
  Music,
  File,
  X,
  Copy,
  Loader2,
  Eye,
  User,
  Menu,
  LayoutGrid,
  AlertTriangle,
  Search,
  ArrowUpDown
} from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import InteractiveMenuForm from '@/components/templates/InteractiveMenuForm';
import CarouselForm from '@/components/templates/CarouselForm';
import FileUpload from '@/components/ui/FileUpload';
import FeedbackBanner from '@/components/FeedbackBanner';
import { useFeedback } from '@/hooks/useFeedback';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/ui/ToastProvider';
import TemplatePreview from '@/components/TemplatePreview';
import { useAuth } from '@/hooks/useAuth';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';

const typeIcons = {
  text: FileText,
  image: Image,
  video: Video,
  audio: Music,
  document: File,
  interactive_menu: Menu,
  carousel: LayoutGrid
};

const typeLabels = {
  text: 'Texto',
  image: 'Imagem',
  video: 'Vídeo',
  audio: 'Áudio',
  document: 'Documento',
  interactive_menu: 'Menu Interativo',
  carousel: 'Carrossel'
};

const typeColors = {
  text: 'default',
  image: 'success',
  video: 'warning',
  audio: 'secondary',
  document: 'destructive',
  interactive_menu: 'warning',
  carousel: 'success'
};

const INTERACTIVE_TYPES = new Set(['interactive_menu', 'carousel']);

const mimeByType = {
  text: 'text/plain',
  image: 'image/jpeg',
  video: 'video/mp4',
  audio: 'audio/mpeg',
  document: 'application/pdf'
};

export default function Templates() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    message_type: 'text',
    text_content: '',
    media_url: '',
    preview_url: '',
    interactive_content: null
  });
  const [isUploading, setIsUploading] = useState(false);
  const { feedback, showFeedback, dismissFeedback } = useFeedback();
  const { toast } = useToast();
  const [duplicateDialog, setDuplicateDialog] = useState({
    open: false,
    name: '',
    template: null
  });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    template: null
  });
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  const { data: templatesList, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const response = await templates.list();
      return response.data.templates;
    }
  });

  const createMutation = useMutation({
    mutationFn: templates.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['templates']);
      setShowForm(false);
      resetForm();
      showFeedback('success', 'Template criado com sucesso!');
    },
    onError: (error) => {
      console.error('Create error:', error);
      showFeedback('error', 'Erro ao criar template: ' + (error.response?.data?.error || error.message));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => templates.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['templates']);
      setShowForm(false);
      setEditingTemplate(null);
      resetForm();
      showFeedback('success', 'Template atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Update error:', error);
      showFeedback('error', 'Erro ao atualizar template: ' + (error.response?.data?.error || error.message));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }) => templates.delete(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['templates']);
      toast({
        title: 'Template excluído',
        description: `O template "${variables?.name ?? 'sem nome'}" foi removido com sucesso.`,
        variant: 'success'
      });
      setDeleteDialog({ open: false, template: null });
    },
    onError: (error, variables) => {
      console.error('Delete error:', error);
      toast({
        title: 'Erro ao excluir template',
        description: error.response?.data?.error || error.message || 'Não foi possível remover o template.',
        variant: 'destructive'
      });
      setDeleteDialog((prev) => ({ ...prev, open: false }));
    }
  });

  const duplicateMutation = useMutation({
    mutationFn: ({ id, data }) => templates.duplicate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['templates']);
      setDuplicateDialog({ open: false, name: '', template: null });
      showFeedback('success', 'Template duplicado com sucesso!');
    },
    onError: (error) => {
      console.error('Duplicate error:', error);
      showFeedback('error', 'Erro ao duplicar template: ' + (error.response?.data?.error || error.message));
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      message_type: 'text',
      text_content: '',
      media_url: '',
      preview_url: '',
      interactive_content: null
    });
    setIsUploading(false);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      message_type: template.message_type,
      text_content: template.text_content,
      media_url: template.media_url || '',
      preview_url: template.media_url || '',
      interactive_content: template.interactive_content || null
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTemplate(null);
    resetForm();
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validação - CRÍTICO: Verificar se está fazendo upload
    if (isUploading) {
      showFeedback('error', 'Aguarde o upload do arquivo terminar antes de criar o template');
      return;
    }

    // Validação - Verificar se precisa de mídia
    const needsMedia = !INTERACTIVE_TYPES.has(formData.message_type) && formData.message_type !== 'text';
    if (needsMedia && !formData.media_url) {
      showFeedback('error', 'Por favor, faça upload do arquivo de mídia primeiro');
      return;
    }

    if (editingTemplate) {
      updateMutation.mutate({
        id: editingTemplate.id,
        data: formData
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Handler para quando o upload começa
  const handleUploadStart = () => {
    setIsUploading(true);
  };

  // Handler para quando o upload termina (sucesso ou erro)
  const handleUploadComplete = (url, preview) => {
    setIsUploading(false);
    if (url) {
      setFormData((prev) => ({
        ...prev,
        media_url: url,
        preview_url: preview || url
      }));
    } else {
      // Arquivo foi removido
      setFormData((prev) => ({
        ...prev,
        media_url: '',
        preview_url: ''
      }));
    }
  };

  // Handler para quando o upload falha
  const handleUploadError = () => {
    setIsUploading(false);
    setFormData((prev) => ({
      ...prev,
      media_url: '',
      preview_url: ''
    }));
  };

  const handleDeleteClick = (template) => {
    setDeleteDialog({
      open: true,
      template
    });
  };

  const handleDeleteConfirm = () => {
    if (!deleteDialog.template) return;
    deleteMutation.mutate({
      id: deleteDialog.template.id,
      name: deleteDialog.template.name
    });
  };

  const handleDeleteCancel = () => {
    if (deleteMutation.isPending) return;
    setDeleteDialog({ open: false, template: null });
  };

  const handleDuplicateClick = (template) => {
    setDuplicateDialog({
      open: true,
      template,
      name: `${template.name} (cópia)`
    });
  };

  const handleDuplicateConfirm = () => {
    if (!duplicateDialog.template) return;
    const trimmedName = duplicateDialog.name.trim();
    const payload = trimmedName ? { name: trimmedName } : {};
    duplicateMutation.mutate({
      id: duplicateDialog.template.id,
      data: payload
    });
  };

  const handleDuplicateCancel = () => {
    if (duplicateMutation.isPending) return;
    setDuplicateDialog({ open: false, name: '', template: null });
  };

  const handlePreviewClick = (template) => {
    setPreviewTemplate(template);
  };

  const handlePreviewClose = () => {
    setPreviewTemplate(null);
  };

  const filteredTemplates = (templatesList ?? [])
    .filter((t) => {
      const matchesSearch = search.trim() === '' ||
        t.name.toLowerCase().includes(search.trim().toLowerCase());
      const matchesType = filterType === 'all' ||
        (filterType === 'interactive' ? INTERACTIVE_TYPES.has(t.message_type) : t.message_type === filterType);
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (sortOrder === 'newest') return new Date(b.created_at) - new Date(a.created_at);
      if (sortOrder === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
      if (sortOrder === 'name') return a.name.localeCompare(b.name, 'pt-BR');
      return 0;
    });

  const typePills = [
    { value: 'all', label: 'Todos' },
    { value: 'text', label: 'Texto', icon: FileText },
    { value: 'image', label: 'Imagem', icon: Image },
    { value: 'video', label: 'Vídeo', icon: Video },
    { value: 'audio', label: 'Áudio', icon: Music },
    { value: 'document', label: 'Documento', icon: File },
    { value: 'interactive', label: 'Interativos', icon: Menu }
  ];

  return (
    <>
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground">
            Gerencie seus templates de mensagens
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Template
        </Button>
      </div>

      <FeedbackBanner feedback={feedback} onDismiss={dismissFeedback} />

      {/* Barra de busca + filtros */}
      <div className="space-y-3">
          <div className="flex items-center gap-3">
            {/* Campo de busca */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Ordenação */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-40 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Mais recentes</SelectItem>
                  <SelectItem value="oldest">Mais antigos</SelectItem>
                  <SelectItem value="name">Nome A–Z</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Contador de resultados */}
            {(search || filterType !== 'all') && (
              <span className="text-sm text-muted-foreground shrink-0">
                {filteredTemplates.length} resultado{filteredTemplates.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Pills de tipo */}
          <div className="flex flex-wrap gap-2">
            {typePills.map((pill) => {
              const PillIcon = pill.icon;
              const isActive = filterType === pill.value;
              return (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => setFilterType(pill.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                  }`}
                >
                  {PillIcon && <PillIcon className="h-3.5 w-3.5" />}
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>

      {/* Sheet de criação/edição de template */}
      <Sheet
        open={showForm}
        onClose={handleCancel}
        title={editingTemplate ? 'Editar Template' : 'Novo Template'}
        width="max-w-6xl"
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] items-start">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name">Nome do Template *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Ex: Promoção Black Friday"
              />
            </div>

            <div>
              <Label htmlFor="message_type">Tipo de Mensagem *</Label>
              <Select
                value={formData.message_type}
                onValueChange={(newType) => {
                  const noMedia = newType === 'text' || INTERACTIVE_TYPES.has(newType);
                  setFormData({
                    ...formData,
                    message_type: newType,
                    media_url: noMedia ? '' : formData.media_url,
                    preview_url: noMedia ? '' : formData.preview_url,
                    interactive_content: INTERACTIVE_TYPES.has(newType) ? (formData.interactive_content || null) : null
                  });
                  if (noMedia) setIsUploading(false);
                }}
              >
                <SelectTrigger id="message_type" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="text">Texto</SelectItem>
                    <SelectItem value="image">Imagem</SelectItem>
                    <SelectItem value="video">Vídeo</SelectItem>
                    <SelectItem value="audio">Áudio</SelectItem>
                    <SelectItem value="document">Documento</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Interativos (somente Uazapi)</SelectLabel>
                    <SelectItem value="interactive_menu">Menu Interativo</SelectItem>
                    <SelectItem value="carousel">Carrossel</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {INTERACTIVE_TYPES.has(formData.message_type) && (
              <div className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  <strong>Atenção:</strong> Botões interativos e menus podem ser descontinuados pelo WhatsApp sem aviso prévio. Tenha um template de texto alternativo para sua campanha.
                </span>
              </div>
            )}

            {formData.message_type === 'interactive_menu' && (
              <InteractiveMenuForm
                value={formData.interactive_content}
                onChange={(ic) => setFormData((prev) => ({ ...prev, interactive_content: ic }))}
                onUploadStart={handleUploadStart}
                onUploadEnd={() => setIsUploading(false)}
              />
            )}

            {formData.message_type === 'carousel' && (
              <CarouselForm
                value={formData.interactive_content}
                onChange={(ic) => setFormData((prev) => ({ ...prev, interactive_content: ic }))}
                onUploadStart={handleUploadStart}
                onUploadEnd={() => setIsUploading(false)}
              />
            )}

            {!INTERACTIVE_TYPES.has(formData.message_type) && (
              <div>
                <Label htmlFor="text_content">
                  {formData.message_type === 'text' ? 'Mensagem *' : 'Legenda'}
                </Label>
                <textarea
                  id="text_content"
                  className="w-full px-3 py-2 border rounded-md"
                  rows={6}
                  value={formData.text_content}
                  onChange={(e) => setFormData({ ...formData, text_content: e.target.value })}
                  required={formData.message_type === 'text'}
                  placeholder={
                    formData.message_type === 'text'
                      ? 'Digite sua mensagem...'
                      : 'Legenda para a mídia (opcional)'
                  }
                />
              </div>
            )}

            {formData.message_type !== 'text' && !INTERACTIVE_TYPES.has(formData.message_type) && (
              <div>
                <Label htmlFor="media_url">Mídia *</Label>
                <FileUpload
                  onFileUploaded={handleUploadComplete}
                  onUploadStart={handleUploadStart}
                  onUploadError={handleUploadError}
                  messageType={formData.message_type}
                  accept={
                    formData.message_type === 'image' ? 'image/*' :
                    formData.message_type === 'video' ? 'video/*' :
                    formData.message_type === 'audio' ? 'audio/*' :
                    '.pdf,.doc,.docx,.xls,.xlsx'
                  }
                  initialPreview={formData.preview_url}
                  initialMimeType={mimeByType[formData.message_type]}
                  initialName={formData.media_url ? formData.media_url.split('/').pop() : ''}
                />
                {isUploading && (
                  <p className="text-xs text-blue-600 mt-2 flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Enviando arquivo...
                  </p>
                )}
                {!isUploading && formData.media_url && (
                  <p className="text-xs text-green-600 mt-2">
                    ✓ Arquivo carregado com sucesso
                  </p>
                )}
                {!isUploading && !formData.media_url && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Selecione um arquivo para fazer upload
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2 pb-2">
              <Button
                type="submit"
                disabled={
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  isUploading ||
                  (!INTERACTIVE_TYPES.has(formData.message_type) && formData.message_type !== 'text' && !formData.media_url)
                }
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando arquivo...
                  </>
                ) : createMutation.isPending || updateMutation.isPending ? (
                  'Salvando...'
                ) : editingTemplate ? (
                  'Atualizar'
                ) : (
                  'Criar Template'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
              >
                Cancelar
              </Button>
            </div>
          </form>

          {/* Preview colado na coluna da direita */}
          <div className="hidden lg:flex justify-center pt-1 sticky top-0">
            <TemplatePreview
              messageType={formData.message_type}
              textContent={formData.text_content}
              previewUrl={formData.preview_url}
              interactiveContent={formData.interactive_content}
            />
          </div>
        </div>
      </Sheet>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-sm" />
                    <Skeleton className="h-5 w-36" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="h-8 w-8 rounded-md" />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
              </div>
              <div className="pt-2 border-t space-y-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          ))}
        </div>
      ) : !templatesList || templatesList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Nenhum template encontrado. Crie seu primeiro template!
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Template
            </Button>
          </CardContent>
        </Card>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-2">Nenhum template encontrado para os filtros aplicados.</p>
            <button
              type="button"
              onClick={() => { setSearch(''); setFilterType('all'); }}
              className="text-sm text-primary hover:underline"
            >
              Limpar filtros
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => {
            const Icon = typeIcons[template.message_type] || FileText;
            const isOwner = currentUser && template.user_id === currentUser.id;
            
            return (
              <Card key={template.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={typeColors[template.message_type]}>
                        {typeLabels[template.message_type]}
                      </Badge>
                      {!isOwner && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Compartilhado
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePreviewClick(template)}
                      title="Visualizar"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDuplicateClick(template)}
                      disabled={duplicateMutation.isPending}
                      title="Duplicar"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(template)}
                      disabled={!isOwner}
                      title={isOwner ? "Editar" : "Apenas o criador pode editar"}
                    >
                      <Edit className={`h-4 w-4 ${!isOwner ? 'opacity-30' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(template)}
                      disabled={
                        !isOwner ||
                        (deleteMutation.isPending && deleteDialog.template?.id === template.id)
                      }
                      title={isOwner ? "Excluir" : "Apenas o criador pode excluir"}
                    >
                      <Trash2 className={`h-4 w-4 text-destructive ${!isOwner ? 'opacity-30' : ''}`} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Conteúdo:</p>
                    {template.message_type === 'interactive_menu' && template.interactive_content ? (
                      <p className="text-sm text-muted-foreground">
                        Menu tipo: <span className="font-medium capitalize">{template.interactive_content.menuType}</span>
                        {' • '}
                        {template.interactive_content.choices?.length ?? 0} opções
                      </p>
                    ) : template.message_type === 'carousel' && template.interactive_content ? (
                      <p className="text-sm text-muted-foreground">
                        Carrossel • {template.interactive_content.cards?.length ?? 0} cards
                      </p>
                    ) : (
                      <p className="text-sm line-clamp-3">
                        {template.text_content || '(sem texto)'}
                      </p>
                    )}
                  </div>

                  {template.message_type !== 'text' && !INTERACTIVE_TYPES.has(template.message_type) && template.media_url && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground mb-1">Mídia:</p>
                      {template.message_type === 'image' && (
                        <img
                          src={template.media_url}
                          alt="Preview"
                          className="w-full max-h-48 object-contain rounded-md border bg-background"
                        />
                      )}
                      {template.message_type === 'video' && (
                        <video
                          src={template.media_url}
                          controls
                          className="w-full max-h-48 object-contain rounded-md border bg-black"
                        />
                      )}
                      {template.message_type === 'audio' && (
                        <audio controls className="w-full">
                          <source src={template.media_url} type="audio/mpeg" />
                          Seu navegador não suporta reprodução de áudio.
                        </audio>
                      )}
                      {template.message_type === 'document' && (
                        <a
                          href={template.media_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline truncate block"
                        >
                          {template.media_url}
                        </a>
                      )}
                    </div>
                  )}

                  <div className="pt-2 border-t space-y-1">
                    {template.user && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>
                          {isOwner ? 'Você' : template.user.name}
                        </span>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {(() => {
                        const rawDate = template.created_at || template.createdAt;
                        const date = rawDate ? new Date(rawDate) : null;
                        const isValid = date && !isNaN(date.getTime());
                        return `Criado em: ${isValid ? date.toLocaleDateString('pt-BR') : '-'}`;
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>

      {/* Modal de preview de template (estilo lightbox) */}
      {previewTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={handlePreviewClose}
        >
          <div
            className="relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handlePreviewClose}
              className="absolute -top-8 right-0 rounded-full bg-background/90 hover:bg-background text-foreground shadow-md p-1 transition"
            >
              <X className="h-4 w-4" />
            </button>
            <TemplatePreview
              messageType={previewTemplate.message_type}
              textContent={previewTemplate.text_content}
              previewUrl={previewTemplate.media_url || ''}
              interactiveContent={previewTemplate.interactive_content || null}
            />
          </div>
        </div>
      )}

      {duplicateDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl bg-background shadow-xl border p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  Duplicar template
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Escolha um nome para a cópia do template{' '}
                  <span className="font-semibold">{duplicateDialog.template?.name}</span>.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleDuplicateCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duplicate-name">Nome do novo template</Label>
              <Input
                id="duplicate-name"
                value={duplicateDialog.name}
                onChange={(e) =>
                  setDuplicateDialog((prev) => ({
                    ...prev,
                    name: e.target.value
                  }))
                }
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={handleDuplicateCancel}
                disabled={duplicateMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleDuplicateConfirm}
                disabled={duplicateMutation.isPending}
              >
                {duplicateMutation.isPending ? 'Duplicando...' : 'Duplicar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteDialog.open}
        title="Excluir template"
        description={
          deleteDialog.template
            ? `Tem certeza que deseja excluir o template "${deleteDialog.template.name}"?`
            : ''
        }
        confirmLabel="Excluir"
        tone="danger"
        loading={deleteMutation.isPending}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
