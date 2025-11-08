import * as React from "react";
import {
  IconFolder,
  IconInnerShadowTop,
  IconShield,
  IconUserCog,
  IconAddressBook,
} from "@tabler/icons-react";
import { Link, useRouterState } from "@tanstack/react-router";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";

const data = {
  navMain: [
    {
      title: "Projects",
      url: "/dashboard/projects",
      icon: IconFolder,
    },
  ],
  navAdmin: [
    {
      title: "User Management",
      url: "/dashboard/admin/users",
      icon: IconUserCog,
    },
    {
      title: "Customer Management",
      url: "/dashboard/admin/customers",
      icon: IconAddressBook,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const routerState = useRouterState();
  const session = routerState.matches[0]?.context?.session;
  const isAdmin = session?.user?.role === "admin";

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link to="/dashboard">
                <span className="text-2xl font-bold">ᛟ</span>
                <span className="text-base font-semibold">Oneflow Inc.</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>
              <IconShield className="mr-2 h-4 w-4" />
              Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {data.navAdmin.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={routerState.location.pathname === item.url}
                    >
                      <Link to={item.url}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
