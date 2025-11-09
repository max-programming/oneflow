import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLocation } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export function SiteHeader() {
  const location = useLocation();

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        {location.pathname.split("/").map((pathname, index) => (
          <h1
            className="text-base font-medium capitalize flex items-center gap-2"
            key={pathname}
          >
            {pathname}
            {index < location.pathname.split("/").length - 1 && index !== 0 && (
              <ChevronRight className="size-4" />
            )}
          </h1>
        ))}
      </div>
    </header>
  );
}
