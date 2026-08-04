document.addEventListener("DOMContentLoaded", function () {
	// 1. Ensure we only initialize once per page
	if (window.__referencesInitialized) return;
	window.__referencesInitialized = true;

	// 2. Create the native dialog popup dynamically if it doesn't exist
	let dialog = document.getElementById("global-ref-popup");
	if (!dialog) {
		dialog = document.createElement("dialog");
		dialog.id = "global-ref-popup";
		dialog.className = "popup-modal";
		dialog.innerHTML = `
			<div class="popup-content">
				<form method="dialog">
					<button class="popup-close" aria-label="Close" title="Close">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
					</button>
				</form>
				<div id="global-ref-popup-inner"></div>
			</div>
		`;
		document.body.appendChild(dialog);

		// Handle closing and restoring scroll
		dialog.addEventListener("close", () => {
			document.body.style.overflow = "";
		});
		dialog.addEventListener("click", (e) => {
			if (e.target === dialog) dialog.close();
		});
	}

	const popupInner = document.getElementById("global-ref-popup-inner");

	// 3. Find and replace all inline citation spans with clickable icons
	document.querySelectorAll(".references").forEach(function (refEl) {
		const citationKeys = refEl.textContent
			.replace(/[\[\]]/g, "")
			.split(",")
			.map((key) => key.trim());

		const iconEl = document.createElement("span");
		iconEl.className = "ref-icon";
		iconEl.innerHTML =
			'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-bookmarks-fill" viewBox="0 0 16 16"><path d="M2 4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v11.5a.5.5 0 0 1-.777.416L7 13.101l-4.223 2.815A.5.5 0 0 1 2 15.5z"/><path d="M4.268 1A2 2 0 0 1 6 0h6a2 2 0 0 1 2 2v11.5a.5.5 0 0 1-.777.416L13 13.768V2a1 1 0 0 0-1-1z"/></svg>';

		iconEl.addEventListener("click", function (e) {
			e.stopPropagation();
			let popupContent = "";

			citationKeys.forEach(function (key) {
				const dataEl = document.getElementById(`cite-data-${key}`);
				const abstractEl = document.getElementById(`cite-abstract-${key}`);

				popupContent += '<div class="ref-entry">';
				if (dataEl) {
					popupContent += `<p class="ref-text">${dataEl.innerHTML}</p>`;
					
					if (abstractEl && abstractEl.textContent.trim() !== "") {
						let abstract = abstractEl.textContent.trim();
						if (abstract.length > 300) {
							abstract = abstract.substring(0, 300) + "...";
						}
						popupContent += `<p class="ref-notes" style="font-size:0.8rem">${abstract}</p>`;
					}
				} else {
					popupContent += `<p class="ref-text"><em>Reference "${key}" not found</em></p>`;
				}

				if (citationKeys.length > 1) {
					popupContent += '<hr class="ref-separator">';
				}
				popupContent += "</div>";
			});

			popupInner.innerHTML = popupContent;
			if (typeof dialog.showModal === "function") {
				dialog.showModal();
				document.body.style.overflow = "hidden";
			}
		});

		refEl.parentNode.replaceChild(iconEl, refEl);
	});
});
