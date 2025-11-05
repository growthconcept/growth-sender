import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

export default function Templates() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
        <p className="text-muted-foreground">
          Gerencie seus templates de mensagens
        </p>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Página de templates em construção...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
