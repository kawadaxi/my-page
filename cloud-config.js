(function () {
  var defaults = {
    SUPABASE_URL: 'https://ufuhkcxbmttsfgtrdmtw.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdWhrY3hibXR0c2ZndHJkbXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3OTg5MjksImV4cCI6MjA4NzM3NDkyOX0.aJrF6zNv6SJoolokI3gdGiGa9FkqZga_5XwwWSjkjNk',
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
