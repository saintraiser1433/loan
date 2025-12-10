"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { Landmark, LayoutDashboard, FileText, CreditCard, Settings, BarChart3, Users, History, Wallet, UserCog, MessageSquare, ClipboardList } from "lucide-react"
import Link from "next/link"

import { NavUser } from "@/components/nav-user"
import { getDiceBearAvatar } from "@/lib/avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()

  const borrowerMenuItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Apply for Loan", url: "/dashboard/apply", icon: FileText },
    { title: "My Applications", url: "/dashboard/applications/my", icon: FileText },
    { title: "My Loans", url: "/dashboard/loans", icon: CreditCard },
    { title: "Profile", url: "/dashboard/profile", icon: UserCog },
  ]

  const officerMenuItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Borrowers", url: "/dashboard/borrowers", icon: Users },
    { title: "Applications", url: "/dashboard/applications", icon: FileText },
    { title: "Loans", url: "/dashboard/loans", icon: CreditCard },
    { title: "Loan Types", url: "/dashboard/loan-types", icon: Settings },
    { title: "Requirements", url: "/dashboard/requirements", icon: ClipboardList },
    { title: "Payment Methods", url: "/dashboard/payment-methods", icon: Wallet },
    { title: "Reports", url: "/dashboard/reports", icon: BarChart3 },
    { title: "Activity Logs", url: "/dashboard/activity-logs", icon: History },
    ...(session?.user?.role === "ADMIN" ? [
      { title: "Users", url: "/dashboard/users", icon: UserCog },
      { title: "SMS Settings", url: "/dashboard/sms-settings", icon: MessageSquare },
    ] : []),
  ]

  const menuItems = session?.user?.role === "BORROWER" ? borrowerMenuItems : officerMenuItems

  const userData = session?.user ? {
    name: session.user.name || "User",
    email: session.user.email || "",
    avatar: getDiceBearAvatar(session.user.email || session.user.name || "user"),
  } : {
    name: "Guest",
    email: "",
    avatar: getDiceBearAvatar("guest"),
  }

  return (
    <Sidebar
      collapsible="icon"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex aspect-square size-8 items-center justify-center rounded-lg shadow-md">
                  <Landmark className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">GCCI Lending</span>
                  <span className="truncate text-xs text-muted-foreground">Online Management</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton tooltip={item.title} asChild>
                <Link href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        {session?.user && <NavUser user={userData} />}
      </SidebarFooter>
    </Sidebar>
  )
}
