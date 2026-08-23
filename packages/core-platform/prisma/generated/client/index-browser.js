
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.PlatformPlanScalarFieldEnum = {
  id: 'id',
  name: 'name',
  price: 'price',
  entitlements: 'entitlements',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TenantScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  status: 'status',
  planId: 'planId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.PlatformSubscriptionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  planId: 'planId',
  status: 'status',
  currentPeriodEnd: 'currentPeriodEnd',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MarketplaceAppScalarFieldEnum = {
  id: 'id',
  appCode: 'appCode',
  name: 'name',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TenantMarketplaceAppScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  appId: 'appId',
  enabled: 'enabled',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TenantDomainScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  domain: 'domain',
  verified: 'verified',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TenantBrandingScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  logoUrl: 'logoUrl',
  faviconUrl: 'faviconUrl',
  primaryColor: 'primaryColor',
  secondaryColor: 'secondaryColor',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TenantSettingsScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  timezone: 'timezone',
  dateFormat: 'dateFormat',
  currency: 'currency',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FeatureFlagScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  feature: 'feature',
  enabled: 'enabled',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AuditSeedScalarFieldEnum = {
  id: 'id',
  version: 'version',
  appliedAt: 'appliedAt'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  passwordHash: 'passwordHash',
  globalRole: 'globalRole',
  emailVerified: 'emailVerified',
  preferredTenantId: 'preferredTenantId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.LifecycleTransitionScalarFieldEnum = {
  id: 'id',
  tenantMembershipId: 'tenantMembershipId',
  fromState: 'fromState',
  toState: 'toState',
  correlationId: 'correlationId',
  reason: 'reason',
  actorId: 'actorId',
  createdAt: 'createdAt'
};

exports.Prisma.TenantMembershipScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  userId: 'userId',
  roleId: 'roleId',
  state: 'state',
  isRevoked: 'isRevoked',
  revokedAt: 'revokedAt',
  revokedBy: 'revokedBy',
  version: 'version',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProfileScalarFieldEnum = {
  id: 'id',
  tenantMembershipId: 'tenantMembershipId',
  firstName: 'firstName',
  lastName: 'lastName',
  phone: 'phone',
  avatarUrl: 'avatarUrl',
  dob: 'dob',
  gender: 'gender',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RoleScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  isSystem: 'isSystem',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PermissionScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RolePermissionScalarFieldEnum = {
  id: 'id',
  roleId: 'roleId',
  permissionId: 'permissionId',
  createdAt: 'createdAt'
};

exports.Prisma.SessionScalarFieldEnum = {
  id: 'id',
  sessionToken: 'sessionToken',
  userId: 'userId',
  expires: 'expires',
  ip: 'ip',
  userAgent: 'userAgent',
  device: 'device',
  lastSeen: 'lastSeen',
  state: 'state',
  fingerprint: 'fingerprint',
  isRevoked: 'isRevoked',
  mfaVerified: 'mfaVerified',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.VerificationTokenScalarFieldEnum = {
  identifier: 'identifier',
  token: 'token',
  expires: 'expires'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  userId: 'userId',
  action: 'action',
  entity: 'entity',
  entityId: 'entityId',
  metadata: 'metadata',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  createdAt: 'createdAt'
};

exports.Prisma.CampusScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  address: 'address',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AcademicYearScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  startDate: 'startDate',
  endDate: 'endDate',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TermScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  academicYearId: 'academicYearId',
  name: 'name',
  startDate: 'startDate',
  endDate: 'endDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DepartmentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  description: 'description',
  parentId: 'parentId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ClassScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  level: 'level',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ArmScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  classId: 'classId',
  name: 'name',
  capacity: 'capacity',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SubjectGroupScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SubjectScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  code: 'code',
  subjectGroupId: 'subjectGroupId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TimetableScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  armId: 'armId',
  termId: 'termId',
  config: 'config',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StudentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  membershipId: 'membershipId',
  admissionNumber: 'admissionNumber',
  enrollmentDate: 'enrollmentDate',
  currentArmId: 'currentArmId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GuardianScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  membershipId: 'membershipId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StudentGuardianScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  guardianId: 'guardianId',
  relationship: 'relationship',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AdmissionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  studentId: 'studentId',
  status: 'status',
  applicationDate: 'applicationDate',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MedicalRecordScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  studentId: 'studentId',
  bloodGroup: 'bloodGroup',
  genotype: 'genotype',
  allergies: 'allergies',
  medicalConditions: 'medicalConditions',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DisciplineRecordScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  studentId: 'studentId',
  incidentDate: 'incidentDate',
  description: 'description',
  actionTaken: 'actionTaken',
  severity: 'severity',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AttendanceScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  studentId: 'studentId',
  armId: 'armId',
  date: 'date',
  status: 'status',
  remarks: 'remarks',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StaffScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  membershipId: 'membershipId',
  staffIdNumber: 'staffIdNumber',
  departmentId: 'departmentId',
  designation: 'designation',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EmploymentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  staffId: 'staffId',
  hireDate: 'hireDate',
  terminationDate: 'terminationDate',
  status: 'status',
  contractType: 'contractType',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PayrollScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  staffId: 'staffId',
  periodStart: 'periodStart',
  periodEnd: 'periodEnd',
  baseSalary: 'baseSalary',
  deductions: 'deductions',
  bonuses: 'bonuses',
  netPay: 'netPay',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LeaveRequestScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  staffId: 'staffId',
  type: 'type',
  startDate: 'startDate',
  endDate: 'endDate',
  reason: 'reason',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FeeCategoryScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  description: 'description',
  amount: 'amount',
  mandatory: 'mandatory',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InvoiceScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  studentId: 'studentId',
  termId: 'termId',
  invoiceNumber: 'invoiceNumber',
  totalAmount: 'totalAmount',
  amountPaid: 'amountPaid',
  status: 'status',
  dueDate: 'dueDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.InvoiceItemScalarFieldEnum = {
  id: 'id',
  invoiceId: 'invoiceId',
  feeCategoryId: 'feeCategoryId',
  description: 'description',
  amount: 'amount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  invoiceId: 'invoiceId',
  amount: 'amount',
  method: 'method',
  reference: 'reference',
  paymentDate: 'paymentDate',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ExpenseScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  amount: 'amount',
  category: 'category',
  description: 'description',
  date: 'date',
  receiptUrl: 'receiptUrl',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.IncomeScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  amount: 'amount',
  category: 'category',
  description: 'description',
  date: 'date',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ScholarshipScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  studentId: 'studentId',
  name: 'name',
  discountPercent: 'discountPercent',
  discountAmount: 'discountAmount',
  validUntil: 'validUntil',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ExamScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  termId: 'termId',
  subjectId: 'subjectId',
  title: 'title',
  totalMarks: 'totalMarks',
  isCBT: 'isCBT',
  date: 'date',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CBTQuestionScalarFieldEnum = {
  id: 'id',
  examId: 'examId',
  questionText: 'questionText',
  options: 'options',
  correctOption: 'correctOption',
  marks: 'marks',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ResultScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  examId: 'examId',
  studentId: 'studentId',
  score: 'score',
  grade: 'grade',
  remarks: 'remarks',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AssignmentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  subjectId: 'subjectId',
  classId: 'classId',
  teacherId: 'teacherId',
  title: 'title',
  description: 'description',
  dueDate: 'dueDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LessonNoteScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  subjectId: 'subjectId',
  teacherId: 'teacherId',
  title: 'title',
  content: 'content',
  week: 'week',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WebsiteScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  domain: 'domain',
  themeColors: 'themeColors',
  heroConfig: 'heroConfig',
  seoMeta: 'seoMeta',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  version: 'version',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PageScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  websiteId: 'websiteId',
  title: 'title',
  slug: 'slug',
  contentBlocks: 'contentBlocks',
  isPublished: 'isPublished',
  version: 'version',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NavigationMenuScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  websiteId: 'websiteId',
  links: 'links',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  version: 'version',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AIProviderConfigScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  provider: 'provider',
  settings: 'settings',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AIUsageLogScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  userId: 'userId',
  feature: 'feature',
  tokensUsed: 'tokensUsed',
  date: 'date',
  createdAt: 'createdAt'
};

exports.Prisma.PromptTemplateScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  feature: 'feature',
  systemPrompt: 'systemPrompt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HostelScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  capacity: 'capacity',
  wardenId: 'wardenId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HostelRoomScalarFieldEnum = {
  id: 'id',
  hostelId: 'hostelId',
  roomNumber: 'roomNumber',
  capacity: 'capacity',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BedAllocationScalarFieldEnum = {
  id: 'id',
  roomId: 'roomId',
  studentId: 'studentId',
  academicYearId: 'academicYearId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TransportVehicleScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  plateNumber: 'plateNumber',
  driverName: 'driverName',
  capacity: 'capacity',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TransportRouteScalarFieldEnum = {
  id: 'id',
  vehicleId: 'vehicleId',
  routeName: 'routeName',
  stops: 'stops',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LibraryBookScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  isbn: 'isbn',
  title: 'title',
  author: 'author',
  copiesAvailable: 'copiesAvailable',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BookBorrowingScalarFieldEnum = {
  id: 'id',
  bookId: 'bookId',
  studentId: 'studentId',
  borrowDate: 'borrowDate',
  returnDate: 'returnDate',
  dueDate: 'dueDate',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LibraryFineScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  borrowingId: 'borrowingId',
  amount: 'amount',
  reason: 'reason',
  status: 'status',
  invoiceId: 'invoiceId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotificationQueueScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  userId: 'userId',
  channel: 'channel',
  payload: 'payload',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentAttemptScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  gateway: 'gateway',
  status: 'status',
  reference: 'reference',
  response: 'response',
  retries: 'retries',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  paymentId: 'paymentId'
};

exports.Prisma.PaymentAllocationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  paymentId: 'paymentId',
  invoiceItemId: 'invoiceItemId',
  transactionId: 'transactionId',
  amount: 'amount',
  createdAt: 'createdAt'
};

exports.Prisma.PaymentPlanVersionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  paymentPlanId: 'paymentPlanId'
};

exports.Prisma.ChartOfAccountScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  code: 'code',
  name: 'name',
  type: 'type',
  isActive: 'isActive',
  description: 'description',
  createdAt: 'createdAt'
};

exports.Prisma.BankAccountScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  ledgerAccountId: 'ledgerAccountId',
  name: 'name',
  accountNumber: 'accountNumber',
  bankName: 'bankName',
  isActive: 'isActive',
  createdAt: 'createdAt'
};

exports.Prisma.AccountingPeriodScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  startDate: 'startDate',
  endDate: 'endDate',
  status: 'status',
  closedAt: 'closedAt',
  closedBy: 'closedBy',
  createdAt: 'createdAt'
};

exports.Prisma.FinancialTransactionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  periodId: 'periodId',
  reference: 'reference',
  type: 'type',
  source: 'source',
  description: 'description',
  transactionDate: 'transactionDate',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.JournalEntryLineScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  transactionId: 'transactionId',
  accountId: 'accountId',
  debit: 'debit',
  credit: 'credit',
  memo: 'memo',
  dimensionStudentId: 'dimensionStudentId',
  dimensionInvoiceId: 'dimensionInvoiceId',
  createdAt: 'createdAt'
};

