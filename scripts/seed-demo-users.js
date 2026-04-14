require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const SCHOOL_ID = 'aisj_school_001';
const COURSE_ID = 'course_ap_bio_unit3';
const PASSWORD = 'AISJ@Falcon';

const DEMO_USERS = [
  { id: 'user_demo_teacher', email: 'demo.teacher@aisj.edu.sa', name: 'Demo Teacher', role: 'TEACHER' },
  { id: 'user_demo_student', email: 'demo.student@aisj.edu.sa', name: 'Demo Student', role: 'STUDENT' },
  { id: 'user_demo_parent',  email: 'demo.parent@aisj.edu.sa',  name: 'Demo Parent',  role: 'PARENT'  },
];

// Week 1: 5 lessons all COMPLETED
const W1_LESSONS = ['les_bio_w1_l1', 'les_bio_w1_l2', 'les_bio_w1_l3', 'les_bio_w1_l4', 'les_bio_w1_l5'];
// Week 2: first 4 lessons COMPLETED (l4 is the quiz)
const W2_LESSONS_DONE = ['les_bio_w2_l1', 'les_bio_w2_l2', 'les_bio_w2_l3', 'les_bio_w2_l4'];

async function createOrGetAuthUser(email, name) {
  // Try to find existing auth user by email
  const { data: listData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = listData?.users?.find((u) => u.email === email);
  if (existing) {
    console.log(`  Auth user already exists: ${email} (${existing.id})`);
    return existing.id;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error) throw new Error(`Failed to create auth user ${email}: ${error.message}`);
  console.log(`  Created auth user: ${email} (${data.user.id})`);
  return data.user.id;
}

async function main() {
  console.log('=== Seeding demo users ===\n');

  // 1. Create Supabase Auth + DB User records
  const userIds = {};
  for (const u of DEMO_USERS) {
    console.log(`Creating ${u.role}: ${u.email}`);
    const supabaseId = await createOrGetAuthUser(u.email, u.name);
    const dbUser = await prisma.user.upsert({
      where: { id: u.id },
      update: { supabaseId, email: u.email, name: u.name },
      create: { id: u.id, supabaseId, email: u.email, name: u.name, role: u.role, schoolId: SCHOOL_ID, active: true },
    });
    userIds[u.role] = dbUser.id;
    console.log(`  DB user upserted: ${dbUser.id}\n`);
  }

  // 2. Parent → Student link
  console.log('Linking parent → student');
  await prisma.parentStudent.upsert({
    where: { id: 'ps_demo_parent_student' },
    update: {},
    create: { id: 'ps_demo_parent_student', parentId: userIds['PARENT'], studentId: userIds['STUDENT'] },
  });
  console.log('  ParentStudent link created\n');

  // 3. Course memberships
  console.log('Creating course memberships');
  await prisma.membership.upsert({
    where: { id: 'mem_demo_teacher_apbio' },
    update: {},
    create: { id: 'mem_demo_teacher_apbio', userId: userIds['TEACHER'], courseId: COURSE_ID, role: 'TEACHER' },
  });
  await prisma.membership.upsert({
    where: { id: 'mem_demo_student_apbio' },
    update: {},
    create: { id: 'mem_demo_student_apbio', userId: userIds['STUDENT'], courseId: COURSE_ID, role: 'STUDENT' },
  });
  console.log('  Memberships upserted\n');

  // 4. StudentProgress rows for all 5 weeks
  console.log('Seeding StudentProgress (5 weeks)');
  const weekProgressData = [
    { id: 'sp_demo_w1', userId: userIds['STUDENT'], weekId: 'week_bio_w1', courseId: COURSE_ID, status: 'COMPLETED' },
    { id: 'sp_demo_w2', userId: userIds['STUDENT'], weekId: 'week_bio_w2', courseId: COURSE_ID, status: 'IN_PROGRESS' },
    { id: 'sp_demo_w3', userId: userIds['STUDENT'], weekId: 'week_bio_w3', courseId: COURSE_ID, status: 'NOT_STARTED' },
    { id: 'sp_demo_w4', userId: userIds['STUDENT'], weekId: 'week_bio_w4', courseId: COURSE_ID, status: 'NOT_STARTED' },
    { id: 'sp_demo_w5', userId: userIds['STUDENT'], weekId: 'week_bio_w5', courseId: COURSE_ID, status: 'NOT_STARTED' },
  ];
  for (const p of weekProgressData) {
    await prisma.studentProgress.upsert({
      where: { id: p.id },
      update: { status: p.status },
      create: p,
    });
  }
  console.log('  StudentProgress rows upserted\n');

  // 5. LessonProgress — Week 1 all 5 COMPLETED
  console.log('Seeding LessonProgress (Week 1: 5 lessons COMPLETED)');
  for (const lessonId of W1_LESSONS) {
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: userIds['STUDENT'], lessonId } },
      update: { status: 'COMPLETED' },
      create: { userId: userIds['STUDENT'], lessonId, status: 'COMPLETED' },
    });
  }
  console.log('  Week 1 lesson progress done');

  // 6. LessonProgress — Week 2 first 4 COMPLETED
  console.log('Seeding LessonProgress (Week 2: first 4 lessons COMPLETED)');
  for (const lessonId of W2_LESSONS_DONE) {
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: userIds['STUDENT'], lessonId } },
      update: { status: 'COMPLETED' },
      create: { userId: userIds['STUDENT'], lessonId, status: 'COMPLETED' },
    });
  }
  console.log('  Week 2 lesson progress done\n');

  console.log('=== DONE ===');
  console.log('Login credentials (password: AISJ@Falcon):');
  console.log('  Teacher: demo.teacher@aisj.edu.sa');
  console.log('  Student: demo.student@aisj.edu.sa');
  console.log('  Parent:  demo.parent@aisj.edu.sa');
}

main().catch(console.error).finally(() => prisma.$disconnect());
