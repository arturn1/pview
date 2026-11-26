CREATE TABLE "DeploySubscription" (
    "sprintId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeploySubscription_pkey" PRIMARY KEY ("sprintId", "userId")
);

CREATE INDEX "DeploySubscription_userId_idx" ON "DeploySubscription"("userId");

ALTER TABLE "DeploySubscription" ADD CONSTRAINT "DeploySubscription_sprintId_fkey"
    FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeploySubscription" ADD CONSTRAINT "DeploySubscription_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
