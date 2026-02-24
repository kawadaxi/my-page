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
    query: '',
    category: '',
    archive: ''
  };

  function safe(text) {
    return String(text || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
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

  function detectCategory(post) {
    var text = [post.title, post.excerpt, stripHtml(toHtmlContent(post.content))].join(' ').toLowerCase();
    if (/技术|编程|代码|开发|go|python|javascript|前端|后端|engine|debug|性能|算法/.test(text)) return '技术';
    if (/读书|阅读|小说|书单|paper|书/.test(text)) return '读书';
    if (/生活|日常|跑步|运动|旅行|家庭/.test(text)) return '生活';
    return '随笔';
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
        if (detectCategory(p) !== state.category) return false;
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
        '<p class="post-meta">' + safe(post.author || '站长') + ' 提交于 ' + safe(formatDateTime(post)) + ' | <a href="#post-' + encodeURIComponent(post.id) + '">固定链接</a></p>';
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

    var groupedCategory = {};
    all.forEach(function (post) {
      var c = detectCategory(post);
      groupedCategory[c] = (groupedCategory[c] || 0) + 1;
    });

    var categoryOrder = ['技术', '读书', '随笔', '生活'];
    category.innerHTML = '<li><a href="#" data-category="">全部</a> (' + all.length + ')</li>' + categoryOrder.filter(function (name) {
      return groupedCategory[name];
    }).map(function (name) {
      return '<li><a href="#" data-category="' + safe(name) + '">' + safe(name) + '</a> (' + groupedCategory[name] + ')</li>';
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

    metaEl.innerHTML = safe(post.author || '站长') + ' 提交于 ' + safe(formatDateTime(post)) + ' | <a href="#post-' + encodeURIComponent(post.id) + '">固定链接</a>';

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
