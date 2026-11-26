CREATE TABLE "ProjectApprover" (
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "ProjectApprover_pkey" PRIMARY KEY ("projectId", "userId")
);

CREATE INDEX "ProjectApprover_userId_idx" ON "ProjectApprover"("userId");

ALTER TABLE "ProjectApprover" ADD CONSTRAINT "ProjectApprover_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectApprover" ADD CONSTRAINT "ProjectApprover_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
