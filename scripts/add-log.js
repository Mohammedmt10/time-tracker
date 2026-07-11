const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const path = require("path");

// Load env vars
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set in environment variables. Please check .env.local.");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DAY_MS = 24 * 60 * 60 * 1000;

function zoneOffsetMs(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type) =>
    Number(parts.find((part) => part.type === type)?.value);

  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second")
  );

  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

function nextMidnightInZone(date, timeZone) {
  const offset = zoneOffsetMs(date, timeZone);
  const nextLocalMidnight = Math.floor((date.getTime() + offset) / DAY_MS) * DAY_MS + DAY_MS;

  let result = new Date(nextLocalMidnight - offset);
  const offsetAtResult = zoneOffsetMs(result, timeZone);
  if (offsetAtResult !== offset) {
    result = new Date(nextLocalMidnight - offsetAtResult);
  }

  if (result.getTime() <= date.getTime()) {
    result = new Date(result.getTime() + DAY_MS);
  }

  return result;
}

function splitByDay(startTime, endTime, duration, timeZone) {
  const totalMs = endTime.getTime() - startTime.getTime();
  const segments = [];

  if (totalMs <= 0) {
    return segments;
  }

  let segStart = startTime;
  let allocated = 0;

  while (segStart < endTime) {
    const dayEnd = nextMidnightInZone(segStart, timeZone);
    const segEnd = dayEnd < endTime ? dayEnd : endTime;

    const isLastSegment = segEnd.getTime() === endTime.getTime();
    const share = (segEnd.getTime() - segStart.getTime()) / totalMs;
    const segDuration = isLastSegment
      ? duration - allocated
      : Math.round(duration * share);

    allocated += segDuration;
    segments.push({
      startTime: segStart,
      endTime: segEnd,
      duration: segDuration,
    });

    segStart = segEnd;
  }

  return segments;
}

async function createOrUpdateLog({ userId, description, project, segment }) {
  const existingLog = await prisma.timeLog.findFirst({
    where: {
      userId,
      description,
      project,
      startTime: segment.startTime,
      endTime: segment.endTime,
    },
  });

  if (existingLog) {
    return prisma.timeLog.update({
      where: { id: existingLog.id },
      data: {
        duration: existingLog.duration + segment.duration,
        startTime: segment.startTime,
        endTime: segment.endTime,
      },
    });
  }

  return prisma.timeLog.create({
    data: {
      userId,
      description,
      project,
      startTime: segment.startTime,
      endTime: segment.endTime,
      duration: segment.duration,
      userId,
    },
  });
}

async function main() {
  const email = process.argv[2];
  
  if (!email) {
    console.log("Searching for users...");
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true
      }
    });
    
    if (users.length === 0) {
      console.log("No users found in database.");
      return;
    }
    
    console.log("Available users:");
    users.forEach(u => {
      console.log(`- Email: ${u.email}, Name: ${u.name}, ID: ${u.id}`);
    });
    console.log("\nPlease run the script with a user email as an argument:");
    console.log("node scripts/add-log.js <email>");
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.error(`User with email ${email} not found.`);
    return;
  }

  const description = "Mock Marathon";
  const project = "General";
  const startTime = new Date("2026-07-06T16:30:00Z"); // Mon 22:00 Asia/Kolkata
  const endTime = new Date("2026-07-09T04:30:00Z");   // Thu 10:00 Asia/Kolkata
  const duration = 60 * 60 * 60; // 60 hours in seconds
  const timeZone = "Asia/Kolkata";

  console.log(`Splitting and adding 60-hour log entry from Monday 22:00 to Thursday 10:00 local time for user: ${email}...`);

  const segments = splitByDay(startTime, endTime, duration, timeZone);

  console.log("\nSplit segments calculation:");
  segments.forEach((seg, i) => {
    console.log(`Segment ${i + 1}:`);
    console.log(`  Start   : ${seg.startTime.toISOString()}`);
    console.log(`  End     : ${seg.endTime.toISOString()}`);
    console.log(`  Duration: ${seg.duration} seconds (${(seg.duration / 3600).toFixed(4)} hours)`);
  });

  console.log("\nSaving segments to database...");

  const results = [];
  for (const segment of segments) {
    const log = await createOrUpdateLog({
      userId: user.id,
      description,
      project,
      segment
    });
    results.push(log);
  }

  console.log("\nSuccessfully saved segments:");
  results.forEach((log, i) => {
    console.log(`[Log ${i + 1}] ID: ${log.id}, Start: ${log.startTime.toISOString()}, End: ${log.endTime.toISOString()}, Duration: ${log.duration}s`);
  });
}

main()
  .catch(err => {
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