exports.Prisma.ApprovalWorkflowScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  type: 'type',
  referenceId: 'referenceId',
  status: 'status',
  amount: 'amount',
  requesterId: 'requesterId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ApprovalStepScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  workflowId: 'workflowId',
  level: 'level',
  approverRole: 'approverRole',
  approverId: 'approverId',
  status: 'status',
  comments: 'comments',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ScheduledJobScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  type: 'type',
  status: 'status',
  payload: 'payload',
  logs: 'logs',
  lastRunAt: 'lastRunAt',
  nextRunAt: 'nextRunAt',
  retries: 'retries',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SequenceGeneratorScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  type: 'type',
  prefix: 'prefix',
  suffix: 'suffix',
  currentValue: 'currentValue',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AssetScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  websiteId: 'websiteId',
  mimeType: 'mimeType',
  url: 'url',
  size: 'size',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WebsiteDomainScalarFieldEnum = {
  id: 'id',
  websiteId: 'websiteId',
  domainName: 'domainName',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BellScheduleScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  periods: 'periods',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TimetableSlotScalarFieldEnum = {
  id: 'id',
  timetableId: 'timetableId',
  dayOfWeek: 'dayOfWeek',
  periodId: 'periodId',
  subjectId: 'subjectId',
  teacherId: 'teacherId',
  classId: 'classId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PolicyScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  description: 'description',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PolicyVersionScalarFieldEnum = {
  id: 'id',
  policyId: 'policyId',
  versionNumber: 'versionNumber',
  rules: 'rules',
  createdAt: 'createdAt'
};

exports.Prisma.SupportAccessGrantScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  tenantId: 'tenantId',
  expiresAt: 'expiresAt',
  reason: 'reason',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AdmissionCampaignScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  academicYearId: 'academicYearId',
  name: 'name',
  startDate: 'startDate',
  endDate: 'endDate',
  status: 'status',
  applicationFee: 'applicationFee',
  maxApplicants: 'maxApplicants',
  allowedClasses: 'allowedClasses',
  portalVisibility: 'portalVisibility',
  version: 'version',
  workflowId: 'workflowId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy'
};

