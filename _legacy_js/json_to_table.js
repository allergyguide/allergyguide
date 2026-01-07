(function() {
  const processTables = () => {
    const containers = document.querySelectorAll('.json-table-container:not(.jtt-processed)');

    containers.forEach(container => {
      container.classList.add('jtt-processed');

      const showHeaders = container.dataset.showHeaders === 'true';
      const raw = container.dataset.json.trim();
      let data;

      if (!raw) {
        return;
      }

      try {
        data = JSON.parse(raw);
      } catch (e) {
        console.error("Invalid JSON for table:", e, raw);
        container.innerHTML = "<p>Invalid JSON data.</p>";
        return;
      }

      // FLAT ARRAY OF ROWS? ---------------------------------------------------
      if (Array.isArray(data)) {
        if (data.length === 0) {
          container.innerHTML = "<p>No data available</p>";
          return;
        }
        const cols = Object.keys(data[0]);
        let html = '<table class="json-table">';
        if (showHeaders) {
          html += '<thead><tr>' +
            cols.map(c => `<th>${c}</th>`).join('') +
            '</tr></thead>';
        }
        html += '<tbody>';
        data.forEach(row => {
          html += '<tr>' + cols.map(c => `<td>${row[c] ?? ''}</td>`).join('') + '</tr>';
        });
        html += '</tbody></table>';
        container.innerHTML = html;
        return;
      }

      // NESTED OBJECT → TWO‑LEVEL HEADER ----------------------------------------
      const groups = Object.keys(data);
      if (groups.length === 0) {
        container.innerHTML = "<p>No data available</p>";
        return;
      }

      const subsByGroup = {};
      const allRows = new Set();
      groups.forEach(g => {
        const subs = Object.keys(data[g] || {});
        subsByGroup[g] = subs;
        subs.forEach(sub => {
          Object.keys(data[g][sub] || {}).forEach(r => allRows.add(r));
        });
      });
      const rowKeys = Array.from(allRows);

      let html = '<table class="json-table">';

      if (showHeaders) {
        html += '<thead><tr><th rowspan="2"></th>';
        groups.forEach(g => {
          const colspan = subsByGroup[g].length || 1;
          html += `<th${colspan > 1 ? ` colspan="${colspan}"` : ''}>${g}</th>`;
        });
        html += '</tr>';
        html += '<tr>';
        groups.forEach(g => {
          const subs = subsByGroup[g].length ? subsByGroup[g] : [''];
          subs.forEach(sub => {
            html += `<th>${sub}</th>`;
          });
        });
        html += '</tr></thead>';
      }

      html += '<tbody>';
      rowKeys.forEach(rk => {
        html += `<tr><td>${rk}</td>`;
        groups.forEach(g => {
          const subs = subsByGroup[g].length ? subsByGroup[g] : [''];
          subs.forEach(sub => {
            const cellValue = (data[g] && data[g][sub] && data[g][sub][rk]) ?? '';
            html += `<td>${cellValue}</td>`;
          });
        });
        html += '</tr>';
      });
      html += '</tbody></table>';

      container.innerHTML = html;
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', processTables);
  } else {
    processTables();
  }
})();