// ============================================================
// e-ENT Bazaar Admin Panel — API Contracts
// ============================================================
//
// Each interface maps directly to a real DB table.
// Property names are camelCase equivalents of snake_case DB columns.
// ============================================================

// ---------- Standard API Envelope ----------

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  statusCode: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================
// DB TABLE: admin_users
// ============================================================

export interface AdminUserRow {
  id: string; // uuid
  email: string; // text
  name: string; // text
  phone: string | null; // text
  isActive: boolean; // boolean (is_active)
  role: string; // text
  createdAt: string; // timestamptz (created_at)
  updatedAt: string; // timestamptz (updated_at)
  lastLogin: string | null; // timestamptz (last_login)
  loginAttempts: number; // integer (login_attempts)
  blockedUntil: string | null; // timestamptz (blocked_until)
}

// ============================================================
// DB TABLE: admin_access_logs
// ============================================================

export interface AdminAccessLogRow {
  id: string; // uuid
  email: string; // text
  status: string; // text
  ipAddress: string | null; // text (ip_address)
  userAgent: string | null; // text (user_agent)
  timestamp: string; // timestamptz
  sessionDuration: number | null; // integer (session_duration)
  failureReason: string | null; // text (failure_reason)
  createdAt: string; // timestamptz (created_at)
}

// ============================================================
// DB TABLE: otp_codes
// ============================================================

export interface OtpCodeRow {
  id: string; // uuid
  phone: string; // text
  code: string; // text
  expiresAt: string; // timestamptz (expires_at)
  used: boolean; // boolean
  createdAt: string; // timestamptz (created_at)
  authMethod: string; // text (auth_method)
}

// ============================================================
// DB VIEW: admin_access_stats (aggregated from admin_access_logs)
// ============================================================

export interface AdminAccessStatsRow {
  email: string; // text
  totalAttempts: number; // bigint (total_attempts)
  successfulLogins: number; // bigint (successful_logins)
  failedAttempts: number; // bigint (failed_attempts)
  blockedAttempts: number; // bigint (blocked_attempts)
  lastAttempt: string | null; // timestamptz (last_attempt)
  lastSuccessfulLogin: string | null; // timestamptz (last_successful_login)
}

// ============================================================
// DB TABLE: customers_auth
// ============================================================

export interface CustomersAuthRow {
  id: string; // uuid
  endcustomerId: string; // uuid (endcustomer_id)
  phone: string; // text
  phoneVerified: boolean; // boolean (phone_verified)
  lastLogin: string | null; // timestamptz (last_login)
  createdAt: string; // timestamptz (created_at)
  updatedAt: string; // timestamptz (updated_at)
  deletedAt: string | null; // timestamptz (deleted_at)
}

// ============================================================
// DB TABLE: manufacturers
// ============================================================

export interface ManufacturerRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName: string; // company_name
  state: string;
  district: string;
  city: string;
  country: string;
  pincode: string;
  kilnType: string; // kiln_type
  additionalInfo: string | null; // additional_info
  interestedInExclusiveServices: boolean; // interested_in_exclusive_services
  joinedDate: string | null; // joined_date
  isTestEntry: boolean; // is_test_entry
  createdAt: string; // created_at
  status: string;
  bizGst: string | null; // biz_gst
  eximCode: string | null; // exim_code
  panNo: string | null; // pan_no
  interestedInIndustryQuiz: boolean; // interested_in_industry_quiz
  updatedAt: string; // updated_at
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  isFeatured: boolean; // is_featured
  isVerified: boolean; // is_verified
  countryCode: string | null; // country_code
}

// ============================================================
// DB TABLE: endcustomers (Buyers)
// ============================================================

export interface EndcustomerRow {
  id: string;
  name: string;
  email: string;
  companyName: string | null; // company_name
  state: string | null;
  district: string | null;
  city: string | null;
  pinCode: string | null; // pin_code
  country: string | null;
  gstDetails: string | null; // gst_details
  createdAt: string; // created_at
  updatedAt: string; // updated_at
  vatno: string | null;
  panno: string | null;
  phone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  deletedAt: string | null; // deleted_at
}

