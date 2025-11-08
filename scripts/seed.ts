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
  type ProjectStatusEnum,
  type TaskStatusEnum,
} from "../src/db/schema";

config();

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client, { casing: "snake_case" });

// Project names and descriptions
const projectTemplates = [
  { name: "E-Commerce Platform Redesign", desc: "Complete overhaul of the existing e-commerce platform with modern UI/UX" },
  { name: "Mobile Banking App", desc: "Native iOS and Android banking application with secure transactions" },
  { name: "CRM System Integration", desc: "Integration of Salesforce CRM with existing ERP system" },
  { name: "Healthcare Portal Development", desc: "Patient management system with appointment scheduling" },
  { name: "Inventory Management System", desc: "Real-time inventory tracking and warehouse management" },
  { name: "Social Media Analytics Dashboard", desc: "Dashboard for tracking social media metrics and engagement" },
  { name: "AI Chatbot Implementation", desc: "Customer service chatbot using natural language processing" },
  { name: "Cloud Migration Project", desc: "Migration of on-premise infrastructure to AWS cloud" },
  { name: "Payment Gateway Integration", desc: "Integration of multiple payment processors" },
  { name: "Learning Management System", desc: "Online education platform with course management" },
  { name: "Real Estate Listing Platform", desc: "Property listing and search platform with virtual tours" },
  { name: "Restaurant POS System", desc: "Point of sale system for restaurant chains" },
  { name: "HR Management Portal", desc: "Employee management, payroll, and benefits system" },
  { name: "IoT Device Management", desc: "Platform for managing and monitoring IoT devices" },
  { name: "Video Streaming Service", desc: "Netflix-style video streaming platform" },
  { name: "Fitness Tracking App", desc: "Mobile app for workout tracking and nutrition planning" },
  { name: "Event Management System", desc: "Platform for organizing and managing corporate events" },
  { name: "Supply Chain Optimization", desc: "AI-powered supply chain management and optimization" },
  { name: "Customer Loyalty Program", desc: "Rewards and loyalty program management system" },
  { name: "Document Management System", desc: "Enterprise document storage and collaboration platform" },
  { name: "Blockchain Wallet App", desc: "Cryptocurrency wallet with multi-chain support" },
  { name: "Telemedicine Platform", desc: "Virtual healthcare consultation platform" },
  { name: "Fleet Management System", desc: "GPS tracking and fleet optimization system" },
  { name: "Hotel Booking Engine", desc: "Online hotel reservation and management system" },
  { name: "Project Portfolio Management", desc: "Enterprise project tracking and resource allocation" },
  { name: "Email Marketing Platform", desc: "Automated email campaign management system" },
  { name: "Business Intelligence Dashboard", desc: "Real-time analytics and reporting dashboard" },
  { name: "Appointment Scheduling System", desc: "Online booking system for service businesses" },
  { name: "Food Delivery Platform", desc: "Multi-restaurant food ordering and delivery app" },
  { name: "Contract Management System", desc: "Legal contract lifecycle management platform" },
  { name: "Asset Tracking System", desc: "RFID-based asset tracking and management" },
  { name: "Customer Feedback Portal", desc: "Survey and feedback collection platform" },
  { name: "Manufacturing Execution System", desc: "Production planning and shop floor management" },
  { name: "Warehouse Automation", desc: "Automated warehouse picking and packing system" },
  { name: "Travel Booking Platform", desc: "Integrated flight and hotel booking system" },
  { name: "Insurance Claims Processing", desc: "Automated insurance claim management system" },
  { name: "Real-time Collaboration Tool", desc: "Team collaboration and communication platform" },
  { name: "API Gateway Development", desc: "Microservices API gateway with rate limiting" },
  { name: "Subscription Management System", desc: "Recurring billing and subscription management" },
  { name: "Quality Assurance Platform", desc: "Bug tracking and test case management system" },
  { name: "Vendor Management Portal", desc: "Supplier onboarding and performance tracking" },
  { name: "Time Tracking System", desc: "Employee time tracking and attendance management" },
  { name: "Network Monitoring Tool", desc: "Real-time network infrastructure monitoring" },
  { name: "Customer Data Platform", desc: "Unified customer data and segmentation platform" },
  { name: "Auction Platform", desc: "Online bidding and auction management system" },
  { name: "Compliance Management System", desc: "Regulatory compliance tracking and reporting" },
  { name: "Field Service Management", desc: "Mobile workforce management and scheduling" },
  { name: "Energy Management System", desc: "Smart building energy monitoring and optimization" },
  { name: "Legal Case Management", desc: "Law firm case and client management system" },
  { name: "Digital Signage Platform", desc: "Content management for digital displays" },
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
  { name: "TechCorp Solutions", email: "contact@techcorp.com", phone: "+1-555-0101" },
  { name: "Global Innovations Inc", email: "info@globalinnovations.com", phone: "+1-555-0102" },
  { name: "Digital Dynamics", email: "hello@digitaldynamics.com", phone: "+1-555-0103" },
  { name: "NextGen Systems", email: "support@nextgensys.com", phone: "+1-555-0104" },
  { name: "CloudFirst Technologies", email: "contact@cloudfirst.tech", phone: "+1-555-0105" },
  { name: "DataStream Analytics", email: "info@datastream.io", phone: "+1-555-0106" },
  { name: "SmartBiz Solutions", email: "hello@smartbiz.com", phone: "+1-555-0107" },
  { name: "Enterprise Connect", email: "contact@enterpriseconnect.com", phone: "+1-555-0108" },
  { name: "Innovate Labs", email: "info@innovatelabs.io", phone: "+1-555-0109" },
  { name: "Quantum Systems", email: "hello@quantumsys.com", phone: "+1-555-0110" },
  { name: "Velocity Software", email: "contact@velocitysoft.com", phone: "+1-555-0111" },
  { name: "Nexus Technologies", email: "info@nexustech.io", phone: "+1-555-0112" },
  { name: "Pinnacle Digital", email: "hello@pinnacledigital.com", phone: "+1-555-0113" },
  { name: "Apex Innovations", email: "contact@apexinnov.com", phone: "+1-555-0114" },
  { name: "Horizon Solutions", email: "info@horizonsol.com", phone: "+1-555-0115" },
  { name: "Sterling Systems", email: "hello@sterlingsys.com", phone: "+1-555-0116" },
  { name: "Prime Technologies", email: "contact@primetech.io", phone: "+1-555-0117" },
  { name: "Summit Software", email: "info@summitsoft.com", phone: "+1-555-0118" },
  { name: "Zenith Digital", email: "hello@zenithdigital.com", phone: "+1-555-0119" },
  { name: "Catalyst Innovations", email: "contact@catalystinnov.com", phone: "+1-555-0120" },
];

