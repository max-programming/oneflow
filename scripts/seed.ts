import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  users,
  customers,
  projects,
  projectTasks,
  projectTaskAssignees,
  projectTaskTimesheets,
  vendors,
  salesOrders,
  purchaseOrders,
  customerInvoices,
  vendorBills,
  expenses,
  type ProjectStatusEnum,
  type TaskStatusEnum,
  type InvoiceStatusEnum,
  type ExpenseApprovalStatusEnum,
} from "../src/db/schema";

config();

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client, { casing: "snake_case" });

// Project names and descriptions
const projectTemplates = [
  {
    name: "E-Commerce Platform Redesign",
    desc: "Complete overhaul of the existing e-commerce platform with modern UI/UX",
  },
  {
    name: "Mobile Banking App",
    desc: "Native iOS and Android banking application with secure transactions",
  },
  {
    name: "CRM System Integration",
    desc: "Integration of Salesforce CRM with existing ERP system",
  },
  {
    name: "Healthcare Portal Development",
    desc: "Patient management system with appointment scheduling",
  },
  {
    name: "Inventory Management System",
    desc: "Real-time inventory tracking and warehouse management",
  },
  {
    name: "Social Media Analytics Dashboard",
    desc: "Dashboard for tracking social media metrics and engagement",
  },
  {
    name: "AI Chatbot Implementation",
    desc: "Customer service chatbot using natural language processing",
  },
  {
    name: "Cloud Migration Project",
    desc: "Migration of on-premise infrastructure to AWS cloud",
  },
  {
    name: "Payment Gateway Integration",
    desc: "Integration of multiple payment processors",
  },
  {
    name: "Learning Management System",
    desc: "Online education platform with course management",
  },
  {
    name: "Real Estate Listing Platform",
    desc: "Property listing and search platform with virtual tours",
  },
  {
    name: "Restaurant POS System",
    desc: "Point of sale system for restaurant chains",
  },
  {
    name: "HR Management Portal",
    desc: "Employee management, payroll, and benefits system",
  },
  {
    name: "IoT Device Management",
    desc: "Platform for managing and monitoring IoT devices",
  },
  {
    name: "Video Streaming Service",
    desc: "Netflix-style video streaming platform",
  },
  {
    name: "Fitness Tracking App",
    desc: "Mobile app for workout tracking and nutrition planning",
  },
  {
    name: "Event Management System",
    desc: "Platform for organizing and managing corporate events",
  },
  {
    name: "Supply Chain Optimization",
    desc: "AI-powered supply chain management and optimization",
  },
  {
    name: "Customer Loyalty Program",
    desc: "Rewards and loyalty program management system",
  },
  {
    name: "Document Management System",
    desc: "Enterprise document storage and collaboration platform",
  },
  {
    name: "Blockchain Wallet App",
    desc: "Cryptocurrency wallet with multi-chain support",
  },
  {
    name: "Telemedicine Platform",
    desc: "Virtual healthcare consultation platform",
  },
  {
    name: "Fleet Management System",
    desc: "GPS tracking and fleet optimization system",
  },
  {
    name: "Hotel Booking Engine",
    desc: "Online hotel reservation and management system",
  },
  {
    name: "Project Portfolio Management",
    desc: "Enterprise project tracking and resource allocation",
  },
  {
    name: "Email Marketing Platform",
    desc: "Automated email campaign management system",
  },
  {
    name: "Business Intelligence Dashboard",
    desc: "Real-time analytics and reporting dashboard",
  },
  {
    name: "Appointment Scheduling System",
    desc: "Online booking system for service businesses",
  },
  {
    name: "Food Delivery Platform",
    desc: "Multi-restaurant food ordering and delivery app",
  },
  {
    name: "Contract Management System",
    desc: "Legal contract lifecycle management platform",
  },
  {
    name: "Asset Tracking System",
    desc: "RFID-based asset tracking and management",
  },
  {
    name: "Customer Feedback Portal",
    desc: "Survey and feedback collection platform",
  },
  {
    name: "Manufacturing Execution System",
    desc: "Production planning and shop floor management",
  },
  {
    name: "Warehouse Automation",
    desc: "Automated warehouse picking and packing system",
  },
  {
    name: "Travel Booking Platform",
    desc: "Integrated flight and hotel booking system",
  },
  {
    name: "Insurance Claims Processing",
    desc: "Automated insurance claim management system",
  },
  {
    name: "Real-time Collaboration Tool",
    desc: "Team collaboration and communication platform",
  },
  {
    name: "API Gateway Development",
    desc: "Microservices API gateway with rate limiting",
  },
  {
    name: "Subscription Management System",
    desc: "Recurring billing and subscription management",
  },
  {
    name: "Quality Assurance Platform",
    desc: "Bug tracking and test case management system",
  },
  {
    name: "Vendor Management Portal",
    desc: "Supplier onboarding and performance tracking",
  },
  {
    name: "Time Tracking System",
    desc: "Employee time tracking and attendance management",
  },
  {
    name: "Network Monitoring Tool",
    desc: "Real-time network infrastructure monitoring",
  },
  {
    name: "Customer Data Platform",
    desc: "Unified customer data and segmentation platform",
  },
  {
    name: "Auction Platform",
    desc: "Online bidding and auction management system",
  },
  {
    name: "Compliance Management System",
    desc: "Regulatory compliance tracking and reporting",
  },
  {
    name: "Field Service Management",
    desc: "Mobile workforce management and scheduling",
  },
  {
    name: "Energy Management System",
    desc: "Smart building energy monitoring and optimization",
  },
  {
    name: "Legal Case Management",
    desc: "Law firm case and client management system",
  },
  {
    name: "Digital Signage Platform",
    desc: "Content management for digital displays",
  },
];