// ============================================================
// DB TABLE: customers (separate from endcustomers)
// ============================================================

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName: string; // company_name
  state: string;
  district: string;
  kilnType: string; // kiln_type
  additionalInfo: string; // additional_info
  interestedInExclusiveServices: boolean; // interested_in_exclusive_services
  joinedDate: string | null; // joined_date
  createdAt: string; // created_at
}

// ============================================================
// DB TABLE: coal_providers
// ============================================================

export interface CoalProviderRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  companyName: string; // company_name
  state: string;
  district: string;
  city: string;
  pincode: string;
  supplyCapacity: string | null; // supply_capacity
  eximCode: string | null; // exim_code
  panNo: string | null; // pan_no
  bizGst: string | null; // biz_gst
  additionalInfo: string | null; // additional_info
  createdAt: string; // created_at
  updatedAt: string; // updated_at
  deliveryServiceArea: string | null; // delivery_service_area
  category: string | null;
  fuelTypes: string[]; // fuel_types (ARRAY)
  countryCode: string | null; // country_code
}

// ============================================================
// DB TABLE: transport_providers
// ============================================================

export interface TransportProviderRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName: string; // company_name
  country: string;
  state: string;
  district: string;
  city: string;
  pincode: string;
  transportType: string | null; // transport_type
  vehicleCapacity: string | null; // vehicle_capacity
  serviceArea: string | null; // service_area
  bizGst: string | null; // biz_gst
  panNo: string | null; // pan_no
  eximCode: string | null; // exim_code
  additionalInfo: string | null; // additional_info
  createdAt: string; // created_at
  updatedAt: string; // updated_at
  category: string | null;
  countryCode: string | null; // country_code
  transportTypes: string[]; // transport_types (ARRAY)
}

// ============================================================
// DB TABLE: labour_contractors
// ============================================================

export interface LabourContractorRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName: string; // company_name
  country: string;
  category: string | null;
  state: string;
  district: string;
  city: string;
  pincode: string;
  serviceTypes: string[]; // service_types (ARRAY)
  experienceYears: string | null; // experience_years
  serviceArea: string | null; // service_area
  additionalInfo: string | null; // additional_info
  bizGst: string | null; // biz_gst
  panNo: string | null; // pan_no
  eximCode: string | null; // exim_code
  latitude: number | null;
  longitude: number | null;
  isActive: boolean; // is_active
  createdAt: string; // created_at
  updatedAt: string; // updated_at
  aadharNo: string | null; // aadhar_no
}

// ============================================================
// DB TABLE: products
// ============================================================

export interface ProductRow {
  id: string;
  manufacturerId: string; // manufacturer_id
  name: string;
  description: string | null;
  price: number | null;
  imageUrl: string | null; // image_url
  category: string;
  createdAt: string; // created_at
  updatedAt: string; // updated_at
  isAvailable: boolean; // is_available
  specifications: Record<string, unknown> | null; // jsonb
  priceUnit: string | null; // price_unit
  dimensions: string | null;
  stockQuantity: number | null; // stock_quantity
}

// ============================================================
// DB TABLE: inquiries
// ============================================================

export interface InquiryRow {
  id: string;
  customerId: string; // customer_id
  manufacturerId: string; // manufacturer_id
  subject: string;
  message: string;
  status: string;
  createdAt: string; // created_at
  updatedAt: string; // updated_at
}

// ============================================================
// DB TABLE: inquiry_responses
// ============================================================

export interface InquiryResponseRow {
  id: string;
  inquiryId: string; // inquiry_id
  responseText: string; // response_text
  createdBy: string; // created_by (uuid)
  createdByName: string; // created_by_name
  createdAt: string; // created_at
}

// ============================================================
// DB TABLE: inquiry_response_history
// ============================================================

export interface InquiryResponseHistoryRow {
  id: string;
  inquiryId: string; // inquiry_id
  coalProviderId: string | null; // coal_provider_id
  manufacturerId: string | null; // manufacturer_id
  responseText: string; // response_text
  responseType: string; // response_type
  responseNumber: number; // response_number
  respondedBy: string; // responded_by
  isCurrentResponse: boolean; // is_current_response
  createdAt: string; // created_at
  updatedAt: string; // updated_at
}

// ============================================================
// DB TABLE: quotations
// ============================================================

