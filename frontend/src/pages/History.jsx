import { Card, CardContent } from '@/components/ui/Card';

export default function History() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Histórico</h1>
        <p className="text-muted-foreground">
          Visualize o histórico de suas campanhas
        </p>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Página de histórico em construção...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
