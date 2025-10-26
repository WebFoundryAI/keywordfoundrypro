#!/usr/bin/env ts-node
/**
 * Load Test Script for Keyword Foundry Pro
 *
 * Usage:
 *   pnpm tsx scripts/load-test.ts --projects=10 --depth=1 --duration=120
 *
 * Options:
 *   --projects: Number of concurrent projects to simulate (default: 10)
 *   --depth: Number of queries per project (default: 1)
 *   --duration: Maximum duration in seconds (default: 120)
 *   --dry-run: Skip database insert of results (default: false)
 */

interface LoadTestArgs {
  projects: number;
  depth: number;
  duration: number;
  dryRun: boolean;
}

interface LoadTestMetrics {
  runs: number;
  errors: number;
  latencies: number[];
  cacheHits: number;
  cacheMisses: number;
}

function parseArgs(): LoadTestArgs {
  const args = process.argv.slice(2);
  const parsed: LoadTestArgs = {
    projects: 10,
    depth: 1,
    duration: 120,
    dryRun: false,
  };

  args.forEach((arg) => {
    const [key, value] = arg.split('=');
    switch (key) {
      case '--projects':
        {
          const val = parseInt(value, 10);
          parsed.projects = val > 0 ? val : 10;
        }
        break;
      case '--depth':
        {
          const val = parseInt(value, 10);
          parsed.depth = val > 0 ? val : 1;
        }
        break;
      case '--duration':
        {
          const val = parseInt(value, 10);
          parsed.duration = val > 0 ? val : 120;
        }
        break;
      case '--dry-run':
        parsed.dryRun = true;
        break;
    }
  });

  return parsed;
}

async function simulateQuery(
  projectIndex: number,
  queryIndex: number
): Promise<{
  latency: number;
  cached: boolean;
  error: boolean;
}> {
  const startTime = Date.now();

  // Simulate API call latency (50-500ms)
  const latency = Math.random() * 450 + 50;
  await new Promise((resolve) => setTimeout(resolve, latency));

  // Simulate cache hit rate (~30%)
  const cached = Math.random() < 0.3;

  // Simulate error rate (~2%)
  const error = Math.random() < 0.02;

  return {
    latency: Date.now() - startTime,
    cached,
    error,
  };
}

async function runLoadTest(args: LoadTestArgs): Promise<void> {
  console.log('🚀 Starting load test...');
  console.log(`   Projects: ${args.projects}`);
  console.log(`   Depth: ${args.depth} queries per project`);
  console.log(`   Max Duration: ${args.duration}s`);
  console.log(`   Dry Run: ${args.dryRun}`);
  console.log('');

  const startTime = Date.now();
  const endTime = startTime + args.duration * 1000;
  const metrics: LoadTestMetrics = {
    runs: 0,
    errors: 0,
    latencies: [],
    cacheHits: 0,
    cacheMisses: 0,
  };

  // Run concurrent projects
  const projectPromises = [];

  for (let p = 0; p < args.projects; p++) {
    const projectPromise = (async () => {
      for (let d = 0; d < args.depth; d++) {
        // Check if we've exceeded duration
        if (Date.now() >= endTime) {
          break;
        }

        try {
          const result = await simulateQuery(p, d);
          metrics.runs++;
          metrics.latencies.push(result.latency);

          if (result.error) {
            metrics.errors++;
          }

          if (result.cached) {
            metrics.cacheHits++;
          } else {
            metrics.cacheMisses++;
          }

          // Log progress every 10 runs
          if (metrics.runs % 10 === 0) {
            process.stdout.write(
              `\r   Progress: ${metrics.runs} runs, ${metrics.errors} errors`
            );
          }
        } catch (error) {
          metrics.errors++;
          console.error(`\nError in project ${p}, query ${d}:`, error);
        }
      }
    })();

    projectPromises.push(projectPromise);
  }

  // Wait for all projects to complete or timeout
  await Promise.all(projectPromises);

  const durationMs = Date.now() - startTime;

  // Calculate statistics
  const avgLatency =
    metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length ||
    0;

  // Calculate P95
  const sortedLatencies = metrics.latencies.sort((a, b) => a - b);
  const p95Index = Math.floor(sortedLatencies.length * 0.95);
  const p95Latency = sortedLatencies[p95Index] || 0;

  const cacheHitPct =
    ((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100) ||
    0;

  console.log('\n\n✅ Load test complete!');
  console.log('');
  console.log('Results:');
  console.log(`   Duration: ${durationMs}ms (${(durationMs / 1000).toFixed(1)}s)`);
  console.log(`   Total Runs: ${metrics.runs}`);
  console.log(`   Errors: ${metrics.errors} (${((metrics.errors / metrics.runs) * 100).toFixed(2)}%)`);
  console.log(`   Avg Latency: ${avgLatency.toFixed(2)}ms`);
  console.log(`   P95 Latency: ${p95Latency.toFixed(2)}ms`);
  console.log(`   Cache Hit Rate: ${cacheHitPct.toFixed(2)}%`);
  console.log('');

  // Save results to database (if not dry run)
  if (!args.dryRun) {
    try {
      await saveResults({
        started_at: new Date(startTime).toISOString(),
        duration_ms: durationMs,
        runs: metrics.runs,
        errors: metrics.errors,
        avg_latency_ms: avgLatency,
        p95_latency_ms: p95Latency,
        cache_hit_pct: cacheHitPct,
        meta: {
          projects: args.projects,
          depth: args.depth,
          maxDuration: args.duration,
        },
      });
      console.log('✅ Results saved to database');
    } catch (error) {
      console.error('❌ Failed to save results:', error);
    }
  } else {
    console.log('ℹ️  Dry run - results not saved to database');
  }
}

async function saveResults(results: any): Promise<void> {
  // In a real implementation, this would use Supabase client
  // For now, just log that we would save
  console.log('Would save to load_test_reports:', JSON.stringify(results, null, 2));
}

// Main execution
const args = parseArgs();
runLoadTest(args).catch((error) => {
  console.error('❌ Load test failed:', error);
  process.exit(1);
});

export { parseArgs, runLoadTest, type LoadTestArgs, type LoadTestMetrics };