export interface QuotationRow {
  id: string;
  customerId: string; // customer_id
  manufacturerId: string; // manufacturer_id
  productId: string | null; // product_id
  quantity: number;
  quotedPrice: number | null; // quoted_price
  totalAmount: number | null; // total_amount
  message: string | null;
  status: string;
  createdAt: string; // created_at
  updatedAt: string; // updated_at
  responseMessage: string | null; // response_message
  responseQuantity: number | null; // response_quantity
  responsePrice: number | null; // response_price
  offerExpiry: string | null; // offer_expiry
  respondedAt: string | null; // responded_at
}

// ============================================================
// DB TABLE: sample_orders
// ============================================================

export interface SampleOrderRow {
  id: string;
  customerId: string; // customer_id
  manufacturerId: string; // manufacturer_id
  productId: string | null; // product_id
  quantity: number;
  deliveryAddress: string; // delivery_address
  contactNumber: string; // contact_number
  status: string;
  adminResponse: string | null; // admin_response
  adminId: string | null; // admin_id
  createdAt: string; // created_at
  updatedAt: string; // updated_at
  price: number | null;
  totalAmount: number | null; // total_amount
}

// ============================================================
// DB TABLE: orders
// ============================================================

export interface OrderRow {
  id: string;
  customerId: string; // customer_id
  manufacturerId: string; // manufacturer_id (text — not uuid!)
  productId: string; // product_id (text — not uuid!)
  quantity: number;
  price: number | null;
  totalAmount: number | null; // total_amount
  deliveryAddress: string; // delivery_address
  contactNumber: string; // contact_number
  status: string;
  trackingNumber: string | null; // tracking_number
  createdAt: string; // created_at
  updatedAt: string; // updated_at
}

// ============================================================
// DB TABLE: coal_provider_manufacturer_inquiries
// ============================================================

export interface CoalProviderManufacturerInquiryRow {
  id: string;
  coalProviderId: string; // coal_provider_id
  manufacturerId: string; // manufacturer_id
  productId: string | null; // product_id
  inquiryType: string; // inquiry_type
  message: string;
  coalType: string | null; // coal_type
  quantity: number | null;
  unit: string | null;
  deliveryLocation: string | null; // delivery_location
  expectedDeliveryDate: string | null; // expected_delivery_date
  pricePerUnit: number | null; // price_per_unit
  status: string;
  createdAt: string; // created_at
  updatedAt: string; // updated_at
}

// ============================================================
// DB TABLE: manufacturer_coal_inquiries
// ============================================================

export interface ManufacturerCoalInquiryRow {
  id: string;
  manufacturerId: string; // manufacturer_id
  coalProviderId: string; // coal_provider_id
  productId: string | null; // product_id
  inquiryType: string; // inquiry_type
  message: string;
  quantity: number;
  unit: string;
  deliveryLocation: string; // delivery_location
  expectedDeliveryDate: string; // expected_delivery_date
  budgetRangeMin: number | null; // budget_range_min
  budgetRangeMax: number | null; // budget_range_max
  status: string;
  createdAt: string; // created_at
  updatedAt: string; // updated_at
  coalType: string; // coal_type
  providerResponse: string | null; // provider_response
  providerResponseDate: string | null; // provider_response_date
  respondedBy: string | null; // responded_by
}

// ============================================================
// DB TABLE: manufacturer_coal_quotations
// ============================================================

export interface ManufacturerCoalQuotationRow {
  id: string;
  inquiryId: string; // inquiry_id
  coalProviderId: string; // coal_provider_id
  manufacturerId: string; // manufacturer_id
  productId: string | null; // product_id
  coalType: string; // coal_type
  quantity: number;
  unit: string;
  pricePerUnit: number | null; // price_per_unit
  totalAmount: number | null; // total_amount
  deliveryLocation: string; // delivery_location
  deliveryTimeline: string; // delivery_timeline
  paymentTerms: string; // payment_terms
  validityPeriod: number; // validity_period
  additionalNotes: string | null; // additional_notes
  status: string;
  createdAt: string; // created_at
  updatedAt: string; // updated_at
}

// ============================================================
// DB TABLE: manufacturer_coal_orders
// ============================================================

