import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { admin } from '@/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Users, 
  BarChart3, 
  Send, 
  TrendingUp, 
  Link as LinkIcon, 
  FileText,
  Search,
  Shield,
  UserCheck,
  UserX,
  Loader2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/components/ui/ToastProvider';

const roleLabels = {
  admin: 'Admin',
  supervisor: 'Supervisor',
  user: 'Usuário'
};

const roleColors = {
  admin: 'destructive',
  supervisor: 'warning',
  user: 'default'
};

export default function Admin() {
  const [activeTab, setActiveTab] = useState('users');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar usuários
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', searchTerm],
    queryFn: async () => {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      const response = await admin.listUsers(params);
      return response.data.users;
    }
  });

  // Buscar métricas globais
  const { data: globalMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['admin-global-metrics'],
    queryFn: async () => {
      const response = await admin.getGlobalMetrics();
      return response.data.metrics;
    }
  });

  // Buscar métricas por usuário
  const { data: userMetrics, isLoading: userMetricsLoading } = useQuery({
    queryKey: ['admin-user-metrics'],
    queryFn: async () => {
      const response = await admin.getUserMetrics();
      return response.data.users;
    }
  });

  // Mutação para atualizar role
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => admin.updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      queryClient.invalidateQueries(['admin-user-metrics']);
      toast({ title: 'Sucesso', description: 'Role atualizada com sucesso!', variant: 'success' });
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.response?.data?.error || 'Erro ao atualizar role', variant: 'destructive' });
    }
  });

  const handleRoleChange = (userId, newRole) => {
    if (window.confirm(`Deseja alterar a role deste usuário para "${roleLabels[newRole]}"?`)) {
      updateRoleMutation.mutate({ userId, role: newRole });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Administração</h1>
        <p className="text-muted-foreground">
          Gerencie usuários e visualize métricas do sistema
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </div>
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'metrics'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Métricas
            </div>
          </button>
        </nav>
      </div>

      {/* Conteúdo das Tabs */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Busca */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tabela de Usuários */}
          <Card>
            <CardHeader>
              <CardTitle>Usuários do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !usersData || usersData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum usuário encontrado
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Nome</th>
                        <th className="text-left py-3 px-4 font-medium">Email</th>
                        <th className="text-left py-3 px-4 font-medium">Role</th>
                        <th className="text-left py-3 px-4 font-medium">Criado em</th>
                        <th className="text-left py-3 px-4 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersData.map((user) => (
                        <tr key={user.id} className="border-b hover:bg-accent/50">
                          <td className="py-3 px-4">{user.name}</td>
                          <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                          <td className="py-3 px-4">
                            <Badge variant={roleColors[user.role]}>
                              {roleLabels[user.role]}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground text-sm">
                            {format(parseISO(user.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {user.role !== 'admin' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRoleChange(user.id, 'admin')}
                                  disabled={updateRoleMutation.isPending}
                                >
                                  <Shield className="h-3 w-3 mr-1" />
                                  Admin
                                </Button>
                              )}
                              {user.role !== 'supervisor' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRoleChange(user.id, 'supervisor')}
                                  disabled={updateRoleMutation.isPending}
                                >
                                  <UserCheck className="h-3 w-3 mr-1" />
                                  Supervisor
                                </Button>
                              )}
                              {user.role !== 'user' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRoleChange(user.id, 'user')}
                                  disabled={updateRoleMutation.isPending}
                                >
                                  <UserX className="h-3 w-3 mr-1" />
                                  Usuário
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Métricas por Usuário */}
          {userMetrics && userMetrics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Métricas por Usuário</CardTitle>
              </CardHeader>
              <CardContent>
                {userMetricsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userMetrics.map((user) => (
                      <div
                        key={user.id}
                        className="border rounded-lg p-4 hover:bg-accent/50"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                          <Badge variant={roleColors[user.role]}>
                            {roleLabels[user.role]}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Campanhas</div>
                            <div className="font-semibold">
                              {user.metrics?.campaigns?.total || 0} total
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {user.metrics?.campaigns?.active || 0} ativas
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Mensagens</div>
                            <div className="font-semibold">
                              {user.metrics?.messages?.total || 0} enviadas
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {user.metrics?.messages?.successRate || 0}% sucesso
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Templates</div>
                            <div className="font-semibold">
                              {user.metrics?.templates?.total || 0}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Conexões</div>
                            <div className="font-semibold">
                              {user.metrics?.connections?.active || 0} ativas
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'metrics' && (
        <div className="space-y-6">
          {metricsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : globalMetrics ? (
            <>
              {/* Métricas Globais */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{globalMetrics.users?.total || 0}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {globalMetrics.users?.byRole?.admin || 0} admin,{' '}
                      {globalMetrics.users?.byRole?.supervisor || 0} supervisor,{' '}
                      {globalMetrics.users?.byRole?.user || 0} usuários
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Campanhas</CardTitle>
                    <Send className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {globalMetrics.campaigns?.total || 0}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {globalMetrics.campaigns?.byStatus?.running || 0} em execução
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Mensagens Enviadas</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {globalMetrics.messages?.total || 0}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {globalMetrics.messages?.today || 0} hoje,{' '}
                      {globalMetrics.messages?.successRate || 0}% sucesso
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Conexões Ativas</CardTitle>
                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {globalMetrics.connections?.active || 0}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {globalMetrics.templates?.total || 0} templates cadastrados
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Distribuição de Campanhas por Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Campanhas por Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {globalMetrics.campaigns?.byStatus && Object.entries(globalMetrics.campaigns.byStatus).map(([status, count]) => (
                      <div key={status} className="text-center">
                        <div className="text-2xl font-bold">{count}</div>
                        <div className="text-sm text-muted-foreground capitalize">{status}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Erro ao carregar métricas
            </div>
          )}
        </div>
      )}
    </div>
  );
}

