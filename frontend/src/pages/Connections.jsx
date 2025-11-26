import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { connections } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { RefreshCw, Trash2, CheckCircle2, XCircle, AlertCircle, Users, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import FeedbackBanner from '@/components/FeedbackBanner';
import { useFeedback } from '@/hooks/useFeedback';
import ConfirmDialog from '@/components/ConfirmDialog';

const statusColors = {
  connected: 'success',
  disconnected: 'destructive',
  error: 'destructive'
};

const statusLabels = {
  connected: 'Conectada',
  disconnected: 'Desconectada',
  error: 'Erro'
};

const statusIcons = {
  connected: CheckCircle2,
  disconnected: XCircle,
  error: AlertCircle
};

export default function Connections() {
  const queryClient = useQueryClient();
  const { feedback, showFeedback, dismissFeedback } = useFeedback();
  const [syncing, setSyncing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState({});
  const [showGroups, setShowGroups] = useState({});
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    connection: null
  });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: connectionsData, isLoading, refetch } = useQuery({
    queryKey: ['connections', search, page],
    queryFn: async () => {
      const params = {
        page,
        ...(search && { search })
      };
      const response = await connections.list(params);
      return response.data;
    }
  });

  const connectionsList = connectionsData?.connections || [];
  const pagination = connectionsData?.pagination || { page: 1, totalPages: 1, total: 0 };

  const syncMutation = useMutation({
    mutationFn: connections.sync,
    onSuccess: () => {
      queryClient.invalidateQueries(['connections']);
      setSyncing(false);
      showFeedback('success', 'Conexões sincronizadas com sucesso!');
    },
    onError: (error) => {
      console.error('Sync error:', error);
      setSyncing(false);
      showFeedback('error', 'Erro ao sincronizar: ' + (error.response?.data?.error || error.message));
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: connections.updateStatus,
    onSuccess: (data, connectionId) => {
      queryClient.invalidateQueries(['connections']);
      setUpdatingStatus(prev => ({ ...prev, [connectionId]: false }));
      showFeedback('success', 'Status atualizado com sucesso!');
    },
    onError: (error, connectionId) => {
      console.error('Update status error:', error);
      setUpdatingStatus(prev => ({ ...prev, [connectionId]: false }));
      showFeedback('error', 'Erro ao atualizar status: ' + (error.response?.data?.error || error.message));
    }
  });

  const getGroupsMutation = useMutation({
    mutationFn: (id) => connections.getGroups(id),
    onSuccess: (data, connectionId) => {
      setShowGroups(prev => ({
        ...prev,
        [connectionId]: data.data.groups || []
      }));
      if (!data.data.groups || data.data.groups.length === 0) {
        showFeedback('info', 'Nenhum grupo encontrado para esta conexão.');
      }
    },
    onError: (error) => {
      console.error('Get groups error:', error);
      showFeedback('error', 'Erro ao buscar grupos: ' + (error.response?.data?.error || error.message));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: connections.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['connections']);
      showFeedback('success', 'Conexão removida com sucesso!');
      setDeleteDialog({ open: false, connection: null });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      showFeedback('error', 'Erro ao remover conexão: ' + (error.response?.data?.error || error.message));
      setDeleteDialog((prev) => ({ ...prev, open: false }));
    }
  });

  const handleSync = () => {
    setSyncing(true);
    syncMutation.mutate();
  };

  const handleUpdateStatus = (id) => {
    setUpdatingStatus(prev => ({ ...prev, [id]: true }));
    updateStatusMutation.mutate(id);
  };

  const handleGetGroups = (id) => {
    if (showGroups[id]) {
      setShowGroups(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
    } else {
      getGroupsMutation.mutate(id);
    }
  };

  const handleDeleteClick = (connection) => {
    setDeleteDialog({
      open: true,
      connection
    });
  };

  const handleDeleteConfirm = () => {
    if (!deleteDialog.connection) return;
    deleteMutation.mutate(deleteDialog.connection.id);
  };

  const handleDeleteCancel = () => {
    if (deleteMutation.isPending) return;
    setDeleteDialog({ open: false, connection: null });
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1); // Resetar para primeira página ao buscar
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const connectedCount = connectionsList?.filter(c => c.status === 'connected').length || 0;
  const totalCount = pagination.total || 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conexões</h1>
          <p className="text-muted-foreground">
            Gerencie suas conexões WhatsApp da Evolution API
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Sincronizando...' : 'Sincronizar'}
        </Button>
      </div>

      <FeedbackBanner feedback={feedback} onDismiss={dismissFeedback} />

      {/* Campo de busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome da conexão ou telefone..."
              value={search}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : !connectionsList || connectionsList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Nenhuma conexão encontrada. Clique em "Sincronizar" para buscar suas instâncias da Evolution API.
            </p>
            <Button onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              Sincronizar Agora
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {connectionsList.map((conn) => {
            const StatusIcon = statusIcons[conn.status] || AlertCircle;
            const groups = showGroups[conn.id];

            return (
              <Card key={conn.id} className="relative">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`h-5 w-5 ${
                        conn.status === 'connected'
                          ? 'text-green-500'
                          : 'text-red-500'
                      }`} />
                      <CardTitle className="text-lg">{conn.instance_name}</CardTitle>
                    </div>
                    <Badge variant={statusColors[conn.status]}>
                      {statusLabels[conn.status]}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteClick(conn)}
                    disabled={
                      deleteMutation.isPending && deleteDialog.connection?.id === conn.id
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    {conn.profile_pic_url ? (
                      <img
                        src={conn.profile_pic_url}
                        alt="Profile"
                        className="w-16 h-16 rounded-full border-2 border-gray-200 object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full border-2 border-gray-200 bg-gray-100 flex items-center justify-center">
                        <span className="text-gray-400 text-xs">Sem foto</span>
                      </div>
                    )}
                    <div className="flex-1">
                      {conn.profile_name && (
                        <div className="text-sm font-semibold mb-1">
                          {conn.profile_name}
                        </div>
                      )}
                      <div className="text-sm">
                        <span className="text-muted-foreground">Número:</span>
                        <span className="ml-2 font-medium">
                          {conn.phone_number || 'Não disponível'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleUpdateStatus(conn.id)}
                      disabled={updatingStatus[conn.id]}
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${updatingStatus[conn.id] ? 'animate-spin' : ''}`} />
                      {updatingStatus[conn.id] ? 'Atualizando...' : 'Atualizar'}
                    </Button>
                    {conn.status === 'connected' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleGetGroups(conn.id)}
                        disabled={getGroupsMutation.isPending}
                      >
                        <Users className="h-3 w-3 mr-1" />
                        {groups ? 'Ocultar' : 'Grupos'}
                      </Button>
                    )}
                  </div>

                  {groups && groups.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium mb-2">
                        Grupos ({groups.length}):
                      </p>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {groups.map((group, index) => (
                          <div
                            key={index}
                            className="text-xs p-2 bg-gray-50 rounded border"
                          >
                            <p className="font-medium truncate">{group.subject || group.id}</p>
                            {group.participants && (
                              <p className="text-muted-foreground">
                                {group.participants.length} participantes
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {groups && groups.length === 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground text-center">
                        Nenhum grupo encontrado
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Paginação */}
      {pagination.totalPages > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Mostrando {connectionsList.length} de {pagination.total} conexões
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1 || isLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => {
                    // Mostrar apenas algumas páginas ao redor da página atual
                    if (
                      pageNum === 1 ||
                      pageNum === pagination.totalPages ||
                      (pageNum >= page - 1 && pageNum <= page + 1)
                    ) {
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          disabled={isLoading}
                          className="min-w-[40px]"
                        >
                          {pageNum}
                        </Button>
                      );
                    } else if (pageNum === page - 2 || pageNum === page + 2) {
                      return <span key={pageNum} className="px-2">...</span>;
                    }
                    return null;
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === pagination.totalPages || isLoading}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={deleteDialog.open}
        title="Remover conexão"
        description={
          deleteDialog.connection
            ? `Tem certeza que deseja remover a conexão "${deleteDialog.connection.instance_name}"?`
            : ''
        }
        confirmLabel="Remover"
        tone="danger"
        loading={deleteMutation.isPending}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
