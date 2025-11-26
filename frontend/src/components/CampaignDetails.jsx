import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { campaigns } from '@/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { X, Users, CheckCircle, XCircle, TrendingUp } from 'lucide-react';

const statusColors = {
  sent: 'success',
  error: 'destructive',
  pending: 'secondary'
};

const statusLabels = {
  sent: 'Enviada',
  error: 'Erro',
  pending: 'Pendente'
};

export default function CampaignDetails({ campaignId, open, onClose }) {
  const queryClient = useQueryClient();
  
  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => campaigns.getOne(campaignId),
    enabled: open && !!campaignId,
    select: (response) => response.data.campaign,
    // Atualizar automaticamente a cada 2 segundos se a campanha estiver em execução
    refetchInterval: (query) => {
      if (!open) return false;
      // O select já transformou os dados, então query.state.data já é a campanha
      const campaignData = query.state.data;
      const isRunning = campaignData?.status === 'running' || campaignData?.status === 'scheduled';
      return isRunning ? 2000 : false; // 2 segundos se estiver rodando, senão desabilitado
    },
    refetchIntervalInBackground: true
  });

  const { data: logsData, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['campaign-logs', campaignId],
    queryFn: () => campaigns.getLogs(campaignId, { limit: 1000 }),
    enabled: open && !!campaignId,
    select: (response) => response.data.logs,
    // Atualizar automaticamente a cada 2 segundos se a campanha estiver em execução
    refetchInterval: (query) => {
      if (!open) return false;
      // Buscar o status da campanha através do queryClient
      const campaignData = queryClient.getQueryData(['campaign', campaignId]);
      const isRunning = campaignData?.status === 'running' || campaignData?.status === 'scheduled';
      return isRunning ? 2000 : false;
    },
    refetchIntervalInBackground: true
  });

  if (!open) return null;

  const recipientsArray = campaign?.recipients
    ? Array.isArray(campaign.recipients)
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
      : []
    : [];

  const totalRecipients = recipientsArray.length;
  const sentCount = campaign?.sent_count || 0;
  const errorCount = campaign?.error_count || 0;
  const deliveryRate = totalRecipients > 0 
    ? Math.round((sentCount / totalRecipients) * 100) 
    : 0;

  const logs = logsData || [];

  if (!open) return null;

  const modalContent = (
    <div 
      className="fixed z-[9999] flex items-center justify-center bg-black/50" 
      style={{ 
        position: 'fixed',
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: '1rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-background rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-muted/30">
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-3">{campaign?.name || 'Carregando...'}</h2>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground font-medium">Conexão:</span>
                <span className="ml-2 font-semibold text-foreground">
                  {campaign?.connection?.instance_name || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Template:</span>
                <span className="ml-2 font-semibold text-foreground">
                  {campaign?.template?.name || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Criado por:</span>
                <span className="ml-2 font-semibold text-foreground">
                  {campaign?.user?.name || 'N/A'}
                </span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="ml-4">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando...</div>
          ) : (
            <>
              {/* Dashboard Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Número de Destinatários</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalRecipients}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {campaign?.recipient_type === 'group' ? 'Grupos' : 'Contatos'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Mensagens Enviadas</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{sentCount}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Enviadas com sucesso
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Mensagens com Erro</CardTitle>
                    <XCircle className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{errorCount}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Falhas no envio
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Taxa de Entrega</CardTitle>
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{deliveryRate}%</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Taxa de sucesso
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Logs Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Detalhes dos Envios</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingLogs ? (
                    <div className="text-center py-8 text-muted-foreground">Carregando logs...</div>
                  ) : logs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum log encontrado para esta campanha
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 text-sm font-medium text-muted-foreground w-16">
                              #
                            </th>
                            <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                              Destinatário
                            </th>
                            <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                              Template
                            </th>
                            <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                              Status
                            </th>
                            <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                              Data/Hora
                            </th>
                            {logs.some(log => log.error_message) && (
                              <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                                Erro
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {logs.map((log, index) => (
                            <tr key={log.id} className="border-b hover:bg-muted/50">
                              <td className="p-3 text-sm text-muted-foreground font-medium">
                                {logs.length - index}
                              </td>
                              <td className="p-3 text-sm">
                                <div className="font-medium">{log.recipient}</div>
                              </td>
                              <td className="p-3 text-sm">
                                {campaign?.template?.name || 'N/A'}
                              </td>
                              <td className="p-3">
                                <Badge variant={statusColors[log.status]}>
                                  {statusLabels[log.status]}
                                </Badge>
                              </td>
                              <td className="p-3 text-sm text-muted-foreground">
                                {log.sent_at
                                  ? new Date(log.sent_at).toLocaleString('pt-BR')
                                  : '-'}
                              </td>
                              {logs.some(l => l.error_message) && (
                                <td className="p-3 text-sm text-muted-foreground max-w-md">
                                  {log.error_message ? (
                                    <div className="truncate" title={log.error_message}>
                                      {log.error_message}
                                    </div>
                                  ) : (
                                    '-'
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