// Task templates
const taskTemplates = [
  "Requirements Gathering and Analysis",
  "System Architecture Design",
  "Database Schema Design",
  "API Design and Documentation",
  "Frontend UI/UX Design",
  "Backend Development Setup",
  "Authentication System Implementation",
  "Payment Integration",
  "Testing Framework Setup",
  "Unit Test Development",
  "Integration Testing",
  "Performance Testing",
  "Security Audit",
  "Code Review",
  "Bug Fixes",
  "Feature Development",
  "API Endpoint Development",
  "Database Migration",
  "User Dashboard Creation",
  "Admin Panel Development",
  "Notification System",
  "Email Template Design",
  "Mobile Responsive Design",
  "Third-party API Integration",
  "Documentation Writing",
  "Deployment Pipeline Setup",
  "CI/CD Configuration",
  "Load Balancing Setup",
  "Cache Implementation",
  "Search Functionality",
  "File Upload System",
  "Export/Import Features",
  "Analytics Integration",
  "User Onboarding Flow",
  "Settings Page",
  "Profile Management",
  "Data Validation",
  "Error Handling",
  "Logging System",
  "Monitoring Setup",
];

// Customer companies
const customerCompanies = [
  {
    name: "TechCorp Solutions",
    email: "contact@techcorp.com",
    phone: "+1-555-0101",
  },
  {
    name: "Global Innovations Inc",
    email: "info@globalinnovations.com",
    phone: "+1-555-0102",
  },
  {
    name: "Digital Dynamics",
    email: "hello@digitaldynamics.com",
    phone: "+1-555-0103",
  },
  {
    name: "NextGen Systems",
    email: "support@nextgensys.com",
    phone: "+1-555-0104",
  },
  {
    name: "CloudFirst Technologies",
    email: "contact@cloudfirst.tech",
    phone: "+1-555-0105",
  },
  {
    name: "DataStream Analytics",
    email: "info@datastream.io",
    phone: "+1-555-0106",
  },
  {
    name: "SmartBiz Solutions",
    email: "hello@smartbiz.com",
    phone: "+1-555-0107",
  },
  {
    name: "Enterprise Connect",
    email: "contact@enterpriseconnect.com",
    phone: "+1-555-0108",
  },
  {
    name: "Innovate Labs",
    email: "info@innovatelabs.io",
    phone: "+1-555-0109",
  },
  {
    name: "Quantum Systems",
    email: "hello@quantumsys.com",
    phone: "+1-555-0110",
  },
  {
    name: "Velocity Software",
    email: "contact@velocitysoft.com",
    phone: "+1-555-0111",
  },
  {
    name: "Nexus Technologies",
    email: "info@nexustech.io",
    phone: "+1-555-0112",
  },
  {
    name: "Pinnacle Digital",
    email: "hello@pinnacledigital.com",
    phone: "+1-555-0113",
  },
  {
    name: "Apex Innovations",
    email: "contact@apexinnov.com",
    phone: "+1-555-0114",
  },
  {
    name: "Horizon Solutions",
    email: "info@horizonsol.com",
    phone: "+1-555-0115",
  },
  {
    name: "Sterling Systems",
    email: "hello@sterlingsys.com",
    phone: "+1-555-0116",
  },
  {
    name: "Prime Technologies",
    email: "contact@primetech.io",
    phone: "+1-555-0117",
  },
  {
    name: "Summit Software",
    email: "info@summitsoft.com",
    phone: "+1-555-0118",
  },
  {
    name: "Zenith Digital",
    email: "hello@zenithdigital.com",
    phone: "+1-555-0119",
  },
  {
    name: "Catalyst Innovations",
    email: "contact@catalystinnov.com",
    phone: "+1-555-0120",
  },
];

