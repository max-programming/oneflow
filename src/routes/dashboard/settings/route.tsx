import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/settings")({
  beforeLoad: ({ context }) => {
    if (!context.session) {
      throw redirect({ to: "/sign-in" });
    }

    // Check if user has sales-finance or admin role
    const userRole = context.session.user.role;
    if (userRole !== "admin" && userRole !== "sales-finance") {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