exports.Prisma.AdmissionWorkflowScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  isDefault: 'isDefault',
  version: 'version',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy'
};

exports.Prisma.AdmissionWorkflowStageScalarFieldEnum = {
  id: 'id',
  workflowId: 'workflowId',
  name: 'name',
  orderIndex: 'orderIndex',
  requiresReview: 'requiresReview',
  isTerminal: 'isTerminal',
  permissions: 'permissions',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AdmissionFormScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  campaignId: 'campaignId',
  version: 'version',
  isPublished: 'isPublished',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy'
};

exports.Prisma.AdmissionFieldScalarFieldEnum = {
  id: 'id',
  formId: 'formId',
  label: 'label',
  type: 'type',
  isRequired: 'isRequired',
  orderIndex: 'orderIndex',
  visibilityRule: 'visibilityRule',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AdmissionFieldOptionScalarFieldEnum = {
  id: 'id',
  fieldId: 'fieldId',
  value: 'value',
  createdAt: 'createdAt'
};

exports.Prisma.AdmissionRequiredDocumentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  isRequired: 'isRequired',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy'
};

exports.Prisma.AdmissionApplicationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  campaignId: 'campaignId',
  applicantId: 'applicantId',
  admissionNumber: 'admissionNumber',
  studentFirstName: 'studentFirstName',
  studentLastName: 'studentLastName',
  studentDateOfBirth: 'studentDateOfBirth',
  customFields: 'customFields',
  formVersion: 'formVersion',
  currentStageId: 'currentStageId',
  paymentStatus: 'paymentStatus',
  version: 'version',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy'
};

