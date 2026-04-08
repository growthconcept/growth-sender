import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaigns, connections, templates } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Plus, Pause, X, RotateCcw, Trash2, ChevronDown, File, Filter, XCircle, Eye, Upload, CheckCircle2, Download, ChevronRight, ChevronLeft, Check, Wifi, FileText, Users, Clock, Calendar, Tag, Megaphone, Settings2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import TemplatePreview from '@/components/TemplatePreview';

const VALID_PHONE_RE = /^\d{10,13}$/;

function parsePhoneNumbers(text) {
  return text
    .split('\n')
    .map((r) => r.trim().replace(/\D/g, ''))
    .filter((r) => VALID_PHONE_RE.test(r));
}

function parseCsvPhones(csvText) {
  return csvText
    .split('\n')
    .map((line) => line.split(',')[0].trim().replace(/\D/g, ''))
    .filter((r) => VALID_PHONE_RE.test(r));
}
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
    <div ref={containerRef} className="space-y-1.5">
      {label != null && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={[
            'flex w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            'focus:outline-none focus-visible:outline-none',
            open ? 'border-primary' : 'border-input',
          ].join(' ')}
        >
          <span className={selectedItem ? 'text-foreground' : 'text-muted-foreground'}>
            {selectedItem ? selectedItem.label : placeholder}
          </span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md">
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
                  const subtitleText = renderSubtitle ? renderSubtitle(item) : item.subtitle;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelect(item.id);
                        setOpen(false);
                      }}
                      className={`flex w-full items-start justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                        isActive ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium truncate">{item.label}</span>
                        {subtitleText ? (
                          <span className="text-xs text-muted-foreground truncate">{subtitleText}</span>
                        ) : null}
                      </div>
                      {isActive && <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
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

function WizardSteps({ currentStep }) {
  const steps = [
    { number: 1, label: 'Template' },
    { number: 2, label: 'Destinatários' },
    { number: 3, label: 'Configuração' },
    { number: 4, label: 'Revisão' },
  ];

  return (
    <div className="flex items-center mb-8 px-1">
      {steps.flatMap((step, index) => {
        const isCompleted = currentStep > step.number;
        const isActive = currentStep === step.number;
        const items = [
          <div key={`step-${step.number}`} className="flex flex-col items-center gap-2 shrink-0">
            <div
              className={[
                'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground border-primary ring-4 ring-primary/15'
                  : isCompleted
                  ? 'bg-primary/10 text-primary border-primary'
                  : 'bg-background text-muted-foreground/60 border-border',
              ].join(' ')}
            >
              {isCompleted ? <Check className="h-4 w-4" /> : step.number}
            </div>
            <span
              className={[
                'text-xs font-medium whitespace-nowrap transition-colors',
                isActive ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground/60',
              ].join(' ')}
            >
              {step.label}
            </span>
          </div>,
        ];

        if (index < steps.length - 1) {
          items.push(
            <div
              key={`connector-${step.number}`}
              className={[
                'flex-1 h-px mb-6 mx-3 transition-colors duration-300',
                isCompleted ? 'bg-primary' : 'bg-border',
              ].join(' ')}
            />
          );
        }

        return items;
      })}
    </div>
  );
}

export default function Campaigns() {
  const queryClient = useQueryClient();
  const { feedback, showFeedback, dismissFeedback } = useFeedback();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [schedulingEnabled, setSchedulingEnabled] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState(null);
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
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };


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
      setWizardStep(1);
      setSchedulingEnabled(false);
      setScheduledDateTime(null);
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
    if (e && e.preventDefault) e.preventDefault();

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
        .map((r) => r.trim().replace(/\D/g, ''))
        .filter((r) => r.length > 0);
      
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

    // Adicionar scheduled_date apenas se agendamento estiver ativo
    if (schedulingEnabled && scheduledDateTime) {
      payload.scheduled_date = scheduledDateTime.toISOString();
    }

    createMutation.mutate(payload);
  };

  const validateStep1 = () => {
    if (!formData.name.trim()) {
      showFeedback('error', 'Informe o nome da campanha');
      return false;
    }
    if (!formData.connection_id) {
      showFeedback('error', 'Selecione uma conexão');
      return false;
    }
    if (!formData.template_id) {
      showFeedback('error', 'Selecione um template');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (formData.recipient_type === 'group') {
      if (formData.selectedGroups.length === 0) {
        showFeedback('error', 'Selecione pelo menos um grupo');
        return false;
      }
    } else {
      const phones = parsePhoneNumbers(formData.recipients);
      if (phones.length === 0) {
        showFeedback('error', 'Adicione pelo menos um destinatário válido');
        return false;
      }
    }
    return true;
  };

  const handleCloseForm = () => {
    setShowCreateForm(false);
    setWizardStep(1);
    setSchedulingEnabled(false);
    setScheduledDatePart('');
    setScheduledTimePart('');
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

  const sortedCampaigns = useMemo(() => {
    if (!campaignsList) return [];
    if (!sortConfig.key) return campaignsList;
    return [...campaignsList].sort((a, b) => {
      let aVal, bVal;
      if (sortConfig.key === 'name') { aVal = a.name || ''; bVal = b.name || ''; }
      else if (sortConfig.key === 'status') { aVal = a.status || ''; bVal = b.status || ''; }
      else if (sortConfig.key === 'sent') { aVal = a.sent_count || 0; bVal = b.sent_count || 0; }
      else return 0;
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [campaignsList, sortConfig]);

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

      {!showCreateForm && (
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
                <Label>Status</Label>
                <Select
                  value={filters.status || '_all'}
                  onValueChange={(val) => setFilters({ ...filters, status: val === '_all' ? '' : val })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todos</SelectItem>
                    <SelectItem value="scheduled">Agendada</SelectItem>
                    <SelectItem value="running">Em Execução</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                    <SelectItem value="paused">Pausada</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                    <SelectItem value="error">Erro</SelectItem>
                  </SelectContent>
                </Select>
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
      )}

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nova Campanha</CardTitle>
          </CardHeader>
          <CardContent>
            <WizardSteps currentStep={wizardStep} />

            {/* Step 1: Template */}
            {wizardStep === 1 && (
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="space-y-4">
                  {/* Seção: Identificação */}
                  <div className="rounded-xl border bg-card">
                    <div className="flex items-center gap-2.5 px-5 py-3.5 border-b bg-muted/30 rounded-t-xl">
                      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <Tag className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-sm font-semibold">Identificação</span>
                    </div>
                    <div className="px-5 py-4">
                      <Label htmlFor="name" className="mb-1.5 block">Nome da Campanha <span className="text-destructive">*</span></Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Promoção de Março"
                        className="max-w-md"
                      />
                    </div>
                  </div>

                  {/* Seção: Conexão & Template */}
                  <div className="rounded-xl border bg-card">
                    <div className="flex items-center gap-2.5 px-5 py-3.5 border-b bg-muted/30 rounded-t-xl">
                      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <Settings2 className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-sm font-semibold">Conexão &amp; Template</span>
                    </div>
                    <div className="px-5 py-4 grid grid-cols-1 gap-5 md:grid-cols-2">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Wifi className="h-3.5 w-3.5 text-muted-foreground" />
                          <Label htmlFor="connection_id">Conexão WhatsApp <span className="text-destructive">*</span></Label>
                        </div>
                        <SearchableSelect
                          id="connection_id"
                          placeholder="Selecione uma conexão"
                          items={connectionOptions}
                          value={formData.connection_id}
                          onSelect={(id) => setFormData((prev) => ({ ...prev, connection_id: id }))}
                          renderSubtitle={(item) => item.subtitle ? `WhatsApp: ${item.subtitle}` : ''}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          <Label htmlFor="template_id">Template de Mensagem <span className="text-destructive">*</span></Label>
                        </div>
                        <SearchableSelect
                          id="template_id"
                          placeholder="Selecione um template"
                          items={templateOptions}
                          value={formData.template_id}
                          onSelect={(id) => setFormData((prev) => ({ ...prev, template_id: id }))}
                          renderSubtitle={(item) => `Tipo: ${item.subtitle}`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => { if (validateStep1()) setWizardStep(2); }}
                    >
                      Próximo
                      <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                    <Button size="sm" type="button" variant="outline" onClick={handleCloseForm}>
                      Cancelar
                    </Button>
                  </div>
                </div>

                {/* Preview do template */}
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Pré-visualização</p>
                  <div className="flex justify-center">
                    <TemplatePreview
                      messageType={selectedTemplate?.message_type}
                      textContent={selectedTemplate?.text_content}
                      previewUrl={selectedTemplate?.media_url}
                      interactiveContent={selectedTemplate?.interactive_content}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Destinatários */}
            {wizardStep === 2 && (
              <div className="space-y-4">

                {/* Seção: Destinatários */}
                <div className="rounded-xl border bg-card">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b bg-muted/30 rounded-t-xl">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-sm font-semibold">Destinatários</span>
                    </div>
                    <div className="flex items-center gap-1 p-0.5 rounded-lg border bg-background">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, recipient_type: 'contacts', recipients: '', selectedGroups: [] })}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                          formData.recipient_type === 'contacts'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Contatos
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, recipient_type: 'group', recipients: '', selectedGroups: [] })}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                          formData.recipient_type === 'group'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Grupos
                      </button>
                    </div>
                  </div>

                  <div className="px-5 py-4">
                    {formData.recipient_type === 'contacts' ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="recipients" className="text-sm font-medium">Números de telefone <span className="text-destructive">*</span></Label>
                            <p className="text-xs text-muted-foreground mt-0.5">Um número por linha — código do país + DDD + número (ex: 5511999999999)</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary hover:underline"
                              onClick={() => {
                                const csv = 'telefone\n5511999999999\n5521988888888\n5531977777777\n';
                                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'modelo_destinatarios.csv';
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                            >
                              <Download className="h-3.5 w-3.5" />
                              Baixar modelo CSV
                            </button>
                            <label className="cursor-pointer">
                              <input
                                type="file"
                                accept=".csv,text/csv"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    const phones = parseCsvPhones(ev.target.result);
                                    setFormData((prev) => ({ ...prev, recipients: phones.join('\n') }));
                                  };
                                  reader.readAsText(file);
                                  e.target.value = '';
                                }}
                              />
                              <span className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
                                <Upload className="h-3.5 w-3.5" />
                                Importar CSV
                              </span>
                            </label>
                          </div>
                        </div>
                        <textarea
                          id="recipients"
                          className="w-full px-3 py-3 border border-input rounded-md font-mono text-sm bg-background resize-none focus:outline-none focus:border-primary transition-colors"
                          rows={14}
                          value={formData.recipients}
                          onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                          placeholder="5511999999999&#10;5521988888888&#10;5531977777777&#10;..."
                        />
                        {(() => {
                          const validCount = parsePhoneNumbers(formData.recipients).length;
                          const totalLines = formData.recipients.split('\n').filter((l) => l.trim()).length;
                          if (totalLines === 0) return null;
                          return (
                            <div className="flex items-center gap-3">
                              <p className="text-sm flex items-center gap-1.5 text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                <span className="font-medium text-foreground">{validCount}</span> número{validCount !== 1 ? 's' : ''} válido{validCount !== 1 ? 's' : ''}
                                {totalLines !== validCount && (
                                  <span className="text-destructive/70 ml-1">
                                    · {totalLines - validCount} inválido{totalLines - validCount !== 1 ? 's' : ''} (serão ignorados)
                                  </span>
                                )}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="groups" className="text-sm font-medium">Grupos disponíveis <span className="text-destructive">*</span></Label>
                          <p className="text-xs text-muted-foreground mt-0.5">Selecione um ou mais grupos para receber a campanha</p>
                        </div>
                        {!formData.connection_id ? (
                          <div className="flex items-center gap-2 px-4 py-4 rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground">
                            <Wifi className="h-4 w-4 shrink-0" />
                            Selecione uma conexão na etapa anterior para ver os grupos
                          </div>
                        ) : loadingGroups ? (
                          <div className="flex items-center gap-2 px-4 py-4 rounded-lg border text-sm text-muted-foreground">
                            <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
                            Carregando grupos...
                          </div>
                        ) : groupsList.length === 0 ? (
                          <div className="flex items-center gap-2 px-4 py-4 rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground">
                            <Users className="h-4 w-4 shrink-0" />
                            Nenhum grupo encontrado para esta conexão
                          </div>
                        ) : (
                          <div className="rounded-lg border divide-y max-h-80 overflow-y-auto">
                            {groupsList.map((group) => {
                              const groupId = group.jid || group.id || group.groupId;
                              const groupName = group.subject || group.name || groupId;
                              const isSelected = formData.selectedGroups.includes(groupId);
                              return (
                                <button
                                  key={groupId}
                                  type="button"
                                  className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm transition-colors hover:bg-muted ${
                                    isSelected ? 'bg-primary/5' : ''
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
                                  <div>
                                    <span className="font-medium">{groupName}</span>
                                    {group.participants && (
                                      <span className="ml-2 text-xs text-muted-foreground">
                                        {group.participants.length} participantes
                                      </span>
                                    )}
                                  </div>
                                  {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {formData.selectedGroups.length > 0 && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="font-medium text-foreground">{formData.selectedGroups.length}</span> grupo{formData.selectedGroups.length !== 1 ? 's' : ''} selecionado{formData.selectedGroups.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    type="button"
                    onClick={() => { if (validateStep2()) setWizardStep(3); }}
                  >
                    Próximo
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                  <Button size="sm" type="button" variant="outline" onClick={() => setWizardStep(1)}>
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    Voltar
                  </Button>
                  <Button size="sm" type="button" variant="ghost" onClick={handleCloseForm}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Configuração */}
            {wizardStep === 3 && (
              <div className="space-y-4">

                {/* Seção: Cadência de Envio */}
                <div className="rounded-xl border bg-card">
                  <div className="flex items-center gap-2.5 px-5 py-3.5 border-b bg-muted/30 rounded-t-xl">
                    <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-sm font-semibold">Cadência de Envio</span>
                  </div>
                  <div className="px-5 py-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <Label htmlFor="message_interval" className="mb-1.5 block">
                        Intervalo entre mensagens <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="message_interval"
                          type="number"
                          min="10"
                          value={formData.message_interval}
                          onChange={(e) => setFormData({ ...formData, message_interval: e.target.value })}
                          className="pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">s</span>
                      </div>
                    </div>
                    <div>
                      <Label className="mb-1.5 block">Pausar após</Label>
                      <Select
                        value={String(formData.pause_after_messages)}
                        onValueChange={(val) => setFormData({ ...formData, pause_after_messages: val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[5, 10, 15, 20, 25, 30].map((option) => (
                            <SelectItem key={option} value={String(option)}>{option} mensagens</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="mb-1.5 block">Pausar por</Label>
                      <Select
                        value={String(formData.pause_duration_seconds)}
                        onValueChange={(val) => setFormData({ ...formData, pause_duration_seconds: val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[30, 45, 60, 90, 120].map((option) => (
                            <SelectItem key={option} value={String(option)}>{option} segundos</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Seção: Agendamento */}
                <div className="rounded-xl border bg-card">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b bg-muted/30 rounded-t-xl">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-sm font-semibold">Agendamento</span>
                      <span className="text-xs text-muted-foreground">opcional</span>
                    </div>
                    {/* Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        const next = !schedulingEnabled;
                        setSchedulingEnabled(next);
                        if (!next) setScheduledDateTime(null);
                      }}
                      className={[
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none',
                        schedulingEnabled ? 'bg-primary' : 'bg-input',
                      ].join(' ')}
                      aria-pressed={schedulingEnabled}
                    >
                      <span
                        className={[
                          'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200',
                          schedulingEnabled ? 'translate-x-6' : 'translate-x-1',
                        ].join(' ')}
                      />
                    </button>
                  </div>

                  {schedulingEnabled ? (
                    <div className="px-5 py-4 space-y-3">
                      <Label className="block text-sm">Data e hora de início</Label>
                      <DateTimePicker
                        value={scheduledDateTime}
                        onChange={setScheduledDateTime}
                        minDate={new Date()}
                        placeholder="Selecionar data e hora"
                      />
                      {scheduledDateTime && (
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/5 border border-primary/20">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          <p className="text-sm text-foreground">
                            Campanha agendada para{' '}
                            <span className="font-semibold">
                              {scheduledDateTime.toLocaleString('pt-BR', {
                                weekday: 'long',
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="px-5 py-4">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4 shrink-0" />
                        A campanha será iniciada imediatamente após a criação
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    type="button"
                    onClick={() => setWizardStep(4)}
                  >
                    Próximo
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                  <Button size="sm" type="button" variant="outline" onClick={() => setWizardStep(2)}>
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    Voltar
                  </Button>
                  <Button size="sm" type="button" variant="ghost" onClick={handleCloseForm}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Revisão */}
            {wizardStep === 4 && (
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="space-y-3">
                  {/* Nome da campanha */}
                  <div className="rounded-xl border bg-card p-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Megaphone className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">Nome da Campanha</p>
                      <p className="font-semibold text-sm">{formData.name}</p>
                    </div>
                  </div>

                  {/* Conexão & Template */}
                  <div className="rounded-xl border bg-card">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30 rounded-t-xl">
                      <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configuração</p>
                    </div>
                    <div className="grid grid-cols-2 divide-x">
                      <div className="p-4 flex items-start gap-2.5">
                        <Wifi className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground mb-0.5">Conexão</p>
                          <p className="text-sm font-medium truncate">
                            {connectionOptions.find(c => c.id === formData.connection_id)?.label || '—'}
                          </p>
                          {connectionOptions.find(c => c.id === formData.connection_id)?.subtitle && (
                            <p className="text-xs text-muted-foreground truncate">
                              {connectionOptions.find(c => c.id === formData.connection_id).subtitle}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="p-4 flex items-start gap-2.5">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground mb-0.5">Template</p>
                          <p className="text-sm font-medium truncate">
                            {templateOptions.find(t => t.id === formData.template_id)?.label || '—'}
                          </p>
                          {templateOptions.find(t => t.id === formData.template_id)?.subtitle && (
                            <Badge variant="secondary" className="text-[10px] mt-1 capitalize">
                              {templateOptions.find(t => t.id === formData.template_id).subtitle}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Destinatários */}
                  <div className="rounded-xl border bg-card p-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Destinatários</p>
                      {formData.recipient_type === 'group' ? (
                        <p className="text-sm font-semibold">
                          {formData.selectedGroups.length} grupo{formData.selectedGroups.length !== 1 ? 's' : ''}
                        </p>
                      ) : (
                        <p className="text-sm font-semibold">
                          {parsePhoneNumbers(formData.recipients).length} contato{parsePhoneNumbers(formData.recipients).length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Configurações de envio */}
                  <div className="rounded-xl border bg-card">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30 rounded-t-xl">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cadência de Envio</p>
                    </div>
                    <div className="grid grid-cols-3 divide-x">
                      <div className="px-4 py-3 text-center">
                        <p className="text-xs text-muted-foreground mb-0.5">Intervalo</p>
                        <p className="text-sm font-semibold">{formData.message_interval}<span className="text-xs text-muted-foreground ml-0.5">s</span></p>
                      </div>
                      <div className="px-4 py-3 text-center">
                        <p className="text-xs text-muted-foreground mb-0.5">Pausar após</p>
                        <p className="text-sm font-semibold">{formData.pause_after_messages}<span className="text-xs text-muted-foreground ml-0.5">msgs</span></p>
                      </div>
                      <div className="px-4 py-3 text-center">
                        <p className="text-xs text-muted-foreground mb-0.5">Pausar por</p>
                        <p className="text-sm font-semibold">{formData.pause_duration_seconds}<span className="text-xs text-muted-foreground ml-0.5">s</span></p>
                      </div>
                    </div>
                    {schedulingEnabled && scheduledDateTime && (
                      <div className="px-4 py-3 border-t flex items-center gap-2.5">
                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Agendado para</p>
                          <p className="text-sm font-medium">
                            {scheduledDateTime.toLocaleString('pt-BR', {
                              weekday: 'long',
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                    {!schedulingEnabled && (
                      <div className="px-4 py-3 border-t flex items-center gap-2.5">
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                        <p className="text-sm text-muted-foreground">Inicia imediatamente após criação</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      type="button"
                      onClick={handleSubmit}
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? 'Criando...' : 'Criar Campanha'}
                    </Button>
                    <Button size="sm" type="button" variant="outline" onClick={() => setWizardStep(3)}>
                      <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                      Voltar
                    </Button>
                    <Button size="sm" type="button" variant="ghost" onClick={handleCloseForm}>
                      Cancelar
                    </Button>
                  </div>
                </div>

                {/* Preview do template */}
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Pré-visualização</p>
                  <div className="flex justify-center">
                    <TemplatePreview
                      messageType={selectedTemplate?.message_type}
                      textContent={selectedTemplate?.text_content}
                      previewUrl={selectedTemplate?.media_url}
                      interactiveContent={selectedTemplate?.interactive_content}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!showCreateForm && (isLoading ? (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {['Nome', 'Status', 'Progresso', 'Conexão', 'Template', 'Criado por', 'Ações'].map((col) => (
                    <th key={col} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="hover:bg-muted/30">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                    <td className="px-4 py-3">
                      <div className="space-y-1.5">
                        <Skeleton className="h-2 w-32 rounded-full" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : !campaignsList || campaignsList.length === 0 ? (
      <Card>
        <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Nenhuma campanha encontrada. Crie sua primeira campanha!
          </p>
        </CardContent>
      </Card>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {[
                    { key: 'name', label: 'Nome' },
                    { key: 'status', label: 'Status' },
                  ].map(({ key, label }) => (
                    <th key={key} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleSort(key)}
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        {label}
                        {sortConfig.key === key ? (
                          sortConfig.direction === 'asc'
                            ? <ArrowUp className="h-3 w-3 text-primary" />
                            : <ArrowDown className="h-3 w-3 text-primary" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3" />
                        )}
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Progresso</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Conexão</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Template</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Criado por</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedCampaigns.map((campaign) => {
                  const recipientsArray = Array.isArray(campaign.recipients)
                    ? campaign.recipients
                    : typeof campaign.recipients === 'string'
                    ? (() => {
                        try {
                          const parsed = JSON.parse(campaign.recipients);
                          return Array.isArray(parsed) ? parsed : [];
                        } catch {
                          return campaign.recipients.split(',').map((item) => item.trim()).filter(Boolean);
                        }
                      })()
                    : [];
                  const totalRecipients = recipientsArray.length;
                  const processed = (campaign.sent_count || 0) + (campaign.error_count || 0);
                  const percent = totalRecipients > 0 ? Math.min(100, Math.round((processed / totalRecipients) * 100)) : 0;

                  return (
                    <tr key={campaign.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium max-w-[220px]">
                        <span className="truncate block">{campaign.name}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={statusColors[campaign.status]}>
                          {statusLabels[campaign.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 min-w-[160px]">
                        {totalRecipients > 0 ? (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{processed}/{totalRecipients}</span>
                              <span>{percent}%</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted">
                              <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[160px]">
                        <span className="truncate block">{campaign.connection?.instance_name || 'N/A'}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[160px]">
                        <span className="truncate block">{campaign.template?.name || 'N/A'}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {campaign.user?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedCampaignId(campaign.id)}
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {campaign.status === 'running' && (
                            <Button variant="ghost" size="icon" onClick={() => pauseMutation.mutate(campaign.id)}>
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}
                          {campaign.status === 'paused' && (
                            <Button variant="ghost" size="icon" onClick={() => resumeMutation.mutate(campaign.id)}>
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          {(campaign.status === 'running' || campaign.status === 'paused' || campaign.status === 'scheduled') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setConfirmDialog({ open: true, type: 'cancel', campaign })}
                              disabled={cancelMutation.isPending && confirmDialog.type === 'cancel' && confirmDialog.campaign?.id === campaign.id}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                          {campaign.status !== 'running' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setConfirmDialog({ open: true, type: 'delete', campaign })}
                              disabled={deleteMutation.isPending && confirmDialog.type === 'delete' && confirmDialog.campaign?.id === campaign.id}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

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
