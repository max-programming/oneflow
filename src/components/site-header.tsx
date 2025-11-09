import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useLocation } from "@tanstack/react-router";
import { ChevronRight, Search } from "lucide-react";

export function SiteHeader() {
  const location = useLocation();

  const handleSearchClick = () => {
    // Trigger the keyboard event to open the search modal
    const event = new KeyboardEvent("keydown", {
      key: "k",
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
  };

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <div className="flex flex-1 items-center justify-between">
          <div className="flex items-center gap-2">
            {location.pathname.split("/").map((pathname, index) => (
              <h1
                className="text-base font-medium capitalize flex items-center gap-2"
                key={pathname}
              >
                {pathname}
                {index < location.pathname.split("/").length - 1 &&
                  index !== 0 && <ChevronRight className="size-4" />}
              </h1>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2"
            onClick={handleSearchClick}
          >
            <Search className="h-4 w-4" />
            <span className="hidden md:inline">Search</span>
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">
                {typeof navigator !== "undefined" &&
                navigator.platform.includes("Mac")
                  ? "⌘"
                  : "Ctrl"}
              </span>
              K
            </kbd>
          </Button>
        </div>
      </div>
    </header>
  );
}
