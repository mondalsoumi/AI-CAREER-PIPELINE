-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalApplications" INTEGER NOT NULL,
    "interviewRate" DOUBLE PRECISION NOT NULL,
    "offerRate" DOUBLE PRECISION NOT NULL,
    "rejectionRate" DOUBLE PRECISION NOT NULL,
    "sourceBreakdown" JSONB NOT NULL,
    "stageBreakdown" JSONB NOT NULL,
    "monthlyTrends" JSONB NOT NULL,
    "resumeBreakdown" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_userId_idx" ON "AnalyticsSnapshot"("userId");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_userId_computedAt_idx" ON "AnalyticsSnapshot"("userId", "computedAt");