export interface ManufacturerCoalOrderRow {
  id: string;
  quotationId: string | null; // quotation_id
  manufacturerId: string; // manufacturer_id
  coalProviderId: string; // coal_provider_id
  productId: string | null; // product_id
  orderNumber: string; // order_number
  coalType: string; // coal_type
  quantity: number;
  unit: string;
  pricePerUnit: number | null; // price_per_unit
  totalAmount: number | null; // total_amount
  deliveryLocation: string; // delivery_location
  expectedDeliveryDate: string; // expected_delivery_date
  actualDeliveryDate: string | null; // actual_delivery_date
  paymentStatus: string; // payment_status
  orderStatus: string; // order_status
  paymentTerms: string; // payment_terms
  specialInstructions: string | null; // special_instructions
  createdAt: string; // created_at
  updatedAt: string; // updated_at
}

// ============================================================
// DB TABLE: manufacturer_transport_inquiries
// ============================================================

export interface ManufacturerTransportInquiryRow {
  id: string;
  manufacturerId: string; // manufacturer_id
  transportProviderId: string; // transport_provider_id
  productId: string | null; // product_id
  inquiryType: string; // inquiry_type
  message: string;
  pickupLocation: string; // pickup_location
  deliveryLocation: string; // delivery_location
  cargoWeight: number | null; // cargo_weight
  cargoVolume: number | null; // cargo_volume
  expectedPickupDate: string; // expected_pickup_date
  expectedDeliveryDate: string; // expected_delivery_date
  transportType: string; // transport_type
  budgetRangeMin: number | null; // budget_range_min
  budgetRangeMax: number | null; // budget_range_max
  status: string;
  createdAt: string; // created_at
  updatedAt: string; // updated_at
}

// ============================================================
// DB TABLE: manufacturer_transport_orders
// ============================================================

export interface ManufacturerTransportOrderRow {
  id: string;
  quotationId: string | null; // quotation_id
  manufacturerId: string; // manufacturer_id
  transportProviderId: string; // transport_provider_id
  productId: string | null; // product_id
  orderNumber: string; // order_number
  pickupLocation: string; // pickup_location
  deliveryLocation: string; // delivery_location
  pickupDate: string; // pickup_date
  expectedDeliveryDate: string; // expected_delivery_date
  actualPickupDate: string | null; // actual_pickup_date
  actualDeliveryDate: string | null; // actual_delivery_date
  cargoDescription: string; // cargo_description
  cargoWeight: number | null; // cargo_weight
  transportType: string; // transport_type
  vehicleType: string; // vehicle_type
  totalCost: number | null; // total_cost
  paymentStatus: string; // payment_status
  orderStatus: string; // order_status
  trackingNumber: string | null; // tracking_number
  specialInstructions: string | null; // special_instructions
  createdAt: string; // created_at
  updatedAt: string; // updated_at
}

// ============================================================
// DB TABLE: manufacturer_transport_quotations
// ============================================================

export interface ManufacturerTransportQuotationRow {
  id: string;
  inquiryId: string; // inquiry_id
  transportProviderId: string; // transport_provider_id
  manufacturerId: string; // manufacturer_id
  productId: string | null; // product_id
  pickupLocation: string; // pickup_location
  deliveryLocation: string; // delivery_location
  transportType: string; // transport_type
  vehicleType: string; // vehicle_type
  cargoCapacity: number | null; // cargo_capacity
  pricePerKm: number | null; // price_per_km
  baseCharge: number | null; // base_charge
  totalEstimatedCost: number | null; // total_estimated_cost
  estimatedDuration: string; // estimated_duration
  paymentTerms: string; // payment_terms
  validityPeriod: number; // validity_period
  additionalNotes: string | null; // additional_notes
  status: string;
  createdAt: string; // created_at
  updatedAt: string; // updated_at
}

// ============================================================
// DB TABLE: transport_provider_manufacturer_inquiries
// ============================================================

export interface TransportProviderManufacturerInquiryRow {
  id: string;
  transportProviderId: string; // transport_provider_id
  manufacturerId: string; // manufacturer_id
  productId: string | null; // product_id
  inquiryType: string; // inquiry_type
  message: string;
  serviceType: string; // service_type
  coverageArea: string; // coverage_area
  vehicleTypes: string[]; // vehicle_types (ARRAY)
  capacityRange: string; // capacity_range
  pricePerKm: number | null; // price_per_km
  minimumCharge: number | null; // minimum_charge
  status: string;
  createdAt: string; // created_at
  updatedAt: string; // updated_at
}

