// enhanced-monitoring-script.js (injected into generated apps)
(function() {
    // Only run in iframe context
    if (window.top === window) return;
    
    const observability = {
      // Performance metrics
      metrics: {
        pageLoad: 0,
        renderCount: 0,
        errorCount: 0,
        memoryUsage: 0,
        networkRequests: [],
        reactRenders: [],
        vitals: {},
        apiCalls: [],
        slowQueries: []
      },
      
      // Usage analytics
      usage: {
        clicks: [],
        scrolls: [],
        formInteractions: [],
        pageViews: [],
        timeOnPage: 0,
        userFlow: [],
        featureUsage: {},
        heatmapData: []
      },
      
      // Logging system
      logs: {
        console: [],
        network: [],
        errors: [],
        performance: [],
        user: []
      },
  
      // Session tracking
      session: {
        startTime: Date.now(),
        sessionId: generateSessionId(),
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    };
  
    function generateSessionId() {
      return 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }
  
    // ============= ENHANCED LOGGING SYSTEM =============
    
    // Console logging interceptor
    function setupConsoleLogging() {
      const originalConsole = {
        log: console.log,
        warn: console.warn,
        error: console.error,
        info: console.info,
        debug: console.debug
      };
  
      ['log', 'warn', 'error', 'info', 'debug'].forEach(method => {
        console[method] = function(...args) {
          // Call original method
          originalConsole[method].apply(console, args);
          
          // Log to our system
          const logEntry = {
            level: method,
            message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '),
            timestamp: Date.now(),
            stack: method === 'error' ? new Error().stack : null
          };
          
          observability.logs.console.push(logEntry);
          
          // Keep only last 100 entries
          if (observability.logs.console.length > 100) {
            observability.logs.console.shift();
          }
          
          sendUpdate('console_log', logEntry);
        };
      });
    }
  
    // Network request monitoring
    function setupNetworkLogging() {
      // Fetch interceptor
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        const startTime = Date.now();
        const url = args[0];
        const options = args[1] || {};
        
        const requestId = 'req_' + Math.random().toString(36).substr(2, 9);
        
        const networkLog = {
          id: requestId,
          url: url,
          method: options.method || 'GET',
          startTime: startTime,
          status: null,
          duration: null,
          size: null,
          error: null
        };
        
        observability.logs.network.push(networkLog);
        
        return originalFetch.apply(this, args)
          .then(response => {
            const endTime = Date.now();
            networkLog.status = response.status;
            networkLog.duration = endTime - startTime;
            networkLog.size = response.headers.get('content-length') || 'unknown';
            
            // Track slow API calls
            if (networkLog.duration > 1000) {
              observability.metrics.slowQueries.push({
                ...networkLog,
                type: 'slow_fetch'
              });
            }
            
            observability.metrics.apiCalls.push({
              url: networkLog.url,
              duration: networkLog.duration,
              status: networkLog.status,
              timestamp: startTime
            });
            
            sendUpdate('network_request', networkLog);
            return response;
          })
          .catch(error => {
            networkLog.error = error.message;
            networkLog.duration = Date.now() - startTime;
            sendUpdate('network_error', networkLog);
            throw error;
          });
      };
  
      // XMLHttpRequest interceptor
      const originalXHR = window.XMLHttpRequest;
      window.XMLHttpRequest = function() {
        const xhr = new originalXHR();
        const startTime = Date.now();
        
        const originalOpen = xhr.open;
        xhr.open = function(method, url) {
          this._method = method;
          this._url = url;
          return originalOpen.apply(this, arguments);
        };
        
        const originalSend = xhr.send;
        xhr.send = function() {
          const requestLog = {
            url: this._url,
            method: this._method,
            startTime: startTime
          };
          
          this.addEventListener('load', function() {
            requestLog.duration = Date.now() - startTime;
            requestLog.status = this.status;
            observability.logs.network.push(requestLog);
            sendUpdate('xhr_request', requestLog);
          });
          
          return originalSend.apply(this, arguments);
        };
        
        return xhr;
      };
    }
  
    // ============= USAGE ANALYTICS =============
    
    // Click tracking with element context
    function setupClickTracking() {
      document.addEventListener('click', function(e) {
        const clickData = {
          timestamp: Date.now(),
          element: e.target.tagName,
          className: e.target.className,
          id: e.target.id,
          text: e.target.textContent?.substring(0, 50) || '',
          xpath: getElementXPath(e.target),
          coordinates: {
            x: e.clientX,
            y: e.clientY
          },
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        };
        
        observability.usage.clicks.push(clickData);
        observability.usage.heatmapData.push({
          x: e.clientX,
          y: e.clientY,
          timestamp: Date.now()
        });
        
        // Track feature usage
        const feature = detectFeature(e.target);
        if (feature) {
          observability.usage.featureUsage[feature] = (observability.usage.featureUsage[feature] || 0) + 1;
        }
        
        sendUpdate('user_click', clickData);
      }, true);
    }
  
    // Scroll tracking
    function setupScrollTracking() {
      let scrollTimeout;
      let lastScrollY = 0;
      
      window.addEventListener('scroll', function() {
        clearTimeout(scrollTimeout);
        
        scrollTimeout = setTimeout(() => {
          const scrollData = {
            timestamp: Date.now(),
            scrollY: window.scrollY,
            scrollX: window.scrollX,
            documentHeight: document.documentElement.scrollHeight,
            viewportHeight: window.innerHeight,
            scrollPercentage: Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100)
          };
          
          observability.usage.scrolls.push(scrollData);
          sendUpdate('user_scroll', scrollData);
          
          lastScrollY = window.scrollY;
        }, 150);
      });
    }
  
    // Form interaction tracking
    function setupFormTracking() {
      // Track form field interactions
      document.addEventListener('input', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
          const formData = {
            timestamp: Date.now(),
            element: e.target.tagName,
            type: e.target.type,
            name: e.target.name,
            id: e.target.id,
            placeholder: e.target.placeholder,
            valueLength: e.target.value?.length || 0, // Don't log actual values for privacy
            formId: e.target.form?.id || 'unknown'
          };
          
          observability.usage.formInteractions.push(formData);
          sendUpdate('form_interaction', formData);
        }
      });
  
      // Track form submissions
      document.addEventListener('submit', function(e) {
        const formSubmission = {
          timestamp: Date.now(),
          formId: e.target.id,
          formAction: e.target.action,
          formMethod: e.target.method,
          fieldCount: e.target.elements.length
        };
        
        observability.logs.user.push({
          type: 'form_submission',
          data: formSubmission
        });
        
        sendUpdate('form_submission', formSubmission);
      });
    }
  
    // ============= PERFORMANCE MONITORING =============
    
    // React performance monitoring
    function setupReactMonitoring() {
      if (window.React) {
        // Detect React DevTools
        if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
          const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
          
          hook.onCommitFiberRoot = (id, root, priorityLevel) => {
            const renderData = {
              timestamp: Date.now(),
              rootId: id,
              priorityLevel: priorityLevel,
              pendingTime: root.pendingTime || 0
            };
            
            observability.metrics.reactRenders.push(renderData);
            observability.metrics.renderCount++;
            
            sendUpdate('react_render', renderData);
          };
        }
        
        // Component error boundaries
        const originalComponentDidCatch = window.React.Component.prototype.componentDidCatch;
        if (originalComponentDidCatch) {
          window.React.Component.prototype.componentDidCatch = function(error, errorInfo) {
            const errorData = {
              timestamp: Date.now(),
              error: error.message,
              stack: error.stack,
              componentStack: errorInfo.componentStack
            };
            
            observability.logs.errors.push(errorData);
            sendUpdate('react_error', errorData);
            
            return originalComponentDidCatch.call(this, error, errorInfo);
          };
        }
      }
    }
  
    // Performance bottleneck detection
    function setupPerformanceMonitoring() {
      // Long task detection
      if ('PerformanceObserver' in window) {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // Tasks longer than 50ms
              const longTask = {
                timestamp: Date.now(),
                duration: entry.duration,
                startTime: entry.startTime,
                name: entry.name || 'unknown'
              };
              
              observability.logs.performance.push({
                type: 'long_task',
                data: longTask
              });
              
              sendUpdate('long_task', longTask);
            }
          }
        }).observe({entryTypes: ['longtask']});
  
        // Layout shifts
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.value > 0.1) { // Significant layout shift
              const layoutShift = {
                timestamp: Date.now(),
                value: entry.value,
                hadRecentInput: entry.hadRecentInput
              };
              
              observability.logs.performance.push({
                type: 'layout_shift',
                data: layoutShift
              });
              
              sendUpdate('layout_shift', layoutShift);
            }
          }
        }).observe({entryTypes: ['layout-shift']});
      }
    }
  
    // ============= UTILITY FUNCTIONS =============
    
    function getElementXPath(element) {
      if (element.id) return `id("${element.id}")`;
      if (element === document.body) return 'html/body';
      
      let ix = 0;
      const siblings = element.parentNode?.childNodes || [];
      for (let i = 0; i < siblings.length; i++) {
        const sibling = siblings[i];
        if (sibling === element) {
          return getElementXPath(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
        }
        if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
          ix++;
        }
      }
    }
  
    function detectFeature(element) {
      // Simple feature detection based on common patterns
      const className = element.className?.toLowerCase() || '';
      const id = element.id?.toLowerCase() || '';
      const text = element.textContent?.toLowerCase() || '';
      
      if (className.includes('button') || element.tagName === 'BUTTON') return 'button';
      if (className.includes('nav') || id.includes('nav')) return 'navigation';
      if (className.includes('form') || element.tagName === 'FORM') return 'form';
      if (className.includes('modal') || className.includes('dialog')) return 'modal';
      if (text.includes('submit') || text.includes('save')) return 'submit';
      if (text.includes('cancel') || text.includes('close')) return 'cancel';
      
      return null;
    }
  
    // ============= DATA TRANSMISSION =============
    
    function sendUpdate(type, data) {
      window.parent.postMessage({
        type: 'OBSERVABILITY_UPDATE',
        payload: {
          updateType: type,
          data: data,
          timestamp: Date.now(),
          sessionId: observability.session.sessionId
        }
      }, '*');
    }
  
    function sendFullSnapshot() {
      // Calculate session stats
      observability.usage.timeOnPage = Date.now() - observability.session.startTime;
      
      window.parent.postMessage({
        type: 'OBSERVABILITY_SNAPSHOT',
        payload: {
          metrics: observability.metrics,
          usage: observability.usage,
          logs: observability.logs,
          session: observability.session,
          timestamp: Date.now()
        }
      }, '*');
    }
  
    // ============= INITIALIZATION =============
    
    function initialize() {
      setupConsoleLogging();
      setupNetworkLogging();
      setupClickTracking();
      setupScrollTracking();
      setupFormTracking();
      setupReactMonitoring();
      setupPerformanceMonitoring();
      
      // Send initial snapshot
      setTimeout(sendFullSnapshot, 1000);
      
      // Send periodic updates
      setInterval(sendFullSnapshot, 10000); // Every 10 seconds
      
      // Send final snapshot before page unload
      window.addEventListener('beforeunload', sendFullSnapshot);
      
      console.log('🔍 Enhanced observability monitoring initialized');
    }
  
    // Start monitoring
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initialize);
    } else {
      initialize();
    }
  
  })();