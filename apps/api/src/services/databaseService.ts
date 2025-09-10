import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

function getDbConfig() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '13306'),
    user: process.env.DB_USER || 'apptega',
    password: process.env.DB_PASSWORD || 'apptega123',
    database: process.env.DB_NAME || 'apptega',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
}

export function getConnection() {
  if (!pool) {
    const dbConfig = getDbConfig();
    console.log('Creating database connection with config:', {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      database: dbConfig.database
    });
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

export async function queryDatabase(sql: string, params: any[] = []): Promise<any[]> {
  try {
    const connection = getConnection();
    const [rows] = await connection.execute(sql, params);
    return rows as any[];
  } catch (error) {
    console.error('Database query error:', error);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function searchComplianceData(question: string, organizationId?: string | null): Promise<any[]> {
  try {
    // For general questions like "what frameworks are available", return all frameworks
    const generalQuestions = ['what frameworks', 'available frameworks', 'list frameworks', 'show frameworks'];
    const isGeneralQuestion = generalQuestions.some(q => question.toLowerCase().includes(q));
    
    if (isGeneralQuestion) {
      console.log('General framework question detected, returning all frameworks');
      console.log('Organization ID filter:', organizationId || 'None');
      
      // Build WHERE clause based on organizationId
      let whereClause = 'is_visible = 1 AND deprecated = 0';
      let params: any[] = [];
      
      if (organizationId) {
        whereClause += ' AND organization_id = ?';
        params.push(organizationId);
      }
      
      const sql = `
        SELECT 
          id,
          name as title,
          description,
          slug,
          organization_id,
          'framework' as type
        FROM framework 
        WHERE ${whereClause}
        ORDER BY name ASC
        LIMIT 20
      `;
      console.log('Executing SQL:', sql);
      console.log('Parameters:', params);
      const result = await queryDatabase(sql, params);
      console.log('Query result:', result);
      
      // If no results with the filtered query, try without filters
      if (result.length === 0) {
        console.log('No results with filters, trying without filters...');
        let fallbackWhereClause = '1=1';
        let fallbackParams: any[] = [];
        
        if (organizationId) {
          fallbackWhereClause = 'organization_id = ?';
          fallbackParams.push(organizationId);
        }
        
        const fallbackSql = `
          SELECT 
            id,
            name as title,
            description,
            slug,
            organization_id,
            'framework' as type
          FROM framework 
          WHERE ${fallbackWhereClause}
          ORDER BY name ASC
          LIMIT 20
        `;
        console.log('Executing fallback SQL:', fallbackSql);
        console.log('Fallback parameters:', fallbackParams);
        const fallbackResult = await queryDatabase(fallbackSql, fallbackParams);
        console.log('Fallback query result:', fallbackResult);
        return fallbackResult;
      }
      
      return result;
    }
    
    const searchTerm = `%${question.toLowerCase()}%`;
    
    // First, let's check if the framework table exists and get its columns
    const tableExists = await queryDatabase(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'framework'
    `, [process.env.DB_NAME || 'apptega']);
    
    if (tableExists[0].count === 0) {
      console.log('Framework table does not exist');
      return [];
    }
    
    // Get the actual columns of the framework table
    const columns = await queryDatabase(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'framework'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME || 'apptega']);
    
    const columnNames = columns.map(col => col.COLUMN_NAME);
    console.log('Framework table columns:', columnNames);
    
    // Build a dynamic search query based on available columns
    const searchableColumns = columnNames.filter(col => 
      ['name', 'description', 'slug'].includes(col.toLowerCase())
    );
    
    if (searchableColumns.length === 0) {
      // If no searchable columns found, just return all data
      const sql = `SELECT * FROM framework LIMIT 10`;
      return await queryDatabase(sql);
    }
    
    // Build WHERE clause for searchable columns
    const whereClause = searchableColumns.map(col => `LOWER(${col}) LIKE ?`).join(' OR ');
    const searchParams = searchableColumns.map(() => searchTerm);
    
    const sql = `
      SELECT 
        id,
        name as title,
        description,
        slug,
        'framework' as type
      FROM framework 
      WHERE (${whereClause}) AND is_visible = 1
      LIMIT 10
    `;
    
    return await queryDatabase(sql, searchParams);
  } catch (error) {
    console.error('Error searching compliance data:', error);
    return [];
  }
}

export async function getFrameworkInfo(framework: string): Promise<any[]> {
  try {
    // First, let's check if the framework table exists
    const tableExists = await queryDatabase(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'framework'
    `, [process.env.DB_NAME || 'apptega']);
    
    if (tableExists[0].count === 0) {
      console.log('Framework table does not exist');
      return [];
    }
    
    // Get the actual columns of the framework table
    const columns = await queryDatabase(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'framework'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME || 'apptega']);
    
    const columnNames = columns.map(col => col.COLUMN_NAME);
    
    // Build a dynamic search query based on available columns
    const searchableColumns = columnNames.filter(col => 
      ['name', 'slug', 'description'].includes(col.toLowerCase())
    );
    
    if (searchableColumns.length === 0) {
      // If no searchable columns found, just return all data
      const sql = `SELECT * FROM framework LIMIT 5`;
      return await queryDatabase(sql);
    }
    
    // Build WHERE clause for searchable columns
    const whereClause = searchableColumns.map(col => `LOWER(${col}) LIKE ?`).join(' OR ');
    const searchTerm = `%${framework.toLowerCase()}%`;
    const searchParams = searchableColumns.map(() => searchTerm);
    
    const sql = `SELECT * FROM framework WHERE ${whereClause} LIMIT 5`;
    
    return await queryDatabase(sql, searchParams);
  } catch (error) {
    console.error('Error getting framework info:', error);
    return [];
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    const connection = getConnection();
    await connection.execute('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}
