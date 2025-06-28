#!/usr/bin/env node
/**
 * Storage Benchmark Script
 * Tests content-addressable storage performance and efficiency
 */

const { performance } = require('perf_hooks');
const { ContentAddressableStore } = require('../dist/infrastructure/storage/ContentAddressableStore.js');
const { promises: fs } = require('fs');
const path = require('path');
const { tmpdir } = require('os');

class StorageBenchmark {
  constructor() {
    this.results = {
      startTime: new Date(),
      tests: [],
      summary: {}
    };
  }

  async runAllBenchmarks() {
    console.log('🏃 Running Storage Performance Benchmarks');
    console.log('==========================================');

    const tempDir = path.join(tmpdir(), `benchmark-${Date.now()}`);
    const store = new ContentAddressableStore({
      storageDir: tempDir,
      compressionEnabled: true,
      maxMemoryCacheMB: 100
    });

    try {
      await this.benchmarkBasicOperations(store);
      await this.benchmarkDeduplication(store);
      await this.benchmarkLargeContent(store);
      await this.benchmarkConcurrency(store);
      await this.benchmarkMemoryUsage(store);

      this.generateSummary();
      this.printResults();
      
      // Save detailed results
      const reportPath = path.join(tempDir, 'benchmark-report.json');
      await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
      console.log(`\n📊 Detailed report saved: ${reportPath}`);

    } finally {
      // Cleanup
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  async benchmarkBasicOperations(store) {
    console.log('\n🔬 Basic Operations Benchmark');
    console.log('------------------------------');

    const content = 'Hello, World! '.repeat(100); // ~1.3KB
    const iterations = 1000;

    // Store benchmark
    const storeStart = performance.now();
    const references = [];
    
    for (let i = 0; i < iterations; i++) {
      const ref = await store.store(content + i);
      references.push(ref);
    }
    
    const storeEnd = performance.now();
    const storeTime = storeEnd - storeStart;
    const storeAvg = storeTime / iterations;

    console.log(`✅ Store: ${iterations} operations in ${storeTime.toFixed(2)}ms (${storeAvg.toFixed(3)}ms avg)`);

    // Retrieve benchmark
    const retrieveStart = performance.now();
    
    for (const ref of references) {
      await store.retrieve(ref.hash);
    }
    
    const retrieveEnd = performance.now();
    const retrieveTime = retrieveEnd - retrieveStart;
    const retrieveAvg = retrieveTime / iterations;

    console.log(`✅ Retrieve: ${iterations} operations in ${retrieveTime.toFixed(2)}ms (${retrieveAvg.toFixed(3)}ms avg)`);

    this.results.tests.push({
      name: 'Basic Operations',
      storeTime,
      storeAvg,
      retrieveTime,
      retrieveAvg,
      operations: iterations
    });
  }

  async benchmarkDeduplication(store) {
    console.log('\n🔀 Deduplication Benchmark');
    console.log('---------------------------');

    const baseContent = 'Duplicate content test';
    const uniqueContent = 'Unique content ';
    const duplicates = 500;
    const uniques = 100;

    const start = performance.now();
    
    // Store duplicate content
    const duplicateRefs = [];
    for (let i = 0; i < duplicates; i++) {
      const ref = await store.store(baseContent);
      duplicateRefs.push(ref);
    }

    // Store unique content
    const uniqueRefs = [];
    for (let i = 0; i < uniques; i++) {
      const ref = await store.store(uniqueContent + i);
      uniqueRefs.push(ref);
    }

    const end = performance.now();

    // Verify deduplication
    const uniqueHashes = new Set(duplicateRefs.map(r => r.hash));
    const deduplicationEfficiency = (duplicates - uniqueHashes.size) / duplicates;

    console.log(`✅ Stored ${duplicates} duplicates + ${uniques} uniques in ${(end - start).toFixed(2)}ms`);
    console.log(`✅ Deduplication efficiency: ${(deduplicationEfficiency * 100).toFixed(1)}%`);
    console.log(`✅ Unique hashes for duplicates: ${uniqueHashes.size} (expected: 1)`);

    this.results.tests.push({
      name: 'Deduplication',
      totalTime: end - start,
      deduplicationEfficiency,
      duplicates,
      uniques
    });
  }

  async benchmarkLargeContent(store) {
    console.log('\n📦 Large Content Benchmark');
    console.log('---------------------------');

    // Generate different sized content
    const sizes = [
      { name: '1KB', content: 'x'.repeat(1024) },
      { name: '10KB', content: 'x'.repeat(10 * 1024) },
      { name: '100KB', content: 'x'.repeat(100 * 1024) },
      { name: '1MB', content: 'x'.repeat(1024 * 1024) }
    ];

    const results = [];

    for (const size of sizes) {
      const start = performance.now();
      const ref = await store.store(size.content);
      const storeTime = performance.now() - start;

      const retrieveStart = performance.now();
      const retrieved = await store.retrieve(ref.hash);
      const retrieveTime = performance.now() - retrieveStart;

      const valid = retrieved === size.content;

      console.log(`✅ ${size.name}: Store ${storeTime.toFixed(2)}ms, Retrieve ${retrieveTime.toFixed(2)}ms, Valid: ${valid}`);

      results.push({
        size: size.name,
        storeTime,
        retrieveTime,
        valid
      });
    }

    this.results.tests.push({
      name: 'Large Content',
      results
    });
  }

  async benchmarkConcurrency(store) {
    console.log('\n⚡ Concurrency Benchmark');
    console.log('-------------------------');

    const concurrency = 50;
    const content = 'Concurrent test content ';

    const start = performance.now();

    // Run concurrent store operations
    const promises = [];
    for (let i = 0; i < concurrency; i++) {
      promises.push(store.store(content + i));
    }

    const references = await Promise.all(promises);
    const storeTime = performance.now() - start;

    // Run concurrent retrieve operations
    const retrieveStart = performance.now();
    const retrievePromises = references.map(ref => store.retrieve(ref.hash));
    await Promise.all(retrievePromises);
    const retrieveTime = performance.now() - retrieveStart;

    console.log(`✅ Concurrent stores: ${concurrency} operations in ${storeTime.toFixed(2)}ms`);
    console.log(`✅ Concurrent retrieves: ${concurrency} operations in ${retrieveTime.toFixed(2)}ms`);

    this.results.tests.push({
      name: 'Concurrency',
      concurrency,
      storeTime,
      retrieveTime
    });
  }

  async benchmarkMemoryUsage(store) {
    console.log('\n🧠 Memory Usage Benchmark');
    console.log('--------------------------');

    const initialMemory = process.memoryUsage();
    
    // Store various content to fill cache
    const contents = [];
    for (let i = 0; i < 100; i++) {
      const content = `Memory test content ${i} `.repeat(100);
      contents.push(content);
      await store.store(content);
    }

    const afterStoreMemory = process.memoryUsage();

    // Retrieve all content to test cache
    for (let i = 0; i < contents.length; i++) {
      const hash = store.calculateHash ? store.calculateHash(contents[i]) : 'unknown';
      if (hash !== 'unknown') {
        await store.retrieve(hash);
      }
    }

    const finalMemory = process.memoryUsage();

    const storeMemoryIncrease = (afterStoreMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
    const totalMemoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;

    console.log(`✅ Memory increase after storing: ${storeMemoryIncrease.toFixed(2)} MB`);
    console.log(`✅ Total memory increase: ${totalMemoryIncrease.toFixed(2)} MB`);
    console.log(`✅ Final heap usage: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);

    this.results.tests.push({
      name: 'Memory Usage',
      storeMemoryIncrease,
      totalMemoryIncrease,
      finalHeapUsage: finalMemory.heapUsed / 1024 / 1024
    });
  }

  generateSummary() {
    const basicOps = this.results.tests.find(t => t.name === 'Basic Operations');
    const dedup = this.results.tests.find(t => t.name === 'Deduplication');
    const memory = this.results.tests.find(t => t.name === 'Memory Usage');

    this.results.summary = {
      averageStoreTime: basicOps?.storeAvg || 0,
      averageRetrieveTime: basicOps?.retrieveAvg || 0,
      deduplicationEfficiency: dedup?.deduplicationEfficiency || 0,
      memoryEfficiency: memory?.totalMemoryIncrease || 0,
      overallGrade: this.calculateOverallGrade()
    };
  }

  calculateOverallGrade() {
    const basicOps = this.results.tests.find(t => t.name === 'Basic Operations');
    const dedup = this.results.tests.find(t => t.name === 'Deduplication');
    const memory = this.results.tests.find(t => t.name === 'Memory Usage');

    let score = 0;
    let maxScore = 0;

    // Store performance (target: <5ms avg)
    if (basicOps?.storeAvg) {
      maxScore += 25;
      if (basicOps.storeAvg < 1) score += 25;
      else if (basicOps.storeAvg < 3) score += 20;
      else if (basicOps.storeAvg < 5) score += 15;
      else if (basicOps.storeAvg < 10) score += 10;
    }

    // Retrieve performance (target: <1ms avg)
    if (basicOps?.retrieveAvg) {
      maxScore += 25;
      if (basicOps.retrieveAvg < 0.5) score += 25;
      else if (basicOps.retrieveAvg < 1) score += 20;
      else if (basicOps.retrieveAvg < 2) score += 15;
      else if (basicOps.retrieveAvg < 5) score += 10;
    }

    // Deduplication (target: >95%)
    if (dedup?.deduplicationEfficiency) {
      maxScore += 25;
      if (dedup.deduplicationEfficiency > 0.95) score += 25;
      else if (dedup.deduplicationEfficiency > 0.9) score += 20;
      else if (dedup.deduplicationEfficiency > 0.8) score += 15;
      else if (dedup.deduplicationEfficiency > 0.7) score += 10;
    }

    // Memory efficiency (target: <50MB)
    if (memory?.totalMemoryIncrease) {
      maxScore += 25;
      if (memory.totalMemoryIncrease < 10) score += 25;
      else if (memory.totalMemoryIncrease < 25) score += 20;
      else if (memory.totalMemoryIncrease < 50) score += 15;
      else if (memory.totalMemoryIncrease < 100) score += 10;
    }

    return maxScore > 0 ? (score / maxScore) * 100 : 0;
  }

  printResults() {
    console.log('\n\n🎯 BENCHMARK RESULTS SUMMARY');
    console.log('============================');
    
    const summary = this.results.summary;
    
    console.log(`📊 Average Store Time: ${summary.averageStoreTime.toFixed(3)}ms`);
    console.log(`📊 Average Retrieve Time: ${summary.averageRetrieveTime.toFixed(3)}ms`);
    console.log(`📊 Deduplication Efficiency: ${(summary.deduplicationEfficiency * 100).toFixed(1)}%`);
    console.log(`📊 Memory Usage: ${summary.memoryEfficiency.toFixed(2)}MB`);
    console.log(`📊 Overall Grade: ${summary.overallGrade.toFixed(1)}%`);

    console.log('\n🎯 PERFORMANCE TARGETS');
    console.log('======================');
    console.log(`Store Time: ${summary.averageStoreTime < 5 ? '✅' : '❌'} Target: <5ms (Actual: ${summary.averageStoreTime.toFixed(3)}ms)`);
    console.log(`Retrieve Time: ${summary.averageRetrieveTime < 1 ? '✅' : '❌'} Target: <1ms (Actual: ${summary.averageRetrieveTime.toFixed(3)}ms)`);
    console.log(`Deduplication: ${summary.deduplicationEfficiency > 0.9 ? '✅' : '❌'} Target: >90% (Actual: ${(summary.deduplicationEfficiency * 100).toFixed(1)}%)`);
    console.log(`Memory Usage: ${summary.memoryEfficiency < 50 ? '✅' : '❌'} Target: <50MB (Actual: ${summary.memoryEfficiency.toFixed(2)}MB)`);

    const grade = summary.overallGrade;
    let gradeEmoji = '❌';
    if (grade >= 90) gradeEmoji = '🏆';
    else if (grade >= 80) gradeEmoji = '✅';
    else if (grade >= 70) gradeEmoji = '⚠️';

    console.log(`\n${gradeEmoji} Overall Performance: ${grade.toFixed(1)}%`);
    
    if (grade >= 80) {
      console.log('🎉 Excellent performance! Ready for production use.');
    } else if (grade >= 60) {
      console.log('⚠️  Good performance but consider optimization.');
    } else {
      console.log('❌ Performance needs improvement before production.');
    }
  }
}

async function main() {
  try {
    const benchmark = new StorageBenchmark();
    await benchmark.runAllBenchmarks();
  } catch (error) {
    console.error('❌ Benchmark failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { StorageBenchmark };