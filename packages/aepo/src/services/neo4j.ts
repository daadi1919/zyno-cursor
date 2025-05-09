import { Driver, Session, Transaction } from 'neo4j-driver';
import { QueryContext, QueryResult } from '@zyno/types';

export class Neo4jService {
  private driver: Driver;

  constructor(uri: string, username: string, password: string) {
    this.driver = Driver.create(uri, {
      username,
      password,
    });
  }

  async saveOptimization(
    originalQuery: string,
    optimizedQuery: string,
    result: QueryResult,
    context: QueryContext
  ): Promise<void> {
    const session = this.driver.session();
    try {
      await session.executeWrite((tx) =>
        this.createOptimizationTransaction(
          tx,
          originalQuery,
          optimizedQuery,
          result,
          context
        )
      );
    } finally {
      await session.close();
    }
  }

  private async createOptimizationTransaction(
    tx: Transaction,
    originalQuery: string,
    optimizedQuery: string,
    result: QueryResult,
    context: QueryContext
  ): Promise<void> {
    const query = `
      MERGE (u:User {id: $userId})
      MERGE (s:Session {id: $sessionId})
      MERGE (u)-[:HAS_SESSION]->(s)
      
      CREATE (o:Optimization {
        originalQuery: $originalQuery,
        optimizedQuery: $optimizedQuery,
        confidence: $confidence,
        optimizationTime: $optimizationTime,
        tokensUsed: $tokensUsed,
        timestamp: datetime($timestamp)
      })
      
      MERGE (s)-[:HAS_OPTIMIZATION]->(o)
      
      WITH o
      UNWIND $previousQueries AS prevQuery
      MERGE (p:Query {text: prevQuery})
      MERGE (o)-[:FOLLOWS]->(p)
    `;

    await tx.run(query, {
      userId: context.userId,
      sessionId: context.sessionId,
      originalQuery,
      optimizedQuery,
      confidence: result.confidence,
      optimizationTime: result.optimizationTime,
      tokensUsed: result.tokensUsed,
      timestamp: context.timestamp,
      previousQueries: context.previousQueries,
    });
  }

  async getOptimizationHistory(userId: string, limit: number = 10): Promise<any[]> {
    const session = this.driver.session();
    try {
      const result = await session.executeRead((tx) =>
        tx.run(
          `
          MATCH (u:User {id: $userId})-[:HAS_SESSION]->(s:Session)-[:HAS_OPTIMIZATION]->(o:Optimization)
          RETURN o
          ORDER BY o.timestamp DESC
          LIMIT $limit
          `,
          { userId, limit }
        )
      );

      return result.records.map((record) => record.get('o').properties);
    } finally {
      await session.close();
    }
  }

  async getSimilarOptimizations(query: string, limit: number = 5): Promise<any[]> {
    const session = this.driver.session();
    try {
      const result = await session.executeRead((tx) =>
        tx.run(
          `
          MATCH (o:Optimization)
          WHERE o.originalQuery CONTAINS $query OR o.optimizedQuery CONTAINS $query
          RETURN o
          ORDER BY o.confidence DESC
          LIMIT $limit
          `,
          { query, limit }
        )
      );

      return result.records.map((record) => record.get('o').properties);
    } finally {
      await session.close();
    }
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
} 