// Vendor companies
const vendorCompanies = [
  {
    name: "TechSupplies Inc",
    email: "contact@techsupplies.com",
    phone: "+1-555-1001",
    address: "123 Tech Street, Silicon Valley, CA 94025",
    paymentTerms: "Net 30",
  },
  {
    name: "CloudServices Pro",
    email: "billing@cloudservices.com",
    phone: "+1-555-1002",
    address: "456 Cloud Avenue, Seattle, WA 98101",
    paymentTerms: "Net 60",
  },
  {
    name: "DevTools Solutions",
    email: "info@devtools.com",
    phone: "+1-555-1003",
    address: "789 Dev Road, Austin, TX 78701",
    paymentTerms: "Net 30",
  },
  {
    name: "Hardware Depot",
    email: "sales@hardwaredepot.com",
    phone: "+1-555-1004",
    address: "321 Hardware Blvd, Boston, MA 02101",
    paymentTerms: "Net 45",
  },
  {
    name: "Software Licensing Corp",
    email: "licensing@softwarecorp.com",
    phone: "+1-555-1005",
    address: "654 License Lane, New York, NY 10001",
    paymentTerms: "Net 30",
  },
  {
    name: "Network Equipment Co",
    email: "orders@networkequip.com",
    phone: "+1-555-1006",
    address: "987 Network Dr, Denver, CO 80201",
    paymentTerms: "Net 60",
  },
  {
    name: "Security Solutions Ltd",
    email: "contact@securitysol.com",
    phone: "+1-555-1007",
    address: "147 Security Way, Atlanta, GA 30301",
    paymentTerms: "Net 30",
  },
  {
    name: "Consulting Partners",
    email: "info@consultingpartners.com",
    phone: "+1-555-1008",
    address: "258 Consulting Ave, Chicago, IL 60601",
    paymentTerms: "Net 45",
  },
  {
    name: "Data Center Services",
    email: "support@datacentersvs.com",
    phone: "+1-555-1009",
    address: "369 Data Center Rd, Phoenix, AZ 85001",
    paymentTerms: "Net 30",
  },
  {
    name: "Training Academy",
    email: "enroll@trainingacademy.com",
    phone: "+1-555-1010",
    address: "741 Training St, Portland, OR 97201",
    paymentTerms: "Net 30",
  },
];

// Expense categories
const expenseCategories = [
  "Travel",
  "Meals & Entertainment",
  "Software & Tools",
  "Hardware",
  "Training & Education",
  "Office Supplies",
  "Marketing",
  "Consulting Services",
  "Miscellaneous",
];

const statuses: ProjectStatusEnum[] = [
  "in-progress",
  "waiting-to-start",
  "completed",
  "on-hold",
  "cancelled",
];
const taskStatuses: TaskStatusEnum[] = [
  "waiting-to-start",
  "in-progress",
  "stuck",
  "done",
];
const invoiceStatuses: InvoiceStatusEnum[] = [
  "draft",
  "sent",
  "paid",
  "cancelled",
];
const expenseApprovalStatuses: ExpenseApprovalStatusEnum[] = [
  "pending",
  "approved",
  "rejected",
];
const tags = [
  "urgent",
  "high-priority",
  "backend",
  "frontend",
  "api",
  "database",
  "security",
  "ui-ux",
  "mobile",
  "web",
];

function randomDate(start: Date, end: Date): string {
  const date = new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
  return date.toISOString().split("T")[0];
}

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function randomAmount(min: number, max: number): string {
  return (Math.random() * (max - min) + min).toFixed(2);
}

function randomTaxPercentage(): string {
  const taxes = ["0.00", "5.00", "8.00", "10.00", "15.00", "18.00"];
  return randomElement(taxes);
}

function calculateTotalAmount(amount: string, taxPercentage: string): string {
  const amountNum = parseFloat(amount);
  const taxNum = parseFloat(taxPercentage);
  const total = amountNum * (1 + taxNum / 100);
  return total.toFixed(2);
}

