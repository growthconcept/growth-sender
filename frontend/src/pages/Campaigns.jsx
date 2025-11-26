import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaigns, connections, templates } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Plus, Pause, X, RotateCcw, Trash2, ChevronDown, File, Filter, XCircle, Eye } from 'lucide-react';
import FeedbackBanner from '@/components/FeedbackBanner';
import { useFeedback } from '@/hooks/useFeedback';
import ConfirmDialog from '@/components/ConfirmDialog';
import CampaignDetails from '@/components/CampaignDetails';

const statusColors = {
  scheduled: 'secondary',
  running: 'success',
  completed: 'default',
  paused: 'warning',
  cancelled: 'destructive',
  error: 'destructive',
  disconnected: 'destructive'
};

const statusLabels = {
  scheduled: 'Agendada',
  running: 'Em Execução',
  completed: 'Concluída',
  paused: 'Pausada',
  cancelled: 'Cancelada',
  error: 'Erro'
};

function SearchableSelect({
  id,
  label,
  placeholder,
  searchPlaceholder = 'Buscar...',
  items,
  value,
  onSelect,
  renderSubtitle
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (open) {
      const timeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 0);

      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSearchTerm('');
    }
  }, [open]);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) {
      return items;
    }

    const term = searchTerm.toLowerCase();
    return items.filter((item) => {
      const labelMatch = item.label?.toLowerCase().includes(term);
      const subtitleMatch = item.subtitle?.toLowerCase().includes(term);
      return labelMatch || subtitleMatch;
    });
  }, [items, searchTerm]);

  const selectedItem = items.find((item) => item.id === value);

  return (
    <div ref={containerRef} className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <span className={selectedItem ? '' : 'text-muted-foreground'}>
            {selectedItem ? selectedItem.label : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>

        {open && (
          <div className="absolute z-20 mt-2 w-full rounded-md border bg-popover shadow-lg">
            <div className="border-b p-2">
              <Input
                ref={inputRef}
                id={`${id}-search`}
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {filteredItems.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Nenhum resultado encontrado
                </div>
              ) : (
                filteredItems.map((item) => {
                  const isActive = item.id === value;
                  const subtitleText = renderSubtitle
                    ? renderSubtitle(item)
                    : item.subtitle;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelect(item.id);
                        setOpen(false);
                      }}
                      className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted ${
                        isActive ? 'bg-muted' : ''
                      }`}
                    >
                      <span className="font-medium">{item.label}</span>
                      {subtitleText ? (
                        <span className="text-xs text-muted-foreground">{subtitleText}</span>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Campaigns() {
  const queryClient = useQueryClient();
  const { feedback, showFeedback, dismissFeedback } = useFeedback();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    connection_id: '',
    template_id: '',
    recipient_type: 'contacts',
    recipients: '',
    selectedGroups: [], // Array de IDs de grupos selecionados
    message_interval: 30,
    pause_after_messages: '10',
    pause_duration_seconds: '60',
    scheduled_date: ''
  });
  const [groupsList, setGroupsList] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    type: null,
    campaign: null
  });
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    connection_id: '',
    user_id: '',
    date_from: '',
    date_to: ''
  });
  const [showFilters, setShowFilters] = useState(false);


  const { data: campaignsList, isLoading } = useQuery({
    queryKey: ['campaigns', filters],
    queryFn: async () => {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.connection_id) params.connection_id = filters.connection_id;
      if (filters.user_id) params.filter_user_id = filters.user_id;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      
      const response = await campaigns.list(params);
      return response.data.campaigns;
    },
    // Atualizar automaticamente a cada 3 segundos se houver campanhas em execução
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasRunning = data?.some((c) => c.status === 'running' || c.status === 'scheduled');
      return hasRunning ? 3000 : false; // 3 segundos se houver campanhas rodando, senão desabilitado
    },
    refetchIntervalInBackground: true // Continuar atualizando mesmo quando a aba não está ativa
  });

  const { data: allConnectionsList } = useQuery({
    queryKey: ['allConnections'],
    queryFn: async () => {
      // Buscar todas as conexões usando um limite alto (sem paginação)
      const response = await connections.list({ limit: 1000 }); // Limite alto para buscar todas
      console.log('All connections fetched:', response.data.connections?.length);
      return response.data.connections || [];
    },
    staleTime: 0, // Sempre buscar dados frescos
    cacheTime: 0 // Não usar cache
  });

  const { data: templatesList } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const response = await templates.list();
      return response.data.templates;
    }
  });

  // Buscar grupos quando conexão for selecionada e tipo for "group"
  useEffect(() => {
    const fetchGroups = async () => {
      if (formData.recipient_type === 'group' && formData.connection_id) {
        setLoadingGroups(true);
        try {
          const response = await connections.getGroups(formData.connection_id);
          const groups = response.data.groups || [];
          setGroupsList(groups);
        } catch (error) {
          console.error('Error fetching groups:', error);
          showFeedback('error', 'Erro ao buscar grupos: ' + (error.response?.data?.error || error.message));
          setGroupsList([]);
        } finally {
          setLoadingGroups(false);
        }
      } else {
        setGroupsList([]);
        setFormData(prev => ({ ...prev, selectedGroups: [] }));
      }
    };

    fetchGroups();
  }, [formData.connection_id, formData.recipient_type]);

  const createMutation = useMutation({
    mutationFn: campaigns.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['campaigns']);
      setShowCreateForm(false);
      setFormData({
        name: '',
        connection_id: '',
        template_id: '',
        recipient_type: 'contacts',
        recipients: '',
        selectedGroups: [],
        message_interval: 30,
        pause_after_messages: '10',
        pause_duration_seconds: '60',
        scheduled_date: ''
      });
      setGroupsList([]);
      showFeedback('success', 'Campanha criada com sucesso!');
    },
    onError: (error) => {
      console.error('Create error:', error);
      const errorMessage = error.response?.data?.error || error.message;
      const errorDetails = error.response?.data?.details;
      
      if (errorDetails && Array.isArray(errorDetails)) {
        const validationErrors = errorDetails.map(err => `• ${err.msg}`).join('\n');
        showFeedback('error', `Erros de validação:\n${validationErrors}`, 'Erro de validação');
      } else {
        showFeedback('error', 'Erro ao criar campanha: ' + errorMessage);
      }
    }
  });

  const pauseMutation = useMutation({
    mutationFn: campaigns.pause,
    onSuccess: () => {
      queryClient.invalidateQueries(['campaigns']);
      showFeedback('info', 'Campanha pausada.');
    },
    onError: (error) => {
      console.error('Pause error:', error);
      showFeedback('error', 'Erro ao pausar campanha: ' + (error.response?.data?.error || error.message));
    }
  });

  const cancelMutation = useMutation({
    mutationFn: campaigns.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries(['campaigns']);
      showFeedback('success', 'Campanha cancelada com sucesso!');
      setConfirmDialog({ open: false, type: null, campaign: null });
    },
    onError: (error) => {
      console.error('Cancel error:', error);
      showFeedback('error', 'Erro ao cancelar campanha: ' + (error.response?.data?.error || error.message));
      setConfirmDialog((prev) => ({ ...prev, open: false }));
    }
  });

  const resumeMutation = useMutation({
    mutationFn: campaigns.resume,
    onSuccess: () => {
      queryClient.invalidateQueries(['campaigns']);
      showFeedback('success', 'Campanha retomada.');
    },
    onError: (error) => {
      console.error('Resume error:', error);
      showFeedback('error', 'Erro ao retomar campanha: ' + (error.response?.data?.error || error.message));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: campaigns.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['campaigns']);
      showFeedback('success', 'Campanha excluída com sucesso!');
      setConfirmDialog({ open: false, type: null, campaign: null });
    },
    onError: (error) => {
      console.error('Delete campaign error:', error);
      showFeedback('error', 'Erro ao excluir campanha: ' + (error.response?.data?.error || error.message));
      setConfirmDialog((prev) => ({ ...prev, open: false }));
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.connection_id || !formData.template_id) {
      showFeedback('error', 'Selecione uma conexão e um template');
      return;
    }

    let recipients = [];
    
    if (formData.recipient_type === 'group') {
      recipients = formData.selectedGroups;
      if (recipients.length === 0) {
        showFeedback('error', 'Selecione pelo menos um grupo');
        return;
      }
    } else {
      recipients = formData.recipients
        .split('\n')
        .map(r => r.trim().replace(/\D/g, ''))
        .filter(r => r.length > 0);
      
      if (recipients.length === 0) {
        showFeedback('error', 'Adicione pelo menos um destinatário');
        return;
      }
    }

    // Preparar payload com apenas os campos necessários
    const payload = {
      name: formData.name,
      connection_id: formData.connection_id,
      template_id: formData.template_id,
      recipient_type: formData.recipient_type || 'contacts', // Garantir que sempre tenha valor
      recipients: recipients,
    message_interval: parseInt(formData.message_interval) || 30,
    pause_after_messages: parseInt(formData.pause_after_messages, 10) || null,
    pause_duration_seconds: parseInt(formData.pause_duration_seconds, 10) || null
    };

    // Adicionar scheduled_date apenas se tiver valor
    if (formData.scheduled_date && formData.scheduled_date.trim() !== '') {
      // Converter para formato ISO se necessário
      const date = new Date(formData.scheduled_date);
      if (!isNaN(date.getTime())) {
        payload.scheduled_date = date.toISOString();
      }
    }

    console.log('Sending payload:', payload); // Para debug

    createMutation.mutate(payload);
  };

  const connectionOptions = useMemo(
    () =>
      (allConnectionsList || []).map((conn) => ({
        id: conn.id,
        label: conn.instance_name || 'Conexão sem nome',
        subtitle: conn.phone_number || ''
      })),
    [allConnectionsList]
  );
  const templateOptions = useMemo(
    () =>
      (templatesList || []).map((template) => ({
        id: template.id,
        label: template.name,
        subtitle: template.message_type
      })),
    [templatesList]
  );

  const selectedTemplate = useMemo(() => {
    if (!formData.template_id || !templatesList) return null;
    return templatesList.find((t) => t.id === formData.template_id);
  }, [formData.template_id, templatesList]);

  // Extrair usuários únicos das campanhas
  const uniqueUsers = useMemo(() => {
    if (!campaignsList) return [];
    const userMap = new Map();
    campaignsList.forEach((campaign) => {
      if (campaign.user && !userMap.has(campaign.user.id)) {
        userMap.set(campaign.user.id, campaign.user);
      }
    });
    return Array.from(userMap.values());
  }, [campaignsList]);

  const connectionFilterOptions = useMemo(
    () =>
      (allConnectionsList || []).map((conn) => ({
        id: conn.id,
        label: conn.instance_name || 'Conexão sem nome',
        subtitle: conn.phone_number || ''
      })),
    [allConnectionsList]
  );

  const userFilterOptions = useMemo(
    () =>
      uniqueUsers.map((user) => ({
        id: user.id,
        label: user.name,
        subtitle: user.email
      })),
    [uniqueUsers]
  );

  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.status ||
      filters.connection_id ||
      filters.user_id ||
      filters.date_from ||
      filters.date_to
    );
  }, [filters]);

  const handleClearFilters = () => {
    setFilters({
      status: '',
      connection_id: '',
      user_id: '',
      date_from: '',
      date_to: ''
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Campanhas</h1>
        <p className="text-muted-foreground">
          Crie e gerencie suas campanhas de disparo
        </p>
      </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Campanha
        </Button>
      </div>

      <FeedbackBanner feedback={feedback} onDismiss={dismissFeedback} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg">Filtros</CardTitle>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-xs"
              >
                <XCircle className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Ocultar' : 'Filtros'}
            </Button>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="filter_status">Status</Label>
                <select
                  id="filter_status"
                  className="w-full px-3 py-2 border rounded-md"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">Todos</option>
                  <option value="scheduled">Agendada</option>
                  <option value="running">Em Execução</option>
                  <option value="completed">Concluída</option>
                  <option value="paused">Pausada</option>
                  <option value="cancelled">Cancelada</option>
                  <option value="error">Erro</option>
                </select>
              </div>

              <div>
                <Label htmlFor="filter_connection">Conexão</Label>
                <div className="space-y-2">
                  <div className="relative">
                    <SearchableSelect
                      id="filter_connection"
                      placeholder="Todas as conexões"
                      items={connectionFilterOptions}
                      value={filters.connection_id}
                      onSelect={(id) => setFilters({ ...filters, connection_id: id === filters.connection_id ? '' : id })}
                      renderSubtitle={(item) =>
                        item.subtitle ? `WhatsApp: ${item.subtitle}` : ''
                      }
                    />
                  </div>
                  {filters.connection_id && (
                    <button
                      type="button"
                      onClick={() => setFilters({ ...filters, connection_id: '' })}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <XCircle className="h-3 w-3" />
                      Limpar conexão
                    </button>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="filter_user">Usuário</Label>
                <div className="space-y-2">
                  <div className="relative">
                    <SearchableSelect
                      id="filter_user"
                      placeholder="Todos os usuários"
                      items={userFilterOptions}
                      value={filters.user_id}
                      onSelect={(id) => setFilters({ ...filters, user_id: id === filters.user_id ? '' : id })}
                      renderSubtitle={(item) => item.subtitle || ''}
                    />
                  </div>
                  {filters.user_id && (
                    <button
                      type="button"
                      onClick={() => setFilters({ ...filters, user_id: '' })}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <XCircle className="h-3 w-3" />
                      Limpar usuário
                    </button>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="filter_date_from">Data Inicial</Label>
                <Input
                  id="filter_date_from"
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="filter_date_to">Data Final</Label>
                <Input
                  id="filter_date_to"
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nova Campanha</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name">Nome da Campanha *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Ex: Campanha de Promoção"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SearchableSelect
                  id="connection_id"
                  label="Conexão *"
                  placeholder="Selecione uma conexão"
                  items={connectionOptions}
                  value={formData.connection_id}
                  onSelect={(id) => setFormData((prev) => ({ ...prev, connection_id: id }))}
                  renderSubtitle={(item) =>
                    item.subtitle ? `WhatsApp: ${item.subtitle}` : ''
                  }
                />

                <SearchableSelect
                  id="template_id"
                  label="Template *"
                  placeholder="Selecione um template"
                  items={templateOptions}
                  value={formData.template_id}
                  onSelect={(id) => setFormData((prev) => ({ ...prev, template_id: id }))}
                  renderSubtitle={(item) => `Tipo: ${item.subtitle}`}
                />
              </div>

              <div>
                <Label htmlFor="recipient_type">Tipo de Destinatário *</Label>
                <select
                  id="recipient_type"
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.recipient_type}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      recipient_type: e.target.value,
                      recipients: '',
                      selectedGroups: []
                    });
                  }}
                  required
                >
                  <option value="contacts">Contatos</option>
                  <option value="group">Grupo</option>
                </select>
              </div>

              {formData.recipient_type === 'contacts' ? (
                <div>
                  <Label htmlFor="recipients">Destinatários *</Label>
                  <textarea
                    id="recipients"
                    className="w-full px-3 py-2 border rounded-md font-mono"
                    rows={6}
                    value={formData.recipients}
                    onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                    required
                    placeholder="5511999999999&#10;5511888888888"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Um número por linha (código do país + DDD + número)
                  </p>
                </div>
              ) : (
                <div>
                  <Label htmlFor="groups">Selecione os Grupos *</Label>
                  {!formData.connection_id ? (
                    <div className="w-full px-3 py-2 border rounded-md bg-muted text-muted-foreground">
                      Selecione uma conexão primeiro
                    </div>
                  ) : loadingGroups ? (
                    <div className="w-full px-3 py-2 border rounded-md text-center text-muted-foreground">
                      Carregando grupos...
                    </div>
                  ) : groupsList.length === 0 ? (
                    <div className="w-full px-3 py-2 border rounded-md bg-muted text-muted-foreground">
                      Nenhum grupo encontrado para esta conexão
                    </div>
                  ) : (
                    <div className="w-full border rounded-md max-h-60 overflow-y-auto">
                      {groupsList.map((group) => {
                        // Priorizar jid (formato padrão do WhatsApp para grupos), depois id, depois groupId
                        const groupId = group.jid || group.id || group.groupId;
                        const groupName = group.subject || group.name || groupId;
                        const isSelected = formData.selectedGroups.includes(groupId);
                        
                        return (
                          <div
                            key={groupId}
                            className={`px-3 py-2 border-b last:border-b-0 cursor-pointer hover:bg-muted ${
                              isSelected ? 'bg-primary/10' : ''
                            }`}
                            onClick={() => {
                              setFormData(prev => {
                                const newSelected = isSelected
                                  ? prev.selectedGroups.filter(id => id !== groupId)
                                  : [...prev.selectedGroups, groupId];
                                return { ...prev, selectedGroups: newSelected };
                              });
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{groupName}</span>
                              {isSelected && (
                                <span className="text-primary text-sm">✓ Selecionado</span>
                              )}
                            </div>
                            {group.participants && (
                              <span className="text-xs text-muted-foreground">
                                {group.participants.length} participantes
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {formData.selectedGroups.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {formData.selectedGroups.length} grupo(s) selecionado(s)
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="message_interval">Intervalo entre mensagens (segundos) *</Label>
                  <Input
                    id="message_interval"
                    type="number"
                    min="10"
                    value={formData.message_interval}
                    onChange={(e) => setFormData({ ...formData, message_interval: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="pause_after_messages">Pausar após</Label>
                  <select
                    id="pause_after_messages"
                    className="w-full px-3 py-2 border rounded-md"
                    value={formData.pause_after_messages}
                    onChange={(e) => setFormData({ ...formData, pause_after_messages: e.target.value })}
                  >
                    {[5, 10, 15, 20, 25, 30].map((option) => (
                      <option key={option} value={option}>
                        {option} mensagens
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="pause_duration_seconds">Pausar por</Label>
                  <select
                    id="pause_duration_seconds"
                    className="w-full px-3 py-2 border rounded-md"
                    value={formData.pause_duration_seconds}
                    onChange={(e) => setFormData({ ...formData, pause_duration_seconds: e.target.value })}
                  >
                    {[30, 45, 60, 90, 120].map((option) => (
                      <option key={option} value={option}>
                        {option} segundos
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="scheduled_date">Data Agendada (opcional)</Label>
                <Input
                  id="scheduled_date"
                  type="datetime-local"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Criando...' : 'Criar Campanha'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
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
                          {selectedTemplate && selectedTemplate.message_type !== 'text' && selectedTemplate.media_url && (
                            <>
                              {selectedTemplate.message_type === 'image' && (
                                <img
                                  src={selectedTemplate.media_url}
                                  alt="preview"
                                  className="rounded-xl max-h-40 max-w-full object-contain bg-white"
                                />
                              )}
                              {selectedTemplate.message_type === 'video' && (
                                <video
                                  src={selectedTemplate.media_url}
                                  controls
                                  className="rounded-xl max-h-40 max-w-full object-contain bg-black"
                                />
                              )}
                              {selectedTemplate.message_type === 'audio' && (
                                <audio controls className="w-full">
                                  <source src={selectedTemplate.media_url} type="audio/mpeg" />
                                  Seu navegador não suporta áudio.
                                </audio>
                              )}
                              {selectedTemplate.message_type === 'document' && (
                                <div className="flex items-center gap-2 text-sm text-[#111B21]/80">
                                  <File className="h-4 w-4" />
                                  <span>Documento anexado</span>
                                </div>
                              )}
                            </>
                          )}
                          <p className="text-sm whitespace-pre-line">
                            {selectedTemplate?.text_content
                              ? selectedTemplate.text_content
                              : 'Selecione um template para visualizar a prévia'}
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
      ) : !campaignsList || campaignsList.length === 0 ? (
      <Card>
        <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Nenhuma campanha encontrada. Crie sua primeira campanha!
          </p>
        </CardContent>
      </Card>
      ) : (
        <div className="space-y-4">
          {campaignsList.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-lg">{campaign.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusColors[campaign.status]}>
                      {statusLabels[campaign.status]}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {campaign.sent_count || 0} enviadas / {campaign.error_count || 0} erros
                    </span>
                  </div>
                  {(() => {
                    const recipientsArray = Array.isArray(campaign.recipients)
                      ? campaign.recipients
                      : typeof campaign.recipients === 'string'
                      ? (() => {
                          try {
                            const parsed = JSON.parse(campaign.recipients);
                            return Array.isArray(parsed) ? parsed : [];
                          } catch {
                            return campaign.recipients
                              .split(',')
                              .map((item) => item.trim())
                              .filter(Boolean);
                          }
                        })()
                      : [];

                    const totalRecipients = recipientsArray.length;
                    const processed = (campaign.sent_count || 0) + (campaign.error_count || 0);
                    const percent = totalRecipients > 0 ? Math.min(100, Math.round((processed / totalRecipients) * 100)) : 0;

                    if (totalRecipients === 0) {
                      return null;
                    }

                    return (
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            {processed}/{totalRecipients} mensagens processadas
                          </span>
                          <span>{percent}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-primary transition-all"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSelectedCampaignId(campaign.id)}
                    title="Ver detalhes"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {campaign.status === 'running' && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => pauseMutation.mutate(campaign.id)}
                    >
                      <Pause className="h-4 w-4" />
                    </Button>
                  )}
                  {campaign.status === 'paused' && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => resumeMutation.mutate(campaign.id)}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                  {(campaign.status === 'running' || campaign.status === 'paused' || campaign.status === 'scheduled') && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setConfirmDialog({
                          open: true,
                          type: 'cancel',
                          campaign
                        })
                      }
                      disabled={
                        cancelMutation.isPending &&
                        confirmDialog.type === 'cancel' &&
                        confirmDialog.campaign?.id === campaign.id
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {campaign.status !== 'running' && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setConfirmDialog({
                          open: true,
                          type: 'delete',
                          campaign
                        })
                      }
                      disabled={
                        deleteMutation.isPending &&
                        confirmDialog.type === 'delete' &&
                        confirmDialog.campaign?.id === campaign.id
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Conexão:</span>
                    <p className="font-medium">{campaign.connection?.instance_name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Template:</span>
                    <p className="font-medium">{campaign.template?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Destinatários:</span>
                    <p className="font-medium">{campaign.recipients?.length || 0}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Intervalo:</span>
                    <p className="font-medium">{campaign.message_interval}s</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Criado por:</span>
                    <p className="font-medium">{campaign.user?.name || 'N/A'}</p>
                  </div>
                </div>
                {campaign.pause_after_messages && campaign.pause_duration_seconds && (
                  <div className="mt-4 text-sm text-muted-foreground">
                    Pausa configurada: a cada{' '}
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {campaign.pause_after_messages} mensagens
                    </span>{' '}
                    aguardar{' '}
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {campaign.pause_duration_seconds} segundos
                    </span>
                    .
                  </div>
                )}
                {campaign.started_at && (
                  <div className="mt-4 text-sm text-muted-foreground">
                    Iniciada em: {new Date(campaign.started_at).toLocaleString('pt-BR')}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        title={
          confirmDialog.type === 'cancel'
            ? 'Cancelar campanha'
            : confirmDialog.type === 'delete'
              ? 'Excluir campanha'
              : ''
        }
        description={
          confirmDialog.campaign
            ? `Tem certeza que deseja ${
                confirmDialog.type === 'cancel' ? 'cancelar' : 'excluir'
              } a campanha "${confirmDialog.campaign.name}"?`
            : ''
        }
        confirmLabel={confirmDialog.type === 'delete' ? 'Excluir' : 'Confirmar'}
        tone={confirmDialog.type === 'delete' ? 'danger' : 'warning'}
        loading={
          confirmDialog.type === 'delete'
            ? deleteMutation.isPending
            : confirmDialog.type === 'cancel'
              ? cancelMutation.isPending
              : false
        }
        onCancel={() => {
          if (deleteMutation.isPending || cancelMutation.isPending) return;
          setConfirmDialog({ open: false, type: null, campaign: null });
        }}
        onConfirm={() => {
          if (!confirmDialog.campaign) return;
          if (confirmDialog.type === 'cancel') {
            cancelMutation.mutate(confirmDialog.campaign.id);
          } else if (confirmDialog.type === 'delete') {
            deleteMutation.mutate(confirmDialog.campaign.id);
          }
        }}
      />

      <CampaignDetails
        campaignId={selectedCampaignId}
        open={!!selectedCampaignId}
        onClose={() => setSelectedCampaignId(null)}
      />
    </div>
  );
}
