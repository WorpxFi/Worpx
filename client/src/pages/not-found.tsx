import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950">
      <Card className="w-full max-w-md mx-4 bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6 text-center">
          <p className="text-6xl font-bold text-zinc-600 mb-4" data-testid="text-404">
            404
          </p>
          <h1 className="text-xl font-semibold text-white mb-2">
            Page Not Found
          </h1>
          <p className="text-sm text-zinc-400 mb-6">
            The page you are looking for does not exist or has been moved.
          </p>
          <a href="/">
            <Button variant="outline" className="border-zinc-700 text-zinc-300" data-testid="button-go-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