// ============================================================
// DB TABLE: labour_contractor_inquiries
// ============================================================

export interface LabourContractorInquiryRow {
  id: string;
  labourContractorId: string; // labour_contractor_id
  clientName: string; // client_name
  clientEmail: string; // client_email
  clientPhone: string; // client_phone
  serviceType: string; // service_type
  projectDescription: string; // project_description
  location: string;
  budgetRange: string; // budget_range
  timeline: string;
  status: string;
  priority: string;
  response: string | null;
  responseDate: string | null; // response_date
  createdAt: string; // created_at
  updatedAt: string; // updated_at
}

// ============================================================
// DB TABLE: labour_contractor_projects
// ============================================================

export interface LabourContractorProjectRow {
  id: string;
  labourContractorId: string; // labour_contractor_id
  inquiryId: string; // inquiry_id
  projectName: string; // project_name
  clientName: string; // client_name
  clientContact: string; // client_contact
  serviceType: string; // service_type
  projectDescription: string; // project_description
  location: string;
  startDate: string; // start_date
  endDate: string; // end_date
  estimatedBudget: number | null; // estimated_budget
  actualCost: number | null; // actual_cost
  status: string;
  progressPercentage: number; // progress_percentage
  notes: string | null;
  createdAt: string; // created_at
  updatedAt: string; // updated_at
}

// ============================================================
// RATING TABLES (various *_ratings)
// ============================================================

export interface ManufacturerCoalRatingRow {
  id: string;
  orderId: string; // order_id
  manufacturerId: string; // manufacturer_id
  coalProviderId: string; // coal_provider_id
  rating: number;
  reviewTitle: string | null; // review_title
  reviewText: string | null; // review_text
  qualityRating: number; // quality_rating
  deliveryRating: number; // delivery_rating
  serviceRating: number; // service_rating
  wouldRecommend: boolean; // would_recommend
  isVerified: boolean; // is_verified
  createdAt: string; // created_at
  updatedAt: string; // updated_at
}

export interface ManufacturerTransportRatingRow {
  id: string;
  orderId: string; // order_id
  manufacturerId: string; // manufacturer_id
  transportProviderId: string; // transport_provider_id
  rating: number;
  reviewTitle: string | null; // review_title
  reviewText: string | null; // review_text
  punctualityRating: number; // punctuality_rating
  safetyRating: number; // safety_rating
  serviceRating: number; // service_rating
  wouldRecommend: boolean; // would_recommend
  isVerified: boolean; // is_verified
  createdAt: string; // created_at
  updatedAt: string; // updated_at
}

export interface CoalProviderManufacturerRatingRow {
  id: string;
  manufacturerId: string; // manufacturer_id
  coalProviderId: string; // coal_provider_id
  rating: number;
  reviewTitle: string | null; // review_title
  reviewText: string | null; // review_text
  paymentRating: number; // payment_rating
  communicationRating: number; // communication_rating
  professionalismRating: number; // professionalism_rating
  wouldWorkAgain: boolean; // would_work_again
  isVerified: boolean; // is_verified
  createdAt: string; // created_at
  updatedAt: string; // updated_at
}

export interface TransportProviderManufacturerRatingRow {
  id: string;
  manufacturerId: string; // manufacturer_id
  transportProviderId: string; // transport_provider_id
  rating: number;
  reviewTitle: string | null; // review_title
  reviewText: string | null; // review_text
  paymentRating: number; // payment_rating
  communicationRating: number; // communication_rating
  professionalismRating: number; // professionalism_rating
  wouldWorkAgain: boolean; // would_work_again
  isVerified: boolean; // is_verified
  createdAt: string; // created_at
  updatedAt: string; // updated_at
}

export interface LabourContractorRatingRow {
  id: string;
  labourContractorId: string; // labour_contractor_id
  projectId: string; // project_id
  clientName: string; // client_name
  rating: number;
  review: string | null; // review (not review_text!)
  serviceQuality: number; // service_quality
  timeliness: number;
  communication: number;
  valueForMoney: number; // value_for_money
  wouldRecommend: boolean; // would_recommend
  createdAt: string; // created_at
}

// ============================================================
// CMS TABLES
// ============================================================