exports.Prisma.AdmissionDocumentScalarFieldEnum = {
  id: 'id',
  applicationId: 'applicationId',
  requiredDocumentId: 'requiredDocumentId',
  fileUrl: 'fileUrl',
  verificationStatus: 'verificationStatus',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AdmissionReviewScalarFieldEnum = {
  id: 'id',
  applicationId: 'applicationId',
  reviewerId: 'reviewerId',
  stageId: 'stageId',
  score: 'score',
  comments: 'comments',
  recommendation: 'recommendation',
  version: 'version',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy'
};

exports.Prisma.DomainEventLogScalarFieldEnum = {
  eventId: 'eventId',
  eventType: 'eventType',
  aggregateId: 'aggregateId',
  aggregateType: 'aggregateType',
  version: 'version',
  occurredAt: 'occurredAt',
  correlationId: 'correlationId',
  causationId: 'causationId',
  tenantId: 'tenantId',
  payload: 'payload',
  createdAt: 'createdAt'
};

exports.Prisma.OutboxQueueScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  status: 'status',
  attempts: 'attempts',
  lastAttemptAt: 'lastAttemptAt',
  nextAttemptAt: 'nextAttemptAt',
  errorMessage: 'errorMessage',
  aggregateId: 'aggregateId',
  tenantId: 'tenantId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.IdempotencyRecordScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  consumer: 'consumer',
  createdAt: 'createdAt'
};

