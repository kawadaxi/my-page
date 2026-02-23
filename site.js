(function () {
  var cloud = window.CloudBlog;
  if (!cloud) return;

  var client = cloud.getClient();
  var state = {
    site: {
      title: '我的 BLOG',
      tagline: '思绪来得快去得也快，偶尔会在这里停留',
      about: '你好，我是站长。这里是我的个人博客，主要记录技术、阅读和日常思考。'
    },
    posts: [],
    query: ''
  };

  function safe(text) {
    return String(text || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function formatDate(isoDate) {
    var d = new Date(isoDate);
    if (isNaN(d.getTime())) return String(isoDate || '').toUpperCase();
    var m = d.toLocaleString('en-US', { month: 'long' }).toUpperCase();
    return m + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function sortPosts(posts) {
    return posts.slice().sort(function (a, b) {
      var da = new Date(a.published_date || a.created_at || 0).getTime();
      var db = new Date(b.published_date || b.created_at || 0).getTime();
      return db - da;
    });
  }

  function filterPosts(posts) {
    if (!state.query) return posts;
    var q = state.query.toLowerCase();
    return posts.filter(function (p) {
      var text = [p.title, p.excerpt, p.content].join(' ').toLowerCase();
      return text.indexOf(q) !== -1;
    });
  }

  function renderSiteInfo() {
    var title = document.getElementById('site-title-link');
    var tagline = document.getElementById('site-tagline');
    var about = document.getElementById('about-text');
    document.title = state.site.title || '我的 BLOG';
    if (title) title.textContent = state.site.title || '我的 BLOG';
    if (tagline) tagline.textContent = state.site.tagline || '';
    if (about) about.textContent = state.site.about || '';
  }

  function renderList() {
    var listWrap = document.getElementById('post-list-view');
    var recent = document.getElementById('recent-posts');
    var archive = document.getElementById('archive-list');
    var category = document.getElementById('category-list');
    if (!listWrap || !recent || !archive || !category) return;

    var all = sortPosts(state.posts);
    var posts = filterPosts(all);
    listWrap.innerHTML = '';

    if (!posts.length) {
      listWrap.innerHTML = '<article class="post"><h2 class="post-date">NO RESULT</h2><h3 class="post-title">没有匹配文章</h3><p>请更换关键词再试。</p></article>';
    }

    posts.forEach(function (post) {
      var excerpt = post.excerpt || String(post.content || '').split('\n').filter(Boolean)[0] || '';
      var article = document.createElement('article');
      article.className = 'post';
      article.innerHTML =
        '<h2 class="post-date">' + safe(formatDate(post.published_date)) + '</h2>' +
        '<h3 class="post-title"><a href="#post-' + encodeURIComponent(post.id) + '">' + safe(post.title) + '</a></h3>' +
        '<p>' + safe(excerpt) + '</p>' +
        '<p class="post-more"><a href="#post-' + encodeURIComponent(post.id) + '">阅读全文 "' + safe(post.title) + '" »</a></p>' +
        '<p class="post-meta">' + safe(post.author || '站长') + ' 提交于 01:23 PM | <a href="#post-' + encodeURIComponent(post.id) + '">固定链接</a></p>';
      listWrap.appendChild(article);
    });

    recent.innerHTML = all.slice(0, 8).map(function (post) {
      return '<li><a href="#post-' + encodeURIComponent(post.id) + '">' + safe(post.title) + '</a></li>';
    }).join('');

    var grouped = {};
    all.forEach(function (post) {
      var ym = (post.published_date || '').slice(0, 7);
      if (!ym) return;
      grouped[ym] = (grouped[ym] || 0) + 1;
    });

    archive.innerHTML = Object.keys(grouped).sort().reverse().map(function (k) {
      return '<li>' + safe(k) + ' (' + grouped[k] + ')</li>';
    }).join('');

    var categories = [
      { name: '技术', count: all.length },
      { name: '读书', count: Math.max(1, Math.floor(all.length / 3)) },
      { name: '随笔', count: Math.max(1, Math.floor(all.length / 2)) },
      { name: '生活', count: Math.max(1, Math.floor(all.length / 4)) }
    ];
    category.innerHTML = categories.map(function (c) {
      return '<li><a href="#">' + safe(c.name) + '</a> (' + c.count + ')</li>';
    }).join('');
  }

  function renderDetail(post) {
    var listView = document.getElementById('post-list-view');
    var detailView = document.getElementById('post-detail-view');
    var dateEl = document.getElementById('detail-date');
    var titleEl = document.getElementById('detail-title');
    var contentEl = document.getElementById('detail-content');
    var metaEl = document.getElementById('detail-meta');
    var coverWrap = document.getElementById('detail-cover-wrap');
    var cover = document.getElementById('detail-cover');

    if (!listView || !detailView || !dateEl || !titleEl || !contentEl || !metaEl || !coverWrap || !cover) return;

    if (!post) {
      detailView.classList.add('hidden');
      listView.classList.remove('hidden');
      return;
    }

    dateEl.textContent = formatDate(post.published_date);
    titleEl.textContent = post.title || '';
    var paragraphs = String(post.content || '').split('\n').filter(function (line) {
      return line.trim().length > 0;
    });
    contentEl.innerHTML = paragraphs.map(function (p) {
      return '<p>' + safe(p) + '</p>';
    }).join('');

    metaEl.textContent = (post.author || '站长') + ' 提交于 01:23 PM';

    if (post.cover_url) {
      cover.src = post.cover_url;
      coverWrap.classList.remove('hidden');
    } else {
      coverWrap.classList.add('hidden');
      cover.removeAttribute('src');
    }

    listView.classList.add('hidden');
    detailView.classList.remove('hidden');
  }

  function getPostFromHash() {
    var hash = window.location.hash || '';
    if (!hash.startsWith('#post-')) return null;
    var id = decodeURIComponent(hash.replace('#post-', ''));
    return state.posts.find(function (p) { return p.id === id; }) || null;
  }

  function initEvents() {
    window.addEventListener('hashchange', function () {
      renderDetail(getPostFromHash());
    });

    var back = document.getElementById('back-to-list');
    if (back) {
      back.addEventListener('click', function (e) {
        e.preventDefault();
        window.location.hash = '';
        renderDetail(null);
      });
    }

    var searchForm = document.getElementById('sidebar-search-form');
    var searchInput = document.getElementById('sidebar-search-input');
    if (searchForm && searchInput) {
      searchForm.addEventListener('submit', function (e) {
        e.preventDefault();
        state.query = searchInput.value.trim();
        renderList();
        renderDetail(null);
      });
    }
  }

  async function loadFromCloud() {
    if (!client) {
      cloud.showAlert('front-alert', '请先在 cloud-config.js 填写 Supabase 配置。');
      renderSiteInfo();
      renderList();
      renderDetail(getPostFromHash());
      return;
    }

    var settingsResp = await client
      .from('site_settings')
      .select('title,tagline,about')
      .eq('id', 1)
      .maybeSingle();

    if (!settingsResp.error && settingsResp.data) {
      state.site = settingsResp.data;
    }

    var postsResp = await client
      .from('posts')
      .select('id,title,published_date,author,excerpt,content,cover_url,created_at')
      .order('published_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (postsResp.error) {
      cloud.showAlert('front-alert', '读取文章失败：' + postsResp.error.message);
    } else {
      state.posts = postsResp.data || [];
      cloud.showAlert('front-alert', '');
    }

    renderSiteInfo();
    renderList();
    renderDetail(getPostFromHash());
  }

  initEvents();
  loadFromCloud();
})();
