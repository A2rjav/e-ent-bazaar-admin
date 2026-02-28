import type {
  AdminUser,
  DashboardData,
  OrderListItem,
  OrderDetail,
  Participant,
  Review,
  ParticipantType,
  RequestStatus,
} from "./types";

// ============================================================
// Mock Admin User — DB: admin_users
// ============================================================

export const mockAdminUser: AdminUser = {
  id: "admin-001",
  email: "admin@entbazaar.com",
  name: "Aadi Singhal",
  phone: "+91 98765 00000",
  isActive: true,
  role: "super_admin",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-02-09T08:30:00Z",
  lastLogin: "2026-02-09T08:30:00Z",
  loginAttempts: 0,
  blockedUntil: null,
};

/** List of admin users for Access Control (Super Admin configures kisko access dena hai). */
export const mockAdminUsers: AdminUser[] = [
  mockAdminUser,
  {
    id: "admin-002",
    email: "ops@entbazaar.com",
    name: "Operations Manager",
    phone: "+91 98765 00001", 
    isActive: true,
    role: "operation_manager",
    createdAt: "2026-01-15T00:00:00Z",
    updatedAt: "2026-02-09T08:30:00Z",
    lastLogin: "2026-02-09T07:00:00Z",
    loginAttempts: 0,
    blockedUntil: null,
  },
  {
    id: "admin-003",
    email: "content@entbazaar.com",
    name: "Content Team",
    phone: "+91 98765 00002",
    isActive: true,
    role: "content_team",
    createdAt: "2026-01-20T00:00:00Z",
    updatedAt: "2026-02-09T08:30:00Z",
    lastLogin: null,
    loginAttempts: 0,
    blockedUntil: null,
  },
];

// ============================================================
// Shared data arrays
// ============================================================

const statuses: RequestStatus[] = ["Pending", "Approved", "Shipped", "Delivered", "Cancelled", "Rejected"];
const productNames = ["Handmade Bricks", "Machine Clay Tiles", "Fly Ash Bricks", "AAC Blocks", "Clay Roof Tiles", "Concrete Blocks", "Paver Blocks", "Hollow Blocks", "Solid Blocks", "Interlocking Bricks"];
const customerNames = ["Ramesh Construction", "Gupta Builders", "Patel Infrastructure", "Singh & Sons Contractors", "Deccan Developers", "Malwa Construction Co", "Jaipur Build House", "Mumbai Metro Builders", "Chennai Construction Corp", "Kolkata Infra Projects"];
const manufacturerNames = ["Bharat Bricks Pvt Ltd", "Rajdhani Cement Works", "Gujarat Stone Suppliers", "Northern Steel Co", "Southern Tiles Ltd", "Central Stone Works", "Royal Cement Industries", "Western Sand Suppliers", "Eastern Aggregate Co", "National TMT Steel"];
const states = ["Maharashtra", "Gujarat", "Rajasthan", "Uttar Pradesh", "Madhya Pradesh", "Karnataka", "Tamil Nadu"];
const districts = ["Pune", "Ahmedabad", "Jaipur", "Lucknow", "Bhopal", "Bangalore", "Chennai"];
const cities = ["Pune", "Ahmedabad", "Jaipur", "Lucknow", "Bhopal", "Bangalore", "Chennai"];

// ============================================================
// Dashboard Data
// ============================================================

export const mockDashboardData: DashboardData = {
  summary: {
    totalSampleOrders: 87,
    totalOrders: 65,
    pendingSampleOrders: 12,
    pendingOrders: 8,
    deliveredOrders: 43,
    completionRate: 78.4,
  },
  statusCounts: [
    { status: "Pending", count: 20 },
    { status: "Approved", count: 18 },
    { status: "Shipped", count: 15 },
    { status: "Delivered", count: 43 },
    { status: "Cancelled", count: 8 },
    { status: "Rejected", count: 5 },
  ],
  regionDemand: [
    { state: "Maharashtra", totalOrders: 42, delivered: 28, pending: 6 },
    { state: "Gujarat", totalOrders: 34, delivered: 22, pending: 5 },
    { state: "Rajasthan", totalOrders: 26, delivered: 16, pending: 4 },
    { state: "Uttar Pradesh", totalOrders: 22, delivered: 13, pending: 3 },
    { state: "Madhya Pradesh", totalOrders: 18, delivered: 11, pending: 2 },
    { state: "Karnataka", totalOrders: 12, delivered: 8, pending: 1 },
    { state: "Tamil Nadu", totalOrders: 8, delivered: 5, pending: 1 },
  ],
  participantPerformance: [
    { id: "mfg-001", name: "Bharat Bricks Pvt Ltd", companyName: "Bharat Bricks Pvt Ltd", type: "manufacturer", totalOrders: 42, completedOrders: 28, averageRating: 4.2 },
    { id: "mfg-002", name: "Rajdhani Cement Works", companyName: "Rajdhani Cement Works", type: "manufacturer", totalOrders: 34, completedOrders: 22, averageRating: 3.8 },
    { id: "mfg-003", name: "Gujarat Stone Suppliers", companyName: "Gujarat Stone Suppliers", type: "manufacturer", totalOrders: 26, completedOrders: 16, averageRating: 4.5 },
  ],
};

