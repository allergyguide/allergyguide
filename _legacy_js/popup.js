document.addEventListener("DOMContentLoaded", () => {
	const openPopup = (id) => {
		const modal = document.getElementById(id);
		if (modal && typeof modal.showModal === "function") {
			modal.showModal();
			document.body.style.overflow = "hidden"; // Prevent background scrolling
		}
	};

	// 1) bind triggers
	document.querySelectorAll(".popup-trigger").forEach((btn) => {
		btn.addEventListener("click", (e) => {
			e.stopPropagation();
			openPopup(btn.dataset.popupId);
		});
	});

	// 2) native dialog events and backdrop clicks
	document.querySelectorAll("dialog.popup-modal").forEach((dialog) => {
		// Restore scroll when closed (via Escape, form submission, or JS)
		dialog.addEventListener("close", () => {
			document.body.style.overflow = "";
		});

		// Close when clicking the backdrop (outside the dialog content)
		dialog.addEventListener("click", (e) => {
			// e.target is the dialog itself when clicking the backdrop
			if (e.target === dialog) {
				dialog.close();
			}
		});
	});
});
