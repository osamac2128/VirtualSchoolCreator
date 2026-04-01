-- 1. Enable RLS on ALL tables
ALTER TABLE "School" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ParentStudent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Course" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LearningTheme" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Week" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Resource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AeroStandard" ENABLE ROW LEVEL SECURITY;

-- Schools: Users can only see their own school
CREATE POLICY "Users can see their own school" ON "School"
FOR SELECT USING (
  id = (SELECT "schoolId" FROM "User" WHERE supabaseId = auth.uid()::text LIMIT 1)
);

-- Users: Users can see their own profile, and Admins can see all users in their school
CREATE POLICY "Users can only see their own profile"
ON "User" FOR SELECT USING (
  supabaseId = auth.uid()::text OR 
  EXISTS (SELECT 1 FROM "User" AS u WHERE u.supabaseId = auth.uid()::text AND u.role = 'ADMIN' AND u."schoolId" = "User"."schoolId")
);

-- ParentStudent Mapping
CREATE POLICY "Parents see their children, Admins see all"
ON "ParentStudent" FOR SELECT USING (
  parentId = (SELECT id FROM "User" WHERE supabaseId = auth.uid()::text) OR
  EXISTS (SELECT 1 FROM "User" AS u WHERE u.supabaseId = auth.uid()::text AND u.role = 'ADMIN' AND u."schoolId" = (SELECT "schoolId" FROM "User" WHERE id = "ParentStudent".parentId))
);

-- Course policies (tenant-isolated & role-based)
CREATE POLICY "Admins see all courses in their school"
ON "Course" FOR ALL USING (
  EXISTS (SELECT 1 FROM "User" WHERE supabaseId = auth.uid()::text AND role = 'ADMIN' AND "schoolId" = "Course"."schoolId")
);

CREATE POLICY "Teachers see courses they teach or own in their school"
ON "Course" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "Membership"
    WHERE "courseId" = "Course".id
    AND userId = (SELECT id FROM "User" WHERE supabaseId = auth.uid()::text AND "schoolId" = "Course"."schoolId")
    AND role IN ('OWNER', 'TEACHER')
  )
);

CREATE POLICY "Students see enrolled courses in their school"
ON "Course" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "Membership"
    WHERE "courseId" = "Course".id
    AND userId = (SELECT id FROM "User" WHERE supabaseId = auth.uid()::text AND "schoolId" = "Course"."schoolId")
    AND role = 'STUDENT'
  )
);

CREATE POLICY "Parents see their child's enrolled courses"
ON "Course" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "Membership" m
    JOIN "ParentStudent" ps ON m.userId = ps.studentId
    WHERE m."courseId" = "Course".id
    AND ps.parentId = (SELECT id FROM "User" WHERE supabaseId = auth.uid()::text)
  )
);

-- Weeks cascade from course policies
CREATE POLICY "Users can access weeks of accessible courses"
ON "Week" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "Course" c
    WHERE c.id = "Week"."courseId"
    -- Requires policy chaining via Course
  )
);

-- Progress tracking
CREATE POLICY "Students see own progress, Teachers see class, Parents see child"
ON "StudentProgress" FOR SELECT USING (
  userId = (SELECT id FROM "User" WHERE supabaseId = auth.uid()::text) OR
  EXISTS (
    SELECT 1 FROM "ParentStudent"
    WHERE studentId = "StudentProgress".userId AND parentId = (SELECT id FROM "User" WHERE supabaseId = auth.uid()::text)
  ) OR
  EXISTS (
    SELECT 1 FROM "Membership"
    WHERE "courseId" = "StudentProgress"."courseId" 
    AND userId = (SELECT id FROM "User" WHERE supabaseId = auth.uid()::text)
    AND role IN ('OWNER', 'TEACHER')
  )
);

-- AeroStandard: Public read
CREATE POLICY "AeroStandards are readable by authenticated users"
ON "AeroStandard" FOR SELECT USING (auth.role() = 'authenticated');
