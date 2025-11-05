import { Card, CardContent } from '@/components/ui/Card';

export default function Campaigns() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Campanhas</h1>
        <p className="text-muted-foreground">
          Crie e gerencie suas campanhas de disparo
        </p>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Página de campanhas em construção...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
