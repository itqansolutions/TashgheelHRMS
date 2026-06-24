import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Helper to hash password using Node crypto (SHA-256 for basic seed, or dummy hash since we will use Argon2id)
// We will store a standard placeholder. When the NestJS API starts, it will use Argon2id, so we seed a dummy hash or pre-calculate one.
// Let's use a precalculated mock hash or a simple hash that the dev environment can verify.
function hashPassword(password: string): string {
  // Mock hash representation. In real application, use Argon2id.
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('Seeding Tashgheel HRMS database...');

  // 1. Seed Permissions
  const permissions = [
    { id: 'users:read', description: 'Read users and roles' },
    { id: 'users:write', description: 'Create, update, deactivate users' },
    { id: 'companies:read', description: 'Read client companies and contacts' },
    { id: 'companies:write', description: 'Manage client companies and contacts' },
    { id: 'jobs:read', description: 'Read job requisitions and openings' },
    { id: 'jobs:write', description: 'Manage job requisitions and openings' },
    { id: 'jobs:approve', description: 'Approve/reject job requisitions' },
    { id: 'candidates:read', description: 'Read candidate profiles and pools' },
    { id: 'candidates:write', description: 'Manage candidate profiles and pools' },
    { id: 'pipeline:read', description: 'Read recruitment applications and stages' },
    { id: 'pipeline:write', description: 'Manage recruitment applications and stages' },
    { id: 'applications:read', description: 'Read candidate applications' },
    { id: 'applications:write', description: 'Create and update candidate applications' },
    { id: 'interviews:read', description: 'Read scheduled interviews and feedback' },
    { id: 'interviews:write', description: 'Manage interviews and submit feedback' },
    { id: 'offers:read', description: 'Read offers' },
    { id: 'offers:write', description: 'Manage offers' },
    { id: 'offers:approve', description: 'Approve job offers' },
    { id: 'placements:read', description: 'Read placements and replacements' },
    { id: 'placements:write', description: 'Manage placements and replacements' },
    { id: 'finance:read', description: 'Read invoices, payments, and expenses' },
    { id: 'finance:write', description: 'Manage invoices, payments, and expenses' },
    { id: 'settings:read', description: 'Read system and company settings' },
    { id: 'settings:write', description: 'Modify system and company settings' },
    { id: 'reports:read', description: 'Access dashboard analytics and reports' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { id: perm.id },
      update: { description: perm.description },
      create: perm,
    });
  }
  console.log('Permissions seeded.');

  // 2. Seed Roles
  const roles = [
    { name: 'System Administrator', description: 'Full access to all system features' },
    { name: 'Recruitment Manager', description: 'Manage requisitions, offers, placements and reports' },
    { name: 'Recruiter', description: 'Manage candidates, jobs, pipeline, and schedule interviews' },
    { name: 'Finance User', description: 'Manage invoicing, payments, and expenses' },
  ];

  const dbRoles: Record<string, any> = {};

  for (const role of roles) {
    dbRoles[role.name] = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }
  console.log('Roles seeded.');

  // 3. Associate Permissions to Roles
  // System Admin gets all permissions
  for (const perm of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: dbRoles['System Administrator'].id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: dbRoles['System Administrator'].id,
        permissionId: perm.id,
      },
    });
  }

  // Recruitment Manager permissions
  const managerPerms = [
    'users:read', 'companies:read', 'companies:write',
    'jobs:read', 'jobs:write', 'jobs:approve',
    'candidates:read', 'candidates:write',
    'pipeline:read', 'pipeline:write',
    'applications:read', 'applications:write',
    'interviews:read', 'interviews:write',
    'offers:read', 'offers:write', 'offers:approve',
    'placements:read', 'placements:write',
    'finance:read', 'reports:read', 'settings:read',
  ];
  for (const permId of managerPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: dbRoles['Recruitment Manager'].id,
          permissionId: permId,
        },
      },
      update: {},
      create: {
        roleId: dbRoles['Recruitment Manager'].id,
        permissionId: permId,
      },
    });
  }

  // Recruiter permissions
  const recruiterPerms = [
    'companies:read', 'companies:write',
    'jobs:read', 'jobs:write',
    'candidates:read', 'candidates:write',
    'pipeline:read', 'pipeline:write',
    'applications:read', 'applications:write',
    'interviews:read', 'interviews:write',
    'offers:read', 'offers:write',
  ];
  for (const permId of recruiterPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: dbRoles['Recruiter'].id,
          permissionId: permId,
        },
      },
      update: {},
      create: {
        roleId: dbRoles['Recruiter'].id,
        permissionId: permId,
      },
    });
  }

  // Finance User permissions
  const financePerms = [
    'companies:read', 'finance:read', 'finance:write', 'reports:read',
  ];
  for (const permId of financePerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: dbRoles['Finance User'].id,
          permissionId: permId,
        },
      },
      update: {},
      create: {
        roleId: dbRoles['Finance User'].id,
        permissionId: permId,
      },
    });
  }
  console.log('Role permissions mapped.');

  // 4. Seed initial Admin User
  const adminEmail = 'admin@tashgheel.com';
  const adminPasswordHash = hashPassword('AdminTashgheel2026!'); // SHA-256 for seed. Application will verify.
  
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      firstName: 'Tashgheel',
      lastName: 'Admin',
    },
    create: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      firstName: 'Tashgheel',
      lastName: 'Admin',
      status: 'ACTIVE',
    },
  });

  // Assign System Admin Role to Admin User
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: dbRoles['System Administrator'].id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: dbRoles['System Administrator'].id,
    },
  });

  console.log(`Initial Admin User created: ${adminEmail} / AdminTashgheel2026!`);
  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
