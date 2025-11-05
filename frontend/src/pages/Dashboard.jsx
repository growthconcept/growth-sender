import { useQuery } from '@tanstack/react-query';
import { dashboard } from '@/services/api';
import MetricCard from '@/components/dashboard/MetricCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BarChart3, Send, TrendingUp, Link as LinkIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

export default function Dashboard() {
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const response = await dashboard.getMetrics();
      return response.data.metrics;
    }
  });

  const { data: recentCampaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['recent-campaigns'],
    queryFn: async () => {
      const response = await dashboard.getRecentCampaigns({ limit: 5 });
      return response.data.campaigns;
    }
  });

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral das suas campanhas e mensagens
        </p>
      </div>

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
          title="Mensagens Hoje"
          value={metrics?.messagesToday || 0}
          icon={Send}
          description="Enviadas nas últimas 24h"
        />
        <MetricCard
          title="Taxa de Sucesso"
          value={`${metrics?.successRate || 0}%`}
          icon={TrendingUp}
          description="Últimos 7 dias"
        />
      </div>

      {/* Conexões */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Conexões Ativas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{metrics?.activeConnections || 0}</div>
          <p className="text-sm text-muted-foreground mt-1">
            Conexões WhatsApp conectadas
          </p>
        </CardContent>
      </Card>

      {/* Campanhas Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Campanhas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {campaignsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : !recentCampaigns || recentCampaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma campanha criada ainda
            </div>
          ) : (
            <div className="space-y-4">
              {recentCampaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{campaign.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {campaign.connection?.instance_name || 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Criada em {format(new Date(campaign.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={statusColors[campaign.status]}>
                      {statusLabels[campaign.status]}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      {campaign.sent_count}/{campaign.recipients?.length || 0} enviadas
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