// ============================================================
// Sample Orders — DB: sample_orders
// ============================================================

function generateSampleOrders(count: number): OrderListItem[] {
  const items: OrderListItem[] = [];
  for (let i = 1; i <= count; i++) {
    const dayOffset = Math.floor(i / 3);
    const date = new Date("2026-01-01");
    date.setDate(date.getDate() + dayOffset);

    items.push({
      id: `so-${String(i).padStart(3, "0")}`,
      orderType: "SAMPLE",
      customerId: `cust-${String((i % 10) + 1).padStart(3, "0")}`,
      manufacturerId: `mfg-${String((i % 10) + 1).padStart(3, "0")}`,
      productId: `prod-${String((i % 10) + 1).padStart(3, "0")}`,
      quantity: 100 + (i * 50),
      price: i % 4 === 0 ? null : 5 + Math.floor(Math.random() * 15),
      totalAmount: i % 4 === 0 ? null : (100 + (i * 50)) * (5 + Math.floor(Math.random() * 15)),
      deliveryAddress: `Industrial Area Phase-${(i % 3) + 1}, ${cities[i % cities.length]}, ${states[i % states.length]}`,
      contactNumber: `+91 98${String(700 + i).padStart(3, "0")} ${String(10000 + i * 111).slice(0, 5)}`,
      status: statuses[i % statuses.length],
      adminResponse: i % 5 === 0 ? "Sample approved for dispatch" : null,
      adminId: i % 5 === 0 ? "admin-001" : null,
      createdAt: date.toISOString(),
      updatedAt: new Date(date.getTime() + 86400000).toISOString(),
      customerName: customerNames[i % customerNames.length],
      manufacturerName: manufacturerNames[i % manufacturerNames.length],
      productName: productNames[i % productNames.length],
    });
  }
  return items;
}

// ============================================================
// Orders — DB: orders
// ============================================================

function generateOrders(count: number): OrderListItem[] {
  const items: OrderListItem[] = [];
  for (let i = 1; i <= count; i++) {
    const dayOffset = Math.floor(i / 2);
    const date = new Date("2026-01-05");
    date.setDate(date.getDate() + dayOffset);

    items.push({
      id: `ord-${String(i).padStart(3, "0")}`,
      orderType: "NORMAL",
      customerId: `cust-${String((i % 10) + 1).padStart(3, "0")}`,
      manufacturerId: `mfg-${String((i % 10) + 1).padStart(3, "0")}`,
      productId: `prod-${String((i % 10) + 1).padStart(3, "0")}`,
      quantity: 500 + (i * 100),
      price: 8 + Math.floor(Math.random() * 12),
      totalAmount: (500 + (i * 100)) * (8 + Math.floor(Math.random() * 12)),
      deliveryAddress: `Plot ${i * 10}, Industrial Estate, ${cities[i % cities.length]}, ${states[i % states.length]}`,
      contactNumber: `+91 99${String(100 + i).padStart(3, "0")} ${String(20000 + i * 222).slice(0, 5)}`,
      status: statuses[i % statuses.length],
      trackingNumber: i % 3 === 0 ? `TRK-${String(i).padStart(6, "0")}` : null,
      createdAt: date.toISOString(),
      updatedAt: new Date(date.getTime() + 86400000).toISOString(),
      customerName: customerNames[i % customerNames.length],
      manufacturerName: manufacturerNames[i % manufacturerNames.length],
      productName: productNames[i % productNames.length],
    });
  }
  return items;
}

