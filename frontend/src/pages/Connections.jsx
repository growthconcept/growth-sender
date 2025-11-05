import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { connections } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { RefreshCw, Trash2 } from 'lucide-react';

const statusColors = {
  connected: 'success',
  disconnected: 'secondary',
  error: 'destructive'
};

const statusLabels = {
  connected: 'Conectada',
  disconnected: 'Desconectada',
  error: 'Erro'
};

export default function Connections() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  const { data: connectionsList, isLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => {
      const response = await connections.list();
      return response.data.connections;
    }
  });

  const syncMutation = useMutation({
    mutationFn: connections.sync,
    onSuccess: () => {
      queryClient.invalidateQueries(['connections']);
      setSyncing(false);
    },
    onError: (error) => {
      console.error('Sync error:', error);
      setSyncing(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: connections.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['connections']);
    }
  });

  const handleSync = () => {
    setSyncing(true);
    syncMutation.mutate();
  };

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja remover esta conexão?')) {
      deleteMutation.mutate(id);
    }
  };

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

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : !connectionsList || connectionsList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Nenhuma conexão encontrada. Clique em "Sincronizar" para buscar suas instâncias.
            </p>
            <Button onClick={handleSync}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sincronizar Agora
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {connectionsList.map((conn) => (
            <Card key={conn.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{conn.instance_name}</CardTitle>
                  <Badge variant={statusColors[conn.status]}>
                    {statusLabels[conn.status]}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(conn.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardHeader>
              <CardContent>
                {conn.profile_pic_url && (
                  <img
                    src={conn.profile_pic_url}
                    alt="Profile"
                    className="w-16 h-16 rounded-full mb-3"
                  />
                )}
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Número:</span>
                    <span className="ml-2 font-medium">
                      {conn.phone_number || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Criada em:</span>
                    <span className="ml-2">
                      {new Date(conn.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
