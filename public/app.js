const $ = (selector) => document.querySelector(selector);

let links = [];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

async function api(path, options) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || response.statusText);
  return data;
}

function slugify(value) {
  return value.toLowerCase().trim().replace(/https?:\/\//, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || crypto.randomUUID().slice(0, 8);
}

function shortUrl(code) {
  return `${location.origin}/s/${encodeURIComponent(code)}`;
}

function render() {
  const totalClicks = links.reduce((sum, link) => sum + Number(link.meta?.clicks || 0), 0);
  $("#app").innerHTML = `
    <section class="shortener-layout">
      <aside class="panel">
        <h2>Create Link</h2>
        <form id="linkForm">
          <label>Destination URL</label>
          <input id="url" type="url" placeholder="https://example.com/long/path" required>
          <label>Short code</label>
          <input id="code" placeholder="custom-code">
          <label>Notes</label>
          <textarea id="notes" placeholder="Campaign, audience, expiration notes..."></textarea>
          <button>Create short link</button>
        </form>
      </aside>
      <section>
        <div class="stats">
          <div class="stat"><span class="muted">Links</span><strong>${links.length}</strong></div>
          <div class="stat"><span class="muted">Total Clicks</span><strong>${totalClicks}</strong></div>
        </div>
        <div class="panel">
          <table>
            <thead><tr><th>Short Link</th><th>Destination</th><th class="right">Clicks</th><th></th></tr></thead>
            <tbody>
              ${links.map((link) => `
                <tr>
                  <td>
                    <strong><a href="/s/${encodeURIComponent(link.title)}" target="_blank">${escapeHtml(link.title)}</a></strong>
                    <br><span class="muted">${escapeHtml(shortUrl(link.title))}</span>
                  </td>
                  <td>
                    <a href="${escapeHtml(link.meta?.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.meta?.url)}</a>
                    <br><span class="muted">${escapeHtml(link.body)}</span>
                  </td>
                  <td class="right">${Number(link.meta?.clicks || 0)}</td>
                  <td class="actions">
                    <button onclick="copyLink('${escapeHtml(link.title)}')">Copy</button>
                    <button class="danger" onclick="deleteLink(${link.id})">Delete</button>
                  </td>
                </tr>
              `).join("") || `<tr><td colspan="4" class="muted">No links yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  `;
  bindEvents();
}

function bindEvents() {
  $("#linkForm").addEventListener("submit", createLink);
  $("#url").addEventListener("input", () => {
    if (!$("#code").dataset.touched) $("#code").value = slugify($("#url").value);
  });
  $("#code").addEventListener("input", () => {
    $("#code").dataset.touched = "true";
    $("#code").value = slugify($("#code").value);
  });
}

async function createLink(event) {
  event.preventDefault();
  const url = $("#url").value.trim();
  const code = slugify($("#code").value || url);
  if (links.some((link) => link.title === code)) {
    alert("That short code already exists.");
    return;
  }
  await api("/api/items", {
    method: "POST",
    body: JSON.stringify({
      title: code,
      body: $("#notes").value.trim(),
      status: "active",
      meta: { url, clicks: 0 },
    }),
  });
  await loadLinks();
}

async function copyLink(code) {
  await navigator.clipboard.writeText(shortUrl(code));
}

async function deleteLink(id) {
  if (!confirm("Delete this short link?")) return;
  await api(`/api/items/${id}`, { method: "DELETE" });
  await loadLinks();
}

async function loadLinks() {
  links = await api("/api/items");
  render();
}

document.body.innerHTML = `
  <main>
    <header class="top">
      <div>
        <h1>${escapeHtml(APP.name)}</h1>
        <p class="muted">${escapeHtml(APP.desc)}</p>
      </div>
    </header>
    <div id="app"></div>
  </main>
`;

loadLinks();
window.copyLink = copyLink;
window.deleteLink = deleteLink;
