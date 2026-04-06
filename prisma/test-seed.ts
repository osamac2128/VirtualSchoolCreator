import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding test data...')

  // 1. Create a School
  const school = await prisma.school.create({
    data: {
      name: 'Test Academy',
      domain: 'testacademy.edu',
    },
  })

  // 2. Create Users
  const admin = await prisma.user.create({
    data: {
      supabaseId: 'admin-123', // In a real test, replace with a real Supabase Auth ID
      email: 'admin@testacademy.edu',
      name: 'Admin User',
      role: 'ADMIN',
      schoolId: school.id,
    },
  })

  const teacher = await prisma.user.create({
    data: {
      supabaseId: 'teacher-123',
      email: 'teacher@testacademy.edu',
      name: 'Teacher User',
      role: 'TEACHER',
      schoolId: school.id,
    },
  })

  const student = await prisma.user.create({
    data: {
      supabaseId: 'student-123',
      email: 'student@testacademy.edu',
      name: 'Student User',
      role: 'STUDENT',
      schoolId: school.id,
    },
  })

  const parent = await prisma.user.create({
    data: {
      supabaseId: 'parent-123',
      email: 'parent@testacademy.edu',
      name: 'Parent User',
      role: 'PARENT',
      schoolId: school.id,
    },
  })

  // 3. Create Parent-Student Relation
  await prisma.parentStudent.create({
    data: {
      parentId: parent.id,
      studentId: student.id,
    },
  })

  // 4. Create a Dummy Course
  const course = await prisma.course.create({
    data: {
      name: 'Introduction to Testing',
      gradeLevel: 11,
      schoolId: school.id,
      totalWeeks: 4,
    },
  })

  // 5. Create Memberships
  await prisma.membership.create({
    data: {
      userId: teacher.id,
      courseId: course.id,
      role: 'TEACHER',
    },
  })

  await prisma.membership.create({
    data: {
      userId: student.id,
      courseId: course.id,
      role: 'STUDENT',
    },
  })

  // 6. Create Theme and Week
  const theme = await prisma.learningTheme.create({
    data: {
      courseId: course.id,
      title: 'Testing Fundamentals',
      durationWeeks: 4,
      aeroAlignment: ['ELA.11.RL.1'],
    },
  })

  await prisma.week.create({
    data: {
      themeId: theme.id,
      courseId: course.id,
      weekNumber: 1,
      focus: 'Understanding the test pyramid',
      objectives: [{ text: 'Write a unit test', aeroCode: 'ELA.11.RL.1' }],
      activities: ['Read chapter 1', 'Complete worksheet'],
    },
  })

  // 7. Seed AERO Standards (if not already seeded)
  await prisma.aeroStandard.upsert({
    where: { code: 'ELA.11.RL.1' },
    update: {},
    create: { code: 'ELA.11.RL.1', description: 'Cite strong and thorough textual evidence to support analysis of what the text says explicitly.' },
  })

  console.log('Seeding completed successfully!')
  console.log('--- Test Data ---')
  console.log(`School ID: ${school.id}`)
  console.log(`Admin ID: ${admin.id}`)
  console.log(`Teacher ID: ${teacher.id}`)
  console.log(`Student ID: ${student.id}`)
  console.log(`Parent ID: ${parent.id}`)
  console.log(`Course ID: ${course.id}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
