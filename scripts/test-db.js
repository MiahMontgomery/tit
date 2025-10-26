#!/usr/bin/env node

/**
 * Test database connection and basic operations
 */

import { prisma } from './server/src/lib/db.js';

async function testDatabase() {
  console.log('🧪 Testing Titan database connection...');
  
  try {
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test basic query
    const projectCount = await prisma.project.count();
    console.log(`📊 Found ${projectCount} projects in database`);
    
    // Test creating a project
    const testProject = await prisma.project.create({
      data: {
        name: `test-project-${Date.now()}`,
        type: 'test',
        templateRef: 'persona/basic',
        spec: { test: true },
        state: 'init'
      }
    });
    console.log(`✅ Created test project: ${testProject.id}`);
    
    // Test creating a job
    const testJob = await prisma.job.create({
      data: {
        projectId: testProject.id,
        kind: 'scaffold',
        payload: { test: true },
        status: 'queued'
      }
    });
    console.log(`✅ Created test job: ${testJob.id}`);
    
    // Test claiming the job
    const claimedJob = await prisma.$transaction(async (tx) => {
      const job = await tx.job.findFirst({
        where: { status: 'queued' },
        orderBy: { createdAt: 'asc' }
      });
      
      if (!job) return null;
      
      return await tx.job.update({
        where: { id: job.id },
        data: { status: 'running' }
      });
    });
    
    if (claimedJob) {
      console.log(`✅ Successfully claimed job: ${claimedJob.id}`);
    }
    
    // Clean up test data
    await prisma.job.deleteMany({
      where: { projectId: testProject.id }
    });
    await prisma.project.delete({
      where: { id: testProject.id }
    });
    console.log('🧹 Cleaned up test data');
    
    console.log('🎉 All database tests passed!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
