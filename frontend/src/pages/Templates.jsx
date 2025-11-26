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
  Copy
} from 'lucide-react';
import FileUpload from '@/components/ui/FileUpload';
import FeedbackBanner from '@/components/FeedbackBanner';
import { useFeedback } from '@/hooks/useFeedback';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/ui/ToastProvider';

const typeIcons = {
  text: FileText,
  image: Image,
  video: Video,
  audio: Music,
  document: File
};

const typeLabels = {
  text: 'Texto',
  image: 'Imagem',
  video: 'Vídeo',
  audio: 'Áudio',
  document: 'Documento'
};

const typeColors = {
  text: 'default',
  image: 'success',
  video: 'warning',
  audio: 'secondary',
  document: 'destructive'
};

const mimeByType = {
  text: 'text/plain',
  image: 'image/jpeg',
  video: 'video/mp4',
  audio: 'audio/mpeg',
  document: 'application/pdf'
};

export default function Templates() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    message_type: 'text',
    text_content: '',
    media_url: '',
    preview_url: ''
  });
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
      preview_url: ''
    });
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      message_type: template.message_type,
      text_content: template.text_content,
      media_url: template.media_url || '',
      preview_url: template.media_url || ''
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

    // Validação
    if (formData.message_type !== 'text' && !formData.media_url) {
      showFeedback('error', 'URL da mídia é obrigatória para tipos que não são texto');
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
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Template
          </Button>
        )}
      </div>

      <FeedbackBanner feedback={feedback} onDismiss={dismissFeedback} />

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>
              {editingTemplate ? 'Editar Template' : 'Novo Template'}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
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
                <select
                  id="message_type"
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.message_type}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      message_type: e.target.value,
                      media_url: e.target.value === 'text' ? '' : formData.media_url
                    });
                  }}
                  required
                >
                  <option value="text">Texto</option>
                  <option value="image">Imagem</option>
                  <option value="video">Vídeo</option>
                  <option value="audio">Áudio</option>
                  <option value="document">Documento</option>
                </select>
              </div>

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

              {formData.message_type !== 'text' && (
                <div>
                  <Label htmlFor="media_url">Mídia *</Label>
                  <FileUpload
                    onFileUploaded={(url, preview) =>
                      setFormData((prev) => ({
                        ...prev,
                        media_url: url,
                        preview_url: preview || url
                      }))
                    }
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
                  {formData.media_url && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Arquivo carregado com sucesso
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Salvando...'
                    : editingTemplate
                    ? 'Atualizar'
                    : 'Criar'}
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
              <div className="flex justify-center lg:justify-end">
                <div className="w-full max-w-xs rounded-[32px] border-[14px] border-black bg-black shadow-2xl overflow-hidden">
                  <div className="h-8 border-b border-white/10 flex items-center justify-between px-6 text-white text-xs opacity-70">
                    <span>18:34</span>
                    <div className="flex gap-1 items-center">
                      <span>5G</span>
                      <span>100%</span>
                    </div>
                  </div>
                  <div className="bg-[#ECE5DD] min-h-[520px] px-3 pb-6 pt-4 flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-full bg-[#34B7F1] flex items-center justify-center text-white text-sm font-semibold">
                        GC
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#075E54]">
                          Growth Concept
                        </div>
                        <div className="text-[11px] text-[#667781]">
                          online
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex justify-center">
                        <div className="text-[10px] px-3 py-1 rounded-full bg-white text-[#54656F] border border-[#D1D7DB]">
                          Hoje
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <div className="relative max-w-[80%] bg-[#DCF7C5] text-[#111B21] px-3 py-2.5 rounded-2xl rounded-br-sm shadow-sm border border-[#D1E7C5] space-y-2">
                          {formData.message_type !== 'text' && formData.preview_url && (
                            <>
                              {formData.message_type === 'image' && (
                                <img
                                  src={formData.preview_url}
                                  alt="preview"
                                  className="rounded-xl max-h-40 max-w-full object-contain bg-white"
                                />
                              )}
                              {formData.message_type === 'video' && (
                                <video
                                  src={formData.preview_url}
                                  controls
                                  className="rounded-xl max-h-40 max-w-full object-contain bg-black"
                                />
                              )}
                              {formData.message_type === 'audio' && (
                                <audio controls className="w-full">
                                  <source src={formData.preview_url} type="audio/mpeg" />
                                  Seu navegador não suporta áudio.
                                </audio>
                              )}
                              {formData.message_type === 'document' && (
                                <div className="flex items-center gap-2 text-sm text-[#111B21]/80">
                                  <File className="h-4 w-4" />
                                  <span>Documento anexado</span>
                                </div>
                              )}
                            </>
                          )}
                          <p className="text-sm whitespace-pre-line">
                            {formData.text_content
                              ? formData.text_content
                              : 'Digite a mensagem do template para visualizar a prévia'}
                          </p>
                          <div className="flex items-center justify-end gap-1 text-[10px] text-[#4F7E67]">
                            <span>18:34</span>
                            <span>✓✓</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : !templatesList || templatesList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Nenhum template encontrado. Crie seu primeiro template!
            </p>
            {!showForm && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Template
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templatesList.map((template) => {
            const Icon = typeIcons[template.message_type] || FileText;
            
            return (
              <Card key={template.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                    </div>
                    <Badge variant={typeColors[template.message_type]}>
                      {typeLabels[template.message_type]}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDuplicateClick(template)}
                      disabled={duplicateMutation.isPending}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(template)}
                      disabled={
                        deleteMutation.isPending && deleteDialog.template?.id === template.id
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Conteúdo:</p>
                    <p className="text-sm line-clamp-3">
                      {template.text_content || '(sem texto)'}
                    </p>
                  </div>
                  
                  {template.message_type !== 'text' && template.media_url && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground mb-1">Mídia:</p>
                      {template.message_type === 'image' && (
                        <img
                          src={template.media_url}
                          alt="Preview"
                          className="w-full max-h-48 object-contain rounded-md border bg-white"
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

                  <div className="pt-2 border-t text-xs text-muted-foreground">
                    Criado em: {new Date(template.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>

      {duplicateDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Duplicar template
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
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
