require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });

const SCHOOL_ID = 'aisj_school_001';
const STUDENT_SUPABASE_ID = '932b2afd-5669-4c94-9c37-5bcf151977d8';
const TEACHER_USER_ID = 'user_ochaudhry_aisj';

async function main() {
  // 1. Create student DB user
  const student = await prisma.user.upsert({
    where: { id: 'user_student_test_001' },
    update: {},
    create: {
      id: 'user_student_test_001',
      supabaseId: STUDENT_SUPABASE_ID,
      email: 'student.test@aisj.edu.sa',
      name: 'Alex Student',
      role: 'STUDENT',
      schoolId: SCHOOL_ID,
    }
  });
  console.log('Student:', student.id);

  // 2. Create AP Computer Science course
  const course = await prisma.course.upsert({
    where: { id: 'course_ap_cs_001' },
    update: {},
    create: {
      id: 'course_ap_cs_001',
      name: 'AP Computer Science A',
      gradeLevel: 11,
      track: 'AP',
      schoolId: SCHOOL_ID,
      totalWeeks: 8,
      aeroStandards: [],
    }
  });
  console.log('Course:', course.id);

  // 3. Themes
  const theme1 = await prisma.learningTheme.upsert({
    where: { id: 'theme_oop_001' },
    update: {},
    create: { id: 'theme_oop_001', courseId: course.id, title: 'Object-Oriented Programming', durationWeeks: 4, aeroAlignment: [] }
  });
  const theme2 = await prisma.learningTheme.upsert({
    where: { id: 'theme_algo_001' },
    update: {},
    create: { id: 'theme_algo_001', courseId: course.id, title: 'Algorithms & Data Structures', durationWeeks: 4, aeroAlignment: [] }
  });
  console.log('Themes created');

  // 4. Weeks
  const weeks = [
    {
      id: 'week_001', themeId: theme1.id, weekNumber: 1,
      focus: 'Introduction to Classes and Objects',
      objectives: [
        { text: 'Define and instantiate classes with attributes and methods', aeroCode: 'CSA.1A' },
        { text: 'Explain the difference between instance variables and class variables', aeroCode: 'CSA.1B' },
        { text: 'Apply encapsulation principles using access modifiers', aeroCode: 'CSA.1C' },
      ],
      activities: [
        'Design a BankAccount class with deposit, withdraw, and getBalance methods',
        'Write unit tests verifying correct balance updates after transactions',
        'Peer code review: swap BankAccount implementations with a partner and critique design choices',
        'Refactor a procedural solution into an OOP design — identify classes, attributes, and behaviours',
      ],
      assessment: {
        formative: 'Exit ticket: students sketch a UML class diagram for a given real-world scenario (e.g., a library book system).',
        summative: 'Mini-project: implement a Student class with GPA calculation logic; graded on correctness, style, and encapsulation.'
      }
    },
    {
      id: 'week_002', themeId: theme1.id, weekNumber: 2,
      focus: 'Inheritance and Polymorphism',
      objectives: [
        { text: 'Construct class hierarchies using extends and super keywords', aeroCode: 'CSA.2A' },
        { text: 'Override methods to implement polymorphic behaviour', aeroCode: 'CSA.2B' },
        { text: 'Distinguish between compile-time and runtime polymorphism', aeroCode: 'CSA.2C' },
      ],
      activities: [
        'Build an Animal hierarchy: Animal → Mammal → Dog/Cat with speak() override',
        'Trace through method dispatch examples and predict output before running code',
        'Compare inheritance vs. composition — discuss with a partner when each is appropriate',
        'Lab: extend a Shape base class to create Circle, Rectangle, Triangle with area() and perimeter()',
      ],
      assessment: {
        formative: 'Quick poll: identify which method is called at runtime given a class hierarchy diagram.',
        summative: 'Lab report: extend the Shape hierarchy with two additional shapes and justify design decisions in a written reflection.'
      }
    },
    {
      id: 'week_003', themeId: theme1.id, weekNumber: 3,
      focus: 'Interfaces and Abstract Classes',
      objectives: [
        { text: 'Define interfaces and implement them across unrelated class hierarchies', aeroCode: 'CSA.3A' },
        { text: 'Compare abstract classes and interfaces and select the appropriate design', aeroCode: 'CSA.3B' },
        { text: 'Use the Comparable interface to enable natural ordering of custom objects', aeroCode: 'CSA.3C' },
      ],
      activities: [
        'Implement Comparable<T> on a Student class and sort a list by GPA',
        'Design exercise: given a scenario, decide interface vs. abstract class and defend the choice',
        'Code reading: analyse the Java Collections framework interfaces (List, Map, Set)',
        'Build a simple plugin system using an interface — swap implementations at runtime',
      ],
      assessment: {
        formative: 'Think-pair-share: when would you use an interface over an abstract class?',
        summative: 'Design document (1 page): propose an interface-driven architecture for a school management system.'
      }
    },
    {
      id: 'week_004', themeId: theme1.id, weekNumber: 4,
      focus: 'Exception Handling and Debugging',
      objectives: [
        { text: 'Distinguish checked and unchecked exceptions and handle appropriately', aeroCode: 'CSA.4A' },
        { text: 'Write try-catch-finally blocks to manage error-prone operations', aeroCode: 'CSA.4B' },
        { text: 'Create custom exception classes for domain-specific error scenarios', aeroCode: 'CSA.4C' },
      ],
      activities: [
        'Debug a deliberately broken BankAccount implementation — identify and fix 5 seeded bugs',
        'Write a robust file-reader that handles IOException, FileNotFoundException, and NumberFormatException',
        'Create a custom InsufficientFundsException and integrate it into the BankAccount class',
        'Exception flow diagram: trace execution paths through nested try-catch blocks',
      ],
      assessment: {
        formative: 'Code trace: given a snippet, predict which catch block executes and why.',
        summative: 'OOP Unit Test — 45-minute exam covering classes, inheritance, interfaces, and exception handling.'
      }
    },
    {
      id: 'week_005', themeId: theme2.id, weekNumber: 5,
      focus: 'Arrays, ArrayLists, and Iteration',
      objectives: [
        { text: 'Traverse and manipulate 1D and 2D arrays using loops', aeroCode: 'CSA.5A' },
        { text: 'Apply ArrayList methods to implement dynamic collections', aeroCode: 'CSA.5B' },
        { text: 'Analyse time complexity of array traversal algorithms', aeroCode: 'CSA.5C' },
      ],
      activities: [
        'Implement a frequency counter for characters in a string using an array',
        'Compare ArrayList vs. array — benchmark insertion and lookup with 10k elements',
        'Matrix rotation challenge: rotate a 2D array 90 degrees in-place',
        'Code challenge: find all duplicate values in an unsorted array in O(n) time',
      ],
      assessment: {
        formative: 'Whiteboard: write a method to reverse an array in-place without extra space.',
        summative: 'Coding quiz: implement three array manipulation methods within 30 minutes.'
      }
    },
    {
      id: 'week_006', themeId: theme2.id, weekNumber: 6,
      focus: 'Searching and Sorting Algorithms',
      objectives: [
        { text: 'Implement linear and binary search and state their time complexities', aeroCode: 'CSA.6A' },
        { text: 'Implement selection sort, insertion sort, and merge sort', aeroCode: 'CSA.6B' },
        { text: 'Evaluate algorithm efficiency using Big-O notation', aeroCode: 'CSA.6C' },
      ],
      activities: [
        'Visual sort race: animate bubble sort vs. merge sort on the same dataset',
        'Implement binary search iteratively and recursively — compare approaches',
        'Benchmark: time selection sort vs. merge sort on arrays of size 100, 1000, and 10000',
        'AP practice: trace merge sort step-by-step on an 8-element array',
      ],
      assessment: {
        formative: 'Exit ticket: give Big-O for 5 code snippets.',
        summative: 'Algorithm analysis essay: compare two sorting algorithms on time, space, stability, and use cases.'
      }
    },
    {
      id: 'week_007', themeId: theme2.id, weekNumber: 7,
      focus: 'Recursion',
      objectives: [
        { text: 'Identify the base case and recursive case in recursive algorithms', aeroCode: 'CSA.7A' },
        { text: 'Trace recursive calls using a call stack diagram', aeroCode: 'CSA.7B' },
        { text: 'Convert between iterative and recursive implementations', aeroCode: 'CSA.7C' },
      ],
      activities: [
        'Visualise factorial and Fibonacci recursion using a call-stack whiteboard exercise',
        'Implement recursive binary search and compare to the iterative version from Week 6',
        'Tower of Hanoi: solve for 3, 4, and 5 disks — count moves and derive the pattern',
        'Debugging exercise: identify and fix an infinite recursion bug in a provided code snippet',
      ],
      assessment: {
        formative: 'Pair exercise: write a recursive method to sum all digits of a number.',
        summative: 'Recursion problem set: 4 problems of increasing difficulty, submitted with call-stack traces.'
      }
    },
    {
      id: 'week_008', themeId: theme2.id, weekNumber: 8,
      focus: 'AP Exam Preparation and Capstone',
      objectives: [
        { text: 'Apply all unit concepts to multi-class AP-style free response questions', aeroCode: 'CSA.8A' },
        { text: 'Review and synthesise OOP, data structures, and algorithm topics', aeroCode: 'CSA.8B' },
        { text: 'Demonstrate coding fluency under timed conditions', aeroCode: 'CSA.8C' },
      ],
      activities: [
        'AP Mock Exam Section I: 40-minute multiple choice (20 questions)',
        'AP Free Response workshop: attempt 2 FRQs, then peer-grade using AP rubrics',
        'Capstone presentation: 5-minute demo of a self-chosen mini-project using OOP + algorithms',
        'Reflection: write a learning journal entry — what clicked, what to review before the exam',
      ],
      assessment: {
        formative: 'Peer grading session using official AP rubrics.',
        summative: 'Capstone project (50%) + Mock Exam score (50%) — counts as end-of-unit grade.'
      }
    },
  ];

  for (const w of weeks) {
    await prisma.week.upsert({
      where: { id: w.id },
      update: {},
      create: { ...w, courseId: course.id }
    });
  }
  console.log('Weeks created');

  // 5. Resources
  const resources = [
    { weekId: 'week_001', title: 'Oracle Java Docs: Classes and Objects', type: 'LINK', url: 'https://docs.oracle.com/javase/tutorial/java/javaOO/index.html' },
    { weekId: 'week_001', title: 'OOP Concepts Explained (Video)', type: 'VIDEO', url: 'https://www.youtube.com/watch?v=pTB0EiLXUC8' },
    { weekId: 'week_002', title: 'Inheritance in Java - Oracle Tutorial', type: 'LINK', url: 'https://docs.oracle.com/javase/tutorial/java/IandI/subclasses.html' },
    { weekId: 'week_006', title: 'Sorting Algorithms Visualised', type: 'LINK', url: 'https://visualgo.net/en/sorting' },
    { weekId: 'week_007', title: 'Recursion Visualiser', type: 'LINK', url: 'https://recursion.vercel.app' },
  ];
  for (const r of resources) {
    await prisma.resource.create({ data: r }).catch(() => {});
  }
  console.log('Resources created');

  // 6. Memberships
  await prisma.membership.upsert({
    where: { id: 'mem_teacher_apcs' },
    update: {},
    create: { id: 'mem_teacher_apcs', userId: TEACHER_USER_ID, courseId: course.id, schoolId: SCHOOL_ID, role: 'TEACHER' }
  }).catch(async () => {
    await prisma.membership.create({ data: { userId: TEACHER_USER_ID, courseId: course.id, schoolId: SCHOOL_ID, role: 'TEACHER' } }).catch(() => {});
  });

  await prisma.membership.create({
    data: { userId: student.id, courseId: course.id, schoolId: SCHOOL_ID, role: 'STUDENT' }
  }).catch(() => {});
  console.log('Memberships created');

  // 7. Student progress (weeks 1-3 completed, week 4 in progress)
  const progressData = [
    { userId: student.id, weekId: 'week_001', courseId: course.id, status: 'COMPLETED' },
    { userId: student.id, weekId: 'week_002', courseId: course.id, status: 'COMPLETED' },
    { userId: student.id, weekId: 'week_003', courseId: course.id, status: 'COMPLETED' },
    { userId: student.id, weekId: 'week_004', courseId: course.id, status: 'IN_PROGRESS' },
  ];
  for (const p of progressData) {
    await prisma.studentProgress.create({ data: p }).catch(() => {});
  }
  console.log('Progress created');

  console.log('\n=== DONE ===');
  console.log('Student login: student.test@aisj.edu.sa / TestStudent1!');
  console.log('Teacher login: ochaudhry@aisj.edu.sa / Allahis1');
  console.log('Course: AP Computer Science A (8 weeks, 2 themes)');
}

main().catch(console.error).finally(() => prisma.$disconnect());