export interface WebsiteContentRow {
  id: string;
  key: string;
  value: string;
  category: string;
  createdAt: string; // created_at
  updatedAt: string; // updated_at
}

export interface MobileAppContentRow {
  id: string;
  contentType: string; // content_type
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string | null; // image_url
  actionUrl: string | null; // action_url
  actionText: string | null; // action_text
  priority: number;
  isActive: boolean; // is_active
  targetAudience: string; // target_audience
  startDate: string | null; // start_date
  endDate: string | null; // end_date
  createdAt: string; // created_at
  updatedAt: string; // updated_at
}

export interface DownloadableResourceRow {
  id: string;
  title: string;
  description: string | null;
  fileName: string; // file_name
  fileUrl: string; // file_url
  fileType: string; // file_type
  fileSize: number; // file_size (bigint)
  category: string;
  isActive: boolean; // is_active
  downloadCount: number; // download_count
  createdAt: string; // created_at
  updatedAt: string; // updated_at
}

// ============================================================
// MISCELLANEOUS TABLES
// ============================================================

export interface FraudReportRow {
  id: string;
  createdAt: string; // created_at
  reporterPhone: string; // reporter_phone
  reporterCountryCode: string; // reporter_country_code
  reporterVerified: boolean; // reporter_verified
  category: string;
  title: string;
  description: string;
  state: string;
  district: string;
  city: string;
  attachments: string[]; // ARRAY
  status: string;
  source: string;
  latitude: string | null;
  longitude: string | null;
  reporterName: string; // reporter_name
  companyName: string; // company_name
  userCategory: string; // user_category
  country: string;
}

export interface ReachUsFormRow {
  id: string;
  firstName: string; // first_name
  lastName: string; // last_name
  email: string;
  phone: string;
  subject: string;
  message: string;
  createdAt: string; // created_at
  updatedAt: string; // updated_at
  userCategory: string; // user_category
}

export interface AppConfigRow {
  key: string;
  value: Record<string, unknown>; // jsonb
  createdAt: string; // created_at
  updatedAt: string; // updated_at
}

export interface UserRow {
  id: string;
  phone: string;
  firstName: string; // first_name
  lastName: string; // last_name
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  createdAt: string; // created_at
  updatedAt: string; // updated_at
}

