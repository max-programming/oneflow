import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/admin")({
  beforeLoad: ({ context }) => {
    if (!context.session) {
      throw redirect({ to: "/sign-in" });
    }

    // Check if user has admin role
    if (context.session.user.role !== "admin") {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
