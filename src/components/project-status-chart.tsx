"use client";

import * as React from "react";
import { Label, Pie, PieChart } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

interface ProjectStatusChartProps {
  statusDistribution?: {
    "in-progress": number;
    "waiting-to-start": number;
    completed: number;
    cancelled: number;
    "on-hold": number;
  };
  isLoading?: boolean;
}

const chartConfig = {
  projects: {
    label: "Projects",
  },
  "in-progress": {
    label: "In Progress",
    color: "hsl(217, 91%, 60%)", // Vibrant blue
  },
  "waiting-to-start": {
    label: "Waiting to Start",
    color: "hsl(215, 20%, 65%)", // Soft gray-blue
  },
  completed: {
    label: "Completed",
    color: "hsl(142, 71%, 45%)", // Green
  },
  "on-hold": {
    label: "On Hold",
    color: "hsl(38, 92%, 50%)", // Orange
  },
  cancelled: {
    label: "Cancelled",
    color: "hsl(0, 72%, 51%)", // Red
  },
} satisfies ChartConfig;

export function ProjectStatusChart({
  statusDistribution,
  isLoading,
}: ProjectStatusChartProps) {
  if (isLoading) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>
            <Skeleton className="h-6 w-48" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-32" />
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="mx-auto aspect-square max-h-[250px]">
            <Skeleton className="h-full w-full rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const distribution = statusDistribution || {
    "in-progress": 0,
    "waiting-to-start": 0,
    completed: 0,
    cancelled: 0,
    "on-hold": 0,
  };

  const chartData = [
    {
      status: "in-progress",
      count: distribution["in-progress"],
      fill: "var(--color-in-progress)",
    },
    {
      status: "waiting-to-start",
      count: distribution["waiting-to-start"],
      fill: "var(--color-waiting-to-start)",
    },
    {
      status: "completed",
      count: distribution["completed"],
      fill: "var(--color-completed)",
    },
    {
      status: "on-hold",
      count: distribution["on-hold"],
      fill: "var(--color-on-hold)",
    },
    {
      status: "cancelled",
      count: distribution["cancelled"],
      fill: "var(--color-cancelled)",
    },
  ].filter((item) => item.count > 0);

  const totalProjects = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.count, 0);
  }, [chartData]);

  if (totalProjects === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Project Status Distribution</CardTitle>
          <CardDescription>Overview of all your projects</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center pb-6">
          <p className="text-center text-sm text-muted-foreground">
            No projects available to display
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Project Status Distribution</CardTitle>
        <CardDescription>Overview of all your projects</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="status"
              innerRadius={60}
              strokeWidth={5}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {totalProjects}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Projects
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {chartData.map((item) => (
            <div key={item.status} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: item.fill }}
              />
              <span className="truncate text-muted-foreground">
                {chartConfig[item.status as keyof typeof chartConfig]?.label}:{" "}
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
