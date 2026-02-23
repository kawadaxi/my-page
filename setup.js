(function () {
  function byId(id) {
    return document.getElementById(id);
  }

  function show(message) {
    var el = byId('setup-alert');
    if (!el) return;
    if (!message) {
      el.classList.add('hidden');
      el.textContent = '';
      return;
    }
    el.textContent = message;
    el.classList.remove('hidden');
  }

  function loadCurrent() {
    var cfg = window.CLOUD_CONFIG || {};
    byId('cfgUrl').value = cfg.SUPABASE_URL && cfg.SUPABASE_URL.indexOf('YOUR_PROJECT_REF') === -1 ? cfg.SUPABASE_URL : '';
    byId('cfgAnonKey').value = cfg.SUPABASE_ANON_KEY && cfg.SUPABASE_ANON_KEY.indexOf('YOUR_SUPABASE_ANON_KEY') === -1 ? cfg.SUPABASE_ANON_KEY : '';
    byId('cfgBucket').value = cfg.STORAGE_BUCKET || 'post-images';
  }

  function saveLocal() {
    var payload = {
      SUPABASE_URL: byId('cfgUrl').value.trim(),
      SUPABASE_ANON_KEY: byId('cfgAnonKey').value.trim(),
      STORAGE_BUCKET: byId('cfgBucket').value.trim() || 'post-images'
    };

    if (!payload.SUPABASE_URL || !payload.SUPABASE_ANON_KEY) {
      show('请先填写 Project URL 和 anon key。');
      return null;
    }

    localStorage.setItem('cloud_blog_config', JSON.stringify(payload));
    show('配置已保存到当前浏览器。现在可以去 admin.html 登录写文章。');
    return payload;
  }

  async function testConnection() {
    var payload = saveLocal();
    if (!payload) return;

    try {
      if (!window.supabase || !window.supabase.createClient) {
        show('Supabase SDK 加载失败，请刷新页面重试。');
        return;
      }
      var client = window.supabase.createClient(payload.SUPABASE_URL, payload.SUPABASE_ANON_KEY);
      var resp = await client.from('site_settings').select('id').limit(1);
      if (resp.error) {
        show('连接失败：' + resp.error.message + '。请先执行 schema.sql 或检查 key。');
        return;
      }
      show('连接成功。你可以打开 admin.html 登录并开始写作。');
    } catch (err) {
      show('测试失败：' + (err && err.message ? err.message : '未知错误'));
    }
  }

  function clearConfig() {
    localStorage.removeItem('cloud_blog_config');
    byId('cfgUrl').value = '';
    byId('cfgAnonKey').value = '';
    byId('cfgBucket').value = 'post-images';
    show('已清空本地配置。');
  }

  function init() {
    loadCurrent();
    byId('saveCfg').addEventListener('click', saveLocal);
    byId('testCfg').addEventListener('click', testConnection);
    byId('clearCfg').addEventListener('click', clearConfig);
  }

  init();
})();