export const mockSampleOrders: OrderListItem[] = generateSampleOrders(45);
export const mockOrders: OrderListItem[] = generateOrders(42);

// ============================================================
// Order Detail — for /requests/[id] page
// ============================================================

export function getMockOrderDetail(id: string): OrderDetail {
  // Find in sample orders first, then in orders
  const found =
    mockSampleOrders.find((o) => o.id === id) ||
    mockOrders.find((o) => o.id === id) ||
    mockSampleOrders[0];

  const custIdx = parseInt(found.customerId.split("-")[1]) - 1;
  const mfgIdx = parseInt(found.manufacturerId.split("-")[1]) - 1;

  return {
    ...found,
    customer: {
      id: found.customerId,
      name: customerNames[custIdx % customerNames.length].split(" ")[0] + " Kumar",
      companyName: customerNames[custIdx % customerNames.length],
      email: `contact@${customerNames[custIdx % customerNames.length].toLowerCase().replace(/\s+/g, "")}.com`,
      phone: "+91 98765 12345",
      state: states[custIdx % states.length],
      district: districts[custIdx % districts.length],
      city: cities[custIdx % cities.length],
    },
    manufacturer: {
      id: found.manufacturerId,
      name: manufacturerNames[mfgIdx % manufacturerNames.length].split(" ")[0] + " Sharma",
      companyName: manufacturerNames[mfgIdx % manufacturerNames.length],
      email: `info@${manufacturerNames[mfgIdx % manufacturerNames.length].toLowerCase().replace(/\s+/g, "")}.com`,
      phone: "+91 98765 54321",
      state: states[mfgIdx % states.length],
      district: districts[mfgIdx % districts.length],
      city: cities[mfgIdx % cities.length],
    },
    product: {
      id: found.productId,
      name: found.productName || productNames[0],
      category: "Construction Materials",
      price: found.price,
      priceUnit: "per unit",
    },
    statusHistory: [
      { id: "sh-1", toStatus: "Pending", changedBy: "System", createdAt: found.createdAt },
      ...(found.status !== "Pending"
        ? [
            {
              id: "sh-2",
              toStatus: found.status as RequestStatus,
              changedBy: manufacturerNames[mfgIdx % manufacturerNames.length],
              createdAt: found.updatedAt,
            },
          ]
        : []),
    ],
  };
}

// ============================================================
// Participants — DB: separate tables per type
// Common columns extracted into Participant interface
// ============================================================

function generateParticipants(type: ParticipantType, names: string[]): Participant[] {
  const categories: Record<ParticipantType, string[]> = {
    MANUFACTURER: ["Handmade Bricks", "Machine Clay Products", "Both"],
    ENDCUSTOMER: ["Builder", "Contractor", "Developer", "Individual"],
    COAL_PROVIDER: ["Bituminous", "Anthracite", "Lignite", "Mixed"],
    TRANSPORT_PROVIDER: ["Full Truck", "Part Load", "Container", "Tanker"],
    LABOUR_CONTRACTOR: ["Loading", "Unloading", "Kiln", "General"],
  };

  return names.map((cname, idx) => ({
    id: `${type.toLowerCase()}-${String(idx + 1).padStart(3, "0")}`,
    type,
    name: cname.split(" ")[0] + " " + (cname.split(" ")[1] || "Kumar"),
    email: `${cname.toLowerCase().replace(/\s+/g, ".")}@email.com`,
    phone: `+91 ${90000 + idx * 1111} ${10000 + idx * 1234}`,
    companyName: cname,
    state: states[idx % states.length],
    district: districts[idx % districts.length],
    city: cities[idx % cities.length],
    category: categories[type][idx % categories[type].length],
    createdAt: new Date(2025, 6 + (idx % 6), 1 + idx).toISOString(),
  }));
}

const coalProviderNames = ["Coal India Ltd", "Singareni Collieries", "Mahanadi Coalfields", "Western Coalfields Ltd", "Eastern Coal Traders", "Bharat Coal Suppliers", "National Fuel Corp", "Premium Coal Industries", "Central Fuel Depot", "Reliable Energy Supplies"];
const transportProviderNames = ["National Logistics Co", "Highway Transport Services", "Express Cargo Ltd", "Bharat Trucking Corp", "Reliable Freight Services", "Quick Haul Logistics", "Safe Transport Co", "Western Freight Lines", "Eastern Cargo Solutions", "Fast Track Logistics"];
const labourContractorNames = ["Singh Labour Services", "Patel Workforce Solutions", "National Manpower Co", "Reliable Labour Corp", "Skilled Hands Ltd", "Workforce India Pvt Ltd", "Builder Labour Services", "Premier Staffing Solutions", "Quality Manpower Services", "Expert Labour Contractors"];