const statuses: ProjectStatusEnum[] = ["in-progress", "waiting-to-start", "completed", "on-hold"];
const taskStatuses: TaskStatusEnum[] = ["not-started", "in-progress", "on-hold", "completed", "cancelled"];
const tags = ["urgent", "high-priority", "backend", "frontend", "api", "database", "security", "ui-ux", "mobile", "web"];

function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

async function seed() {
  console.log("🌱 Starting database seeding...");

  try {
    // Fetch existing users
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} users in database`);

    // Get PMs (john1234 and user/Adnan)
    const projectManagers = allUsers.filter(u => u.role === "project-manager");
    console.log(`Found ${projectManagers.length} project managers:`, projectManagers.map(pm => pm.username));

    // Get team members
    const teamMembers = allUsers.filter(u => u.role === "team-member");
    console.log(`Found ${teamMembers.length} team members:`, teamMembers.map(tm => tm.username));

    if (projectManagers.length === 0) {
      console.error("❌ No project managers found! Please ensure users have the correct roles.");
      return;
    }

    if (teamMembers.length === 0) {
      console.error("❌ No team members found! Please ensure users have the correct roles.");
      return;
    }

    // Create customers
    console.log("\n📦 Creating customers...");
    const createdCustomers = [];
    for (const customer of customerCompanies) {
      const [newCustomer] = await db.insert(customers)
        .values(customer)
        .onConflictDoNothing()
        .returning();
      if (newCustomer) {
        createdCustomers.push(newCustomer);
      }
    }
    console.log(`✅ Created ${createdCustomers.length} customers`);

    // Create projects (50+)
    console.log("\n🚀 Creating projects...");
    const createdProjects = [];
    for (let i = 0; i < projectTemplates.length; i++) {
      const template = projectTemplates[i];
      const startDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      const deadlineDate = new Date(startDate);
      deadlineDate.setMonth(deadlineDate.getMonth() + Math.floor(Math.random() * 6) + 1);

      const [project] = await db.insert(projects).values({
        name: template.name,
        description: template.desc,
        status: randomElement(statuses),
        managerId: randomElement(projectManagers).id,
        customerId: randomElement(createdCustomers).id,
        startDate: randomDate(startDate, startDate),
        deadlineDate: randomDate(deadlineDate, deadlineDate),
        tags: randomElements(tags, Math.floor(Math.random() * 4) + 1),
      }).returning();

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
        taskStartDate.setDate(taskStartDate.getDate() + Math.floor(Math.random() * 30));
        const taskDueDate = new Date(taskStartDate);
        taskDueDate.setDate(taskDueDate.getDate() + Math.floor(Math.random() * 30) + 7);

        const [task] = await db.insert(projectTasks).values({
          projectId: project.id,
          name: randomElement(taskTemplates),
          description: `Task for ${project.name} - ${randomElement(["High priority", "Medium priority", "Low priority"])}`,
          status: randomElement(taskStatuses),
          startDate: randomDate(taskStartDate, taskStartDate),
          dueDate: randomDate(taskDueDate, taskDueDate),
        }).returning();

        // Assign 1-3 team members to each task
        const numAssignees = Math.floor(Math.random() * Math.min(teamMembers.length, 3)) + 1;
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
              endTime.setHours(endTime.getHours() + Math.floor(Math.random() * 4) + 2);

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

    console.log("\n🎉 Seeding completed successfully!");
    console.log(`
📊 Summary:
   - Customers: ${createdCustomers.length}
   - Projects: ${createdProjects.length}
   - Tasks: ${totalTasks}
   - Project Managers: ${projectManagers.length}
   - Team Members: ${teamMembers.length}
    `);

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    await client.end();
  }
}

seed();

