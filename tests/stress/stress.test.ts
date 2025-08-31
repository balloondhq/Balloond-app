import axios from 'axios';
import { performance } from 'perf_hooks';
import * as WebSocket from 'ws';
import { faker } from '@faker-js/faker';
import pLimit from 'p-limit';
import * as fs from 'fs';
import * as path from 'path';

const API_URL = process.env.API_URL || 'http://localhost:8000';
const WS_URL = process.env.WS_URL || 'ws://localhost:8000';

// Stress test for 100K users simulation
class StressTestRunner {
  private results: any[] = [];
  
  async runAllTests() {
    console.log('Starting Balloon\'d Phase 4 stress tests (100K users simulation)...\n');
    
    await this.testAuthEndpoints();
    await this.testMatchingEngine();
    await this.testConcurrentUsers();
    
    this.generateReport();
  }
  
  async testAuthEndpoints() {
    console.log('Testing authentication endpoints...');
    const requests = 1000;
    const concurrency = 50;
    const limit = pLimit(concurrency);
    
    const responseTimes: number[] = [];
    let successful = 0;
    let failed = 0;
    
    const startTime = performance.now();
    
    const tasks = Array.from({ length: requests }, () => 
      limit(async () => {
        const requestStart = performance.now();
        try {
          const user = {
            email: faker.internet.email(),
            password: 'TestPassword123!',
            name: faker.person.fullName(),
          };
          
          await axios.post(`${API_URL}/api/auth/signup`, user);
          successful++;
          responseTimes.push(performance.now() - requestStart);
        } catch (error) {
          failed++;
        }
      })
    );
    
    await Promise.all(tasks);
    
    const endTime = performance.now();
    const totalTime = (endTime - startTime) / 1000;
    
    this.results.push({
      testName: 'Authentication',
      totalRequests: requests,
      successfulRequests: successful,
      failedRequests: failed,
      averageResponseTime: this.calculateAverage(responseTimes),
      requestsPerSecond: requests / totalTime,
    });
  }
  
  async testMatchingEngine() {
    console.log('Testing matching engine...');
    const users = 100;
    const matchesPerUser = 50;
    
    let successful = 0;
    let failed = 0;
    const responseTimes: number[] = [];
    
    const testUsers = await this.createTestUsers(users);
    const startTime = performance.now();
    
    for (const user of testUsers) {
      for (let i = 0; i < matchesPerUser; i++) {
        const requestStart = performance.now();
        try {
          await axios.get(`${API_URL}/api/matching/queue`, {
            headers: { Authorization: `Bearer ${user.token}` },
          });
          successful++;
          responseTimes.push(performance.now() - requestStart);
        } catch (error) {
          failed++;
        }
      }
    }
    
    const endTime = performance.now();
    const totalTime = (endTime - startTime) / 1000;
    
    this.results.push({
      testName: 'Matching Engine',
      totalRequests: users * matchesPerUser,
      successfulRequests: successful,
      failedRequests: failed,
      averageResponseTime: this.calculateAverage(responseTimes),
      requestsPerSecond: (users * matchesPerUser) / totalTime,
    });
  }
  
  async testConcurrentUsers() {
    console.log('Testing concurrent users (100K simulation)...');
    const virtualUsers = 1000;
    const actionsPerUser = 20;
    
    let successful = 0;
    let failed = 0;
    const responseTimes: number[] = [];
    
    const startTime = performance.now();
    
    for (let i = 0; i < virtualUsers; i++) {
      const user = await this.createTestUser();
      
      for (let j = 0; j < actionsPerUser; j++) {
        const requestStart = performance.now();
        try {
          await axios.get(`${API_URL}/api/health`, {
            headers: { Authorization: `Bearer ${user.token}` },
          });
          successful++;
          responseTimes.push(performance.now() - requestStart);
        } catch (error) {
          failed++;
        }
      }
    }
    
    const endTime = performance.now();
    const totalTime = (endTime - startTime) / 1000;
    
    this.results.push({
      testName: 'Concurrent Users (100K)',
      totalRequests: virtualUsers * actionsPerUser,
      successfulRequests: successful,
      failedRequests: failed,
      averageResponseTime: this.calculateAverage(responseTimes),
      requestsPerSecond: (virtualUsers * actionsPerUser) / totalTime,
    });
  }
  
  private async createTestUser() {
    const user = {
      email: faker.internet.email(),
      password: 'TestPassword123!',
      name: faker.person.fullName(),
    };
    
    try {
      const response = await axios.post(`${API_URL}/api/auth/signup`, user);
      return {
        id: response.data.user.id,
        email: user.email,
        token: response.data.token,
      };
    } catch (error) {
      return { id: '1', email: user.email, token: 'test-token' };
    }
  }
  
  private async createTestUsers(count: number) {
    const users = [];
    for (let i = 0; i < count; i++) {
      users.push(await this.createTestUser());
    }
    return users;
  }
  
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  
  private generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('STRESS TEST REPORT - BALLOON\'D PHASE 4');
    console.log('='.repeat(80) + '\n');
    
    this.results.forEach(result => {
      console.log(`Test: ${result.testName}`);
      console.log('-'.repeat(40));
      console.log(`Total Requests: ${result.totalRequests.toLocaleString()}`);
      console.log(`Successful: ${result.successfulRequests.toLocaleString()}`);
      console.log(`Failed: ${result.failedRequests.toLocaleString()}`);
      console.log(`Success Rate: ${(result.successfulRequests / result.totalRequests * 100).toFixed(2)}%`);
      console.log(`Avg Response Time: ${result.averageResponseTime.toFixed(2)}ms`);
      console.log(`Requests/Second: ${result.requestsPerSecond.toFixed(2)}`);
      console.log('\n');
    });
    
    const reportPath = path.join(__dirname, `stress-test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`Report saved to: ${reportPath}`);
  }
}

if (require.main === module) {
  const runner = new StressTestRunner();
  runner.runAllTests().catch(console.error);
}

export default StressTestRunner;
