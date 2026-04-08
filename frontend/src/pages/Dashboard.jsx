import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboard } from '@/services/api';
import MetricCard from '@/components/dashboard/MetricCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { BarChart3, Send, TrendingUp, Clock, Eye, Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO, isValid, eachDayOfInterval, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CampaignDetails from '@/components/CampaignDetails';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const statusColors = {
  scheduled: 'warning',
  running: 'default',
  completed: 'success',
  paused: 'secondary',
  cancelled: 'destructive',
  error: 'destructive'
};

const statusLabels = {
  scheduled: 'Agendada',
  running: 'Em execução',
  completed: 'Concluída',
  paused: 'Pausada',
  cancelled: 'Cancelada',
  error: 'Erro'
};

function formatCampaignDate(rawDate) {
  if (!rawDate) {
    return 'Data indisponível';
  }

  let dateObj;

  if (rawDate instanceof Date) {
    dateObj = rawDate;
  } else {
    try {
      dateObj = parseISO(rawDate);
      if (!isValid(dateObj)) {
        dateObj = new Date(rawDate);
      }
    } catch (error) {
      dateObj = new Date(rawDate);
    }
  }

  if (!isValid(dateObj)) {
    return 'Data indisponível';
  }

  return format(dateObj, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
}

const PERIOD_OPTIONS = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' }
];

function buildChartData(messagesByDay, period) {
  const days = period === '30d' ? 30 : 7;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = subDays(today, days - 1);

  const countByDate = {};
  (messagesByDay || []).forEach(({ date, count }) => {
    countByDate[date] = Number(count);
  });

  return eachDayOfInterval({ start, end: today }).map((day) => {
    const key = format(day, 'yyyy-MM-dd');
    return {
      date: format(day, 'dd/MM'),
      enviadas: countByDate[key] || 0
    };
  });
}

