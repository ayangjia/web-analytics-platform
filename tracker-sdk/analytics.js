/**
 * Web Analytics Tracker SDK
 * 用于追踪网站访问、点击、转化等行为
 * @version 1.0.0
 */

(function(global) {
  'use strict';

  const Analytics = {
    config: {
      apiUrl: 'http://localhost:3000/api',
      apiKey: null,
      siteId: null,
      debug: false,
      trackClicks: true,
      trackForms: true,
      trackErrors: true,
      anonymizeIp: false,
      sessionTimeout: 30 * 60 * 1000 // 30分钟
    },
    
    sessionId: null,
    visitorId: null,
    startTime: Date.now(),
    pageStartTime: Date.now(),
    queue: [],
    isReady: false,

    // 初始化
    init: function(options) {
      this.config = Object.assign(this.config, options);
      
      if (!this.config.apiKey) {
        console.error('[Analytics] API Key is required');
        return;
      }

      // 生成或恢复访客ID
      this.visitorId = this.getCookie('analytics_visitor_id') || this.generateId();
      this.setCookie('analytics_visitor_id', this.visitorId, 365);

      // 生成或恢复会话ID
      const sessionData = this.getSessionData();
      if (sessionData && (Date.now() - sessionData.timestamp) < this.config.sessionTimeout) {
        this.sessionId = sessionData.id;
      } else {
        this.sessionId = this.generateId();
        this.setSessionData(this.sessionId);
      }

      this.isReady = true;
      this.log('Analytics initialized', { visitorId: this.visitorId, sessionId: this.sessionId });

      // 追踪页面访问
      this.trackPageView();

      // 绑定事件监听
      this.bindEvents();

      // 处理队列
      this.processQueue();
    },

    // 生成唯一ID
    generateId: function() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    },

    // Cookie 操作
    setCookie: function(name, value, days) {
      const expires = new Date(Date.now() + days * 864e5).toUTCString();
      document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/; SameSite=Lax';
    },

    getCookie: function(name) {
      return document.cookie.split('; ').reduce(function(r, v) {
        const parts = v.split('=');
        return parts[0] === name ? decodeURIComponent(parts[1]) : r;
      }, '');
    },

    // Session Storage 操作
    setSessionData: function(sessionId) {
      try {
        sessionStorage.setItem('analytics_session', JSON.stringify({
          id: sessionId,
          timestamp: Date.now()
        }));
      } catch(e) {}
    },

    getSessionData: function() {
      try {
        const data = sessionStorage.getItem('analytics_session');
        return data ? JSON.parse(data) : null;
      } catch(e) {
        return null;
      }
    },

    // 日志
    log: function(...args) {
      if (this.config.debug) {
        console.log('[Analytics]', ...args);
      }
    },

    // 发送数据到服务器
    send: function(endpoint, data) {
      const payload = Object.assign({
        api_key: this.config.apiKey,
        session_id: this.sessionId,
        visitor_id: this.visitorId,
        timestamp: new Date().toISOString()
      }, data);

      if (!this.isReady) {
        this.queue.push({ endpoint, payload });
        return;
      }

      const url = this.config.apiUrl + endpoint;
      
      // 使用 sendBeacon 优先，不支持则使用 fetch
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
      } else {
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(err => this.log('Send error:', err));
      }
    },

    // 处理队列
    processQueue: function() {
      while (this.queue.length > 0) {
        const item = this.queue.shift();
        this.send(item.endpoint, item.payload);
      }
    },

    // 追踪页面访问
    trackPageView: function() {
      this.pageStartTime = Date.now();
      
      this.send('/track/pageview', {
        page_url: window.location.href,
        page_title: document.title,
        referrer: document.referrer,
        user_agent: navigator.userAgent,
        screen_resolution: screen.width + 'x' + screen.height,
        language: navigator.language,
        ip_address: null // 服务器端获取
      });

      this.log('Page view tracked:', window.location.href);
    },

    // 追踪自定义事件
    trackEvent: function(eventName, properties) {
      const data = {
        event_name: eventName,
        page_url: window.location.href
      };

      if (properties) {
        if (properties.category) data.event_category = properties.category;
        if (properties.action) data.event_action = properties.action;
        if (properties.label) data.event_label = properties.label;
        if (properties.value) data.event_value = properties.value;
        data.properties = properties;
      }

      this.send('/track/event', data);
      this.log('Event tracked:', eventName, properties);
    },

    // 追踪点击
    trackClick: function(element, event) {
      const tagName = element.tagName.toLowerCase();
      const data = {
        category: 'click',
        action: 'click_' + tagName,
        label: element.textContent?.trim().substring(0, 50) || element.id || element.className || 'unknown'
      };

      // 特殊处理链接
      if (tagName === 'a') {
        data.action = 'click_link';
        data.label = element.href || data.label;
        
        // 外部链接标记
        if (element.hostname !== window.location.hostname) {
          data.category = 'outbound';
        }
      }

      // 特殊处理按钮
      if (tagName === 'button' || element.type === 'button' || element.type === 'submit') {
        data.action = 'click_button';
      }

      this.trackEvent('click', data);
    },

    // 追踪表单提交
    trackFormSubmit: function(form) {
      const formId = form.id || form.name || 'unnamed_form';
      const formAction = form.action || window.location.href;
      
      this.trackEvent('form_submit', {
        category: 'form',
        action: 'submit',
        label: formId,
        properties: {
          form_id: formId,
          form_action: formAction,
          form_method: form.method || 'get'
        }
      });
    },

    // 追踪转化
    trackConversion: function(goalName, value) {
      this.send('/track/conversion', {
        goal_name: goalName,
        goal_value: value || 0,
        page_url: window.location.href
      });
      this.log('Conversion tracked:', goalName, value);
    },

    // 追踪错误
    trackError: function(error, context) {
      this.trackEvent('error', {
        category: 'error',
        action: error.name || 'Error',
        label: error.message?.substring(0, 100) || 'Unknown error',
        properties: {
          error_message: error.message,
          error_stack: error.stack,
          context: context,
          url: window.location.href
        }
      });
    },

    // 绑定事件监听
    bindEvents: function() {
      const self = this;

      // 点击追踪
      if (this.config.trackClicks) {
        document.addEventListener('click', function(e) {
          const element = e.target.closest('a, button, [role="button"], input[type="submit"]');
          if (element) {
            self.trackClick(element, e);
          }
        }, true);
      }

      // 表单提交追踪
      if (this.config.trackForms) {
        document.addEventListener('submit', function(e) {
          self.trackFormSubmit(e.target);
        }, true);
      }

      // 错误追踪
      if (this.config.trackErrors) {
        window.addEventListener('error', function(e) {
          self.trackError(e.error || new Error(e.message), {
            filename: e.filename,
            lineno: e.lineno,
            colno: e.colno
          });
        });

        window.addEventListener('unhandledrejection', function(e) {
          self.trackError(new Error(e.reason), { type: 'unhandledrejection' });
        });
      }

      // 页面可见性变化（离开页面时发送数据）
      document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') {
          // 计算页面停留时间
          const duration = Date.now() - self.pageStartTime;
          self.trackEvent('page_duration', {
            category: 'engagement',
            action: 'time_on_page',
            value: Math.round(duration / 1000)
          });
        }
      });

      // 历史记录变化（SPA 支持）
      const originalPushState = history.pushState;
      history.pushState = function() {
        originalPushState.apply(this, arguments);
        self.trackPageView();
      };

      window.addEventListener('popstate', function() {
        self.trackPageView();
      });

      // 页面卸载前确保数据发送
      window.addEventListener('beforeunload', function() {
        self.processQueue();
      });
    },

    // 设置用户属性
    setUserProperties: function(properties) {
      this.trackEvent('user_properties', {
        category: 'user',
        properties: properties
      });
    },

    // 开始计时（用于测量操作耗时）
    startTimer: function(name) {
      this['_timer_' + name] = Date.now();
    },

    // 停止计时并追踪
    stopTimer: function(name) {
      const start = this['_timer_' + name];
      if (start) {
        const duration = Date.now() - start;
        this.trackEvent('timing', {
          category: 'timing',
          action: name,
          value: duration
        });
        delete this['_timer_' + name;
      }
    }
  };

  // 暴露到全局
  global.Analytics = Analytics;

  // 支持异步加载队列
  if (global.analyticsQueue) {
    global.analyticsQueue.forEach(function(args) {
      const method = args[0];
      if (typeof Analytics[method] === 'function') {
        Analytics[method].apply(Analytics, args.slice(1));
      }
    });
  }

})(window);