exports.Prisma.DocumentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  ownerType: 'ownerType',
  ownerId: 'ownerId',
  type: 'type',
  name: 'name',
  url: 'url',
  mimeType: 'mimeType',
  size: 'size',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.IdCardScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  ownerType: 'ownerType',
  ownerId: 'ownerId',
  issueDate: 'issueDate',
  expiryDate: 'expiryDate',
  status: 'status',
  verificationToken: 'verificationToken',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.TenantStatus = exports.$Enums.TenantStatus = {
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  INACTIVE: 'INACTIVE'
};

exports.SubStatus = exports.$Enums.SubStatus = {
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  CANCELED: 'CANCELED'
};

exports.GlobalRole = exports.$Enums.GlobalRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  USER: 'USER'
};

exports.IdentityState = exports.$Enums.IdentityState = {
  PROVISIONED: 'PROVISIONED',
  PENDING_ACTIVATION: 'PENDING_ACTIVATION',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  ARCHIVED: 'ARCHIVED',
  OFFBOARDED: 'OFFBOARDED'
};

exports.SessionState = exports.$Enums.SessionState = {
  ACTIVE: 'ACTIVE',
  REVOKED: 'REVOKED',
  EXPIRED: 'EXPIRED',
  LOGGED_OUT: 'LOGGED_OUT'
};

exports.YearStatus = exports.$Enums.YearStatus = {
  UPCOMING: 'UPCOMING',
  ACTIVE: 'ACTIVE',
  PAST: 'PAST'
};

exports.GuardianRelationship = exports.$Enums.GuardianRelationship = {
  FATHER: 'FATHER',
  MOTHER: 'MOTHER',
  SIBLING: 'SIBLING',
  UNCLE: 'UNCLE',
  AUNT: 'AUNT',
  GRANDPARENT: 'GRANDPARENT',
  OTHER: 'OTHER'
};

exports.AdmissionStatus = exports.$Enums.AdmissionStatus = {
  PENDING: 'PENDING',
  UNDER_REVIEW: 'UNDER_REVIEW',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  WAITLISTED: 'WAITLISTED'
};

exports.IncidentSeverity = exports.$Enums.IncidentSeverity = {
  MINOR: 'MINOR',
  MAJOR: 'MAJOR',
  SEVERE: 'SEVERE'
};

exports.AttendanceStatus = exports.$Enums.AttendanceStatus = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LATE: 'LATE',
  EXCUSED: 'EXCUSED'
};

exports.EmploymentStatus = exports.$Enums.EmploymentStatus = {
  ACTIVE: 'ACTIVE',
  ON_LEAVE: 'ON_LEAVE',
  TERMINATED: 'TERMINATED',
  SUSPENDED: 'SUSPENDED'
};

exports.PaymentStatus = exports.$Enums.PaymentStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  PAID: 'PAID',
  FAILED: 'FAILED'
};

exports.LeaveType = exports.$Enums.LeaveType = {
  SICK: 'SICK',
  ANNUAL: 'ANNUAL',
  MATERNITY: 'MATERNITY',
  UNPAID: 'UNPAID',
  OTHER: 'OTHER'
};

exports.LeaveStatus = exports.$Enums.LeaveStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELED: 'CANCELED'
};

