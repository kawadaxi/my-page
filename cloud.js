(function () {
  var config = window.CLOUD_CONFIG || {};
  var cachedClient = null;

  function hasConfig() {
    return Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY) &&
      config.SUPABASE_URL.indexOf('YOUR_PROJECT_REF') === -1 &&
      config.SUPABASE_ANON_KEY.indexOf('YOUR_SUPABASE_ANON_KEY') === -1;
  }

  function getClient() {
    if (!hasConfig()) return null;
    if (cachedClient) return cachedClient;
    if (!window.supabase || !window.supabase.createClient) return null;
    cachedClient = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    return cachedClient;
  }

  function showAlert(id, message) {
    var el = document.getElementById(id);
    if (!el) return;
    if (!message) {
      el.classList.add('hidden');
      el.textContent = '';
      return;
    }
    el.textContent = message;
    el.classList.remove('hidden');
  }

  window.CloudBlog = {
    config: config,
    hasConfig: hasConfig,
    getClient: getClient,
    showAlert: showAlert
  };
})();