function addDays(date: Date, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split("T")[0];
}

async function seed() {
  console.log("🌱 Starting database seeding...");

  try {
    // Fetch existing users
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} users in database`);

    // Get PMs (john1234 and user/Adnan)
    const projectManagers = allUsers.filter(
      (u) => u.role === "project-manager",
    );
    console.log(
      `Found ${projectManagers.length} project managers:`,
      projectManagers.map((pm) => pm.username),
    );

    // Get team members
    const teamMembers = allUsers.filter((u) => u.role === "team-member");
    console.log(
      `Found ${teamMembers.length} team members:`,
      teamMembers.map((tm) => tm.username),
    );

    // Get sales-finance users
    const salesFinanceUsers = allUsers.filter(
      (u) => u.role === "sales-finance",
    );
    console.log(
      `Found ${salesFinanceUsers.length} sales-finance users:`,
      salesFinanceUsers.map((sf) => sf.username),
    );

    if (projectManagers.length === 0) {
      console.error(
        "❌ No project managers found! Please ensure users have the correct roles.",
      );
      return;
    }

    if (teamMembers.length === 0) {
      console.error(
        "❌ No team members found! Please ensure users have the correct roles.",
      );
      return;
    }

    if (salesFinanceUsers.length === 0) {
      console.warn(
        "⚠️  No sales-finance users found! Financial data will be created by project managers.",
      );
    }

    // Create customers
    console.log("\n📦 Creating customers...");
    const createdCustomers = [];
    for (const customer of customerCompanies) {
      const [newCustomer] = await db
        .insert(customers)
        .values(customer)
        .onConflictDoNothing()
        .returning();
      if (newCustomer) {
        createdCustomers.push(newCustomer);
      }
    }
    console.log(`✅ Created ${createdCustomers.length} customers`);

    // Create vendors
    console.log("\n🏭 Creating vendors...");
    const createdVendors = [];
    for (const vendor of vendorCompanies) {
      const [newVendor] = await db
        .insert(vendors)
        .values(vendor)
        .onConflictDoNothing()
        .returning();
      if (newVendor) {
        createdVendors.push(newVendor);
      }
    }
    console.log(`✅ Created ${createdVendors.length} vendors`);

    // Create projects (50+)
    console.log("\n🚀 Creating projects...");
    const createdProjects = [];
    for (let i = 0; i < projectTemplates.length; i++) {
      const template = projectTemplates[i];
      const startDate = new Date(
        2024,
        Math.floor(Math.random() * 12),
        Math.floor(Math.random() * 28) + 1,
      );
      const deadlineDate = new Date(startDate);
      deadlineDate.setMonth(
        deadlineDate.getMonth() + Math.floor(Math.random() * 6) + 1,
      );

      const [project] = await db
        .insert(projects)
        .values({
          name: template.name,
          description: template.desc,
          status: randomElement(statuses),
          managerId: randomElement(projectManagers).id,
          customerId: randomElement(createdCustomers).id,
          startDate: randomDate(startDate, startDate),
          deadlineDate: randomDate(deadlineDate, deadlineDate),
          tags: randomElements(tags, Math.floor(Math.random() * 4) + 1),
        })
        .returning();

      createdProjects.push(project);

      if ((i + 1) % 10 === 0) {
        console.log(`  Created ${i + 1} projects...`);
      }
    }
    console.log(`✅ Created ${createdProjects.length} projects`);

    // Create tasks (150+)
    console.log("\n📋 Creating tasks...");
    let totalTasks = 0;
    for (const project of createdProjects) {
      const numTasks = Math.floor(Math.random() * 5) + 2; // 2-6 tasks per project

      for (let i = 0; i < numTasks; i++) {
        const taskStartDate = new Date(project.startDate!);
        taskStartDate.setDate(
          taskStartDate.getDate() + Math.floor(Math.random() * 30),
        );
        const taskDueDate = new Date(taskStartDate);
        taskDueDate.setDate(
          taskDueDate.getDate() + Math.floor(Math.random() * 30) + 7,
        );

        const [task] = await db
          .insert(projectTasks)
          .values({
            projectId: project.id,
            name: randomElement(taskTemplates),
            description: `Task for ${project.name} - ${randomElement(["High priority", "Medium priority", "Low priority"])}`,
            status: randomElement(taskStatuses),
            startDate: randomDate(taskStartDate, taskStartDate),
            dueDate: randomDate(taskDueDate, taskDueDate),
          })
          .returning();

        // Assign 1-3 team members to each task
        const numAssignees =
          Math.floor(Math.random() * Math.min(teamMembers.length, 3)) + 1;
        const assignedMembers = randomElements(teamMembers, numAssignees);

        for (const member of assignedMembers) {
          await db.insert(projectTaskAssignees).values({
            taskId: task.id,
            userId: member.id,
          });
        }

        // Create some timesheet entries (30% of tasks)
        if (Math.random() > 0.7) {
          for (const member of assignedMembers) {
            const numTimesheets = Math.floor(Math.random() * 3) + 1;
            for (let t = 0; t < numTimesheets; t++) {
              const startTime = new Date(taskStartDate);
              startTime.setHours(9 + Math.floor(Math.random() * 8));
              const endTime = new Date(startTime);
              endTime.setHours(
                endTime.getHours() + Math.floor(Math.random() * 4) + 2,
              );

              await db.insert(projectTaskTimesheets).values({
                projectId: project.id,
                taskId: task.id,
                userId: member.id,
                startTime: startTime,
                endTime: endTime,
                notes: randomElement([
                  "Worked on implementation",
                  "Code review and bug fixes",
                  "Testing and documentation",
                  "Meeting with client",
                  "Design updates",
                  "Performance optimization",
                  "Database migration",
                ]),
              });
            }
          }
        }

        totalTasks++;
      }

      if (totalTasks % 50 === 0) {
        console.log(`  Created ${totalTasks} tasks...`);
      }
    }
    console.log(`✅ Created ${totalTasks} tasks with assignees and timesheets`);

    // Determine who creates financial records
    const financialCreators =
      salesFinanceUsers.length > 0 ? salesFinanceUsers : projectManagers;

    // Create Sales Orders (30-40% of projects)
    console.log("\n💰 Creating sales orders...");
    let totalSalesOrders = 0;
    for (const project of createdProjects) {
      if (Math.random() > 0.65) {
        const amount = randomAmount(5000, 100000);
        const taxPercentage = randomTaxPercentage();
        const totalAmount = calculateTotalAmount(amount, taxPercentage);
        const orderDate = new Date(project.startDate!);

        const [salesOrder] = await db
          .insert(salesOrders)
          .values({
            orderNumber: `SO-${String(totalSalesOrders + 1).padStart(5, "0")}`,
            projectId: project.id,
            customerId: project.customerId,
            description: `Sales order for ${project.name}`,
            amount,
            taxPercentage,
            totalAmount,
            orderDate: orderDate.toISOString().split("T")[0],
            createdBy: randomElement(financialCreators).id,
          })
          .returning();

        totalSalesOrders++;

        // Create corresponding customer invoice (70% of sales orders)
        if (Math.random() > 0.3) {
          const invoiceDate = new Date(orderDate);
          invoiceDate.setDate(
            invoiceDate.getDate() + Math.floor(Math.random() * 14) + 1,
          );
          const dueDate = addDays(invoiceDate, 30);

          await db.insert(customerInvoices).values({
            invoiceNumber: `INV-${String(totalSalesOrders).padStart(5, "0")}`,
            projectId: project.id,
            customerId: project.customerId,
            salesOrderId: salesOrder.id,
            description: `Invoice for ${project.name}`,
            amount,
            taxPercentage,
            totalAmount,
            invoiceDate: invoiceDate.toISOString().split("T")[0],
            dueDate,
            status: randomElement(invoiceStatuses),
            createdBy: randomElement(financialCreators).id,
          });
        }
      }
    }
    console.log(`✅ Created ${totalSalesOrders} sales orders with invoices`);

    // Create Purchase Orders and Vendor Bills
    console.log("\n🛒 Creating purchase orders and vendor bills...");
    let totalPurchaseOrders = 0;
    let totalVendorBills = 0;
    for (const project of createdProjects) {
      // 40-50% of projects have purchase orders
      const numPOs =
        Math.random() > 0.55 ? Math.floor(Math.random() * 3) + 1 : 0;

      for (let i = 0; i < numPOs; i++) {
        const amount = randomAmount(2000, 50000);
        const taxPercentage = randomTaxPercentage();
        const totalAmount = calculateTotalAmount(amount, taxPercentage);
        const orderDate = new Date(project.startDate!);
        orderDate.setDate(orderDate.getDate() + Math.floor(Math.random() * 30));

        const [purchaseOrder] = await db
          .insert(purchaseOrders)
          .values({
            poNumber: `PO-${String(totalPurchaseOrders + 1).padStart(5, "0")}`,
            projectId: project.id,
            vendorId: randomElement(createdVendors).id,
            description: randomElement([
              "Software licenses",
              "Hardware equipment",
              "Consulting services",
              "Cloud infrastructure",
              "Security tools",
              "Development tools",
            ]),
            amount,
            taxPercentage,
            totalAmount,
            orderDate: orderDate.toISOString().split("T")[0],
            createdBy: randomElement([...projectManagers, ...financialCreators])
              .id,
          })
          .returning();

        totalPurchaseOrders++;

        // Create corresponding vendor bill (80% of purchase orders)
        if (Math.random() > 0.2) {
          const billDate = new Date(orderDate);
          billDate.setDate(
            billDate.getDate() + Math.floor(Math.random() * 21) + 7,
          );
          const dueDate = addDays(billDate, 30);

          await db.insert(vendorBills).values({
            billNumber: `BILL-${String(totalVendorBills + 1).padStart(5, "0")}`,
            projectId: project.id,
            vendorId: purchaseOrder.vendorId,
            purchaseOrderId: purchaseOrder.id,
            description: `Vendor bill for PO-${String(totalPurchaseOrders).padStart(5, "0")}`,
            amount,
            taxPercentage,
            totalAmount,
            billDate: billDate.toISOString().split("T")[0],
            dueDate,
            status: randomElement(invoiceStatuses),
            createdBy: randomElement(financialCreators).id,
          });
          totalVendorBills++;
        }
      }
    }
    console.log(
      `✅ Created ${totalPurchaseOrders} purchase orders and ${totalVendorBills} vendor bills`,
    );

    // Create Expenses
    console.log("\n💸 Creating expenses...");
    let totalExpenses = 0;
    for (const project of createdProjects) {
      // Each project gets 2-5 expenses
      const numExpenses = Math.floor(Math.random() * 4) + 2;

      for (let i = 0; i < numExpenses; i++) {
        const amount = randomAmount(50, 2000);
        const expenseDate = new Date(project.startDate!);
        expenseDate.setDate(
          expenseDate.getDate() + Math.floor(Math.random() * 60),
        );

        const billable = Math.random() > 0.5;
        const approvalStatus = randomElement(expenseApprovalStatuses);
        const submittedBy = randomElement(teamMembers);

        const expenseData: any = {
          expenseNumber: `EXP-${String(totalExpenses + 1).padStart(5, "0")}`,
          projectId: project.id,
          userId: submittedBy.id,
          description: randomElement([
            "Client meeting travel expenses",
            "Software subscription renewal",
            "Team training workshop",
            "Office supplies for project",
            "Client entertainment dinner",
            "Conference attendance",
            "Hardware purchase for development",
            "Marketing materials",
          ]),
          category: randomElement(expenseCategories),
          amount,
          expenseDate: expenseDate.toISOString().split("T")[0],
          billable,
          approvalStatus,
        };

        // If approved or rejected, add approver details
        if (approvalStatus !== "pending") {
          expenseData.approvedBy = randomElement(projectManagers).id;
          const approvalDate = new Date(expenseDate);
          approvalDate.setDate(
            approvalDate.getDate() + Math.floor(Math.random() * 7) + 1,
          );
          expenseData.approvedAt = approvalDate;
          if (approvalStatus === "rejected") {
            expenseData.notes = randomElement([
              "Not project-related",
              "Exceeds budget",
              "Missing receipt",
              "Already paid by company",
            ]);
          }
        }

        await db.insert(expenses).values(expenseData);
        totalExpenses++;
      }
    }
    console.log(`✅ Created ${totalExpenses} expenses`);

    console.log("\n🎉 Seeding completed successfully!");
    console.log(`
📊 Summary:
   - Customers: ${createdCustomers.length}
   - Vendors: ${createdVendors.length}
   - Projects: ${createdProjects.length}
   - Tasks: ${totalTasks}
   - Sales Orders: ${totalSalesOrders}
   - Purchase Orders: ${totalPurchaseOrders}
   - Vendor Bills: ${totalVendorBills}
   - Expenses: ${totalExpenses}
   - Project Managers: ${projectManagers.length}
   - Team Members: ${teamMembers.length}
   - Sales-Finance Users: ${salesFinanceUsers.length}
    `);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    await client.end();
  }
}

seed();
