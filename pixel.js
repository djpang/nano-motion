/* Official OpenAI queue/SDK pattern. Consent defaults to denied for this demo. */
(function (w, d) {
  'use strict';
  var consent = false;
  var choice = null;
  try { choice = localStorage.getItem('nm_measurement_consent'); consent = choice === 'granted'; } catch (_) {}
  var sdkState = 'loading';
  var logs = [];
  var blockedCount = 0;
  var change = function () { w.dispatchEvent(new CustomEvent('nm:measurement')); };
  if (!w.oaiq) {
    var q = function () { q.q.push(arguments); };
    q.q = [];
    w.oaiq = q;
    var js = d.createElement('script');
    js.async = true;
    js.src = 'https://bzrcdn.openai.com/sdk/oaiq.min.js';
    js.onload = function () { sdkState = 'loaded'; change(); };
    js.onerror = function () { sdkState = 'unavailable'; change(); };
    var f = d.getElementsByTagName('script')[0];
    f.parentNode.insertBefore(js, f);
  }
  // Always set consent BEFORE init. Restore a saved grant only after init.
  w.oaiq('consent', false);
  w.oaiq('init', { pixelId: 'JVqJHiUMphYM8rZnxaMwYm', debug: true });
  if (consent) w.oaiq('consent', true);
  w.NanoMeasurement = {
    get consent() { return consent; },
    get choice() { return choice; },
    get sdkState() { return sdkState; },
    get logs() { return logs.slice(); },
    get blockedCount() { return blockedCount; },
    setConsent: function (allow) {
      consent = Boolean(allow);
      choice = consent ? 'granted' : 'denied';
      try { localStorage.setItem('nm_measurement_consent', choice); } catch (_) {}
      try { w.oaiq('consent', consent); } catch (_) { sdkState = 'unavailable'; }
      change();
    },
    measure: function (name, data, options) {
      var row = { timestamp: new Date().toISOString(), event: name, data: structuredClone(data), options: options ? structuredClone(options) : {}, consent: consent, status: consent ? 'called' : 'blocked' };
      if (!consent) {
        blockedCount++;
      } else if (sdkState === 'unavailable') {
        row.status = 'sdk_unavailable';
      } else {
        try {
          if (options) w.oaiq('measure', name, data, options);
          else w.oaiq('measure', name, data);
          // A successful call is not a delivery acknowledgment.
          row.status = sdkState === 'loading' ? 'queued' : 'called';
        } catch (_) { row.status = 'call_failed'; }
      }
      logs.unshift(row);
      logs = logs.slice(0, 200);
      change();
      return row;
    },
    clearLog: function () { logs = []; blockedCount = 0; change(); }
  };
})(window, document);
