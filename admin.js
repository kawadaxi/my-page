(function () {
  var cloud = window.CloudBlog;
  if (!cloud) return;

  var client = cloud.getClient();
  var state = {
    posts: [],
    editingId: null,
    pendingCoverFile: null
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHtml(text) {
    return String(text || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function requireClient() {
    if (client) return true;
    cloud.showAlert('admin-alert', '请先在 cloud-config.js 填写 Supabase 配置。');
    return false;
  }

  function setAuthStatus(text) {
    byId('auth-status').textContent = text;
  }

  function resetEditor() {
    state.editingId = null;
    state.pendingCoverFile = null;
    byId('editorTitle').textContent = '写新文章';
    byId('postTitle').value = '';
    byId('postDate').value = new Date().toISOString().slice(0, 10);
    byId('postAuthor').value = '';
    byId('postExcerpt').value = '';
    byId('postContent').value = '';
    byId('postCover').value = '';
  }

  function renderPostList() {
    var wrap = byId('adminPostList');
    if (!state.posts.length) {
      wrap.innerHTML = '<p>还没有文章。</p>';
      return;
    }

    wrap.innerHTML = state.posts.map(function (post) {
      return '' +
        '<div class="admin-post-item">' +
        '<div>' +
        '<strong>' + escapeHtml(post.title) + '</strong>' +
        '<p>' + escapeHtml(post.published_date || '') + ' | ' + escapeHtml(post.author || '站长') + '</p>' +
        '</div>' +
        '<div class="admin-post-actions">' +
        '<button data-edit="' + post.id + '" type="button">编辑</button>' +
        '<button data-del="' + post.id + '" type="button" class="danger">删除</button>' +
        '</div>' +
        '</div>';
    }).join('');

    wrap.querySelectorAll('button[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        startEdit(btn.getAttribute('data-edit'));
      });
    });

    wrap.querySelectorAll('button[data-del]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        removePost(btn.getAttribute('data-del'));
      });
    });
  }

  async function loadSiteSettings() {
    var resp = await client.from('site_settings').select('title,tagline,about').eq('id', 1).maybeSingle();
    if (resp.error) {
      cloud.showAlert('admin-alert', '读取站点设置失败：' + resp.error.message);
      return;
    }

    var d = resp.data || {};
    byId('siteTitle').value = d.title || '';
    byId('siteTagline').value = d.tagline || '';
    byId('aboutText').value = d.about || '';
  }

  async function loadPosts() {
    var resp = await client
      .from('posts')
      .select('id,title,published_date,author,excerpt,content,cover_url,created_at')
      .order('published_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (resp.error) {
      cloud.showAlert('admin-alert', '读取文章失败：' + resp.error.message);
      return;
    }
    state.posts = resp.data || [];
    renderPostList();
  }

  function startEdit(id) {
    var post = state.posts.find(function (p) { return p.id === id; });
    if (!post) return;

    state.editingId = id;
    state.pendingCoverFile = null;

    byId('editorTitle').textContent = '编辑文章';
    byId('postTitle').value = post.title || '';
    byId('postDate').value = String(post.published_date || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
    byId('postAuthor').value = post.author || '';
    byId('postExcerpt').value = post.excerpt || '';
    byId('postContent').value = post.content || '';
    byId('postCover').value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function uploadCoverIfNeeded() {
    if (!state.pendingCoverFile) return null;

    var file = state.pendingCoverFile;
    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    var path = 'covers/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;

    var uploadResp = await client.storage
      .from(cloud.config.STORAGE_BUCKET || 'post-images')
      .upload(path, file, { upsert: false });

    if (uploadResp.error) {
      throw new Error('封面上传失败：' + uploadResp.error.message);
    }

    var publicResp = client.storage
      .from(cloud.config.STORAGE_BUCKET || 'post-images')
      .getPublicUrl(path);

    return publicResp.data && publicResp.data.publicUrl ? publicResp.data.publicUrl : null;
  }

  async function savePost() {
    var title = byId('postTitle').value.trim();
    var published_date = byId('postDate').value;
    var author = byId('postAuthor').value.trim() || '站长';
    var excerpt = byId('postExcerpt').value.trim();
    var content = byId('postContent').value.trim();

    if (!title) return alert('请先输入文章标题');
    if (!published_date) return alert('请选择发布日期');
    if (!content) return alert('请先输入正文内容');

    try {
      var newCoverUrl = await uploadCoverIfNeeded();

      if (state.editingId) {
        var current = state.posts.find(function (p) { return p.id === state.editingId; });
        var updateBody = {
          title: title,
          published_date: published_date,
          author: author,
          excerpt: excerpt,
          content: content
        };
        if (newCoverUrl) updateBody.cover_url = newCoverUrl;
        else if (current && current.cover_url) updateBody.cover_url = current.cover_url;

        var updateResp = await client.from('posts').update(updateBody).eq('id', state.editingId);
        if (updateResp.error) throw new Error(updateResp.error.message);
      } else {
        var insertResp = await client.from('posts').insert({
          title: title,
          published_date: published_date,
          author: author,
          excerpt: excerpt,
          content: content,
          cover_url: newCoverUrl || null
        });
        if (insertResp.error) throw new Error(insertResp.error.message);
      }

      await loadPosts();
      resetEditor();
      alert('文章已保存到云端。');
    } catch (err) {
      alert(err.message || '保存失败');
    }
  }

  async function removePost(id) {
    var post = state.posts.find(function (p) { return p.id === id; });
    if (!post) return;
    if (!window.confirm('确定删除《' + post.title + '》吗？')) return;

    var resp = await client.from('posts').delete().eq('id', id);
    if (resp.error) {
      alert('删除失败：' + resp.error.message);
      return;
    }

    await loadPosts();
    if (state.editingId === id) resetEditor();
  }

  async function saveSiteConfig() {
    var body = {
      id: 1,
      title: byId('siteTitle').value.trim() || '我的 BLOG',
      tagline: byId('siteTagline').value.trim(),
      about: byId('aboutText').value.trim()
    };

    var resp = await client.from('site_settings').upsert(body, { onConflict: 'id' });
    if (resp.error) {
      alert('保存失败：' + resp.error.message);
      return;
    }
    alert('站点设置已保存到云端。');
  }

  async function login() {
    var email = byId('loginEmail').value.trim();
    var password = byId('loginPassword').value;
    if (!email || !password) {
      alert('请输入邮箱和密码');
      return;
    }

    var resp = await client.auth.signInWithPassword({ email: email, password: password });
    if (resp.error) {
      alert('登录失败：' + resp.error.message);
      return;
    }

    byId('loginPassword').value = '';
    await afterLogin(resp.data.session && resp.data.session.user);
  }

  async function logout() {
    await client.auth.signOut();
    setAuthStatus('未登录');
    byId('admin-main').classList.add('hidden');
  }

  async function afterLogin(user) {
    if (!user) return;
    setAuthStatus('已登录：' + (user.email || '管理员'));
    byId('admin-main').classList.remove('hidden');
    await loadSiteSettings();
    await loadPosts();
    resetEditor();
  }

  async function initAuth() {
    var sessionResp = await client.auth.getSession();
    var user = sessionResp.data && sessionResp.data.session && sessionResp.data.session.user;
    if (user) {
      await afterLogin(user);
    } else {
      setAuthStatus('未登录');
      byId('admin-main').classList.add('hidden');
    }

    client.auth.onAuthStateChange(function (event, session) {
      var u = session && session.user;
      if (u) {
        afterLogin(u);
      } else {
        setAuthStatus('未登录');
        byId('admin-main').classList.add('hidden');
      }
    });
  }

  function bindEvents() {
    byId('loginBtn').addEventListener('click', login);
    byId('logoutBtn').addEventListener('click', logout);
    byId('saveSiteConfig').addEventListener('click', saveSiteConfig);
    byId('savePost').addEventListener('click', savePost);
    byId('resetEditor').addEventListener('click', resetEditor);
    byId('postCover').addEventListener('change', function (e) {
      state.pendingCoverFile = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    });
  }

  async function init() {
    if (!requireClient()) return;
    bindEvents();
    await initAuth();
  }

  init();
})();
