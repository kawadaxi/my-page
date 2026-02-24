(function () {
  var cloud = window.CloudBlog;
  if (!cloud) return;

  var client = cloud.getClient();
  var DEFAULT_CATEGORIES = ['技术', '读书', '随笔'];
  var state = {
    site: {
      title: '我的 BLOG',
      tagline: '思绪来得快去得也快，偶尔会在这里停留',
      about: '你好，我是站长。这里是我的个人博客，主要记录技术、阅读和日常思考。',
      categories: DEFAULT_CATEGORIES.slice()
    },
    posts: [],
    query: '',
    category: '',
    archive: ''
  };

  function safe(text) {
    return String(text || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function parseCategories(input) {
    if (Array.isArray(input)) return input.filter(Boolean);
    return String(input || '').split(/[\n,]/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function ensureCategories(input) {
    var arr = parseCategories(input);
    return arr.length ? arr : DEFAULT_CATEGORIES.slice();
  }

  function normalizeCategory(cat) {
    var c = String(cat || '').trim();
    return c || '未分类';
  }

  function sanitizeHtml(html) {
    var doc = document.implementation.createHTMLDocument('render');
    var container = doc.createElement('div');
    container.innerHTML = String(html || '');

    container.querySelectorAll('script,style,iframe,object,embed').forEach(function (n) {
      n.remove();
    });

    container.querySelectorAll('*').forEach(function (el) {
      Array.from(el.attributes).forEach(function (attr) {
        var name = attr.name.toLowerCase();
        var value = attr.value || '';
        if (name.startsWith('on')) {
          el.removeAttribute(attr.name);
          return;
        }
        if ((name === 'href' || name === 'src') && /^javascript:/i.test(value)) {
          el.removeAttribute(attr.name);
          return;
        }
      });
    });

    return container.innerHTML;
  }

  function hasHtmlTag(content) {
    return /<\/?[a-z][\s\S]*>/i.test(String(content || ''));
  }

  function toHtmlContent(content) {
    var text = String(content || '');
    if (!text.trim()) return '<p></p>';
    if (hasHtmlTag(text)) return sanitizeHtml(text);

    return text
      .split(/\n{2,}/)
      .map(function (part) {
        return '<p>' + safe(part).replace(/\n/g, '<br>') + '</p>';
      })
      .join('');
  }

  function stripHtml(html) {
    var div = document.createElement('div');
    div.innerHTML = String(html || '');
    return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
  }

  function formatDate(isoDate) {
    var d = new Date(isoDate);
    if (isNaN(d.getTime())) return String(isoDate || '').toUpperCase();
    var m = d.toLocaleString('en-US', { month: 'long' }).toUpperCase();
    return m + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function getMetaDate(post) {
    if (post.created_at) {
      var created = new Date(post.created_at);
      if (!isNaN(created.getTime())) return created;
    }
    if (post.published_date) {
      var pub = new Date(post.published_date + 'T00:00:00');
      if (!isNaN(pub.getTime())) return pub;
    }
    return null;
  }

  function formatDateTime(post) {
    var d = getMetaDate(post);
    if (!d) return String(post.published_date || '未知时间');
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  function sortPosts(posts) {
    return posts.slice().sort(function (a, b) {
      var da = new Date(a.published_date || a.created_at || 0).getTime();
      var db = new Date(b.published_date || b.created_at || 0).getTime();
      return db - da;
    });
  }

  function filterPosts(posts) {
    return posts.filter(function (p) {
      if (state.query) {
        var q = state.query.toLowerCase();
        var text = [p.title, p.excerpt, stripHtml(toHtmlContent(p.content))].join(' ').toLowerCase();
        if (text.indexOf(q) === -1) return false;
      }

      if (state.category) {
        if (normalizeCategory(p.category) !== state.category) return false;
      }

      if (state.archive) {
        var ym = String(p.published_date || '').slice(0, 7);
        if (ym !== state.archive) return false;
      }

      return true;
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
      var fallbackExcerpt = stripHtml(toHtmlContent(post.content));
      var excerpt = post.excerpt || (fallbackExcerpt.length > 120 ? fallbackExcerpt.slice(0, 120) + '...' : fallbackExcerpt);
      var article = document.createElement('article');
      article.className = 'post';
      article.innerHTML =
        '<h2 class="post-date">' + safe(formatDate(post.published_date)) + '</h2>' +
        '<h3 class="post-title"><a href="#post-' + encodeURIComponent(post.id) + '">' + safe(post.title) + '</a></h3>' +
        '<p>' + safe(excerpt) + '</p>' +
        '<p class="post-more"><a href="#post-' + encodeURIComponent(post.id) + '">阅读全文 "' + safe(post.title) + '" »</a></p>' +
        '<p class="post-meta">' + safe(post.author || '站长') + ' 提交于 ' + safe(formatDateTime(post)) + ' | 分类：' + safe(normalizeCategory(post.category)) + ' | <a href="#post-' + encodeURIComponent(post.id) + '">固定链接</a></p>';
      listWrap.appendChild(article);
    });

    recent.innerHTML = all.slice(0, 8).map(function (post) {
      return '<li><a href="#post-' + encodeURIComponent(post.id) + '">' + safe(post.title) + '</a></li>';
    }).join('');

    var groupedArchive = {};
    all.forEach(function (post) {
      var ym = (post.published_date || '').slice(0, 7);
      if (!ym) return;
      groupedArchive[ym] = (groupedArchive[ym] || 0) + 1;
    });

    var archiveItems = Object.keys(groupedArchive).sort().reverse();
    archive.innerHTML = '<li><a href="#" data-archive="">全部</a> (' + all.length + ')</li>' + archiveItems.map(function (k) {
      return '<li><a href="#" data-archive="' + safe(k) + '">' + safe(k) + '</a> (' + groupedArchive[k] + ')</li>';
    }).join('');

    var catCounts = {};
    all.forEach(function (post) {
      var cat = normalizeCategory(post.category);
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });

    var ordered = ensureCategories(state.site.categories);
    if (catCounts['未分类']) ordered.push('未分类');
    ordered = ordered.filter(function (v, i, arr) { return arr.indexOf(v) === i; });

    category.innerHTML = '<li><a href="#" data-category="">全部</a> (' + all.length + ')</li>' + ordered.map(function (name) {
      return '<li><a href="#" data-category="' + safe(name) + '">' + safe(name) + '</a> (' + (catCounts[name] || 0) + ')</li>';
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
    contentEl.innerHTML = toHtmlContent(post.content);

    metaEl.innerHTML = safe(post.author || '站长') + ' 提交于 ' + safe(formatDateTime(post)) + ' | 分类：' + safe(normalizeCategory(post.category)) + ' | <a href="#post-' + encodeURIComponent(post.id) + '">固定链接</a>';

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

    var categoryList = document.getElementById('category-list');
    if (categoryList) {
      categoryList.addEventListener('click', function (e) {
        var target = e.target;
        if (!target || target.tagName !== 'A') return;
        var value = target.getAttribute('data-category');
        if (value === null) return;
        e.preventDefault();
        state.category = value;
        renderList();
        renderDetail(null);
      });
    }

    var archiveList = document.getElementById('archive-list');
    if (archiveList) {
      archiveList.addEventListener('click', function (e) {
        var target = e.target;
        if (!target || target.tagName !== 'A') return;
        var value = target.getAttribute('data-archive');
        if (value === null) return;
        e.preventDefault();
        state.archive = value;
        renderList();
        renderDetail(null);
      });
    }
  }

  function isMissingColumnError(err, col) {
    var msg = (err && err.message) || '';
    return msg.indexOf(col) !== -1 || msg.indexOf('column') !== -1;
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
      .select('title,tagline,about,categories')
      .eq('id', 1)
      .maybeSingle();

    if (settingsResp.error && isMissingColumnError(settingsResp.error, 'categories')) {
      var fallbackSettings = await client
        .from('site_settings')
        .select('title,tagline,about')
        .eq('id', 1)
        .maybeSingle();
      if (!fallbackSettings.error && fallbackSettings.data) {
        state.site = fallbackSettings.data;
        state.site.categories = DEFAULT_CATEGORIES.slice();
      }
    } else if (!settingsResp.error && settingsResp.data) {
      state.site = settingsResp.data;
      state.site.categories = ensureCategories(settingsResp.data.categories);
    }

    var postsResp = await client
      .from('posts')
      .select('id,title,published_date,author,excerpt,content,cover_url,created_at,category')
      .order('published_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (postsResp.error && isMissingColumnError(postsResp.error, 'category')) {
      var fallbackPosts = await client
        .from('posts')
        .select('id,title,published_date,author,excerpt,content,cover_url,created_at')
        .order('published_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (!fallbackPosts.error) {
        state.posts = (fallbackPosts.data || []).map(function (p) {
          p.category = '';
          return p;
        });
      }
    } else if (postsResp.error) {
      cloud.showAlert('front-alert', '读取文章失败：' + postsResp.error.message);
    } else {
      state.posts = (postsResp.data || []).map(function (p) {
        if (!p.category) p.category = '';
        return p;
      });
      cloud.showAlert('front-alert', '');
    }

    renderSiteInfo();
    renderList();
    renderDetail(getPostFromHash());
  }

  initEvents();
  loadFromCloud();
})();
