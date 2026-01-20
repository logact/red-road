import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function IncubatorPage() {
  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>INCUBATOR</CardTitle>
          <CardDescription>
            The reflective path - for when you need psychological safety or rest.
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
