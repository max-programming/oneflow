import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CreateProjectDialog } from "@/components/create-project-dialog";

export const Route = createFileRoute("/dashboard/projects/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="relative p-6">
      <CreateProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        triggerButton={
          <Button className="absolute top-6 right-6" variant="default">
            Create Project
          </Button>
        }
      />
    </div>
  );
}