exports.InvoiceStatus = exports.$Enums.InvoiceStatus = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  CANCELED: 'CANCELED'
};

exports.PaymentMethod = exports.$Enums.PaymentMethod = {
  CARD: 'CARD',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CASH: 'CASH',
  CHEQUE: 'CHEQUE'
};

exports.PaymentTransactionStatus = exports.$Enums.PaymentTransactionStatus = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED'
};

exports.AIProvider = exports.$Enums.AIProvider = {
  OPENAI: 'OPENAI',
  ANTHROPIC: 'ANTHROPIC',
  GEMINI: 'GEMINI'
};

exports.AIFeature = exports.$Enums.AIFeature = {
  LESSON_PLANNER: 'LESSON_PLANNER',
  REPORT_COMMENTS: 'REPORT_COMMENTS',
  TUTOR: 'TUTOR',
  PARENT_ASSISTANT: 'PARENT_ASSISTANT'
};

exports.BorrowStatus = exports.$Enums.BorrowStatus = {
  ISSUED: 'ISSUED',
  RETURNED: 'RETURNED',
  OVERDUE: 'OVERDUE',
  LOST: 'LOST'
};

exports.FineStatus = exports.$Enums.FineStatus = {
  ASSESSED: 'ASSESSED',
  SETTLED: 'SETTLED',
  WAIVED: 'WAIVED'
};

exports.NotificationChannel = exports.$Enums.NotificationChannel = {
  EMAIL: 'EMAIL',
  SMS: 'SMS',
  WHATSAPP: 'WHATSAPP',
  PUSH: 'PUSH'
};

exports.NotificationStatus = exports.$Enums.NotificationStatus = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED'
};

exports.AccountType = exports.$Enums.AccountType = {
  ASSET: 'ASSET',
  LIABILITY: 'LIABILITY',
  EQUITY: 'EQUITY',
  REVENUE: 'REVENUE',
  EXPENSE: 'EXPENSE'
};

exports.PeriodStatus = exports.$Enums.PeriodStatus = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED'
};

exports.TransactionType = exports.$Enums.TransactionType = {
  INVOICE_ISSUE: 'INVOICE_ISSUE',
  PAYMENT_RECEIPT: 'PAYMENT_RECEIPT',
  ALLOCATION: 'ALLOCATION',
  REFUND: 'REFUND',
  ADJUSTMENT: 'ADJUSTMENT',
  REVERSAL: 'REVERSAL',
  TRANSFER: 'TRANSFER'
};

exports.TransactionStatus = exports.$Enums.TransactionStatus = {
  POSTED: 'POSTED',
  VOIDED: 'VOIDED'
};

exports.CampaignStatus = exports.$Enums.CampaignStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED'
};

exports.FieldType = exports.$Enums.FieldType = {
  TEXT: 'TEXT',
  DROPDOWN: 'DROPDOWN',
  DATE: 'DATE',
  FILE: 'FILE'
};

exports.DocVerificationStatus = exports.$Enums.DocVerificationStatus = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED'
};

exports.RecommendationStatus = exports.$Enums.RecommendationStatus = {
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  HOLD: 'HOLD'
};

exports.OutboxStatus = exports.$Enums.OutboxStatus = {
  PENDING: 'PENDING',
  FAILED: 'FAILED',
  COMPLETED: 'COMPLETED',
  QUARANTINED: 'QUARANTINED'
};