export const mockParticipants: Record<ParticipantType, Participant[]> = {
  MANUFACTURER: generateParticipants("MANUFACTURER", manufacturerNames),
  ENDCUSTOMER: generateParticipants("ENDCUSTOMER", customerNames),
  COAL_PROVIDER: generateParticipants("COAL_PROVIDER", coalProviderNames),
  TRANSPORT_PROVIDER: generateParticipants("TRANSPORT_PROVIDER", transportProviderNames),
  LABOUR_CONTRACTOR: generateParticipants("LABOUR_CONTRACTOR", labourContractorNames),
};

// ============================================================
// Reviews — aggregated from various *_ratings tables
// ============================================================

export const mockReviews: Review[] = [
  { id: "rev-001", sourceTable: "manufacturer_coal_ratings", rating: 5, reviewTitle: "Excellent quality", reviewText: "Consistent quality coal supply. Highly reliable partner.", isVerified: true, wouldRecommend: true, createdAt: "2026-01-28T10:00:00Z", reviewerName: "Bharat Bricks Pvt Ltd", reviewerType: "Manufacturer", revieweeName: "Coal India Ltd", revieweeType: "Coal Provider" },
  { id: "rev-002", sourceTable: "manufacturer_transport_ratings", rating: 4, reviewTitle: "Good service", reviewText: "Fast and reliable delivery. Materials arrived in good condition.", isVerified: true, wouldRecommend: true, createdAt: "2026-01-27T14:30:00Z", reviewerName: "Rajdhani Cement Works", reviewerType: "Manufacturer", revieweeName: "National Logistics Co", revieweeType: "Transport Provider" },
  { id: "rev-003", sourceTable: "coal_provider_manufacturer_ratings", rating: 3, reviewTitle: "Average experience", reviewText: "Payment was slightly delayed but communication was decent.", isVerified: false, wouldRecommend: false, createdAt: "2026-01-26T09:15:00Z", reviewerName: "Coal India Ltd", reviewerType: "Coal Provider", revieweeName: "Gujarat Stone Suppliers", revieweeType: "Manufacturer" },
  { id: "rev-004", sourceTable: "transport_provider_manufacturer_ratings", rating: 5, reviewTitle: "Top-notch partner", reviewText: "Always pays on time and very professional.", isVerified: true, wouldRecommend: true, createdAt: "2026-01-25T16:45:00Z", reviewerName: "Express Cargo Ltd", reviewerType: "Transport Provider", revieweeName: "Northern Steel Co", revieweeType: "Manufacturer" },
  { id: "rev-005", sourceTable: "labour_contractor_ratings", rating: 4, reviewTitle: "Skilled workers", reviewText: "Good work ethic. Minor communication issues but overall positive.", isVerified: false, wouldRecommend: true, createdAt: "2026-01-24T11:00:00Z", reviewerName: "Project Client", reviewerType: "Client", revieweeName: "Singh Labour Services", revieweeType: "Labour Contractor" },
  { id: "rev-006", sourceTable: "manufacturer_coal_ratings", rating: 2, reviewTitle: "Inconsistent quality", reviewText: "Last two deliveries had high ash content. Not acceptable.", isVerified: true, wouldRecommend: false, createdAt: "2026-01-23T08:30:00Z", reviewerName: "National TMT Steel", reviewerType: "Manufacturer", revieweeName: "Eastern Coal Traders", revieweeType: "Coal Provider" },
  { id: "rev-007", sourceTable: "manufacturer_transport_ratings", rating: 4, reviewTitle: "Reliable transport", reviewText: "On-time pickup and delivery. Will use again.", isVerified: true, wouldRecommend: true, createdAt: "2026-01-22T13:20:00Z", reviewerName: "Central Stone Works", reviewerType: "Manufacturer", revieweeName: "Highway Transport Services", revieweeType: "Transport Provider" },
];

