(function () {
  var defaults = {
    SUPABASE_URL: 'https://YOUR_PROJECT_REF.supabase.co',
    SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
    STORAGE_BUCKET: 'post-images'
  };

  var local = {};
  try {
    local = JSON.parse(localStorage.getItem('cloud_blog_config') || '{}') || {};
  } catch (e) {
    local = {};
  }

  window.CLOUD_CONFIG = {
    SUPABASE_URL: local.SUPABASE_URL || defaults.SUPABASE_URL,
    SUPABASE_ANON_KEY: local.SUPABASE_ANON_KEY || defaults.SUPABASE_ANON_KEY,
    STORAGE_BUCKET: local.STORAGE_BUCKET || defaults.STORAGE_BUCKET
  };
})();