exports.Prisma.ModelName = {
  PlatformPlan: 'PlatformPlan',
  Tenant: 'Tenant',
  PlatformSubscription: 'PlatformSubscription',
  MarketplaceApp: 'MarketplaceApp',
  TenantMarketplaceApp: 'TenantMarketplaceApp',
  TenantDomain: 'TenantDomain',
  TenantBranding: 'TenantBranding',
  TenantSettings: 'TenantSettings',
  FeatureFlag: 'FeatureFlag',
  AuditSeed: 'AuditSeed',
  User: 'User',
  LifecycleTransition: 'LifecycleTransition',
  TenantMembership: 'TenantMembership',
  Profile: 'Profile',
  Role: 'Role',
  Permission: 'Permission',
  RolePermission: 'RolePermission',
  Session: 'Session',
  VerificationToken: 'VerificationToken',
  AuditLog: 'AuditLog',
  Campus: 'Campus',
  AcademicYear: 'AcademicYear',
  Term: 'Term',
  Department: 'Department',
  Class: 'Class',
  Arm: 'Arm',
  SubjectGroup: 'SubjectGroup',
  Subject: 'Subject',
  Timetable: 'Timetable',
  Student: 'Student',
  Guardian: 'Guardian',
  StudentGuardian: 'StudentGuardian',
  Admission: 'Admission',
  MedicalRecord: 'MedicalRecord',
  DisciplineRecord: 'DisciplineRecord',
  Attendance: 'Attendance',
  Staff: 'Staff',
  Employment: 'Employment',
  Payroll: 'Payroll',
  LeaveRequest: 'LeaveRequest',
  FeeCategory: 'FeeCategory',
  Invoice: 'Invoice',
  InvoiceItem: 'InvoiceItem',
  Payment: 'Payment',
  Expense: 'Expense',
  Income: 'Income',
  Scholarship: 'Scholarship',
  Exam: 'Exam',
  CBTQuestion: 'CBTQuestion',
  Result: 'Result',
  Assignment: 'Assignment',
  LessonNote: 'LessonNote',
  Website: 'Website',
  Page: 'Page',
  NavigationMenu: 'NavigationMenu',
  AIProviderConfig: 'AIProviderConfig',
  AIUsageLog: 'AIUsageLog',
  PromptTemplate: 'PromptTemplate',
  Hostel: 'Hostel',
  HostelRoom: 'HostelRoom',
  BedAllocation: 'BedAllocation',
  TransportVehicle: 'TransportVehicle',
  TransportRoute: 'TransportRoute',
  LibraryBook: 'LibraryBook',
  BookBorrowing: 'BookBorrowing',
  LibraryFine: 'LibraryFine',
  NotificationQueue: 'NotificationQueue',
  PaymentAttempt: 'PaymentAttempt',
  PaymentAllocation: 'PaymentAllocation',
  PaymentPlanVersion: 'PaymentPlanVersion',
  ChartOfAccount: 'ChartOfAccount',
  BankAccount: 'BankAccount',
  AccountingPeriod: 'AccountingPeriod',
  FinancialTransaction: 'FinancialTransaction',
  JournalEntryLine: 'JournalEntryLine',
  ApprovalWorkflow: 'ApprovalWorkflow',
  ApprovalStep: 'ApprovalStep',
  ScheduledJob: 'ScheduledJob',
  SequenceGenerator: 'SequenceGenerator',
  Asset: 'Asset',
  WebsiteDomain: 'WebsiteDomain',
  BellSchedule: 'BellSchedule',
  TimetableSlot: 'TimetableSlot',
  Policy: 'Policy',
  PolicyVersion: 'PolicyVersion',
  SupportAccessGrant: 'SupportAccessGrant',
  AdmissionCampaign: 'AdmissionCampaign',
  AdmissionWorkflow: 'AdmissionWorkflow',
  AdmissionWorkflowStage: 'AdmissionWorkflowStage',
  AdmissionForm: 'AdmissionForm',
  AdmissionField: 'AdmissionField',
  AdmissionFieldOption: 'AdmissionFieldOption',
  AdmissionRequiredDocument: 'AdmissionRequiredDocument',
  AdmissionApplication: 'AdmissionApplication',
  AdmissionDocument: 'AdmissionDocument',
  AdmissionReview: 'AdmissionReview',
  DomainEventLog: 'DomainEventLog',
  OutboxQueue: 'OutboxQueue',
  IdempotencyRecord: 'IdempotencyRecord',
  Document: 'Document',
  IdCard: 'IdCard'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
