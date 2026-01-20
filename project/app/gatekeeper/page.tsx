import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function GatekeeperPage() {
  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>GATEKEEPER</CardTitle>
          <CardDescription>
            The action path - for when you have a specific goal or project to execute.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This page will be implemented in a future milestone.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