// ============================================================
// ENDPOINT REGISTRY
// ============================================================
//
// Admin Auth (Phone + OTP — DB: otp_codes, admin_users):
//   POST   /api/admin/auth/send-otp     → { phone, countryCode } → { success, message }
//   POST   /api/admin/auth/verify-otp   → { phone, code, countryCode } → { success, token, admin: AdminUserRow }
//   POST   /api/admin/auth/google       → { idToken } → { success, token, admin: AdminUserRow }
//   GET    /api/admin/auth/me           → { success, admin: AdminUserRow } (requires admin JWT)
//
// Dashboard:
//   GET    /api/admin/dashboard         → DashboardResponse
//
// Sample Orders (DB: sample_orders):
//   GET    /api/admin/sample-orders     → PaginatedResponse<SampleOrderRow>
//   GET    /api/admin/sample-orders/:id → SampleOrderRow (+ JOINed customer, manufacturer, product)
//
// Orders (DB: orders):
//   GET    /api/admin/orders            → PaginatedResponse<OrderRow>
//   GET    /api/admin/orders/:id        → OrderRow (+ JOINed customer, manufacturer, product)
//
// Inquiries (DB: inquiries):
//   GET    /api/admin/inquiries         → PaginatedResponse<InquiryRow>
//   GET    /api/admin/inquiries/:id     → InquiryRow
//
// Quotations (DB: quotations):
//   GET    /api/admin/quotations        → PaginatedResponse<QuotationRow>
//   GET    /api/admin/quotations/:id    → QuotationRow
//
// Participants:
//   GET    /api/admin/participants?type=manufacturer       → PaginatedResponse<ManufacturerRow>
//   GET    /api/admin/participants?type=endcustomer        → PaginatedResponse<EndcustomerRow>
//   GET    /api/admin/participants?type=coal_provider      → PaginatedResponse<CoalProviderRow>
//   GET    /api/admin/participants?type=transport_provider → PaginatedResponse<TransportProviderRow>
//   GET    /api/admin/participants?type=labour_contractor  → PaginatedResponse<LabourContractorRow>
//   GET    /api/admin/participants/:id                     → ParticipantDetailResponse
//   GET    /api/admin/participants/:id/performance         → ParticipantPerformanceResponse
//   PATCH  /api/admin/participants/:id/activate            → ParticipantDetailResponse
//   PATCH  /api/admin/participants/:id/deactivate          → ParticipantDetailResponse
//
// Manufacturers:
//   GET    /api/admin/manufacturers            → PaginatedResponse<ManufacturerRow>
//   GET    /api/admin/manufacturers/:id        → ManufacturerRow
//   PUT    /api/admin/manufacturers/:id/verify → ManufacturerRow
//   PUT    /api/admin/manufacturers/:id/feature → ManufacturerRow
//
// Endcustomers:
//   GET    /api/admin/endcustomers             → PaginatedResponse<EndcustomerRow>
//   GET    /api/admin/endcustomers/:id         → EndcustomerRow
//
// Coal Providers:
//   GET    /api/admin/coal-providers           → PaginatedResponse<CoalProviderRow>
//   GET    /api/admin/coal-providers/:id       → CoalProviderRow
//
// Transport Providers:
//   GET    /api/admin/transport-providers      → PaginatedResponse<TransportProviderRow>
//   GET    /api/admin/transport-providers/:id  → TransportProviderRow
//
// Labour Contractors:
//   GET    /api/admin/labour-contractors       → PaginatedResponse<LabourContractorRow>
//   GET    /api/admin/labour-contractors/:id   → LabourContractorRow
//
// Ratings (read-only admin views):
//   GET    /api/admin/ratings/manufacturer-coal                → ManufacturerCoalRatingRow[]
//   GET    /api/admin/ratings/manufacturer-transport           → ManufacturerTransportRatingRow[]
//   GET    /api/admin/ratings/coal-provider-manufacturer       → CoalProviderManufacturerRatingRow[]
//   GET    /api/admin/ratings/transport-provider-manufacturer  → TransportProviderManufacturerRatingRow[]
//   GET    /api/admin/ratings/labour-contractor                → LabourContractorRatingRow[]
//
// Coal Flow:
//   GET    /api/admin/coal/inquiries           → CoalProviderManufacturerInquiryRow[] + ManufacturerCoalInquiryRow[]
//   GET    /api/admin/coal/quotations          → ManufacturerCoalQuotationRow[]
//   GET    /api/admin/coal/orders              → ManufacturerCoalOrderRow[]
//
// Transport Flow:
//   GET    /api/admin/transport/inquiries      → ManufacturerTransportInquiryRow[] + TransportProviderManufacturerInquiryRow[]
//   GET    /api/admin/transport/quotations     → ManufacturerTransportQuotationRow[]
//   GET    /api/admin/transport/orders         → ManufacturerTransportOrderRow[]
//
// Labour Flow:
//   GET    /api/admin/labour/inquiries         → LabourContractorInquiryRow[]
//   GET    /api/admin/labour/projects          → LabourContractorProjectRow[]
//
// CMS:
//   GET    /api/admin/cms/website-content      → WebsiteContentRow[]
//   PUT    /api/admin/cms/website-content/:id  → WebsiteContentRow
//   GET    /api/admin/cms/mobile-app-content   → MobileAppContentRow[]
//   PUT    /api/admin/cms/mobile-app-content/:id → MobileAppContentRow
//   GET    /api/admin/cms/resources            → DownloadableResourceRow[]
//   POST   /api/admin/cms/resources            → DownloadableResourceRow
//   DELETE /api/admin/cms/resources/:id        → { success: boolean }
//
// Miscellaneous:
//   GET    /api/admin/misc/fraud-reports       → FraudReportRow[]
//   GET    /api/admin/misc/contact-submissions → ReachUsFormRow[]
//   GET    /api/admin/misc/app-config          → AppConfigRow[]
//   PUT    /api/admin/misc/app-config/:key     → AppConfigRow
//   GET    /api/admin/misc/access-logs         → AdminAccessLogRow[]
//   GET    /api/admin/misc/access-stats        → AdminAccessStatsRow[]
//
// ============================================================
// SUMMARY
// ============================================================
// Total DB Tables/Views Covered: 60
// ============================================================
