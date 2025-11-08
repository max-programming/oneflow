OneFlow — Plan to Bill in One Place

1. Goal
   Develop a modular Project Management system that lets a Project Manager take a project from planning → execution → billing in one place.

● Plan: projects, tasks, people, dates.
● Execute: task board, hour logging, status, blockers.
● Bill & Track Money: link/create Sales Orders (what the customer buys), Purchase Orders (what you buy), Customer Invoices, Vendor Bills, and Expenses—see Revenue, Cost, Profit per project.

2. User Roles
   ● Project Manager: creates/edits projects, assigns people, manages tasks, approves expenses, triggers invoices.
   ● Team Member: views assigned tasks, updates status, logs hours, submits expenses.
   ● Sales / Finance: creates/links SO/PO/Customer Invoices/Vendor Bills/Expenses in Project → Settings.
   ● Admin: everything.

3. Use Case Scenarios
   3.1 Authentication & Access
   ● Common Login/Signup page.
   ● Role-based dashboard after login (Project Manager / Team Member / Admin).

3.2 Dashboard & Filtering
● The landing page lists all ongoing projects as cards.
● Filters: Planned, In Progress, Completed, On Hold.
● KPI widgets: Active Projects, Delayed Tasks, Hours Logged, Revenue Earned.

3.3 Navigation
● Projects: create and manage projects.
● Tasks: assign and track task execution.
● Analytics: progress, utilization, profitability.

3.4 Profile & Setup (Left Sidebar)
● My Profile: update personal info and password.

4. Core Features
   4.1 Projects
   ● Create / Edit / Delete projects.
   ● Assign Project Manager, Team Members, Deadlines.
   ● Show progress bar and budget usage on the project.
   ● Links panel (top bar inside a project): quick access to Sales Orders, Purchase Orders, Customer Invoices, Vendor Bills, Expenses — shows only items linked to the current project.

4.2 Tasks
● Create task lists under projects.
● Assign users, due dates, priorities.
● States: New → In Progress → Blocked → Done.
● Log hours; add comments and attachments.
● Toggle My Tasks / All Tasks.

4.3 Analytics Dashboard
● KPI Cards: Total Projects, Tasks Completed, Hours Logged, Billable vs Non-billable Hours.
● Charts: Project Progress %, Resource Utilization, Project Cost vs Revenue.

5. Settings Menu (Global Lists)
   ● Menu items: Sales Orders, Purchase Orders, Customer Invoices, Vendor Bills, Expenses (and Products if needed).
   ● Each menu shows a global list (not filtered by a project).
   ● Users can:
   ○ Search (by number, partner, amount, state, etc.)
   ○ Filter (date, partner, state, project)
   ○ Group by (project, partner, state)
   ○ Create new or Link to a project
   ● Opening a document from here shows its form, where it can be linked to a project.
   ● Reminder: Inside a project, the Links panel shows the same document types but already filtered to that project for quick viewing.

6. Sales / Purchase / Billing (managed inside the project)
   ● Project → Settings is the single place to create or link:
   ○ Sales Orders (SO) — what the customer buys.
   ○ Purchase Orders (PO) — what you buy from vendors.
   ○ Customer Invoices — your revenue.
   ○ Vendor Bills — your cost from vendors.
   ○ Expenses — team out-of-pocket, billable or not.
   ● Links panel (top bar in a project) shows these docs filtered to the current project for quick viewing.
   ○ Generated invoice lines link back to the Project (and Sales Order if used).

7. Timesheets
   ● Task → Timesheets:
   ○ It refers to the working time of a particular person for a particular session or the day.
   ○ Timesheets billed on working days are billed or non-billed.
   ○ Each timesheet is an expense on the company (negative cash flow).
   ○ Each employee has a per hour set by the admin.

8. Concrete, Real-World Scenarios
   8.1 Fixed-price project
   Your company sells a “Brand Websiteˮ to a customer for ₹1,00,000.
   Flow:
   ● Salesperson creates a Sales Order (“Brand Website – ₹1,00,000ˮ) and links it to the Brand Website project.
   ● Project Manager adds milestones: Design (₹40k), Build (₹60k); creates tasks and assigns the team.
   ● When Design is Done, create a Customer Invoice for ₹40,000 from the project.
   ● When Build is Done, create a Customer Invoice for ₹60,000.
   ● Overview shows Revenue ₹1,00,000, costs so far, and Profit.

8.2 Vendor needed for part of the project
You sell the project to the customer (Sales Order) and also buy from a vendor.
Flow:
● Project Manager creates a Purchase Order to a vendor (e.g., photographer ₹12,000) and links it to the same project.
● Vendor finishes work and sends a Vendor Bill for ₹12,000 → Finance records it against the PO + project.
● The project shows actual cost ₹12,000 alongside revenue; profit stays accurate.

8.3 Team expense during the project
A team member incurs a small cost.
Flow:
● A developer travels to the client and submits an Expense of ₹1,500 with a receipt, linked to the project.
● Project Manager approves. If billable, add it to the next Customer Invoice; reimburse the team member.
● Project totals update: Cost +₹1,500, profit recalculated.

Why is this Hackathon Problem Important?
● Students will learn real-world ERP workflows and business workflow.
● Understand how modules talk to each other for Eg (Projects → Sales → Purchases).
● Practice problem-solving using business logic, not just coding.

Terminologies

1. Sales Order (SO)
   A document that defines what the customer buys — the agreed scope, price, and deliverables. It links directly to a project to represent revenue.

2. Purchase Order (PO)
   A document that records what the company buys from vendors to complete the project. It represents costs incurred to deliver the project.

3. Customer Invoice
   A financial document generated to bill the customer for work done or milestones completed. It tracks income generated per project.

4. Vendor Bill
   A document recording amounts payable to vendors for their goods or services. It contributes to the project’s total cost.

5. Timesheet
   A log of hours worked by team members on tasks. It can be billable or non-billable and directly affects cost calculation and profitability analysis.

6. Expense
   A reimbursement or cost item submitted by a team member (e.g., travel, tools) and linked to a project. Expenses can be billable (charged to the customer) or non-billable.

7. Project Management System
   A modular platform that allows planning, executing, and billing of projects within one unified interface. It integrates project, task, timesheet, and financial workflows.

Mockup: https://link.excalidraw.com/l/65VNwvy7c4X/8QsAHjxoXCE
