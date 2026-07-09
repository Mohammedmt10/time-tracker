-- CreateIndex
CREATE INDEX "auth_failures_ip_createdAt_idx" ON "auth_failures"("ip", "createdAt");

-- CreateIndex
CREATE INDEX "auth_failures_email_createdAt_idx" ON "auth_failures"("email", "createdAt");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "registration_limits_ip_createdAt_idx" ON "registration_limits"("ip", "createdAt");

-- CreateIndex
CREATE INDEX "time_logs_userId_createdAt_idx" ON "time_logs"("userId", "createdAt" DESC);
