const performance = require('perf_hooks').performance;

// Performance monitoring middleware
function performanceMiddleware(req, res, next) {
  const start = performance.now();
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = performance.now() - start;
    
    // Log slow requests (> 1 second)
    if (duration > 1000) {
      console.warn(`🐌 Slow request: ${req.method} ${req.path} took ${duration.toFixed(2)}ms`);
    }
    
    // Add response time header only if headers haven't been sent
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
    }
    
    originalEnd.apply(this, args);
  };
  
  next();
}

// Database query performance monitoring
function monitorQuery(query, params = []) {
  const start = performance.now();
  
  return {
    start,
    end: () => {
      const duration = performance.now() - start;
      
      // Log slow queries (> 500ms)
      if (duration > 500) {
        console.warn(`🐌 Slow query (${duration.toFixed(2)}ms): ${query.substring(0, 100)}...`);
      }
      
      return duration;
    }
  };
}

// Memory usage monitoring
function logMemoryUsage() {
  const memUsage = process.memoryUsage();
  console.log(`💾 Memory Usage:
    RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB
    Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB
    Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB
    External: ${(memUsage.external / 1024 / 1024).toFixed(2)} MB`);
}

module.exports = {
  performanceMiddleware,
  monitorQuery,
  logMemoryUsage
}; 