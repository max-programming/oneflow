import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/pm")({
  beforeLoad: ({ context }) => {
    if (!context.session) {
      throw redirect({ to: "/sign-in" });
    }

    if (
      context.session.user.role !== "admin" &&
      context.session.user.role !== "project-manager"
    ) {
      // TODO: redirect to role page from signin page
      throw redirect({ to: "/sign-in" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
