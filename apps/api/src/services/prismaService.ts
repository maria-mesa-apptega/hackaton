import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function searchComplianceData(question: string, organizationId?: string | null): Promise<any[]> {
  try {
    // For general questions like "what frameworks are available", return all frameworks
    const generalQuestions = ['what frameworks', 'available frameworks', 'list frameworks', 'show frameworks'];
    const isGeneralQuestion = generalQuestions.some(q => question.toLowerCase().includes(q));
    
    if (isGeneralQuestion) {
      console.log('General framework question detected, returning all frameworks');
      console.log('Organization ID filter:', organizationId || 'None');
      
      const frameworks = await prisma.framework.findMany({
        where: {
          organization_id: organizationId ? parseInt(organizationId) : undefined,
          is_visible: true,
          deprecated: false,
        },
        select: {
          id: true,
          name: true,
          description: true,
          slug: true,
          organization_id: true,
        },
        orderBy: { name: 'asc' },
        take: 20
      });
      
      console.log('Found', frameworks.length, 'frameworks');
      return frameworks.map(f => ({
        id: f.id,
        title: f.name,
        description: f.description,
        slug: f.slug,
        organization_id: f.organization_id,
        type: 'framework'
      }));
    }
    
    // For specific questions, search across framework names and descriptions
    const searchTerm = question.toLowerCase();
    
    const frameworks = await prisma.framework.findMany({
      where: {
        organization_id: organizationId ? parseInt(organizationId) : undefined,
        is_visible: true,
        deprecated: false,
        OR: [
          { name: { contains: searchTerm } },
          { description: { contains: searchTerm } },
          { slug: { contains: searchTerm } }
        ]
      },
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        organization_id: true,
      },
      orderBy: { name: 'asc' },
      take: 10
    });
    
    console.log('Found', frameworks.length, 'matching frameworks');
    return frameworks.map(f => ({
      id: f.id,
      title: f.name,
      description: f.description,
      slug: f.slug,
      organization_id: f.organizationId,
      type: 'framework'
    }));
  } catch (error) {
    console.error('Error searching compliance data with Prisma:', error);
    throw error;
  }
}

export async function getFrameworkInfo(framework: string): Promise<any[]> {
  try {
    const searchTerm = framework.toLowerCase();
    
    const frameworks = await prisma.framework.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm } },
          { slug: { contains: searchTerm } },
          { description: { contains: searchTerm } }
        ]
      },
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        organization_id: true,
      },
      take: 5
    });
    
    console.log('Found', frameworks.length, 'framework info records');
    return frameworks;
  } catch (error) {
    console.error('Error getting framework info with Prisma:', error);
    throw error;
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('Prisma database connection successful');
    return true;
  } catch (error) {
    console.error('Prisma database connection test failed:', error);
    return false;
  }
}

// Enhanced search with relationships
export async function searchComplianceDataWithRelations(question: string, organizationId?: string | null): Promise<any[]> {
  try {
    const searchTerm = question.toLowerCase();
    
    const frameworks = await prisma.framework.findMany({
      where: {
        organization_id: organizationId ? parseInt(organizationId) : undefined,
        is_visible: true,
        deprecated: false,
        OR: [
          { name: { contains: searchTerm } },
          { description: { contains: searchTerm } },
          { slug: { contains: searchTerm } }
        ]
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { name: 'asc' },
      take: 10
    });
    
    console.log('Found', frameworks.length, 'frameworks with relationships');
    return frameworks.map(f => ({
      id: f.id,
      title: f.name,
      description: f.description,
      slug: f.slug,
      organization_id: f.organization_id,
      organization_name: f.organization?.name,
      type: 'framework'
    }));
  } catch (error) {
    console.error('Error searching compliance data with relationships:', error);
    throw error;
  }
}

// Get framework statistics
export async function getFrameworkStats(organizationId?: string): Promise<any> {
  try {
    const stats = await prisma.framework.aggregate({
      where: {
        organization_id: organizationId ? parseInt(organizationId) : undefined,
        is_visible: true,
        deprecated: false,
      },
      _count: {
        id: true
      }
    });
    
    return {
      totalFrameworks: stats._count.id || 0,
      organizationId: organizationId || 'all'
    };
  } catch (error) {
    console.error('Error getting framework stats:', error);
    throw error;
  }
}

// Cleanup function
export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}