export default function Dashboard() {
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statsPeriod, setStatsPeriod] = useState('7d');

  // Formatar datas para o formato esperado pelo backend (YYYY-MM-DD)
  const formatDateForAPI = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard-metrics', dateFrom, dateTo],
    queryFn: async () => {
      const params = {};
      if (dateFrom) params.date_from = formatDateForAPI(dateFrom);
      if (dateTo) params.date_to = formatDateForAPI(dateTo);
      const response = await dashboard.getMetrics(params);
      return response.data.metrics;
    }
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', statsPeriod],
    queryFn: async () => {
      const response = await dashboard.getStats({ period: statsPeriod });
      return response.data.stats;
    }
  });

  const chartData = buildChartData(statsData?.messagesByDay, statsPeriod);
  const totalInPeriod = chartData.reduce((acc, d) => acc + d.enviadas, 0);

  const { data: recentCampaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['recent-campaigns'],
    queryFn: async () => {
      const response = await dashboard.getRecentCampaigns({ limit: 5 });
      return response.data.campaigns;
    },
    // Atualizar automaticamente a cada 3 segundos se houver campanhas em execução
    refetchInterval: (query) => {
      const campaigns = query.state.data;
      const hasRunning = campaigns?.some((c) => c.status === 'running' || c.status === 'scheduled');
      return hasRunning ? 3000 : false; // 3 segundos se houver campanhas rodando, senão desabilitado
    },
    refetchIntervalInBackground: true
  });

  if (metricsLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-6 space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-5 rounded-sm" />
              </div>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const handleResetDates = () => {
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral das suas campanhas e mensagens
          </p>
        </div>
      </div>

      {/* Filtro de Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Filtro de Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onClear={handleResetDates}
          />
          {dateFrom && dateTo && (() => {
            // Criar datas sem problemas de timezone
            const parseDateString = (dateString) => {
              const [year, month, day] = dateString.split('-').map(Number);
              return new Date(year, month - 1, day);
            };
            const fromDate = parseDateString(dateFrom);
            const toDate = parseDateString(dateTo);
            return (
              <p className="text-sm text-muted-foreground mt-4">
                Mostrando dados de {format(fromDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} até {format(toDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            );
          })()}
        </CardContent>
      </Card>

      {/* Métricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total de Campanhas"
          value={metrics?.totalCampaigns || 0}
          icon={BarChart3}
          description="Todas as campanhas criadas"
        />
        <MetricCard
          title="Campanhas Ativas"
          value={metrics?.activeCampaigns || 0}
          icon={Clock}
          description="Agendadas ou em execução"
        />
        <MetricCard
          title={dateFrom || dateTo ? "Mensagens no Período" : "Mensagens Hoje"}
          value={metrics?.messagesToday || 0}
          icon={Send}
          description={dateFrom || dateTo ? "Enviadas no período selecionado" : "Enviadas nas últimas 24h"}
        />
        <MetricCard
          title="Taxa de Sucesso"
          value={`${metrics?.successRate || 0}%`}
          icon={TrendingUp}
          description={dateFrom || dateTo ? "No período selecionado" : "Últimos 7 dias"}
        />
      </div>

      {/* Gráfico de Performance */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Mensagens Enviadas
              </CardTitle>
              {!statsLoading && (
                <p className="text-sm text-muted-foreground mt-1">
                  {totalInPeriod.toLocaleString('pt-BR')} mensagem{totalInPeriod !== 1 ? 's' : ''} nos últimos {statsPeriod === '7d' ? '7' : '30'} dias
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 rounded-lg border p-1">
              {PERIOD_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatsPeriod(value)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    statsPeriod === value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="space-y-3 pt-2">
              <div className="flex items-end gap-2 h-48">
                {Array.from({ length: statsPeriod === '7d' ? 7 : 14 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{ height: `${20 + Math.random() * 80}%` }}
                  />
                ))}
              </div>
            </div>
          ) : totalInPeriod === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <Send className="h-8 w-8 opacity-30" />
              <p className="text-sm">Nenhuma mensagem enviada neste período</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  interval={statsPeriod === '30d' ? 4 : 0}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--accent))' }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '13px'
                  }}
                  formatter={(value) => [value.toLocaleString('pt-BR'), 'Enviadas']}
                  labelFormatter={(label) => `Data: ${label}`}
                />
                <Bar
                  dataKey="enviadas"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Campanhas Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Campanhas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {campaignsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end gap-2">
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-8 w-28 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : !recentCampaigns || recentCampaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma campanha criada ainda
            </div>
          ) : (
            <div className="space-y-4">
              {recentCampaigns.map((campaign) => {
                const totalRecipients = Array.isArray(campaign.recipients) 
                  ? campaign.recipients.length 
                  : (campaign.recipients || 0);
                const sentCount = campaign.sent_count || 0;
                const errorCount = campaign.error_count || 0;
                const totalProcessed = sentCount + errorCount;
                
                return (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="font-medium">{campaign.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Criado por: {campaign.user?.name || 'N/A'}
                      </div>
                      {campaign.connection && (
                        <div className="text-xs text-muted-foreground">
                          Conexão: {campaign.connection.instance_name || campaign.connection.phone_number || 'N/A'}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {campaign.started_at 
                          ? `Iniciada em: ${formatCampaignDate(campaign.started_at)}`
                          : `Criada em: ${formatCampaignDate(campaign.created_at)}`
                        }
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={statusColors[campaign.status]}>
                          {statusLabels[campaign.status]}
                        </Badge>
                        <div className="text-sm text-muted-foreground text-right">
                          <div>{sentCount} enviadas / {errorCount} erros</div>
                          <div>{totalProcessed}/{totalRecipients} mensagens processadas</div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCampaignId(campaign.id)}
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver detalhes
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <CampaignDetails
        campaignId={selectedCampaignId}
        open={!!selectedCampaignId}
        onClose={() => setSelectedCampaignId(null)}
      />
    </div>
  );
}
